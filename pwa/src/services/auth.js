import { reactive, readonly, toRefs } from 'vue'
import { db, getSetting, setSetting } from '../db'
import { getSupabaseConfigStatus, getSupabaseRedirectTo, isSupabaseConfigured, supabase } from './supabaseClient'

const AUTH_USERS_KEY = 'authUsers'
const AUTH_INVITED_PROFILES_KEY = 'authInvitedProfiles'
const AUTH_SESSION_KEY = 'authSession'
const AUTH_SESSION_USERNAME_KEY = 'authSessionUsername'
const USERNAME_PATTERN = /^[a-z0-9._-]{3,32}$/
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_PATTERN = /^[+0-9()\s-]{6,24}$/
const PASSWORD_ROTATION_DAYS = Number.parseInt(import.meta.env.VITE_PASSWORD_ROTATION_DAYS || '90', 10)
const PASSWORD_EXPIRY_WARNING_DAYS = Number.parseInt(import.meta.env.VITE_PASSWORD_EXPIRY_WARNING_DAYS || '14', 10)
const AUTH_SESSION_TTL_MINUTES = Number.parseInt(import.meta.env.VITE_SESSION_TTL_MINUTES || '480', 10)
const AUTH_SESSION_TTL_MS = Number.isFinite(AUTH_SESSION_TTL_MINUTES) && AUTH_SESSION_TTL_MINUTES > 0
    ? AUTH_SESSION_TTL_MINUTES * 60 * 1000
    : 8 * 60 * 60 * 1000
const DEV_SEED_ACCOUNT_ENABLED = import.meta.env.DEV && import.meta.env.VITE_DEV_SEED_ACCOUNT === '1'
const DEV_SEED_USERNAME = normalizeUsername(import.meta.env.VITE_DEV_SEED_USERNAME || 'test')
const DEV_SEED_PASSWORD = String(import.meta.env.VITE_DEV_SEED_PASSWORD || '')
const DEV_SEED_GITHUB_TOKEN = String(import.meta.env.VITE_DEV_SEED_GITHUB_TOKEN || '').trim()
const EMERGENCY_ADMIN_ENABLED = String(import.meta.env.VITE_EMERGENCY_ADMIN_ENABLED || '') === '1'
const EMERGENCY_ADMIN_USERNAME = normalizeUsername(import.meta.env.VITE_EMERGENCY_ADMIN_USERNAME || '')
const EMERGENCY_ADMIN_PASSWORD = String(import.meta.env.VITE_EMERGENCY_ADMIN_PASSWORD || '')
const EMERGENCY_ADMIN_EMAIL = normalizeEmail(import.meta.env.VITE_EMERGENCY_ADMIN_EMAIL || '')
const EMERGENCY_ADMIN_FIRST_NAME = String(import.meta.env.VITE_EMERGENCY_ADMIN_FIRST_NAME || 'Admin').trim()
const EMERGENCY_ADMIN_LAST_NAME = String(import.meta.env.VITE_EMERGENCY_ADMIN_LAST_NAME || 'Emergenza').trim()
const EMERGENCY_ADMIN_GITHUB_TOKEN = String(import.meta.env.VITE_EMERGENCY_ADMIN_GITHUB_TOKEN || '').trim()

// Module-level singleton state
const state = reactive({
    currentUser: null,   // { username, login, name, avatarUrl }
    accessToken: null,   // GitHub token for Gist sync (hidden from login UI)
    isInitialized: false,
    hasUsers: false,
})

function normalizeUsername(value) {
    return String(value ?? '').trim().toLowerCase()
}

function normalizeEmail(value) {
    return String(value ?? '').trim().toLowerCase()
}

function normalizePhone(value) {
    return String(value ?? '').trim()
}

export function sanitizeUsernameInput(value) {
    return normalizeUsername(value)
        .replace(/[^a-z0-9._-]/g, '')
        .slice(0, 32)
}

export function sanitizeEmailInput(value) {
    return normalizeEmail(value).slice(0, 120)
}

function assertValidUsername(username) {
    const normalized = normalizeUsername(username)
    if (!USERNAME_PATTERN.test(normalized)) {
        throw new Error('Username non valido: usa 3-32 caratteri [a-z0-9._-]')
    }
    return normalized
}

function assertValidEmail(email) {
    const normalized = normalizeEmail(email)
    if (!EMAIL_PATTERN.test(normalized)) {
        throw new Error('Email non valida')
    }
    return normalized
}

function assertValidPhone(phone) {
    const normalized = normalizePhone(phone)
    if (!normalized) return ''
    if (!PHONE_PATTERN.test(normalized)) {
        throw new Error('Telefono non valido')
    }
    return normalized
}

function nowIso() {
    return new Date().toISOString()
}

function normalizeRole(value) {
    return value === 'admin' ? 'admin' : 'operator'
}

function getPasswordPolicy(password) {
    const value = String(password || '')
    return {
        minLength: value.length >= 10,
        hasUppercase: /[A-Z]/.test(value),
        hasLowercase: /[a-z]/.test(value),
        hasDigit: /\d/.test(value),
        hasSymbol: /[^A-Za-z0-9]/.test(value),
    }
}

function isPasswordPolicySatisfied(policy) {
    return Object.values(policy).every(Boolean)
}

function getPasswordPolicyErrorMessage(password) {
    const policy = getPasswordPolicy(password)
    if (isPasswordPolicySatisfied(policy)) return null
    return 'Password richiesta: almeno 10 caratteri con maiuscola, minuscola, numero e simbolo'
}

function computeCredentialPolicyStatus(authUser) {
    const updatedAt = authUser?.updatedAt || authUser?.createdAt || null
    if (!updatedAt) {
        return {
            expiresAt: null,
            daysRemaining: null,
            status: 'unknown',
            warning: 'Scadenza credenziali non determinabile.',
        }
    }

    const baseTime = new Date(updatedAt).getTime()
    if (Number.isNaN(baseTime)) {
        return {
            expiresAt: null,
            daysRemaining: null,
            status: 'unknown',
            warning: 'Data credenziali non valida.',
        }
    }

    const expiresAt = new Date(baseTime + (PASSWORD_ROTATION_DAYS * 24 * 60 * 60 * 1000))
    const diffMs = expiresAt.getTime() - Date.now()
    const daysRemaining = Math.ceil(diffMs / (24 * 60 * 60 * 1000))

    if (daysRemaining < 0) {
        return {
            expiresAt: expiresAt.toISOString(),
            daysRemaining,
            status: 'expired',
            warning: 'Credenziali scadute: aggiorna password e segreto operativo.',
        }
    }

    if (daysRemaining <= PASSWORD_EXPIRY_WARNING_DAYS) {
        return {
            expiresAt: expiresAt.toISOString(),
            daysRemaining,
            status: 'warning',
            warning: `Credenziali in scadenza tra ${daysRemaining} giorni.`,
        }
    }

    return {
        expiresAt: expiresAt.toISOString(),
        daysRemaining,
        status: 'ok',
        warning: 'Credenziali entro finestra operativa.',
    }
}

