import { test, expect } from '@playwright/test'

async function loginAsSeededUser(page) {
    await page.goto('/')
    const usernameInput = page.locator('#username-input')
    const registerUsernameInput = page.locator('#reg-username')
    const homeLink = page.getByRole('link', { name: 'Cruscotto' })

    await Promise.race([
        usernameInput.waitFor({ state: 'visible', timeout: 5000 }).catch(() => null),
        registerUsernameInput.waitFor({ state: 'visible', timeout: 5000 }).catch(() => null),
        homeLink.waitFor({ state: 'visible', timeout: 5000 }).catch(() => null),
    ])

    if (await usernameInput.isVisible()) {
        await usernameInput.fill('prova')
        await page.locator('#password-input').fill('Prova1234!')
        await page.getByRole('button', { name: 'Accedi' }).click()
    } else if (await registerUsernameInput.isVisible()) {
        await registerUsernameInput.fill('prova')
        await page.locator('#reg-first-name').fill('Test')
        await page.locator('#reg-last-name').fill('Operator')
        await page.locator('#reg-email').fill('prova@example.com')
        await page.locator('#reg-password').fill('Prova1234!')
        await page.locator('#reg-confirm-password').fill('Prova1234!')
        const githubTokenInput = page.locator('#reg-gh-token')
        const tokenDisabled = await githubTokenInput.isDisabled().catch(() => false)
        if (!tokenDisabled) {
            await githubTokenInput.fill('github_pat_seeded')
        }
        await page.getByRole('button', { name: 'Crea account e accedi' }).click()
    }

    await expect(page.locator('main')).toBeVisible()
}

async function seedPendingConflict(page) {
    await page.evaluate(async () => {
        await new Promise((resolve, reject) => {
            const request = indexedDB.open('meditrace')
            request.onerror = () => reject(request.error)
            request.onsuccess = () => {
                const db = request.result
                const tx = db.transaction(['therapies', 'settings', 'syncQueue'], 'readwrite')

                tx.objectStore('therapies').put({
                    id: 'therapy-e2e-1',
                    dosePerSomministrazione: '1',
                    somministrazioniGiornaliere: 1,
                    consumoMedioSettimanale: 7,
                    stockBatchIdPreferito: 'batch-local-1',
                    dataInizio: '2026-01-01',
                    dataFine: null,
                    updatedAt: '2026-04-03T10:00:00.000Z',
                    deletedAt: null,
                    syncStatus: 'conflict',
                })

                tx.objectStore('syncQueue').add({
                    entityType: 'therapies',
                    entityId: 'therapy-e2e-1',
                    operation: 'upsert',
                    createdAt: '2026-04-04T10:00:00.000Z',
                })

                tx.objectStore('settings').put({ key: 'datasetVersion', value: 1 })
                tx.objectStore('settings').put({
                    key: 'pendingConflicts',
                    value: [
                        {
                            conflictId: 'therapies:therapy-e2e-1:2026-04-04T10:00:00.000Z',
                            table: 'therapies',
                            entityId: 'therapy-e2e-1',
                            fields: [{ field: 'dosePerSomministrazione', local: '1', remote: '2' }],
                            localRecord: {
                                id: 'therapy-e2e-1',
                                dosePerSomministrazione: '1',
                                updatedAt: '2026-04-03T10:00:00.000Z',
                                syncStatus: 'conflict',
                            },
                            remoteRecord: {
                                id: 'therapy-e2e-1',
                                dosePerSomministrazione: '2',
                                updatedAt: '2026-04-04T10:00:00.000Z',
                                syncStatus: 'synced',
                            },
                            detectedAt: '2026-04-04T10:30:00.000Z',
                        },
                    ],
                })

                tx.onerror = () => reject(tx.error)
                tx.oncomplete = () => resolve()
            }
        })
    })
}

async function readConflictState(page) {
    return page.evaluate(async () => {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('meditrace')
            request.onerror = () => reject(request.error)
            request.onsuccess = () => {
                const db = request.result
                const tx = db.transaction(['settings', 'therapies', 'syncQueue'], 'readonly')
                const getSettings = tx.objectStore('settings').get('pendingConflicts')
                const getTherapy = tx.objectStore('therapies').get('therapy-e2e-1')
                const getQueue = tx.objectStore('syncQueue').getAll()

                tx.onerror = () => reject(tx.error)
                tx.oncomplete = () => {
                    resolve({
                        pendingCount: Array.isArray(getSettings.result?.value) ? getSettings.result.value.length : 0,
                        therapy: getTherapy.result,
                        queue: getQueue.result ?? [],
                    })
                }
            }
        })
    })
}

