-- MediTrace table-auth password recovery flow.
-- Adds deterministic token-based recovery RPCs used by online E2E and reset route.

CREATE TABLE IF NOT EXISTS public.user_password_recovery_tokens (
    token       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at  TIMESTAMPTZ NOT NULL,
    consumed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS user_password_recovery_tokens_user_idx
    ON public.user_password_recovery_tokens (user_id);

CREATE INDEX IF NOT EXISTS user_password_recovery_tokens_active_idx
    ON public.user_password_recovery_tokens (expires_at)
    WHERE consumed_at IS NULL;

ALTER TABLE public.user_password_recovery_tokens ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.user_password_recovery_tokens FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.app_request_password_reset(
    p_email TEXT,
    p_reset_base_url TEXT,
    p_reset_ttl_minutes INTEGER DEFAULT 30
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_email TEXT := public.app_assert_valid_email(p_email);
    v_user public.users;
    v_token UUID;
    v_minutes INTEGER := GREATEST(COALESCE(p_reset_ttl_minutes, 30), 5);
    v_expires_at TIMESTAMPTZ;
    v_base_url TEXT := TRIM(COALESCE(p_reset_base_url, ''));
    v_reset_url TEXT;
BEGIN
    SELECT *
    INTO v_user
    FROM public.users
    WHERE LOWER(email) = LOWER(v_email)
      AND disabled = FALSE
    LIMIT 1;

    -- Keep response shape consistent and avoid leaking account presence.
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'email', v_email,
            'reset_url', NULL,
            'expires_at', NULL
        );
    END IF;

    DELETE FROM public.user_password_recovery_tokens
    WHERE user_id = v_user.id
      AND consumed_at IS NULL;

    v_expires_at := NOW() + make_interval(mins => v_minutes);

    INSERT INTO public.user_password_recovery_tokens (user_id, expires_at)
    VALUES (v_user.id, v_expires_at)
    RETURNING token INTO v_token;

    IF v_base_url = '' THEN
        v_base_url := '/#/auth/reset-password';
    END IF;

    IF POSITION('?' IN v_base_url) > 0 THEN
        v_reset_url := v_base_url || '&token=' || v_token::TEXT;
    ELSE
        v_reset_url := v_base_url || '?token=' || v_token::TEXT;
    END IF;

    RETURN jsonb_build_object(
        'email', v_email,
        'reset_url', v_reset_url,
        'expires_at', v_expires_at
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.app_complete_password_recovery(
    p_token TEXT,
    p_new_password TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_token UUID;
    v_password TEXT := public.app_assert_valid_password(p_new_password);
    v_recovery public.user_password_recovery_tokens;
    v_user public.users;
BEGIN
    BEGIN
        v_token := TRIM(COALESCE(p_token, ''))::UUID;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE EXCEPTION 'Token reset non valido';
    END;

    SELECT *
    INTO v_recovery
    FROM public.user_password_recovery_tokens
    WHERE token = v_token
      AND consumed_at IS NULL;

    IF NOT FOUND OR v_recovery.expires_at <= NOW() THEN
        RAISE EXCEPTION 'Token reset non valido o scaduto';
    END IF;

    SELECT *
    INTO v_user
    FROM public.users
    WHERE id = v_recovery.user_id
      AND disabled = FALSE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Utente non disponibile';
    END IF;

    UPDATE public.users
    SET password_hash = extensions.crypt(v_password, extensions.gen_salt('bf')),
        updated_at = NOW()
    WHERE id = v_user.id
    RETURNING * INTO v_user;

    UPDATE public.user_password_recovery_tokens
    SET consumed_at = NOW()
    WHERE token = v_token;

    UPDATE public.user_sessions
    SET revoked_at = NOW()
    WHERE user_id = v_user.id
      AND revoked_at IS NULL;

    RETURN public.user_public_json(v_user);
END;
$$;

GRANT EXECUTE ON FUNCTION public.app_request_password_reset(TEXT, TEXT, INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.app_complete_password_recovery(TEXT, TEXT) TO anon, authenticated;
