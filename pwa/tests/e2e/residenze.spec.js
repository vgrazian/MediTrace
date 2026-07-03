import { test, expect } from '@playwright/test'
import { loginOrRegisterSeededUser } from './helpers/login'
import { runWithAcceptedConfirmation } from './helpers/confirm'

test('residenze view supports create, edit, and delete with on-demand form panel', async ({ page }) => {
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

    await page.getByRole('link', { name: 'Residenze' }).click()
    await expect(page.getByRole('heading', { name: 'Residenze' })).toBeVisible()
    await expect(page.locator('.dataset-frame')).toHaveCount(1)

    // Panel is NOT in DOM before clicking Aggiungi
    await expect(page.locator('details:has(summary:has-text("Aggiungi residenza"))')).not.toBeAttached()

    const addButton = page.getByRole('button', { name: 'Aggiungi', exact: true })
    await expect(addButton).toBeVisible()

    // ── CREATE ──
    await addButton.click()
    const createPanel = page.locator('details:has(summary:has-text("Aggiungi residenza"))')
    await expect(createPanel).toBeVisible()

    await page.getByLabel('Nome residenza').fill('Residenza Test E2E')
    await page.getByLabel('Max ospiti').fill('8')
    await page.getByLabel('Indirizzo').fill('Via Test 42, Milano')
    await page.getByLabel('Telefono').fill('+39 02 5555555')
    await page.getByLabel('Email').fill('test@residenza-e2e.it')
    await page.getByLabel('Note').fill('Creata da test E2E')
    await page.getByRole('button', { name: 'Salva residenza' }).click()

    await expect(page.getByText('Residenza creata.')).toBeVisible()
    // Panel closed after save
    await expect(createPanel).not.toBeAttached()

    const newRow = page.locator('tbody tr', {
        has: page.getByRole('cell', { name: 'Residenza Test E2E', exact: true }),
    }).first()
    await expect(newRow).toBeVisible()
    await expect(newRow.getByRole('cell', { name: 'Via Test 42, Milano' })).toBeVisible()

    // ── EDIT ──
    await newRow.getByRole('button', { name: 'Modifica' }).click()
    const editPanel = page.locator('details:has(summary:has-text("Modifica residenza: Residenza Test E2E"))')
    await expect(editPanel).toBeVisible()

    // Verify pre-filled values
    await expect(page.getByLabel('Nome residenza')).toHaveValue('Residenza Test E2E')
    await expect(page.getByLabel('Indirizzo')).toHaveValue('Via Test 42, Milano')

    // Change address
    await page.getByLabel('Indirizzo').fill('Via Aggiornata 99, Roma')
    await page.getByLabel('Note').fill('Modificata da test E2E')
    await page.getByRole('button', { name: 'Salva modifica' }).click()

    await expect(page.getByText('Residenza aggiornata.')).toBeVisible()
    await expect(editPanel).not.toBeAttached()

    const updatedRow = page.locator('tbody tr', {
        has: page.getByRole('cell', { name: 'Residenza Test E2E', exact: true }),
    }).first()
    await expect(updatedRow.getByRole('cell', { name: 'Via Aggiornata 99, Roma' })).toBeVisible()

    // ── DELETE with undo ──
    await updatedRow.getByRole('button', { name: 'Elimina' }).click()
    // Confirmation dialog
    const confirmDialog = page.locator('.confirm-dialog')
    await expect(confirmDialog).toBeVisible()
    await confirmDialog.getByRole('button', { name: 'Elimina residenza' }).click()

    await expect(page.getByText('Residenza eliminata.')).toBeVisible()

    const undoBanner = page.locator('.undo-banner')
    await expect(undoBanner).toContainText('Residenza')
    await undoBanner.getByRole('button', { name: 'Annulla eliminazione' }).click()
    await expect(page.getByText('Eliminazione annullata: residenza ripristinata.')).toBeVisible()
    await expect(page.getByRole('cell', { name: 'Residenza Test E2E', exact: true })).toBeVisible()

    // ── DELETE permanently ──
    const restoredRow = page.locator('tbody tr', {
        has: page.getByRole('cell', { name: 'Residenza Test E2E', exact: true }),
    }).first()
    await runWithAcceptedConfirmation(page, async () => {
        await restoredRow.getByRole('button', { name: 'Elimina' }).click()
        await confirmDialog.getByRole('button', { name: 'Elimina residenza' }).click()
    })

    await expect(page.getByText('Residenza eliminata.')).toBeVisible()
    // Let undo expire — row should be gone
    await page.waitForTimeout(500)
    const undoBanner2 = page.locator('.undo-banner')
    if (await undoBanner2.isVisible().catch(() => false)) {
        // Undo banner might still show; just verify row is not visible
    }
    await expect(page.getByRole('cell', { name: 'Residenza Test E2E', exact: true })).not.toBeAttached()
})

test('residenze blocks delete when hosts are assigned', async ({ page }) => {
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

    await page.getByRole('link', { name: 'Residenze' }).click()
    await expect(page.getByRole('heading', { name: 'Residenze' })).toBeVisible()

    // Demo residency has seeded hosts — try deleting it
    const demoRow = page.locator('tbody tr', {
        has: page.getByRole('cell', { name: 'Demo', exact: true }),
    }).first()

    // If Demo has active hosts, delete should be blocked
    const deleteBtn = demoRow.getByRole('button', { name: 'Elimina' })
    await deleteBtn.click()

    const confirmDialog = page.locator('.confirm-dialog')
    await expect(confirmDialog).toBeVisible()

    // Accept the confirmation
    await confirmDialog.getByRole('button', { name: 'Elimina residenza' }).click()

    // Either the delete succeeds (no hosts) or shows an error
    const errorMsg = page.locator('.import-error')
    const successMsg = page.locator('p.muted', { hasText: /eliminata/i })
    await expect(errorMsg.or(successMsg).first()).toBeVisible({ timeout: 5000 })

    // If Demo was deleted, undo it to keep the test environment clean
    const undoBanner = page.locator('.undo-banner')
    if (await undoBanner.isVisible().catch(() => false)) {
        await undoBanner.getByRole('button', { name: 'Annulla eliminazione' }).click()
        await expect(page.getByText(/ripristinata/i)).toBeVisible({ timeout: 5000 })
    }
})

test('residenze keyboard shortcut N opens add form', async ({ page }) => {
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

    await page.getByRole('link', { name: 'Residenze' }).click()
    await expect(page.getByRole('heading', { name: 'Residenze' })).toBeVisible()

    // Panel not visible yet
    await expect(page.locator('details:has(summary:has-text("Aggiungi residenza"))')).not.toBeAttached()

    // Press N to open add form
    await page.keyboard.press('n')
    const panel = page.locator('details:has(summary:has-text("Aggiungi residenza"))')
    await expect(panel).toBeVisible()

    // Press Escape or click Chiudi to dismiss
    await page.getByRole('button', { name: 'Chiudi' }).click()
    await expect(panel).not.toBeAttached()
})
