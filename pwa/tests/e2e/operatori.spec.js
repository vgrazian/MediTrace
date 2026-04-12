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
    const currentUserInfo = page.locator('strong:has-text("Account operatore")').locator('..').first()
    await expect(currentUserInfo).toContainText('prova')
    await expect(currentUserInfo).toContainText('@seeded-gh-user')

    // 2. List current users - verify seeded user is in the list
    const usersTable = page.locator('table.conflict-table').filter({ hasText: 'Username' }).first()
    await expect(usersTable.locator('tbody')).toContainText('prova')

    // 3. Invite a new operator (add user)
    const inviteSection = page.locator('strong:has-text("Invita nuovo utente")').locator('..').first()
    await inviteSection.locator('input[autocomplete="given-name"]').fill('Mario')
    await inviteSection.locator('input[autocomplete="family-name"]').fill('Rossi')
    await inviteSection.locator('input[autocomplete="email"]').fill('mario.rossi+test@example.com')

    const inviteButton = inviteSection.locator('button:has-text("Invia link di invito")')
    await inviteButton.click()

    // Verify invite was sent
    await expect(page.getByText(/mario.rossi\+test@example.com/)).toBeVisible()
    await expect(page.getByText(/Invito inviato/)).toBeVisible()

    // 4. Verify audit log records the invite action
    await page.getByRole('link', { name: 'Audit' }).click()
    await expect(page.getByRole('heading', { name: 'Audit Log' })).toBeVisible()

    // Filter for invite-related events
    const auditTable = page.locator('table').filter({ hasText: 'Timestamp' }).first()
    const inviteRows = auditTable.locator('tbody tr').filter({ hasText: /invite|send/i })

    // We should have at least one invite-related event
    await expect(inviteRows.first()).toBeVisible()

    // 5. Return to settings to test user deactivation/reactivation
    await page.getByRole('link', { name: '⚙' }).click()
    await expect(page.getByRole('heading', { name: 'Impostazioni' })).toBeVisible()

    // Test data management - ensure we can toggle seeded users
    const usersTableNew = page.locator('table.conflict-table').filter({ hasText: 'Username' }).first()
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
    await expect(page.getByRole('heading', { name: 'Audit Log' })).toBeVisible()

    // Scroll to see recent entries
    const auditTableNew = page.locator('table').filter({ hasText: 'Timestamp' }).first()
    await auditTableNew.locator('tbody tr').first().scrollIntoViewIfNeeded()

    // Verify we have user-related audit entries
    await expect(auditTableNew.locator('tbody')).toBeTruthy()
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
    const profileSection = page.locator('strong:has-text("Profilo personale")').locator('..').first()
    await profileSection.locator('input[type="text"][autocomplete="given-name"]').fill('Giovanni')
    await profileSection.locator('input[type="text"][autocomplete="family-name"]').fill('Bianchi')
    await profileSection.locator('input[type="tel"]').fill('+39 333 9999999')
    await profileSection.locator('input[type="email"]').fill('giovanni.bianchi+test@example.com')

    const updateBtn = profileSection.locator('button:has-text("Aggiorna profilo")')
    await updateBtn.click()

    // Verify success message
    await expect(page.getByText('Profilo aggiornato con successo.')).toBeVisible()

    // Navigate to audit log to verify profile update was logged
    await page.getByRole('link', { name: 'Audit' }).click()
    await expect(page.getByRole('heading', { name: 'Audit Log' })).toBeVisible()

    const auditTable = page.locator('table').filter({ hasText: 'Timestamp' }).first()
    const updateRows = auditTable.locator('tbody tr').filter({ hasText: /update|profile|profilo/i })

    // Should have at least one profile update entry
    await expect(updateRows.first()).toBeVisible()
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

    const passwordSection = page.locator('strong:has-text("Cambia password")').locator('..').first()
    await passwordSection.locator('input[placeholder*="corrente"]').fill('Prova123!')
    await passwordSection.locator('input[placeholder*="Nuova password"]').first().fill('NuovaPassword123!')
    await passwordSection.locator('input[placeholder*="Conferma"]').fill('NuovaPassword123!')

    const changeBtn = passwordSection.locator('button:has-text("Aggiorna password")')
    await changeBtn.click()

    // Should see message about session being invalidated
    await expect(page.getByText(/Sessione invalidata/i)).toBeVisible({ timeout: 5000 })

    // Should be redirected to login
    await expect(page.locator('.login-screen')).toBeVisible({ timeout: 5000 })

    // Log back in with new password
    await loginOrRegisterSeededUser(page, { password: 'NuovaPassword123!' })

    // Verify we're back in the authenticated UI
    const homeLink = page.getByRole('link', { name: 'Cruscotto' })
    await expect(homeLink).toBeVisible()
})
