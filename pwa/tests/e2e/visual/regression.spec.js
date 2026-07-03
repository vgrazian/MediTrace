// Visual regression and smoke tests for MediTrace PWA
// Run: npx playwright test pwa/tests/visual/regression.spec.js

import { test, expect } from '@playwright/test'

const BASE = 'http://localhost:5173'

const ALL_PANEL_ROUTES = [
    '/',
    '/#/farmaci',
    '/#/ospiti',
    '/#/residenze',
    '/#/scorte',
    '/#/movimenti',
    '/#/terapie',
    '/#/promemoria',
    '/#/audit',
    '/#/operatori',
    '/#/impostazioni',
    '/#/manuale',
]

test.describe('Visual Regression', () => {
    test('all panel routes load without console errors', async ({ page }) => {
        const errors = []
        page.on('pageerror', err => errors.push(err.message))

        for (const route of ALL_PANEL_ROUTES) {
            await page.goto(`${BASE}${route}`)
            await page.waitForLoadState('networkidle')
            await page.waitForTimeout(300)
        }

        if (errors.length > 0) {
            console.error('Console errors:', errors)
        }
        expect(errors).toHaveLength(0)
    })

    test('no "Gestione" meta-label twisties remain in any panel', async ({ page }) => {
        const panelRoutes = [
            '/#/farmaci',
            '/#/ospiti',
            '/#/residenze',
            '/#/scorte',
            '/#/movimenti',
            '/#/terapie',
            '/#/promemoria',
        ]

        for (const route of panelRoutes) {
            await page.goto(`${BASE}${route}`)
            await page.waitForLoadState('networkidle')
            await page.waitForTimeout(500)

            const twisties = page.locator('details summary strong')
            const count = await twisties.count()
            for (let i = 0; i < count; i++) {
                const text = await twisties.nth(i).textContent()
                expect(text).not.toMatch(/^Gestione\s|^Gestisci\s/)
            }
        }
    })

    test('CRUD panels appear on-demand, not pre-rendered', async ({ page }) => {
        // Residenze panel should NOT be in DOM before clicking Aggiungi
        await page.goto(`${BASE}/#/residenze`)
        await page.waitForLoadState('networkidle')
        await expect(
            page.locator('details:has(summary:has-text("Aggiungi residenza"))')
        ).not.toBeAttached()

        // Farmaci panel should NOT be in DOM before clicking Aggiungi
        await page.goto(`${BASE}/#/farmaci`)
        await page.waitForLoadState('networkidle')
        await expect(
            page.locator('details:has(summary:has-text("Aggiungi farmaco"))')
        ).not.toBeAttached()
        await expect(
            page.locator('details:has(summary:has-text("Aggiungi confezione"))')
        ).not.toBeAttached()
    })

    test('desktop viewport renders without errors', async ({ page }) => {
        await page.setViewportSize({ width: 1440, height: 900 })
        await page.goto(BASE)
        await page.waitForLoadState('networkidle')

        // App should render either the login page or the authenticated dashboard
        const isLoggedIn = await page.getByRole('link', { name: 'Cruscotto' }).isVisible().catch(() => false)
        if (isLoggedIn) {
            await expect(page.getByRole('link', { name: 'Farmaci' })).toBeVisible()
            await expect(page.getByRole('link', { name: 'Residenze' })).toBeVisible()
        } else {
            // Login page should be visible
            await expect(page.locator('#username-input')).toBeVisible()
        }
    })

    test('mobile viewport renders without horizontal overflow', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 812 })
        await page.goto(BASE)
        await page.waitForLoadState('networkidle')

        // Check no horizontal scrollbar
        const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
        const viewportWidth = await page.evaluate(() => window.innerWidth)
        expect(scrollWidth).toBeLessThanOrEqual(viewportWidth + 10)
    })
})
