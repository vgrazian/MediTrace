import { beforeEach, describe, expect, it, vi } from 'vitest'

// ── Mock db ───────────────────────────────────────────────────────────────────

const tables = {
    rooms: new Map(),
    beds: new Map(),
    hosts: new Map(),
    drugs: new Map(),
    stockBatches: new Map(),
    therapies: new Map(),
    movements: new Map(),
    reminders: new Map(),
}

const settings = new Map()

function makeTable(name) {
    return {
        async put(row) { tables[name].set(String(row.id), row) },
        async delete(id) { tables[name].delete(String(id)) },
    }
}

vi.mock('../../src/db', () => ({
    db: {
        rooms: makeTable('rooms'),
        beds: makeTable('beds'),
        hosts: makeTable('hosts'),
        drugs: makeTable('drugs'),
        stockBatches: makeTable('stockBatches'),
        therapies: makeTable('therapies'),
        movements: makeTable('movements'),
        reminders: makeTable('reminders'),
        async transaction(_mode, _tables, callback) { await callback() },
    },
    async getSetting(key, fallback = null) {
        return settings.has(key) ? settings.get(key) : fallback
    },
    async setSetting(key, value) {
        settings.set(key, value)
    },
}))

// Import after mock is set up
import {
    loadSeedData,
    clearSeedData,
    isSeedDataLoaded,
    getSeedStats,
    seedDataTestUtils,
} from '../../src/services/seedData'

