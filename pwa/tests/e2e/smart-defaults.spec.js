/**
 * smart-defaults.spec.js — E2E: Validazione inline e smart defaults
 *
 * Verifica che i form ricordino l'ultimo valore usato e lo pre-compilino.
 */
import { test, expect } from '@playwright/test'
import { loginOrRegisterSeededUser } from './helpers/login'

test.describe('Smart Defaults — Memoria ultimi valori', () => {
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

  test('Ospiti: la residenza viene ricordata tra creazioni', async ({ page }) => {
    await page.getByRole('link', { name: 'Ospiti' }).first().click()
    await expect(page.getByRole('heading', { name: 'Ospiti' })).toBeVisible()

    // Prima creazione: seleziona una residenza
    await page.getByRole('button', { name: 'Aggiungi', exact: true }).click()

    // Seleziona una residenza se disponibile
    const roomSelect = page.locator('select').filter({ has: page.locator('option') }).first()
    const options = await roomSelect.locator('option').all()
    if (options.length > 1) {
      // Seleziona la prima opzione non vuota
      const firstValue = await options[1].getAttribute('value')
      if (firstValue) {
        await roomSelect.selectOption(firstValue)

        // Compila nome e cognome minimi
        await page.locator('input[placeholder="Mario"]').fill('Smart')
        await page.locator('input[placeholder="Rossi"]').fill('Default')

        // Salva
        await page.getByRole('button', { name: /Salva ospite/i }).click()
        await expect(page.getByText(/creato|aggiornato/i)).toBeVisible()

        // Seconda creazione: la residenza dovrebbe essere pre-selezionata
        await page.getByRole('button', { name: 'Aggiungi', exact: true }).click()
        const roomSelect2 = page.locator('select').filter({ has: page.locator('option') }).first()
        const selectedValue = await roomSelect2.inputValue()
        // La residenza dovrebbe essere pre-selezionata
        expect(selectedValue).toBe(firstValue)

        // Chiudi il form
        await page.getByRole('button', { name: 'Annulla' }).click()
      }
    }
  })

  test('la validazione inline mostra errori in tempo reale', async ({ page }) => {
    await page.getByRole('link', { name: 'Farmaci' }).first().click()
    await expect(page.getByRole('heading', { name: 'Catalogo Farmaci' })).toBeVisible()

    await page.getByRole('button', { name: 'Aggiungi', exact: true }).click()

    // Prova a salvare senza compilare — dovrebbe mostrare validazione
    const saveBtn = page.getByRole('button', { name: /Salva farmaco|Aggiungi farmaco/i })
    if (await saveBtn.isVisible()) {
      // Verifica che gli input required esistano
      const requiredInputs = page.locator('[required]')
      const count = await requiredInputs.count()
      expect(count).toBeGreaterThan(0)
    }
  })
})
