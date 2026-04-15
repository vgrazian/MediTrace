import { test, expect } from '@playwright/test'
import { loginOrRegisterSeededUser } from './helpers/login'

test.beforeEach(async ({ page }) => {
    let gistCreated = false

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
                body: JSON.stringify(gistCreated ? [{ id: 'gist-seeded-id', description: 'MediTrace — dati personali (non modificare manualmente)' }] : []),
            })
            return
        }

        if (method === 'POST' && url.endsWith('/gists')) {
            gistCreated = true
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

        await route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ message: 'not found' }) })
    })
})

test('seeded account login, sync, profile update, password change and users section are exercisable automatically', async ({ page }) => {
    await page.goto('/')
    await loginOrRegisterSeededUser(page)

    await page.getByRole('link', { name: '⚙' }).click()
    await expect(page.getByRole('heading', { name: 'Impostazioni' })).toBeVisible()
    await expect(page.locator('strong', { hasText: 'Utenti' })).toBeVisible()

    await page.getByRole('button', { name: 'Sincronizza ora' }).click()
    await expect(page.getByText(/sincronizzazione inizializzata con successo/i)).toBeVisible()

    await page.getByLabel('Sorgente').selectOption('01_CatalogoFarmaci.csv')
    await page.locator('input[type="file"][accept=".csv,text/csv"]').setInputFiles({
        name: '01_CatalogoFarmaci.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from('drug_id,principio_attivo\nDRUG-1,Paracetamolo\n'),
    })
    await page.getByRole('button', { name: 'Avvia import CSV' }).click()
    await expect(page.getByText('Accettate: 1')).toBeVisible()

    await page.getByLabel('Nome profilo', { exact: true }).fill('Mario')
    await page.getByLabel('Cognome profilo', { exact: true }).fill('Rossi')
    await page.getByLabel('Telefono profilo', { exact: true }).fill('+39 333 1234567')
    await page.getByLabel('Email profilo', { exact: true }).fill('mario.rossi+seed@example.com')
    await page.getByRole('button', { name: 'Aggiorna profilo' }).click()
    await expect(page.getByText('Profilo aggiornato con successo.')).toBeVisible()
    await expect(page.getByText('Telefono: +39 333 1234567')).toBeVisible()
    await expect(page.getByText('Email: mario.rossi+seed@example.com')).toBeVisible()

    await page.getByLabel('Password corrente').fill('Prova1234!')
    await page.getByLabel('Nuova password', { exact: true }).fill('Prova45678!')
    await page.getByLabel('Conferma nuova password').fill('Prova45678!')
    await page.getByRole('button', { name: 'Aggiorna password' }).click()
    await loginOrRegisterSeededUser(page, { password: 'Prova45678!' })

    // CI-safe: after password change, route directly through navbar to avoid hash-state race.
    const settingsHeading = page.getByRole('heading', { name: 'Impostazioni' })
    const settingsLink = page.getByRole('link', { name: '⚙' })
    if (!(await settingsLink.isVisible().catch(() => false))) {
        await loginOrRegisterSeededUser(page, { password: 'Prova45678!' })
    }
    if (await settingsLink.isVisible().catch(() => false)) {
        await settingsLink.click()
    } else {
        await page.goto('/#/impostazioni')
    }
    if (!(await settingsHeading.isVisible().catch(() => false))) {
        // Fallback: auth state may still be settling in CI, re-login and retry once.
        await loginOrRegisterSeededUser(page, { password: 'Prova45678!' })
        if (await settingsLink.isVisible().catch(() => false)) {
            await settingsLink.click()
        } else {
            await page.goto('/#/impostazioni')
        }
    }
    await expect(settingsHeading).toBeVisible({ timeout: 15000 })

    // Validate seeded user row and destructive flow guard
    await expect(page.getByText('prova (sessione attiva)')).toBeVisible()
    page.once('dialog', dialog => dialog.dismiss())
    await page.getByRole('button', { name: 'Elimina' }).first().click()

    // User is still present because deletion confirmation was dismissed
    await expect(page.getByText('prova (sessione attiva)')).toBeVisible()
})
