import { beforeEach, describe, expect, it, vi } from 'vitest'

const hosts = new Map()
const enqueueCalls = []
const activityLogRows = []

vi.mock('../../src/db', () => ({
    db: {
        hosts: {
            async get(id) {
                return hosts.get(String(id))
            },
            async put(row) {
                hosts.set(String(row.id), row)
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
}))

import {
    buildHostRows,
    createHost,
    deleteHost,
    formatHostDisplay,
    updateHost,
} from '../../src/services/ospiti'

function resetStore() {
    hosts.clear()
    enqueueCalls.length = 0
    activityLogRows.length = 0
}

describe('ospiti helpers', () => {
    beforeEach(() => {
        resetStore()
    })

    it('buildHostRows filters deleted/inactive and computes active therapies', () => {
        const rows = buildHostRows({
            hosts: [
                { id: 'h1', codiceInterno: 'OSP-001', attivo: true, deletedAt: null },
                { id: 'h2', codiceInterno: 'OSP-002', attivo: false, deletedAt: null },
                { id: 'h3', codiceInterno: 'OSP-003', attivo: true, deletedAt: '2026-01-01T00:00:00.000Z' },
            ],
            therapies: [
                { id: 't1', hostId: 'h1', dataFine: null, deletedAt: null },
                { id: 't2', hostId: 'h1', dataFine: null, deletedAt: null },
                { id: 't3', hostId: 'h1', dataFine: '2026-01-01', deletedAt: null },
                { id: 't4', hostId: 'h2', dataFine: null, deletedAt: null },
            ],
            showAll: false,
        })

        expect(rows).toHaveLength(1)
        expect(rows[0].id).toBe('h1')
        expect(rows[0].activeTherapies).toBe(2)
    })

    it('formatHostDisplay prefers codiceInterno and full name', () => {
        const label = formatHostDisplay({
            id: 'host-1',
            codiceInterno: 'OSP-001',
            nome: 'Mario',
            cognome: 'Rossi',
            iniziali: 'M.R.',
        })

        expect(label).toBe('[OSP-001] - Rossi Mario')
    })
})

describe('ospiti service CRUD', () => {
    beforeEach(() => {
        resetStore()
        hosts.set('host-existing', {
            id: 'host-existing',
            codiceInterno: 'OSP-010',
            iniziali: 'L.B.',
            nome: 'Luca',
            cognome: 'Bianchi',
            luogoNascita: 'Roma',
            dataNascita: '1940-01-01',
            sesso: 'M',
            codiceFiscale: 'BNCLCU40A01H501U',
            patologie: 'Ipertensione',
            roomId: 'room-1',
            bedId: 'bed-1',
            stanza: 'A',
            letto: '1',
            note: '',
            attivo: true,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
            deletedAt: null,
            syncStatus: 'synced',
        })
    })

    it('createHost persists full anagrafica and enqueues sync', async () => {
        const record = await createHost({
            id: 'host-new',
            codiceInterno: 'OSP-011',
            iniziali: 'C.N.',
            nome: 'Carla',
            cognome: 'Neri',
            luogoNascita: 'Milano',
            dataNascita: '1942-03-10',
            sesso: 'F',
            codiceFiscale: 'NRECRL42C50F205X',
            patologie: 'Diabete',
            roomId: 'room-2',
            bedId: 'bed-2',
            stanza: 'B',
            letto: '2',
            note: 'Note test',
            operatorId: 'op-admin',
        })

        expect(record.nome).toBe('Carla')
        expect(record.cognome).toBe('Neri')
        expect(record.patologie).toBe('Diabete')
        expect(hosts.get('host-new')?.codiceFiscale).toBe('NRECRL42C50F205X')
        expect(enqueueCalls).toContainEqual({ entityType: 'hosts', entityId: 'host-new', operation: 'upsert' })
        expect(activityLogRows.some(row => row.action === 'host_created')).toBe(true)
    })

    it('updateHost updates anagrafica fields and enqueues upsert', async () => {
        const updated = await updateHost({
            hostId: 'host-existing',
            codiceInterno: 'OSP-010A',
            iniziali: 'L.B.',
            nome: 'Luca Mod',
            cognome: 'Bianchi Mod',
            luogoNascita: 'Torino',
            dataNascita: '1941-02-02',
            sesso: 'M',
            codiceFiscale: 'BNCLCU41B02L219Y',
            patologie: 'Ipertensione, BPCO',
            roomId: 'room-3',
            bedId: 'bed-3',
            stanza: 'C',
            letto: '3',
            note: 'Aggiornato',
            operatorId: 'op-admin',
        })

        expect(updated.codiceInterno).toBe('OSP-010A')
        expect(updated.nome).toBe('Luca Mod')
        expect(updated.cognome).toBe('Bianchi Mod')
        expect(updated.patologie).toBe('Ipertensione, BPCO')
        expect(hosts.get('host-existing')?.roomId).toBe('room-3')
        expect(enqueueCalls).toContainEqual({ entityType: 'hosts', entityId: 'host-existing', operation: 'upsert' })
        expect(activityLogRows.some(row => row.action === 'host_updated')).toBe(true)
    })

    it('deleteHost performs soft-delete and enqueues delete', async () => {
        const deleted = await deleteHost({
            hostId: 'host-existing',
            operatorId: 'op-admin',
        })

        expect(deleted.attivo).toBe(false)
        expect(deleted.deletedAt).toBeTruthy()
        expect(hosts.get('host-existing')?.syncStatus).toBe('pending')
        expect(enqueueCalls).toContainEqual({ entityType: 'hosts', entityId: 'host-existing', operation: 'delete' })
        expect(activityLogRows.some(row => row.action === 'host_deactivated')).toBe(true)
    })
})
