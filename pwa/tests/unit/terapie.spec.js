import { beforeEach, describe, expect, it, vi } from 'vitest'

const therapies = new Map()
const enqueueCalls = []
const activityLogRows = []

vi.mock('../../src/db', () => ({
    db: {
        therapies: {
            async put(row) {
                therapies.set(String(row.id), row)
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

import { deactivateTherapyRecord, upsertTherapy } from '../../src/services/terapie'

function resetStore() {
    therapies.clear()
    enqueueCalls.length = 0
    activityLogRows.length = 0
}

describe('terapie service audit', () => {
    beforeEach(() => {
        resetStore()
    })

    it('creates therapy and writes standard audit fields', async () => {
        const record = await upsertTherapy({
            existing: null,
            therapyId: 'therapy-1',
            form: {
                hostId: 'host-1',
                drugId: 'drug-1',
                dosePerSomministrazione: '1',
                somministrazioniGiornaliere: '2',
                consumoMedioSettimanale: '14',
                dataInizio: '2026-04-01',
                dataFine: '',
                note: 'test',
            },
            operatorId: 'op-admin',
        })

        expect(record.id).toBe('therapy-1')
        expect(therapies.get('therapy-1')?.hostId).toBe('host-1')
        expect(enqueueCalls).toContainEqual({ entityType: 'therapies', entityId: 'therapy-1', operation: 'upsert' })

        const createdAudit = activityLogRows.find(row => row.action === 'therapy_created')
        expect(createdAudit).toBeTruthy()
        expect(createdAudit?.entityType).toBe('therapies')
        expect(createdAudit?.entityId).toBe('therapy-1')
        expect(createdAudit?.deviceId).toBe('device-test')
        expect(createdAudit?.operatorId).toBe('op-admin')
        expect(typeof createdAudit?.ts).toBe('string')
    })

    it('updates therapy and writes update audit', async () => {
        const existing = {
            id: 'therapy-1',
            hostId: 'host-1',
            drugId: 'drug-1',
            updatedAt: '2026-04-01T00:00:00.000Z',
            deletedAt: null,
            syncStatus: 'synced',
        }

        await upsertTherapy({
            existing,
            therapyId: 'therapy-1',
            form: {
                hostId: 'host-2',
                drugId: 'drug-2',
                dosePerSomministrazione: '2',
                somministrazioniGiornaliere: '1',
                consumoMedioSettimanale: '7',
                dataInizio: '2026-04-02',
                dataFine: '',
                note: 'updated',
            },
            operatorId: 'op-editor',
        })

        expect(therapies.get('therapy-1')?.hostId).toBe('host-2')

        const updatedAudit = activityLogRows.find(row => row.action === 'therapy_updated')
        expect(updatedAudit).toBeTruthy()
        expect(updatedAudit?.entityType).toBe('therapies')
        expect(updatedAudit?.entityId).toBe('therapy-1')
        expect(updatedAudit?.deviceId).toBe('device-test')
        expect(updatedAudit?.operatorId).toBe('op-editor')
        expect(typeof updatedAudit?.ts).toBe('string')
    })

    it('auto-generates therapy ID when not provided', async () => {
        const record = await upsertTherapy({
            existing: null,
            form: {
                hostId: 'host-1',
                drugId: 'drug-1',
                dosePerSomministrazione: '1',
                somministrazioniGiornaliere: '1',
                consumoMedioSettimanale: '7',
                dataInizio: '2026-04-01',
                dataFine: '',
                note: '',
            },
            operatorId: 'op-admin',
        })

        expect(record.id.startsWith('therapy_')).toBe(true)
        expect(therapies.get(record.id)?.hostId).toBe('host-1')
    })

    it('deactivates therapy and writes deactivation audit', async () => {
        const therapy = {
            id: 'therapy-2',
            hostId: 'host-1',
            drugId: 'drug-1',
            attiva: true,
            deletedAt: null,
            syncStatus: 'synced',
        }

        const updated = await deactivateTherapyRecord({
            therapy,
            operatorId: 'op-admin',
        })

        expect(updated.attiva).toBe(false)
        expect(updated.deletedAt).toBeTruthy()
        expect(enqueueCalls).toContainEqual({ entityType: 'therapies', entityId: 'therapy-2', operation: 'upsert' })

        const deletedAudit = activityLogRows.find(row => row.action === 'therapy_deactivated')
        expect(deletedAudit).toBeTruthy()
        expect(deletedAudit?.entityType).toBe('therapies')
        expect(deletedAudit?.entityId).toBe('therapy-2')
        expect(deletedAudit?.deviceId).toBe('device-test')
        expect(deletedAudit?.operatorId).toBe('op-admin')
        expect(typeof deletedAudit?.ts).toBe('string')
    })
})
