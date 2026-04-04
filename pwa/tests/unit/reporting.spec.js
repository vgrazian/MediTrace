import { beforeEach, describe, expect, it, vi } from 'vitest'

const data = {
    drugs: [],
    stockBatches: [],
    movements: [],
    therapies: [],
}

vi.mock('../../src/db', () => ({
    db: {
        drugs: { async toArray() { return data.drugs } },
        stockBatches: { async toArray() { return data.stockBatches } },
        movements: { async toArray() { return data.movements } },
        therapies: { async toArray() { return data.therapies } },
    },
}))

import { buildOperationalReport, operationalReportToCsv, reportingTestUtils } from '../../src/services/reporting'

describe('operational reporting', () => {
    beforeEach(() => {
        data.drugs = [
            { id: 'drug-a', principioAttivo: 'Paracetamolo', scortaMinima: 10 },
            { id: 'drug-b', principioAttivo: 'Ibuprofene', scortaMinima: 8 },
        ]

        data.stockBatches = [
            { id: 'batch-a1', drugId: 'drug-a', quantitaAttuale: 14, sogliaRiordino: 6 },
            { id: 'batch-a2', drugId: 'drug-a', quantitaIniziale: 4, sogliaRiordino: 2 },
            { id: 'batch-b1', drugId: 'drug-b', quantitaAttuale: 2, sogliaRiordino: 3 },
        ]

        data.movements = [
            { id: 'm-a', stockBatchId: 'batch-a2', tipoMovimento: 'SCARICO', quantita: 1 },
            { id: 'm-b', stockBatchId: 'batch-b1', tipoMovimento: 'CARICO', quantita: 1 },
        ]

        data.therapies = [
            {
                id: 't-a',
                drugId: 'drug-a',
                attiva: true,
                consumoMedioSettimanale: 7,
            },
            {
                id: 't-b',
                drugId: 'drug-b',
                attiva: true,
                dosePerSomministrazione: 1,
                somministrazioniGiornaliere: 1,
            },
        ]
    })

    it('builds sorted report rows with warning priorities', async () => {
        const report = await buildOperationalReport()

        expect(report.summary.totalDrugs).toBe(2)
        expect(report.rows[0].drugId).toBe('drug-b')
        expect(report.rows[0].warningPriority).toBe('critica')
        expect(report.rows[1].drugId).toBe('drug-a')
        expect(report.rows[1].warningPriority).toBe('ok')
    })

    it('exports report rows to CSV with header and values', () => {
        const csv = operationalReportToCsv([
            {
                drugId: 'drug-a',
                principioAttivo: 'Paracetamolo',
                stockCurrent: 10,
                weeklyConsumption: 7,
                coverageWeeks: 1.43,
                reorderThreshold: 5,
                warningPriority: 'alta',
                warningReason: 'copertura sotto 2 settimane',
            },
        ])

        const lines = csv.split('\n')
        expect(lines[0]).toContain('drug_id')
        expect(lines[1]).toContain('drug-a')
        expect(lines[1]).toContain('1.43')
    })

    it('handles therapy activity windows and weekly estimation helpers', () => {
        const now = new Date('2026-04-04T12:00:00.000Z')

        expect(reportingTestUtils.isTherapyActive({ attiva: true, dataInizio: '2026-04-01T00:00:00.000Z' }, now)).toBe(true)
        expect(reportingTestUtils.isTherapyActive({ attiva: false }, now)).toBe(false)
        expect(reportingTestUtils.isTherapyActive({ attiva: true, dataInizio: '2026-05-01T00:00:00.000Z' }, now)).toBe(false)

        expect(reportingTestUtils.estimateTherapyWeeklyConsumption({ consumoMedioSettimanale: 9 })).toBe(9)
        expect(reportingTestUtils.estimateTherapyWeeklyConsumption({ dosePerSomministrazione: 2, somministrazioniGiornaliere: 1 })).toBe(14)
    })

    it('computes stock/movement/priority helpers and escapes CSV values', () => {
        expect(reportingTestUtils.baseBatchStock({ quantitaAttuale: 5 })).toBe(5)
        expect(reportingTestUtils.baseBatchStock({ quantitaIniziale: 3 })).toBe(3)
        expect(reportingTestUtils.baseBatchStock({})).toBe(0)

        expect(reportingTestUtils.movementDelta({ tipoMovimento: 'SCARICO', quantita: 2 })).toBe(-2)
        expect(reportingTestUtils.movementDelta({ tipoMovimento: 'CARICO', quantita: 2 })).toBe(2)

        const critical = reportingTestUtils.computePriority({ stockCurrent: 0, weeklyConsumption: 4, reorderThreshold: 2 })
        const medium = reportingTestUtils.computePriority({ stockCurrent: 3, weeklyConsumption: 0, reorderThreshold: 5 })
        const ok = reportingTestUtils.computePriority({ stockCurrent: 20, weeklyConsumption: 5, reorderThreshold: 5 })

        expect(critical.warningPriority).toBe('critica')
        expect(medium.warningPriority).toBe('media')
        expect(ok.warningPriority).toBe('ok')

        expect(reportingTestUtils.escapeCsvValue('campo,con,virgole')).toBe('"campo,con,virgole"')
        expect(reportingTestUtils.escapeCsvValue('valore "quoted"')).toBe('"valore ""quoted"""')
    })
})
