import { beforeEach, describe, expect, it, vi } from 'vitest'

const hosts = []
const drugs = []
const therapies = []
const movements = []
const reminders = []

vi.mock('../../src/db', () => ({
    db: {
        hosts: { async toArray() { return hosts } },
        drugs: { async toArray() { return drugs } },
        therapies: { async toArray() { return therapies } },
        movements: { async toArray() { return movements } },
        reminders: { async toArray() { return reminders } },
        activityLog: {
            async count() { return 0 },
            async toArray() { return [] },
            reverse() {
                return {
                    limit() {
                        return {
                            async toArray() { return [] },
                        }
                    },
                }
            },
        },
    },
}))

import { buildAuditReferences, enrichAuditEvents, filterAuditEvents } from '../../src/services/auditLog'

function resetFixtures() {
    hosts.length = 0
    drugs.length = 0
    therapies.length = 0
    movements.length = 0
    reminders.length = 0
}

describe('audit log enrichment and filters', () => {
    beforeEach(() => {
        resetFixtures()
        hosts.push({ id: 'host-1', codiceInterno: 'OSP-01', nome: 'Mario', cognome: 'Rossi' })
        drugs.push({ id: 'drug-1', nomeFarmaco: 'Paracetamolo', principioAttivo: 'Paracetamolo' })
        therapies.push({ id: 'therapy-1', hostId: 'host-1', drugId: 'drug-1' })
        movements.push({ id: 'mov-1', hostId: 'host-1', therapyId: 'therapy-1', drugId: 'drug-1' })
        reminders.push({ id: 'rem-1', hostId: 'host-1', therapyId: 'therapy-1', drugId: 'drug-1' })
    })

    it('arricchisce eventi con riferimenti ospite/farmaco/terapia', async () => {
        const refs = await buildAuditReferences()
        const events = [
            { id: 1, entityType: 'therapies', entityId: 'therapy-1', action: 'therapy_created', operatorId: 'admin', ts: '2026-04-11T08:00:00.000Z' },
            { id: 2, entityType: 'movements', entityId: 'mov-1', action: 'movement_recorded', operatorId: 'admin', ts: '2026-04-11T09:00:00.000Z' },
            { id: 3, entityType: 'reminders', entityId: 'rem-1', action: 'reminder_eseguito', operatorId: 'op-1', ts: '2026-04-11T10:00:00.000Z' },
        ]

        const enriched = enrichAuditEvents(events, refs)

        expect(enriched[0].hostId).toBe('host-1')
        expect(enriched[0].drugId).toBe('drug-1')
        expect(enriched[0].therapyId).toBe('therapy-1')
        expect(enriched[0].hostLabel).toContain('OSP-01')
        expect(enriched[0].drugLabel).toContain('Paracetamolo')

        expect(enriched[1].hostId).toBe('host-1')
        expect(enriched[2].therapyId).toBe('therapy-1')
    })

    it('filtra eventi per operatore, ospite, farmaco, terapia e periodo', async () => {
        const refs = await buildAuditReferences()
        const events = enrichAuditEvents([
            { id: 1, entityType: 'therapies', entityId: 'therapy-1', action: 'therapy_created', operatorId: 'op-1', ts: '2026-04-10T08:00:00.000Z' },
            { id: 2, entityType: 'hosts', entityId: 'host-1', action: 'host_updated', operatorId: 'admin', ts: '2026-04-11T08:00:00.000Z' },
            { id: 3, entityType: 'drugs', entityId: 'drug-1', action: 'drug_updated', operatorId: 'op-1', ts: '2026-04-12T08:00:00.000Z' },
        ], refs)

        const filtered = filterAuditEvents(events, {
            operator: 'op-1',
            host: 'rossi',
            drug: 'paracetamolo',
            therapy: 'therapy-1',
            fromDate: '2026-04-09',
            toDate: '2026-04-11',
        })

        expect(filtered).toHaveLength(1)
        expect(filtered[0].id).toBe(1)
    })
})
