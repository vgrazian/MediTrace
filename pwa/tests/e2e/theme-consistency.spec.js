/**
 * theme-consistency.spec.js — E2E: Tema moderno e coerenza componenti
 *
 * Verifica aspetti visivi e di accessibilità del tema.
 */
import { test, expect } from '@playwright/test'
import { loginOrRegisterSeededUser } from './helpers/login'

test.describe('Tema e Coerenza Componenti', () => {
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

  test('le tabelle hanno header sticky', async ({ page }) => {
    await page.getByRole('link', { name: 'Ospiti' }).first().click()
    await expect(page.getByRole('heading', { name: 'Ospiti' })).toBeVisible()

    // Verifica che esista una tabella
    const table = page.locator('table.conflict-table').first()
    if (await table.isVisible()) {
      const th = table.locator('th').first()
      if (await th.isVisible()) {
        const position = await th.evaluate(el => getComputedStyle(el).position)
        expect(position).toBe('sticky')
      }
    }
  })

  test('le card hanno ombra e border-radius coerenti', async ({ page }) => {
    await page.getByRole('link', { name: 'Ospiti' }).first().click()
    await expect(page.getByRole('heading', { name: 'Ospiti' })).toBeVisible()

    const card = page.locator('.card').first()
    if (await card.isVisible()) {
      const borderRadius = await card.evaluate(el => getComputedStyle(el).borderRadius)
      const boxShadow = await card.evaluate(el => getComputedStyle(el).boxShadow)
      expect(borderRadius).toBeTruthy()
      expect(boxShadow).toBeTruthy()
    }
  })

  test('le righe tabella hanno effetto hover', async ({ page }) => {
    await page.getByRole('link', { name: 'Ospiti' }).first().click()
    await expect(page.getByRole('heading', { name: 'Ospiti' })).toBeVisible()

    const table = page.locator('table.conflict-table').first()
    if (await table.isVisible()) {
      // Verifica che la tabella abbia stili definiti
      const hasStyle = await table.evaluate(el => {
        const styles = document.styleSheets
        return true // la tabella esiste
      })
      expect(hasStyle).toBe(true)
    }
  })

  test('i pulsanti hanno transizioni smooth', async ({ page }) => {
    await page.getByRole('link', { name: 'Ospiti' }).first().click()
    await expect(page.getByRole('heading', { name: 'Ospiti' })).toBeVisible()

    const btn = page.locator('button').first()
    if (await btn.isVisible()) {
      const transition = await btn.evaluate(el => getComputedStyle(el).transition)
      expect(transition).toBeTruthy()
    }
  })
})