function normalizeUsersRoles(users) {
    const normalized = users.map(user => ({
        ...user,
        role: normalizeRole(user.role),
        firstName: String(user.firstName ?? '').trim(),
        lastName: String(user.lastName ?? '').trim(),
        email: normalizeEmail(user.email),
        phone: normalizePhone(user.phone),
    }))

    const hasActiveAdmin = normalized.some(user => !user.disabled && user.role === 'admin')
    if (!hasActiveAdmin) {
        const firstActiveIndex = normalized.findIndex(user => !user.disabled)
        if (firstActiveIndex >= 0) {
            normalized[firstActiveIndex] = {
                ...normalized[firstActiveIndex],
                role: 'admin',
            }
        }
    }

    return normalized
}

function randomSaltHex(bytes = 16) {
    const arr = new Uint8Array(bytes)
    crypto.getRandomValues(arr)
    return Array.from(arr).map(x => x.toString(16).padStart(2, '0')).join('')
}

async function hashPassword(password, saltHex) {
    const data = new TextEncoder().encode(`${saltHex}:${password}`)
    const digest = await crypto.subtle.digest('SHA-256', data)
    return Array.from(new Uint8Array(digest)).map(x => x.toString(16).padStart(2, '0')).join('')
}

async function loadUsers() {
    const rawUsers = await getSetting(AUTH_USERS_KEY, [])
    const users = Array.isArray(rawUsers) ? rawUsers : []
    const normalized = normalizeUsersRoles(users)

    const changed = JSON.stringify(normalized) !== JSON.stringify(users)
    if (changed) {
        await setSetting(AUTH_USERS_KEY, normalized)
    }

    return normalized
}

async function saveUsers(users) {
    await setSetting(AUTH_USERS_KEY, users)
    state.hasUsers = users.some(u => !u.disabled)
}

function normalizeInvitedProfileEntry(entry) {
    return {
        email: normalizeEmail(entry?.email),
        firstName: String(entry?.firstName ?? '').trim(),
        lastName: String(entry?.lastName ?? '').trim(),
        supabaseUserId: String(entry?.supabaseUserId ?? '').trim(),
        invitedBy: String(entry?.invitedBy ?? '').trim(),
        inviteFlow: String(entry?.inviteFlow ?? '').trim(),
        acceptedAt: String(entry?.acceptedAt ?? nowIso()),
        lastSeenAt: String(entry?.lastSeenAt ?? nowIso()),
    }
}

async function loadInvitedProfiles() {
    const raw = await getSetting(AUTH_INVITED_PROFILES_KEY, [])
    const list = Array.isArray(raw) ? raw : []
    return list
        .map(normalizeInvitedProfileEntry)
        .filter(item => item.email)
}

async function saveInvitedProfiles(entries) {
    await setSetting(AUTH_INVITED_PROFILES_KEY, entries)
}

async function upsertInvitedProfile(entry) {
    const normalizedEntry = normalizeInvitedProfileEntry(entry)
    if (!normalizedEntry.email) return null

    const entries = await loadInvitedProfiles()
    const idx = entries.findIndex(item => item.email === normalizedEntry.email)
    if (idx >= 0) {
        entries[idx] = {
            ...entries[idx],
            ...normalizedEntry,
            acceptedAt: entries[idx].acceptedAt || normalizedEntry.acceptedAt,
            lastSeenAt: nowIso(),
        }
    } else {
        entries.push({
            ...normalizedEntry,
            acceptedAt: nowIso(),
            lastSeenAt: nowIso(),
        })
    }

    await saveInvitedProfiles(entries)
    return idx >= 0 ? entries[idx] : entries[entries.length - 1]
}

async function persistInvitedProfileFromSupabaseSession() {
    if (!isSupabaseConfigured || !supabase) return null

    const { data, error } = await supabase.auth.getSession()
    if (error) throw new Error(error.message)

    const user = data?.session?.user
    if (!user?.email) return null

    const metadata = user.user_metadata ?? {}
    const inviteFlow = String(metadata.inviteFlow ?? '').trim()
    const invitedBy = String(metadata.invitedBy ?? '').trim()
    if (!inviteFlow && !invitedBy) return null

    return upsertInvitedProfile({
        email: user.email,
        firstName: metadata.firstName ?? metadata.first_name ?? '',
        lastName: metadata.lastName ?? metadata.last_name ?? '',
        supabaseUserId: user.id,
        invitedBy,
        inviteFlow,
    })
}

async function fetchGithubProfile(githubToken) {
    const res = await fetch('https://api.github.com/user', {
        headers: {
            Authorization: `Bearer ${githubToken}`,
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
        },
    })
    if (!res.ok) throw new Error(`GitHub /user: ${res.status} — token non valido o scaduto`)
    const { login, name, avatar_url } = await res.json()
    return { login, name: name ?? login, avatarUrl: avatar_url }
}

function toSessionUser(authUser) {
    const firstName = String(authUser.firstName ?? '').trim()
    const lastName = String(authUser.lastName ?? '').trim()
    const fullName = [firstName, lastName].filter(Boolean).join(' ').trim()
    return {
        username: authUser.username,
        login: authUser.githubLogin,
        name: fullName || authUser.displayName || authUser.githubLogin,
        firstName,
        lastName,
        email: normalizeEmail(authUser.email),
        phone: normalizePhone(authUser.phone),
        role: normalizeRole(authUser.role),
        avatarUrl: authUser.avatarUrl,
        isSeeded: Boolean(authUser.isSeeded),
    }
}

function applySession(authUser) {
    state.accessToken = authUser.githubToken
    state.currentUser = toSessionUser(authUser)
}

function clearInMemorySession() {
    state.accessToken = null
    state.currentUser = null
}

async function writeSession(authUser, previousSession = null) {
    const now = new Date()
    const nowISOString = now.toISOString()
    const session = {
        sessionId: previousSession?.sessionId ?? crypto.randomUUID(),
        username: authUser.username,
        userUpdatedAt: authUser.updatedAt,
        createdAt: previousSession?.createdAt ?? nowISOString,
        lastActivityAt: nowISOString,
        expiresAt: new Date(now.getTime() + AUTH_SESSION_TTL_MS).toISOString(),
    }

    await setSetting(AUTH_SESSION_KEY, session)
    await setSetting(AUTH_SESSION_USERNAME_KEY, authUser.username)
    return session
}

function isSessionExpired(session) {
    if (!session?.expiresAt) return true
    return new Date(session.expiresAt).getTime() <= Date.now()
}

