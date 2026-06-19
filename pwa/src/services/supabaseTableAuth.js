/**
 * Aggiorna il ruolo di un utente (solo admin).
 * @param {string} username
 * @param {string} role ('admin'|'operator')
 * @returns {Promise<object>} user aggiornato
 */
export async function setUserRoleWithTable({ username, role, sessionTtlMinutes }) {
    const storedSession = await readStoredSession()
    if (!storedSession?.token) throw new Error('Sessione non attiva')
    return normalizeUser(await callRpc('app_set_user_role', {
        p_token: storedSession.token,
        p_username: username,
        p_role: role,
        p_session_ttl_minutes: sessionTtlMinutes,
    }))
}
import { getSetting, setSetting } from '../db'
import { isSupabaseConfigured, supabase } from './supabaseClient'

export const SUPABASE_TABLE_SESSION_KEY = 'supabaseTableAuthSession'

function assertConfigured() {
    if (!isSupabaseConfigured || !supabase) {
        throw new Error('Supabase non configurato')
    }
}

function normalizeUser(user) {
    if (!user || typeof user !== 'object') return null
    return {
        id: String(user.id || '').trim(),
        username: String(user.username || '').trim().toLowerCase(),
        email: String(user.email || '').trim().toLowerCase(),
        role: user.role === 'admin' ? 'admin' : 'operator',
        firstName: String(user.first_name ?? user.firstName ?? '').trim(),
        lastName: String(user.last_name ?? user.lastName ?? '').trim(),
        phone: String(user.phone || '').trim(),
        disabled: Boolean(user.disabled),
        isSeeded: Boolean(user.is_seeded ?? user.isSeeded),
        createdAt: String(user.created_at ?? user.createdAt ?? '').trim() || null,
        updatedAt: String(user.updated_at ?? user.updatedAt ?? '').trim() || null,
    }
}

function normalizeSession(session) {
    if (!session || typeof session !== 'object') return null
    const token = String(session.token || '').trim()
    if (!token) return null
    return {
        token,
        createdAt: String(session.created_at ?? session.createdAt ?? '').trim() || null,
        lastActivityAt: String(session.last_activity_at ?? session.lastActivityAt ?? '').trim() || null,
        expiresAt: String(session.expires_at ?? session.expiresAt ?? '').trim() || null,
    }
}

function normalizePayload(payload) {
    if (!payload || typeof payload !== 'object') return null
    const user = normalizeUser(payload.user)
    const session = normalizeSession(payload.session)
    if (!user || !session) return null
    return { user, session }
}

async function callRpc(name, params = {}) {
    assertConfigured()
    const { data, error } = await supabase.rpc(name, params)
    if (error) throw new Error(error.message)
    return data
}

async function saveStoredSession(session) {
    await setSetting(SUPABASE_TABLE_SESSION_KEY, session)
    return session
}

export async function readStoredSession() {
    const stored = await getSetting(SUPABASE_TABLE_SESSION_KEY, null)
    return normalizeSession(stored)
}

export async function clearStoredSession() {
    await setSetting(SUPABASE_TABLE_SESSION_KEY, null)
}

export async function fetchHasUsers() {
    return Boolean(await callRpc('app_has_users'))
}

export async function restoreSession(sessionTtlMinutes) {
    const storedSession = await readStoredSession()
    if (!storedSession?.token) return null

    try {
        const payload = normalizePayload(await callRpc('app_validate_session', {
            p_token: storedSession.token,
            p_session_ttl_minutes: sessionTtlMinutes,
        }))
        if (!payload) {
            await clearStoredSession()
            return null
        }
        await saveStoredSession(payload.session)
        return payload
    } catch {
        await clearStoredSession()
        return null
    }
}

export async function signInWithTable({ username, password, sessionTtlMinutes }) {
    const payload = normalizePayload(await callRpc('app_sign_in', {
        p_username: username,
        p_password: password,
        p_session_ttl_minutes: sessionTtlMinutes,
    }))
    await saveStoredSession(payload.session)
    return payload
}

export async function registerFirstAdminWithTable({ username, password, firstName, lastName, email, phone = '', sessionTtlMinutes }) {
    const payload = normalizePayload(await callRpc('app_register_first_admin', {
        p_username: username,
        p_password: password,
        p_first_name: firstName,
        p_last_name: lastName,
        p_email: email,
        p_phone: phone,
        p_session_ttl_minutes: sessionTtlMinutes,
    }))
    await saveStoredSession(payload.session)
    return payload
}

