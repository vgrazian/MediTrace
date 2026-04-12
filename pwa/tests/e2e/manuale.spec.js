import { test, expect } from '@playwright/test'
import { loginOrRegisterSeededUser } from './helpers/login'

test.beforeEach(async ({ page }) => {
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
})

test('Manuale page is accessible via nav and shows all sections', async ({ page }) => {
    await page.goto('/')
    await loginOrRegisterSeededUser(page)

    await page.getByRole('link', { name: 'Manuale' }).click()
    await expect(page.getByRole('heading', { name: 'Manuale Utente' })).toBeVisible()

    // Table of contents should be present
    await expect(page.getByRole('navigation', { name: 'Indice del manuale' })).toBeVisible()

    // First section should be expanded by default (Cruscotto)
    await expect(page.getByText(/Il Cruscotto è la pagina di partenza/i)).toBeVisible()

    // Other sections should exist (buttons/headers)
    await expect(page.getByText(/Catalogo Farmaci — Guida/i)).toBeVisible()
    await expect(page.getByText(/Ospiti — Guida/i)).toBeVisible()
    await expect(page.getByText(/Terapie Attive — Guida/i)).toBeVisible()
})

test('Manuale section can be expanded and collapsed', async ({ page }) => {
    await page.goto('/')
    await loginOrRegisterSeededUser(page)

    await page.getByRole('link', { name: 'Manuale' }).click()
    await expect(page.getByRole('heading', { name: 'Manuale Utente' })).toBeVisible()

    // Click the Farmaci section toggle to expand it
    const farmaciToggle = page.getByRole('button', { name: /Catalogo Farmaci — Guida/i })
    await farmaciToggle.click()
    await expect(page.getByText(/Questa sezione contiene l'elenco di tutti i farmaci/i)).toBeVisible()

    // Click again to collapse
    await farmaciToggle.click()
    await expect(page.getByText(/Questa sezione contiene l'elenco di tutti i farmaci/i)).toBeHidden()
})

test('contextual help opens from Farmaci view and shows content', async ({ page }) => {
    await page.goto('/')
    await loginOrRegisterSeededUser(page)

    await page.getByRole('link', { name: 'Farmaci' }).click()
    await expect(page.getByRole('heading', { name: 'Catalogo Farmaci' })).toBeVisible()

    // The ? help button should be visible
    const helpBtn = page.getByRole('button', { name: 'Apri guida Farmaci' })
    await expect(helpBtn).toBeVisible()

    await helpBtn.click()

    // Help drawer should open with correct title
    await expect(page.getByRole('dialog', { name: 'Catalogo Farmaci — Guida' })).toBeVisible()
    // First section open by default
    await expect(page.getByText(/Un farmaco è la scheda generale/i)).toBeVisible()

    // Close via X button
    await page.getByRole('button', { name: 'Chiudi guida' }).click()
    await expect(page.getByRole('dialog', { name: 'Catalogo Farmaci — Guida' })).toBeHidden()
})

test('contextual help opens from Terapie view', async ({ page }) => {
    await page.goto('/')
    await loginOrRegisterSeededUser(page)

    await page.getByRole('link', { name: 'Terapie' }).click()
    await expect(page.getByRole('heading', { name: 'Terapie Attive' })).toBeVisible()

    await page.getByRole('button', { name: 'Apri guida Terapie' }).click()
    await expect(page.getByRole('dialog', { name: 'Terapie Attive — Guida' })).toBeVisible()
    await expect(page.getByText(/terapie farmacologiche in corso/i)).toBeVisible()

    // Close through explicit button for cross-browser stability
    await page.getByRole('button', { name: 'Chiudi guida' }).click()
    await expect(page.getByRole('dialog', { name: 'Terapie Attive — Guida' })).toBeHidden()
})

test('help drawer link navigates to full manual', async ({ page }) => {
    await page.goto('/')
    await loginOrRegisterSeededUser(page)

    await page.getByRole('link', { name: 'Ospiti', exact: true }).click()
    await page.getByRole('button', { name: 'Apri guida Ospiti' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()

    await page.getByRole('link', { name: /Apri manuale completo/i }).click()
    await expect(page.getByRole('heading', { name: 'Manuale Utente' })).toBeVisible()
})
