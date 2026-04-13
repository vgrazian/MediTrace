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
    })

    it('creates prefixed IDs and consistent foreign keys', () => {
        const generated = generateRealisticSeedData()

        const roomIds = new Set(generated.rooms.map(row => row.id))
        const bedIds = new Set(generated.beds.map(row => row.id))
        const hostIds = new Set(generated.hosts.map(row => row.id))
        const drugIds = new Set(generated.drugs.map(row => row.id))
        const batchIds = new Set(generated.stockBatches.map(row => row.id))
        const therapyIds = new Set(generated.therapies.map(row => row.id))

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
})
