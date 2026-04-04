import { reactive, readonly, toRefs } from 'vue'
import { getSetting, setSetting } from '../db'

const AUTH_USERS_KEY = 'authUsers'
const AUTH_SESSION_USERNAME_KEY = 'authSessionUsername'
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
    const users = await getSetting(AUTH_USERS_KEY, [])
    return Array.isArray(users) ? users : []
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
        avatarUrl: authUser.avatarUrl,
        isSeeded: Boolean(authUser.isSeeded),
    }
}

function applySession(authUser) {
    state.accessToken = authUser.githubToken
    state.currentUser = toSessionUser(authUser)
}

function summarizeUser(authUser) {
    return {
        username: authUser.username,
        login: authUser.githubLogin,
        name: authUser.displayName ?? authUser.githubLogin,
        isSeeded: Boolean(authUser.isSeeded),
        disabled: Boolean(authUser.disabled),
        updatedAt: authUser.updatedAt,
        createdAt: authUser.createdAt,
        isCurrent: state.currentUser?.username === authUser.username,
    }
}

async function buildAuthUser({ username, password, githubToken }) {
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

        const sessionUsername = normalizeUsername(await getSetting(AUTH_SESSION_USERNAME_KEY, null))
        if (sessionUsername) {
            const activeUser = users.find(u => !u.disabled && u.username === sessionUsername)
            if (activeUser) applySession(activeUser)
        }
    } catch (err) {
        await setSetting(AUTH_SESSION_USERNAME_KEY, null)
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
            })

            users.push(newUser)
            await saveUsers(users)
            await setSetting(AUTH_SESSION_USERNAME_KEY, normalized)
            await setSetting('ghPat', null) // drop legacy key if present

            applySession(newUser)
            await setSetting('lastUser', {
                login: newUser.githubLogin,
                name: newUser.displayName ?? newUser.githubLogin,
            })
        },

        async signIn({ username, password }) {
            const normalized = normalizeUsername(username)
            if (!normalized || !password) throw new Error('Inserisci username e password')

            const users = await loadUsers()
            const user = users.find(u => !u.disabled && u.username === normalized)
            if (!user) throw new Error('Utente non trovato')

            const attemptedHash = await hashPassword(password, user.passwordSalt)
            if (attemptedHash !== user.passwordHash) throw new Error('Password non valida')

            applySession(user)
            await setSetting(AUTH_SESSION_USERNAME_KEY, normalized)
            await setSetting('lastUser', { login: user.githubLogin, name: user.displayName ?? user.githubLogin })
        },

        async changePassword({ currentPassword, newPassword, confirmPassword }) {
            if (!state.currentUser) throw new Error('Sessione non attiva')
            if (!newPassword || newPassword.length < 8) throw new Error('Nuova password minima: 8 caratteri')
            if (newPassword !== confirmPassword) throw new Error('Le nuove password non coincidono')

            const users = await loadUsers()
            const idx = users.findIndex(u => !u.disabled && u.username === state.currentUser.username)
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
        },

        async signOut() {
            await setSetting(AUTH_SESSION_USERNAME_KEY, null)
            state.accessToken = null
            state.currentUser = null
        },

        async disableCurrentTestUser() {
            if (!state.currentUser) throw new Error('Sessione non attiva')

            const users = await loadUsers()
            const idx = users.findIndex(u => !u.disabled && u.username === state.currentUser.username)
            if (idx < 0) throw new Error('Utente non trovato')
            if (!users[idx].isSeeded) throw new Error('Solo gli account di prova possono essere disattivati qui')

            users[idx] = {
                ...users[idx],
                disabled: true,
                updatedAt: new Date().toISOString(),
            }

            await saveUsers(users)
            await setSetting(AUTH_SESSION_USERNAME_KEY, null)
            state.accessToken = null
            state.currentUser = null
        },

        async listUsers() {
            const users = await loadUsers()
            return users
                .map(summarizeUser)
                .sort((a, b) => a.username.localeCompare(b.username))
        },

        async reactivateSeededUser(username) {
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
        },

        async deleteSeededUser(username) {
            const normalized = normalizeUsername(username)
            const users = await loadUsers()
            const target = users.find(u => u.username === normalized)
            if (!target) throw new Error('Utente non trovato')
            if (!target.isSeeded) throw new Error('Solo utenti di prova')

            const remaining = users.filter(u => u.username !== normalized)
            await saveUsers(remaining)

            if (state.currentUser?.username === normalized) {
                await setSetting(AUTH_SESSION_USERNAME_KEY, null)
                state.accessToken = null
                state.currentUser = null
            }
        },
    }
}
