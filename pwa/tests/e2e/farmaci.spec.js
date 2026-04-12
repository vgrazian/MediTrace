import { test, expect } from '@playwright/test'
import { loginOrRegisterSeededUser } from './helpers/login'
import { runWithAcceptedConfirmation } from './helpers/confirm'

test('farmaci view supports creating and deactivating stock batch', async ({ page }) => {
    await page.route('https://api.github.com/user', async route => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                login: 'seeded-gh-user',
                name: 'Seeded User',
                avatar_url: 'https://avatars.githubusercontent.com/u/1?v=4',
            }),
        })
    })

    await page.goto('/')
    await loginOrRegisterSeededUser(page)

    await page.getByRole('link', { name: 'Farmaci' }).click()
    await expect(page.getByRole('heading', { name: 'Catalogo Farmaci' })).toBeVisible()
    await expect(page.locator('.dataset-frame')).toHaveCount(2)

    const panel = page.locator('details:has(summary:has-text("Gestisci Farmaci"))')
    await expect(panel).not.toHaveAttribute('open', '')

    await page.locator('.card', { hasText: 'Farmaci registrati' }).getByRole('button', { name: 'Aggiungi' }).click()
    await expect(panel).toHaveAttribute('open', '')

    await page.getByLabel('Nome farmaco').fill('Tachipirina Test')
    await page.getByLabel('Principio attivo').fill('Paracetamolo Test')
    await page.getByLabel('Classe terapeutica').fill('Analgesici')
    await page.getByLabel('Scorta minima').fill('10')
    await page.getByRole('button', { name: 'Salva farmaco' }).click()

    // Avoid flaky toast assertion on CI: verify persisted row directly.
    await expect(page.getByRole('cell', { name: 'Tachipirina Test', exact: true })).toBeVisible()
    await expect(panel).not.toHaveAttribute('open', '')

    await page.getByLabel('Seleziona farmaco Tachipirina Test').check()
    await page.getByRole('button', { name: 'Modifica' }).first().click()
    await expect(page.getByRole('button', { name: 'Salva modifica' })).toBeVisible()
    await page.getByRole('button', { name: 'Annulla' }).first().click()

    await page.locator('.card', { hasText: 'Confezioni attive' }).getByRole('button', { name: 'Aggiungi' }).click()
    await expect(panel).toHaveAttribute('open', '')
    await page.getByLabel('Farmaco *').selectOption('Tachipirina Test (Paracetamolo Test)')
    await page.getByLabel('Nome commerciale').fill('Tachipirina Test')
    await page.getByLabel('Dosaggio').fill('500mg')
    await page.getByLabel(/Quantit.* attuale/).fill('12')
    await page.getByLabel('Soglia riordino').fill('4')
    await page.getByRole('button', { name: 'Salva confezione' }).click()

    await expect(page.getByText(/Confezione salvata/i)).toBeVisible()
    await expect(panel).not.toHaveAttribute('open', '')
    await expect(page.locator('tbody tr', { hasText: 'Tachipirina Test' }).first()).toBeVisible()

    await page.getByLabel('Seleziona confezione Tachipirina Test').check()
    const batchCard = page.locator('.card', { hasText: 'Confezioni attive' })
    await runWithAcceptedConfirmation(page, async () => {
        await batchCard.getByRole('button', { name: 'Elimina (1)' }).click()
    })

    await expect(page.getByText('Confezione eliminata.')).toBeVisible()
    await expect(page.locator('.undo-banner')).toContainText('Confezione')
    await page.locator('.undo-banner').getByRole('button', { name: 'Annulla eliminazione' }).click()
    await expect(page.getByText('Eliminazione annullata: confezione ripristinata.')).toBeVisible()
    await expect(page.locator('tbody tr', { hasText: 'Tachipirina Test' }).first()).toBeVisible()

    await page.getByLabel('Seleziona confezione Tachipirina Test').check()
    await runWithAcceptedConfirmation(page, async () => {
        await batchCard.getByRole('button', { name: 'Elimina (1)' }).click()
    })
    await expect(page.getByText('Nessuna confezione attiva disponibile.')).toBeVisible()
})
