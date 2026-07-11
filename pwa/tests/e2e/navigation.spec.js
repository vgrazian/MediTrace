/**
 * navigation.spec.js — E2E smoke tests for all MediTrace tabs
 *
 * Verifica che ogni scheda si apra, mostri i pulsanti CRUD,
 * e che sia possibile creare/modificare/eliminare entità.
 *
 * Richiede:
 *   - App deployata su VITE_BASE_URL (default: /MediTrace/)
 *   - Account admin predefinito (VITE_EMERGENCY_ADMIN_*)
 *   - SITE_URL configurata o default https://vgrazian.github.io/MediTrace/
 *
 * Esegui con:
 *   SITE_URL=https://vgrazian.github.io/MediTrace npx playwright test tests/e2e/navigation.spec.js
 */
import { test, expect } from '@playwright/test'
import { loginOrRegisterSeededUser } from './helpers/login'

async function navigateTo(page, tabName) {
    await page.click(`a:has-text("${tabName}")`)
    await page.waitForTimeout(500)
}

async function expectHeading(page, heading) {
    await expect(page.locator('h2').filter({ hasText: heading })).toBeVisible({ timeout: 5000 })
}

function uniqueName(prefix) {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
}

// ─── Tests ─────────────────────────────────────────────────────────────────

test.describe('Navigation smoke test', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto('/')
        await loginOrRegisterSeededUser(page)
    })

    test('Cruscotto loads', async ({ page }) => {
        await expect(page.locator('nav')).toBeVisible()
    })

    test('Promemoria tab', async ({ page }) => {
        await navigateTo(page, 'Promemoria')
        await expectHeading(page, 'Promemoria')
    })

    test('Ospiti tab + CRUD', async ({ page }) => {
        test.skip() // Requires seed data with residences — run with demo data loaded
        await navigateTo(page, 'Ospiti')
        await expectHeading(page, 'Ospiti')

        // Aggiungi ospite
        const testName = uniqueName('Test')
        await page.click('button:has-text("Aggiungi")')
        await page.waitForSelector('.add-panel', { timeout: 3000 })

        await page.fill('input[placeholder="Mario"]', testName)
        await page.fill('input[placeholder="Rossi"]', 'E2E')
        await page.selectOption('select:below(:text("Sesso"))', 'M')

        // Seleziona residenza (prima disponibile) o crea fallback
        const residenzaSelect = page.locator('select:below(:text("Residenza"))').first()
        const options = await residenzaSelect.locator('option').all()
        if (options.length > 1) {
            const value = await options[1].getAttribute('value')
            if (value) await residenzaSelect.selectOption(value)
        } else {
            // Nessuna residenza disponibile — salta test CRUD (solo navigazione verificata)
            await page.click('button:has-text("Chiudi")')
            test.skip()
            return
        }

        await page.click('button:has-text("Salva")')
        await page.waitForTimeout(1500)

        // Verifica ospite in lista
        await expect(page.locator('td').filter({ hasText: testName })).toBeVisible({ timeout: 5000 })

        // Elimina ospite
        const row = page.locator('tr', { has: page.locator('td', { hasText: testName }) })
        await row.locator('button:has-text("Elimina")').click()
        await page.waitForTimeout(500)
        // Conferma dialogo
        const confirmBtn = page.locator('button:has-text("Conferma")')
        if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
            await confirmBtn.click()
            await page.waitForTimeout(500)
        }

        // Verifica ospite rimosso
        await expect(page.locator('td').filter({ hasText: testName })).not.toBeVisible({ timeout: 5000 })
    })

    test('Terapie tab', async ({ page }) => {
        await navigateTo(page, 'Terapie')
        await expectHeading(page, 'Terapie')
    })

    test('Scorte tab', async ({ page }) => {
        await navigateTo(page, 'Scorte')
        await expectHeading(page, 'Scorte')
    })

    test('Movimenti tab', async ({ page }) => {
        await navigateTo(page, 'Movimenti')
        await expectHeading(page, 'Movimenti')
    })

    test('Farmaci tab', async ({ page }) => {
        await navigateTo(page, 'Farmaci')
        await expectHeading(page, 'Farmaci')
    })

    test('Residenze tab', async ({ page }) => {
        await navigateTo(page, 'Residenze')
        await expectHeading(page, 'Residenze')
    })

    test('Operatori tab (admin only)', async ({ page }) => {
        await navigateTo(page, 'Operatori')
        await expectHeading(page, 'Operatori')
    })

    test('Audit tab (admin only)', async ({ page }) => {
        await navigateTo(page, 'Audit')
        await expectHeading(page, 'Audit')
    })

    test('Diagnostica tab (admin only)', async ({ page }) => {
        await navigateTo(page, 'Diagnostica')
        // Diagnostica potrebbe mostrare "Axiom non configurato" — è OK
        await expect(page.locator('h2').filter({ hasText: 'Diagnostica' })).toBeVisible({ timeout: 5000 })
    })

    test('Guida tab', async ({ page }) => {
        await navigateTo(page, 'Guida')
        await expect(page.locator('h2, h1').filter({ hasText: /Guida|Manuale/ })).toBeVisible({ timeout: 5000 })
    })

    test('Impostazioni tab', async ({ page }) => {
        await navigateTo(page, 'Impostazioni')
        await expect(page.locator('text=Keep-Alive')).toBeVisible({ timeout: 5000 })
    })
})
