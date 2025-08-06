-- Enable required extensions for cron jobs
SELECT * FROM pg_extension WHERE extname = 'pg_cron';

-- Enable pg_cron extension if not already enabled (will only work if available)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule market data updates every 5 minutes during market hours
SELECT cron.schedule(
  'update-market-data',
  '*/5 8-16 * * 1-5', -- Every 5 minutes, 8 AM to 4 PM, Monday to Friday
  $$
  SELECT
    net.http_post(
        url:='https://duqviyslekqjldccbflu.supabase.co/functions/v1/market-data-updater',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1cXZpeXNsZWtxamxkY2NiZmx1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwODU0OTMsImV4cCI6MjA2OTY2MTQ5M30.e7dEhRRGruPUpusAOWztRWvg9wKa_SkmCbdoN6WaYAg"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);