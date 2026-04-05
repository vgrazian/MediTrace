import { db, enqueue, getSetting } from '../db'

export async function upsertMovement({
    existing,
    movementId,
    form,
    selectedBatch,
    movementDate,
    operatorId = null,
}) {
    const now = new Date().toISOString()

    const record = {
        ...(existing || {}),
        id: movementId,
        stockBatchId: form.stockBatchId,
        drugId: selectedBatch.drugId || null,
        hostId: form.hostId || null,
        therapyId: form.therapyId || null,
        type: form.tipoMovimento,
        tipoMovimento: form.tipoMovimento,
        quantita: Number(form.quantita || 0),
        dataMovimento: movementDate,
        note: form.note?.trim() || '',
        updatedAt: now,
        deletedAt: existing?.deletedAt ?? null,
        syncStatus: 'pending',
    }

    const deviceId = await getSetting('deviceId', 'unknown')

    await db.transaction('rw', db.movements, db.syncQueue, db.activityLog, async () => {
        await db.movements.put(record)
        await enqueue('movements', record.id, 'upsert')
        await db.activityLog.add({
            entityType: 'movements',
            entityId: record.id,
            action: existing ? 'movement_updated' : 'movement_created',
            deviceId,
            operatorId,
            ts: now,
        })
    })

    return record
}

export async function softDeleteMovement({ movement, operatorId = null }) {
    const now = new Date().toISOString()
    const deviceId = await getSetting('deviceId', 'unknown')

    await db.transaction('rw', db.movements, db.syncQueue, db.activityLog, async () => {
        await db.movements.put({
            ...movement,
            deletedAt: now,
            updatedAt: now,
            syncStatus: 'pending',
        })
        await enqueue('movements', movement.id, 'upsert')
        await db.activityLog.add({
            entityType: 'movements',
            entityId: movement.id,
            action: 'movement_deleted',
            deviceId,
            operatorId,
            ts: now,
        })
    })
}
