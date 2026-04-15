import fs from 'node:fs'
import { chromium } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import {
    buildSyntheticResidenze,
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

function isRateLimitError(error) {
    const message = String(error?.message || error || '').toLowerCase()
    return message.includes('rate limit') || message.includes('over_email_send_rate_limit')
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

function buildProvidedUsers() {
    const userA = {
        username: String(process.env.ONLINE_USER_A_USERNAME || '').trim(),
        password: String(process.env.ONLINE_USER_A_PASSWORD || '').trim(),
        email: String(process.env.ONLINE_USER_A_EMAIL || '').trim(),
        label: 'user-a',
    }
    const userB = {
        username: String(process.env.ONLINE_USER_B_USERNAME || '').trim(),
        password: String(process.env.ONLINE_USER_B_PASSWORD || '').trim(),
        email: String(process.env.ONLINE_USER_B_EMAIL || '').trim(),
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
    await usernameInput.waitFor({ state: 'visible', timeout: 20000 })
    await usernameInput.fill(user.username)
    await page.locator('#password-input').fill(user.password)
    await page.getByRole('button', { name: 'Accedi' }).click()

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

async function openResidenze(page) {
    await page.goto(routeUrl('#/residenze'), { waitUntil: 'domcontentloaded' })
    await page.getByRole('heading', { name: 'Residenze' }).waitFor({ state: 'visible', timeout: 20000 })
}

async function ensureResidenzePanelOpen(page) {
    const details = page.locator('details.deep-panel').first()
    await details.waitFor({ state: 'visible', timeout: 15000 })
    if ((await details.getAttribute('open')) === null) {
        await details.locator('summary').click()
    }
}

async function createResidenza(page, residenza) {
    await openResidenze(page)
    await ensureResidenzePanelOpen(page)
    await page.getByLabel('Nome residenza').fill(residenza.codice)
    await page.getByLabel('Max ospiti').fill(residenza.maxOspiti)
    await page.getByLabel('Note').fill(residenza.note)
    await page.getByRole('button', { name: 'Salva residenza' }).click()
    await page.getByText('Residenza creata.').waitFor({ state: 'visible', timeout: 15000 })
    await page.getByRole('cell', { name: residenza.codice, exact: true }).waitFor({ state: 'visible', timeout: 15000 })
}

async function assertResidenzeVisible(page, residenze) {
    await openResidenze(page)
    for (const residenza of residenze) {
        await page.getByRole('cell', { name: residenza.codice, exact: true }).waitFor({ state: 'visible', timeout: 20000 })
    }
}

async function bestEffortDeleteResidenza(page, codice) {
    try {
        await openResidenze(page)
        const row = page.locator('tbody tr', { has: page.getByRole('cell', { name: codice, exact: true }) }).first()
        if (!(await row.isVisible().catch(() => false))) return false

        await row.getByRole('button', { name: 'Elimina' }).click()
        await page.getByText('Conferma eliminazione residenza').waitFor({ state: 'visible', timeout: 10000 })
        await page.getByRole('button', { name: 'Elimina residenza' }).click()
        await page.getByText('Residenza eliminata.').waitFor({ state: 'visible', timeout: 15000 })
        return true
    } catch {
        return false
    }
}

async function provisionUser(user) {
    const client = createSupabaseClient()
    if (!client) {
        throw new Error('Per creare utenti sintetici servono SUPABASE_URL e SUPABASE_PUBLISHABLE_KEY, oppure credenziali ONLINE_USER_A_* / ONLINE_USER_B_*')
    }

    for (let attempt = 1; attempt <= SIGNUP_RETRY_ATTEMPTS; attempt += 1) {
        const { error: signUpError } = await client.auth.signUp({
            email: user.email,
            password: user.password,
            options: {
                emailRedirectTo: routeUrl('#/impostazioni'),
                data: {
                    username: user.username,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    role: 'operator',
                },
            },
        })

        if (!signUpError || /already registered|already been registered/i.test(signUpError.message)) {
            break
        }

        if (!isRateLimitError(signUpError) || attempt === SIGNUP_RETRY_ATTEMPTS) {
            throw new Error(`Creazione utente sintetico ${user.username} fallita: ${signUpError.message}`)
        }

        console.log(`[online-main] Rate limit Supabase su ${user.username}; attendo ${SIGNUP_RATE_LIMIT_WAIT_MS}ms prima del retry ${attempt + 1}/${SIGNUP_RETRY_ATTEMPTS}`)
        await waitMs(SIGNUP_RATE_LIMIT_WAIT_MS)
    }

    const { error: signInError } = await client.auth.signInWithPassword({
        email: user.email,
        password: user.password,
    })
    if (signInError) {
        throw new Error(`Impossibile autenticare ${user.username}: ${signInError.message}. Se la conferma email e' obbligatoria, usa credenziali ONLINE_USER_A_* e ONLINE_USER_B_* pre-provisionate.`)
    }

    const { data: userData, error: userError } = await client.auth.getUser()
    if (userError || !userData?.user?.id) {
        throw new Error(userError?.message || `Profilo Supabase non disponibile per ${user.username}`)
    }

    const { error: profileError } = await client
        .from('profiles')
        .upsert({
            id: userData.user.id,
            email: user.email,
            username: user.username,
            role: 'operator',
            first_name: user.firstName,
            last_name: user.lastName,
            phone: '',
            disabled: false,
        })

    if (profileError) {
        throw new Error(`Upsert profilo ${user.username} fallito: ${profileError.message}`)
    }

    await client.auth.signOut().catch(() => null)
}

function writeReport(report) {
    if (!REPORT_FILE) return
    fs.writeFileSync(REPORT_FILE, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
}

async function main() {
    const runContext = createOnlineRunContext()
    const residenze = buildSyntheticResidenze(runContext)
    const providedUsers = buildProvidedUsers()
    const users = providedUsers || buildSyntheticUsers(runContext)
    const accountMode = providedUsers ? 'provided' : 'synthetic-signup'

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
        if (!providedUsers) {
            if (INITIAL_SIGNUP_COOLDOWN_MS > 0) {
                console.log(`[online-main] Attendo ${INITIAL_SIGNUP_COOLDOWN_MS}ms prima di iniziare il provisioning per raffreddare il rate limit Supabase`)
                await waitMs(INITIAL_SIGNUP_COOLDOWN_MS)
            }

            for (const [index, user] of users.entries()) {
                const startedAt = new Date().toISOString()
                await provisionUser(user)
                report.provisioning.push({
                    username: user.username,
                    startedAt,
                    finishedAt: new Date().toISOString(),
                    status: 'provisioned',
                })

                if (index < users.length - 1 && INTER_ACCOUNT_SIGNUP_WAIT_MS > 0) {
                    console.log(`[online-main] Attendo ${INTER_ACCOUNT_SIGNUP_WAIT_MS}ms prima di creare l'account successivo per evitare il rate limit Supabase`)
                    await waitMs(INTER_ACCOUNT_SIGNUP_WAIT_MS)
                }
            }
        }

        await Promise.all([
            signInWithUi(pageA, users[0]),
            signInWithUi(pageB, users[1]),
        ])

        report.syncMessages.initialA = await runManualSync(pageA)
        report.syncMessages.initialB = await runManualSync(pageB)

        await Promise.all([
            createResidenza(pageA, residenze[0]),
            createResidenza(pageB, residenze[1]),
        ])

        report.syncMessages.afterCreateA = await runManualSync(pageA)
        report.syncMessages.afterCreateB = await runManualSync(pageB)
        report.syncMessages.reconcileA = await runManualSync(pageA)

        await Promise.all([
            assertResidenzeVisible(pageA, residenze),
            assertResidenzeVisible(pageB, residenze),
        ])

        report.success = true
        writeReport(report)
        console.log('[online-main] PASS two-user sync validation')
        console.log(JSON.stringify({
            run: runContext.slug,
            accountMode,
            residenze: residenze.map(item => item.codice),
            syncMessages: report.syncMessages,
        }, null, 2))
    } finally {
        for (const residenza of residenze) {
            report.cleanup[residenza.codice] = await bestEffortDeleteResidenza(pageA, residenza.codice)
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