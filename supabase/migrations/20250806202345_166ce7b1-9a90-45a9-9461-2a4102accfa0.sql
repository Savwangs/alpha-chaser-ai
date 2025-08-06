-- Security Enhancement Migration
-- Add database constraints and validation for financial data integrity

-- Add constraints to portfolios table
ALTER TABLE public.portfolios 
ADD CONSTRAINT portfolios_total_value_non_negative CHECK (total_value >= 0),
ADD CONSTRAINT portfolios_cash_balance_non_negative CHECK (cash_balance >= 0),
ADD CONSTRAINT portfolios_name_length CHECK (char_length(name) BETWEEN 1 AND 100);

-- Add constraints to holdings table  
ALTER TABLE public.holdings
ADD CONSTRAINT holdings_quantity_positive CHECK (quantity > 0),
ADD CONSTRAINT holdings_average_cost_positive CHECK (average_cost > 0),
ADD CONSTRAINT holdings_current_price_positive CHECK (current_price IS NULL OR current_price > 0),
ADD CONSTRAINT holdings_symbol_format CHECK (symbol ~ '^[A-Z]{1,10}$'); -- Alphanumeric uppercase, max 10 chars

-- Add constraints to market_data table
ALTER TABLE public.market_data
ADD CONSTRAINT market_data_price_positive CHECK (price > 0),
ADD CONSTRAINT market_data_volume_non_negative CHECK (volume IS NULL OR volume >= 0),
ADD CONSTRAINT market_data_market_cap_non_negative CHECK (market_cap IS NULL OR market_cap >= 0),
ADD CONSTRAINT market_data_symbol_format CHECK (symbol ~ '^[A-Z]{1,10}$');

-- Add constraints to trading_signals table
ALTER TABLE public.trading_signals
ADD CONSTRAINT trading_signals_confidence_range CHECK (confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 1)),
ADD CONSTRAINT trading_signals_price_target_positive CHECK (price_target IS NULL OR price_target > 0),
ADD CONSTRAINT trading_signals_stop_loss_positive CHECK (stop_loss IS NULL OR stop_loss > 0),
ADD CONSTRAINT trading_signals_symbol_format CHECK (symbol ~ '^[A-Z]{1,10}$'),
ADD CONSTRAINT trading_signals_signal_type_valid CHECK (signal_type IN ('BUY', 'SELL', 'HOLD')),
ADD CONSTRAINT trading_signals_reasoning_length CHECK (ai_reasoning IS NULL OR char_length(ai_reasoning) <= 1000);

-- Add constraints to watchlist table
ALTER TABLE public.watchlist
ADD CONSTRAINT watchlist_symbol_format CHECK (symbol ~ '^[A-Z]{1,10}$'),
ADD CONSTRAINT watchlist_notes_length CHECK (notes IS NULL OR char_length(notes) <= 500);

-- Add constraints to profiles table
ALTER TABLE public.profiles
ADD CONSTRAINT profiles_display_name_length CHECK (display_name IS NULL OR char_length(display_name) BETWEEN 1 AND 100),
ADD CONSTRAINT profiles_risk_tolerance_valid CHECK (risk_tolerance IS NULL OR risk_tolerance IN ('low', 'medium', 'high')),
ADD CONSTRAINT profiles_trading_experience_valid CHECK (trading_experience IS NULL OR trading_experience IN ('beginner', 'intermediate', 'advanced', 'expert'));

-- Create function for input sanitization
CREATE OR REPLACE FUNCTION public.sanitize_stock_symbol(input_symbol TEXT)
RETURNS TEXT AS $$
BEGIN
  -- Remove whitespace and convert to uppercase
  input_symbol := UPPER(TRIM(input_symbol));
  
  -- Check if symbol contains only letters and numbers
  IF input_symbol !~ '^[A-Z0-9]{1,10}$' THEN
    RAISE EXCEPTION 'Invalid stock symbol format. Must be 1-10 alphanumeric characters.';
  END IF;
  
  RETURN input_symbol;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function for numeric validation
CREATE OR REPLACE FUNCTION public.validate_positive_number(input_value NUMERIC, field_name TEXT)
RETURNS NUMERIC AS $$
BEGIN
  IF input_value IS NULL THEN
    RAISE EXCEPTION '% cannot be null', field_name;
  END IF;
  
  IF input_value <= 0 THEN
    RAISE EXCEPTION '% must be greater than zero', field_name;
  END IF;
  
  RETURN input_value;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create rate limiting table for edge functions
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  function_name TEXT NOT NULL,
  request_count INTEGER DEFAULT 1,
  window_start TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, function_name, window_start)
);

-- Enable RLS on rate_limits table
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Create policy for rate_limits
CREATE POLICY "Users can view their own rate limits" 
ON public.rate_limits 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "System can manage rate limits" 
ON public.rate_limits 
FOR ALL 
USING (true);

-- Create function to check rate limits
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_user_id UUID,
  p_function_name TEXT,
  p_max_requests INTEGER DEFAULT 10,
  p_window_minutes INTEGER DEFAULT 60
)
RETURNS BOOLEAN AS $$
DECLARE
  current_window TIMESTAMP WITH TIME ZONE;
  request_count INTEGER;
BEGIN
  -- Calculate current window start time
  current_window := date_trunc('hour', now()) + 
                   (EXTRACT(minute FROM now())::INTEGER / p_window_minutes) * 
                   (p_window_minutes || ' minutes')::INTERVAL;
  
  -- Get current request count for this window
  SELECT COALESCE(r.request_count, 0) INTO request_count
  FROM public.rate_limits r
  WHERE r.user_id = p_user_id 
    AND r.function_name = p_function_name 
    AND r.window_start = current_window;
  
  -- Check if limit exceeded
  IF request_count >= p_max_requests THEN
    RETURN FALSE;
  END IF;
  
  -- Increment counter
  INSERT INTO public.rate_limits (user_id, function_name, request_count, window_start)
  VALUES (p_user_id, p_function_name, 1, current_window)
  ON CONFLICT (user_id, function_name, window_start)
  DO UPDATE SET 
    request_count = rate_limits.request_count + 1,
    created_at = now();
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;