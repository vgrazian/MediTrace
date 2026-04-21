#!/usr/bin/env node
/**
 * seed-demo.js — Carica i dati di esempio nel database locale.
 *
 * Avvia un server Vite dev, apre Chromium con un profilo persistente
 * (.demo-profile/) e carica i dati demo tramite l'interfaccia "Impostazioni".
 * Il browser rimane aperto: esplora liberamente l'UI popolata.
 *
 * Utilizzo:
 *   npm --prefix pwa run demo:load
 *   node pwa/scripts/seed-demo.js
 *
 * Account di accesso (creato automaticamente):
 *   username: prova  |  password: Prova123!
 */

import { chromium } from '@playwright/test'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PORT = 5174
const BASE_URL = `http://127.0.0.1:${PORT}`
const DEMO_PROFILE = resolve(__dirname, '../.demo-profile')

// ── Helpers ───────────────────────────────────────────────────────────────────

async function waitForServer(url, timeoutMs = 45_000) {
    const deadline = Date.now() + timeoutMs
    while (Date.now() < deadline) {
        try {
            const res = await fetch(url, { signal: AbortSignal.timeout(800) })
            if (res.status < 500) return
        } catch { /* not ready yet */ }
        await new Promise(r => setTimeout(r, 500))
    }
    throw new Error(`Server non raggiungibile su ${url} entro ${timeoutMs / 1000}s`)
}

