-- ══════════════════════════════════════════════════════════════════════════
-- MediTrace — sync upload RPC accepts JSONB payloads
-- ══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.app_upload_sync_file(
    p_token               UUID,
    p_name                TEXT,
    p_content             JSONB,
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

GRANT EXECUTE ON FUNCTION public.app_upload_sync_file(UUID, TEXT, JSONB, INTEGER) TO anon;
