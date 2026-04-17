import { beforeEach, describe, expect, it, vi } from 'vitest'

const hosts = new Map()
const therapies = new Map()
const rooms = new Map()
const beds = new Map()
const enqueueCalls = []
const activityLogRows = []

vi.mock('../../src/db', () => ({
    db: {
        hosts: {
            async get(id) {
                return hosts.get(String(id))
            },
            async toArray() {
                return Array.from(hosts.values())
            },
            async put(row) {
                hosts.set(String(row.id), row)
            },
        },
        rooms: {
            async get(id) {
                return rooms.get(String(id))
            },
            async put(row) {
                rooms.set(String(row.id), row)
            },
        },
        beds: {
            async get(id) {
                return beds.get(String(id))
            },
            async put(row) {
                beds.set(String(row.id), row)
            },
        },
        therapies: {
            async toArray() {
                return Array.from(therapies.values())
            },
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

import {
    buildHostRows,
    createHost,
    deleteHost,
    formatHostDisplay,
    updateHost,
} from '../../src/services/ospiti'

function resetStore() {
    hosts.clear()
    therapies.clear()
    rooms.clear()
    beds.clear()
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
        rooms.set('room-1', {
            id: 'room-1',
            codice: 'Via Bellani',
            metadata: { maxOspiti: 2 },
            deletedAt: null,
        })
        rooms.set('room-2', {
            id: 'room-2',
            codice: 'Il Rifugio',
            metadata: { maxOspiti: 2 },
            deletedAt: null,
        })
        rooms.set('room-3', {
            id: 'room-3',
            codice: 'Residenza 3',
            metadata: { maxOspiti: 2 },
            deletedAt: null,
        })
        beds.set('bed-1', { id: 'bed-1', roomId: 'room-1', numero: 1, deletedAt: null })
        beds.set('bed-2', { id: 'bed-2', roomId: 'room-2', numero: 2, deletedAt: null })
        beds.set('bed-3', { id: 'bed-3', roomId: 'room-3', numero: 3, deletedAt: null })
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
        const createdAudit = activityLogRows.find(row => row.action === 'host_created')
        expect(createdAudit).toBeTruthy()
        expect(createdAudit?.deviceId).toBe('device-test')
        expect(createdAudit?.operatorId).toBe('op-admin')
        expect(typeof createdAudit?.ts).toBe('string')
    })

    it('createHost auto-generates ID when missing', async () => {
        const record = await createHost({
            codiceInterno: 'OSP-012',
            iniziali: 'A.B.',
            nome: 'Anna',
            cognome: 'Blu',
            operatorId: 'op-admin',
        })

        expect(record.id.startsWith('host_')).toBe(true)
        expect(hosts.get(record.id)?.nome).toBe('Anna')
        expect(enqueueCalls).toContainEqual({ entityType: 'hosts', entityId: record.id, operation: 'upsert' })
    })

    it('createHost rejects duplicate codiceInterno among active hosts', async () => {
        await expect(createHost({
            id: 'host-duplicate-code',
            codiceInterno: 'OSP-010',
            iniziali: 'X.Y.',
            nome: 'Xenia',
            cognome: 'Yale',
            roomId: 'room-2',
            operatorId: 'op-admin',
        })).rejects.toThrow('codice interno duplicato')
    })

    it('allows createHost with same codiceInterno after original host deletion', async () => {
        await deleteHost({ hostId: 'host-existing', operatorId: 'op-admin' })

        const recreated = await createHost({
            id: 'host-recreated',
            codiceInterno: 'OSP-010',
            iniziali: 'R.C.',
            nome: 'Riccardo',
            cognome: 'Conti',
            roomId: 'room-2',
            operatorId: 'op-admin',
        })

        expect(recreated.id).toBe('host-recreated')
    })

    it('createHost blocks when selected residenza is already full', async () => {
        hosts.set('host-2', {
            id: 'host-2',
            codiceInterno: 'OSP-020',
            roomId: 'room-1',
            bedId: null,
            attivo: true,
            deletedAt: null,
        })

        await expect(createHost({
            id: 'host-over-capacity',
            codiceInterno: 'OSP-021',
            nome: 'Mario',
            cognome: 'Neri',
            roomId: 'room-1',
            operatorId: 'op-admin',
        })).rejects.toThrow("capienza massima residenza raggiunta")
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
        const updatedAudit = activityLogRows.find(row => row.action === 'host_updated')
        expect(updatedAudit).toBeTruthy()
        expect(updatedAudit?.deviceId).toBe('device-test')
        expect(updatedAudit?.operatorId).toBe('op-admin')
        expect(typeof updatedAudit?.ts).toBe('string')
    })

    it('updateHost blocks moving host into a full residenza', async () => {
        hosts.set('host-room-2-a', {
            id: 'host-room-2-a',
            codiceInterno: 'OSP-030',
            roomId: 'room-2',
            bedId: null,
            attivo: true,
            deletedAt: null,
        })
        hosts.set('host-room-2-b', {
            id: 'host-room-2-b',
            codiceInterno: 'OSP-031',
            roomId: 'room-2',
            bedId: null,
            attivo: true,
            deletedAt: null,
        })

        await expect(updateHost({
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
            roomId: 'room-2',
            bedId: null,
            stanza: 'B',
            letto: '',
            note: 'Aggiornato',
            operatorId: 'op-admin',
        })).rejects.toThrow("capienza massima residenza raggiunta")
    })

    it('updateHost clears stale bedId when bed does not belong to selected residenza', async () => {
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
            roomId: 'room-2',
            bedId: 'bed-1',
            stanza: 'B',
            letto: '1',
            note: 'Aggiornato',
            operatorId: 'op-admin',
        })

        expect(updated.roomId).toBe('room-2')
        expect(updated.bedId).toBeNull()
    })

    it('deleteHost performs soft-delete and enqueues delete', async () => {
        therapies.set('therapy-active', {
            id: 'therapy-active',
            hostId: 'host-existing',
            dataFine: null,
            deletedAt: null,
            attiva: true,
            syncStatus: 'synced',
        })

        const deleted = await deleteHost({
            hostId: 'host-existing',
            operatorId: 'op-admin',
        })

        expect(deleted.attivo).toBe(false)
        expect(deleted.deletedAt).toBeTruthy()
        expect(hosts.get('host-existing')?.roomId).toBeNull()
        expect(hosts.get('host-existing')?.bedId).toBeNull()
        expect(therapies.get('therapy-active')?.deletedAt).toBeTruthy()
        expect(therapies.get('therapy-active')?.attiva).toBe(false)
        expect(hosts.get('host-existing')?.syncStatus).toBe('pending')
        expect(enqueueCalls).toContainEqual({ entityType: 'hosts', entityId: 'host-existing', operation: 'delete' })
        expect(enqueueCalls).toContainEqual({ entityType: 'therapies', entityId: 'therapy-active', operation: 'upsert' })
        const deletedAudit = activityLogRows.find(row => row.action === 'host_deleted')
        const therapyCascadeAudit = activityLogRows.find(row => row.action === 'therapy_deactivated_due_host_delete')
        expect(deletedAudit).toBeTruthy()
        expect(therapyCascadeAudit).toBeTruthy()
        expect(deletedAudit?.deviceId).toBe('device-test')
        expect(deletedAudit?.operatorId).toBe('op-admin')
        expect(typeof deletedAudit?.ts).toBe('string')
    })

    it('deleteHost cascades when host has active therapies', async () => {
        therapies.set('therapy-active', {
            id: 'therapy-active',
            hostId: 'host-existing',
            dataFine: null,
            deletedAt: null,
            attiva: true,
        })

        const deleted = await deleteHost({
            hostId: 'host-existing',
            operatorId: 'op-admin',
        })

        expect(deleted.deletedAt).toBeTruthy()
        expect(therapies.get('therapy-active')?.deletedAt).toBeTruthy()
        expect(activityLogRows.find(row => row.action === 'host_deleted')).toBeTruthy()
        expect(activityLogRows.find(row => row.action === 'therapy_deactivated_due_host_delete')).toBeTruthy()
    })

    it('deleteHost allows deletion when therapies are historical', async () => {
        therapies.set('therapy-ended', {
            id: 'therapy-ended',
            hostId: 'host-existing',
            dataFine: '2026-03-01',
            deletedAt: null,
            attiva: false,
        })

        const deleted = await deleteHost({
            hostId: 'host-existing',
            operatorId: 'op-admin',
        })

        expect(deleted.deletedAt).toBeTruthy()
        expect(activityLogRows.find(row => row.action === 'host_deleted')).toBeTruthy()
    })
})
