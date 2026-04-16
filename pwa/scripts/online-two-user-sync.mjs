import fs from 'node:fs'
import { chromium } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import {
    buildSyntheticFarmaci,
    buildSyntheticUsers,
    createOnlineRunContext,
    redactUser,
} from './lib/online-test-data.mjs'

function normalizeSiteUrl(value) {
    if (!value) return ''
    return value.endsWith('/') ? value : `${value}/`
}

const SITE_URL = normalizeSiteUrl(process.env.SITE_URL || process.argv[2] || '')
const SUPABASE_URL = String(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim()
const SUPABASE_PUBLISHABLE_KEY = String(process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '').trim()
const REPORT_FILE = String(process.env.REPORT_FILE || '').trim()
const HEADLESS = String(process.env.HEADLESS || '1') !== '0'
const INITIAL_SIGNUP_COOLDOWN_MS = Number.parseInt(process.env.INITIAL_SIGNUP_COOLDOWN_MS || '300000', 10)
const SIGNUP_RATE_LIMIT_WAIT_MS = Number.parseInt(process.env.SIGNUP_RATE_LIMIT_WAIT_MS || '300000', 10)
const INTER_ACCOUNT_SIGNUP_WAIT_MS = Number.parseInt(process.env.INTER_ACCOUNT_SIGNUP_WAIT_MS || '300000', 10)
const SIGNUP_RETRY_ATTEMPTS = Number.parseInt(process.env.SIGNUP_RETRY_ATTEMPTS || '4', 10)

if (!SITE_URL) {
    throw new Error('SITE_URL obbligatorio. Esempio: SITE_URL=https://vgrazian.github.io/MediTrace/ npm run test:online-main')
}

function routeUrl(hashRoute) {
    return `${SITE_URL}${hashRoute}`
}

function waitMs(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

function createSupabaseClient() {
    if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) return null
    return createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
        },
    })
}

function buildDefaultAdminUser() {
    return {
        username: String(process.env.MEDITRACE_DEFAULT_ADMIN_USERNAME || '').trim(),
        password: String(process.env.MEDITRACE_DEFAULT_ADMIN_PASSWORD || '').trim(),
        email: String(process.env.MEDITRACE_DEFAULT_ADMIN_EMAIL || '').trim(),
        firstName: 'Admin',
        lastName: 'MediTrace',
        role: 'admin',
    }
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
            p_session_ttl_minutes: 480,
        })
        return {
            token: payload?.session?.token,
            bootstrapped: true,
        }
    }

    const payload = await rpc(client, 'app_sign_in', {
        p_username: adminUser.username,
        p_password: adminUser.password,
        p_session_ttl_minutes: 480,
    })
    return {
        token: payload?.session?.token,
        bootstrapped: false,
    }
}

