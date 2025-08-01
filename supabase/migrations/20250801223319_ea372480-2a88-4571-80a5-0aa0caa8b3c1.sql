-- Create user profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'premium')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create portfolios table
CREATE TABLE public.portfolios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'My Portfolio',
  total_value DECIMAL(15,2) DEFAULT 0,
  daily_change DECIMAL(15,2) DEFAULT 0,
  daily_change_percent DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create holdings table
CREATE TABLE public.holdings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  portfolio_id UUID NOT NULL REFERENCES public.portfolios(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  company_name TEXT,
  quantity DECIMAL(15,8) NOT NULL,
  avg_cost DECIMAL(15,2) NOT NULL,
  current_price DECIMAL(15,2),
  market_value DECIMAL(15,2),
  unrealized_pnl DECIMAL(15,2),
  unrealized_pnl_percent DECIMAL(5,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(portfolio_id, symbol)
);

-- Create watchlist table
CREATE TABLE public.watchlist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  company_name TEXT,
  current_price DECIMAL(15,2),
  change_percent DECIMAL(5,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, symbol)
);

-- Create trading signals table
CREATE TABLE public.trading_signals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  signal_type TEXT NOT NULL CHECK (signal_type IN ('BUY', 'SELL', 'HOLD')),
  confidence DECIMAL(3,2) CHECK (confidence >= 0 AND confidence <= 1),
  price_target DECIMAL(15,2),
  stop_loss DECIMAL(15,2),
  reasoning TEXT,
  source TEXT DEFAULT 'AI_ANALYSIS',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Create market data table for caching
CREATE TABLE public.market_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol TEXT NOT NULL,
  price DECIMAL(15,2) NOT NULL,
  change DECIMAL(15,2),
  change_percent DECIMAL(5,2),
  volume BIGINT,
  market_cap BIGINT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(symbol)
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.holdings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trading_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_data ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for portfolios
CREATE POLICY "Users can view own portfolios" ON public.portfolios
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own portfolios" ON public.portfolios
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own portfolios" ON public.portfolios
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own portfolios" ON public.portfolios
  FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for holdings
CREATE POLICY "Users can view own holdings" ON public.holdings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.portfolios 
      WHERE portfolios.id = holdings.portfolio_id 
      AND portfolios.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own holdings" ON public.holdings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.portfolios 
      WHERE portfolios.id = holdings.portfolio_id 
      AND portfolios.user_id = auth.uid()
    )
  );

-- Create RLS policies for watchlist
CREATE POLICY "Users can view own watchlist" ON public.watchlist
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own watchlist" ON public.watchlist
  FOR ALL USING (auth.uid() = user_id);

-- Create RLS policies for trading signals
CREATE POLICY "Users can view own signals" ON public.trading_signals
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own signals" ON public.trading_signals
  FOR ALL USING (auth.uid() = user_id);

-- Market data is public read-only
CREATE POLICY "Market data is publicly readable" ON public.market_data
  FOR SELECT USING (true);

-- Only authenticated users can insert/update market data
CREATE POLICY "Authenticated users can manage market data" ON public.market_data
  FOR ALL USING (auth.uid() IS NOT NULL);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_portfolios_updated_at
  BEFORE UPDATE ON public.portfolios
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_holdings_updated_at
  BEFORE UPDATE ON public.holdings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to handle new user signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email)
  );
  
  -- Create default portfolio
  INSERT INTO public.portfolios (user_id, name)
  VALUES (NEW.id, 'My Portfolio');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insert some sample market data
INSERT INTO public.market_data (symbol, price, change, change_percent, volume, market_cap) VALUES
('AAPL', 175.43, 2.15, 1.24, 52000000, 2800000000000),
('GOOGL', 142.56, -1.23, -0.85, 28000000, 1800000000000),
('MSFT', 378.85, 4.67, 1.25, 35000000, 2900000000000),
('TSLA', 248.50, -5.12, -2.02, 75000000, 790000000000),
('NVDA', 875.28, 15.67, 1.82, 45000000, 2200000000000),
('AMD', 142.18, 3.45, 2.48, 38000000, 229000000000),
('AMZN', 155.89, 1.98, 1.29, 41000000, 1600000000000),
('META', 425.67, -2.34, -0.55, 22000000, 1080000000000);