import { beforeEach, describe, expect, it, vi } from 'vitest'

const tableMaps = {
    drugs: new Map(),
    hosts: new Map(),
    stockBatches: new Map(),
    therapies: new Map(),
    movements: new Map(),
    reminders: new Map(),
}

const puts = {
    hosts: [],
    drugs: [],
    stockBatches: [],
    therapies: [],
    movements: [],
    reminders: [],
}

const enqueueCalls = []
const activityLogRows = []

function makeTable(name) {
    return {
        async put(row) {
            tableMaps[name].set(String(row.id), row)
            puts[name].push(row)
        },
        toCollection() {
            return {
                async primaryKeys() {
                    return Array.from(tableMaps[name].keys())
                },
            }
        },
    }
}

vi.mock('../../src/db', () => ({
    db: {
        hosts: makeTable('hosts'),
        drugs: makeTable('drugs'),
        stockBatches: makeTable('stockBatches'),
        therapies: makeTable('therapies'),
        movements: makeTable('movements'),
        reminders: makeTable('reminders'),
        syncQueue: {
            async add() { },
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
        if (key === 'deviceId') return 'test-device-1'
        return fallback
    },
}))

import { importCsv, listSupportedImportSources } from '../../src/services/csvImport'

function resetStoreState() {
    for (const table of Object.values(tableMaps)) table.clear()
    for (const key of Object.keys(puts)) puts[key] = []
    enqueueCalls.length = 0
    activityLogRows.length = 0
}

describe('csv import schemas', () => {
    beforeEach(() => {
        resetStoreState()
        tableMaps.drugs.set('drug-1', { id: 'drug-1' })
        tableMaps.hosts.set('host-1', { id: 'host-1' })
        tableMaps.stockBatches.set('batch-1', { id: 'batch-1' })
        tableMaps.therapies.set('therapy-1', { id: 'therapy-1' })
    })

    it('exposes expected v1 csv sources', () => {
        const sources = listSupportedImportSources()

        expect(sources).toContain('01_CatalogoFarmaci.csv')
        expect(sources).toContain('02_ConfezioniMagazzino.csv')
        expect(sources).toContain('03_Ospiti.csv')
        expect(sources).toContain('04_TerapieAttive.csv')
        expect(sources).toContain('05_Movimenti.csv')
        expect(sources).toContain('09_PromemoriaSomministrazioni.csv')
    })

    it('has no duplicate source names', () => {
        const sources = listSupportedImportSources()
        const unique = new Set(sources)
        expect(unique.size).toBe(sources.length)
    })

    it('imports hosts in dry-run mode without persisting rows', async () => {
        const result = await importCsv({
            sourceName: '03_Ospiti.csv',
            dryRun: true,
            csvText: [
                '\uFEFFguest_id,codice_interno,attivo',
                'guest-1,OSP-001,si',
            ].join('\n'),
        })

        expect(result.acceptedRows).toBe(1)
        expect(result.rejectedRows).toBe(0)
        expect(result.dryRun).toBe(true)
        expect(puts.hosts.length).toBe(0)
        expect(enqueueCalls.length).toBe(0)
    })

    it('imports hosts in apply mode and persists activity log', async () => {
        const result = await importCsv({
            sourceName: '03_Ospiti.csv',
            dryRun: false,
            operatorId: 'op-1',
            csvText: [
                'guest_id,codice_interno,attivo,updated_at',
                'guest-2,OSP-002,true,2026-04-04T10:00:00.000Z',
            ].join('\n'),
        })

        expect(result.acceptedRows).toBe(1)
        expect(puts.hosts.length).toBe(1)
        expect(enqueueCalls).toEqual([{ entityType: 'hosts', entityId: 'guest-2', operation: 'upsert' }])
        expect(activityLogRows.length).toBe(1)
        expect(activityLogRows[0].action).toBe('csv_import_apply')
    })

    it('rejects malformed numeric fields', async () => {
        const result = await importCsv({
            sourceName: '01_CatalogoFarmaci.csv',
            dryRun: true,
            csvText: [
                'drug_id,principio_attivo,scorta_minima_default',
                'drug-2,Ibuprofene,not-a-number',
            ].join('\n'),
        })

        expect(result.acceptedRows).toBe(0)
        expect(result.rejectedRows).toBe(1)
        expect(result.rejects[0].reason).toContain('Campo numerico non valido')
    })

    it('rejects rows with broken references in therapies', async () => {
        const result = await importCsv({
            sourceName: '04_TerapieAttive.csv',
            dryRun: true,
            csvText: [
                'therapy_id,guest_id,drug_id,updated_at',
                'therapy-missing-ref,host-missing,drug-1,2026-04-04T10:00:00.000Z',
            ].join('\n'),
        })

        expect(result.acceptedRows).toBe(0)
        expect(result.rejectedRows).toBe(1)
        expect(result.rejects[0].reason).toContain('Riferimento non trovato')
    })

    it('throws on missing required headers', async () => {
        await expect(importCsv({
            sourceName: '03_Ospiti.csv',
            dryRun: true,
            csvText: [
                'guest_id,altro_campo',
                'guest-3,foo',
            ].join('\n'),
        })).rejects.toThrow('Header mancanti')
    })
})
