import fs from 'node:fs'
import path from 'node:path'
import { chromium } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { createOnlineRunContext, redactUser } from './lib/online-test-data.mjs'

function normalizeSiteUrl(value) {
    if (!value) return ''
    return value.endsWith('/') ? value : `${value}/`
}

function parseIntSafe(value, fallback) {
    const parsed = Number.parseInt(String(value ?? ''), 10)
    return Number.isFinite(parsed) ? parsed : fallback
}

function waitMs(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

const SITE_URL = normalizeSiteUrl(process.env.SITE_URL || process.argv[2] || '')
const SUPABASE_URL = String(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim()
const SUPABASE_PUBLISHABLE_KEY = String(process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '').trim()
const REPORT_FILE = String(process.env.REPORT_FILE || '').trim()
const HEADLESS = String(process.env.HEADLESS || '1') !== '0'
const PASSWORD_RESET_TTL_MINUTES = parseIntSafe(process.env.PASSWORD_RESET_TTL_MINUTES, 30)
const INITIAL_COOLDOWN_MS = parseIntSafe(process.env.INITIAL_SIGNUP_COOLDOWN_MS, 0)

if (!SITE_URL) {
    throw new Error('SITE_URL obbligatorio. Esempio: SITE_URL=https://vgrazian.github.io/MediTrace/ npm run test:online-reset-password')
}

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    throw new Error('SUPABASE_URL e SUPABASE_PUBLISHABLE_KEY sono obbligatori per il reset password online')
}

function writeReport(report) {
    if (!REPORT_FILE) return
    const reportPath = path.resolve(REPORT_FILE)
    fs.mkdirSync(path.dirname(reportPath), { recursive: true })
    fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
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

function buildDefaultAdminUser() {
    return {
        username: String(process.env.MEDITRACE_DEFAULT_ADMIN_USERNAME || '').trim(),
        password: String(process.env.MEDITRACE_DEFAULT_ADMIN_PASSWORD || '').trim(),
        email: String(process.env.MEDITRACE_DEFAULT_ADMIN_EMAIL || '').trim(),
        firstName: 'Admin',
        lastName: 'MediTrace',
    }
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
            p_session_ttl_minutes: 480,
        })
        return payload?.session?.token || null
    }

    const payload = await rpc(client, 'app_sign_in', {
        p_username: adminUser.username,
        p_password: adminUser.password,
        p_session_ttl_minutes: 480,
    })
    return payload?.session?.token || null
}

function buildResetUser(runContext) {
    const slug = runContext.slug.replace(/[^a-z0-9]/g, '').slice(0, 12)
    const userTag = `rp${slug}`
    const username = `qa_reset_${slug}`.slice(0, 32)
    const basePassword = `MediTrace!${slug}Aa`
    const resetPassword = `MediTrace!${slug}Bb`
    return {
        username,
        email: `${userTag}@example.org`,
        password: basePassword,
        resetPassword,
        firstName: 'QA',
        lastName: 'Reset Password',
        label: 'reset-user',
    }
}

async function ensureResetUser(client, adminToken, user) {
    const users = await rpc(client, 'app_list_users', {
        p_token: adminToken,
        p_session_ttl_minutes: 480,
    })
    const list = Array.isArray(users) ? users : []
    const existing = list.find(entry => entry.username === user.username)

    if (existing) {
        if (!existing.disabled) return 'existing'
        await rpc(client, 'app_set_user_disabled', {
            p_token: adminToken,
            p_username: user.username,
            p_disabled: false,
            p_session_ttl_minutes: 480,
        })
        return 'reactivated'
    }

    await rpc(client, 'app_create_user', {
        p_token: adminToken,
        p_username: user.username,
        p_password: user.password,
        p_first_name: user.firstName,
        p_last_name: user.lastName,
        p_email: user.email,
        p_phone: '',
        p_role: 'operator',
        p_is_seeded: true,
        p_session_ttl_minutes: 480,
    })

    return 'created'
}

function extractResetToken(resetUrl) {
    const url = new URL(resetUrl)
    const directToken = String(url.searchParams.get('token') || url.searchParams.get('recovery_token') || '').trim()
    if (directToken) return directToken

    const hash = String(url.hash || '')
    if (!hash) return ''

    const queryIndex = hash.indexOf('?')
    if (queryIndex < 0) return ''

    const hashParams = new URLSearchParams(hash.slice(queryIndex + 1))
    return String(hashParams.get('token') || hashParams.get('recovery_token') || '').trim()
}

