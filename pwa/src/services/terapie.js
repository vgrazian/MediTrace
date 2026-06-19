import { db, enqueue, getSetting } from '../db'
import { generateEntityId } from './ids'

function normalizeDay(value) {
    return String(value || '').trim().slice(0, 10)
}

function isActiveTherapy(therapy) {
    if (!therapy || therapy.deletedAt) return false
    if (therapy.attiva === false) return false
    if (therapy.dataFine) return false
    return true
}

async function assertUniqueActiveTherapy({ therapyId = null, hostId, drugId, dataInizio }) {
    const allTherapies = await (db.therapies?.toArray?.() ?? Promise.resolve([]))
    const targetDay = normalizeDay(dataInizio)

    const duplicate = allTherapies.find((therapy) => {
        if (!isActiveTherapy(therapy)) return false
        if (therapyId && therapy.id === therapyId) return false
        return therapy.hostId === hostId
            && therapy.drugId === drugId
            && normalizeDay(therapy.dataInizio) === targetDay
    })

    if (duplicate) {
        throw new Error('Terapia gia esistente per ospite, farmaco e data inizio')
    }
}

export async function upsertTherapy({
    existing,
    therapyId,
    form,
    operatorId = null,
}) {
    const now = new Date().toISOString()
    const persistedTherapyId = String(therapyId || existing?.id || '').trim() || generateEntityId('therapy')
    await assertUniqueActiveTherapy({
        therapyId: persistedTherapyId,
        hostId: form.hostId,
        drugId: form.drugId,
        dataInizio: form.dataInizio || now,
    })

    const record = {
        ...(existing || {}),
        id: persistedTherapyId,
        hostId: form.hostId,
        drugId: form.drugId,
        dosePerSomministrazione: Number(form.dosePerSomministrazione || 0),
        somministrazioniGiornaliere: Number(form.somministrazioniGiornaliere || 0),
        orariSomministrazione: Array.isArray(form.orariSomministrazione) ? form.orariSomministrazione.slice(0, 6) : [],
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

export async function restoreTherapyRecord({ therapy, operatorId = null }) {
    if (!therapy || !therapy.deletedAt) {
        throw new Error('Terapia non ripristinabile')
    }

    const now = new Date().toISOString()
    const deviceId = await getSetting('deviceId', 'unknown')

    const updated = {
        ...therapy,
        attiva: true,
        deletedAt: null,
        updatedAt: now,
        syncStatus: 'pending',
    }

    await db.transaction('rw', db.therapies, db.syncQueue, db.activityLog, async () => {
        await db.therapies.put(updated)
        await enqueue('therapies', therapy.id, 'upsert')
        await db.activityLog.add({
            entityType: 'therapies',
            entityId: therapy.id,
            action: 'therapy_restored',
            deviceId,
            operatorId,
            ts: now,
        })
    })

    return updated
}