async function ensureLocalSeedUser(page, { username, password }) {
    // Check if the registration form is visible (no users exist)
    const regFormVisible = await page.locator('#reg-username').isVisible()
    if (regFormVisible) {
        console.log('▶  No users exist, registering demo user via UI…')
        await page.fill('#reg-username', username)
        await page.fill('#reg-first-name', 'Demo')
        await page.fill('#reg-last-name', 'Local')
        await page.fill('#reg-email', 'demo@example.com')
        await page.fill('#reg-password', password)
        await page.fill('#reg-confirm-password', password)
        await page.click('button:has-text("Crea account admin")')
        // Wait for login to complete (main element visible)
        await page.waitForSelector('main', { timeout: 10000 })
        return { created: true, afterUsers: 'created via UI' }
    } else {
        // If user already exists, do nothing
        console.log('▶  User already exists, skipping registration.')
        return { created: false, afterUsers: 'already exists' }
    }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
    console.log('▶  Avvio server Vite dev…')

    const server = spawn(
        'npx', ['vite', '--host', '127.0.0.1', '--port', String(PORT)],
        {
            cwd: resolve(__dirname, '..'),
            env: {
                ...process.env,
                VITE_SEED_DATA: '1',
                VITE_DEV_SEED_ACCOUNT: '1',
                VITE_DEV_SEED_USERNAME: 'prova',
                VITE_DEV_SEED_PASSWORD: 'Prova123!',
                VITE_DEV_SEED_GITHUB_TOKEN: 'github_pat_demo_seed',
                VITE_BASE_URL: '/',
                FORCE_COLOR: '1',
            },
            stdio: ['ignore', 'pipe', 'pipe'],
        }
    )

    // Forward Vite output only for errors/warnings
    server.stderr.on('data', d => process.stderr.write(d))

    const cleanup = () => { try { server.kill() } catch { } }
    process.on('exit', cleanup)
    process.on('SIGINT', () => { cleanup(); process.exit(0) })
    process.on('SIGTERM', () => { cleanup(); process.exit(0) })

    try {
        await waitForServer(BASE_URL)
        console.log(`✔  Server pronto → ${BASE_URL}`)

        const context = await chromium.launchPersistentContext(DEMO_PROFILE, {
            headless: false, // Run in non-headless mode for debugging
            args: ['--disable-infobars'],
            viewport: { width: 1280, height: 800 },
        })
        // Print database name and version for confirmation
        console.log('▶  DB name (from env):', process.env.VITE_DB_NAME || 'meditrace')

        console.log('▶  Chromium launched in headless mode')

        const page = await context.newPage()
        await page.goto(`${BASE_URL}/#/`)
        console.log('▶  Navigated to login page')

        // ── Login robusto (senza dipendere dalla registrazione via GitHub API)
        const loginInput = page.locator('#username-input')
        const registerInput = page.locator('#reg-username')
        const mainEl = page.locator('main')
        const loginError = page.locator('.login-error')

        await Promise.race([
            loginInput.waitFor({ state: 'visible', timeout: 8000 }).then(() => console.log('▶  Login input visible')).catch(() => { }),
            registerInput.waitFor({ state: 'visible', timeout: 8000 }).then(() => console.log('▶  Register input visible')).catch(() => { }),
            mainEl.waitFor({ state: 'visible', timeout: 8000 }).then(() => console.log('▶  Main element visible')).catch(() => { }),
        ])

        if (await mainEl.isVisible()) {
            console.log('▶  Sessione già attiva.')
        } else {
            const ensured = await ensureLocalSeedUser(page, {
                username: 'prova',
                password: 'Prova123!',
            })

            if (ensured.created) {
                console.log('▶  Utente locale di prova creato (offline-safe).')
            }

            await page.reload()

            await Promise.race([
                loginInput.waitFor({ state: 'visible', timeout: 8000 }).catch(() => { }),
                mainEl.waitFor({ state: 'visible', timeout: 8000 }).catch(() => { }),
            ])
        }

        if (!(await mainEl.isVisible()) && await loginInput.isVisible()) {
            console.log('▶  Login con utente di prova…')
            await loginInput.fill('prova')
            await page.locator('#password-input').fill('Prova123!')
            await page.getByRole('button', { name: 'Accedi' }).click()
        }

        try {
            await mainEl.waitFor({ state: 'visible', timeout: 10_000 })
        } catch {
            const errText = await loginError.textContent().catch(() => null)
            throw new Error(errText ? `Login fallito: ${errText.trim()}` : 'Login fallito: schermata principale non raggiunta')
        }

        // ── Caricamento dati demo diretto dal service (idempotente) ───────────
        const seedResult = await page.evaluate(async () => {
            const seed = await import('/src/services/seedData.js')
            const alreadyLoaded = await seed.isSeedDataLoaded()
            if (alreadyLoaded) {
                return { alreadyLoaded: true, stats: seed.getSeedStats() }
            }

            const stats = await seed.loadSeedData()
            return { alreadyLoaded: false, stats }
        })

        if (seedResult.alreadyLoaded) {
            console.log('✔  Dati demo già presenti nel database.')
        } else {
            console.log('✔  Dati demo caricati nel database locale.')
        }

        // ── Naviga alla home per mostrare l'UI popolata ───────────────────────
        await page.goto(`${BASE_URL}/#/`)
        await mainEl.waitFor({ state: 'visible', timeout: 5000 })

        console.log('')
        console.log('══════════════════════════════════════════════════════════')
        console.log('  MediTrace — Demo attiva')
        console.log(`  URL:  ${BASE_URL}/#/`)
        console.log('  Profilo Chromium: .demo-profile/')
        console.log(`  Dati: ${seedResult.stats.drugs} farmaci · ${seedResult.stats.stockBatches} confezioni · ${seedResult.stats.hosts} ospiti · ${seedResult.stats.therapies} terapie`)
        console.log(`        ${seedResult.stats.movements} movimenti · ${seedResult.stats.reminders} promemoria`)
        console.log('  Chiudi la finestra del browser per terminare.')
        console.log('══════════════════════════════════════════════════════════')

        // Keep server alive until browser is closed
        await context.waitForEvent('close', { timeout: 0 })

    } finally {
        cleanup()
    }
}

main().catch(err => {
    console.error('\n✖  Errore seed-demo:', err.message)
    process.exit(1)
})
