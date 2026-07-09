-- Keep Supabase alive via pg_cron (no GitHub runner required)
-- Runs every 5 days at midnight UTC: SELECT now()

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Remove any previous keep-alive job to avoid duplicates
SELECT cron.unschedule('keep_alive_ping');

-- Schedule a lightweight DB query every 5 days
SELECT cron.schedule(
  'keep_alive_ping',
  '0 0 */5 * *',
  $$ SELECT now() AS keep_alive_at; $$
);