async function readSession() {
    const storedSession = await getSetting(AUTH_SESSION_KEY, null)
    if (storedSession && typeof storedSession === 'object') {
        return storedSession
    }

    const legacyUsername = normalizeUsername(await getSetting(AUTH_SESSION_USERNAME_KEY, null))
    if (!legacyUsername) return null

    // Backward-compat migration from legacy username-only session marker.
    return {
        sessionId: crypto.randomUUID(),
        username: legacyUsername,
        userUpdatedAt: null,
        createdAt: nowIso(),
        lastActivityAt: nowIso(),
        expiresAt: new Date(Date.now() + AUTH_SESSION_TTL_MS).toISOString(),
    }
}

async function clearSessionPersistence() {
    await setSetting(AUTH_SESSION_KEY, null)
    await setSetting(AUTH_SESSION_USERNAME_KEY, null)
}

async function appendAuthAudit(action, operatorId, details = {}) {
    const deviceId = (await getSetting('deviceId')) ?? 'unknown'
    await db.activityLog.add({
        entityType: 'auth',
        entityId: operatorId || 'anonymous',
        action,
        deviceId,
        operatorId,
        ts: nowIso(),
        details,
    })
}

async function invalidateSession({ reason = 'manual', username = state.currentUser?.username ?? null, auditAction = 'auth_session_invalidated' } = {}) {
    await clearSessionPersistence()
    clearInMemorySession()
    await appendAuthAudit(auditAction, username, { reason })
}

async function requireActiveSession() {
    if (!state.currentUser) throw new Error('Sessione non attiva')

    const session = await readSession()
    if (!session || isSessionExpired(session)) {
        const username = state.currentUser.username
        await invalidateSession({ reason: 'expired', username, auditAction: 'auth_session_expired' })
        throw new Error('Sessione scaduta. Effettua nuovamente l\'accesso')
    }

    const users = await loadUsers()
    const user = users.find(u => !u.disabled && u.username === state.currentUser.username)
    if (!user) {
        await invalidateSession({ reason: 'user-missing', username: state.currentUser.username })
        throw new Error('Utente non trovato')
    }

    if (session.userUpdatedAt && session.userUpdatedAt !== user.updatedAt) {
        await invalidateSession({ reason: 'credentials-updated', username: user.username })
        throw new Error('Credenziali aggiornate. Effettua nuovamente l\'accesso')
    }

    await writeSession(user, session)
    return user
}

async function requireAdminSession() {
    const activeUser = await requireActiveSession()
    if (normalizeRole(activeUser.role) !== 'admin') {
        await appendAuthAudit('auth_admin_action_denied', activeUser.username, { reason: 'not-admin' })
        throw new Error('Azione consentita solo a utenti admin')
    }
    return activeUser
}

function summarizeUser(authUser) {
    const firstName = String(authUser.firstName ?? '').trim()
    const lastName = String(authUser.lastName ?? '').trim()
    return {
        username: authUser.username,
        login: authUser.githubLogin,
        name: authUser.displayName ?? authUser.githubLogin,
        firstName,
        lastName,
        email: normalizeEmail(authUser.email),
        phone: normalizePhone(authUser.phone),
        role: normalizeRole(authUser.role),
        isSeeded: Boolean(authUser.isSeeded),
        disabled: Boolean(authUser.disabled),
        updatedAt: authUser.updatedAt,
        createdAt: authUser.createdAt,
        isCurrent: state.currentUser?.username === authUser.username,
    }
}

async function buildAuthUser({ username, password, githubToken, firstName, lastName, email, phone = '', role = 'operator' }) {
    const profile = await fetchGithubProfile(githubToken.trim())
    const passwordSalt = randomSaltHex()
    const passwordHash = await hashPassword(password, passwordSalt)
    const now = new Date().toISOString()

    return {
        id: crypto.randomUUID(),
        username,
        passwordSalt,
        passwordHash,
        githubToken: githubToken.trim(),
        githubLogin: profile.login,
        displayName: profile.name,
        firstName: String(firstName ?? '').trim(),
        lastName: String(lastName ?? '').trim(),
        email: normalizeEmail(email),
        phone: normalizePhone(phone),
        avatarUrl: profile.avatarUrl,
        role: normalizeRole(role),
        createdAt: now,
        updatedAt: now,
        disabled: false,
        isSeeded: false,
    }
}

async function buildLocalAuthUser({ username, password, firstName, lastName, email, phone = '', role = 'operator' }) {
    const passwordSalt = randomSaltHex()
    const passwordHash = await hashPassword(password, passwordSalt)
    const now = new Date().toISOString()
    const normalizedUsername = normalizeUsername(username)
    const normalizedFirstName = String(firstName ?? '').trim()
    const normalizedLastName = String(lastName ?? '').trim()
    const fullName = [normalizedFirstName, normalizedLastName].filter(Boolean).join(' ').trim()

    return {
        id: crypto.randomUUID(),
        username: normalizedUsername,
        passwordSalt,
        passwordHash,
        githubToken: '',
        githubLogin: normalizedUsername,
        displayName: fullName || normalizedUsername,
        firstName: normalizedFirstName,
        lastName: normalizedLastName,
        email: normalizeEmail(email),
        phone: normalizePhone(phone),
        avatarUrl: '',
        role: normalizeRole(role),
        createdAt: now,
        updatedAt: now,
        disabled: false,
        isSeeded: false,
    }
}

async function ensureDevSeedAccount(users) {
    if (!DEV_SEED_ACCOUNT_ENABLED) return users
    if (users.some(u => !u.disabled)) return users
    if (!DEV_SEED_USERNAME || !DEV_SEED_PASSWORD || !DEV_SEED_GITHUB_TOKEN) return users

    try {
        const seededUser = await buildAuthUser({
            username: DEV_SEED_USERNAME,
            password: DEV_SEED_PASSWORD,
            githubToken: DEV_SEED_GITHUB_TOKEN,
            role: 'admin',
        })
        seededUser.isSeeded = true
        const nextUsers = [...users, seededUser]
        await saveUsers(nextUsers)
        console.info('[auth] Account di test creato in sviluppo:', DEV_SEED_USERNAME)
        return nextUsers
    } catch (err) {
        console.warn('[auth] Impossibile creare account di test:', err.message)
        return users
    }
}

