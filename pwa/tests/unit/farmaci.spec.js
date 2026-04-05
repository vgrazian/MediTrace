import { beforeEach, describe, expect, it, vi } from 'vitest'
import { upsertDrug, deleteDrug, upsertBatch, deactivateBatch } from '../../src/services/farmaci'

// ── Mock db — needed for persistence and audit trail tests ────────────────────

const dbDrugs = new Map()
const dbBatches = new Map()
const activityLogRows = []
const enqueueCalls = []

vi.mock('../../src/db', () => ({
    db: {
        drugs: {
            async get(id) { return dbDrugs.get(id) ?? undefined },
            async put(row) { dbDrugs.set(row.id, row) },
        },
        stockBatches: {
            async get(id) { return dbBatches.get(id) ?? undefined },
            async put(row) { dbBatches.set(row.id, row) },
        },
        syncQueue: { async add() { } },
        activityLog: { async add(row) { activityLogRows.push(row) } },
        async transaction(_mode, ...args) {
            const callback = args.at(-1)
            await callback()
        },
    },
    async enqueue(entityType, entityId, operation = 'upsert') {
        enqueueCalls.push({ entityType, entityId, operation })
    },
    async getSetting(_key, fallback = null) { return fallback },
}))

// ── Fixtures ──────────────────────────────────────────────────────────────────

const NOW = new Date('2026-04-04T14:00:00.000Z')

function resetState() {
    dbDrugs.clear()
    dbBatches.clear()
    activityLogRows.length = 0
    enqueueCalls.length = 0
}

// ── upsertDrug ────────────────────────────────────────────────────────────────

describe('upsertDrug', () => {
    beforeEach(() => {
        resetState()
    })

    it('creates drug and writes standard audit fields', async () => {
        const result = await upsertDrug({
            drugId: 'drug-1',
            existing: null,
            nomeFarmaco: 'Paracetamolo',
            principioAttivo: 'Paracetamol',
            classeTerapeutica: 'Analgesico',
            scortaMinima: 50,
            operatorId: 'op-admin',
        })

        expect(result.id).toBe('drug-1')
        expect(result.nomeFarmaco).toBe('Paracetamolo')
        expect(result.syncStatus).toBe('pending')

        const createdAudit = activityLogRows.find(row => row.entityType === 'drugs' && row.action === 'drug_created')
        expect(createdAudit?.entityType).toBe('drugs')
        expect(createdAudit?.entityId).toBe('drug-1')
        expect(createdAudit?.action).toBe('drug_created')
        expect(createdAudit?.operatorId).toBe('op-admin')
        expect(createdAudit?.deviceId).toBe('unknown')
        expect(typeof createdAudit?.ts).toBe('string')
    })

    it('updates drug and writes update audit event', async () => {
        const existing = {
            id: 'drug-1',
            nomeFarmaco: 'Paracetamolo',
            principioAttivo: 'Paracetamol',
            classeTerapeutica: 'Analgesico',
        }
        dbDrugs.set('drug-1', existing)

        const result = await upsertDrug({
            drugId: 'drug-1',
            existing,
            nomeFarmaco: 'Paracetamolo 500mg',
            principioAttivo: 'Paracetamol',
            scortaMinima: 100,
            operatorId: 'op-nurse',
        })

        expect(result.nomeFarmaco).toBe('Paracetamolo 500mg')
        expect(result.syncStatus).toBe('pending')

        const updatedAudit = activityLogRows.find(row => row.action === 'drug_updated')
        expect(updatedAudit?.entityType).toBe('drugs')
        expect(updatedAudit?.entityId).toBe('drug-1')
        expect(updatedAudit?.action).toBe('drug_updated')
        expect(updatedAudit?.operatorId).toBe('op-nurse')
        expect(typeof updatedAudit?.ts).toBe('string')
    })
})

// ── deleteDrug ────────────────────────────────────────────────────────────────