test.beforeEach(async ({ page }) => {
    const manifest = {
        schemaVersion: 1,
        datasetVersion: 1,
        exportedAt: '2026-04-04T11:00:00.000Z',
        updatedByDevice: 'remote-device',
        checksum: null,
    }

    const dataset = {
        schemaVersion: 1,
        datasetVersion: 1,
        exportedAt: '2026-04-04T11:00:00.000Z',
        hosts: [],
        drugs: [],
        stockBatches: [],
        therapies: [
            {
                id: 'therapy-e2e-1',
                dosePerSomministrazione: '2',
                somministrazioniGiornaliere: 1,
                consumoMedioSettimanale: 7,
                stockBatchIdPreferito: 'batch-remote-1',
                dataInizio: '2026-01-01',
                dataFine: null,
                updatedAt: '2026-04-04T10:00:00.000Z',
                deletedAt: null,
                syncStatus: 'synced',
            },
        ],
        movements: [],
        reminders: [],
    }

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
        const url = req.url()

        if (req.method() === 'GET' && url.includes('/gists?')) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([
                    {
                        id: 'gist-conflict-id',
                        description: 'MediTrace — dati personali (non modificare manualmente)',
                    },
                ]),
            })
            return
        }

        if (req.method() === 'GET' && url.endsWith('/gists/gist-conflict-id')) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    id: 'gist-conflict-id',
                    updated_at: '2026-04-04T11:00:00.000Z',
                    files: {
                        'meditrace-manifest.json': {
                            filename: 'meditrace-manifest.json',
                            content: JSON.stringify(manifest),
                        },
                        'meditrace-data.json': {
                            filename: 'meditrace-data.json',
                            content: JSON.stringify(dataset),
                        },
                    },
                }),
            })
            return
        }

        await route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ message: 'not found' }) })
    })
})

test('sync manuale blocca upload quando esiste un conflitto pendente', async ({ page }) => {
    await loginAsSeededUser(page)
    await seedPendingConflict(page)

    await page.getByRole('link', { name: '⚙' }).click()
    await expect(page.getByText('Conflitti aperti: 1')).toBeVisible()
    await page.getByRole('button', { name: 'Sincronizza ora' }).click()

    await expect(page.getByText('dosePerSomministrazione')).toBeVisible()

    const state = await readConflictState(page)
    expect(state.pendingCount).toBe(1)
})

test('risoluzione conflitto mantieni locale svuota pendingConflicts e lascia therapy in pending', async ({ page }) => {
    await loginAsSeededUser(page)
    await seedPendingConflict(page)

    await page.getByRole('link', { name: '⚙' }).click()
    await page.getByRole('button', { name: 'Mantieni locale' }).first().click()
    await expect(page.getByText(/Conflitto risolto.*Restanti: 0/)).toBeVisible()

    const state = await readConflictState(page)
    expect(state.pendingCount).toBe(0)
    expect(state.therapy?.dosePerSomministrazione).toBe('1')
    expect(state.therapy?.syncStatus).toBe('pending')
    expect(state.queue.some(item => item.entityType === 'therapies' && item.entityId === 'therapy-e2e-1')).toBe(true)
})

test('risoluzione conflitto accetta remota applica il valore remoto e rimuove la queue therapy', async ({ page }) => {
    await loginAsSeededUser(page)
    await seedPendingConflict(page)

    await page.getByRole('link', { name: '⚙' }).click()
    await page.getByRole('button', { name: 'Accetta remota' }).first().click()
    await expect(page.getByText('Conflitto risolto (remota). Restanti: 0')).toBeVisible()

    const state = await readConflictState(page)
    expect(state.pendingCount).toBe(0)
    expect(state.therapy?.dosePerSomministrazione).toBe('2')
    expect(state.therapy?.syncStatus).toBe('synced')
    expect(state.queue.some(item => item.entityType === 'therapies' && item.entityId === 'therapy-e2e-1')).toBe(false)
})
