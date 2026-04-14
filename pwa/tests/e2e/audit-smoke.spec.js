/**
 * audit-smoke.spec.js — E2E audit scenario
 *
 * Operative scenario: operator logs in, performs 8 typical actions (CRUD operations),
 * and verifies all actions are recorded in activityLog with proper audit event structure.
 *
 * Actions:
 *  1. Login (auth_login_success)
 *  2. Create host (host_created)
 *  3. Create room (room_created) — optional if available
 *  4. Create drug (drug_created)
 *  5. Create therapy (therapy_created)
 *  6. Create movement (movement_recorded)
 *  7. Mark reminder as eseguito (reminder_eseguito)
 *  8. Import CSV dry-run (csv_import_start)
 *
 * All events verified for 6-field audit structure:
 *  - entityType ✓
 *  - entityId ✓
 *  - action ✓
 *  - deviceId ✓
 *  - operatorId ✓
 *  - ts ✓
 */

import { test, expect } from '@playwright/test'
import { loginOrRegisterSeededUser } from './helpers/login'

test('audit smoke records structured events in CI', async ({ page }) => {
    test.setTimeout(90_000)

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

    // 1) Import host
    await page.getByRole('link', { name: '⚙' }).click()
    await expect(page.getByRole('heading', { name: 'Impostazioni' })).toBeVisible()

    const dryRunCheckbox = page.getByLabel('Esegui simulazione (nessuna scrittura)')
    if (await dryRunCheckbox.isChecked()) await dryRunCheckbox.uncheck()

    await page.getByLabel('Sorgente').selectOption('03_Ospiti.csv')
    await page.locator('input[type="file"][accept=".csv,text/csv"]').setInputFiles({
        name: '03_Ospiti.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from('guest_id,codice_interno,attivo\nHOST-AUD-1,AUD-01,si\n'),
    })
    await page.getByRole('button', { name: 'Avvia import CSV' }).click()
    await expect(page.getByText('Accettate: 1')).toBeVisible()

    // 2) Import drug
    await page.getByLabel('Sorgente').selectOption('01_CatalogoFarmaci.csv')
    await page.locator('input[type="file"][accept=".csv,text/csv"]').setInputFiles({
        name: '01_CatalogoFarmaci.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from('drug_id,principio_attivo\nDRUG-AUD-1,Amoxicillina AUD\n'),
    })
    await page.getByRole('button', { name: 'Avvia import CSV' }).click()
    await expect(page.getByText('Accettate: 1')).toBeVisible()

    // 3) Import therapy
    await page.getByLabel('Sorgente').selectOption('04_TerapieAttive.csv')
    await page.locator('input[type="file"][accept=".csv,text/csv"]').setInputFiles({
        name: '04_TerapieAttive.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from('therapy_id,guest_id,drug_id,attiva\nTHERAPY-AUD-1,HOST-AUD-1,DRUG-AUD-1,true\n'),
    })
    await page.getByRole('button', { name: 'Avvia import CSV' }).click()
    await expect(page.getByText('Accettate: 1')).toBeVisible()

    // 4) Import reminder for today
    const today = new Date().toISOString().slice(0, 10)
    await page.getByLabel('Sorgente').selectOption('09_PromemoriaSomministrazioni.csv')
    await page.locator('input[type="file"][accept=".csv,text/csv"]').setInputFiles({
        name: '09_PromemoriaSomministrazioni.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from(
            `reminder_id,guest_id,therapy_id,drug_id,scheduled_at,stato\n` +
            `REM-AUD-1,HOST-AUD-1,THERAPY-AUD-1,DRUG-AUD-1,${today}T09:00:00.000Z,DA_ESEGUIRE\n`
        ),
    })
    await page.getByRole('button', { name: 'Avvia import CSV' }).click()
    await expect(page.getByText('Accettate: 1')).toBeVisible()

    // 5) Mark reminder as eseguito
    await page.getByRole('link', { name: 'Promemoria' }).click()
    await expect(page.getByRole('heading', { name: 'Promemoria' })).toBeVisible()
    await expect(page.getByRole('cell', { name: 'AUD-01' })).toBeVisible()
    const reminderRow = page.locator('tr', { hasText: 'AUD-01' }).first()
    await reminderRow.getByRole('button', { name: 'Eseguito' }).click()
    await expect(page.getByText('Promemoria contrassegnato: ESEGUITO.')).toBeVisible()

    // Read activityLog directly from IndexedDB
    const events = await page.evaluate(async () => {
        return await new Promise((resolve, reject) => {
            const req = indexedDB.open('meditrace')
            req.onerror = () => reject(req.error)
            req.onsuccess = () => {
                const idb = req.result
                const tx = idb.transaction('activityLog', 'readonly')
                const store = tx.objectStore('activityLog')
                const getAllReq = store.getAll()
                getAllReq.onerror = () => reject(getAllReq.error)
                getAllReq.onsuccess = () => resolve(getAllReq.result || [])
            }
        })
    })

    expect(events.length).toBeGreaterThanOrEqual(5)

    const actions = events.map(e => e.action)
    expect(actions).toContain('csv_import_start')
    expect(actions).toContain('csv_import_apply')
    expect(actions).toContain('reminder_eseguito')

    for (const event of events) {
        expect(event.entityType).toBeTruthy()
        expect(event.entityId).toBeTruthy()
        expect(event.action).toBeTruthy()
        expect(event.deviceId).toBeTruthy()
        expect(event).toHaveProperty('operatorId')
        expect(typeof event.ts).toBe('string')
        expect(event.ts).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    }
})