describe('deleteDrug', () => {
    beforeEach(() => {
        resetState()
        dbDrugs.set('drug-1', {
            id: 'drug-1',
            nomeFarmaco: 'Paracetamolo',
            principioAttivo: 'Paracetamol',
            updatedAt: '2026-04-04T10:00:00.000Z',
        })
    })

    it('soft-deletes drug and writes delete audit event', async () => {
        const existing = dbDrugs.get('drug-1')

        const result = await deleteDrug({
            drugId: 'drug-1',
            existing,
            operatorId: 'op-admin',
        })

        expect(result.deletedAt).toBeTruthy()
        expect(result.syncStatus).toBe('pending')

        const deletedAudit = activityLogRows.find(row => row.action === 'drug_deleted')
        expect(deletedAudit?.entityType).toBe('drugs')
        expect(deletedAudit?.entityId).toBe('drug-1')
        expect(deletedAudit?.action).toBe('drug_deleted')
        expect(deletedAudit?.operatorId).toBe('op-admin')
        expect(deletedAudit?.deviceId).toBe('unknown')
        expect(typeof deletedAudit?.ts).toBe('string')
    })
})

// ── upsertBatch ───────────────────────────────────────────────────────────────

describe('upsertBatch', () => {
    beforeEach(() => {
        resetState()
    })

    it('creates batch and writes standard audit fields', async () => {
        const result = await upsertBatch({
            batchId: 'batch-1',
            existing: null,
            drugId: 'drug-1',
            nomeCommerciale: 'Tachipirina 500mg',
            dosaggio: '500mg',
            quantitaAttuale: 100,
            sogliaRiordino: 50,
            operatorId: 'op-admin',
        })

        expect(result.id).toBe('batch-1')
        expect(result.drugId).toBe('drug-1')
        expect(result.nomeCommerciale).toBe('Tachipirina 500mg')
        expect(result.syncStatus).toBe('pending')

        const createdAudit = activityLogRows.find(row => row.action === 'stock_batch_created')
        expect(createdAudit?.entityType).toBe('stockBatches')
        expect(createdAudit?.entityId).toBe('batch-1')
        expect(createdAudit?.action).toBe('stock_batch_created')
        expect(createdAudit?.operatorId).toBe('op-admin')
        expect(createdAudit?.deviceId).toBe('unknown')
        expect(typeof createdAudit?.ts).toBe('string')
    })

    it('updates batch and writes update audit event', async () => {
        const existing = {
            id: 'batch-1',
            drugId: 'drug-1',
            nomeCommerciale: 'Tachipirina 500mg',
            quantitaAttuale: 100,
        }
        dbBatches.set('batch-1', existing)

        const result = await upsertBatch({
            batchId: 'batch-1',
            existing,
            drugId: 'drug-1',
            nomeCommerciale: 'Tachipirina 500mg',
            quantitaAttuale: 80,
            operatorId: 'op-nurse',
        })

        expect(result.quantitaAttuale).toBe(80)

        const updatedAudit = activityLogRows.find(row => row.action === 'stock_batch_updated')
        expect(updatedAudit?.entityType).toBe('stockBatches')
        expect(updatedAudit?.entityId).toBe('batch-1')
        expect(updatedAudit?.action).toBe('stock_batch_updated')
        expect(updatedAudit?.operatorId).toBe('op-nurse')
        expect(typeof updatedAudit?.ts).toBe('string')
    })
})

// ── deactivateBatch ───────────────────────────────────────────────────────────

describe('deactivateBatch', () => {
    beforeEach(() => {
        resetState()
        dbBatches.set('batch-1', {
            id: 'batch-1',
            drugId: 'drug-1',
            nomeCommerciale: 'Tachipirina 500mg',
            updatedAt: '2026-04-04T10:00:00.000Z',
        })
    })

    it('soft-deletes batch and writes deactivation audit event', async () => {
        const existing = dbBatches.get('batch-1')

        const result = await deactivateBatch({
            batchId: 'batch-1',
            existing,
            operatorId: 'op-admin',
        })

        expect(result.deletedAt).toBeTruthy()
        expect(result.syncStatus).toBe('pending')

        const deactivatedAudit = activityLogRows.find(row => row.action === 'stock_batch_deactivated')
        expect(deactivatedAudit?.entityType).toBe('stockBatches')
        expect(deactivatedAudit?.entityId).toBe('batch-1')
        expect(deactivatedAudit?.action).toBe('stock_batch_deactivated')
        expect(deactivatedAudit?.operatorId).toBe('op-admin')
        expect(deactivatedAudit?.deviceId).toBe('unknown')
        expect(typeof deactivatedAudit?.ts).toBe('string')
    })
})
