import { beforeEach, describe, expect, it, vi } from 'vitest'

const movements = new Map()
const enqueueCalls = []
const activityLogRows = []

vi.mock('../../src/db', () => ({
    db: {
        movements: {
            async put(row) {
                movements.set(String(row.id), row)
            },
        },
        syncQueue: {
            async add() {
                return null
            },
        },
        activityLog: {
            async add(row) {
                activityLogRows.push(row)
            },
        },
        async transaction(_mode, ...args) {
            const callback = args.at(-1)
            await callback()
        },
    },
    async enqueue(entityType, entityId, operation = 'upsert') {
        enqueueCalls.push({ entityType, entityId, operation })
    },
    async getSetting(key, fallback = null) {
        if (key === 'deviceId') return 'device-test'
        return fallback
    },
}))

import { softDeleteMovement, upsertMovement } from '../../src/services/movimenti'

function resetStore() {
    movements.clear()
    enqueueCalls.length = 0
    activityLogRows.length = 0
}

describe('movimenti service audit', () => {
    beforeEach(() => {
        resetStore()
    })

    it('creates movement and writes standard audit fields', async () => {
        const record = await upsertMovement({
            existing: null,
            movementId: 'mov-1',
            form: {
                stockBatchId: 'batch-1',
                tipoMovimento: 'scarico',
                quantita: 3,
                hostId: 'host-1',
                therapyId: 'therapy-1',
                note: 'test',
            },
            selectedBatch: {
                id: 'batch-1',
                drugId: 'drug-1',
            },
            movementDate: '2026-04-05T10:00:00.000Z',
            operatorId: 'op-admin',
        })

        expect(record.id).toBe('mov-1')
        expect(record.quantita).toBe(3)
        expect(movements.get('mov-1')?.drugId).toBe('drug-1')
        expect(enqueueCalls).toContainEqual({ entityType: 'movements', entityId: 'mov-1', operation: 'upsert' })

        const createdAudit = activityLogRows.find(row => row.action === 'movement_created')
        expect(createdAudit).toBeTruthy()
        expect(createdAudit?.entityType).toBe('movements')
        expect(createdAudit?.entityId).toBe('mov-1')
        expect(createdAudit?.deviceId).toBe('device-test')
        expect(createdAudit?.operatorId).toBe('op-admin')
        expect(typeof createdAudit?.ts).toBe('string')
    })

    it('updates movement and writes update audit', async () => {
        const existing = {
            id: 'mov-1',
            stockBatchId: 'batch-1',
            drugId: 'drug-1',
            quantita: 1,
            updatedAt: '2026-04-01T00:00:00.000Z',
            deletedAt: null,
            syncStatus: 'synced',
        }

        await upsertMovement({
            existing,
            movementId: 'mov-1',
            form: {
                stockBatchId: 'batch-1',
                tipoMovimento: 'carico',
                quantita: 6,
                hostId: '',
                therapyId: '',
                note: 'updated',
            },
            selectedBatch: {
                id: 'batch-1',
                drugId: 'drug-1',
            },
            movementDate: '2026-04-05T12:00:00.000Z',
            operatorId: 'op-editor',
        })

        expect(movements.get('mov-1')?.tipoMovimento).toBe('carico')
        expect(movements.get('mov-1')?.quantita).toBe(6)

        const updatedAudit = activityLogRows.find(row => row.action === 'movement_updated')
        expect(updatedAudit).toBeTruthy()
        expect(updatedAudit?.entityType).toBe('movements')
        expect(updatedAudit?.entityId).toBe('mov-1')
        expect(updatedAudit?.deviceId).toBe('device-test')
        expect(updatedAudit?.operatorId).toBe('op-editor')
        expect(typeof updatedAudit?.ts).toBe('string')
    })

    it('auto-generates movement ID when not provided', async () => {
        const record = await upsertMovement({
            existing: null,
            form: {
                stockBatchId: 'batch-1',
                tipoMovimento: 'scarico',
                quantita: 2,
                hostId: '',
                therapyId: '',
                note: '',
            },
            selectedBatch: {
                id: 'batch-1',
                drugId: 'drug-1',
            },
            movementDate: '2026-04-05T13:00:00.000Z',
            operatorId: 'op-admin',
        })

        expect(record.id.startsWith('movement_')).toBe(true)
        expect(movements.get(record.id)?.quantita).toBe(2)
    })

    it('soft deletes movement and writes delete audit', async () => {
        const movement = {
            id: 'mov-2',
            stockBatchId: 'batch-2',
            syncStatus: 'synced',
            deletedAt: null,
        }

        await softDeleteMovement({
            movement,
            operatorId: 'op-admin',
        })

        expect(movements.get('mov-2')?.deletedAt).toBeTruthy()
        expect(enqueueCalls).toContainEqual({ entityType: 'movements', entityId: 'mov-2', operation: 'upsert' })

        const deletedAudit = activityLogRows.find(row => row.action === 'movement_deleted')
        expect(deletedAudit).toBeTruthy()
        expect(deletedAudit?.entityType).toBe('movements')
        expect(deletedAudit?.entityId).toBe('mov-2')
        expect(deletedAudit?.deviceId).toBe('device-test')
        expect(deletedAudit?.operatorId).toBe('op-admin')
        expect(typeof deletedAudit?.ts).toBe('string')
    })
})
