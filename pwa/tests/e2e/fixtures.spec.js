import { test, expect } from '@playwright/test'
import {
    loadHostsFromCSV,
    loadDrugsFromCSV,
    loadRoomsAndBedsFromHosts,
    assignHostsToBedsAndRooms,
    loadStockBatchesFromDrugs,
    loadTherapiesFromHostsAndDrugs,
    loadCompleteTestDataBundle,
    getRawCSVContent,
} from './fixtures/testDataLoader.js'

test.describe('CSV Test Fixtures Integration', () => {
    test('should load realistic hosts from CSV fixtures', () => {
        const hosts = loadHostsFromCSV()

        // Verify data loaded
        expect(hosts.length).toBeGreaterThan(0)
        expect(hosts[0]).toHaveProperty('codiceInterno')
        expect(hosts[0]).toHaveProperty('nome')
        expect(hosts[0]).toHaveProperty('cognome')
        expect(hosts[0]).toHaveProperty('luogoNascita')
        expect(hosts[0]).toHaveProperty('codiceFiscale')
        expect(hosts[0]).toHaveProperty('patologie')

        // Verify realistic data
        expect(hosts[0].nome).toBeTruthy()
        expect(hosts[0].cognome).toBeTruthy()
        expect(hosts[0].codiceFiscale).toMatch(/^[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]$/)
    })

    test('should load realistic drugs from CSV fixtures', () => {
        const drugs = loadDrugsFromCSV()

        // Verify data loaded
        expect(drugs.length).toBeGreaterThan(0)
        expect(drugs[0]).toHaveProperty('marca')
        expect(drugs[0]).toHaveProperty('principioAttivo')
        expect(drugs[0]).toHaveProperty('classeTerapeutica')

        // Verify realistic data
        expect(drugs[0].marca).toBeTruthy()
        expect(drugs[0].principioAttivo).toBeTruthy()
    })

    test('should retrieve raw CSV content for upload', () => {
        const ospitiCSV = getRawCSVContent('persone_test_sanitarie.csv')
        const farmaciFarmaciCSV = getRawCSVContent('farmaci_test_sanitari.csv')

        expect(ospitiCSV).toContain('nome,cognome')
        expect(farmaciFarmaciCSV).toContain('marca,farmaco')
    })

    test('should have consistent UUIDs for each data item', () => {
        const hosts = loadHostsFromCSV()
        const ids = hosts.map(h => h.id)

        // All IDs should be unique
        const uniqueIds = new Set(ids)
        expect(uniqueIds.size).toBe(hosts.length)

        // All IDs should be valid UUIDs
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
        ids.forEach(id => {
            expect(id).toMatch(uuidRegex)
        })
    })

    test('should generate proper codiceInterno sequence', () => {
        const hosts = loadHostsFromCSV()

        // First host should be OSP-001, second OSP-002, etc.
        expect(hosts[0].codiceInterno).toBe('OSP-001')
        expect(hosts[1].codiceInterno).toBe('OSP-002')
        expect(hosts[9].codiceInterno).toBe('OSP-010')
    })

    test('should generate rooms and beds for all hosts', () => {
        const hosts = loadHostsFromCSV()
        const { rooms, beds } = loadRoomsAndBedsFromHosts(hosts)

        // Verify rooms created
        expect(rooms.length).toBeGreaterThan(0)
        expect(rooms[0]).toHaveProperty('codice')
        expect(rooms[0]).toHaveProperty('descrizione')

        // Verify beds match total host count
        expect(beds.length).toBe(hosts.length)

        // Verify all beds have roomId
        beds.forEach(bed => {
            expect(bed.roomId).toBeTruthy()
            const room = rooms.find(r => r.id === bed.roomId)
            expect(room).toBeTruthy()
            expect(bed.numero).toBeGreaterThanOrEqual(1)
        })

        // Verify beds are distributed correctly (dataset uses 3 beds per room)
        const bedsByRoom = beds.reduce((acc, bed) => {
            acc[bed.roomId] = (acc[bed.roomId] || 0) + 1
            return acc
        }, {})

        Object.values(bedsByRoom).forEach(count => {
            expect([1, 2, 3, 4]).toContain(count)
        })
    })

    test('should assign hosts to beds and rooms', () => {
        const hosts = loadHostsFromCSV()
        const { rooms, beds } = loadRoomsAndBedsFromHosts(hosts)
        const assignedHosts = assignHostsToBedsAndRooms(hosts, rooms, beds)

        // Verify each host assigned to a bed and room
        assignedHosts.forEach((host, idx) => {
            expect(host.bedId).toBeTruthy()
            expect(host.roomId).toBeTruthy()

            const bed = beds.find(b => b.id === host.bedId)
            expect(bed.roomId).toBe(host.roomId)
        })

        // Verify no duplicate bed assignments
        const bedIds = assignedHosts.map(h => h.bedId)
        const uniqueBedIds = new Set(bedIds)
        expect(uniqueBedIds.size).toBe(bedIds.length)
    })

    test('should generate stock batches for all drugs', () => {
        const drugs = loadDrugsFromCSV()
        const batches = loadStockBatchesFromDrugs(drugs)

        // Each drug should have 2-3 batches
        expect(batches.length).toBeGreaterThanOrEqual(drugs.length * 2)
        expect(batches.length).toBeLessThanOrEqual(drugs.length * 3)

        // Verify batch properties
        batches.forEach(batch => {
            expect(batch.drugId).toBeTruthy()
            expect(batch.nomeCommerciale).toBeTruthy()
            expect(batch.lotto).toBeTruthy()
            expect(batch.scadenza).toMatch(/^\d{4}-\d{2}-\d{2}$/)
            expect(batch.quantita).toBeGreaterThan(0)
        })

        // Verify all drugs have at least one batch
        const batchedDrugIds = new Set(batches.map(b => b.drugId))
        drugs.forEach(drug => {
            expect(batchedDrugIds.has(drug.id)).toBeTruthy()
        })
    })

    test('should generate therapies for all hosts', () => {
        const hosts = loadHostsFromCSV()
        const drugs = loadDrugsFromCSV()
        const batches = loadStockBatchesFromDrugs(drugs)
        const therapies = loadTherapiesFromHostsAndDrugs(hosts, drugs, batches)

        // Each host should have 1-3 therapies
        const therapiesByHost = therapies.reduce((acc, t) => {
            acc[t.hostId] = (acc[t.hostId] || 0) + 1
            return acc
        }, {})

        Object.values(therapiesByHost).forEach(count => {
            expect(count).toBeGreaterThanOrEqual(1)
            expect(count).toBeLessThanOrEqual(3)
        })

        // Verify therapy properties
        therapies.forEach(therapy => {
            expect(therapy.hostId).toBeTruthy()
            expect(therapy.drugId).toBeTruthy()
            expect(therapy.dataInizio).toMatch(/^\d{4}-\d{2}-\d{2}$/)
            expect(String(therapy.dosaggio || '').length).toBeGreaterThan(0)
            expect(['1 volta al giorno', '2 volte al giorno', '3 volte al giorno', '1 volta/die', '2 volte/die', 'ogni 8 ore', 'al bisogno']).toContain(therapy.frequenza)
        })

        // Verify all therapies reference valid hosts and drugs
        const validHostIds = new Set(hosts.map(h => h.id))
        const validDrugIds = new Set(drugs.map(d => d.id))

        therapies.forEach(therapy => {
            expect(validHostIds.has(therapy.hostId)).toBeTruthy()
            expect(validDrugIds.has(therapy.drugId)).toBeTruthy()
        })
    })

    test('should generate complete test data bundle with all relations', () => {
        const bundle = loadCompleteTestDataBundle()

        // Verify all entities present
        expect(bundle.hosts.length).toBeGreaterThan(0)
        expect(bundle.rooms.length).toBeGreaterThan(0)
        expect(bundle.beds.length).toBeGreaterThan(0)
        expect(bundle.drugs.length).toBeGreaterThan(0)
        expect(bundle.stockBatches.length).toBeGreaterThan(0)
        expect(bundle.therapies.length).toBeGreaterThan(0)

        // Verify referential integrity
        const roomIds = new Set(bundle.rooms.map(r => r.id))
        const bedIds = new Set(bundle.beds.map(b => b.id))
        const hostIds = new Set(bundle.hosts.map(h => h.id))
        const drugIds = new Set(bundle.drugs.map(d => d.id))
        const batchIds = new Set(bundle.stockBatches.map(b => b.id))

        // All beds reference valid rooms
        bundle.beds.forEach(bed => {
            expect(roomIds.has(bed.roomId)).toBeTruthy()
        })

        // All hosts reference valid rooms and beds
        bundle.hosts.forEach(host => {
            expect(roomIds.has(host.roomId)).toBeTruthy()
            expect(bedIds.has(host.bedId)).toBeTruthy()
        })

        // All therapies reference valid hosts, drugs, and batches
        bundle.therapies.forEach(therapy => {
            expect(hostIds.has(therapy.hostId)).toBeTruthy()
            expect(drugIds.has(therapy.drugId)).toBeTruthy()
            if (therapy.stockBatchId) {
                expect(batchIds.has(therapy.stockBatchId)).toBeTruthy()
            }
        })

        // Verify host count matches bed count
        expect(bundle.hosts.length).toBe(bundle.beds.length)
    })

    test('should support limited data generation for performance', () => {
        const bundle = loadCompleteTestDataBundle(10) // Only 10 hosts

        expect(bundle.hosts.length).toBe(10)
        expect(bundle.beds.length).toBe(10)

        // Rooms should be scaled accordingly
        const bedsByRoom = bundle.beds.reduce((acc, bed) => {
            acc[bed.roomId] = (acc[bed.roomId] || 0) + 1
            return acc
        }, {})

        // For 10 hosts with dataset-based rooms/beds, counts remain coherent
        Object.values(bedsByRoom).forEach(count => {
            expect([1, 2, 3, 4]).toContain(count)
        })
    })
})

/**
 * Usage example for realistic E2E tests with fixture data
 * 
 * test('ospiti view displays imported hosts from CSV fixtures', async ({ page }) => {
 *   const hosts = loadHostsFromCSV()
 *   const firstHost = hosts[0]
 *   
 *   // Navigate to ospiti view
 *   await page.goto('/ospiti')
 *   
 *   // Your test logic here...
 *   expect(page.locator('text=' + firstHost.cognome)).toBeTruthy()
 * })
 */
