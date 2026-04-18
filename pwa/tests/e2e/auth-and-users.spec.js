

test('admin promuove operatore e verifica permessi fasce orarie', async ({ page }) => {
<<<<<<< HEAD
    // Aumenta timeout per diagnostica
    test.setTimeout(60000)
    console.log('INIZIO TEST: admin promuove operatore')
    // Login come admin
    await page.goto('/')
    console.log('Navigato alla pagina principale...')
=======
    // Login come admin
    await page.goto('/')
>>>>>>> e43e62c (fix(e2e): robust selectors and admin-only time slot config section; all E2E tests green)
    await loginOrRegisterSeededUser(page)
    await page.getByRole('link', { name: '⚙' }).click()
    await expect(page.getByRole('heading', { name: 'Impostazioni' })).toBeVisible()

    // Crea nuovo operatore (seleziona solo nel form di creazione utente)
    const creaUtenteForm = page.getByText('Crea nuovo utente').locator('..').locator('..')
    await creaUtenteForm.getByLabel('Nome').first().fill('Operatore')
    await creaUtenteForm.getByLabel('Cognome').first().fill('Test')
    await creaUtenteForm.getByLabel('Username suggerito').fill('operatore1')
    await creaUtenteForm.getByLabel('Email').fill('operatore1@example.com')
    await creaUtenteForm.getByLabel('Password iniziale').fill('Test12345!')
    await creaUtenteForm.getByLabel('Ruolo').selectOption('operator')
    await creaUtenteForm.getByRole('button', { name: 'Crea utente' }).click()
    await expect(page.getByText('Utente operatore1 creato.')).toBeVisible()

    // Promuovi a admin
    const opRow = page.locator('table.conflict-table tbody tr').filter({ hasText: 'operatore1' }).first()
    await opRow.locator('input[type="checkbox"]').check()
<<<<<<< HEAD
    console.log('Promosso a admin, attendo update...')
=======
>>>>>>> e43e62c (fix(e2e): robust selectors and admin-only time slot config section; all E2E tests green)
    await expect(opRow.locator('input[type="checkbox"]')).toBeChecked()

    // Degrada a operatore
    await opRow.locator('input[type="checkbox"]').uncheck()
<<<<<<< HEAD
    console.log('Degradato a operatore, attendo update...')
    await expect(opRow.locator('input[type="checkbox"]')).not.toBeChecked()

    // Logout admin

    await page.getByRole('button', { name: 'Esci' }).click()
    console.log('Logout admin, clear storage e goto / ...')
    await page.context().clearCookies()
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); })
    await page.goto('/')
    await expect(page.getByRole('textbox', { name: 'Username accesso' })).toBeVisible()
    // Login come operatore
    await page.getByRole('textbox', { name: 'Username accesso' }).fill('operatore1')
=======
    await expect(opRow.locator('input[type="checkbox"]')).not.toBeChecked()

    // Logout admin
    await page.getByRole('button', { name: 'Esci' }).click()

    // Login come operatore
    await page.getByLabel('Username').fill('operatore1')
>>>>>>> e43e62c (fix(e2e): robust selectors and admin-only time slot config section; all E2E tests green)
    await page.getByLabel('Password').fill('Test12345!')
    await page.getByRole('button', { name: /Accedi/i }).click()
    await page.getByRole('link', { name: '⚙' }).click()
    await expect(page.getByRole('heading', { name: 'Impostazioni' })).toBeVisible()
<<<<<<< HEAD
    console.log('Login operatore riuscito, controllo permessi...')

    // Verifica che NON possa modificare fasce orarie
    await expect(page.getByText(/Fasce orarie/)).toHaveCount(0)
    console.log('Verifica permessi operatore OK')

    // Logout operatore
    await page.getByRole('button', { name: 'Esci' }).click()
    console.log('Logout operatore, login admin...')

    // Login come admin
    await loginOrRegisterSeededUser(page)
    console.log('Login admin riuscito, controllo permessi...')
    await page.getByRole('link', { name: '⚙' }).click()
    await expect(page.getByRole('heading', { name: /Impostazioni/ })).toBeVisible()
    await expect(page.getByText('Fasce orarie configurabili')).toBeVisible()
    console.log('Verifica permessi admin OK, FINE TEST')
=======

    // Verifica che NON possa modificare fasce orarie
    await expect(page.getByText(/Fasce orarie/)).toHaveCount(0)

    // Logout operatore
    await page.getByRole('button', { name: 'Esci' }).click()

    // Login come admin
    await loginOrRegisterSeededUser(page)
    await page.getByRole('link', { name: '⚙' }).click()
    await expect(page.getByRole('heading', { name: /Impostazioni/ })).toBeVisible()
    await expect(page.getByText('Fasce orarie configurabili')).toBeVisible()
>>>>>>> e43e62c (fix(e2e): robust selectors and admin-only time slot config section; all E2E tests green)
})
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
    await page.getByLabel('Username accesso', { exact: true }).fill('prova')
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

    // Validate seeded user row and guard on current session user actions
    const currentUserRow = page.locator('table.conflict-table tbody tr').filter({ hasText: 'prova (sessione attiva)' }).first()
    await expect(currentUserRow).toBeVisible()
    await expect(currentUserRow.getByRole('button', { name: 'Elimina' })).toHaveCount(0)
})
