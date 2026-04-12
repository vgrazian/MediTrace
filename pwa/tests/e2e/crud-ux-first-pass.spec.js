import { test, expect } from '@playwright/test'
import { loginOrRegisterSeededUser } from './helpers/login'

async function mockGithubUser(page) {
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
}

test('farmaci uses filter bar and custom confirmation modal for delete', async ({ page }) => {
    await mockGithubUser(page)

    await page.goto('/')
    await loginOrRegisterSeededUser(page)

    await page.getByRole('link', { name: 'Farmaci' }).click()
    await expect(page.getByRole('heading', { name: 'Catalogo Farmaci' })).toBeVisible()

    await page.locator('summary', { hasText: 'Gestisci Farmaci' }).click()

    const drugName = 'Farmaco UX E2E'
    await page.getByLabel('Nome farmaco').fill(drugName)
    await page.getByLabel('Principio attivo').fill('Principio UX E2E')
    await page.getByRole('button', { name: 'Salva farmaco' }).click()
    await expect(page.getByRole('cell', { name: drugName, exact: true })).toBeVisible()

    const filterInput = page.locator('.crud-filter-bar input[type="search"]')
    await filterInput.fill('nessuna-corrispondenza-xyz')
    await expect(page.getByText('Nessun farmaco disponibile.')).toBeVisible()

    await filterInput.fill('Farmaco UX E2E')
    await expect(page.getByRole('cell', { name: drugName, exact: true })).toBeVisible()

    await page.getByLabel(`Seleziona farmaco ${drugName}`).check()
    await page.locator('.card', { hasText: 'Farmaci registrati' }).getByRole('button', { name: 'Elimina (1)' }).click()

    const confirmDialog = page.locator('.confirm-dialog')
    await expect(confirmDialog).toBeVisible()
    await expect(confirmDialog).toContainText('Conferma eliminazione')

    await confirmDialog.getByRole('button', { name: 'Annulla' }).click()
    await expect(page.getByRole('cell', { name: drugName, exact: true })).toBeVisible()

    await page.locator('.card', { hasText: 'Farmaci registrati' }).getByRole('button', { name: 'Elimina (1)' }).click()
    await page.locator('.confirm-dialog').getByRole('button', { name: 'Elimina' }).click()
    await expect(page.getByText('Farmaco eliminato.')).toBeVisible()
})

test('unsaved changes guard blocks accidental navigation and supports leave', async ({ page }) => {
    await mockGithubUser(page)

    await page.goto('/')
    await loginOrRegisterSeededUser(page)

    await page.getByRole('link', { name: 'Terapie' }).click()
    await expect(page.getByRole('heading', { name: 'Terapie Attive' })).toBeVisible()

    await page.getByRole('button', { name: 'Aggiungi' }).click()
    await page.getByLabel('Note').fill('bozza non salvata e2e')

    await page.getByRole('link', { name: 'Cruscotto' }).click()

    const confirmDialog = page.locator('.confirm-dialog')
    await expect(confirmDialog).toBeVisible()
    await expect(confirmDialog).toContainText('Modifiche non salvate')

    await confirmDialog.getByRole('button', { name: 'Resta nella pagina' }).click()
    await expect(page.getByRole('heading', { name: 'Terapie Attive' })).toBeVisible()

    await page.getByRole('link', { name: 'Cruscotto' }).click()
    await page.locator('.confirm-dialog').getByRole('button', { name: 'Esci senza salvare' }).click()

    await expect(page.getByRole('heading', { name: 'Cruscotto MediTrace' })).toBeVisible()
})
