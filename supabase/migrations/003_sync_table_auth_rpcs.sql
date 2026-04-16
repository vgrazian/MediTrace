-- ══════════════════════════════════════════════════════════════════════════
-- MediTrace — Sync RPCs secured by table-auth session token
--
-- After the table-auth cutover (migration 002) the Supabase JS client uses
-- only the anon key (no Supabase Auth JWT). The existing sync_files RLS
-- policy requires the `authenticated` role, which blocks all sync operations.
--
-- These SECURITY DEFINER RPCs validate the table-auth session token before
-- granting access to sync_files, keeping sync data protected.
-- ══════════════════════════════════════════════════════════════════════════

-- ── app_list_sync_files ──────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.app_list_sync_files(
    p_token               UUID,
    p_session_ttl_minutes INTEGER DEFAULT 480
)
RETURNS TABLE (name TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    PERFORM public.app_require_user(p_token, p_session_ttl_minutes, FALSE);
    RETURN QUERY
        SELECT sf.name
        FROM public.sync_files sf
        WHERE sf.name IN ('meditrace-manifest.json', 'meditrace-data.json');
END;
$$;

-- ── app_download_sync_file ───────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.app_download_sync_file(
    p_token               UUID,
    p_name                TEXT,
    p_session_ttl_minutes INTEGER DEFAULT 480
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_content TEXT;
BEGIN
    PERFORM public.app_require_user(p_token, p_session_ttl_minutes, FALSE);

    SELECT sf.content
    INTO v_content
    FROM public.sync_files sf
    WHERE sf.name = p_name;

    RETURN v_content;
END;
$$;

-- ── app_upload_sync_file ─────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.app_upload_sync_file(
    p_token               UUID,
    p_name                TEXT,
    p_content             TEXT,
    p_session_ttl_minutes INTEGER DEFAULT 480
)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_now TIMESTAMPTZ := NOW();
BEGIN
    PERFORM public.app_require_user(p_token, p_session_ttl_minutes, FALSE);

    INSERT INTO public.sync_files (name, content, updated_at)
    VALUES (p_name, p_content, v_now)
    ON CONFLICT (name) DO UPDATE
        SET content    = EXCLUDED.content,
            updated_at = EXCLUDED.updated_at;

    RETURN v_now;
END;
$$;

-- ── Grant execute to anon (RPC is called via anon key) ───────────────────

GRANT EXECUTE ON FUNCTION public.app_list_sync_files(UUID, INTEGER)    TO anon;
GRANT EXECUTE ON FUNCTION public.app_download_sync_file(UUID, TEXT, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION public.app_upload_sync_file(UUID, TEXT, TEXT, INTEGER) TO anon;
