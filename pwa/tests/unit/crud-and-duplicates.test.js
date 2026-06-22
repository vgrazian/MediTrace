/**
 * Comprehensive CRUD + duplicate detection + promemoria workflow tests
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { db, setSetting } from '../../src/db'
import { generateEntityId } from '../../src/services/ids'
import { createHost, deleteHost } from '../../src/services/ospiti'
import { createResidenza, deactivateResidenza, listResidenze } from '../../src/services/residenze'
import { upsertDrug, deleteDrug, upsertBatch, deactivateBatch } from '../../src/services/farmaci'
import { upsertTherapy, deactivateTherapyRecord } from '../../src/services/terapie'
import { markReminder, REMINDER_OUTCOMES, getScheduledTimesForTherapy, buildReminderRows } from '../../src/services/promemoria'

async function clearAllTables() {
    for (const table of ['hosts', 'drugs', 'stockBatches', 'therapies', 'movements',
        'reminders', 'rooms', 'syncQueue', 'activityLog', 'settings']) {
        if (db[table]) await db[table].clear()
    }
}

async function seedResidenza(codice = 'Test Residenza') {
    const roomId = generateEntityId('room')
    const now = new Date().toISOString()
    await db.rooms.put({
        id: roomId, codice, note: '',
        metadata: { maxOspiti: 10, indirizzo: '', telefono: '', email: '' },
        updatedAt: now, deletedAt: null, syncStatus: 'pending',
    })
    return { id: roomId, codice }
}

async function seedBatch(drugId, nomeCommerciale = 'Test Confezione') {
    const batchId = generateEntityId('batch')
    const now = new Date().toISOString()
    await db.stockBatches.put({
        id: batchId, drugId, nomeCommerciale, dosaggio: '10mg',
        quantitaAttuale: 100, sogliaRiordino: 10, scadenza: null,
        residenzaId: '', updatedAt: now, deletedAt: null, syncStatus: 'pending',
    })
    return { id: batchId, drugId, nomeCommerciale }
}

async function seedHost(codiceInterno = 'TEST01', nome = 'Test', cognome = 'Host', roomId = null) {
    const hostId = generateEntityId('host')
    const now = new Date().toISOString()
    await db.hosts.put({
        id: hostId, codiceInterno, iniziali: 'T.H.', nome, cognome,
        luogoNascita: '', dataNascita: null, sesso: '', codiceFiscale: '', patologie: '',
        roomId: roomId || '', stanza: '', note: '', attivo: true,
        createdAt: now, updatedAt: now, deletedAt: null, syncStatus: 'pending',
    })
    return { id: hostId, codiceInterno, nome, cognome }
}

beforeEach(async () => {
    await clearAllTables()
    await setSetting('deviceId', 'test-device-01')
})

// ═══ OSPITI ═══
describe('Ospiti — CRUD e duplicati', () => {
    it('crea un ospite correttamente', async () => {
        const room = await seedResidenza()
        const host = await createHost({
            codiceInterno: 'HOST01', iniziali: 'M.R.', nome: 'Mario', cognome: 'Rossi',
            roomId: room.id, operatorId: 'test-op',
        })
        expect(host.id).toMatch(/^host_/)
        expect(host.nome).toBe('Mario')
        expect(host.cognome).toBe('Rossi')
        expect(host.attivo).toBe(true)
        expect(host.deletedAt).toBeNull()

        const stored = await db.hosts.get(host.id)
        expect(stored).toBeDefined()
        expect(stored.nome).toBe('Mario')
    })

    it('impedisce duplicato per stesso codiceInterno', async () => {
        const room = await seedResidenza()
        await createHost({ codiceInterno: 'DUP01', iniziali: 'A.B.', nome: 'A', cognome: 'B', roomId: room.id })
        await expect(
            createHost({ codiceInterno: 'DUP01', iniziali: 'C.D.', nome: 'C', cognome: 'D', roomId: room.id })
        ).rejects.toThrow()
    })

    it('elimina (soft-delete) un ospite', async () => {
        const room = await seedResidenza()
        const host = await createHost({ codiceInterno: 'DEL01', iniziali: 'X.Y.', nome: 'X', cognome: 'Y', roomId: room.id })
        const del = await deleteHost({ hostId: host.id, operatorId: 'test-op' })
        expect(del.deletedAt).toBeTruthy()
        const stored = await db.hosts.get(host.id)
        expect(stored.deletedAt).toBeTruthy()
    })

    it('creazione e rimozione non causano errori di sessione', async () => {
        const room = await seedResidenza()
        const host = await createHost({ codiceInterno: 'NOLOG', iniziali: 'N.L.', nome: 'No', cognome: 'Log', roomId: room.id })
        expect(host.id).toBeTruthy()
        const del = await deleteHost({ hostId: host.id, operatorId: 'test-op' })
        expect(del.deletedAt).toBeTruthy()
        expect(await db.syncQueue.count()).toBeGreaterThanOrEqual(2)
    })
})

// ═══ RESIDENZE ═══
describe('Residenze — CRUD e duplicati', () => {
    it('crea una residenza correttamente', async () => {
        const res = await createResidenza({
            codice: 'Villa Serena', maxOspiti: 15,
            indirizzo: 'Via Roma 1', telefono: '+39 02 123456', email: 'villa@test.it',
            note: 'Test', operatorId: 'test-op',
        })
        expect(res.id).toMatch(/^room_/)
        expect(res.codice).toBe('Villa Serena')
        expect(res.metadata.maxOspiti).toBe(15)
        expect(res.metadata.indirizzo).toBe('Via Roma 1')
        expect(res.deletedAt).toBeNull()

        const list = await listResidenze()
        const found = list.find(r => r.id === res.id)
        expect(found).toBeDefined()
        expect(found.maxOspiti).toBe(15)
    })

    it('impedisce duplicato per stesso codice', async () => {
        await createResidenza({ codice: 'Unica', operatorId: 'test-op' })
        await expect(createResidenza({ codice: 'Unica', operatorId: 'test-op' })).rejects.toThrow('Residenza gia esistente')
    })

    it('disattiva una residenza', async () => {
        const res = await createResidenza({ codice: 'Da Eliminare', operatorId: 'test-op' })
        const deact = await deactivateResidenza({ roomId: res.id, operatorId: 'test-op' })
        expect(deact.deletedAt).toBeTruthy()
        const stored = await db.rooms.get(res.id)
        expect(stored.deletedAt).toBeTruthy()
        const list = await listResidenze()
        expect(list.find(r => r.id === res.id)).toBeUndefined()
    })

    it('creazione e disattivazione non causano errori di sessione', async () => {
        const res = await createResidenza({ codice: 'NoLog Res', operatorId: 'test-op' })
        expect(res.id).toBeTruthy()
        const deact = await deactivateResidenza({ roomId: res.id, operatorId: 'test-op' })
        expect(deact.deletedAt).toBeTruthy()
    })
})

// ═══ FARMACI ═══
describe('Farmaci — CRUD e duplicati', () => {
    it('crea un farmaco correttamente', async () => {
        const drug = await upsertDrug({
            nomeFarmaco: 'Tachipirina', principioAttivo: 'Paracetamolo',
            classeTerapeutica: 'Analgesico', scortaMinima: 10, operatorId: 'test-op',
        })
        expect(drug.id).toMatch(/^drug_/)
        expect(drug.nomeFarmaco).toBe('Tachipirina')
        expect(drug.principioAttivo).toBe('Paracetamolo')
        expect(drug.deletedAt).toBeNull()

        const stored = await db.drugs.get(drug.id)
        expect(stored).toBeDefined()
    })

    it('impedisce duplicato per stesso nomeFarmaco', async () => {
        await upsertDrug({ nomeFarmaco: 'Unico', principioAttivo: 'X', operatorId: 'test-op' })
        await expect(
            upsertDrug({ nomeFarmaco: 'Unico', principioAttivo: 'Y', operatorId: 'test-op' })
        ).rejects.toThrow('Farmaco gia esistente')
    })

    it('aggiorna un farmaco (upsert)', async () => {
        const drug = await upsertDrug({ nomeFarmaco: 'Aggiorna', principioAttivo: 'Old', operatorId: 'test-op' })
        const updated = await upsertDrug({ drugId: drug.id, existing: drug, nomeFarmaco: 'Aggiorna', principioAttivo: 'New', operatorId: 'test-op' })
        expect(updated.principioAttivo).toBe('New')
    })

    it('elimina un farmaco', async () => {
        const drug = await upsertDrug({ nomeFarmaco: 'Elimina', principioAttivo: 'T', operatorId: 'test-op' })
        const del = await deleteDrug({ drugId: drug.id, existing: drug, operatorId: 'test-op' })
        expect(del.deletedAt).toBeTruthy()
        const stored = await db.drugs.get(drug.id)
        expect(stored.deletedAt).toBeTruthy()
    })

    it('creazione e rimozione non causano errori di sessione', async () => {
        const drug = await upsertDrug({ nomeFarmaco: 'NoLog', principioAttivo: 'NL', operatorId: 'test-op' })
        expect(drug.id).toBeTruthy()
        const del = await deleteDrug({ drugId: drug.id, existing: drug, operatorId: 'test-op' })
        expect(del.deletedAt).toBeTruthy()
    })
})

// ═══ CONFEZIONI ═══
describe('Confezioni — CRUD', () => {
    it('crea una confezione', async () => {
        const drug = await upsertDrug({ nomeFarmaco: 'FarmConf', principioAttivo: 'PC', operatorId: 'test-op' })
        const batch = await upsertBatch({
            drugId: drug.id, nomeCommerciale: 'Tachipirina 500mg 20cpr',
            dosaggio: '500mg', quantitaAttuale: 100, sogliaRiordino: 20,
            scadenza: '2027-12-31', operatorId: 'test-op',
        })
        expect(batch.id).toMatch(/^batch_/)
        expect(batch.drugId).toBe(drug.id)
        expect(batch.nomeCommerciale).toBe('Tachipirina 500mg 20cpr')
        expect(batch.deletedAt).toBeNull()

        const stored = await db.stockBatches.get(batch.id)
        expect(stored).toBeDefined()
    })

    it('disattiva una confezione', async () => {
        const drug = await upsertDrug({ nomeFarmaco: 'FarmDelC', principioAttivo: 'PDC', operatorId: 'test-op' })
        const batch = await upsertBatch({ drugId: drug.id, nomeCommerciale: 'Del Batch', quantitaAttuale: 50, sogliaRiordino: 5, operatorId: 'test-op' })
        const deact = await deactivateBatch({ batchId: batch.id, existing: batch, operatorId: 'test-op' })
        expect(deact.deletedAt).toBeTruthy()
        const stored = await db.stockBatches.get(batch.id)
        expect(stored.deletedAt).toBeTruthy()
    })

    it('creazione e disattivazione non causano errori di sessione', async () => {
        const drug = await upsertDrug({ nomeFarmaco: 'NoLogB', principioAttivo: 'NLB', operatorId: 'test-op' })
        const batch = await upsertBatch({ drugId: drug.id, nomeCommerciale: 'NoLog Batch', quantitaAttuale: 10, sogliaRiordino: 2, operatorId: 'test-op' })
        expect(batch.id).toBeTruthy()
        const deact = await deactivateBatch({ batchId: batch.id, existing: batch, operatorId: 'test-op' })
        expect(deact.deletedAt).toBeTruthy()
    })
})

// ═══ PROMEMORIA ═══
describe('Promemoria — workflow completo', () => {
    async function setupTherapyContext() {
        const room = await seedResidenza()
        const host = await seedHost('THOST', 'Terapia', 'Host', room.id)
        const drug = await upsertDrug({ nomeFarmaco: 'TerapiaDrug', principioAttivo: 'TD', operatorId: 'test-op' })
        const batch = await seedBatch(drug.id, 'TerapiaBatch')

        const therapy = await upsertTherapy({
            form: {
                hostId: host.id,
                drugId: drug.id,
                stockBatchId: batch.id,
                dosePerSomministrazione: 1,
                somministrazioniGiornaliere: 3,
                orariSomministrazione: ['08:00', '14:00', '20:00'],
                dataInizio: new Date().toISOString().slice(0, 10),
                dataFine: null,
                note: 'Test therapy',
            },
            operatorId: 'test-op',
        })

        const now = new Date()
        const today = now.toISOString().slice(0, 10)
        const reminders = []
        for (const ora of ['08:00', '14:00', '20:00']) {
            const rId = generateEntityId('rem')
            const reminder = {
                id: rId, hostId: host.id, therapyId: therapy.id, drugId: drug.id,
                batchId: batch.id, scheduledAt: `${today}T${ora}:00.000Z`,
                stato: 'DA_ESEGUIRE', note: '', channel: 'app', priority: 'normale',
                updatedAt: now.toISOString(), deletedAt: null, syncStatus: 'pending',
            }
            await db.reminders.put(reminder)
            reminders.push(reminder)
        }
        return { host, drug, batch, therapy, reminders }
    }

    it('REMINDER_OUTCOMES è un array con gli esiti validi', () => {
        expect(Array.isArray(REMINDER_OUTCOMES)).toBe(true)
        expect(REMINDER_OUTCOMES).toContain('ESEGUITO')
        expect(REMINDER_OUTCOMES).toContain('SALTATO')
        expect(REMINDER_OUTCOMES).toContain('POSTICIPATO')
        expect(REMINDER_OUTCOMES).toContain('ANNULLATO')
    })

    it('getScheduledTimesForTherapy genera orari', () => {
        const t = getScheduledTimesForTherapy(
            { orariSomministrazione: ['08:00', '14:00', '20:00'], somministrazioniGiornaliere: 3 },
            new Date('2026-06-22')
        )
        expect(t).toHaveLength(3)
        expect(t[0].getHours()).toBe(8)
        expect(t[0].getMinutes()).toBe(0)
    })

    it('crea terapia e verifica promemoria', async () => {
        const { therapy, reminders } = await setupTherapyContext()
        expect(therapy.id).toMatch(/^therapy_/)
        expect(reminders).toHaveLength(3)
        const stored = await db.reminders.where('therapyId').equals(therapy.id).toArray()
        expect(stored).toHaveLength(3)
        stored.forEach(r => expect(r.stato).toBe('DA_ESEGUIRE'))
    })

    it('marca Eseguito', async () => {
        const { reminders } = await setupTherapyContext()
        const r = await markReminder({ reminderId: reminders[0].id, outcome: 'ESEGUITO', operatorId: 'test-op', note: 'Ok' })
        expect(r.stato).toBe('ESEGUITO')
        expect((await db.reminders.get(reminders[0].id)).stato).toBe('ESEGUITO')
    })

    it('marca Saltato e ripristina via DB (DA_ESEGUIRE non è outcome di markReminder)', async () => {
        const { reminders } = await setupTherapyContext()
        await markReminder({ reminderId: reminders[1].id, outcome: 'SALTATO', operatorId: 'test-op' })
        expect((await db.reminders.get(reminders[1].id)).stato).toBe('SALTATO')

        // Ripristino: aggiorna direttamente il record per tornare a DA_ESEGUIRE
        const now = new Date().toISOString()
        await db.reminders.put({ ...reminders[1], stato: 'DA_ESEGUIRE', note: 'Ripristinato', updatedAt: now })
        const restored = await db.reminders.get(reminders[1].id)
        expect(restored.stato).toBe('DA_ESEGUIRE')
        expect(restored.note).toBe('Ripristinato')
    })

    it('posticipa promemoria', async () => {
        const { reminders } = await setupTherapyContext()
        await markReminder({ reminderId: reminders[0].id, outcome: 'POSTICIPATO', operatorId: 'test-op', note: 'A domani' })
        const stored = await db.reminders.get(reminders[0].id)
        expect(stored.stato).toBe('POSTICIPATO')
        expect(stored.note).toBe('A domani')
    })

    it('buildReminderRows include stati misti', async () => {
        const { host, reminders, therapy } = await setupTherapyContext()
        await markReminder({ reminderId: reminders[0].id, outcome: 'ESEGUITO', operatorId: 'test-op' })
        const rows = buildReminderRows({ reminders: await db.reminders.toArray(), therapies: [therapy], hosts: [host], drugs: [], batches: [], rooms: [] })
        expect(rows.find(r => r.stato === 'ESEGUITO')).toBeDefined()
        expect(rows.find(r => r.stato === 'DA_ESEGUIRE')).toBeDefined()
    })

    it('workflow completo non lancia errori', async () => {
        const { reminders } = await setupTherapyContext()
        await markReminder({ reminderId: reminders[0].id, outcome: 'SALTATO', operatorId: 'test-op' })
        await markReminder({ reminderId: reminders[0].id, outcome: 'POSTICIPATO', operatorId: 'test-op' })
        await markReminder({ reminderId: reminders[0].id, outcome: 'ESEGUITO', operatorId: 'test-op' })
        expect((await db.reminders.get(reminders[0].id)).stato).toBe('ESEGUITO')
    })

    it('disattiva terapia', async () => {
        const { therapy } = await setupTherapyContext()
        await deactivateTherapyRecord({ therapy, operatorId: 'test-op' })
        expect((await db.therapies.get(therapy.id)).deletedAt).toBeTruthy()
    })
})

// ═══ RILEVAZIONE DUPLICATI TRASVERSALE ═══
describe('Rilevazione duplicati — tutti i tipi', () => {
    it('Residenza: stesso codice → errore', async () => {
        await createResidenza({ codice: 'Villa Dup', operatorId: 'test-op' })
        await expect(createResidenza({ codice: 'Villa Dup', operatorId: 'test-op' })).rejects.toThrow('Residenza gia esistente')
    })

    it('Residenza: case-insensitive → errore', async () => {
        await createResidenza({ codice: 'Case Test', operatorId: 'test-op' })
        await expect(createResidenza({ codice: 'case test', operatorId: 'test-op' })).rejects.toThrow()
    })

    it('Farmaco: stesso nome → errore', async () => {
        await upsertDrug({ nomeFarmaco: 'Farmaco Dup', principioAttivo: 'A', operatorId: 'test-op' })
        await expect(upsertDrug({ nomeFarmaco: 'Farmaco Dup', principioAttivo: 'B', operatorId: 'test-op' })).rejects.toThrow('Farmaco gia esistente')
    })

    it('Ospite: stesso codiceInterno → errore', async () => {
        const room = await seedResidenza()
        await createHost({ codiceInterno: 'DUPHOST', iniziali: 'A.A.', nome: 'A', cognome: 'A', roomId: room.id })
        await expect(createHost({ codiceInterno: 'DUPHOST', iniziali: 'B.B.', nome: 'B', cognome: 'B', roomId: room.id })).rejects.toThrow()
    })

    it('Ospite: stesso nome+cognome → errore', async () => {
        const room = await seedResidenza()
        await createHost({ codiceInterno: 'H1', iniziali: 'M.R.', nome: 'Mario', cognome: 'Rossi', roomId: room.id })
        await expect(createHost({ codiceInterno: 'H2', iniziali: 'M.R.', nome: 'Mario', cognome: 'Rossi', roomId: room.id })).rejects.toThrow()
    })

    it('Ospite: stesso nome, cognome diverso → OK', async () => {
        const room = await seedResidenza()
        await createHost({ codiceInterno: 'H3', iniziali: 'M.R.', nome: 'Mario', cognome: 'Rossi', roomId: room.id })
        const host = await createHost({ codiceInterno: 'H4', iniziali: 'M.B.', nome: 'Mario', cognome: 'Bianchi', roomId: room.id })
        expect(host.cognome).toBe('Bianchi')
    })

    it('Residenza: nome vuoto → errore', async () => {
        await expect(createResidenza({ codice: '', operatorId: 'test-op' })).rejects.toThrow('Nome residenza obbligatorio')
    })

    it('Farmaco: nome vuoto → errore', async () => {
        await expect(upsertDrug({ nomeFarmaco: '', principioAttivo: 'Test', operatorId: 'test-op' })).rejects.toThrow('Nome farmaco obbligatorio')
    })

    it('Farmaco: principio attivo vuoto → errore', async () => {
        await expect(upsertDrug({ nomeFarmaco: 'Test', principioAttivo: '', operatorId: 'test-op' })).rejects.toThrow('Principio attivo obbligatorio')
    })

    it('Ospite: senza codiceInterno e iniziali → errore', async () => {
        const room = await seedResidenza()
        await expect(createHost({ codiceInterno: '', iniziali: '', nome: 'No', cognome: 'Code', roomId: room.id })).rejects.toThrow('Codice interno o iniziali obbligatori')
    })
})

// ═══ INTEGRITÀ DATI ═══
describe('Integrità dati — syncQueue e activityLog', () => {
    it('creazione Residenza → syncQueue + activityLog', async () => {
        const [s, l] = [await db.syncQueue.count(), await db.activityLog.count()]
        await createResidenza({ codice: 'Int Res', operatorId: 'test-op' })
        expect(await db.syncQueue.count()).toBeGreaterThan(s)
        expect(await db.activityLog.count()).toBeGreaterThan(l)
    })

    it('creazione Farmaco → syncQueue + activityLog', async () => {
        const [s, l] = [await db.syncQueue.count(), await db.activityLog.count()]
        await upsertDrug({ nomeFarmaco: 'Int Drug', principioAttivo: 'ID', operatorId: 'test-op' })
        expect(await db.syncQueue.count()).toBeGreaterThan(s)
        expect(await db.activityLog.count()).toBeGreaterThan(l)
    })

    it('creazione Ospite → syncQueue + activityLog', async () => {
        const room = await seedResidenza()
        const [s, l] = [await db.syncQueue.count(), await db.activityLog.count()]
        await createHost({ codiceInterno: 'INT', iniziali: 'I.T.', nome: 'Int', cognome: 'Test', roomId: room.id })
        expect(await db.syncQueue.count()).toBeGreaterThan(s)
        expect(await db.activityLog.count()).toBeGreaterThan(l)
    })

    it('eliminazione Ospite → syncQueue + activityLog', async () => {
        const room = await seedResidenza()
        const host = await createHost({ codiceInterno: 'DEL', iniziali: 'D.I.', nome: 'Del', cognome: 'Int', roomId: room.id })
        const [s, l] = [await db.syncQueue.count(), await db.activityLog.count()]
        await deleteHost({ hostId: host.id, operatorId: 'test-op' })
        expect(await db.syncQueue.count()).toBeGreaterThan(s)
        expect(await db.activityLog.count()).toBeGreaterThan(l)
    })

    it('eliminazione Farmaco → syncQueue + activityLog', async () => {
        const drug = await upsertDrug({ nomeFarmaco: 'Del Drug', principioAttivo: 'DD', operatorId: 'test-op' })
        const [s, l] = [await db.syncQueue.count(), await db.activityLog.count()]
        await deleteDrug({ drugId: drug.id, existing: drug, operatorId: 'test-op' })
        expect(await db.syncQueue.count()).toBeGreaterThan(s)
        expect(await db.activityLog.count()).toBeGreaterThan(l)
    })

    it('disattivazione Residenza → syncQueue + activityLog', async () => {
        const res = await createResidenza({ codice: 'Del Res', operatorId: 'test-op' })
        const [s, l] = [await db.syncQueue.count(), await db.activityLog.count()]
        await deactivateResidenza({ roomId: res.id, operatorId: 'test-op' })
        expect(await db.syncQueue.count()).toBeGreaterThan(s)
        expect(await db.activityLog.count()).toBeGreaterThan(l)
    })
})
