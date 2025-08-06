-- Fix security warnings from database linter

-- Fix function search path warnings
DROP FUNCTION IF EXISTS public.sanitize_stock_symbol(TEXT);
DROP FUNCTION IF EXISTS public.validate_positive_number(NUMERIC, TEXT);
DROP FUNCTION IF EXISTS public.check_rate_limit(UUID, TEXT, INTEGER, INTEGER);

-- Recreate functions with proper search_path
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

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
    request_count = public.rate_limits.request_count + 1,
    created_at = now();
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';