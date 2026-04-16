-- ══════════════════════════════════════════════════════════════════════════
-- MediTrace — table-based application auth
-- Replaces Supabase Auth dependency for app login with bcrypt-hashed users.
-- ══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.users (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    username      TEXT        NOT NULL UNIQUE
                                 CHECK (username ~ '^[a-z0-9._-]{3,32}$'),
    email         TEXT        NOT NULL,
    password_hash TEXT        NOT NULL,
    role          TEXT        NOT NULL DEFAULT 'operator'
                                 CHECK (role IN ('admin', 'operator')),
    first_name    TEXT        NOT NULL DEFAULT '',
    last_name     TEXT        NOT NULL DEFAULT '',
    phone         TEXT                 DEFAULT '',
    disabled      BOOLEAN     NOT NULL DEFAULT FALSE,
    is_seeded     BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_unique
    ON public.users (LOWER(email));

CREATE TABLE IF NOT EXISTS public.user_sessions (
    token            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at       TIMESTAMPTZ NOT NULL,
    revoked_at       TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS user_sessions_user_idx
    ON public.user_sessions (user_id);

CREATE INDEX IF NOT EXISTS user_sessions_active_expiry_idx
    ON public.user_sessions (expires_at)
    WHERE revoked_at IS NULL;

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.users FROM anon, authenticated;
REVOKE ALL ON public.user_sessions FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.app_assert_valid_username(p_value TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    v_username TEXT := LOWER(TRIM(COALESCE(p_value, '')));
BEGIN
    IF v_username !~ '^[a-z0-9._-]{3,32}$' THEN
        RAISE EXCEPTION 'Username non valido: usa 3-32 caratteri [a-z0-9._-]';
    END IF;
    RETURN v_username;
END;
$$;

CREATE OR REPLACE FUNCTION public.app_assert_valid_email(p_value TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    v_email TEXT := LOWER(TRIM(COALESCE(p_value, '')));
BEGIN
    IF v_email = '' OR v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' THEN
        RAISE EXCEPTION 'Email non valida';
    END IF;
    RETURN v_email;
END;
$$;

CREATE OR REPLACE FUNCTION public.app_assert_valid_password(p_value TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    v_password TEXT := COALESCE(p_value, '');
BEGIN
    IF LENGTH(v_password) < 10
       OR v_password !~ '[A-Z]'
       OR v_password !~ '[a-z]'
       OR v_password !~ '[0-9]'
       OR v_password !~ '[^A-Za-z0-9]'
    THEN
        RAISE EXCEPTION 'Password richiesta: almeno 10 caratteri con maiuscola, minuscola, numero e simbolo';
    END IF;
    RETURN v_password;
END;
$$;

CREATE OR REPLACE FUNCTION public.user_public_json(p_user public.users)
RETURNS JSONB
LANGUAGE sql
STABLE
AS $$
    SELECT jsonb_build_object(
        'id', p_user.id,
        'username', p_user.username,
        'email', p_user.email,
        'role', p_user.role,
        'first_name', p_user.first_name,
        'last_name', p_user.last_name,
        'phone', COALESCE(p_user.phone, ''),
        'disabled', p_user.disabled,
        'is_seeded', p_user.is_seeded,
        'created_at', p_user.created_at,
        'updated_at', p_user.updated_at
    );
$$;

CREATE OR REPLACE FUNCTION public.user_session_json(p_session public.user_sessions)
RETURNS JSONB
LANGUAGE sql
STABLE
AS $$
    SELECT jsonb_build_object(
        'token', p_session.token,
        'created_at', p_session.created_at,
        'last_activity_at', p_session.last_activity_at,
        'expires_at', p_session.expires_at
    );
$$;

CREATE OR REPLACE FUNCTION public.app_issue_session(p_user_id UUID, p_session_ttl_minutes INTEGER DEFAULT 480)
RETURNS public.user_sessions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_session public.user_sessions;
    v_minutes INTEGER := GREATEST(COALESCE(p_session_ttl_minutes, 480), 15);
BEGIN
    INSERT INTO public.user_sessions (user_id, expires_at)
    VALUES (p_user_id, NOW() + make_interval(mins => v_minutes))
    RETURNING * INTO v_session;

    RETURN v_session;
END;
$$;

CREATE OR REPLACE FUNCTION public.app_touch_session(p_token UUID, p_session_ttl_minutes INTEGER DEFAULT 480)
RETURNS public.user_sessions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_session public.user_sessions;
    v_minutes INTEGER := GREATEST(COALESCE(p_session_ttl_minutes, 480), 15);
BEGIN
    SELECT *
    INTO v_session
    FROM public.user_sessions
    WHERE token = p_token
      AND revoked_at IS NULL;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Sessione non attiva';
    END IF;

    IF v_session.expires_at <= NOW() THEN
        UPDATE public.user_sessions
        SET revoked_at = NOW()
        WHERE token = p_token
          AND revoked_at IS NULL;
        RAISE EXCEPTION 'Sessione scaduta';
    END IF;

    UPDATE public.user_sessions
    SET last_activity_at = NOW(),
        expires_at = NOW() + make_interval(mins => v_minutes)
    WHERE token = p_token
    RETURNING * INTO v_session;

    RETURN v_session;
END;
$$;

CREATE OR REPLACE FUNCTION public.app_require_user(p_token UUID, p_session_ttl_minutes INTEGER DEFAULT 480, p_require_admin BOOLEAN DEFAULT FALSE)
RETURNS public.users
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_session public.user_sessions;
    v_user public.users;
BEGIN
    v_session := public.app_touch_session(p_token, p_session_ttl_minutes);

    SELECT *
    INTO v_user
    FROM public.users
    WHERE id = v_session.user_id;

    IF NOT FOUND OR v_user.disabled THEN
        UPDATE public.user_sessions
        SET revoked_at = NOW()
        WHERE token = p_token
          AND revoked_at IS NULL;
        RAISE EXCEPTION 'Utente non disponibile';
    END IF;

    IF p_require_admin AND v_user.role <> 'admin' THEN
        RAISE EXCEPTION 'Permesso negato: solo admin';
    END IF;

    RETURN v_user;
END;
$$;

CREATE OR REPLACE FUNCTION public.app_has_users()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS(
        SELECT 1
        FROM public.users
        WHERE disabled = FALSE
    );
$$;

CREATE OR REPLACE FUNCTION public.app_sign_in(
    p_username TEXT,
    p_password TEXT,
    p_session_ttl_minutes INTEGER DEFAULT 480
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_username TEXT := public.app_assert_valid_username(p_username);
    v_user public.users;
    v_session public.user_sessions;
BEGIN
    SELECT *
    INTO v_user
    FROM public.users
    WHERE username = v_username
      AND disabled = FALSE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Utente non trovato';
    END IF;

    IF extensions.crypt(COALESCE(p_password, ''), v_user.password_hash) <> v_user.password_hash THEN
        RAISE EXCEPTION 'Password non valida';
    END IF;

    v_session := public.app_issue_session(v_user.id, p_session_ttl_minutes);

    RETURN jsonb_build_object(
        'user', public.user_public_json(v_user),
        'session', public.user_session_json(v_session)
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.app_register_first_admin(
    p_username TEXT,
    p_password TEXT,
    p_first_name TEXT,
    p_last_name TEXT,
    p_email TEXT,
    p_phone TEXT DEFAULT '',
    p_session_ttl_minutes INTEGER DEFAULT 480
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user public.users;
    v_session public.user_sessions;
    v_username TEXT := public.app_assert_valid_username(p_username);
    v_email TEXT := public.app_assert_valid_email(p_email);
    v_password TEXT := public.app_assert_valid_password(p_password);
BEGIN
    IF EXISTS (SELECT 1 FROM public.users WHERE disabled = FALSE) THEN
        RAISE EXCEPTION 'Bootstrap admin non disponibile: esistono gia utenti attivi';
    END IF;

    INSERT INTO public.users (
        username,
        email,
        password_hash,
        role,
        first_name,
        last_name,
        phone,
        disabled,
        is_seeded
    )
    VALUES (
        v_username,
        v_email,
        extensions.crypt(v_password, extensions.gen_salt('bf')),
        'admin',
        TRIM(COALESCE(p_first_name, '')),
        TRIM(COALESCE(p_last_name, '')),
        TRIM(COALESCE(p_phone, '')),
        FALSE,
        FALSE
    )
    RETURNING * INTO v_user;

    v_session := public.app_issue_session(v_user.id, p_session_ttl_minutes);

    RETURN jsonb_build_object(
        'user', public.user_public_json(v_user),
        'session', public.user_session_json(v_session)
    );
EXCEPTION
    WHEN unique_violation THEN
        RAISE EXCEPTION 'Username o email gia esistenti';
END;
$$;

CREATE OR REPLACE FUNCTION public.app_validate_session(
    p_token UUID,
    p_session_ttl_minutes INTEGER DEFAULT 480
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user public.users;
    v_session public.user_sessions;
BEGIN
    v_user := public.app_require_user(p_token, p_session_ttl_minutes, FALSE);

    SELECT *
    INTO v_session
    FROM public.user_sessions
    WHERE token = p_token
      AND revoked_at IS NULL;

    RETURN jsonb_build_object(
        'user', public.user_public_json(v_user),
        'session', public.user_session_json(v_session)
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.app_sign_out(p_token UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.user_sessions
    SET revoked_at = NOW()
    WHERE token = p_token
      AND revoked_at IS NULL;

    RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.app_change_password(
    p_token UUID,
    p_current_password TEXT,
    p_new_password TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user public.users;
    v_password TEXT := public.app_assert_valid_password(p_new_password);
BEGIN
    v_user := public.app_require_user(p_token, 480, FALSE);

    IF extensions.crypt(COALESCE(p_current_password, ''), v_user.password_hash) <> v_user.password_hash THEN
        RAISE EXCEPTION 'Password corrente non valida';
    END IF;

    UPDATE public.users
    SET password_hash = extensions.crypt(v_password, extensions.gen_salt('bf')),
        updated_at = NOW()
    WHERE id = v_user.id;

    UPDATE public.user_sessions
    SET revoked_at = NOW()
    WHERE user_id = v_user.id
      AND revoked_at IS NULL;

    SELECT * INTO v_user FROM public.users WHERE id = v_user.id;

    RETURN public.user_public_json(v_user);
END;
$$;

CREATE OR REPLACE FUNCTION public.app_update_profile(
    p_token UUID,
    p_username TEXT,
    p_first_name TEXT,
    p_last_name TEXT,
    p_email TEXT,
    p_phone TEXT DEFAULT '',
    p_session_ttl_minutes INTEGER DEFAULT 480
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_actor public.users;
    v_session public.user_sessions;
    v_updated public.users;
    v_username TEXT := public.app_assert_valid_username(p_username);
    v_email TEXT := public.app_assert_valid_email(p_email);
BEGIN
    v_actor := public.app_require_user(p_token, p_session_ttl_minutes, FALSE);

    IF EXISTS (
        SELECT 1
        FROM public.users
        WHERE username = v_username
          AND id <> v_actor.id
    ) THEN
        RAISE EXCEPTION 'Username gia esistente';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.users
        WHERE LOWER(email) = LOWER(v_email)
          AND id <> v_actor.id
    ) THEN
        RAISE EXCEPTION 'Email gia esistente';
    END IF;

    UPDATE public.users
    SET username = v_username,
        first_name = TRIM(COALESCE(p_first_name, '')),
        last_name = TRIM(COALESCE(p_last_name, '')),
        email = v_email,
        phone = TRIM(COALESCE(p_phone, '')),
        updated_at = NOW()
    WHERE id = v_actor.id
    RETURNING * INTO v_updated;

    SELECT *
    INTO v_session
    FROM public.user_sessions
    WHERE token = p_token
      AND revoked_at IS NULL;

    RETURN jsonb_build_object(
        'user', public.user_public_json(v_updated),
        'session', public.user_session_json(v_session)
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.app_list_users(
    p_token UUID,
    p_session_ttl_minutes INTEGER DEFAULT 480
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_actor public.users;
BEGIN
    v_actor := public.app_require_user(p_token, p_session_ttl_minutes, TRUE);

    RETURN COALESCE(
        (
            SELECT jsonb_agg(public.user_public_json(u) ORDER BY u.username)
            FROM public.users u
        ),
        '[]'::jsonb
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.app_create_user(
    p_token UUID,
    p_username TEXT,
    p_password TEXT,
    p_first_name TEXT,
    p_last_name TEXT,
    p_email TEXT,
    p_phone TEXT DEFAULT '',
    p_role TEXT DEFAULT 'operator',
    p_is_seeded BOOLEAN DEFAULT FALSE,
    p_session_ttl_minutes INTEGER DEFAULT 480
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_actor public.users;
    v_user public.users;
    v_username TEXT := public.app_assert_valid_username(p_username);
    v_email TEXT := public.app_assert_valid_email(p_email);
    v_password TEXT := public.app_assert_valid_password(p_password);
    v_role TEXT := CASE WHEN p_role = 'admin' THEN 'admin' ELSE 'operator' END;
BEGIN
    v_actor := public.app_require_user(p_token, p_session_ttl_minutes, TRUE);

    INSERT INTO public.users (
        username,
        email,
        password_hash,
        role,
        first_name,
        last_name,
        phone,
        disabled,
        is_seeded
    )
    VALUES (
        v_username,
        v_email,
        extensions.crypt(v_password, extensions.gen_salt('bf')),
        v_role,
        TRIM(COALESCE(p_first_name, '')),
        TRIM(COALESCE(p_last_name, '')),
        TRIM(COALESCE(p_phone, '')),
        FALSE,
        COALESCE(p_is_seeded, FALSE)
    )
    RETURNING * INTO v_user;

    RETURN public.user_public_json(v_user);
EXCEPTION
    WHEN unique_violation THEN
        RAISE EXCEPTION 'Username o email gia esistenti';
END;
$$;

CREATE OR REPLACE FUNCTION public.app_disable_self_seeded(
    p_token UUID,
    p_session_ttl_minutes INTEGER DEFAULT 480
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user public.users;
BEGIN
    v_user := public.app_require_user(p_token, p_session_ttl_minutes, FALSE);

    IF NOT v_user.is_seeded THEN
        RAISE EXCEPTION 'Solo gli account di prova possono essere disattivati qui';
    END IF;

    UPDATE public.users
    SET disabled = TRUE,
        updated_at = NOW()
    WHERE id = v_user.id;

    UPDATE public.user_sessions
    SET revoked_at = NOW()
    WHERE user_id = v_user.id
      AND revoked_at IS NULL;

    RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.app_set_user_disabled(
    p_token UUID,
    p_username TEXT,
    p_disabled BOOLEAN,
    p_session_ttl_minutes INTEGER DEFAULT 480
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_actor public.users;
    v_target public.users;
    v_username TEXT := public.app_assert_valid_username(p_username);
    v_remaining_admins INTEGER;
BEGIN
    v_actor := public.app_require_user(p_token, p_session_ttl_minutes, TRUE);

    SELECT *
    INTO v_target
    FROM public.users
    WHERE username = v_username;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Utente non trovato';
    END IF;

    IF v_target.role = 'admin' AND COALESCE(p_disabled, FALSE) = TRUE THEN
        SELECT COUNT(*)
        INTO v_remaining_admins
        FROM public.users
        WHERE role = 'admin'
          AND disabled = FALSE
          AND id <> v_target.id;

        IF v_remaining_admins = 0 THEN
            RAISE EXCEPTION 'Almeno un admin attivo e obbligatorio';
        END IF;
    END IF;

    UPDATE public.users
    SET disabled = COALESCE(p_disabled, FALSE),
        updated_at = NOW()
    WHERE id = v_target.id
    RETURNING * INTO v_target;

    UPDATE public.user_sessions
    SET revoked_at = NOW()
    WHERE user_id = v_target.id
      AND revoked_at IS NULL;

    RETURN public.user_public_json(v_target);
END;
$$;

CREATE OR REPLACE FUNCTION public.app_delete_user(
    p_token UUID,
    p_username TEXT,
    p_session_ttl_minutes INTEGER DEFAULT 480
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_actor public.users;
    v_target public.users;
    v_username TEXT := public.app_assert_valid_username(p_username);
    v_remaining_admins INTEGER;
BEGIN
    v_actor := public.app_require_user(p_token, p_session_ttl_minutes, TRUE);

    SELECT *
    INTO v_target
    FROM public.users
    WHERE username = v_username;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Utente non trovato';
    END IF;

    IF v_actor.id = v_target.id THEN
        RAISE EXCEPTION 'Non puoi eliminare la tua utenza dalla sessione corrente';
    END IF;

    IF v_target.role = 'admin' AND v_target.disabled = FALSE THEN
        SELECT COUNT(*)
        INTO v_remaining_admins
        FROM public.users
        WHERE role = 'admin'
          AND disabled = FALSE
          AND id <> v_target.id;

        IF v_remaining_admins = 0 THEN
            RAISE EXCEPTION 'Almeno un admin attivo e obbligatorio';
        END IF;
    END IF;

    DELETE FROM public.users
    WHERE id = v_target.id;

    RETURN TRUE;
END;
$$;

DROP POLICY IF EXISTS sync_files_authenticated ON public.sync_files;
DROP POLICY IF EXISTS sync_files_public ON public.sync_files;
CREATE POLICY sync_files_public
    ON public.sync_files FOR ALL TO anon, authenticated
    USING (true)
    WITH CHECK (true);

DROP TRIGGER IF EXISTS users_set_updated_at ON public.users;
CREATE TRIGGER users_set_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

GRANT EXECUTE ON FUNCTION public.app_has_users() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.app_sign_in(TEXT, TEXT, INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.app_register_first_admin(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.app_validate_session(UUID, INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.app_sign_out(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.app_change_password(UUID, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.app_update_profile(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.app_list_users(UUID, INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.app_create_user(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.app_disable_self_seeded(UUID, INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.app_set_user_disabled(UUID, TEXT, BOOLEAN, INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.app_delete_user(UUID, TEXT, INTEGER) TO anon, authenticated;