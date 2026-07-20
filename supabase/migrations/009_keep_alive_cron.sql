-- Keep Supabase alive via pg_cron (no GitHub runner required)
-- Runs every 5 days at midnight UTC.
-- This is the PRIMARY keep-alive mechanism — no external VM needed.
-- The GitHub workflow is only a monitoring backup.
CREATE EXTENSION IF NOT EXISTS pg_cron;
-- Remove existing schedule if present (idempotent re-run)
SELECT cron.unschedule('keep_alive_ping');
-- Schedule a lightweight DB query every 5 days
-- Writes a timestamp to sync_files._keep_alive so we can track last ping
SELECT cron.schedule(
                'keep_alive_ping',
                '0 0 */5 * *',
                $$
                INSERT INTO sync_files (name, updated_at, payload)
                VALUES (
                                '_keep_alive',
                                now(),
                                jsonb_build_object('last_ping', now()::text, 'source', 'pg_cron')
                        ) ON CONFLICT (name) DO
                UPDATE
                SET updated_at = now(),
                        payload = jsonb_build_object('last_ping', now()::text, 'source', 'pg_cron');
$$
);