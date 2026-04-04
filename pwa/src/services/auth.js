import { reactive, readonly, toRefs } from 'vue'
import { db, getSetting, setSetting } from '../db'

const AUTH_USERS_KEY = 'authUsers'
const AUTH_SESSION_KEY = 'authSession'
const AUTH_SESSION_USERNAME_KEY = 'authSessionUsername'
const AUTH_SESSION_TTL_MINUTES = Number.parseInt(import.meta.env.VITE_SESSION_TTL_MINUTES || '480', 10)
const AUTH_SESSION_TTL_MS = Number.isFinite(AUTH_SESSION_TTL_MINUTES) && AUTH_SESSION_TTL_MINUTES > 0
    ? AUTH_SESSION_TTL_MINUTES * 60 * 1000
    : 8 * 60 * 60 * 1000
const DEV_SEED_ACCOUNT_ENABLED = import.meta.env.DEV && import.meta.env.VITE_DEV_SEED_ACCOUNT === '1'
const DEV_SEED_USERNAME = normalizeUsername(import.meta.env.VITE_DEV_SEED_USERNAME || 'test')
const DEV_SEED_PASSWORD = String(import.meta.env.VITE_DEV_SEED_PASSWORD || '')
const DEV_SEED_GITHUB_TOKEN = String(import.meta.env.VITE_DEV_SEED_GITHUB_TOKEN || '').trim()

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

function nowIso() {
    return new Date().toISOString()
}

function normalizeRole(value) {
    return value === 'admin' ? 'admin' : 'operator'
}

function normalizeUsersRoles(users) {
    const normalized = users.map(user => ({
        ...user,
        role: normalizeRole(user.role),
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
    return {
        username: authUser.username,
        login: authUser.githubLogin,
        name: authUser.displayName ?? authUser.githubLogin,
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
    return {
        username: authUser.username,
        login: authUser.githubLogin,
        name: authUser.displayName ?? authUser.githubLogin,
        role: normalizeRole(authUser.role),
        isSeeded: Boolean(authUser.isSeeded),
        disabled: Boolean(authUser.disabled),
        updatedAt: authUser.updatedAt,
        createdAt: authUser.createdAt,
        isCurrent: state.currentUser?.username === authUser.username,
    }
}

async function buildAuthUser({ username, password, githubToken, role = 'operator' }) {
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
        avatarUrl: profile.avatarUrl,
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

// ── Public API ────────────────────────────────────────────────────────────────

export async function initAuth() {
    try {
        let users = await loadUsers()
        users = await ensureDevSeedAccount(users)
        state.hasUsers = users.some(u => !u.disabled)

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

        async register({ username, password, confirmPassword, githubToken }) {
            const normalized = normalizeUsername(username)
            if (normalized.length < 3) throw new Error('Username minimo: 3 caratteri')
            if (!password || password.length < 8) throw new Error('Password minima: 8 caratteri')
            if (password !== confirmPassword) throw new Error('Le password non coincidono')

            const users = await loadUsers()
            if (users.some(u => u.username === normalized && !u.disabled)) {
                throw new Error('Username gia esistente')
            }

            const newUser = await buildAuthUser({
                username: normalized,
                password,
                githubToken,
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
            const normalized = normalizeUsername(username)
            if (!normalized || !password) throw new Error('Inserisci username e password')

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
            const activeUser = await requireActiveSession()
            if (!newPassword || newPassword.length < 8) throw new Error('Nuova password minima: 8 caratteri')
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

        async signOut() {
            await invalidateSession({ reason: 'manual-signout', auditAction: 'auth_signout' })
        },

        async disableCurrentTestUser() {
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
            await requireAdminSession()
            const users = await loadUsers()
            return users
                .map(summarizeUser)
                .sort((a, b) => a.username.localeCompare(b.username))
        },

        async reactivateSeededUser(username) {
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

        async listRecentAuthEvents(limit = 20) {
            const safeLimit = Math.max(1, Math.min(Number(limit) || 20, 100))
            return db.activityLog
                .where('entityType')
                .equals('auth')
                .reverse()
                .limit(safeLimit)
                .toArray()
        },
    }
}
