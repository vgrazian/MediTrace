/**
 * farmaci.js — Drug (farmaco) and batch (confezione) persistence with audit trails
 *
 * Exported functions:
 *   - upsertDrug()         create or update drug record
 *   - deleteDrug()         soft-delete drug record
 *   - upsertBatch()        create or update stock batch record
 *   - deactivateBatch()    soft-delete stock batch record
 */
import { db, enqueue, getSetting } from '../db'
import { generateEntityId } from './ids'

/**
 * Create or update a drug (farmaco) record with audit trail.
 *
 * @param {object} params
 * @param {string} [params.drugId]       — ID esterno (opzionale, auto-generato se assente)
 * @param {object} params.existing       — existing drug record (null for create)
 * @param {string} params.nomeFarmaco    — drug name
 * @param {string} params.principioAttivo — active ingredient
 * @param {string} params.classeTerapeutica — therapeutic class (optional)
 * @param {number} params.scortaMinima   — minimum stock threshold
 * @param {string} params.operatorId     — login of operator (optional, null = unknown)
 * @returns {object} persisted drug record
 */
export async function upsertDrug({
    drugId,
    existing = null,
    nomeFarmaco,
    principioAttivo,
    classeTerapeutica = '',
    scortaMinima = 0,
    operatorId = null,
}) {
    const now = new Date().toISOString()
    const persistedDrugId = String(drugId || existing?.id || '').trim() || generateEntityId('drug')
    const record = {
        ...(existing || {}),
        id: persistedDrugId,
        nomeFarmaco: nomeFarmaco.trim(),
        principioAttivo: principioAttivo.trim(),
        classeTerapeutica: classeTerapeutica.trim() || '',
        scortaMinima: Number(scortaMinima || 0),
        updatedAt: now,
        deletedAt: null,
        syncStatus: 'pending',
    }

    const deviceId = await getSetting('deviceId', 'unknown')

    await db.transaction('rw', db.drugs, db.syncQueue, db.activityLog, async () => {
        await db.drugs.put(record)
        await enqueue('drugs', record.id, 'upsert')
        await db.activityLog.add({
            entityType: 'drugs',
            entityId: record.id,
            action: existing ? 'drug_updated' : 'drug_created',
            deviceId,
            operatorId,
            ts: now,
        })
    })

    return record
}

/**
 * Soft-delete a drug (farmaco) record with audit trail.
 *
 * @param {object} params
 * @param {string} params.drugId     — UUID of drug to delete
 * @param {object} params.existing   — existing drug record
 * @param {string} params.operatorId — login of operator (optional)
 * @returns {object} updated (deleted) drug record
 */
export async function deleteDrug({ drugId, existing, operatorId = null }) {
    const now = new Date().toISOString()
    const record = {
        ...existing,
        deletedAt: now,
        updatedAt: now,
        syncStatus: 'pending',
    }

    const deviceId = await getSetting('deviceId', 'unknown')

    await db.transaction('rw', db.drugs, db.syncQueue, db.activityLog, async () => {
        await db.drugs.put(record)
        await enqueue('drugs', drugId, 'upsert')
        await db.activityLog.add({
            entityType: 'drugs',
            entityId: drugId,
            action: 'drug_deleted',
            deviceId,
            operatorId,
            ts: now,
        })
    })

    return record
}

/**
 * Create or update a stock batch (confezione) record with audit trail.
 *
 * @param {object} params
 * @param {string} [params.batchId]           — ID esterno (opzionale, auto-generato se assente)
 * @param {object} params.existing            — existing batch record (null for create)
 * @param {string} params.drugId              — parent drug ID
 * @param {string} params.nomeCommerciale     — commercial name / batch description
 * @param {string} params.dosaggio            — dosage (optional)
 * @param {number} params.quantitaAttuale     — current quantity in stock
 * @param {number} params.sogliaRiordino      — reorder threshold
 * @param {string} params.scadenza            — expiry date (optional)
 * @param {string} params.operatorId          — login of operator (optional)
 * @returns {object} persisted batch record
 */
export async function upsertBatch({
    batchId,
    existing = null,
    drugId,
    nomeCommerciale,
    dosaggio = '',
    quantitaAttuale = 0,
    sogliaRiordino = 0,
    scadenza = null,
    operatorId = null,
}) {
    const now = new Date().toISOString()
    const persistedBatchId = String(batchId || existing?.id || '').trim() || generateEntityId('batch')
    const record = {
        ...(existing || {}),
        id: persistedBatchId,
        drugId,
        nomeCommerciale: nomeCommerciale.trim(),
        dosaggio: dosaggio.trim() || '',
        quantitaAttuale: Number(quantitaAttuale || 0),
        sogliaRiordino: Number(sogliaRiordino || 0),
        scadenza: scadenza || null,
        updatedAt: now,
        deletedAt: null,
        syncStatus: 'pending',
    }

    const deviceId = await getSetting('deviceId', 'unknown')

    await db.transaction('rw', db.stockBatches, db.syncQueue, db.activityLog, async () => {
        await db.stockBatches.put(record)
        await enqueue('stockBatches', record.id, 'upsert')
        await db.activityLog.add({
            entityType: 'stockBatches',
            entityId: record.id,
            action: existing ? 'stock_batch_updated' : 'stock_batch_created',
            deviceId,
            operatorId,
            ts: now,
        })
    })

    return record
}

/**
 * Soft-delete a stock batch (confezione) record with audit trail.
 *
 * @param {object} params
 * @param {string} params.batchId    — UUID of batch to deactivate
 * @param {object} params.existing   — existing batch record
 * @param {string} params.operatorId — login of operator (optional)
 * @returns {object} updated (deactivated) batch record
 */
export async function deactivateBatch({ batchId, existing, operatorId = null }) {
    const now = new Date().toISOString()
    const record = {
        ...existing,
        deletedAt: now,
        updatedAt: now,
        syncStatus: 'pending',
    }

    const deviceId = await getSetting('deviceId', 'unknown')

    await db.transaction('rw', db.stockBatches, db.syncQueue, db.activityLog, async () => {
        await db.stockBatches.put(record)
        await enqueue('stockBatches', batchId, 'upsert')
        await db.activityLog.add({
            entityType: 'stockBatches',
            entityId: batchId,
            action: 'stock_batch_deactivated',
            deviceId,
            operatorId,
            ts: now,
        })
    })

    return record
}