async function ensureEmergencyAdminAccount(users) {
    if (!EMERGENCY_ADMIN_ENABLED) return users

    if (!USERNAME_PATTERN.test(EMERGENCY_ADMIN_USERNAME)) {
        console.warn('[auth] Emergency admin non creato: username non valido')
        return users
    }

    const passwordPolicyError = getPasswordPolicyErrorMessage(EMERGENCY_ADMIN_PASSWORD)
    if (passwordPolicyError) {
        console.warn('[auth] Emergency admin non creato: password non conforme alla policy')
        return users
    }

    if (!EMAIL_PATTERN.test(EMERGENCY_ADMIN_EMAIL)) {
        console.warn('[auth] Emergency admin non creato: email non valida')
        return users
    }

    const existingIndex = users.findIndex(user => user.username === EMERGENCY_ADMIN_USERNAME)
    if (existingIndex >= 0) {
        const existingUser = users[existingIndex]
        const normalizedRole = normalizeRole(existingUser.role)
        const shouldUpdate = existingUser.disabled || normalizedRole !== 'admin' || normalizeEmail(existingUser.email) !== EMERGENCY_ADMIN_EMAIL
        if (!shouldUpdate) return users

        const nextUsers = [...users]
        nextUsers[existingIndex] = {
            ...existingUser,
            role: 'admin',
            disabled: false,
            email: EMERGENCY_ADMIN_EMAIL,
            firstName: EMERGENCY_ADMIN_FIRST_NAME || existingUser.firstName,
            lastName: EMERGENCY_ADMIN_LAST_NAME || existingUser.lastName,
            updatedAt: nowIso(),
            isSeeded: true,
        }
        await saveUsers(nextUsers)
        return nextUsers
    }

    try {
        const seededUser = EMERGENCY_ADMIN_GITHUB_TOKEN
            ? await buildAuthUser({
                username: EMERGENCY_ADMIN_USERNAME,
                password: EMERGENCY_ADMIN_PASSWORD,
                githubToken: EMERGENCY_ADMIN_GITHUB_TOKEN,
                firstName: EMERGENCY_ADMIN_FIRST_NAME,
                lastName: EMERGENCY_ADMIN_LAST_NAME,
                email: EMERGENCY_ADMIN_EMAIL,
                role: 'admin',
            })
            : await buildLocalAuthUser({
                username: EMERGENCY_ADMIN_USERNAME,
                password: EMERGENCY_ADMIN_PASSWORD,
                firstName: EMERGENCY_ADMIN_FIRST_NAME,
                lastName: EMERGENCY_ADMIN_LAST_NAME,
                email: EMERGENCY_ADMIN_EMAIL,
                role: 'admin',
            })
        seededUser.isSeeded = true
        const nextUsers = [...users, seededUser]
        await saveUsers(nextUsers)
        console.info('[auth] Account admin di emergenza disponibile:', EMERGENCY_ADMIN_USERNAME)
        return nextUsers
    } catch (err) {
        console.warn('[auth] Impossibile creare account admin di emergenza:', err.message)
        return users
    }
}

// ── Public API ────────────────────────────────────────────────────────────────

// ── Supabase Auth helpers ─────────────────────────────────────────────────────

const SUPABASE_PROFILE_CACHE_KEY = 'supabaseProfileCache'
const SUPABASE_HAS_USERS_KEY = 'supabaseHasUsers'

function buildCurrentUserFromProfile(profile) {
    const firstName = String(profile.first_name ?? '').trim()
    const lastName = String(profile.last_name ?? '').trim()
    return {
        username: profile.username,
        login: profile.username,     // reuse as operatorId / audit log field
        name: [firstName, lastName].filter(Boolean).join(' ') || profile.username,
        firstName,
        lastName,
        email: normalizeEmail(profile.email),
        phone: normalizePhone(profile.phone ?? ''),
        role: normalizeRole(profile.role),
        avatarUrl: null,
        isSeeded: Boolean(profile.is_seeded),
        supabaseId: profile.id,
    }
}

async function loadCachedProfile() {
    return getSetting(SUPABASE_PROFILE_CACHE_KEY, null)
}

async function saveCachedProfile(profile) {
    await setSetting(SUPABASE_PROFILE_CACHE_KEY, profile)
}

async function fetchSupabaseProfile(userId) {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
    if (error || !data) return null
    return data
}

async function checkSupabaseHasUsers() {
    try {
        const { count, error } = await supabase
            .from('profiles')
            .select('id', { count: 'exact', head: true })
            .eq('disabled', false)
        if (error) throw error
        const hasUsers = (count ?? 0) > 0
        if (hasUsers) await setSetting(SUPABASE_HAS_USERS_KEY, true)
        return hasUsers
    } catch {
        // Offline or Supabase unavailable — use cached value
        return Boolean(await getSetting(SUPABASE_HAS_USERS_KEY, false))
    }
}

async function initAuthSupabase() {
    // Determine whether any users exist (for showing login vs create-account form)
    state.hasUsers = await checkSupabaseHasUsers()

    // Restore existing session from localStorage (works offline)
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    if (sessionError || !session) return

    // Load profile — prefer live Supabase, fall back to IndexedDB cache when offline
    let profile = null
    try {
        profile = await fetchSupabaseProfile(session.user.id)
        if (profile) await saveCachedProfile(profile)
    } catch {
        profile = await loadCachedProfile()
    }

    if (!profile || profile.disabled) {
        await supabase.auth.signOut().catch(() => null)
        return
    }

    // Restore reactive state
    state.currentUser = buildCurrentUserFromProfile(profile)
    state.accessToken = null  // Supabase session handles auth; no GitHub token
}

// ─────────────────────────────────────────────────────────────────────────────

export async function initAuth() {
    try {
        if (isSupabaseConfigured && supabase) {
            await initAuthSupabase()
        } else {
            // ── Local auth fallback (no Supabase configured) ──────────────────
            let users = await loadUsers()
            users = await ensureDevSeedAccount(users)
            users = await ensureEmergencyAdminAccount(users)
            state.hasUsers = users.some(u => !u.disabled)

            try {
                await persistInvitedProfileFromSupabaseSession()
            } catch (err) {
                console.warn('[auth] invited profile sync error:', err.message)
            }

            const storedSession = await readSession()
            const sessionUsername = normalizeUsername(storedSession?.username)
            if (sessionUsername) {
                const activeUser = users.find(u => !u.disabled && u.username === sessionUsername)
                if (!activeUser) {
                    await invalidateSession({ reason: 'user-missing', username: sessionUsername })
                } else if (isSessionExpired(storedSession)) {
                    await invalidateSession({ reason: 'expired', username: sessionUsername, auditAction: 'auth_session_expired' })
                } else if (storedSession?.userUpdatedAt && storedSession.userUpdatedAt !== activeUser.updatedAt) {
                    await invalidateSession({ reason: 'credentials-updated', username: sessionUsername })
                } else {
                    applySession(activeUser)
                    await writeSession(activeUser, storedSession)
                }
            }
        }
    } catch (err) {
        await clearSessionPersistence()
        clearInMemorySession()
        console.warn('[auth] init error:', err.message)
    } finally {
        state.isInitialized = true
    }
}

