/**
 * Multi-User & Session Persistence E2E Tests
 *
 * Tests data sharing between users and data survival across logout/login cycles.
 * All tests use the same browser context (shared IndexedDB).
 */
import { test, expect } from '@playwright/test'
import { login, logout, goToView, generateDemoData } from './auth.helper.js'

test.setTimeout(60_000)

async function createHost(page, nome, cognome) {
  await page.locator('button:has-text("Aggiungi")').first().click()
  await page.waitForSelector('details.add-panel[open]', { timeout: 10_000 })
  await page.waitForTimeout(600)
  await page.locator('#input-nome').fill(nome)
  await page.locator('#input-cognome').fill(cognome)
  const s = page.locator('details.add-panel[open] select').first()
  if (await s.locator('option').count() > 1) await s.selectOption({ index: 1 })
  await page.locator('button:has-text("Salva ospite")').click()
  await page.waitForTimeout(2000)
}

// ── Seed once ──────────────────────────────────────────────────────────────

test.beforeAll(async ({ browser }) => {
  const page = await browser.newPage()
  await login(page, 'admin')
  await generateDemoData(page)
  await page.close()
})

// ── Multi-User Sync ────────────────────────────────────────────────────────

test('User A host visible to User B after logout/login', async ({ page }) => {
  await login(page, 'valerio'); await goToView(page, 'ospiti')
  await createHost(page, 'Giorgio', 'Verdi')
  await expect(page.getByText('Giorgio Verdi').first()).toBeVisible()
  await logout(page)

  await login(page, 'anna'); await goToView(page, 'ospiti')
  await expect(page.getByText('Giorgio Verdi').first()).toBeVisible()
})

test('User A drug+batch visible to User B after logout/login', async ({ page }) => {
  await login(page, 'valerio'); await goToView(page, 'farmaci')
  // Drug
  await page.locator('button:has-text("Aggiungi")').first().click()
  await page.waitForTimeout(800)
  await page.getByPlaceholder('Tachipirina').first().fill('SyncDrug')
  await page.getByPlaceholder('Paracetamolo').first().fill('SyncPrinciple')
  await page.locator('button:has-text("Salva farmaco")').first().click()
  await page.waitForTimeout(2500)
  // Verify drug appears
  await expect(page.getByText('SyncDrug').first()).toBeVisible({ timeout: 5000 })
  await logout(page)

  await login(page, 'anna'); await goToView(page, 'farmaci')
  await expect(page.getByText('SyncDrug').first()).toBeVisible({ timeout: 5000 })
})

// ── Session Persistence (logout+login = same effect as browser restart) ────

test('host survives logout and re-login', async ({ page }) => {
  await login(page, 'valerio'); await goToView(page, 'ospiti')
  await createHost(page, 'Persist', 'DB')
  await expect(page.getByText('Persist DB').first()).toBeVisible()
  await logout(page)

  // Re-login as same user — data should persist
  await login(page, 'valerio'); await goToView(page, 'ospiti')
  await expect(page.getByText('Persist DB').first()).toBeVisible({ timeout: 5000 })
})

test('demo data survives logout and re-login', async ({ page }) => {
  await login(page, 'admin'); await goToView(page, 'farmaci')
  const cnt = await page.locator('tbody tr').count()
  expect(cnt).toBeGreaterThan(0)
  await logout(page)

  await login(page, 'admin'); await goToView(page, 'farmaci')
  expect(await page.locator('tbody tr').count()).toBeGreaterThanOrEqual(cnt)
})

// ── User Editing across sessions ───────────────────────────────────────────

test('host edit visible after logout and re-login', async ({ page }) => {
  await login(page, 'valerio'); await goToView(page, 'ospiti')
  await createHost(page, 'EdT', 'Sess')
  const row = page.locator('tr', { hasText: 'EdT' }).first()
  await row.locator('input[type="checkbox"]').check()
  await page.locator('button:has-text("Modifica")').first().click()
  await page.waitForTimeout(800)
  await page.locator('#input-nome').clear()
  await page.locator('#input-nome').fill('Edited')
  await page.locator('button:has-text("Salva modifica")').first().click()
  await page.waitForTimeout(1500)
  await expect(page.getByText('Edited Sess').first()).toBeVisible()
  await logout(page)

  await login(page, 'valerio'); await goToView(page, 'ospiti')
  await expect(page.getByText('Edited Sess').first()).toBeVisible({ timeout: 5000 })
})

test('host deletion persists after logout and re-login', async ({ page }) => {
  await login(page, 'valerio'); await goToView(page, 'ospiti')
  await createHost(page, 'DelT', 'Sess')
  await expect(page.getByText('DelT Sess').first()).toBeVisible()
  const row = page.locator('tr', { hasText: 'DelT' }).first()
  await row.locator('input[type="checkbox"]').check()
  await page.locator('button:has-text("Elimina")').first().click()
  await page.waitForTimeout(800)
  // Confirm deletion — the dialog button says "Elimina Ospite"
  const confirmBtn = page.locator('.confirm-dialog button:has-text("Elimina")').first()
  if (await confirmBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await confirmBtn.click()
    await page.waitForTimeout(1500)
  }
  await logout(page)

  await login(page, 'valerio'); await goToView(page, 'ospiti')
  await expect(page.getByText('DelT Sess').first()).not.toBeVisible({ timeout: 5000 })
})

// ── Saltato → Eseguito flow ───────────────────────────────────────────────

test('Saltato then Eseguito works without error', async ({ page }) => {
  await login(page, 'admin')
  await goToView(page, 'promemoria')

  // Show all reminders
  try { await page.locator('select').first().selectOption('all'); await page.waitForTimeout(1000) } catch { }

  // Find a DA_ESEGUIRE reminder with action buttons
  const rows = page.locator('tr')
  const count = await rows.count()
  let found = false

  for (let i = 1; i < count; i++) {
    const row = rows.nth(i)
    const saltatoBtn = row.locator('button:has-text("Saltato")').first()
    if (await saltatoBtn.isVisible({ timeout: 500 }).catch(() => false)) {
      // Click Saltato
      await saltatoBtn.click()
      await page.waitForTimeout(1000)

      // Verify the row now shows "SALTATO" badge
      const badge = row.locator('.state-skip').first()
      await expect(badge).toBeVisible({ timeout: 3000 })

      // Now click Eseguito on the same row
      const eseguitoBtn = row.locator('button:has-text("Eseguito")').first()
      if (await eseguitoBtn.isVisible({ timeout: 3000 })) {
        await eseguitoBtn.click()

        // Handle batch picker if it appears
        const pickerBtn = page.locator('.batch-picker-dialog button:not(:has-text("Annulla"))').first()
        if (await pickerBtn.isVisible({ timeout: 2000 })) {
          await pickerBtn.click()
          await page.waitForTimeout(800)
        }

        await page.waitForTimeout(1000)
        // Should show success message
        await expect(page.getByText('Promemoria contrassegnato: ESEGUITO').first()).toBeVisible({ timeout: 5000 })
        found = true
        break
      }
    }
  }
  if (!found) test.skip(true, 'No actionable reminder available for Saltato→Eseguito test')
})
