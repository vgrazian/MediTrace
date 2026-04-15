-- ══════════════════════════════════════════════════════════════════════════
-- MediTrace — Supabase initial schema
-- Run once in the Supabase dashboard SQL editor (Database → SQL Editor).
-- ══════════════════════════════════════════════════════════════════════════

-- ── profiles ──────────────────────────────────────────────────────────────
-- Extends auth.users with app-specific fields.
-- A trigger auto-inserts a row when a new auth.users row is created.

CREATE TABLE IF NOT EXISTS public.profiles (
    id         UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email      TEXT        NOT NULL,
    username   TEXT        UNIQUE NOT NULL,
    role       TEXT        NOT NULL DEFAULT 'operator'
                               CHECK (role IN ('admin', 'operator')),
    first_name TEXT        NOT NULL DEFAULT '',
    last_name  TEXT        NOT NULL DEFAULT '',
    phone      TEXT                 DEFAULT '',
    disabled   BOOLEAN     NOT NULL DEFAULT FALSE,
    is_seeded  BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create / update profile row when an auth user is created.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, username, role, first_name, last_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(
            NULLIF(TRIM(NEW.raw_user_meta_data->>'username'), ''),
            LOWER(SPLIT_PART(NEW.email, '@', 1))
        ),
        COALESCE(NEW.raw_user_meta_data->>'role', 'operator'),
        COALESCE(NEW.raw_user_meta_data->>'firstName', ''),
        COALESCE(NEW.raw_user_meta_data->>'lastName', '')
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── sync_files ─────────────────────────────────────────────────────────────
-- Stores JSON snapshot files shared across all devices (replaces GitHub Gist).
-- Expected rows: meditrace-manifest.json, meditrace-data.json

CREATE TABLE IF NOT EXISTS public.sync_files (
    name       TEXT        PRIMARY KEY,
    content    JSONB       NOT NULL DEFAULT '{}',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Row Level Security ─────────────────────────────────────────────────────

ALTER TABLE public.profiles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_files ENABLE ROW LEVEL SECURITY;

-- profiles: anon clients (unauthenticated) can SELECT rows.
-- This allows a new device to look up "username → email" before the user
-- has logged in, so the login form can work without a prior session.
DROP POLICY IF EXISTS profiles_select_public ON public.profiles;
CREATE POLICY profiles_select_public
    ON public.profiles FOR SELECT TO anon, authenticated
    USING (true);

-- profiles: authenticated users can insert their own row.
DROP POLICY IF EXISTS profiles_insert_own ON public.profiles;
CREATE POLICY profiles_insert_own
    ON public.profiles FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = id);

-- profiles: users can update self; admins can update anyone.
DROP POLICY IF EXISTS profiles_update_self_or_admin ON public.profiles;
CREATE POLICY profiles_update_self_or_admin
    ON public.profiles FOR UPDATE TO authenticated
    USING (
        auth.uid() = id
        OR EXISTS (
            SELECT 1
            FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'admin' AND p.disabled = FALSE
        )
    )
    WITH CHECK (
        auth.uid() = id
        OR EXISTS (
            SELECT 1
            FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'admin' AND p.disabled = FALSE
        )
    );

-- profiles: admins can delete users (used for seeded-user cleanup).
DROP POLICY IF EXISTS profiles_delete_admin ON public.profiles;
CREATE POLICY profiles_delete_admin
    ON public.profiles FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'admin' AND p.disabled = FALSE
        )
    );

-- sync_files: only authenticated users (any role) can read or write.
DROP POLICY IF EXISTS sync_files_authenticated ON public.sync_files;
CREATE POLICY sync_files_authenticated
    ON public.sync_files FOR ALL TO authenticated
    USING      (true)
    WITH CHECK (true);

-- ── Helper: update updated_at automatically ────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_set_updated_at  ON public.profiles;
CREATE TRIGGER profiles_set_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS sync_files_set_updated_at ON public.sync_files;
CREATE TRIGGER sync_files_set_updated_at
    BEFORE UPDATE ON public.sync_files
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
