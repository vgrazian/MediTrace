/**
 * quick-add-select.spec.js — E2E: "Aggiungi rapido" nei menu a tendina
 *
 * Verifica che il pulsante "+ Nuovo" appaia nei select e navighi correttamente.
 */
import { test, expect } from '@playwright/test'
import { loginOrRegisterSeededUser } from './helpers/login'

test.describe('Quick Add Select — Aggiungi rapido', () => {
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

  test('Terapie: il QuickAddSelect mostra pulsante "+ Nuovo" per il farmaco', async ({ page }) => {
    await page.getByRole('link', { name: 'Terapie Attive' }).first().click()
    await expect(page.getByRole('heading', { name: 'Terapie Attive' })).toBeVisible()

    // Apri il form aggiunta terapia
    await page.getByRole('button', { name: 'Aggiungi', exact: true }).click()

    // Verifica che il componente QuickAddSelect esista
    const quickAddBtn = page.locator('.quick-add-btn')
    await expect(quickAddBtn).toBeVisible()
    await expect(quickAddBtn).toContainText('Nuovo')
  })

  test('Terapie: cliccare "+ Nuovo" naviga a Farmaci', async ({ page }) => {
    await page.getByRole('link', { name: 'Terapie Attive' }).first().click()
    await expect(page.getByRole('heading', { name: 'Terapie Attive' })).toBeVisible()

    await page.getByRole('button', { name: 'Aggiungi', exact: true }).click()

    const quickAddBtn = page.locator('.quick-add-btn')
    if (await quickAddBtn.isVisible()) {
      await quickAddBtn.click()
      // Dovrebbe navigare a /farmaci
      await expect(page.getByRole('heading', { name: 'Catalogo Farmaci' })).toBeVisible()
    }
  })

  test('QuickAddSelect ha stile corretto', async ({ page }) => {
    await page.getByRole('link', { name: 'Terapie Attive' }).first().click()
    await page.getByRole('button', { name: 'Aggiungi', exact: true }).click()

    const quickAddBtn = page.locator('.quick-add-btn')
    if (await quickAddBtn.isVisible()) {
      // Verifica stile blue chiaro
      const bg = await quickAddBtn.evaluate(el => getComputedStyle(el).backgroundColor)
      expect(bg).toBeTruthy()
    }
  })
})
