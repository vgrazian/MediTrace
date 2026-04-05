import { beforeEach, describe, expect, it, vi } from 'vitest'

const data = {
    drugs: [],
    hosts: [],
    stockBatches: [],
    movements: [],
    therapies: [],
    reminders: [],
}

vi.mock('../../src/db', () => ({
    db: {
        drugs: { async toArray() { return data.drugs } },
        hosts: { async toArray() { return data.hosts } },
        stockBatches: { async toArray() { return data.stockBatches } },
        movements: { async toArray() { return data.movements } },
        therapies: { async toArray() { return data.therapies } },
        reminders: { async toArray() { return data.reminders } },
    },
}))

import { buildOperationalReport, buildOrderDraftText, operationalReportToCsv, reportingTestUtils } from '../../src/services/reporting'

describe('operational reporting', () => {
    beforeEach(() => {
        data.drugs = [
            { id: 'drug-a', principioAttivo: 'Paracetamolo', scortaMinima: 10 },
            { id: 'drug-b', principioAttivo: 'Ibuprofene', scortaMinima: 8 },
        ]

        data.hosts = [
            { id: 'host-1', codiceInterno: 'OSP-01', casaAlloggio: 'Casa Nord' },
            { id: 'host-2', codiceInterno: 'OSP-02', casaAlloggio: 'Casa Sud' },
        ]

        data.stockBatches = [
            { id: 'batch-a1', drugId: 'drug-a', quantitaAttuale: 14, sogliaRiordino: 6 },
            { id: 'batch-a2', drugId: 'drug-a', quantitaIniziale: 4, sogliaRiordino: 2 },
            { id: 'batch-b1', drugId: 'drug-b', quantitaAttuale: 2, sogliaRiordino: 3 },
        ]

        data.movements = [
            {
                id: 'm-a',
                stockBatchId: 'batch-a2',
                drugId: 'drug-a',
                tipoMovimento: 'SCARICO',
                quantita: 1,
                dataMovimento: new Date().toISOString(),
            },
            {
                id: 'm-b',
                stockBatchId: 'batch-b1',
                drugId: 'drug-b',
                tipoMovimento: 'CARICO',
                quantita: 1,
                dataMovimento: new Date().toISOString(),
            },
        ]

        data.therapies = [
            {
                id: 't-a',
                hostId: 'host-1',
                drugId: 'drug-a',
                attiva: true,
                consumoMedioSettimanale: 7,
            },
            {
                id: 't-b',
                hostId: 'host-2',
                drugId: 'drug-b',
                attiva: true,
                dosePerSomministrazione: 1,
                somministrazioniGiornaliere: 1,
            },
        ]

        data.reminders = [
            {
                id: 'r-1',
                hostId: 'host-1',
                therapyId: 't-a',
                scheduledAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
                stato: 'ESEGUITO',
            },
            {
                id: 'r-2',
                hostId: 'host-1',
                therapyId: 't-a',
                scheduledAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
                stato: 'SALTATO',
            },
            {
                id: 'r-3',
                hostId: 'host-2',
                therapyId: 't-b',
                scheduledAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
                stato: 'POSTICIPATO',
            },
            {
                id: 'r-4',
                hostId: 'host-2',
                therapyId: 't-b',
                scheduledAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
                stato: 'DA_ESEGUIRE',
            },
        ]
    })

    it('builds sorted report rows with warning priorities', async () => {
        const report = await buildOperationalReport()

        expect(report.summary.totalDrugs).toBe(2)
        const rowA = report.rows.find(row => row.drugId === 'drug-a')
        const rowB = report.rows.find(row => row.drugId === 'drug-b')
        expect(rowA?.warningPriority).toBe('ok')
        expect(rowB?.warningPriority).toBe('critica')

        expect(report.hostRows.length).toBe(2)
        expect(report.hostRows[0].hostId).toBe('host-2')
        expect(report.hostRows[0].warningPriority).toBe('critica')

        expect(report.trendWeeks.length).toBe(8)
        expect(report.trendRows[0].drugId).toBe('drug-a')
        const trendTotal = Object.values(report.trendRows[0].weeklyConsumptionByWeek)
            .reduce((sum, value) => sum + Number(value), 0)
        expect(trendTotal).toBeGreaterThan(0)

        expect(report.adherence.totalScheduled).toBe(4)
        expect(report.adherence.executed).toBe(1)
        expect(report.adherence.adherenceRate).toBe(25)
        expect(report.adherenceHostRows.length).toBe(2)
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

    it('exports advanced report to multi-section CSV', async () => {
        const report = await buildOperationalReport()
        const csv = operationalReportToCsv(report)

        expect(csv).toContain('# section: stock')
        expect(csv).toContain('# section: host_kpi')
        expect(csv).toContain('# section: trend')
        expect(csv).toContain('# section: adherence_summary')
        expect(csv).toContain('# section: adherence_by_host')
        expect(csv).toContain('host_id,codice_interno')
        expect(csv).toContain('drug_id,principio_attivo,week_key,weekly_consumption')
    })

    it('builds order draft text with non-ok priorities only', () => {
        const text = buildOrderDraftText([
            {
                drugId: 'drug-a',
                principioAttivo: 'Paracetamolo',
                stockCurrent: 1,
                weeklyConsumption: 8,
                reorderThreshold: 5,
                warningPriority: 'critica',
                warningReason: 'scorta esaurita',
            },
            {
                drugId: 'drug-b',
                principioAttivo: 'Ibuprofene',
                stockCurrent: 12,
                weeklyConsumption: 2,
                reorderThreshold: 4,
                warningPriority: 'ok',
                warningReason: 'copertura regolare',
            },
        ])

        expect(text).toContain('Oggetto: ordine farmaci prioritari')
        expect(text).toContain('Paracetamolo')
        expect(text).toContain("priorita': critica")
        expect(text).not.toContain('Ibuprofene')
    })

    it('handles therapy activity windows and weekly estimation helpers', () => {
        const now = new Date('2026-04-04T12:00:00.000Z')

        expect(reportingTestUtils.isTherapyActive({ attiva: true, dataInizio: '2026-04-01T00:00:00.000Z' }, now)).toBe(true)
        expect(reportingTestUtils.isTherapyActive({ attiva: false }, now)).toBe(false)
        expect(reportingTestUtils.isTherapyActive({ attiva: true, dataInizio: '2026-05-01T00:00:00.000Z' }, now)).toBe(false)

        expect(reportingTestUtils.estimateTherapyWeeklyConsumption({ consumoMedioSettimanale: 9 })).toBe(9)
        expect(reportingTestUtils.estimateTherapyWeeklyConsumption({ dosePerSomministrazione: 2, somministrazioniGiornaliere: 1 })).toBe(14)

        expect(reportingTestUtils.toIsoWeekKey(now)).toMatch(/^\d{4}-W\d{2}$/)
        expect(reportingTestUtils.buildRecentWeekKeys(now, 4)).toHaveLength(4)

        expect(reportingTestUtils.normalizeReminderState({ stato: 'eseguito' })).toBe('ESEGUITO')
        expect(reportingTestUtils.parseReminderDate({ scheduledAt: '2026-04-02T12:00:00.000Z' })?.toISOString())
            .toContain('2026-04-02')
    })

    it('computes stock/movement/priority helpers and escapes CSV values', () => {
        expect(reportingTestUtils.baseBatchStock({ quantitaAttuale: 5 })).toBe(5)
        expect(reportingTestUtils.baseBatchStock({ quantitaIniziale: 3 })).toBe(3)
        expect(reportingTestUtils.baseBatchStock({})).toBe(0)

        expect(reportingTestUtils.movementDelta({ tipoMovimento: 'SCARICO', quantita: 2 })).toBe(-2)
        expect(reportingTestUtils.movementDelta({ tipoMovimento: 'CARICO', quantita: 2 })).toBe(2)
        expect(reportingTestUtils.isConsumptionMovement({ tipoMovimento: 'SCARICO', quantita: 2 })).toBe(true)
        expect(reportingTestUtils.isConsumptionMovement({ tipoMovimento: 'CARICO', quantita: 2 })).toBe(false)
        expect(reportingTestUtils.parseMovementDate({ dataMovimento: '2026-04-02T12:00:00.000Z' })?.toISOString())
            .toContain('2026-04-02')

        const critical = reportingTestUtils.computePriority({ stockCurrent: 0, weeklyConsumption: 4, reorderThreshold: 2 })
        const medium = reportingTestUtils.computePriority({ stockCurrent: 3, weeklyConsumption: 0, reorderThreshold: 5 })
        const ok = reportingTestUtils.computePriority({ stockCurrent: 20, weeklyConsumption: 5, reorderThreshold: 5 })

        expect(critical.warningPriority).toBe('critica')
        expect(medium.warningPriority).toBe('media')
        expect(ok.warningPriority).toBe('ok')

        expect(reportingTestUtils.escapeCsvValue('campo,con,virgole')).toBe('"campo,con,virgole"')
        expect(reportingTestUtils.escapeCsvValue('valore "quoted"')).toBe('"valore ""quoted"""')

        const adherence = reportingTestUtils.buildAdherenceSnapshot([
            { id: 'r1', hostId: 'host-1', scheduledAt: '2026-04-04T10:00:00.000Z', stato: 'ESEGUITO' },
            { id: 'r2', hostId: 'host-1', scheduledAt: '2026-04-04T11:00:00.000Z', stato: 'SALTATO' },
        ], new Map([['host-1', { id: 'host-1', codiceInterno: 'OSP-01', nome: 'Mario', cognome: 'Rossi' }]]), new Date('2026-04-05T12:00:00.000Z'), 7)

        expect(adherence.summary.totalScheduled).toBe(2)
        expect(adherence.summary.adherenceRate).toBe(50)
        expect(adherence.hostRows[0].hostLabel).toBe('Rossi Mario')
    })
})
