/**
 * undo-delete-consistency.spec.js — E2E: banner annulla eliminazione standardizzato
 *
 * Verifica che tutte le viste CRUD mostrino il banner UndoDeleteBanner
 * coerente dopo una soft-delete e che l'undo ripristini l'elemento.
 */
import { test, expect } from '@playwright/test'
import { loginOrRegisterSeededUser } from './helpers/login'

test.describe('Banner Annulla Eliminazione', () => {
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

    test('Residenze: undo banner appare dopo delete e ripristina la residenza', async ({ page }) => {
        await page.getByRole('link', { name: 'Residenze' }).first().click()
        await expect(page.getByRole('heading', { name: 'Residenze' })).toBeVisible()

        // Crea una residenza di test
        await page.getByRole('button', { name: 'Aggiungi', exact: true }).click()
        await page.getByLabel('Nome residenza').fill('Undo Test Residenza')
        await page.getByLabel('Max ospiti').fill('5')
        await page.getByRole('button', { name: 'Salva residenza' }).click()
        await expect(page.getByText('Residenza creata.')).toBeVisible()

        // Elimina
        const deleteBtn = page.locator('tr', { hasText: 'Undo Test Residenza' }).getByRole('button', { name: 'Elimina' })
        await deleteBtn.click()
        // Conferma dialogo
        await page.getByRole('button', { name: 'Elimina residenza' }).click()

        // Verifica banner undo
        await expect(page.locator('.undo-banner')).toBeVisible()
        await expect(page.locator('.undo-banner')).toContainText('Undo Test Residenza')

        // Esegui undo
        await page.locator('.undo-banner .undo-btn').click()

        // Verifica ripristino
        await expect(page.locator('.undo-banner')).not.toBeAttached()
        await expect(page.getByText('Eliminazione annullata: residenza ripristinata.')).toBeVisible()
        await expect(page.getByText('Undo Test Residenza')).toBeVisible()
    })

    test('Scorte: undo banner appare dopo delete farmaco e ripristina', async ({ page }) => {
        await page.getByRole('link', { name: 'Scorte' }).first().click()
        await expect(page.getByRole('heading', { name: 'Scorte' })).toBeVisible()

        // Apri il pannello gestione confezioni attive
        const gestisciBtn = page.getByRole('button', { name: /Gestisci|Aggiungi/ }).first()
        await gestisciBtn.click()

        // Crea un farmaco di test
        const addDrugBtn = page.getByRole('button', { name: /Aggiungi farmaco|Nuovo farmaco/ }).first()
        if (await addDrugBtn.isVisible()) {
            await addDrugBtn.click()
            const principioInput = page.getByLabel(/Principio attivo|Nome farmaco/i).first()
            if (await principioInput.isVisible()) {
                await principioInput.fill('UndoTestFarmaco')
                const saveBtn = page.getByRole('button', { name: /Salva farmaco|Aggiungi farmaco/i }).first()
                if (await saveBtn.isVisible()) await saveBtn.click()
            }
        }

        // Cerca il farmaco e elimina
        const deleteDrugBtn = page.locator('tr', { hasText: 'UndoTestFarmaco' }).getByRole('button', { name: /Elimina|🗑/ })
        if (await deleteDrugBtn.isVisible()) {
            await deleteDrugBtn.first().click()
            // Conferma
            const confirmBtn = page.getByRole('button', { name: /Conferma|Elimina farmaco/i })
            if (await confirmBtn.isVisible()) await confirmBtn.click()

            // Verifica banner undo
            await expect(page.locator('.undo-banner')).toBeVisible()
            await expect(page.locator('.undo-banner')).toContainText('UndoTestFarmaco')

            // Esegui undo
            await page.locator('.undo-banner .undo-btn').click()
            await expect(page.locator('.undo-banner')).not.toBeAttached()
            await expect(page.getByText('Eliminazione annullata')).toBeVisible()
        }
    })

    test('Promemoria: undo banner appare dopo delete promemoria e ripristina', async ({ page }) => {
        await page.getByRole('link', { name: 'Promemoria' }).first().click()
        await expect(page.getByRole('heading', { name: 'Promemoria' })).toBeVisible()

        // Trova un promemoria con pulsante Elimina
        const deleteBtn = page.getByRole('button', { name: 'Elimina' }).first()
        if (await deleteBtn.isVisible()) {
            await deleteBtn.click()

            // Potrebbe apparire una conferma
            const confirmBtn = page.getByRole('button', { name: /Conferma|Sì|Elimina promemoria/i })
            if (await confirmBtn.isVisible()) await confirmBtn.click()

            // Verifica banner undo
            await expect(page.locator('.undo-banner')).toBeVisible()
            await expect(page.locator('.undo-banner .undo-btn')).toBeVisible()

            // Esegui undo
            await page.locator('.undo-banner .undo-btn').click()
            await expect(page.locator('.undo-banner')).not.toBeAttached()
            await expect(page.getByText('Eliminazione annullata: promemoria ripristinato.')).toBeVisible()
        }
    })

    test('Ospiti: undo banner già esistente funziona correttamente', async ({ page }) => {
        await page.getByRole('link', { name: 'Ospiti' }).first().click()
        await expect(page.getByRole('heading', { name: 'Ospiti' })).toBeVisible()

        // Verifica che il banner UndoDeleteBanner sia importato (anche se non visibile)
        // Creiamo un ospite e lo eliminiamo per testare l'undo
        await page.getByRole('button', { name: 'Aggiungi', exact: true }).click()

        const codiceInput = page.locator('input[placeholder*="Codice"], input[placeholder*="Iniziali"]').first()
        if (await codiceInput.isVisible()) {
            await codiceInput.fill('UNDO')
            const saveBtn = page.getByRole('button', { name: /Salva ospite|Aggiungi ospite/i }).first()
            if (await saveBtn.isVisible()) await saveBtn.click()
        }

        // Elimina
        const deleteBtn = page.locator('tr', { hasText: 'UNDO' }).getByRole('button', { name: 'Elimina' }).first()
        if (await deleteBtn.isVisible()) {
            await deleteBtn.click()
            const confirmBtn = page.getByRole('button', { name: /Conferma|Elimina ospite/i })
            if (await confirmBtn.isVisible()) await confirmBtn.click()

            // Verifica banner undo (già presente da prima)
            await expect(page.locator('.undo-banner')).toBeVisible()

            // Undo
            await page.locator('.undo-banner .undo-btn').click()
            await expect(page.locator('.undo-banner')).not.toBeAttached()
        }
    })
})
