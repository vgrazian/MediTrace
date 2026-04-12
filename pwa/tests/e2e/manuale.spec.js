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

    const farmaciView = page.locator('.view').filter({ has: page.getByRole('heading', { name: 'Catalogo Farmaci' }) }).first()
    const helpBtn = farmaciView.getByRole('button', { name: 'Aiuto' })
    await expect(helpBtn).toBeVisible()

    await helpBtn.click()

    await expect(page).toHaveURL(/\/manuale#farmaci$/)
    await expect(page.getByRole('heading', { name: 'Manuale Utente' })).toBeVisible()
    await expect(page.locator('#farmaci')).toBeVisible()
})

test('contextual help opens from Terapie view', async ({ page }) => {
    await page.goto('/')
    await loginOrRegisterSeededUser(page)

    await page.getByRole('link', { name: 'Terapie' }).click()
    await expect(page.getByRole('heading', { name: 'Terapie Attive' })).toBeVisible()

    const terapieView = page.locator('.view').filter({ has: page.getByRole('heading', { name: 'Terapie Attive' }) }).first()
    await terapieView.getByRole('button', { name: 'Aiuto' }).click()
    await expect(page).toHaveURL(/\/manuale#terapie$/)
    await expect(page.getByRole('heading', { name: 'Manuale Utente' })).toBeVisible()
    await expect(page.locator('#terapie')).toBeVisible()
})

test('help drawer link navigates to full manual', async ({ page }) => {
    await page.goto('/')
    await loginOrRegisterSeededUser(page)

    await page.getByRole('link', { name: 'Ospiti', exact: true }).click()
    const ospitiView = page.locator('.view').filter({ has: page.getByRole('heading', { name: 'Ospiti' }) }).first()
    await ospitiView.getByRole('button', { name: 'Aiuto' }).click()
    await expect(page).toHaveURL(/\/manuale#ospiti$/)
    await expect(page.getByRole('heading', { name: 'Manuale Utente' })).toBeVisible()
})
