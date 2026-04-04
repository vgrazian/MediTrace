import { db } from '../db'

const SEVERITY_ORDER = {
    critica: 0,
    alta: 1,
    media: 2,
    ok: 3,
}

function toNumber(value, fallback = 0) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : fallback
}

function isTherapyActive(therapy, now = new Date()) {
    if (therapy?.deletedAt) return false
    if (therapy?.attiva === false) return false

    const start = therapy?.dataInizio ? new Date(therapy.dataInizio) : null
    const end = therapy?.dataFine ? new Date(therapy.dataFine) : null

    if (start && !Number.isNaN(start.getTime()) && start > now) return false
    if (end && !Number.isNaN(end.getTime()) && end < now) return false
    return true
}

function movementDelta(movement) {
    const quantity = toNumber(movement?.quantita, 0)
    const movementType = String(movement?.tipoMovimento || movement?.type || '').toLowerCase()

    if (movementType.includes('scarico') || movementType.includes('somministr') || movementType.includes('consumo')) {
        return -Math.abs(quantity)
    }

    return Math.abs(quantity)
}

function baseBatchStock(batch) {
    if (Number.isFinite(Number(batch?.quantitaAttuale))) return toNumber(batch.quantitaAttuale)
    if (Number.isFinite(Number(batch?.quantitaIniziale))) return toNumber(batch.quantitaIniziale)
    return 0
}

function estimateTherapyWeeklyConsumption(therapy) {
    const explicitWeekly = toNumber(therapy?.consumoMedioSettimanale, 0)
    if (explicitWeekly > 0) return explicitWeekly

    const dailyAdministrations = toNumber(therapy?.somministrazioniGiornaliere, 0)
    const dosePerAdministration = toNumber(therapy?.dosePerSomministrazione, 0)
    const estimatedWeekly = dailyAdministrations * dosePerAdministration * 7
    return estimatedWeekly > 0 ? estimatedWeekly : 0
}

function isConsumptionMovement(movement) {
    return movementDelta(movement) < 0
}

function parseMovementDate(movement) {
    const raw = movement?.dataMovimento ?? movement?.updatedAt
    if (!raw) return null
    const parsed = new Date(raw)
    if (Number.isNaN(parsed.getTime())) return null
    return parsed
}

function toIsoWeekKey(date) {
    const tmp = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
    const day = tmp.getUTCDay() || 7
    tmp.setUTCDate(tmp.getUTCDate() + 4 - day)
    const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1))
    const weekNo = Math.ceil((((tmp - yearStart) / 86400000) + 1) / 7)
    return `${tmp.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`
}

function buildRecentWeekKeys(now = new Date(), weeks = 8) {
    const out = []
    for (let i = weeks - 1; i >= 0; i -= 1) {
        const date = new Date(now)
        date.setDate(now.getDate() - (i * 7))
        out.push(toIsoWeekKey(date))
    }
    return out
}

function computePriority({ stockCurrent, weeklyConsumption, reorderThreshold }) {
    const coverageWeeks = weeklyConsumption > 0 ? stockCurrent / weeklyConsumption : null

    if (stockCurrent <= 0) {
        return { warningPriority: 'critica', coverageWeeks, reason: 'scorta esaurita' }
    }

    if (weeklyConsumption > 0 && coverageWeeks !== null && coverageWeeks < 1) {
        return { warningPriority: 'critica', coverageWeeks, reason: 'copertura sotto 1 settimana' }
    }

    if (weeklyConsumption > 0 && coverageWeeks !== null && coverageWeeks < 2) {
        return { warningPriority: 'alta', coverageWeeks, reason: 'copertura sotto 2 settimane' }
    }

    if (reorderThreshold > 0 && stockCurrent <= reorderThreshold) {
        return { warningPriority: 'media', coverageWeeks, reason: 'sotto soglia riordino' }
    }

    return { warningPriority: 'ok', coverageWeeks, reason: 'copertura regolare' }
}

