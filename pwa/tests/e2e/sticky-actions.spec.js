/**
 * sticky-actions.spec.js — E2E: Barra azioni fissa su mobile/tablet
 *
 * Verifica che la barra azioni (view-actions) sia presente e
 * abbia la classe CSS corretta per lo sticky positioning.
 */
import { test, expect } from '@playwright/test'
import { loginOrRegisterSeededUser } from './helpers/login'

const VIEWS = [
  { name: 'Ospiti', selector: 'Ospiti' },
  { name: 'Farmaci', selector: 'Catalogo Farmaci' },
  { name: 'Terapie', selector: 'Terapie Attive' },
  { name: 'Movimenti', selector: 'Movimenti' },
  { name: 'Residenze', selector: 'Residenze' },
  { name: 'Scorte', selector: 'Scorte' },
  { name: 'Promemoria', selector: 'Promemoria' },
]

test.describe('Barra Azioni Fissa (Mobile/Tablet)', () => {
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

  for (const view of VIEWS) {
    test(`${view.name}: la barra azioni .view-actions esiste ed è sticky`, async ({ page }) => {
      await page.getByRole('link', { name: view.selector }).first().click()
      await expect(page.getByRole('heading', { name: view.selector })).toBeVisible()

      // Verifica che la classe view-actions sia presente
      const actionBar = page.locator('.view-actions').first()
      await expect(actionBar).toBeVisible()

      // Verifica che contenga almeno un pulsante
      const buttons = actionBar.locator('button')
      const count = await buttons.count()
      expect(count).toBeGreaterThan(0)
    })
  }

  test('la barra azioni ha position: sticky su viewport mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 }) // iPhone SE
    await page.getByRole('link', { name: 'Ospiti' }).first().click()
    await expect(page.getByRole('heading', { name: 'Ospiti' })).toBeVisible()

    const actionBar = page.locator('.view-actions').first()
    await expect(actionBar).toBeVisible()

    // Verifica che la position sia sticky tramite computed style
    const position = await actionBar.evaluate(el => getComputedStyle(el).position)
    expect(position).toBe('sticky')
  })
})
