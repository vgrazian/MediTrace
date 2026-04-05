import { db, enqueue, getSetting } from '../db'

export async function upsertTherapy({
    existing,
    therapyId,
    form,
    operatorId = null,
}) {
    const now = new Date().toISOString()
    const record = {
        ...(existing || {}),
        id: therapyId,
        hostId: form.hostId,
        drugId: form.drugId,
        dosePerSomministrazione: Number(form.dosePerSomministrazione || 0),
        somministrazioniGiornaliere: Number(form.somministrazioniGiornaliere || 0),
        consumoMedioSettimanale: Number(form.consumoMedioSettimanale || 0),
        dataInizio: form.dataInizio || now,
        dataFine: form.dataFine || null,
        note: form.note || '',
        attiva: true,
        updatedAt: now,
        deletedAt: existing?.deletedAt ?? null,
        syncStatus: 'pending',
    }

    const deviceId = await getSetting('deviceId', 'unknown')

    await db.transaction('rw', db.therapies, db.syncQueue, db.activityLog, async () => {
        await db.therapies.put(record)
        await enqueue('therapies', record.id, 'upsert')
        await db.activityLog.add({
            entityType: 'therapies',
            entityId: record.id,
            action: existing ? 'therapy_updated' : 'therapy_created',
            deviceId,
            operatorId,
            ts: now,
        })
    })

    return record
}

export async function deactivateTherapyRecord({ therapy, operatorId = null }) {
    const now = new Date().toISOString()
    const deviceId = await getSetting('deviceId', 'unknown')

    const updated = {
        ...therapy,
        attiva: false,
        deletedAt: now,
        updatedAt: now,
        syncStatus: 'pending',
    }

    await db.transaction('rw', db.therapies, db.syncQueue, db.activityLog, async () => {
        await db.therapies.put(updated)
        await enqueue('therapies', therapy.id, 'upsert')
        await db.activityLog.add({
            entityType: 'therapies',
            entityId: therapy.id,
            action: 'therapy_deactivated',
            deviceId,
            operatorId,
            ts: now,
        })
    })

    return updated
}