export async function buildOperationalReport() {
    const [drugs, stockBatches, movements, therapies, hosts] = await Promise.all([
        db.drugs.toArray(),
        db.stockBatches.toArray(),
        db.movements.toArray(),
        db.therapies.toArray(),
        db.hosts.toArray(),
    ])

    const now = new Date()
    const stockByBatch = new Map()
    for (const batch of stockBatches) {
        if (batch.deletedAt) continue
        stockByBatch.set(batch.id, baseBatchStock(batch))
    }

    for (const movement of movements) {
        if (movement.deletedAt) continue
        const current = stockByBatch.get(movement.stockBatchId) ?? 0
        stockByBatch.set(movement.stockBatchId, current + movementDelta(movement))
    }

    const weeklyConsumptionByDrug = new Map()
    for (const therapy of therapies) {
        if (!isTherapyActive(therapy, now)) continue
        const delta = estimateTherapyWeeklyConsumption(therapy)
        const current = weeklyConsumptionByDrug.get(therapy.drugId) ?? 0
        weeklyConsumptionByDrug.set(therapy.drugId, current + delta)
    }

    const batchesByDrug = new Map()
    for (const batch of stockBatches) {
        if (batch.deletedAt) continue
        const list = batchesByDrug.get(batch.drugId) ?? []
        list.push(batch)
        batchesByDrug.set(batch.drugId, list)
    }

    const rows = drugs
        .filter(drug => !drug.deletedAt)
        .map(drug => {
            const batches = batchesByDrug.get(drug.id) ?? []
            const stockCurrent = batches.reduce((sum, batch) => sum + (stockByBatch.get(batch.id) ?? 0), 0)
            const reorderFromBatches = batches.reduce((sum, batch) => sum + toNumber(batch.sogliaRiordino, 0), 0)
            const reorderThreshold = toNumber(drug.scortaMinima, reorderFromBatches)
            const weeklyConsumption = weeklyConsumptionByDrug.get(drug.id) ?? 0
            const priority = computePriority({ stockCurrent, weeklyConsumption, reorderThreshold })

            return {
                drugId: drug.id,
                principioAttivo: drug.principioAttivo ?? drug.id,
                weeklyConsumption,
                stockCurrent,
                reorderThreshold,
                coverageWeeks: priority.coverageWeeks,
                warningPriority: priority.warningPriority,
                warningReason: priority.reason,
            }
        })

    const rowsByDrugId = new Map(rows.map(row => [row.drugId, row]))
    const hostsById = new Map(
        hosts
            .filter(host => !host.deletedAt)
            .map(host => [host.id, host])
    )

    const hostAggregates = new Map()
    for (const therapy of therapies) {
        if (!isTherapyActive(therapy, now)) continue
        if (!therapy.hostId) continue

        const host = hostsById.get(therapy.hostId)
        const base = hostAggregates.get(therapy.hostId) ?? {
            hostId: therapy.hostId,
            codiceInterno: host?.codiceInterno ?? therapy.hostId,
            casaAlloggio: host?.casaAlloggio ?? '',
            activeTherapies: 0,
            weeklyConsumption: 0,
            criticalDrugs: new Set(),
            highDrugs: new Set(),
            mediumDrugs: new Set(),
            severityScore: SEVERITY_ORDER.ok,
        }

        base.activeTherapies += 1
        base.weeklyConsumption += estimateTherapyWeeklyConsumption(therapy)

        const drugRow = rowsByDrugId.get(therapy.drugId)
        if (drugRow?.warningPriority === 'critica') base.criticalDrugs.add(therapy.drugId)
        if (drugRow?.warningPriority === 'alta') base.highDrugs.add(therapy.drugId)
        if (drugRow?.warningPriority === 'media') base.mediumDrugs.add(therapy.drugId)
        if (drugRow) {
            base.severityScore = Math.min(base.severityScore, SEVERITY_ORDER[drugRow.warningPriority])
        }

        hostAggregates.set(therapy.hostId, base)
    }

    const hostRows = Array.from(hostAggregates.values())
        .map(row => ({
            hostId: row.hostId,
            codiceInterno: row.codiceInterno,
            casaAlloggio: row.casaAlloggio,
            activeTherapies: row.activeTherapies,
            weeklyConsumption: row.weeklyConsumption,
            criticalDrugs: row.criticalDrugs.size,
            highDrugs: row.highDrugs.size,
            mediumDrugs: row.mediumDrugs.size,
            warningPriority: Object.keys(SEVERITY_ORDER).find(key => SEVERITY_ORDER[key] === row.severityScore) ?? 'ok',
        }))
        .sort((a, b) => {
            const bySeverity = SEVERITY_ORDER[a.warningPriority] - SEVERITY_ORDER[b.warningPriority]
            if (bySeverity !== 0) return bySeverity
            if (b.weeklyConsumption !== a.weeklyConsumption) return b.weeklyConsumption - a.weeklyConsumption
            return a.codiceInterno.localeCompare(b.codiceInterno)
        })

    const trendWeeks = buildRecentWeekKeys(now, 8)
    const trendWeekSet = new Set(trendWeeks)
    const trendByDrug = new Map()

    for (const row of rows) {
        const weeklyConsumptionByWeek = Object.fromEntries(trendWeeks.map(week => [week, 0]))
        trendByDrug.set(row.drugId, {
            drugId: row.drugId,
            principioAttivo: row.principioAttivo,
            weeklyConsumptionByWeek,
            totalPeriodConsumption: 0,
        })
    }

    const stockBatchDrugLookup = new Map(
        stockBatches.map(batch => [batch.id, batch.drugId])
    )

    for (const movement of movements) {
        if (movement.deletedAt) continue
        if (!isConsumptionMovement(movement)) continue

        const movementDate = parseMovementDate(movement)
        if (!movementDate) continue

        const weekKey = toIsoWeekKey(movementDate)
        if (!trendWeekSet.has(weekKey)) continue

        const drugId = movement.drugId ?? stockBatchDrugLookup.get(movement.stockBatchId)
        if (!drugId) continue

        const trendRow = trendByDrug.get(drugId)
        if (!trendRow) continue

        const consumed = Math.abs(movementDelta(movement))
        trendRow.weeklyConsumptionByWeek[weekKey] += consumed
        trendRow.totalPeriodConsumption += consumed
    }

    const trendRows = Array.from(trendByDrug.values())
        .sort((a, b) => {
            if (b.totalPeriodConsumption !== a.totalPeriodConsumption) {
                return b.totalPeriodConsumption - a.totalPeriodConsumption
            }
            return a.principioAttivo.localeCompare(b.principioAttivo)
        })
        .sort((a, b) => {
            const bySeverity = SEVERITY_ORDER[a.warningPriority] - SEVERITY_ORDER[b.warningPriority]
            if (bySeverity !== 0) return bySeverity
            return a.principioAttivo.localeCompare(b.principioAttivo)
        })

    const summary = {
        totalDrugs: rows.length,
        critical: rows.filter(row => row.warningPriority === 'critica').length,
        high: rows.filter(row => row.warningPriority === 'alta').length,
        medium: rows.filter(row => row.warningPriority === 'media').length,
        ok: rows.filter(row => row.warningPriority === 'ok').length,
    }

    return {
        generatedAt: new Date().toISOString(),
        rows,
        hostRows,
        trendWeeks,
        trendRows,
        summary,
    }
}