async function verifyLoginWithPassword(page, user, password) {
    await page.goto(SITE_URL, { waitUntil: 'domcontentloaded' })
    await page.locator('#app-root').waitFor({ state: 'visible', timeout: 20000 })

    const alreadyAuthed = await page.getByRole('link', { name: '⚙' }).isVisible().catch(() => false)
    if (alreadyAuthed) return

    await page.locator('#username-input').fill(user.username)
    await page.locator('#password-input').fill(password)
    await page.getByRole('button', { name: 'Accedi' }).click()

    const error = String((await page.locator('.login-error').textContent().catch(() => '')) || '').trim()
    if (error) {
        throw new Error(`Login fallito per ${user.username}: ${error}`)
    }

    await page.getByRole('link', { name: '⚙' }).waitFor({ state: 'visible', timeout: 20000 })
}

async function cleanupResetUser(client, adminToken, user) {
    if (!adminToken) return false
    try {
        await rpc(client, 'app_delete_user', {
            p_token: adminToken,
            p_username: user.username,
            p_session_ttl_minutes: 480,
        })
        return true
    } catch {
        return false
    }
}

async function main() {
    const runContext = createOnlineRunContext()
    const client = createSupabaseClient()
    const adminUser = buildDefaultAdminUser()
    const resetUser = buildResetUser(runContext)

    const report = {
        runContext,
        siteUrl: SITE_URL,
        user: redactUser(resetUser),
        passwordResetTtlMinutes: PASSWORD_RESET_TTL_MINUTES,
        resetUrlGenerated: false,
        uiResetCompleted: false,
        loginWithNewPassword: false,
        cleanup: false,
        success: false,
    }

    let adminToken = null
    const browser = await chromium.launch({ headless: HEADLESS })
    const context = await browser.newContext()
    const page = await context.newPage()

    try {
        if (!adminUser.username || !adminUser.password || !adminUser.email) {
            throw new Error('Credenziali admin di default mancanti per il reset password online')
        }

        if (INITIAL_COOLDOWN_MS > 0) {
            console.log(`[online-reset] Attendo ${INITIAL_COOLDOWN_MS}ms prima del provisioning`)
            await waitMs(INITIAL_COOLDOWN_MS)
        }

        adminToken = await ensureAdminSession(client, adminUser)
        if (!adminToken) throw new Error('Token sessione admin non disponibile')

        report.userProvisioning = await ensureResetUser(client, adminToken, resetUser)

        const resetPayload = await rpc(client, 'app_request_password_reset', {
            p_email: resetUser.email,
            p_reset_base_url: `${SITE_URL}#/auth/reset-password`,
            p_reset_ttl_minutes: PASSWORD_RESET_TTL_MINUTES,
        })

        const resetUrl = String(resetPayload?.reset_url || resetPayload?.resetUrl || '').trim()
        if (!resetUrl) {
            throw new Error('RPC app_request_password_reset non ha restituito reset_url')
        }

        report.resetUrlGenerated = true

        const token = extractResetToken(resetUrl)
        if (!token) {
            throw new Error('Token reset non trovato nell\'URL di recovery')
        }

        const uiResetUrl = `${SITE_URL}#/auth/reset-password?token=${encodeURIComponent(token)}`
        await page.goto(uiResetUrl, { waitUntil: 'domcontentloaded' })
        await page.getByRole('heading', { name: 'Reset Password' }).waitFor({ state: 'visible', timeout: 20000 })

        await page.getByLabel('Nuova password', { exact: true }).fill(resetUser.resetPassword)
        await page.getByLabel('Conferma nuova password').fill(resetUser.resetPassword)
        await page.getByRole('button', { name: 'Aggiorna password' }).click()

        await page.getByText('Password aggiornata con successo. Ora puoi accedere con la nuova password.').waitFor({ state: 'visible', timeout: 20000 })
        report.uiResetCompleted = true

        await page.waitForTimeout(1300)
        await verifyLoginWithPassword(page, resetUser, resetUser.resetPassword)
        report.loginWithNewPassword = true

        report.success = true
        writeReport(report)
        console.log('[online-reset] PASS reset-password flow validation')
    } finally {
        report.cleanup = await cleanupResetUser(client, adminToken, resetUser)
        if (adminToken) {
            await rpc(client, 'app_sign_out', { p_token: adminToken }).catch(() => null)
        }
        writeReport(report)
        await context.close().catch(() => null)
        await browser.close().catch(() => null)
    }
}

main().catch(error => {
    console.error('[online-reset] FAIL', error.message)
    process.exitCode = 1
})
