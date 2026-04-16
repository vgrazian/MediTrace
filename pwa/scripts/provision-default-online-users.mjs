#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = String(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim()
const SUPABASE_PUBLISHABLE_KEY = String(process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '').trim()
const PROVISION_ONLY = String(process.env.PROVISION_ONLY || '').trim()
const SESSION_TTL_MINUTES = 480

function isPasswordStrong(password) {
    const hasUpper = /[A-Z]/.test(password)
    const hasLower = /[a-z]/.test(password)
    const hasDigit = /[0-9]/.test(password)
    const hasSymbol = /[^A-Za-z0-9]/.test(password)
    return password.length >= 10 && hasUpper && hasLower && hasDigit && hasSymbol
}

function buildDefaultUsers() {
    return [
        {
            key: 'admin',
            username: String(process.env.MEDITRACE_DEFAULT_ADMIN_USERNAME || '').trim(),
            password: String(process.env.MEDITRACE_DEFAULT_ADMIN_PASSWORD || '').trim(),
            email: String(process.env.MEDITRACE_DEFAULT_ADMIN_EMAIL || '').trim(),
            firstName: 'Admin',
            lastName: 'MediTrace',
            role: 'admin',
        },
        {
            key: 'operatore1',
            username: String(process.env.MEDITRACE_DEFAULT_OPERATOR1_USERNAME || '').trim(),
            password: String(process.env.MEDITRACE_DEFAULT_OPERATOR1_PASSWORD || '').trim(),
            email: String(process.env.MEDITRACE_DEFAULT_OPERATOR1_EMAIL || '').trim(),
            firstName: 'Operatore',
            lastName: 'Uno',
            role: 'operator',
        },
        {
            key: 'operatore2',
            username: String(process.env.MEDITRACE_DEFAULT_OPERATOR2_USERNAME || '').trim(),
            password: String(process.env.MEDITRACE_DEFAULT_OPERATOR2_PASSWORD || '').trim(),
            email: String(process.env.MEDITRACE_DEFAULT_OPERATOR2_EMAIL || '').trim(),
            firstName: 'Operatore',
            lastName: 'Due',
            role: 'operator',
        },
        {
            key: 'operatore3',
            username: String(process.env.MEDITRACE_DEFAULT_OPERATOR3_USERNAME || '').trim(),
            password: String(process.env.MEDITRACE_DEFAULT_OPERATOR3_PASSWORD || '').trim(),
            email: String(process.env.MEDITRACE_DEFAULT_OPERATOR3_EMAIL || '').trim(),
            firstName: 'Operatore',
            lastName: 'Tre',
            role: 'operator',
        },
        {
            key: 'operatore4',
            username: String(process.env.MEDITRACE_DEFAULT_OPERATOR4_USERNAME || '').trim(),
            password: String(process.env.MEDITRACE_DEFAULT_OPERATOR4_PASSWORD || '').trim(),
            email: String(process.env.MEDITRACE_DEFAULT_OPERATOR4_EMAIL || '').trim(),
            firstName: 'Operatore',
            lastName: 'Quattro',
            role: 'operator',
        },
        {
            key: 'operatore5',
            username: String(process.env.MEDITRACE_DEFAULT_OPERATOR5_USERNAME || '').trim(),
            password: String(process.env.MEDITRACE_DEFAULT_OPERATOR5_PASSWORD || '').trim(),
            email: String(process.env.MEDITRACE_DEFAULT_OPERATOR5_EMAIL || '').trim(),
            firstName: 'Operatore',
            lastName: 'Cinque',
            role: 'operator',
        },
    ]
}

function validateInputs(users) {
    if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
        throw new Error('SUPABASE_URL e SUPABASE_PUBLISHABLE_KEY sono obbligatori')
    }

    for (const user of users) {
        if (!user.username || !user.password || !user.email) {
            throw new Error(`Credenziali mancanti per ${user.key}`)
        }
        if (!isPasswordStrong(user.password)) {
            throw new Error(`Password non conforme per ${user.key}: servono almeno 10 caratteri con maiuscole, minuscole, numeri e simboli`)
        }
    }
}

