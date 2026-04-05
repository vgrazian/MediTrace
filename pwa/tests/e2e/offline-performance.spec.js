import { test, expect } from '@playwright/test'
import { loginOrRegisterSeededUser } from './helpers/login'

async function seedPerformanceBaselineDataset(page) {
    await page.evaluate(async () => {
        const nowIso = new Date().toISOString()

        function makeDrug(index) {
            return {
                id: `perf-drug-${index}`,
                principioAttivo: `Principio ${index}`,
                classeTerapeutica: 'Test',
                scortaMinima: 20,
                updatedAt: nowIso,
                deletedAt: null,
                syncStatus: 'pending',
            }
        }

        function makeBatch(index, drugId) {
            return {
                id: `perf-batch-${index}`,
                drugId,
                nomeCommerciale: `Batch ${index}`,
                quantitaAttuale: 500,
                sogliaRiordino: 50,
                updatedAt: nowIso,
                deletedAt: null,
                syncStatus: 'pending',
            }
        }

        function makeHost(index) {
            return {
                id: `perf-host-${index}`,
                codiceInterno: `PERF-${String(index).padStart(3, '0')}`,
                iniziali: `H${index}`,
                nome: `Nome${index}`,
                cognome: `Cognome${index}`,
                luogoNascita: '',
                dataNascita: null,
                sesso: '',
                codiceFiscale: '',
                patologie: 'Monitoraggio',
                roomId: null,
                bedId: null,
                stanza: '',
                letto: '',
                attivo: true,
                updatedAt: nowIso,
                deletedAt: null,
                syncStatus: 'pending',
            }
        }

        function makeTherapy(index, hostId, drugId, stockBatchId) {
            return {
                id: `perf-therapy-${index}`,
                hostId,
                drugId,
                stockBatchId,
                dataInizio: nowIso,
                dataFine: null,
                dosaggio: '1',
                frequenza: '1/die',
                dosePerSomministrazione: 1,
                somministrazioniGiornaliere: 1,
                consumoMedioSettimanale: 7,
                attiva: true,
                updatedAt: nowIso,
                deletedAt: null,
                syncStatus: 'pending',
            }
        }

        function makeMovement(index, stockBatchId, hostId, therapyId) {
            return {
                id: `perf-mov-${index}`,
                stockBatchId,
                hostId,
                therapyId,
                tipoMovimento: 'SCARICO',
                quantita: 1,
                dataMovimento: nowIso,
                updatedAt: nowIso,
                deletedAt: null,
                syncStatus: 'pending',
            }
        }

        await new Promise((resolve, reject) => {
            const request = indexedDB.open('meditrace')
            request.onerror = () => reject(request.error)
            request.onsuccess = () => {
                const database = request.result
                const tx = database.transaction(
                    ['hosts', 'drugs', 'stockBatches', 'therapies', 'movements'],
                    'readwrite',
                )

                const hostsStore = tx.objectStore('hosts')
                const drugsStore = tx.objectStore('drugs')
                const batchesStore = tx.objectStore('stockBatches')
                const therapiesStore = tx.objectStore('therapies')
                const movementsStore = tx.objectStore('movements')

                hostsStore.clear()
                drugsStore.clear()
                batchesStore.clear()
                therapiesStore.clear()
                movementsStore.clear()

                const drugs = []
                for (let i = 1; i <= 40; i += 1) {
                    const drug = makeDrug(i)
                    drugs.push(drug)
                    drugsStore.put(drug)
                    const batch = makeBatch(i, drug.id)
                    batchesStore.put(batch)
                }

                const hosts = []
                for (let i = 1; i <= 100; i += 1) {
                    const host = makeHost(i)
                    hosts.push(host)
                    hostsStore.put(host)
                }

                for (let i = 1; i <= 500; i += 1) {
                    const host = hosts[(i - 1) % hosts.length]
                    const drug = drugs[(i - 1) % drugs.length]
                    const batchId = `perf-batch-${((i - 1) % drugs.length) + 1}`
                    therapiesStore.put(makeTherapy(i, host.id, drug.id, batchId))
                }

                for (let i = 1; i <= 1000; i += 1) {
                    const hostId = `perf-host-${((i - 1) % 100) + 1}`
                    const therapyId = `perf-therapy-${((i - 1) % 500) + 1}`
                    const batchId = `perf-batch-${((i - 1) % 40) + 1}`
                    movementsStore.put(makeMovement(i, batchId, hostId, therapyId))
                }

                tx.oncomplete = () => resolve(true)
                tx.onerror = () => reject(tx.error)
            }
        })
    })
}

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

test('@ops performance smoke: initial load within budget', async ({ page }) => {
    const startedAt = Date.now()
    await page.goto('/')
    const loginHeading = page.getByRole('heading', { name: 'MediTrace' })
    const homeLink = page.getByRole('link', { name: 'Cruscotto' })
    await Promise.race([
        loginHeading.waitFor({ state: 'visible' }).catch(() => null),
        homeLink.waitFor({ state: 'visible' }).catch(() => null),
    ])
    await expect(loginHeading.or(homeLink)).toBeVisible()

    const elapsedMs = Date.now() - startedAt
    expect(elapsedMs).toBeLessThan(5000)
})

test('@ops offline prolonged session remains usable after login', async ({ page }) => {
    await page.goto('/')
    await loginOrRegisterSeededUser(page)

    await page.context().setOffline(true)
    await page.waitForTimeout(2000)

    await page.getByRole('link', { name: 'Farmaci' }).click()
    await expect(page.locator('main')).toBeVisible()

    await page.getByRole('link', { name: 'Scorte' }).click()
    await expect(page.locator('main')).toBeVisible()

    await page.getByRole('link', { name: 'Terapie' }).click()
    await expect(page.locator('main')).toBeVisible()

    await page.getByRole('link', { name: 'Promemoria' }).click()
    await expect(page.locator('main')).toBeVisible()
})

test('@ops performance baseline: 100 hosts, 500 therapies, 1000 movements keeps TTI within budget', async ({ page }) => {
    await page.goto('/')
    await loginOrRegisterSeededUser(page)

    await seedPerformanceBaselineDataset(page)

    const startedAt = Date.now()
    await page.reload()
    await expect(page.locator('main')).toBeVisible({ timeout: 15000 })

    await page.getByRole('link', { name: 'Scorte' }).click()
    await expect(page.getByRole('heading', { name: 'Scorte' })).toBeVisible({ timeout: 15000 })

    const elapsedMs = Date.now() - startedAt
    // TTI proxy: reload + first operational navigation must stay below baseline budget.
    expect(elapsedMs).toBeLessThan(12000)
})