export async function signOutFromTable() {
    const storedSession = await readStoredSession()
    if (storedSession?.token) {
        await callRpc('app_sign_out', { p_token: storedSession.token }).catch(() => null)
    }
    await clearStoredSession()
}

export async function changePasswordWithTable({ currentPassword, newPassword }) {
    const storedSession = await readStoredSession()
    if (!storedSession?.token) throw new Error('Sessione non attiva')
    await callRpc('app_change_password', {
        p_token: storedSession.token,
        p_current_password: currentPassword,
        p_new_password: newPassword,
    })
    await clearStoredSession()
}

export async function updateProfileWithTable({ username, firstName, lastName, phone = '', email, sessionTtlMinutes }) {
    const storedSession = await readStoredSession()
    if (!storedSession?.token) throw new Error('Sessione non attiva')
    const payload = normalizePayload(await callRpc('app_update_profile', {
        p_token: storedSession.token,
        p_username: username,
        p_first_name: firstName,
        p_last_name: lastName,
        p_email: email,
        p_phone: phone,
        p_session_ttl_minutes: sessionTtlMinutes,
    }))
    await saveStoredSession(payload.session)
    return payload
}

export async function listUsersWithTable(sessionTtlMinutes) {
    const storedSession = await readStoredSession()
    if (!storedSession?.token) throw new Error('Sessione non attiva')
    const rows = await callRpc('app_list_users', {
        p_token: storedSession.token,
        p_session_ttl_minutes: sessionTtlMinutes,
    })
    return Array.isArray(rows) ? rows.map(normalizeUser).filter(Boolean) : []
}

export async function createUserWithTable({ username, password, firstName, lastName, email, phone = '', role = 'operator', isSeeded = false, sessionTtlMinutes }) {
    const storedSession = await readStoredSession()
    if (!storedSession?.token) throw new Error('Sessione non attiva')
    return normalizeUser(await callRpc('app_create_user', {
        p_token: storedSession.token,
        p_username: username,
        p_password: password,
        p_first_name: firstName,
        p_last_name: lastName,
        p_email: email,
        p_phone: phone,
        p_role: role,
        p_is_seeded: isSeeded,
        p_session_ttl_minutes: sessionTtlMinutes,
    }))
}

export async function setUserDisabledWithTable({ username, disabled, sessionTtlMinutes }) {
    const storedSession = await readStoredSession()
    if (!storedSession?.token) throw new Error('Sessione non attiva')
    return normalizeUser(await callRpc('app_set_user_disabled', {
        p_token: storedSession.token,
        p_username: username,
        p_disabled: disabled,
        p_session_ttl_minutes: sessionTtlMinutes,
    }))
}

export async function deleteUserWithTable({ username, sessionTtlMinutes }) {
    const storedSession = await readStoredSession()
    if (!storedSession?.token) throw new Error('Sessione non attiva')
    return Boolean(await callRpc('app_delete_user', {
        p_token: storedSession.token,
        p_username: username,
        p_session_ttl_minutes: sessionTtlMinutes,
    }))
}

export async function disableSelfSeededWithTable(sessionTtlMinutes) {
    const storedSession = await readStoredSession()
    if (!storedSession?.token) throw new Error('Sessione non attiva')
    const result = await callRpc('app_disable_self_seeded', {
        p_token: storedSession.token,
        p_session_ttl_minutes: sessionTtlMinutes,
    })
    await clearStoredSession()
    return Boolean(result)
}

export async function requestPasswordResetWithTable({ email, redirectTo, resetTtlMinutes = 30 }) {
    const payload = await callRpc('app_request_password_reset', {
        p_email: email,
        p_reset_base_url: redirectTo,
        p_reset_ttl_minutes: resetTtlMinutes,
    })

    if (!payload || typeof payload !== 'object') {
        return {
            email,
            resetUrl: null,
            expiresAt: null,
        }
    }

    return {
        email: String(payload.email ?? email ?? '').trim().toLowerCase(),
        resetUrl: String(payload.reset_url ?? payload.resetUrl ?? '').trim() || null,
        expiresAt: String(payload.expires_at ?? payload.expiresAt ?? '').trim() || null,
    }
}

export async function completePasswordRecoveryWithTable({ token, newPassword }) {
    return normalizeUser(await callRpc('app_complete_password_recovery', {
        p_token: token,
        p_new_password: newPassword,
    }))
}