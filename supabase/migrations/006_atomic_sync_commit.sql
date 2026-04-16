-- ══════════════════════════════════════════════════════════════════════════
-- MediTrace — Atomic sync commit with optimistic concurrency
--
-- Prevents concurrent clients from overwriting each other's dataset snapshot.
-- The commit is accepted only if expected datasetVersion matches current one.
-- ══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.app_commit_sync_snapshot(
    p_token               UUID,
    p_expected_version    INTEGER,
    p_dataset             JSONB,
    p_updated_by_device   TEXT DEFAULT NULL,
    p_session_ttl_minutes INTEGER DEFAULT 480
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_manifest      JSONB;
    v_current       INTEGER;
    v_new_version   INTEGER;
    v_now           TIMESTAMPTZ := NOW();
    v_exported_at   TEXT := to_char(v_now AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
    v_new_manifest  JSONB;
BEGIN
    PERFORM public.app_require_user(p_token, p_session_ttl_minutes, FALSE);

    SELECT sf.content
    INTO v_manifest
    FROM public.sync_files sf
    WHERE sf.name = 'meditrace-manifest.json'
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'SYNC_MANIFEST_NOT_FOUND';
    END IF;

    v_current := COALESCE((v_manifest ->> 'datasetVersion')::INTEGER, 0);

    IF COALESCE(p_expected_version, -1) <> v_current THEN
        RAISE EXCEPTION 'SYNC_VERSION_CONFLICT: expected %, found %', COALESCE(p_expected_version, -1), v_current;
    END IF;

    v_new_version := v_current + 1;

    v_new_manifest := COALESCE(v_manifest, '{}'::JSONB)
        || jsonb_build_object(
            'schemaVersion', COALESCE((v_manifest ->> 'schemaVersion')::INTEGER, 1),
            'datasetVersion', v_new_version,
            'exportedAt', v_exported_at,
            'updatedByDevice', p_updated_by_device,
            'checksum', NULL
        );

    INSERT INTO public.sync_files (name, content, updated_at)
    VALUES ('meditrace-data.json', p_dataset, v_now)
    ON CONFLICT (name) DO UPDATE
        SET content = EXCLUDED.content,
            updated_at = EXCLUDED.updated_at;

    INSERT INTO public.sync_files (name, content, updated_at)
    VALUES ('meditrace-manifest.json', v_new_manifest, v_now)
    ON CONFLICT (name) DO UPDATE
        SET content = EXCLUDED.content,
            updated_at = EXCLUDED.updated_at;

    RETURN jsonb_build_object(
        'datasetVersion', v_new_version,
        'exportedAt', v_exported_at
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.app_commit_sync_snapshot(UUID, INTEGER, JSONB, TEXT, INTEGER) TO anon;