async function ensureManagedUsers(client, adminUser, users, report) {
    const session = await ensureAdminSession(client, adminUser)
    if (!session.token) throw new Error('Token sessione admin non disponibile per il provisioning online')

    const existingRows = await rpc(client, 'app_list_users', {
        p_token: session.token,
        p_session_ttl_minutes: 480,
    })
    const existingUsers = Array.isArray(existingRows) ? existingRows : []

    for (const user of users) {
        const startedAt = new Date().toISOString()
        const existing = existingUsers.find(entry => entry.username === user.username)
        if (!existing) {
            await rpc(client, 'app_create_user', {
                p_token: session.token,
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
            existingUsers.push({ username: user.username, disabled: false })
            report.provisioning.push({
                username: user.username,
                startedAt,
                finishedAt: new Date().toISOString(),
                status: 'created',
            })
            continue
        }

        if (existing.disabled) {
            await rpc(client, 'app_set_user_disabled', {
                p_token: session.token,
                p_username: user.username,
                p_disabled: false,
                p_session_ttl_minutes: 480,
            })
            existing.disabled = false
            report.provisioning.push({
                username: user.username,
                startedAt,
                finishedAt: new Date().toISOString(),
                status: 'reactivated',
            })
            continue
        }

        report.provisioning.push({
            username: user.username,
            startedAt,
            finishedAt: new Date().toISOString(),
            status: 'existing',
        })
    }

    await rpc(client, 'app_sign_out', { p_token: session.token }).catch(() => null)
    return session.bootstrapped ? 'bootstrapped-admin' : 'existing-admin'
}

function buildProvidedUsers() {
    // Explicit overrides take precedence; fall back to default online operator accounts
    const userA = {
        username: String(process.env.ONLINE_USER_A_USERNAME || process.env.MEDITRACE_DEFAULT_OPERATOR1_USERNAME || '').trim(),
        password: String(process.env.ONLINE_USER_A_PASSWORD || process.env.MEDITRACE_DEFAULT_OPERATOR1_PASSWORD || '').trim(),
        email: String(process.env.ONLINE_USER_A_EMAIL || process.env.MEDITRACE_DEFAULT_OPERATOR1_EMAIL || '').trim(),
        firstName: 'Operatore',
        lastName: 'Uno',
        label: 'user-a',
    }
    const userB = {
        username: String(process.env.ONLINE_USER_B_USERNAME || process.env.MEDITRACE_DEFAULT_OPERATOR2_USERNAME || '').trim(),
        password: String(process.env.ONLINE_USER_B_PASSWORD || process.env.MEDITRACE_DEFAULT_OPERATOR2_PASSWORD || '').trim(),
        email: String(process.env.ONLINE_USER_B_EMAIL || process.env.MEDITRACE_DEFAULT_OPERATOR2_EMAIL || '').trim(),
        firstName: 'Operatore',
        lastName: 'Due',
        label: 'user-b',
    }

    if (userA.username && userA.password && userB.username && userB.password) {
        return [userA, userB]
    }

    return null
}

async function waitForAuthenticatedUi(page, timeout = 20000) {
    const deadline = Date.now() + timeout
    while (Date.now() < deadline) {
        const settingsVisible = await page.getByRole('link', { name: '⚙' }).isVisible().catch(() => false)
        const dashboardVisible = await page.getByRole('link', { name: 'Cruscotto' }).isVisible().catch(() => false)
        if (settingsVisible || dashboardVisible) return
        await page.waitForTimeout(250)
    }
    throw new Error('UI autenticata non visibile entro timeout')
}

async function signInWithUi(page, user) {
    await page.goto(SITE_URL, { waitUntil: 'domcontentloaded' })
    await page.locator('#app-root').waitFor({ state: 'visible', timeout: 20000 })

    const usernameInput = page.locator('#username-input')
    const registerInput = page.locator('#reg-username')
    const alreadyAuthed = page.getByRole('link', { name: '⚙' })

    // Wait for whichever form appears first (or already-authenticated nav)
    await Promise.race([
        usernameInput.waitFor({ state: 'visible', timeout: 20000 }).catch(() => null),
        registerInput.waitFor({ state: 'visible', timeout: 20000 }).catch(() => null),
        alreadyAuthed.waitFor({ state: 'visible', timeout: 20000 }).catch(() => null),
    ])

    if (await alreadyAuthed.isVisible().catch(() => false)) {
        return // already authenticated
    }

    if (await usernameInput.isVisible().catch(() => false)) {
        await usernameInput.fill(user.username)
        await page.locator('#password-input').fill(user.password)
        await page.getByRole('button', { name: 'Accedi' }).click()
    } else if (await registerInput.isVisible().catch(() => false)) {
        throw new Error(`Trovato il form di bootstrap admin invece del login per ${user.username}: provisioning utenti non completato`)
    } else {
        throw new Error(`Form di login non trovato per ${user.username}`)
    }

    const loginError = String((await page.locator('.login-error').textContent().catch(() => '')) || '').trim()
    if (loginError) {
        throw new Error(`Login fallito per ${user.username}: ${loginError}`)
    }

    await waitForAuthenticatedUi(page)
}

async function openSettings(page) {
    await page.goto(routeUrl('#/impostazioni'), { waitUntil: 'domcontentloaded' })
    await page.getByRole('heading', { name: 'Impostazioni' }).waitFor({ state: 'visible', timeout: 20000 })
}

async function runManualSync(page) {
    await openSettings(page)
    const syncCard = page.locator('.card').filter({ has: page.getByText('Sincronizzazione manuale') }).first()
    const syncButton = syncCard.getByRole('button', { name: 'Sincronizza ora' })
    const syncMessage = syncCard.locator('p.muted').first()

    await syncButton.click()

    const deadline = Date.now() + 45000
    while (Date.now() < deadline) {
        const text = String((await syncMessage.textContent().catch(() => '')) || '').trim()
        if (/Sincronizzazione inizializzata con successo|Dati scaricati|Dati caricati|Dati già sincronizzati/.test(text)) {
            return text
        }
        if (/Sincronizzazione bloccata|Errore/.test(text)) {
            throw new Error(`Sincronizzazione fallita: ${text}`)
        }
        await page.waitForTimeout(300)
    }

    throw new Error('Timeout in attesa del completamento sincronizzazione')
}

async function openFarmaci(page) {
    await page.goto(routeUrl('#/farmaci'), { waitUntil: 'domcontentloaded' })
    await page.getByRole('heading', { name: 'Catalogo Farmaci' }).waitFor({ state: 'visible', timeout: 20000 })
}

async function ensureFarmaciPanelOpen(page) {
    const details = page.locator('details.deep-panel').first()
    await details.waitFor({ state: 'visible', timeout: 15000 })
    if ((await details.getAttribute('open')) === null) {
        await details.locator('summary').click()
    }
}

async function createFarmaco(page, farmaco) {
    await openFarmaci(page)
    await page.locator('.card', { hasText: 'Farmaci registrati' }).getByRole('button', { name: 'Aggiungi' }).click()
    await ensureFarmaciPanelOpen(page)
    await page.getByLabel('Nome farmaco').fill(farmaco.nomeFarmaco)
    await page.getByLabel('Principio attivo').fill(farmaco.principioAttivo)
    await page.getByLabel('Classe terapeutica').fill(farmaco.classeTerapeutica)
    await page.getByLabel('Scorta minima').fill(farmaco.scortaMinima)
    await page.getByLabel('Soglia autonomia (giorni)').fill(farmaco.sogliaAutonomia)
    await page.getByRole('button', { name: 'Salva farmaco' }).click()
    await page.getByRole('cell', { name: farmaco.nomeFarmaco, exact: true }).waitFor({ state: 'visible', timeout: 15000 })
}

async function assertFarmaciVisible(page, farmaci) {
    await openFarmaci(page)
    for (const farmaco of farmaci) {
        await page.getByRole('cell', { name: farmaco.nomeFarmaco, exact: true }).waitFor({ state: 'visible', timeout: 20000 })
    }
}

async function collectMissingFarmaci(page, farmaci, timeoutMs = 4000) {
    await openFarmaci(page)
    const missing = []
    for (const farmaco of farmaci) {
        const byCellRole = await page
            .getByRole('cell', { name: farmaco.nomeFarmaco, exact: true })
            .isVisible({ timeout: timeoutMs })
            .catch(() => false)
        const byRowText = byCellRole
            ? true
            : await page
                .locator('tbody tr', { hasText: farmaco.nomeFarmaco })
                .first()
                .isVisible({ timeout: Math.floor(timeoutMs / 2) })
                .catch(() => false)

        if (!byCellRole && !byRowText) missing.push(farmaco.nomeFarmaco)
    }
    return missing
}

async function assertFarmaciVisibleWithRetry({
    page,
    farmaci,
    reconcilePage,
    reconcileLabel,
    report,
    maxAttempts = 6,
    waitBetweenAttemptsMs = 1500,
}) {
    let missing = []
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        missing = await collectMissingFarmaci(page, farmaci)
        if (missing.length === 0) return

        if (attempt < maxAttempts) {
            const syncMessage = await runManualSync(reconcilePage)
            report.syncMessages[`${reconcileLabel}Retry${attempt}`] = syncMessage
            await page.waitForTimeout(waitBetweenAttemptsMs)
        }
    }

    throw new Error(`Farmaci non visibili dopo ${maxAttempts} tentativi: ${missing.join(', ')}`)
}

async function bestEffortDeleteFarmaco(page, nomeFarmaco) {
    try {
        await openFarmaci(page)
        const row = page.locator('tbody tr', { has: page.getByRole('cell', { name: nomeFarmaco, exact: true }) }).first()
        if (!(await row.isVisible().catch(() => false))) return false

        await row.getByRole('button', { name: 'Elimina' }).click()
        await page.getByText('Farmaco eliminato.').waitFor({ state: 'visible', timeout: 15000 })
        return true
    } catch {
        return false
    }
}

function writeReport(report) {
    if (!REPORT_FILE) return
    fs.writeFileSync(REPORT_FILE, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
}

async function main() {
    const runContext = createOnlineRunContext()
    const farmaci = buildSyntheticFarmaci(runContext)
    const providedUsers = buildProvidedUsers()
    const users = providedUsers || buildSyntheticUsers(runContext)
    const adminUser = buildDefaultAdminUser()
    const accountMode = providedUsers ? 'provided' : 'synthetic-provisioned'

    const browser = await chromium.launch({ headless: HEADLESS })
    const contextA = await browser.newContext()
    const contextB = await browser.newContext()
    const pageA = await contextA.newPage()
    const pageB = await contextB.newPage()

    const report = {
        runContext,
        siteUrl: SITE_URL,
        accountMode,
        signupPolicy: {
            initialSignupCooldownMs: INITIAL_SIGNUP_COOLDOWN_MS,
            signupRateLimitWaitMs: SIGNUP_RATE_LIMIT_WAIT_MS,
            interAccountSignupWaitMs: INTER_ACCOUNT_SIGNUP_WAIT_MS,
            signupRetryAttempts: SIGNUP_RETRY_ATTEMPTS,
        },
        users: users.map(redactUser),
        syncMessages: {},
        cleanup: {},
        provisioning: [],
        success: false,
    }

    try {
        const client = createSupabaseClient()
        if (!client) {
            throw new Error('SUPABASE_URL e SUPABASE_PUBLISHABLE_KEY sono obbligatori per il provisioning online')
        }
        if (!adminUser.username || !adminUser.password || !adminUser.email) {
            throw new Error('Credenziali admin di default mancanti per il provisioning online')
        }
        if (INITIAL_SIGNUP_COOLDOWN_MS > 0) {
            console.log(`[online-main] Attendo ${INITIAL_SIGNUP_COOLDOWN_MS}ms prima del provisioning online`)
            await waitMs(INITIAL_SIGNUP_COOLDOWN_MS)
        }
        report.adminProvisioning = await ensureManagedUsers(client, adminUser, users, report)

        await Promise.all([
            signInWithUi(pageA, users[0]),
            signInWithUi(pageB, users[1]),
        ])

        report.syncMessages.initialA = await runManualSync(pageA)
        report.syncMessages.initialB = await runManualSync(pageB)

        await Promise.all([
            createFarmaco(pageA, farmaci[0]),
            createFarmaco(pageB, farmaci[1]),
        ])

        report.syncMessages.afterCreateA = await runManualSync(pageA)
        report.syncMessages.afterCreateB = await runManualSync(pageB)
        report.syncMessages.reconcileA = await runManualSync(pageA)

        await Promise.all([
            assertFarmaciVisibleWithRetry({
                page: pageA,
                farmaci,
                reconcilePage: pageA,
                reconcileLabel: 'visibilityA',
                report,
            }),
            assertFarmaciVisibleWithRetry({
                page: pageB,
                farmaci,
                reconcilePage: pageB,
                reconcileLabel: 'visibilityB',
                report,
            }),
        ])

        report.success = true
        writeReport(report)
        console.log('[online-main] PASS two-user sync validation')
        console.log(JSON.stringify({
            run: runContext.slug,
            accountMode,
            farmaci: farmaci.map(item => item.nomeFarmaco),
            syncMessages: report.syncMessages,
        }, null, 2))
    } finally {
        for (const farmaco of farmaci) {
            report.cleanup[farmaco.nomeFarmaco] = await bestEffortDeleteFarmaco(pageA, farmaco.nomeFarmaco)
        }

        if (Object.values(report.cleanup).some(Boolean)) {
            try {
                report.syncMessages.cleanupA = await runManualSync(pageA)
                report.syncMessages.cleanupB = await runManualSync(pageB)
                report.syncMessages.cleanupReconcileA = await runManualSync(pageA)
            } catch (error) {
                report.cleanup.syncError = error.message
            }
        }

        writeReport(report)
        await contextA.close().catch(() => null)
        await contextB.close().catch(() => null)
        await browser.close().catch(() => null)
    }
}

main().catch(error => {
    console.error('[online-main] FAIL', error.message)
    process.exitCode = 1
})