function createSupabaseClient() {
    return createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
        },
    })
}

async function rpc(client, name, params = {}) {
    const { data, error } = await client.rpc(name, params)
    if (error) throw new Error(error.message)
    return data
}

async function ensureAdminSession(client, adminUser) {
    const hasUsers = Boolean(await rpc(client, 'app_has_users'))
    if (!hasUsers) {
        const payload = await rpc(client, 'app_register_first_admin', {
            p_username: adminUser.username,
            p_password: adminUser.password,
            p_first_name: adminUser.firstName,
            p_last_name: adminUser.lastName,
            p_email: adminUser.email,
            p_phone: '',
            p_session_ttl_minutes: SESSION_TTL_MINUTES,
        })
        return {
            token: payload?.session?.token,
            bootstrapped: true,
        }
    }

    const payload = await rpc(client, 'app_sign_in', {
        p_username: adminUser.username,
        p_password: adminUser.password,
        p_session_ttl_minutes: SESSION_TTL_MINUTES,
    })
    return {
        token: payload?.session?.token,
        bootstrapped: false,
    }
}

async function listExistingUsers(client, token) {
    const rows = await rpc(client, 'app_list_users', {
        p_token: token,
        p_session_ttl_minutes: SESSION_TTL_MINUTES,
    })
    return Array.isArray(rows) ? rows : []
}

async function ensureManagedUser(client, token, user, existingUsers) {
    const existing = existingUsers.find(entry => entry.username === user.username)
    if (!existing) {
        await rpc(client, 'app_create_user', {
            p_token: token,
            p_username: user.username,
            p_password: user.password,
            p_first_name: user.firstName,
            p_last_name: user.lastName,
            p_email: user.email,
            p_phone: '',
            p_role: user.role,
            p_is_seeded: user.role !== 'admin',
            p_session_ttl_minutes: SESSION_TTL_MINUTES,
        })
        existingUsers.push({ username: user.username, disabled: false, role: user.role })
        return 'created'
    }

    if (existing.disabled) {
        await rpc(client, 'app_set_user_disabled', {
            p_token: token,
            p_username: user.username,
            p_disabled: false,
            p_session_ttl_minutes: SESSION_TTL_MINUTES,
        })
        existing.disabled = false
        return 'reactivated'
    }

    return 'existing'
}

async function main() {
    const allUsers = buildDefaultUsers()
    const selectedKeys = PROVISION_ONLY
        ? new Set(PROVISION_ONLY.split(',').map(value => value.trim().toLowerCase()).filter(Boolean))
        : null
    const users = selectedKeys ? allUsers.filter(user => selectedKeys.has(user.key.toLowerCase())) : allUsers
    if (!users.length) {
        throw new Error('Nessun utente selezionato per il provisioning (controlla PROVISION_ONLY)')
    }
    validateInputs(users)

    const adminUser = allUsers.find(user => user.key === 'admin')
    if (!adminUser?.username || !adminUser?.password || !adminUser?.email) {
        throw new Error('Credenziali admin di default mancanti')
    }

    const client = createSupabaseClient()
    const adminSession = await ensureAdminSession(client, adminUser)
    if (!adminSession.token) {
        throw new Error('Token sessione admin non disponibile dopo il bootstrap/login')
    }

    const existingUsers = await listExistingUsers(client, adminSession.token)
    const summary = []

    for (const user of users) {
        const startedAt = Date.now()
        const status = user.key === 'admin'
            ? (adminSession.bootstrapped ? 'bootstrapped-admin' : 'existing-admin')
            : await ensureManagedUser(client, adminSession.token, user, existingUsers)
        summary.push({
            username: user.username,
            role: user.role,
            status,
            elapsedMs: Date.now() - startedAt,
        })
    }

    await rpc(client, 'app_sign_out', { p_token: adminSession.token }).catch(() => null)

    console.log('[provision-default-users] PASS default users provisioning')
    console.log(JSON.stringify({ users: summary }, null, 2))
}

main().catch(error => {
    console.error('[provision-default-users] FAIL', error.message)
    process.exitCode = 1
})
