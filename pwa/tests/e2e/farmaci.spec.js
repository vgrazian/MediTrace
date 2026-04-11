import { test, expect } from '@playwright/test'
import { loginOrRegisterSeededUser } from './helpers/login'

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

    await page.locator('summary', { hasText: 'Gestisci Farmaci' }).click()

    await page.getByLabel('Nome farmaco').fill('Tachipirina Test')
    await page.getByLabel('Principio attivo').fill('Paracetamolo Test')
    await page.getByLabel('Classe terapeutica').fill('Analgesici')
    await page.getByLabel('Scorta minima').fill('10')
    await page.getByRole('button', { name: 'Salva farmaco' }).click()

    // Avoid flaky toast assertion on CI: verify persisted row directly.
    await expect(page.getByRole('cell', { name: 'Tachipirina Test' })).toBeVisible()

    await page.locator('select').first().selectOption('Tachipirina Test (Paracetamolo Test)')
    await page.getByLabel('Nome commerciale').fill('Tachipirina Test')
    await page.getByLabel('Dosaggio').fill('500mg')
    await page.getByLabel(/Quantit.* attuale/).fill('12')
    await page.getByLabel('Soglia riordino').fill('4')
    await page.getByRole('button', { name: 'Salva confezione' }).click()

    await expect(page.getByText(/Confezione salvata/i)).toBeVisible()
    await expect(page.locator('tbody tr', { hasText: 'Tachipirina Test' }).first()).toBeVisible()

    page.once('dialog', dialog => dialog.accept())
    const batchRow = page.locator('tbody tr', { hasText: 'Tachipirina Test' }).nth(1)
    await batchRow.getByRole('button', { name: 'Elimina' }).click()

    await expect(page.getByText('Confezione eliminata.')).toBeVisible()
    await expect(page.getByText('Nessuna confezione attiva disponibile.')).toBeVisible()
})
