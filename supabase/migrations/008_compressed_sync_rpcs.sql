-- ══════════════════════════════════════════════════════════════════════════
-- MediTrace — Sync compression support
--
-- Client-side gzip compression wraps payloads in {"_gz":"<base64>"} JSONB
-- envelopes. No server-side RPC changes are strictly required — the existing
-- RPCs accept and return JSONB transparently. This migration adds a minimal
-- helper for future admin inspection.
-- ══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.app_unwrap_gz_hex(p_wrapped JSONB) RETURNS TEXT LANGUAGE plpgsql IMMUTABLE
SET search_path = public AS $$
DECLARE v_b64 TEXT;
v_bytes BYTEA;
BEGIN v_b64 := p_wrapped->>'_gz';
IF v_b64 IS NULL THEN RETURN NULL;
END IF;
v_bytes := DECODE(v_b64, 'base64');
RETURN ENCODE(v_bytes, 'hex');
END;
$$;
GRANT EXECUTE ON FUNCTION public.app_unwrap_gz_hex(JSONB) TO anon;