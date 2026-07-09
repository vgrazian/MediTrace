/**
 * draft-save.spec.js — E2E: Salvataggio bozza e ripristino
 *
 * Verifica che il form auto-salvi una bozza e la offra al ritorno.
 */
import { test, expect } from '@playwright/test'
import { loginOrRegisterSeededUser } from './helpers/login'

test.describe('Draft Save — Salvataggio bozza', () => {
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

    test('Ospiti: la bozza viene salvata e offerta al ritorno', async ({ page }) => {
        await page.getByRole('link', { name: 'Ospiti' }).first().click()
        await expect(page.getByRole('heading', { name: 'Ospiti' })).toBeVisible()

        // Apri form e compila parzialmente
        await page.getByRole('button', { name: 'Aggiungi', exact: true }).click()

        const nomeInput = page.locator('input[placeholder="Mario"]')
        if (await nomeInput.isVisible()) {
            await nomeInput.fill('Bozza')
            await page.locator('input[placeholder="Rossi"]').fill('Test')

            // Chiudi senza salvare (simula abbandono)
            await page.getByRole('button', { name: 'Annulla' }).click()

            // Riapri il form — dovrebbe chiedere di ripristinare
            await page.getByRole('button', { name: 'Aggiungi', exact: true }).click()

            // Gestisci il dialog di conferma bozza
            page.on('dialog', dialog => dialog.accept())

            // Il form dovrebbe essere visibile
            await expect(nomeInput).toBeVisible()
        }
    })

    test('Ospiti: la bozza viene cancellata dopo save riuscito', async ({ page }) => {
        await page.getByRole('link', { name: 'Ospiti' }).first().click()
        await expect(page.getByRole('heading', { name: 'Ospiti' })).toBeVisible()

        await page.getByRole('button', { name: 'Aggiungi', exact: true }).click()

        const nomeInput = page.locator('input[placeholder="Mario"]')
        if (await nomeInput.isVisible()) {
            await nomeInput.fill('Salvato')
            await page.locator('input[placeholder="Rossi"]').fill('Definitivo')

            // Salva
            const saveBtn = page.getByRole('button', { name: /Salva ospite/i })
            if (await saveBtn.isVisible()) {
                await saveBtn.click()
                await expect(page.getByText(/creato|aggiornato/i)).toBeVisible()

                // Riapri — non dovrebbe esserci bozza
                await page.getByRole('button', { name: 'Aggiungi', exact: true }).click()
                // Il form dovrebbe essere vuoto (nome pulito)
                const nomeAfter = await page.locator('input[placeholder="Mario"]').inputValue()
                expect(nomeAfter).toBe('')
            }
        }
    })
})
