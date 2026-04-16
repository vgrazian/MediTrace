-- ══════════════════════════════════════════════════════════════════════════
-- MediTrace — remove legacy sync upload TEXT overload
--
-- Keep only app_upload_sync_file(UUID, TEXT, JSONB, INTEGER)
-- to avoid RPC overload ambiguity.
-- ══════════════════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS public.app_upload_sync_file(UUID, TEXT, TEXT, INTEGER);
