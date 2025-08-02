-- Create market data table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.market_data (
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

-- Enable RLS on market_data if not already enabled
ALTER TABLE public.market_data ENABLE ROW LEVEL SECURITY;

-- Create market data policies if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'market_data' AND policyname = 'Market data is publicly readable') THEN
    CREATE POLICY "Market data is publicly readable" ON public.market_data
      FOR SELECT USING (true);
  END IF;
END $$;

-- Insert sample market data if not exists
INSERT INTO public.market_data (symbol, price, change, change_percent, volume, market_cap) 
VALUES
('AAPL', 175.43, 2.15, 1.24, 52000000, 2800000000000),
('GOOGL', 142.56, -1.23, -0.85, 28000000, 1800000000000),
('MSFT', 378.85, 4.67, 1.25, 35000000, 2900000000000),
('TSLA', 248.50, -5.12, -2.02, 75000000, 790000000000),
('NVDA', 875.28, 15.67, 1.82, 45000000, 2200000000000),
('AMD', 142.18, 3.45, 2.48, 38000000, 229000000000),
('AMZN', 155.89, 1.98, 1.29, 41000000, 1600000000000),
('META', 425.67, -2.34, -0.55, 22000000, 1080000000000)
ON CONFLICT (symbol) DO NOTHING;