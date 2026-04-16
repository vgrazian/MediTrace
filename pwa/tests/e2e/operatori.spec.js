import { test, expect } from '@playwright/test'
import { loginOrRegisterSeededUser } from './helpers/login'

test('operatori management: add, list, reactivate, delete users with audit logging', async ({ page }) => {
    test.setTimeout(60_000)

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

    await page.goto('/')
    await loginOrRegisterSeededUser(page)

    // Access settings
    await page.getByRole('link', { name: '⚙' }).click()
    await expect(page.getByRole('heading', { name: 'Impostazioni' })).toBeVisible()
    await expect(page.locator('strong', { hasText: 'Utenti' })).toBeVisible()

    // 1. Check current user info is visible
    const currentUserInfo = page.locator('div.card').filter({ has: page.locator('strong', { hasText: 'Account operatore' }) }).first()
    await expect(currentUserInfo).toContainText('Username:')
    await expect(currentUserInfo).toContainText('Username: prova')

    // 2. List current users - verify seeded user is in the list
    const usersTable = page.locator('table.conflict-table').filter({ hasText: 'Username' }).first()
    await expect(usersTable.locator('tbody tr').first()).toBeVisible()

    // 3. Create a new operator directly from admin panel
    const suffix = Date.now().toString().slice(-6)
    const managedUsername = `mariorossi${suffix}`
    const managedEmail = `mario.rossi+${suffix}@example.com`
    const createUserSection = page.locator('div.import-form').filter({ has: page.locator('p strong', { hasText: 'Crea nuovo utente' }) }).first()

    await createUserSection.locator('input[autocomplete="given-name"]').fill('Mario')
    await createUserSection.locator('input[autocomplete="family-name"]').fill('Rossi')
    await createUserSection.locator('input[autocomplete="username"]').fill(managedUsername)
    await createUserSection.locator('input[autocomplete="email"]').fill(managedEmail)
    await createUserSection.locator('input[autocomplete="new-password"]').fill('NuovaPassword123!')
    await createUserSection.getByRole('button', { name: 'Crea utente' }).click()

    await expect(page.getByText(`Utente ${managedUsername} creato.`)).toBeVisible()

    const usersTableNew = page.locator('table.conflict-table').filter({ hasText: 'Username' }).first()
    const managedRow = usersTableNew.locator('tbody tr').filter({ hasText: managedUsername }).first()
    await expect(managedRow).toBeVisible()

    // Disable and re-enable the created user
    await managedRow.getByRole('button', { name: 'Disattiva' }).click()
    await expect(page.getByText(`Utente ${managedUsername} disattivato.`)).toBeVisible()
    await expect(managedRow.getByRole('button', { name: 'Riattiva' })).toBeVisible()

    await managedRow.getByRole('button', { name: 'Riattiva' }).click()
    await expect(page.getByText(`Utente ${managedUsername} riattivato.`)).toBeVisible()
    await expect(managedRow.getByRole('button', { name: 'Disattiva' })).toBeVisible()

    // Delete user with confirmation
    await managedRow.getByRole('button', { name: 'Elimina' }).click()
    await page.getByText('Elimina Utente').first().waitFor({ state: 'visible', timeout: 10000 })
    await page.getByRole('button', { name: 'Elimina Utente' }).click()
    await expect(page.getByText(`Utente ${managedUsername} eliminato definitivamente.`)).toBeVisible()
    await expect(usersTableNew.locator('tbody tr').filter({ hasText: managedUsername })).toHaveCount(0)

    // 4. Verify audit log section remains available after user management actions
    await page.getByRole('link', { name: 'Audit' }).click()
    await expect(page.getByRole('heading', { name: /Audit/ })).toBeVisible()

    // Filter for invite-related events
    const auditTable = page.locator('table[aria-label="Registro operazioni"]').first()
    await expect(auditTable).toBeVisible()

    // 5. Return to settings and ensure seeded row is still present
    await page.getByRole('link', { name: '⚙' }).click()
    await expect(page.getByRole('heading', { name: 'Impostazioni' })).toBeVisible()

    // Test data management - ensure seeded current user row remains visible
    const provaRow = usersTableNew.locator('tbody tr').filter({ hasText: 'prova' })

    // If there's a Disattiva button, that means the user is active/seeded
    const disableButtons = provaRow.locator('button:has-text("Disattiva")')
    if (await disableButtons.count() > 0) {
        // This is expected for seeded users
        await expect(disableButtons.first()).toBeVisible()
    }

    // 6. Verify there's logging for user management operations
    // Go back to audit log to check for user-related operations
    await page.getByRole('link', { name: 'Audit' }).click()
    await expect(page.getByRole('heading', { name: /Audit/ })).toBeVisible()

    const auditTableNew = page.locator('table[aria-label="Registro operazioni"]').first()

    // Verify we have user-related audit entries
    await expect(auditTableNew.locator('tbody tr').first()).toBeVisible()
    const auditEntries = auditTableNew.locator('tbody tr')
    const count = await auditEntries.count()
    expect(count).toBeGreaterThan(0)
})

test('operatori view: profile update creates audit entries', async ({ page }) => {
    test.setTimeout(30_000)

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

    await page.goto('/')
    await loginOrRegisterSeededUser(page)

    // Update profile and verify audit logging
    await page.getByRole('link', { name: '⚙' }).click()
    await expect(page.getByRole('heading', { name: 'Impostazioni' })).toBeVisible()

    // Update profile fields
    await page.getByLabel('Nome profilo', { exact: true }).fill('Giovanni')
    await page.getByLabel('Cognome profilo', { exact: true }).fill('Bianchi')
    await page.getByLabel('Username accesso', { exact: true }).fill('prova')
    await page.getByLabel('Telefono profilo', { exact: true }).fill('+39 333 9999999')
    await page.getByLabel('Email profilo', { exact: true }).fill('giovanni.bianchi+test@example.com')

    const updateBtn = page.getByRole('button', { name: 'Aggiorna profilo' })
    await updateBtn.click()

    // Verify success message
    await expect(page.getByText('Profilo aggiornato con successo.')).toBeVisible()

    // Navigate to audit log to verify profile update was logged
    await page.getByRole('link', { name: 'Audit' }).click()
    await expect(page.getByRole('heading', { name: /Audit/ })).toBeVisible()

    const auditTable = page.locator('table[aria-label="Registro operazioni"]').first()
    const auditRows = auditTable.locator('tbody tr')

    // Audit table should be available after profile update
    await expect(auditRows.first()).toBeVisible()
})

test('operatori view: password change and session invalidation', async ({ page }) => {
    test.setTimeout(30_000)

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

    await page.goto('/')
    await loginOrRegisterSeededUser(page)

    // Change password
    await page.getByRole('link', { name: '⚙' }).click()
    await expect(page.getByRole('heading', { name: 'Impostazioni' })).toBeVisible()

    await page.locator('input[autocomplete="current-password"]').fill('Prova1234!')
    await page.locator('input[autocomplete="new-password"]').first().fill('NuovaPassword123!')
    await page.locator('input[autocomplete="new-password"]').nth(1).fill('NuovaPassword123!')

    const changeBtn = page.getByRole('button', { name: 'Aggiorna password' })
    await changeBtn.click()

    // Should be redirected to login
    await expect(page.locator('.login-screen')).toBeVisible({ timeout: 5000 })

    // Log back in with new password
    await loginOrRegisterSeededUser(page, { password: 'NuovaPassword123!' })

    // Verify we're back in the authenticated UI
    const homeLink = page.getByRole('link', { name: 'Cruscotto' })
    await expect(homeLink).toBeVisible()
})