function resetState() {
    for (const t of Object.values(tables)) t.clear()
    settings.clear()
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('seedData — static helpers', () => {
    it('getSeedStats returns non-zero counts for every table', () => {
        const stats = getSeedStats()
        expect(stats.rooms).toBeGreaterThan(0)
        expect(stats.beds).toBeGreaterThan(0)
        expect(stats.hosts).toBeGreaterThan(0)
        expect(stats.drugs).toBeGreaterThan(0)
        expect(stats.stockBatches).toBeGreaterThan(0)
        expect(stats.therapies).toBeGreaterThan(0)
        expect(stats.movements).toBeGreaterThan(0)
        expect(stats.reminders).toBeGreaterThan(0)
    })

    it('all seed IDs are prefixed with __seed__', () => {
        const allRecords = [
            ...seedDataTestUtils.SEED_ROOMS,
            ...seedDataTestUtils.SEED_BEDS,
            ...seedDataTestUtils.SEED_HOSTS,
            ...seedDataTestUtils.SEED_DRUGS,
            ...seedDataTestUtils.SEED_STOCK_BATCHES,
            ...seedDataTestUtils.SEED_THERAPIES,
            ...seedDataTestUtils.SEED_MOVEMENTS,
            ...seedDataTestUtils.SEED_REMINDERS,
        ]
        for (const record of allRecords) {
            expect(record.id).toMatch(/^__seed__/)
        }
    })

    it('all seed records carry _seeded: true', () => {
        const allRecords = [
            ...seedDataTestUtils.SEED_ROOMS,
            ...seedDataTestUtils.SEED_BEDS,
            ...seedDataTestUtils.SEED_HOSTS,
            ...seedDataTestUtils.SEED_DRUGS,
            ...seedDataTestUtils.SEED_STOCK_BATCHES,
            ...seedDataTestUtils.SEED_THERAPIES,
            ...seedDataTestUtils.SEED_MOVEMENTS,
            ...seedDataTestUtils.SEED_REMINDERS,
        ]
        for (const record of allRecords) {
            expect(record._seeded).toBe(true)
        }
    })

    it('manifest IDs match record lists', () => {
        const { SEED_MANIFEST, SEED_ROOMS, SEED_BEDS, SEED_HOSTS, SEED_DRUGS, SEED_STOCK_BATCHES, SEED_THERAPIES, SEED_MOVEMENTS, SEED_REMINDERS } = seedDataTestUtils
        expect(SEED_MANIFEST.rooms).toEqual(SEED_ROOMS.map(r => r.id))
        expect(SEED_MANIFEST.beds).toEqual(SEED_BEDS.map(r => r.id))
        expect(SEED_MANIFEST.hosts).toEqual(SEED_HOSTS.map(r => r.id))
        expect(SEED_MANIFEST.drugs).toEqual(SEED_DRUGS.map(r => r.id))
        expect(SEED_MANIFEST.stockBatches).toEqual(SEED_STOCK_BATCHES.map(r => r.id))
        expect(SEED_MANIFEST.therapies).toEqual(SEED_THERAPIES.map(r => r.id))
        expect(SEED_MANIFEST.movements).toEqual(SEED_MOVEMENTS.map(r => r.id))
        expect(SEED_MANIFEST.reminders).toEqual(SEED_REMINDERS.map(r => r.id))
    })

    it('bed foreign keys resolve to existing seed rooms', () => {
        const roomIds = new Set(seedDataTestUtils.SEED_ROOMS.map(r => r.id))
        for (const bed of seedDataTestUtils.SEED_BEDS) {
            expect(roomIds.has(bed.roomId)).toBe(true)
        }
    })

    it('therapy foreign keys resolve to existing seed drugs and hosts', () => {
        const drugIds = new Set(seedDataTestUtils.SEED_DRUGS.map(r => r.id))
        const hostIds = new Set(seedDataTestUtils.SEED_HOSTS.map(r => r.id))
        for (const therapy of seedDataTestUtils.SEED_THERAPIES) {
            expect(drugIds.has(therapy.drugId)).toBe(true)
            expect(hostIds.has(therapy.hostId)).toBe(true)
        }
    })

    it('stockBatch foreign keys resolve to existing seed drugs', () => {
        const drugIds = new Set(seedDataTestUtils.SEED_DRUGS.map(r => r.id))
        for (const batch of seedDataTestUtils.SEED_STOCK_BATCHES) {
            expect(drugIds.has(batch.drugId)).toBe(true)
        }
    })

    it('reminders reference existing seed hosts and therapies', () => {
        const hostIds = new Set(seedDataTestUtils.SEED_HOSTS.map(r => r.id))
        const therapyIds = new Set(seedDataTestUtils.SEED_THERAPIES.map(r => r.id))
        for (const reminder of seedDataTestUtils.SEED_REMINDERS) {
            expect(hostIds.has(reminder.hostId)).toBe(true)
            expect(therapyIds.has(reminder.therapyId)).toBe(true)
        }
    })

    it('no duplicate IDs within or across tables', () => {
        const allIds = [
            ...seedDataTestUtils.SEED_ROOMS,
            ...seedDataTestUtils.SEED_BEDS,
            ...seedDataTestUtils.SEED_HOSTS,
            ...seedDataTestUtils.SEED_DRUGS,
            ...seedDataTestUtils.SEED_STOCK_BATCHES,
            ...seedDataTestUtils.SEED_THERAPIES,
            ...seedDataTestUtils.SEED_MOVEMENTS,
            ...seedDataTestUtils.SEED_REMINDERS,
        ].map(r => r.id)

        expect(new Set(allIds).size).toBe(allIds.length)
    })
})

describe('seedData — isSeedDataLoaded', () => {
    beforeEach(() => resetState())

    it('returns false when no manifest is stored', async () => {
        expect(await isSeedDataLoaded()).toBe(false)
    })

    it('returns true after loadSeedData', async () => {
        await loadSeedData()
        expect(await isSeedDataLoaded()).toBe(true)
    })
})

describe('seedData — loadSeedData', () => {
    beforeEach(() => resetState())

    it('writes all tables to the mock db', async () => {
        const stats = await loadSeedData()

        expect(tables.drugs.size).toBe(stats.drugs)
        expect(tables.hosts.size).toBe(stats.hosts)
        expect(tables.stockBatches.size).toBe(stats.stockBatches)
        expect(tables.therapies.size).toBe(stats.therapies)
        expect(tables.movements.size).toBe(stats.movements)
        expect(tables.reminders.size).toBe(stats.reminders)
    })

    it('returns stats matching getSeedStats()', async () => {
        const stats = await loadSeedData()
        const expected = getSeedStats()
        expect(stats).toEqual(expected)
    })

    it('stores manifest in settings', async () => {
        await loadSeedData()
        const manifest = settings.get(seedDataTestUtils.SEED_MANIFEST_KEY)
        expect(manifest).toBeTruthy()
        expect(Array.isArray(manifest.drugs)).toBe(true)
        expect(manifest.drugs.length).toBeGreaterThan(0)
    })

    it('is idempotent — second call overwrites without duplication', async () => {
        await loadSeedData()
        const firstCount = tables.drugs.size
        await loadSeedData()
        expect(tables.drugs.size).toBe(firstCount)
    })

    it('creates demo operator accounts in authUsers settings', async () => {
        await loadSeedData()
        const users = settings.get('authUsers')
        expect(Array.isArray(users)).toBe(true)
        const usernames = users.map(user => user.username)
        expect(usernames).toContain('rosa')
        expect(usernames).toContain('margherita')
        expect(usernames).toContain('giglio')
    })
})

describe('seedData — clearSeedData', () => {
    beforeEach(() => resetState())

    it('removes all seed records from every table', async () => {
        await loadSeedData()
        await clearSeedData()

        expect(tables.drugs.size).toBe(0)
        expect(tables.hosts.size).toBe(0)
        expect(tables.stockBatches.size).toBe(0)
        expect(tables.therapies.size).toBe(0)
        expect(tables.movements.size).toBe(0)
        expect(tables.reminders.size).toBe(0)
    })

    it('clears the manifest from settings', async () => {
        await loadSeedData()
        await clearSeedData()
        expect(await isSeedDataLoaded()).toBe(false)
    })

    it('returns { cleared: true } when data was present', async () => {
        await loadSeedData()
        const result = await clearSeedData()
        expect(result.cleared).toBe(true)
        expect(Array.isArray(result.tables)).toBe(true)
    })

    it('returns { cleared: false } when no manifest exists', async () => {
        const result = await clearSeedData()
        expect(result.cleared).toBe(false)
    })

    it('still removes demo operators when no manifest exists', async () => {
        settings.set('authUsers', [
            {
                id: 'admin-1',
                username: 'admin',
                role: 'admin',
                isSeeded: true,
                seedScope: 'emergency',
                disabled: false,
            },
            {
                id: '__seed__auth-rosa',
                username: 'rosa',
                role: 'operator',
                isSeeded: true,
                seedScope: 'demo',
                disabled: false,
            },
        ])

        const result = await clearSeedData()
        expect(result.cleared).toBe(false)
        expect(result.removedOperators).toBe(1)

        const users = settings.get('authUsers') || []
        expect(users.map(user => user.username)).toEqual(['admin'])
    })

    it('does not affect non-seed records in the same tables', async () => {
        // Pre-populate with a non-seed record
        tables.drugs.set('real-drug-1', { id: 'real-drug-1', principioAttivo: 'Aspirina' })

        await loadSeedData()
        await clearSeedData()

        expect(tables.drugs.has('real-drug-1')).toBe(true)
        expect(tables.drugs.size).toBe(1)
    })

    it('removes demo operators but preserves admin user', async () => {
        settings.set('authUsers', [
            {
                id: 'admin-1',
                username: 'admin',
                role: 'admin',
                isSeeded: true,
                seedScope: 'emergency',
                disabled: false,
            },
        ])

        await loadSeedData()
        await clearSeedData()

        const users = settings.get('authUsers') || []
        const usernames = users.map(user => user.username)
        expect(usernames).toContain('admin')
        expect(usernames).not.toContain('rosa')
        expect(usernames).not.toContain('margherita')
        expect(usernames).not.toContain('giglio')
    })
})