function stockSectionToCsv(rows) {
    const header = [
        'drug_id',
        'principio_attivo',
        'stock_current',
        'weekly_consumption',
        'coverage_weeks',
        'reorder_threshold',
        'warning_priority',
        'warning_reason',
    ]

    const lines = [header.join(',')]

    for (const row of rows) {
        const values = [
            row.drugId,
            row.principioAttivo,
            Number(row.stockCurrent).toFixed(2),
            Number(row.weeklyConsumption).toFixed(2),
            row.coverageWeeks === null ? '' : Number(row.coverageWeeks).toFixed(2),
            Number(row.reorderThreshold).toFixed(2),
            row.warningPriority,
            row.warningReason,
        ]

        lines.push(values.map(escapeCsvValue).join(','))
    }

    return lines.join('\n')
}

function hostSectionToCsv(hostRows) {
    const header = [
        'host_id',
        'codice_interno',
        'casa_alloggio',
        'active_therapies',
        'weekly_consumption',
        'critical_drugs',
        'high_drugs',
        'medium_drugs',
        'warning_priority',
    ]

    const lines = [header.join(',')]
    for (const row of hostRows) {
        const values = [
            row.hostId,
            row.codiceInterno,
            row.casaAlloggio,
            Number(row.activeTherapies).toFixed(0),
            Number(row.weeklyConsumption).toFixed(2),
            Number(row.criticalDrugs).toFixed(0),
            Number(row.highDrugs).toFixed(0),
            Number(row.mediumDrugs).toFixed(0),
            row.warningPriority,
        ]
        lines.push(values.map(escapeCsvValue).join(','))
    }

    return lines.join('\n')
}

function trendSectionToCsv(trendRows, trendWeeks) {
    const lines = [['drug_id', 'principio_attivo', 'week_key', 'weekly_consumption'].join(',')]

    for (const row of trendRows) {
        for (const weekKey of trendWeeks) {
            const values = [
                row.drugId,
                row.principioAttivo,
                weekKey,
                Number(row.weeklyConsumptionByWeek?.[weekKey] ?? 0).toFixed(2),
            ]
            lines.push(values.map(escapeCsvValue).join(','))
        }
    }

    return lines.join('\n')
}

export function operationalReportToCsv(reportOrRows) {
    if (Array.isArray(reportOrRows)) {
        return stockSectionToCsv(reportOrRows)
    }

    const rows = reportOrRows?.rows ?? []
    const hostRows = reportOrRows?.hostRows ?? []
    const trendRows = reportOrRows?.trendRows ?? []
    const trendWeeks = reportOrRows?.trendWeeks ?? []

    const sections = [
        '# section: stock',
        stockSectionToCsv(rows),
        '',
        '# section: host_kpi',
        hostSectionToCsv(hostRows),
        '',
        '# section: trend',
        trendSectionToCsv(trendRows, trendWeeks),
    ]

    return sections.join('\n')
}

function escapeCsvValue(value) {
    const asString = String(value ?? '')
    if (asString.includes(',') || asString.includes('"') || asString.includes('\n')) {
        return `"${asString.replaceAll('"', '""')}"`
    }
    return asString
}

export const reportingTestUtils = {
    toNumber,
    isTherapyActive,
    movementDelta,
    baseBatchStock,
    estimateTherapyWeeklyConsumption,
    computePriority,
    isConsumptionMovement,
    parseMovementDate,
    toIsoWeekKey,
    buildRecentWeekKeys,
    escapeCsvValue,
}
