import { expect, test } from '@playwright/test'
import { loginOrRegisterSeededUser } from './helpers/login'

test('pannello audit in sola lettura con filtri operativi e tabella scrollabile', async ({ page }) => {
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

    await page.evaluate(async () => {
        await new Promise((resolve, reject) => {
            const req = indexedDB.open('meditrace')
            req.onerror = () => reject(req.error)
            req.onsuccess = () => {
                const db = req.result
                const tx = db.transaction(['hosts', 'drugs', 'therapies', 'activityLog'], 'readwrite')
                const hostsStore = tx.objectStore('hosts')
                const drugsStore = tx.objectStore('drugs')
                const therapiesStore = tx.objectStore('therapies')
                const auditStore = tx.objectStore('activityLog')

                hostsStore.put({
                    id: 'host-audit-1',
                    codiceInterno: 'OSP-AUD-1',
                    nome: 'Mario',
                    cognome: 'Rossi',
                    attivo: true,
                    updatedAt: '2026-04-11T08:00:00.000Z',
                    deletedAt: null,
                    syncStatus: 'synced',
                })

                drugsStore.put({
                    id: 'drug-audit-1',
                    nomeFarmaco: 'Paracetamolo',
                    principioAttivo: 'Paracetamolo',
                    updatedAt: '2026-04-11T08:00:00.000Z',
                    deletedAt: null,
                    syncStatus: 'synced',
                })

                therapiesStore.put({
                    id: 'therapy-audit-1',
                    hostId: 'host-audit-1',
                    drugId: 'drug-audit-1',
                    attiva: true,
                    dataFine: null,
                    updatedAt: '2026-04-11T08:00:00.000Z',
                    deletedAt: null,
                    syncStatus: 'synced',
                })

                auditStore.add({
                    entityType: 'therapies',
                    entityId: 'therapy-audit-1',
                    action: 'therapy_created',
                    deviceId: 'device-1',
                    operatorId: 'op-mario',
                    ts: '2026-04-11T09:00:00.000Z',
                })

                auditStore.add({
                    entityType: 'drugs',
                    entityId: 'drug-audit-1',
                    action: 'drug_updated',
                    deviceId: 'device-1',
                    operatorId: 'op-luisa',
                    ts: '2026-04-12T09:00:00.000Z',
                })

                tx.oncomplete = () => resolve(null)
                tx.onerror = () => reject(tx.error)
            }
        })
    })

    await page.getByRole('link', { name: 'Audit', exact: true }).click()

    await expect(page.getByRole('heading', { name: 'Registro Operazioni (Audit)' })).toBeVisible()
    await expect(page.getByText('Sola lettura', { exact: true })).toBeVisible()

    await page.getByLabel('Operatore').fill('op-mario')
    await expect(page.getByRole('cell', { name: 'op-mario' })).toBeVisible()
    await expect(page.getByRole('cell', { name: 'op-luisa' })).toHaveCount(0)

    await page.getByLabel('Ospite').fill('rossi')
    await expect(page.getByText('OSP-AUD-1')).toBeVisible()

    await page.getByLabel('Farmaco').fill('paracetamolo')
    await expect(page.getByRole('cell', { name: 'Paracetamolo' })).toBeVisible()

    await page.getByLabel('Terapia').fill('therapy-audit-1')
    await expect(page.getByRole('cell', { name: 'therapy-audit-1' })).toBeVisible()

    await page.getByLabel('Periodo da').fill('2026-04-11')
    await page.getByLabel('Periodo a').fill('2026-04-11')
    await expect(page.getByRole('cell', { name: 'op-mario' })).toBeVisible()
    await expect(page.getByRole('cell', { name: 'op-luisa' })).toHaveCount(0)

    await page.setViewportSize({ width: 1280, height: 900 })
    const largeViewportStyle = await page.locator('.events-table-wrapper').evaluate(el => {
        const style = window.getComputedStyle(el)
        return {
            overflowY: style.overflowY,
            maxHeight: parseFloat(style.maxHeight || '0'),
        }
    })

    await page.setViewportSize({ width: 390, height: 740 })
    const smallViewportStyle = await page.locator('.events-table-wrapper').evaluate(el => {
        const style = window.getComputedStyle(el)
        return {
            overflowY: style.overflowY,
            maxHeight: parseFloat(style.maxHeight || '0'),
        }
    })

    expect(largeViewportStyle.overflowY === 'auto' || largeViewportStyle.overflowY === 'scroll').toBe(true)
    expect(smallViewportStyle.overflowY === 'auto' || smallViewportStyle.overflowY === 'scroll').toBe(true)
    expect(smallViewportStyle.maxHeight).toBeLessThan(largeViewportStyle.maxHeight)
})
