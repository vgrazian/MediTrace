import { test, expect } from '@playwright/test'

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

    if (await page.locator('#username-input').isVisible()) {
        await page.locator('#username-input').fill('prova')
        await page.locator('#password-input').fill('Prova123!')
        await page.getByRole('button', { name: 'Accedi' }).click()
    } else {
        await page.locator('#reg-username').fill('prova')
        await page.locator('#reg-password').fill('Prova123!')
        await page.locator('#reg-confirm-password').fill('Prova123!')
        await page.locator('#reg-gh-token').fill('github_pat_seeded')
        await page.getByRole('button', { name: 'Crea account e accedi' }).click()
    }

    await expect(page.getByText('Home')).toBeVisible()

    await page.getByRole('link', { name: 'Farmaci' }).click()
    await expect(page.getByRole('heading', { name: 'Catalogo Farmaci' })).toBeVisible()

    await page.getByLabel('Principio attivo').fill('Paracetamolo Test')
    await page.getByLabel('Classe terapeutica').fill('Analgesici')
    await page.getByLabel('Scorta minima').fill('10')
    await page.getByRole('button', { name: 'Salva farmaco' }).click()

    await expect(page.getByText('Farmaco salvato.')).toBeVisible()
    await expect(page.getByRole('cell', { name: 'Paracetamolo Test' })).toBeVisible()

    await page.locator('select').first().selectOption({ label: 'Paracetamolo Test' })
    await page.getByLabel('Nome commerciale').fill('Tachipirina Test')
    await page.getByLabel('Dosaggio').fill('500mg')
    await page.getByLabel("Quantita' attuale").fill('12')
    await page.getByLabel('Soglia riordino').fill('4')
    await page.getByRole('button', { name: 'Salva confezione' }).click()

    await expect(page.getByText('Confezione salvata.')).toBeVisible()
    await expect(page.getByRole('cell', { name: 'Tachipirina Test' })).toBeVisible()

    page.once('dialog', dialog => dialog.accept())
    await page.getByRole('button', { name: 'Disattiva' }).first().click()

    await expect(page.getByText('Confezione disattivata.')).toBeVisible()
    await expect(page.getByText('Nessuna confezione attiva disponibile.')).toBeVisible()
})
