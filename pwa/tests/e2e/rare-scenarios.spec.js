import { test, expect } from '@playwright/test'
import { loginOrRegisterSeededUser } from './helpers/login'

async function mockGithubApis(page) {
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

    await page.route('https://api.github.com/gists*', async route => {
        const req = route.request()
        const method = req.method()
        const url = req.url()

        if (method === 'GET' && url.includes('/gists?')) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([{ id: 'gist-seeded-id', description: 'MediTrace — dati personali (non modificare manualmente)' }]),
            })
            return
        }

        if (method === 'POST' && url.endsWith('/gists')) {
            const payload = JSON.parse(req.postData() || '{}')
            const files = payload.files || {}
            await route.fulfill({
                status: 201,
                contentType: 'application/json',
                body: JSON.stringify({
                    id: 'gist-seeded-id',
                    updated_at: new Date().toISOString(),
                    files: Object.fromEntries(
                        Object.entries(files).map(([name, value]) => [name, { filename: name, content: value.content || '{}' }]),
                    ),
                }),
            })
            return
        }

        if (method === 'PATCH' && url.includes('/gists/')) {
            const payload = JSON.parse(req.postData() || '{}')
            const files = payload.files || {}
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    id: 'gist-seeded-id',
                    updated_at: new Date().toISOString(),
                    files: Object.fromEntries(
                        Object.entries(files).map(([name, value]) => [name, { filename: name, content: value.content || '{}' }]),
                    ),
                }),
            })
            return
        }

        await route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ message: 'not found' }) })
    })
}

test('manual route remains stable with unknown section hash', async ({ page }) => {
    await mockGithubApis(page)

    await page.goto('/')
    await loginOrRegisterSeededUser(page)

    await page.goto('/#/manuale#sezione-inesistente')

    await expect(page.getByRole('heading', { name: 'Manuale Utente' })).toBeVisible()
    await expect(page.getByRole('navigation', { name: 'Indice del manuale' })).toBeVisible()
    await expect(page.locator('.manuale-section').first()).toBeVisible()
})

test('invite button stays disabled with partial data and enables only when complete', async ({ page }) => {
    await mockGithubApis(page)

    await page.goto('/')
    await loginOrRegisterSeededUser(page)

    await page.getByRole('link', { name: '⚙' }).click()
    await expect(page.getByRole('heading', { name: 'Impostazioni' })).toBeVisible()

    const inviteSection = page.locator('div.card').filter({ has: page.locator('strong', { hasText: 'Invita nuovo utente via email' }) }).first()
    const inviteButton = inviteSection.getByRole('button', { name: 'Invia link di invito' })

    await expect(inviteButton).toBeDisabled()

    await inviteSection.locator('input[autocomplete="given-name"]').fill('Elena')
    await expect(inviteButton).toBeDisabled()

    await inviteSection.locator('input[autocomplete="email"]').fill('elena.rossi@example.com')
    await expect(inviteButton).toBeDisabled()

    await inviteSection.locator('input[autocomplete="family-name"]').fill('Rossi')
    await expect(inviteButton).toBeEnabled()
})
