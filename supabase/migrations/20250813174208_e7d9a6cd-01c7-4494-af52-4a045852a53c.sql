-- Update symbol format constraint to allow hyphens and dots (common in stock symbols)
ALTER TABLE public.market_data DROP CONSTRAINT IF EXISTS market_data_symbol_format;

-- Add new constraint that allows letters, numbers, hyphens, and dots
ALTER TABLE public.market_data 
ADD CONSTRAINT market_data_symbol_format 
CHECK (symbol ~ '^[A-Z0-9.-]{1,10}$');