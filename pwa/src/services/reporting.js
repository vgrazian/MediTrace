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
    const [drugs, stockBatches, movements, therapies] = await Promise.all([
        db.drugs.toArray(),
        db.stockBatches.toArray(),
        db.movements.toArray(),
        db.therapies.toArray(),
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
        summary,
    }
}

export function operationalReportToCsv(rows) {
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

function escapeCsvValue(value) {
    const asString = String(value ?? '')
    if (asString.includes(',') || asString.includes('"') || asString.includes('\n')) {
        return `"${asString.replaceAll('"', '""')}"`
    }
    return asString
}
