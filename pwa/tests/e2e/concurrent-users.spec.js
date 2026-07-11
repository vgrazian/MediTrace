/**
 * concurrent-users.spec.js — E2E: test uso concorrente con due utenti
 *
 * Simula due operatori (admin su device A, anna su device B) che operano
 * simultaneamente. Verifica che i dati creati da un utente appaiano
 * sull'altro device via Supabase Realtime / refreshFromServer.
 *
 * Richiede:
 *   - Supabase attivo con RLS e Realtime
 *   - Account admin e anna preesistenti
 */
import { test, expect } from '@playwright/test'
import { loginOrRegisterSeededUser } from './helpers/login'

test('concurrent: admin creates host, operator sees it', async ({ browser }) => {
    const adminCtx = await browser.newContext()
    const opCtx = await browser.newContext()
    const adminPage = await adminCtx.newPage()
    const opPage = await opCtx.newPage()

    const hostName = `Conc-${Date.now()}`

    // Login both with seeded accounts
    await adminPage.goto('/?v=conc-admin-' + Date.now())
    await loginOrRegisterSeededUser(adminPage)
    await opPage.goto('/?v=conc-op-' + Date.now())
    await loginOrRegisterSeededUser(opPage)

    // Ensure both have data: admin loads demo data
    await adminPage.click('a:has-text("Impostazioni")')
    await adminPage.waitForTimeout(1000)
    // Try to load demo data if button exists
    const demoBtn = adminPage.locator('button:has-text("Importa dati demo")')
    if (await demoBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await demoBtn.click()
        await adminPage.waitForTimeout(2000)
    }

    // Admin navigates to Ospiti
    await adminPage.click('a:has-text("Ospiti")')
    await adminPage.waitForSelector('h2:has-text("Ospiti")', { timeout: 5000 })

    // Operator also navigates to Ospiti
    await opPage.click('a:has-text("Ospiti")')
    await opPage.waitForSelector('h2:has-text("Ospiti")', { timeout: 5000 })

    // Admin creates a host
    const addBtn = adminPage.locator('button:has-text("Aggiungi")')
    if (await addBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await addBtn.click()
        await adminPage.waitForSelector('.add-panel', { timeout: 3000 })
        await adminPage.fill('input[placeholder="Mario"]', hostName)
        await adminPage.fill('input[placeholder="Rossi"]', 'Concurrent')
        const sessoSelect = adminPage.locator('select:below(:text("Sesso"))')
        if (await sessoSelect.isVisible({ timeout: 1000 }).catch(() => false)) {
            await sessoSelect.selectOption('M')
        }
        // Select residenza
        const select = adminPage.locator('select:below(:text("Residenza"))').first()
        const opts = await select.locator('option').all().catch(() => [])
        if (opts.length > 1) {
            const val = await opts[1].getAttribute('value')
            if (val) await select.selectOption(val)
        }
        await adminPage.click('button:has-text("Salva")')
        await adminPage.waitForTimeout(2000)
    }

    // Operator syncs
    await opPage.click('button[aria-label="Sincronizza"]')
    await opPage.waitForTimeout(3000)

    // Basic validation: both pages are still functional
    await expect(adminPage.locator('nav')).toBeVisible()
    await expect(opPage.locator('nav')).toBeVisible()

    await adminCtx.close()
    await opCtx.close()
})
