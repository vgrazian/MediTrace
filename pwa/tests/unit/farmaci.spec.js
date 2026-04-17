import { beforeEach, describe, expect, it, vi } from 'vitest'
import { upsertDrug, deleteDrug, upsertBatch, deactivateBatch } from '../../src/services/farmaci'

// ── Mock db — needed for persistence and audit trail tests ────────────────────

const dbDrugs = new Map()
const dbBatches = new Map()
const dbTherapies = new Map()
const activityLogRows = []
const enqueueCalls = []

vi.mock('../../src/db', () => ({
    db: {
        drugs: {
            async get(id) { return dbDrugs.get(id) ?? undefined },
            async put(row) { dbDrugs.set(row.id, row) },
            async toArray() { return Array.from(dbDrugs.values()) },
        },
        stockBatches: {
            async get(id) { return dbBatches.get(id) ?? undefined },
            async put(row) { dbBatches.set(row.id, row) },
            async toArray() { return Array.from(dbBatches.values()) },
        },
        therapies: {
            async toArray() { return Array.from(dbTherapies.values()) },
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
    dbTherapies.clear()
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

    it('auto-generates drug ID when not provided', async () => {
        const result = await upsertDrug({
            existing: null,
            nomeFarmaco: 'Ketoprofene',
            principioAttivo: 'Ketoprofen',
            operatorId: 'op-admin',
        })

        expect(result.id.startsWith('drug_')).toBe(true)
        expect(dbDrugs.get(result.id)?.nomeFarmaco).toBe('Ketoprofene')
    })

    it('rejects creation of active duplicate nomeFarmaco (case-insensitive)', async () => {
        await upsertDrug({
            drugId: 'drug-1',
            existing: null,
            nomeFarmaco: 'Paracetamolo',
            principioAttivo: 'Paracetamol',
            operatorId: 'op-admin',
        })

        await expect(upsertDrug({
            drugId: 'drug-2',
            existing: null,
            nomeFarmaco: '  PARACETAMOLO  ',
            principioAttivo: 'Paracetamol',
            operatorId: 'op-admin',
        })).rejects.toThrow('Farmaco gia esistente')
    })

    it('allows recreating same nomeFarmaco after soft-delete', async () => {
        const created = await upsertDrug({
            drugId: 'drug-1',
            existing: null,
            nomeFarmaco: 'Paracetamolo',
            principioAttivo: 'Paracetamol',
            operatorId: 'op-admin',
        })

        await deleteDrug({
            drugId: created.id,
            existing: created,
            operatorId: 'op-admin',
        })

        const recreated = await upsertDrug({
            drugId: 'drug-2',
            existing: null,
            nomeFarmaco: 'Paracetamolo',
            principioAttivo: 'Paracetamol',
            operatorId: 'op-admin',
        })

        expect(recreated.id).toBe('drug-2')
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

    it('blocks deletion when drug is used by active therapies', async () => {
        dbTherapies.set('therapy-1', {
            id: 'therapy-1',
            drugId: 'drug-1',
            deletedAt: null,
            dataFine: null,
            attiva: true,
        })

        await expect(deleteDrug({
            drugId: 'drug-1',
            existing: dbDrugs.get('drug-1'),
            operatorId: 'op-admin',
        })).rejects.toMatchObject({
            code: 'DRUG_IN_USE_BY_ACTIVE_THERAPY',
            category: 'conflict',
        })
        expect(activityLogRows).toHaveLength(0)
    })

    it('blocks deletion when drug has active batches', async () => {
        dbBatches.set('batch-10', {
            id: 'batch-10',
            drugId: 'drug-1',
            deletedAt: null,
        })

        await expect(deleteDrug({
            drugId: 'drug-1',
            existing: dbDrugs.get('drug-1'),
            operatorId: 'op-admin',
        })).rejects.toMatchObject({
            code: 'DRUG_IN_USE_BY_ACTIVE_BATCH',
            category: 'conflict',
        })
        expect(activityLogRows).toHaveLength(0)
    })

    it('allows deletion when linked therapies are closed and batches already deleted', async () => {
        dbTherapies.set('therapy-closed', {
            id: 'therapy-closed',
            drugId: 'drug-1',
            deletedAt: null,
            dataFine: '2026-03-01',
            attiva: false,
        })
        dbBatches.set('batch-deleted', {
            id: 'batch-deleted',
            drugId: 'drug-1',
            deletedAt: '2026-03-01T00:00:00.000Z',
        })

        const result = await deleteDrug({
            drugId: 'drug-1',
            existing: dbDrugs.get('drug-1'),
            operatorId: 'op-admin',
        })

        expect(result.deletedAt).toBeTruthy()
        expect(activityLogRows.find(row => row.action === 'drug_deleted')).toBeTruthy()
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

    it('auto-generates batch ID when not provided', async () => {
        const result = await upsertBatch({
            existing: null,
            drugId: 'drug-1',
            nomeCommerciale: 'Test batch',
            operatorId: 'op-admin',
        })

        expect(result.id.startsWith('batch_')).toBe(true)
        expect(dbBatches.get(result.id)?.drugId).toBe('drug-1')
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

    it('blocks deactivation when batch is referenced by active therapy', async () => {
        dbTherapies.set('therapy-using-batch', {
            id: 'therapy-using-batch',
            drugId: 'drug-1',
            stockBatchId: 'batch-1',
            deletedAt: null,
            dataFine: null,
            attiva: true,
        })

        await expect(deactivateBatch({
            batchId: 'batch-1',
            existing: dbBatches.get('batch-1'),
            operatorId: 'op-admin',
        })).rejects.toMatchObject({
            code: 'BATCH_IN_USE_BY_ACTIVE_THERAPY',
            category: 'conflict',
        })
        expect(activityLogRows).toHaveLength(0)
    })

    it('allows deactivation when therapy reference is historical', async () => {
        dbTherapies.set('therapy-ended', {
            id: 'therapy-ended',
            drugId: 'drug-1',
            stockBatchId: 'batch-1',
            deletedAt: null,
            dataFine: '2026-03-01',
            attiva: false,
        })

        const result = await deactivateBatch({
            batchId: 'batch-1',
            existing: dbBatches.get('batch-1'),
            operatorId: 'op-admin',
        })

        expect(result.deletedAt).toBeTruthy()
        expect(activityLogRows.find(row => row.action === 'stock_batch_deactivated')).toBeTruthy()
    })
})
