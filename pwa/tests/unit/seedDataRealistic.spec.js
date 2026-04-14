import { describe, expect, it, vi } from 'vitest'
import realisticDataset from '../../src/data/realisticDataset.json'

vi.mock('../../src/db', () => ({
    db: {},
    async getSetting() {
        return null
    },
    async setSetting() {
        return null
    },
}))

import {
    generateRealisticSeedData,
    validateRealisticDataset,
} from '../../src/services/seedDataRealistic'

function cloneDataset(dataset) {
    return JSON.parse(JSON.stringify(dataset))
}

describe('seedDataRealistic dataset validation', () => {
    it('accepts the committed realistic dataset', () => {
        const result = validateRealisticDataset(realisticDataset)
        expect(result.valid).toBe(true)
        expect(result.errors).toHaveLength(0)
    })

    it('rejects missing required keys/fields', () => {
        const invalid = cloneDataset(realisticDataset)
        invalid.rooms = []
        delete invalid.hosts[0].nome

        const result = validateRealisticDataset(invalid)

        expect(result.valid).toBe(false)
        expect(result.errors.some(error => error.includes("rooms non puo' essere vuoto"))).toBe(true)
        expect(result.errors.some(error => error.includes("hosts[0].nome e' obbligatorio"))).toBe(true)
    })

    it('rejects broken references', () => {
        const invalid = cloneDataset(realisticDataset)
        invalid.beds[0].roomId = 9999
        invalid.hosts[0].bedId = 9999
        invalid.therapies[0].hostId = 9999

        const result = validateRealisticDataset(invalid)

        expect(result.valid).toBe(false)
        expect(result.errors.some(error => error.includes('beds[0].roomId deve riferire una room esistente'))).toBe(true)
        expect(result.errors.some(error => error.includes('hosts[0].bedId deve riferire un letto esistente'))).toBe(true)
        expect(result.errors.some(error => error.includes('therapies[0].hostId deve riferire un host esistente'))).toBe(true)
    })
})

