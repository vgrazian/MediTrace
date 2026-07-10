/**
 * Smoke test: verifica che ogni vista renderizzi contenuto iniziale senza dati pre-popolati.
 *
 * Questo test e' stato aggiunto dopo un bug critico (TDZ nel minifier) che causava
 * il rendering di pagine vuote (<!----> nel #main-content) in 5 viste su 14.
 * Il bug non era rilevato dai test esistenti perche' pre-caricavano dati via CSV.
 *
 * Ogni test:
 *  1. Fa login con utente seeded
 *  2. Naviga alla vista
 *  3. Verifica che il #main-content abbia contenuto reale (non solo <!---->)
 */
import { test, expect } from '@playwright/test'
import { loginOrRegisterSeededUser } from './helpers/login'

/**
 * Verifica che una vista abbia renderizzato contenuto reale.
 * Il bug TDZ causava il rendering di <!----> (commento vuoto Vue) nel main.
 */
async function expectViewRendered(page) {
    const main = page.locator('#main-content')

    // Aspetta che il contenuto sia presente
    await main.locator('> *').first().waitFor({ state: 'visible', timeout: 8000 })

    // Il contenuto non deve essere il commento vuoto di Vue (<!---->)
    const html = await main.innerHTML()
    expect(html.trim(), 'La vista deve avere contenuto reale, non <!---->').not.toBe('<!---->')
    expect(html.length, 'La vista deve avere HTML significativo').toBeGreaterThan(50)
}

// ────────────────────────────────────────────────────────────────────────────

test.describe('Smoke: rendering iniziale viste', () => {

    test('HomeView — Cruscotto', async ({ page }) => {
        await page.goto('/')
        await loginOrRegisterSeededUser(page)
        await expect(page.locator('#main-content > *').first()).toBeVisible({ timeout: 5000 })
        await expectViewRendered(page)
    })

    test('PromemoriaView', async ({ page }) => {
        await page.goto('/')
        await loginOrRegisterSeededUser(page)
        await page.getByRole('link', { name: 'Promemoria' }).first().click()
        await expectViewRendered(page)
    })

    test('OspitiView', async ({ page }) => {
        await page.goto('/')
        await loginOrRegisterSeededUser(page)
        await page.getByRole('link', { name: 'Ospiti' }).first().click()
        await expectViewRendered(page)
    })

    test('TerapieView', async ({ page }) => {
        await page.goto('/')
        await loginOrRegisterSeededUser(page)
        await page.getByRole('link', { name: 'Terapie' }).first().click()
        await expectViewRendered(page)
    })

    test('ScorteView', async ({ page }) => {
        await page.goto('/')
        await loginOrRegisterSeededUser(page)
        await page.getByRole('link', { name: 'Scorte' }).first().click()
        await expectViewRendered(page)
    })

    test('MovimentiView', async ({ page }) => {
        await page.goto('/')
        await loginOrRegisterSeededUser(page)
        await page.getByRole('link', { name: 'Movimenti' }).first().click()
        await expectViewRendered(page)
    })

    test('FarmaciView', async ({ page }) => {
        await page.goto('/')
        await loginOrRegisterSeededUser(page)
        await page.getByRole('link', { name: 'Farmaci' }).first().click()
        await expectViewRendered(page)
    })

    test('ResidenzeView', async ({ page }) => {
        await page.goto('/')
        await loginOrRegisterSeededUser(page)
        await page.getByRole('link', { name: 'Residenze' }).first().click()
        await expectViewRendered(page)
    })

    test('OperatoriView', async ({ page }) => {
        await page.goto('/')
        await loginOrRegisterSeededUser(page)
        await page.getByRole('link', { name: 'Operatori' }).first().click()
        await expectViewRendered(page)
    })

    test('AuditLogView', async ({ page }) => {
        await page.goto('/')
        await loginOrRegisterSeededUser(page)
        await page.getByRole('link', { name: 'Audit' }).first().click()
        await expectViewRendered(page)
    })

    test('DiagnosticaView', async ({ page }) => {
        await page.goto('/')
        await loginOrRegisterSeededUser(page)
        await page.getByRole('link', { name: 'Diagnostica' }).first().click()
        await expectViewRendered(page)
    })

    test('ImpostazioniView', async ({ page }) => {
        await page.goto('/')
        await loginOrRegisterSeededUser(page)
        await page.getByRole('link', { name: 'Impostazioni' }).first().click()
        await expectViewRendered(page)
    })

    test('ManualeView', async ({ page }) => {
        await page.goto('/')
        await loginOrRegisterSeededUser(page)
        await page.getByRole('link', { name: 'Guida' }).first().click()
        await expectViewRendered(page)
    })
})
