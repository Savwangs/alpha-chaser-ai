-- Remove the conflicting lowercase constraint
ALTER TABLE public.trading_signals DROP CONSTRAINT IF EXISTS trading_signals_signal_type_check;

-- Keep only the uppercase constraint which matches our code
-- trading_signals_signal_type_valid already exists and is correct