describe('seedDataRealistic mapping', () => {
    it('maps dataset entities and preserves cardinality', () => {
        const generated = generateRealisticSeedData()

        expect(generated.rooms).toHaveLength(4)
        expect(generated.beds).toHaveLength(12)
        expect(generated.hosts).toHaveLength(9)
        expect(generated.drugs).toHaveLength(12)
        expect(generated.stockBatches.length).toBeGreaterThanOrEqual(12)
        expect(generated.therapies.length).toBeGreaterThanOrEqual(12)
        expect(generated.movements.length).toBeGreaterThanOrEqual(12)
        expect(generated.reminders.length).toBeGreaterThanOrEqual(12)
        expect(generated.activityLog.length).toBeGreaterThanOrEqual(20)
    })

    it('creates prefixed IDs and consistent foreign keys', () => {
        const generated = generateRealisticSeedData()

        const roomIds = new Set(generated.rooms.map(row => row.id))
        const bedIds = new Set(generated.beds.map(row => row.id))
        const hostIds = new Set(generated.hosts.map(row => row.id))
        const drugIds = new Set(generated.drugs.map(row => row.id))
        const batchIds = new Set(generated.stockBatches.map(row => row.id))
        const therapyIds = new Set(generated.therapies.map(row => row.id))
        const movementIds = new Set(generated.movements.map(row => row.id))
        const reminderIds = new Set(generated.reminders.map(row => row.id))

        for (const room of generated.rooms) {
            expect(room.id.startsWith('__realistic__room-')).toBe(true)
        }
        for (const bed of generated.beds) {
            expect(bed.id.startsWith('__realistic__bed-')).toBe(true)
            expect(roomIds.has(bed.roomId)).toBe(true)
        }
        for (const host of generated.hosts) {
            expect(host.id.startsWith('__realistic__host-')).toBe(true)
            expect(roomIds.has(host.roomId)).toBe(true)
            expect(bedIds.has(host.bedId)).toBe(true)
        }
        for (const therapy of generated.therapies) {
            expect(therapy.id.startsWith('__realistic__therapy-')).toBe(true)
            expect(hostIds.has(therapy.hostId)).toBe(true)
            expect(drugIds.has(therapy.drugId)).toBe(true)
            if (therapy.stockBatchId) {
                expect(batchIds.has(therapy.stockBatchId)).toBe(true)
            }
        }

        for (const movement of generated.movements) {
            expect(movement.id.startsWith('__realistic__mov-')).toBe(true)
            if (movement.drugId) expect(drugIds.has(movement.drugId)).toBe(true)
            if (movement.hostId) expect(hostIds.has(movement.hostId)).toBe(true)
            if (movement.therapyId) expect(therapyIds.has(movement.therapyId)).toBe(true)
            if (movement.stockBatchId) expect(batchIds.has(movement.stockBatchId)).toBe(true)
        }

        for (const reminder of generated.reminders) {
            expect(reminder.id.startsWith('__realistic__rem-')).toBe(true)
            expect(hostIds.has(reminder.hostId)).toBe(true)
            expect(drugIds.has(reminder.drugId)).toBe(true)
            expect(therapyIds.has(reminder.therapyId)).toBe(true)
        }

        const allowedAuditEntityTypes = new Set(['rooms', 'beds', 'hosts', 'drugs', 'stockBatches', 'therapies', 'movements', 'reminders'])
        for (const event of generated.activityLog) {
            expect(allowedAuditEntityTypes.has(event.entityType)).toBe(true)
            expect(typeof event.action).toBe('string')
            expect(String(event.action).length).toBeGreaterThan(0)
            if (event.entityType === 'movements') expect(movementIds.has(event.entityId)).toBe(true)
            if (event.entityType === 'reminders') expect(reminderIds.has(event.entityId)).toBe(true)
            if (event.entityType === 'therapies') expect(therapyIds.has(event.entityId)).toBe(true)
            if (event.entityType === 'drugs') expect(drugIds.has(event.entityId)).toBe(true)
            if (event.entityType === 'hosts') expect(hostIds.has(event.entityId)).toBe(true)
        }
    })

    it('ensures unique ospite names and one-bed-per-ospite allocation', () => {
        const generated = generateRealisticSeedData()

        const fullNames = generated.hosts
            .map(host => `${host.cognome} ${host.nome}`.trim().toLowerCase())
            .filter(Boolean)
        const uniqueNames = new Set(fullNames)
        expect(uniqueNames.size).toBe(fullNames.length)

        const bedIds = generated.hosts.map(host => host.bedId).filter(Boolean)
        const uniqueBedIds = new Set(bedIds)
        expect(uniqueBedIds.size).toBe(bedIds.length)
    })

    it('generates stock batches with non-zero and variable active quantities', () => {
        const generated = generateRealisticSeedData()

        const quantities = generated.stockBatches
            .map(batch => Number(batch.quantitaAttuale))
            .filter(Number.isFinite)

        expect(quantities.length).toBe(generated.stockBatches.length)
        expect(quantities.every(qty => qty > 0)).toBe(true)

        const uniqueQuantities = new Set(quantities)
        expect(uniqueQuantities.size).toBeGreaterThan(1)

        expect(generated.stockBatches.every(batch => Number.isFinite(Number(batch.sogliaRiordino)))).toBe(true)
    })

    it('generates variable therapies, movements and reminder states for realistic demo UX', () => {
        const generated = generateRealisticSeedData()

        const therapyFrequencies = new Set(generated.therapies.map(item => Number(item.somministrazioniGiornaliere)))
        const therapyDoses = new Set(generated.therapies.map(item => Number(item.dosePerSomministrazione)))
        expect(therapyFrequencies.size).toBeGreaterThan(1)
        expect(therapyDoses.size).toBeGreaterThan(1)

        const movementTypes = new Set(generated.movements.map(item => item.tipoMovimento))
        const movementQuantities = new Set(generated.movements.map(item => Number(item.quantita)))
        expect(movementTypes.has('CARICO')).toBe(true)
        expect(movementTypes.has('SCARICO') || movementTypes.has('SOMMINISTRAZIONE')).toBe(true)
        expect(movementTypes.size).toBeGreaterThan(2)
        expect(movementQuantities.size).toBeGreaterThan(3)

        const reminderStates = new Set(generated.reminders.map(item => item.stato))
        expect(reminderStates.has('ESEGUITO')).toBe(true)
        expect(reminderStates.has('DA_ESEGUIRE')).toBe(true)
        expect(reminderStates.has('POSTICIPATO')).toBe(true)
        expect(reminderStates.has('SALTATO')).toBe(true)
    })

    it('generates at least 12 reminders for today and human-readable therapy labels', () => {
        const generated = generateRealisticSeedData()
        const now = new Date()
        const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

        const todayReminders = generated.reminders.filter((item) => String(item.scheduledAt || '').slice(0, 10) === todayKey)
        expect(todayReminders.length).toBeGreaterThanOrEqual(12)

        const realisticLabels = generated.therapies
            .map((item) => String(item.nomeTerapia || item.note || '').toLowerCase())
            .filter(Boolean)

        expect(realisticLabels.some((label) => label.includes('controllo') || label.includes('supporto') || label.includes('terapia'))).toBe(true)
        expect(realisticLabels.some((label) => label.includes('__realistic__therapy-'))).toBe(false)
    })
})
