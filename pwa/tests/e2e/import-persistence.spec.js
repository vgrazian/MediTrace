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

test('import CSV non dry-run persists rows in IndexedDB', async ({ page }) => {
    await page.goto('/')
    await loginOrRegisterSeededUser(page)

    await page.getByRole('link', { name: '⚙' }).click()
    await expect(page.getByRole('heading', { name: 'Impostazioni' })).toBeVisible()

    await page.getByLabel('Sorgente').selectOption('03_Ospiti.csv')
    await page.locator('label.checkbox-label input[type="checkbox"]').uncheck()
    await page.locator('input[type="file"][accept=".csv,text/csv"]').setInputFiles({
        name: '03_Ospiti.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from('guest_id,codice_interno\nguest-e2e-1,OSP-E2E-1\n'),
    })

    await page.getByRole('button', { name: 'Avvia import CSV' }).click()

    await expect(page.getByText("Modalita': scrittura applicata")).toBeVisible()
    await expect(page.getByText('Accettate: 1')).toBeVisible()

    const persisted = await page.evaluate(async () => {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('meditrace')
            request.onerror = () => reject(request.error)
            request.onsuccess = () => {
                const db = request.result
                const tx = db.transaction('hosts', 'readonly')
                const store = tx.objectStore('hosts')
                const getReq = store.get('guest-e2e-1')

                getReq.onerror = () => reject(getReq.error)
                getReq.onsuccess = () => {
                    const row = getReq.result
                    resolve(Boolean(row && row.codiceInterno === 'OSP-E2E-1'))
                }
            }
        })
    })

    expect(persisted).toBe(true)
})