export function useAuth() {
    return {
        ...toRefs(readonly(state)),

        async register({ username, password, confirmPassword, githubToken, firstName, lastName, email, phone = '' }) {
            if (isSupabaseConfigured && supabase) {
                const normalized = assertValidUsername(username)
                const normalizedEmail = assertValidEmail(email)
                const normalizedFirstName = String(firstName ?? '').trim()
                const normalizedLastName = String(lastName ?? '').trim()
                const normalizedPhone = assertValidPhone(phone)
                if (!normalizedFirstName || !normalizedLastName) {
                    throw new Error('Nome e cognome sono obbligatori')
                }

                const passwordPolicyError = getPasswordPolicyErrorMessage(password)
                if (passwordPolicyError) throw new Error(passwordPolicyError)
                if (password !== confirmPassword) throw new Error('Le password non coincidono')

                const { count, error: countError } = await supabase
                    .from('profiles')
                    .select('id', { count: 'exact', head: true })
                    .eq('disabled', false)
                if (countError) throw new Error(countError.message)

                const role = (count ?? 0) > 0 ? 'operator' : 'admin'

                const { error: signUpError } = await supabase.auth.signUp({
                    email: normalizedEmail,
                    password,
                    options: {
                        emailRedirectTo: getSupabaseRedirectTo('/#/impostazioni'),
                        data: {
                            username: normalized,
                            firstName: normalizedFirstName,
                            lastName: normalizedLastName,
                            role,
                        },
                    },
                })
                if (signUpError) throw new Error(signUpError.message)

                // Ensure profile row has desired values (trigger also inserts baseline row)
                const { data: userData, error: userError } = await supabase.auth.getUser()
                if (userError || !userData?.user?.id) throw new Error(userError?.message || 'Sessione Supabase non valida')

                const { error: profileError } = await supabase
                    .from('profiles')
                    .upsert({
                        id: userData.user.id,
                        email: normalizedEmail,
                        username: normalized,
                        role,
                        first_name: normalizedFirstName,
                        last_name: normalizedLastName,
                        phone: normalizedPhone,
                        disabled: false,
                    })
                if (profileError) throw new Error(profileError.message)

                const profile = await fetchSupabaseProfile(userData.user.id)
                if (!profile) throw new Error('Impossibile leggere il profilo operatore')

                state.currentUser = buildCurrentUserFromProfile(profile)
                state.accessToken = null
                state.hasUsers = true
                await setSetting(SUPABASE_HAS_USERS_KEY, true)
                await saveCachedProfile(profile)

                await appendAuthAudit('auth_register', profile.username, {
                    provider: 'supabase',
                    role,
                })
                return
            }

            const normalized = assertValidUsername(username)
            const normalizedEmail = assertValidEmail(email)
            const normalizedFirstName = String(firstName ?? '').trim()
            const normalizedLastName = String(lastName ?? '').trim()
            const normalizedPhone = assertValidPhone(phone)
            if (!normalizedFirstName || !normalizedLastName) {
                throw new Error('Nome e cognome sono obbligatori')
            }
            const passwordPolicyError = getPasswordPolicyErrorMessage(password)
            if (passwordPolicyError) throw new Error(passwordPolicyError)
            if (password !== confirmPassword) throw new Error('Le password non coincidono')

            const users = await loadUsers()
            if (users.some(u => u.username === normalized && !u.disabled)) {
                throw new Error('Username gia esistente')
            }
            if (users.some(u => !u.disabled && normalizeEmail(u.email) === normalizedEmail)) {
                throw new Error('Email gia esistente')
            }

            const newUser = await buildAuthUser({
                username: normalized,
                password,
                githubToken,
                firstName: normalizedFirstName,
                lastName: normalizedLastName,
                email: normalizedEmail,
                phone: normalizedPhone,
                role: users.some(u => !u.disabled) ? 'operator' : 'admin',
            })

            users.push(newUser)
            await saveUsers(users)
            await setSetting('ghPat', null) // drop legacy key if present

            applySession(newUser)
            await writeSession(newUser)
            await setSetting('lastUser', {
                login: newUser.githubLogin,
                name: newUser.displayName ?? newUser.githubLogin,
            })
            await appendAuthAudit('auth_register', newUser.username, { githubLogin: newUser.githubLogin })
        },

        async signIn({ username, password }) {
            if (isSupabaseConfigured && supabase) {
                const normalized = normalizeUsername(username)
                if (!normalized || !password) throw new Error('Inserisci username e password')
                if (!USERNAME_PATTERN.test(normalized)) {
                    throw new Error('Username non valido: usa 3-32 caratteri [a-z0-9._-]')
                }

                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('username', normalized)
                    .single()
                if (profileError || !profile) throw new Error('Utente non trovato')
                if (profile.disabled) throw new Error('Utente disabilitato')

                const { error: signInError } = await supabase.auth.signInWithPassword({
                    email: profile.email,
                    password,
                })
                if (signInError) throw new Error('Password non valida')

                state.currentUser = buildCurrentUserFromProfile(profile)
                state.accessToken = null
                await saveCachedProfile(profile)
                await appendAuthAudit('auth_signin_success', profile.username, { provider: 'supabase' })
                return
            }

            const normalized = normalizeUsername(username)
            if (!normalized || !password) throw new Error('Inserisci username e password')
            if (!USERNAME_PATTERN.test(normalized)) {
                await appendAuthAudit('auth_signin_blocked_input', normalized || 'anonymous', { reason: 'invalid-username-format' })
                throw new Error('Username non valido: usa 3-32 caratteri [a-z0-9._-]')
            }

            const users = await loadUsers()
            const user = users.find(u => !u.disabled && u.username === normalized)
            if (!user) {
                await appendAuthAudit('auth_signin_failed', normalized, { reason: 'user-not-found' })
                throw new Error('Utente non trovato')
            }

            const attemptedHash = await hashPassword(password, user.passwordSalt)
            if (attemptedHash !== user.passwordHash) {
                await appendAuthAudit('auth_signin_failed', normalized, { reason: 'invalid-password' })
                throw new Error('Password non valida')
            }

            applySession(user)
            await writeSession(user)
            await setSetting('lastUser', { login: user.githubLogin, name: user.displayName ?? user.githubLogin })
            await appendAuthAudit('auth_signin_success', user.username, { githubLogin: user.githubLogin })
        },

        async changePassword({ currentPassword, newPassword, confirmPassword }) {
            if (isSupabaseConfigured && supabase) {
                if (!state.currentUser) throw new Error('Sessione non attiva')

                const passwordPolicyError = getPasswordPolicyErrorMessage(newPassword)
                if (passwordPolicyError) throw new Error(passwordPolicyError)
                if (newPassword !== confirmPassword) throw new Error('Le nuove password non coincidono')

                // Re-authenticate before changing password
                const email = normalizeEmail(state.currentUser.email)
                const { error: reauthError } = await supabase.auth.signInWithPassword({
                    email,
                    password: currentPassword,
                })
                if (reauthError) throw new Error('Password corrente non valida')

                const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })
                if (updateError) throw new Error(updateError.message)

                await appendAuthAudit('auth_password_changed', state.currentUser.username, { provider: 'supabase' })
                await supabase.auth.signOut().catch(() => null)
                state.currentUser = null
                state.accessToken = null
                return
            }

            const activeUser = await requireActiveSession()
            const passwordPolicyError = getPasswordPolicyErrorMessage(newPassword)
            if (passwordPolicyError) throw new Error(passwordPolicyError)
            if (newPassword !== confirmPassword) throw new Error('Le nuove password non coincidono')

            const users = await loadUsers()
            const idx = users.findIndex(u => !u.disabled && u.username === activeUser.username)
            if (idx < 0) throw new Error('Utente non trovato')

            const user = users[idx]
            const currentHash = await hashPassword(currentPassword, user.passwordSalt)
            if (currentHash !== user.passwordHash) throw new Error('Password corrente non valida')

            const newSalt = randomSaltHex()
            users[idx] = {
                ...user,
                passwordSalt: newSalt,
                passwordHash: await hashPassword(newPassword, newSalt),
                updatedAt: new Date().toISOString(),
            }

            await saveUsers(users)
            await invalidateSession({ reason: 'password-changed', username: activeUser.username, auditAction: 'auth_password_changed' })
        },

        async updateCurrentProfile({ firstName, lastName, phone = '', email }) {
            if (isSupabaseConfigured && supabase) {
                if (!state.currentUser) throw new Error('Sessione non attiva')

                const normalizedFirstName = String(firstName ?? '').trim()
                const normalizedLastName = String(lastName ?? '').trim()
                const normalizedPhone = assertValidPhone(phone)
                const normalizedEmail = assertValidEmail(email)

                if (!normalizedFirstName || !normalizedLastName) {
                    throw new Error('Nome e cognome sono obbligatori')
                }

                const { data: userData, error: userError } = await supabase.auth.getUser()
                if (userError || !userData?.user?.id) throw new Error(userError?.message || 'Sessione non valida')

                const { error: updateProfileError } = await supabase
                    .from('profiles')
                    .update({
                        first_name: normalizedFirstName,
                        last_name: normalizedLastName,
                        phone: normalizedPhone,
                        email: normalizedEmail,
                    })
                    .eq('id', userData.user.id)
                if (updateProfileError) throw new Error(updateProfileError.message)

                const { error: updateAuthError } = await supabase.auth.updateUser({
                    email: normalizedEmail,
                    data: {
                        firstName: normalizedFirstName,
                        lastName: normalizedLastName,
                        phone: normalizedPhone,
                    },
                })
                if (updateAuthError) throw new Error(updateAuthError.message)

                const profile = await fetchSupabaseProfile(userData.user.id)
                if (!profile) throw new Error('Profilo non disponibile dopo aggiornamento')

                const previousEmail = normalizeEmail(state.currentUser?.email)
                state.currentUser = buildCurrentUserFromProfile(profile)
                await saveCachedProfile(profile)

                await appendAuthAudit('auth_profile_updated', profile.username, {
                    emailChanged: previousEmail !== normalizedEmail,
                    phoneUpdated: Boolean(normalizedPhone),
                    provider: 'supabase',
                })

                return state.currentUser
            }

            const activeUser = await requireActiveSession()
            const normalizedFirstName = String(firstName ?? '').trim()
            const normalizedLastName = String(lastName ?? '').trim()
            const normalizedPhone = assertValidPhone(phone)
            const normalizedEmail = assertValidEmail(email)

            if (!normalizedFirstName || !normalizedLastName) {
                throw new Error('Nome e cognome sono obbligatori')
            }

            const users = await loadUsers()
            const idx = users.findIndex(u => !u.disabled && u.username === activeUser.username)
            if (idx < 0) throw new Error('Utente non trovato')

            if (users.some((u, userIdx) => userIdx !== idx && !u.disabled && normalizeEmail(u.email) === normalizedEmail)) {
                throw new Error('Email gia esistente')
            }

            const previousEmail = normalizeEmail(users[idx].email)
            users[idx] = {
                ...users[idx],
                firstName: normalizedFirstName,
                lastName: normalizedLastName,
                phone: normalizedPhone,
                email: normalizedEmail,
                updatedAt: nowIso(),
            }

            await saveUsers(users)
            applySession(users[idx])
            await writeSession(users[idx], await readSession())
            await setSetting('lastUser', { login: users[idx].githubLogin, name: users[idx].displayName ?? users[idx].githubLogin })

            // Best effort: if a Supabase auth session is active for the same user, keep profile metadata aligned.
            if (isSupabaseConfigured && supabase) {
                try {
                    const { data: supabaseUserData, error: supabaseUserError } = await supabase.auth.getUser()
                    if (!supabaseUserError) {
                        const supabaseEmail = normalizeEmail(supabaseUserData?.user?.email)
                        if (supabaseEmail && supabaseEmail === previousEmail) {
                            const payload = {
                                data: {
                                    firstName: normalizedFirstName,
                                    lastName: normalizedLastName,
                                    phone: normalizedPhone,
                                },
                            }
                            if (normalizedEmail !== supabaseEmail) payload.email = normalizedEmail
                            await supabase.auth.updateUser(payload)
                        }
                    }
                } catch (_ignored) {
                    // Local profile update remains authoritative even if Supabase sync is unavailable.
                }
            }

            await appendAuthAudit('auth_profile_updated', users[idx].username, {
                emailChanged: normalizedEmail !== previousEmail,
                phoneUpdated: Boolean(normalizedPhone),
            })

            return toSessionUser(users[idx])
        },

        async signOut() {
            if (isSupabaseConfigured && supabase) {
                const username = state.currentUser?.username ?? null
                await supabase.auth.signOut().catch(() => null)
                state.currentUser = null
                state.accessToken = null
                await appendAuthAudit('auth_signout', username, { provider: 'supabase' })
                return
            }

            await invalidateSession({ reason: 'manual-signout', auditAction: 'auth_signout' })
        },

        async disableCurrentTestUser() {
            if (isSupabaseConfigured && supabase) {
                if (!state.currentUser) throw new Error('Sessione non attiva')
                if (!state.currentUser.isSeeded) throw new Error('Solo gli account di prova possono essere disattivati qui')

                const { data: userData, error: userError } = await supabase.auth.getUser()
                if (userError || !userData?.user?.id) throw new Error(userError?.message || 'Sessione non valida')

                const { error } = await supabase
                    .from('profiles')
                    .update({ disabled: true })
                    .eq('id', userData.user.id)
                if (error) throw new Error(error.message)

                await appendAuthAudit('auth_seed_user_disabled', state.currentUser.username, { provider: 'supabase' })
                await supabase.auth.signOut().catch(() => null)
                state.currentUser = null
                state.accessToken = null
                return
            }

            const activeUser = await requireActiveSession()

            const users = await loadUsers()
            const idx = users.findIndex(u => !u.disabled && u.username === activeUser.username)
            if (idx < 0) throw new Error('Utente non trovato')
            if (!users[idx].isSeeded) throw new Error('Solo gli account di prova possono essere disattivati qui')

            users[idx] = {
                ...users[idx],
                disabled: true,
                updatedAt: new Date().toISOString(),
            }

            await saveUsers(users)
            await invalidateSession({ reason: 'seed-user-disabled', username: activeUser.username, auditAction: 'auth_seed_user_disabled' })
        },

        async listUsers() {
            if (isSupabaseConfigured && supabase) {
                if (!state.currentUser || state.currentUser.role !== 'admin') {
                    throw new Error('Permesso negato: solo admin')
                }

                const { data, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .order('username', { ascending: true })
                if (error) throw new Error(error.message)

                return (data ?? []).map(item => ({
                    username: item.username,
                    displayName: [item.first_name, item.last_name].filter(Boolean).join(' ') || item.username,
                    role: normalizeRole(item.role),
                    email: item.email,
                    phone: item.phone || '',
                    githubLogin: item.username,
                    disabled: Boolean(item.disabled),
                    isSeeded: Boolean(item.is_seeded),
                    createdAt: item.created_at,
                    updatedAt: item.updated_at,
                    credentialStatus: {
                        expiresAt: null,
                        daysRemaining: null,
                        status: 'unknown',
                        warning: 'Gestione password demandata a Supabase Auth',
                    },
                }))
            }

            await requireAdminSession()
            const users = await loadUsers()
            return users
                .map(summarizeUser)
                .sort((a, b) => a.username.localeCompare(b.username))
        },

        async requestPasswordResetByEmail(email, { redirectTo } = {}) {
            const normalizedEmail = assertValidEmail(email)
            if (!isSupabaseConfigured || !supabase) {
                const config = getSupabaseConfigStatus()
                throw new Error(`Reset email non disponibile: configura ${config.missingVars.join(', ')} in pwa/.env.local e nelle GitHub Variables`)
            }

            const targetRedirect = redirectTo || getSupabaseRedirectTo('/#/impostazioni')
            const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
                redirectTo: targetRedirect,
            })
            if (error) throw new Error(error.message)

            await appendAuthAudit('auth_password_reset_email_requested', normalizedEmail, {
                targetEmail: normalizedEmail,
                provider: 'supabase',
            })
        },

        async completePasswordRecovery({ newPassword, confirmPassword }) {
            if (!isSupabaseConfigured || !supabase) {
                const config = getSupabaseConfigStatus()
                throw new Error(`Recupero password non disponibile: configura ${config.missingVars.join(', ')} in pwa/.env.local e nelle GitHub Variables`)
            }

            const passwordPolicyError = getPasswordPolicyErrorMessage(newPassword)
            if (passwordPolicyError) throw new Error(passwordPolicyError)
            if (newPassword !== confirmPassword) throw new Error('Le nuove password non coincidono')

            const { data: userData, error: userError } = await supabase.auth.getUser()
            if (userError) throw new Error(userError.message)

            const recoveryEmail = normalizeEmail(userData?.user?.email)
            if (!recoveryEmail) {
                throw new Error('Sessione di recupero non valida o scaduta. Richiedi un nuovo link email.')
            }

            const users = await loadUsers()
            const idx = users.findIndex(u => !u.disabled && normalizeEmail(u.email) === recoveryEmail)
            if (idx < 0) {
                throw new Error('Nessun utente locale associato a questa email')
            }

            const { error: supabaseUpdateError } = await supabase.auth.updateUser({
                password: newPassword,
            })
            if (supabaseUpdateError) throw new Error(supabaseUpdateError.message)

            const newSalt = randomSaltHex()
            users[idx] = {
                ...users[idx],
                passwordSalt: newSalt,
                passwordHash: await hashPassword(newPassword, newSalt),
                updatedAt: nowIso(),
            }
            await saveUsers(users)

            await appendAuthAudit('auth_password_recovery_completed', users[idx].username, {
                email: recoveryEmail,
                provider: 'supabase',
            })

            await supabase.auth.signOut()

            if (state.currentUser?.username === users[idx].username) {
                await invalidateSession({ reason: 'password-recovery', username: users[idx].username, auditAction: 'auth_password_recovery_local_session_reset' })
            }

            return {
                username: users[idx].username,
                email: recoveryEmail,
            }
        },

        async sendInviteLink({ email, firstName, lastName, redirectTo }) {
            const normalizedEmail = assertValidEmail(email)
            const normalizedFirstName = String(firstName ?? '').trim()
            const normalizedLastName = String(lastName ?? '').trim()
            if (!normalizedFirstName || !normalizedLastName) {
                throw new Error('Nome e cognome invitato sono obbligatori')
            }
            if (!isSupabaseConfigured || !supabase) {
                const config = getSupabaseConfigStatus()
                throw new Error(`Inviti email non disponibili: configura ${config.missingVars.join(', ')} in pwa/.env.local e nelle GitHub Variables`)
            }

            let adminUsername = null
            if (state.currentUser?.role === 'admin') {
                adminUsername = state.currentUser.username
            } else {
                const localAdmin = await requireAdminSession().catch(() => null)
                adminUsername = localAdmin?.username ?? null
            }
            if (!adminUsername) {
                throw new Error('Permesso negato: solo admin')
            }

            const targetRedirect = redirectTo || getSupabaseRedirectTo('/#/impostazioni')
            const { error } = await supabase.auth.signInWithOtp({
                email: normalizedEmail,
                options: {
                    shouldCreateUser: true,
                    emailRedirectTo: targetRedirect,
                    data: {
                        firstName: normalizedFirstName,
                        lastName: normalizedLastName,
                        invitedBy: adminUsername,
                        inviteFlow: 'meditrace-admin',
                    },
                },
            })
            if (error) throw new Error(error.message)

            await appendAuthAudit('auth_invite_email_sent', adminUsername, {
                targetEmail: normalizedEmail,
                targetName: `${normalizedFirstName} ${normalizedLastName}`,
                provider: 'supabase',
            })
        },

        async listInvitedProfiles() {
            if (isSupabaseConfigured && supabase) {
                if (!state.currentUser || state.currentUser.role !== 'admin') {
                    throw new Error('Permesso negato: solo admin')
                }
                const { data, error } = await supabase
                    .from('profiles')
                    .select('email, first_name, last_name, updated_at')
                    .order('email', { ascending: true })
                if (error) throw new Error(error.message)

                return (data ?? []).map(item => ({
                    email: normalizeEmail(item.email),
                    firstName: item.first_name ?? '',
                    lastName: item.last_name ?? '',
                    invitedBy: '',
                    acceptedAt: item.updated_at,
                    lastSeenAt: item.updated_at,
                }))
            }

            await requireAdminSession()
            const profiles = await loadInvitedProfiles()
            return profiles.sort((a, b) => a.email.localeCompare(b.email))
        },

        async reactivateSeededUser(username) {
            if (isSupabaseConfigured && supabase) {
                if (!state.currentUser || state.currentUser.role !== 'admin') {
                    throw new Error('Permesso negato: solo admin')
                }

                const normalized = normalizeUsername(username)
                const { data: target, error: fetchError } = await supabase
                    .from('profiles')
                    .select('id, is_seeded')
                    .eq('username', normalized)
                    .single()
                if (fetchError || !target) throw new Error('Utente non trovato')
                if (!target.is_seeded) throw new Error('Solo utenti di prova')

                const { error } = await supabase
                    .from('profiles')
                    .update({ disabled: false })
                    .eq('id', target.id)
                if (error) throw new Error(error.message)

                await appendAuthAudit('auth_seed_user_reactivated', state.currentUser.username, {
                    targetUser: normalized,
                    provider: 'supabase',
                })
                return
            }

            const adminUser = await requireAdminSession()
            const normalized = normalizeUsername(username)
            const users = await loadUsers()
            const idx = users.findIndex(u => u.username === normalized)
            if (idx < 0) throw new Error('Utente non trovato')
            if (!users[idx].isSeeded) throw new Error('Solo utenti di prova')
            if (!users[idx].disabled) return

            users[idx] = {
                ...users[idx],
                disabled: false,
                updatedAt: new Date().toISOString(),
            }
            await saveUsers(users)
            await appendAuthAudit('auth_seed_user_reactivated', adminUser.username, { targetUser: normalized })
        },

        async deleteSeededUser(username) {
            if (isSupabaseConfigured && supabase) {
                if (!state.currentUser || state.currentUser.role !== 'admin') {
                    throw new Error('Permesso negato: solo admin')
                }

                const normalized = normalizeUsername(username)
                const { data: target, error: fetchError } = await supabase
                    .from('profiles')
                    .select('id, is_seeded')
                    .eq('username', normalized)
                    .single()
                if (fetchError || !target) throw new Error('Utente non trovato')
                if (!target.is_seeded) throw new Error('Solo utenti di prova')

                const { error } = await supabase
                    .from('profiles')
                    .delete()
                    .eq('id', target.id)
                if (error) throw new Error(error.message)

                await appendAuthAudit('auth_seed_user_deleted', state.currentUser.username, {
                    targetUser: normalized,
                    provider: 'supabase',
                })
                return
            }

            const adminUser = await requireAdminSession()
            const normalized = normalizeUsername(username)
            const users = await loadUsers()
            const target = users.find(u => u.username === normalized)
            if (!target) throw new Error('Utente non trovato')
            if (!target.isSeeded) throw new Error('Solo utenti di prova')

            const remaining = users.filter(u => u.username !== normalized)
            await saveUsers(remaining)

            if (state.currentUser?.username === normalized) {
                await invalidateSession({ reason: 'seed-user-deleted', username: normalized, auditAction: 'auth_seed_user_deleted' })
                return
            }

            await appendAuthAudit('auth_seed_user_deleted', adminUser.username, { targetUser: normalized })
        },

        async getSessionInfo() {
            if (isSupabaseConfigured && supabase) {
                const { data, error } = await supabase.auth.getSession()
                if (error) throw new Error(error.message)
                const session = data?.session
                return {
                    ttlMinutes: null,
                    sessionId: session?.access_token ? 'supabase-session' : null,
                    username: state.currentUser?.username ?? null,
                    createdAt: session ? new Date(session.expires_at ? (session.expires_at * 1000) : Date.now()).toISOString() : null,
                    lastActivityAt: null,
                    expiresAt: session?.expires_at ? new Date(session.expires_at * 1000).toISOString() : null,
                    isExpired: !session,
                }
            }

            const session = await readSession()
            const expired = isSessionExpired(session)
            return {
                ttlMinutes: Math.floor(AUTH_SESSION_TTL_MS / 60000),
                sessionId: session?.sessionId ?? null,
                username: session?.username ?? null,
                createdAt: session?.createdAt ?? null,
                lastActivityAt: session?.lastActivityAt ?? null,
                expiresAt: session?.expiresAt ?? null,
                isExpired: expired,
            }
        },

        async getCredentialPolicyStatus() {
            if (isSupabaseConfigured && supabase) {
                if (!state.currentUser) {
                    return {
                        expiresAt: null,
                        daysRemaining: null,
                        status: 'unknown',
                        warning: 'Sessione non attiva.',
                    }
                }
                return {
                    expiresAt: null,
                    daysRemaining: null,
                    status: 'ok',
                    warning: 'Policy password gestita da Supabase Auth.',
                }
            }

            if (!state.currentUser) {
                return {
                    expiresAt: null,
                    daysRemaining: null,
                    status: 'unknown',
                    warning: 'Sessione non attiva.',
                }
            }

            const users = await loadUsers()
            const user = users.find(item => !item.disabled && item.username === state.currentUser.username)
            if (!user) {
                return {
                    expiresAt: null,
                    daysRemaining: null,
                    status: 'unknown',
                    warning: 'Utente non trovato.',
                }
            }

            return computeCredentialPolicyStatus(user)
        },

        async listRecentAuthEvents(limit = 20, filterText = '') {
            const safeLimit = Math.max(1, Math.min(Number(limit) || 20, 100))
            const events = await db.activityLog
                .where('entityType')
                .equals('auth')
                .reverse()
                .limit(safeLimit)
                .toArray()

            const normalizedFilter = String(filterText || '').trim().toLowerCase()
            if (!normalizedFilter) return events

            return events.filter(event => {
                return [event.action, event.operatorId, event.entityId]
                    .filter(Boolean)
                    .some(value => String(value).toLowerCase().includes(normalizedFilter))
            })
        },

        getPasswordPolicy,
    }
}

export const authTestUtils = {
    getPasswordPolicy,
    isPasswordPolicySatisfied,
    getPasswordPolicyErrorMessage,
    computeCredentialPolicyStatus,
    sanitizeUsernameInput,
    sanitizeEmailInput,
}
