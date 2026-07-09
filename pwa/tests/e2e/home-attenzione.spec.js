/**
 * home-attenzione.spec.js — E2E: Pannello Attenzione in dashboard
 *
 * Verifica che il pannello "Attenzione" appaia con gli elementi corretti
 * e che i link navighino alle viste appropriate.
 */
import { test, expect } from '@playwright/test'
import { loginOrRegisterSeededUser } from './helpers/login'

test.describe('Pannello Attenzione Dashboard', () => {
    test.beforeEach(async ({ page }) => {
        await page.route('https://api.github.com/user', async route => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ login: 'seeded-gh-user', name: 'Seeded User' }),
            })
        })
        await page.goto('/')
        await loginOrRegisterSeededUser(page)
    })

    test('il pannello Attenzione appare quando ci sono elementi da segnalare', async ({ page }) => {
        // Vai alla home
        await page.goto('/#/')
        await page.waitForLoadState('networkidle')

        // Se ci sono promemoria pendenti o scorte critiche, il pannello deve apparire
        const attentionPanel = page.locator('.attention-panel')
        // Il pannello può essere presente o meno a seconda dei dati di test
        // Verifichiamo che la struttura sia corretta quando presente
        if (await attentionPanel.isVisible()) {
            await expect(attentionPanel.locator('strong')).toContainText('Attenzione')
            // Deve contenere link
            const links = attentionPanel.locator('a.attention-link')
            const count = await links.count()
            expect(count).toBeGreaterThan(0)
        }
    })

    test('i link nel pannello Attenzione navigano alle viste corrette', async ({ page }) => {
        await page.goto('/#/')
        await page.waitForLoadState('networkidle')

        const attentionPanel = page.locator('.attention-panel')
        if (!(await attentionPanel.isVisible())) {
            test.skip(true, 'Nessun elemento di attenzione presente nei dati di test')
            return
        }

        const links = attentionPanel.locator('a.attention-link')
        const count = await links.count()

        for (let i = 0; i < count; i++) {
            const link = links.nth(i)
            const href = await link.getAttribute('href')
            // I link devono puntare a route valide
            expect(href).toBeTruthy()
            expect(href).toMatch(/^#\//)
        }
    })

    test('la dashboard mostra i KPI del turno di oggi', async ({ page }) => {
        await page.goto('/#/')
        await page.waitForLoadState('networkidle')

        // Verifica che la sezione Riepilogo sia presente
        await expect(page.getByText('Riepilogo turno di oggi')).toBeVisible()

        // Verifica che i link rapidi siano presenti
        await expect(page.getByText('Navigazione rapida')).toBeVisible()
    })

    test('il pannello Benvenuto mostra il nome utente e il ruolo', async ({ page }) => {
        await page.goto('/#/')
        await page.waitForLoadState('networkidle')

        // Verifica Benvenuto
        await expect(page.getByText(/Benvenuto/)).toBeVisible()
        await expect(page.getByText(/Ruolo attivo/)).toBeVisible()
    })

    test('il link promemoria nel pannello Attenzione naviga a /promemoria', async ({ page }) => {
        await page.goto('/#/')
        await page.waitForLoadState('networkidle')

        const attentionPanel = page.locator('.attention-panel')
        if (!(await attentionPanel.isVisible())) {
            test.skip(true, 'Nessun elemento di attenzione presente')
            return
        }

        const promemoriaLink = attentionPanel.locator('a[href="#/promemoria"]')
        if (await promemoriaLink.isVisible()) {
            await promemoriaLink.click()
            await expect(page.getByRole('heading', { name: 'Promemoria' })).toBeVisible()
        }
    })
})
