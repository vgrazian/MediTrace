import { test, expect } from '@playwright/test'
import { loginOrRegisterSeededUser } from './helpers/login'

test('stanze view supports creating a room', async ({ page }) => {
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

    // Navigate to Stanze view
    await page.getByRole('link', { name: 'Stanze', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Stanze e Letti' })).toBeVisible()

    // Open Gestione panel for room creation
    const details = page.locator('details:has(summary:has-text("Gestione Stanze e Letti"))')
    await expect(details).toBeVisible({ timeout: 5000 })
    await details.locator('summary').click()
    await page.waitForTimeout(500)

    // Create a new room
    await page.getByLabel('ID stanza').fill('TEST_ROOM_E2E')
    await page.getByLabel('Codice').fill('E2E Test Room')
    const noteInputs = page.getByLabel('Note')
    await noteInputs.first().fill('Created via E2E test')
    const saveButton = page.getByRole('button', { name: /Salva stanza/ })
    await expect(saveButton).toBeEnabled({ timeout: 5000 })
    await saveButton.click()

    // Verify success message
    await expect(page.getByText(/Stanza.*creata/i)).toBeVisible({ timeout: 5000 })

    // Verify the new room appears in the list
    await expect(page.getByRole('cell', { name: 'TEST_ROOM_E2E' })).toBeVisible({ timeout: 5000 })
    await expect(page.getByRole('cell', { name: 'E2E Test Room' })).toBeVisible()
})

test('stanze view supports creating beds in a room', async ({ page }) => {
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

    await page.getByRole('link', { name: 'Stanze', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Stanze e Letti' })).toBeVisible()

    // Open Gestione panel
    const details = page.locator('details:has(summary:has-text("Gestione Stanze e Letti"))')
    await details.locator('summary').click()
    await page.waitForTimeout(500)

    // First, create a test room
    await page.getByLabel('ID stanza').fill('TEST_ROOM_BEDS')
    await page.getByLabel('Codice').fill('Beds Test')
    const noteInputs = page.getByLabel('Note')
    await noteInputs.first().fill('For bed testing')
    await page.getByRole('button', { name: /Salva stanza/ }).click()

    await expect(page.getByText(/Stanza.*creata/i)).toBeVisible({ timeout: 5000 })
    await page.waitForTimeout(700)

    // Now create a bed in the room
    const roomSelect = page.locator('select').first()
    await expect(roomSelect).toBeEnabled({ timeout: 5000 })
    await roomSelect.selectOption('TEST_ROOM_BEDS')
    await page.getByLabel('Numero letto').fill('1')
    const bedsNoteInputs = page.getByLabel('Note')
    await bedsNoteInputs.last().fill('Test bed 1')
    
    const saveBedButton = page.getByRole('button', { name: /Salva letto/ })
    await expect(saveBedButton).toBeEnabled({ timeout: 5000 })
    await saveBedButton.click()

    // Verify success message
    await expect(page.getByText(/Letto.*creato/i)).toBeVisible({ timeout: 5000 })
})

test('stanze view deactivates rooms correctly', async ({ page }) => {
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

    await page.getByRole('link', { name: 'Stanze', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Stanze e Letti' })).toBeVisible()

    // Open Gestione panel to create room
    const details = page.locator('details:has(summary:has-text("Gestione Stanze e Letti"))')
    await details.locator('summary').click()
    await page.waitForTimeout(500)

    // Create a test room
    await page.getByLabel('ID stanza').fill('ROOM_TO_DEACTIVATE')
    await page.getByLabel('Codice').fill('Deactivate Test')
    const noteInputs = page.getByLabel('Note')
    await noteInputs.first().fill('This room will be deactivated')
    await page.getByRole('button', { name: /Salva stanza/ }).click()

    await expect(page.getByText(/Stanza.*creata/i)).toBeVisible({ timeout: 5000 })
    await expect(page.getByRole('cell', { name: 'ROOM_TO_DEACTIVATE' })).toBeVisible({ timeout: 5000 })

    // Test deactivation
    page.once('dialog', dialog => dialog.accept())
    const disactivateButton = page.getByRole('button', { name: 'Disattiva' }).first()
    await disactivateButton.click()

    // Verify success message
    await expect(page.getByText(/Stanza disattivata/i)).toBeVisible({ timeout: 5000 })

    // Verify deactivated room is no longer visible (filter off by default)
    await page.waitForTimeout(300)
    await expect(page.getByRole('cell', { name: 'ROOM_TO_DEACTIVATE' })).not.toBeVisible({ timeout: 2000 })
})
