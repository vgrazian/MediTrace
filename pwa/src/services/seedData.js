/**
 * seedData.js — Dati demo per sviluppo e test manuali
 *
 * Disponibile solo in modalità DEV (import.meta.env.DEV = true) oppure se
 * la variabile d'ambiente VITE_SEED_DATA=1 è esplicitamente impostata.
 *
 * Tutti i record demo vengono creati all'interno della residenza "Residenza Demo",
 * lasciando le residenze reali ("Il Rifugio", "Via Bellani") vuote e pronte all'uso.
 *
 * API:
 *   loadDemoData(options?)     — carica tutti i record demo (idempotente)
 *   clearDemoData(options?)    — rimuove tutti i record demo
 *   isDemoDataLoaded()         — true se il manifest demo è presente
 *   getDemoStats()             — conteggio record per tabella (statico)
 */
import { db, enqueue, getSetting, setSetting } from '../db'
import { upsertDemoAuthUsers, clearDemoAuthUsers } from './seedAuthUsers.js'
import { ensureDefaultResidenze } from './residenze.js'

// ── Guard ─────────────────────────────────────────────────────────────────────

const SEED_ENABLED = import.meta.env.DEV || import.meta.env.VITE_SEED_DATA === '1'
const DEMO_MANIFEST_KEY = '_demoDataManifest'
const DEMO_PREFIX = '__demo__'
const LEGACY_PREFIXES = ['__seed__', '__realistic__', '__demo__']
const DEMO_STORE_NAMES = ['rooms', 'hosts', 'drugs', 'stockBatches', 'therapies', 'movements', 'reminders']

const NOW = '2026-04-04T08:00:00.000Z'

/**
 * Promise that resolves when demo data seeding is complete (or immediately
 * if seeding is disabled). Views should await this before reading from the DB
 * to avoid rendering empty tables on first paint.
 */
let dataReadyResolve
export const dataReady = new Promise(resolve => {
  dataReadyResolve = resolve
})

/** Build an ISO date string relative to today: dayOffset (0=today, -1=yesterday, 1=tomorrow), hour, minute */
function buildDateStr(dayOffset, hour, minute) {
    const d = new Date()
    d.setDate(d.getDate() + dayOffset)
    d.setHours(hour, minute, 0, 0)
    return d.toISOString()
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function getAvailableStoreNames(expectedStoreNames) {
    if (typeof db.open === 'function') {
        await db.open()
    }
    if (typeof db.backendDB !== 'function') {
        return new Set(expectedStoreNames)
    }
    const backendDb = db.backendDB()
    if (!backendDb?.objectStoreNames) {
        return new Set(expectedStoreNames)
    }
    return new Set(
        expectedStoreNames.filter(storeName => backendDb.objectStoreNames.contains(storeName))
    )
}

async function findDemoIds(table) {
    if (!table || typeof table.toArray !== 'function') return []
    const rows = await table.toArray()
    return rows
        .filter(row => !row?.deletedAt)
        .map(row => row?.id)
        .filter(id => typeof id === 'string' && LEGACY_PREFIXES.some(p => id.startsWith(p)))
}

function uniqueIds(ids = []) {
    return [...new Set((ids || []).filter(Boolean).map(id => String(id)))]
}

function hasDemoReference(value) {
    const str = String(value || '')
    if (!str) return false
    return LEGACY_PREFIXES.some(p => str.startsWith(p))
}

async function findDemoLinkedIds(table, relationFields = []) {
    if (!table || typeof table.toArray !== 'function') return []
    const rows = await table.toArray()
    return rows
        .filter((row) => {
            if (!row || row.deletedAt) return false
            const id = String(row.id || '')
            if (LEGACY_PREFIXES.some(p => id.startsWith(p))) return true
            if (id.startsWith('__movement___seed__') || id.startsWith('__movement___realistic__')) return true
            if (row._seeded === true) return true
            return relationFields.some((field) => hasDemoReference(row[field]))
        })
        .map((row) => row.id)
        .filter(Boolean)
}

async function softDeleteDemoRecords(storeName, ids, now) {
    const table = db[storeName]
    if (!table || typeof table.get !== 'function' || typeof table.put !== 'function') return 0
    let changed = 0
    for (const id of uniqueIds(ids)) {
        const existing = await table.get(id)
        if (!existing || existing.deletedAt) continue
        await table.put({
            ...existing,
            deletedAt: now,
            updatedAt: now,
            syncStatus: 'synced',
        })
        await enqueue(storeName, id, 'upsert')
        changed += 1
    }
    return changed
}

async function getDemoManifest() {
    const manifest = await getSetting(DEMO_MANIFEST_KEY, null)
    if (manifest) return manifest

    const [rooms, hosts, drugs, stockBatches, therapies, movements, reminders] = await Promise.all([
        findDemoIds(db.rooms),
        findDemoIds(db.hosts),
        findDemoIds(db.drugs),
        findDemoIds(db.stockBatches),
        findDemoIds(db.therapies),
        findDemoIds(db.movements),
        findDemoIds(db.reminders),
    ])

    const fallbackManifest = { rooms, hosts, drugs, stockBatches, therapies, movements, reminders }
    const hasSeedRows = Object.values(fallbackManifest).some(ids => ids.length > 0)
    return hasSeedRows ? fallbackManifest : null
}

function assertSeedEnabled(options = {}) {
    if (SEED_ENABLED || options.allowInProduction === true) return
    throw new Error('Dati demo non disponibili in produzione. Usa il pannello admin per abilitarli esplicitamente quando necessario.')
}

// ── Dati demo ─────────────────────────────────────────────────────────────────
// Tutti i dati sono collocati nella residenza "Residenza Demo"

const DEMO_ROOMS = [
    { id: '__demo__residenza-demo', codice: 'Demo', descrizione: 'Residenza fittizia per dati dimostrativi', metadata: { maxOspiti: 10 }, updatedAt: NOW, deletedAt: null, syncStatus: 'synced', _seeded: true },
]

const DEMO_DRUGS = [
    { id: '__demo__drug-1', principioAttivo: 'Paracetamolo', nomeFarmaco: 'Tachipirina', classeTerapeutica: 'Analgesici / Antipiretici', scortaMinima: 10, fornitore: 'Farmacia Centrale', note: '', updatedAt: NOW, deletedAt: null, syncStatus: 'synced', _seeded: true },
    { id: '__demo__drug-2', principioAttivo: 'Ibuprofene', nomeFarmaco: 'Brufen', classeTerapeutica: 'FANS', scortaMinima: 8, fornitore: 'Farmacia Centrale', note: '', updatedAt: NOW, deletedAt: null, syncStatus: 'synced', _seeded: true },
    { id: '__demo__drug-3', principioAttivo: 'Ramipril', nomeFarmaco: 'Triatec', classeTerapeutica: 'ACE inibitori', scortaMinima: 6, fornitore: 'Fornitore Salute SpA', note: '', updatedAt: NOW, deletedAt: null, syncStatus: 'synced', _seeded: true },
    { id: '__demo__drug-4', principioAttivo: 'Metformina', nomeFarmaco: 'Glucophage', classeTerapeutica: 'Antidiabetici orali', scortaMinima: 12, fornitore: 'Fornitore Salute SpA', note: '', updatedAt: NOW, deletedAt: null, syncStatus: 'synced', _seeded: true },
    { id: '__demo__drug-5', principioAttivo: 'Lorazepam', nomeFarmaco: 'Tavor', classeTerapeutica: 'Ansiolitici', scortaMinima: 4, fornitore: 'Farmacia Ospedaliera', note: '', updatedAt: NOW, deletedAt: null, syncStatus: 'synced', _seeded: true },
    { id: '__demo__drug-6', principioAttivo: 'Amlodipina', nomeFarmaco: 'Norvasc', classeTerapeutica: 'Antiipertensivi CA', scortaMinima: 8, fornitore: 'Fornitore Salute SpA', note: '', updatedAt: NOW, deletedAt: null, syncStatus: 'synced', _seeded: true },
    { id: '__demo__drug-7', principioAttivo: 'Furosemide', nomeFarmaco: 'Lasix', classeTerapeutica: 'Diuretici', scortaMinima: 5, fornitore: 'Farmacia Centrale', note: '', updatedAt: NOW, deletedAt: null, syncStatus: 'synced', _seeded: true },
    { id: '__demo__drug-8', principioAttivo: 'Omeprazolo', nomeFarmaco: 'Omeprazen', classeTerapeutica: 'Inibitori pompa protonica', scortaMinima: 10, fornitore: 'Fornitore Salute SpA', note: '', updatedAt: NOW, deletedAt: null, syncStatus: 'synced', _seeded: true },
    { id: '__demo__drug-9', principioAttivo: 'Levotiroxina', nomeFarmaco: 'Eutirox', classeTerapeutica: 'Ormoni tiroidei', scortaMinima: 6, fornitore: 'Farmacia Centrale', note: '', updatedAt: NOW, deletedAt: null, syncStatus: 'synced', _seeded: true },
    { id: '__demo__drug-10', principioAttivo: 'Atenololo', nomeFarmaco: 'Tenormin', classeTerapeutica: 'Beta bloccanti', scortaMinima: 7, fornitore: 'Fornitore Salute SpA', note: '', updatedAt: NOW, deletedAt: null, syncStatus: 'synced', _seeded: true },
]

const DEMO_HOSTS = [
    { id: '__demo__host-1', codiceInterno: 'OSP-01', nome: 'Mario', cognome: 'Rossi', luogoNascita: 'Roma', dataNascita: '1945-03-12', sesso: 'M', codiceFiscale: 'RSSMRA45C12H501X', patologie: 'Allergia penicillina', roomId: '__demo__residenza-demo', bedId: '__demo__bed-1', attivo: true, updatedAt: NOW, deletedAt: null, syncStatus: 'synced', _seeded: true },
    { id: '__demo__host-2', codiceInterno: 'OSP-02', nome: 'Giuseppina', cognome: 'Bianchi', luogoNascita: 'Milano', dataNascita: '1948-07-21', sesso: 'F', codiceFiscale: 'BNCGPP48L61F205X', patologie: 'Ipertensione', roomId: '__demo__residenza-demo', bedId: '__demo__bed-2', attivo: true, updatedAt: NOW, deletedAt: null, syncStatus: 'synced', _seeded: true },
    { id: '__demo__host-3', codiceInterno: 'OSP-03', nome: 'Giuseppe', cognome: 'Pini', luogoNascita: 'Napoli', dataNascita: '1942-11-03', sesso: 'M', codiceFiscale: 'PNIGPP42S03F839X', patologie: 'Diabete tipo 2', roomId: '__demo__residenza-demo', bedId: '__demo__bed-3', attivo: true, updatedAt: NOW, deletedAt: null, syncStatus: 'synced', _seeded: true },
    { id: '__demo__host-4', codiceInterno: 'OSP-04', nome: 'Laura', cognome: 'Tesi', luogoNascita: 'Torino', dataNascita: '1950-02-14', sesso: 'F', codiceFiscale: 'TSELRU50B54L219X', patologie: 'Artrosi', roomId: '__demo__residenza-demo', bedId: '__demo__bed-4', attivo: true, updatedAt: NOW, deletedAt: null, syncStatus: 'synced', _seeded: true },
    { id: '__demo__host-5', codiceInterno: 'OSP-05', nome: 'Elena', cognome: 'Seri', luogoNascita: 'Bologna', dataNascita: '1947-09-18', sesso: 'F', codiceFiscale: 'SRELEN47P58A944X', patologie: 'Cardiopatia ischemica', roomId: '__demo__residenza-demo', bedId: '__demo__bed-5', attivo: true, updatedAt: NOW, deletedAt: null, syncStatus: 'synced', _seeded: true },
    { id: '__demo__host-6', codiceInterno: 'OSP-06', nome: 'Paolo', cognome: 'Cerri', luogoNascita: 'Genova', dataNascita: '1944-05-09', sesso: 'M', codiceFiscale: 'CRRPLA44E09D969X', patologie: 'Reflusso gastroesofageo', roomId: '__demo__residenza-demo', bedId: '__demo__bed-6', attivo: true, updatedAt: NOW, deletedAt: null, syncStatus: 'synced', _seeded: true },
    { id: '__demo__host-7', codiceInterno: 'OSP-07', nome: 'Vito', cognome: 'Danti', luogoNascita: 'Bari', dataNascita: '1941-01-26', sesso: 'M', codiceFiscale: 'DNTVTI41A26A662X', patologie: 'Diabete controllato', roomId: '__demo__residenza-demo', bedId: '__demo__bed-7', attivo: true, updatedAt: NOW, deletedAt: null, syncStatus: 'synced', _seeded: true },
    { id: '__demo__host-8', codiceInterno: 'OSP-08', nome: 'Fatima', cognome: 'Mansouri', luogoNascita: 'Rabat', dataNascita: '1949-10-05', sesso: 'F', codiceFiscale: 'MNSFTM49R45Z330X', patologie: 'Ipertensione', roomId: '__demo__residenza-demo', bedId: '__demo__bed-8', attivo: true, updatedAt: NOW, deletedAt: null, syncStatus: 'synced', _seeded: true },
    { id: '__demo__host-9', codiceInterno: 'OSP-09', nome: 'Ahmed', cognome: 'Hassan', luogoNascita: 'Casablanca', dataNascita: '1946-12-30', sesso: 'M', codiceFiscale: 'LIXHMD46T30Z330X', patologie: 'BPCO lieve', roomId: '__demo__residenza-demo', bedId: '__demo__bed-9', attivo: true, updatedAt: NOW, deletedAt: null, syncStatus: 'synced', _seeded: true },
    { id: '__demo__host-10', codiceInterno: 'OSP-10', nome: 'Sara', cognome: 'Riva', luogoNascita: 'Firenze', dataNascita: '1952-04-11', sesso: 'F', codiceFiscale: 'RVISRA52D51D612X', patologie: 'Dimesso', roomId: '__demo__residenza-demo', bedId: '__demo__bed-10', attivo: false, updatedAt: NOW, deletedAt: NOW, syncStatus: 'synced', _seeded: true },
]

const DEMO_STOCK_BATCHES = [
    { id: '__demo__batch-1', drugId: '__demo__drug-1', nomeCommerciale: 'Tachipirina 500 mg', dosaggio: '500 mg', forma: 'Compresse', unitaMisura: 'cpr', lotto: 'L1001', scadenza: '2027-06-30', quantitaIniziale: 100, quantitaAttuale: 52, sogliaRiordino: 20, updatedAt: NOW, deletedAt: null, syncStatus: 'synced', _seeded: true },
    { id: '__demo__batch-2', drugId: '__demo__drug-2', nomeCommerciale: 'Brufen 400 mg', dosaggio: '400 mg', forma: 'Compresse rivestite', unitaMisura: 'cpr', lotto: 'L2001', scadenza: '2026-12-31', quantitaIniziale: 60, quantitaAttuale: 5, sogliaRiordino: 15, updatedAt: NOW, deletedAt: null, syncStatus: 'synced', _seeded: true },
    { id: '__demo__batch-3', drugId: '__demo__drug-3', nomeCommerciale: 'Triatec 5 mg', dosaggio: '5 mg', forma: 'Compresse', unitaMisura: 'cpr', lotto: 'L3001', scadenza: '2027-03-31', quantitaIniziale: 90, quantitaAttuale: 72, sogliaRiordino: 10, updatedAt: NOW, deletedAt: null, syncStatus: 'synced', _seeded: true },
    { id: '__demo__batch-4', drugId: '__demo__drug-4', nomeCommerciale: 'Glucophage 500 mg', dosaggio: '500 mg', forma: 'Compresse', unitaMisura: 'cpr', lotto: 'L4001', scadenza: '2027-09-30', quantitaIniziale: 120, quantitaAttuale: 80, sogliaRiordino: 20, updatedAt: NOW, deletedAt: null, syncStatus: 'synced', _seeded: true },
    { id: '__demo__batch-5', drugId: '__demo__drug-5', nomeCommerciale: 'Tavor 1 mg', dosaggio: '1 mg', forma: 'Compresse sublinguali', unitaMisura: 'cpr', lotto: 'L5001', scadenza: '2026-08-31', quantitaIniziale: 30, quantitaAttuale: 3, sogliaRiordino: 8, updatedAt: NOW, deletedAt: null, syncStatus: 'synced', _seeded: true },
    { id: '__demo__batch-6', drugId: '__demo__drug-1', nomeCommerciale: 'Paracetamolo TEVA 1000 mg', dosaggio: '1000 mg', forma: 'Compresse effervescenti', unitaMisura: 'cpr', lotto: 'L1002', scadenza: '2027-01-31', quantitaIniziale: 50, quantitaAttuale: 0, sogliaRiordino: 10, updatedAt: NOW, deletedAt: null, syncStatus: 'synced', _seeded: true },
    { id: '__demo__batch-7', drugId: '__demo__drug-6', nomeCommerciale: 'Norvasc 5 mg', dosaggio: '5 mg', forma: 'Compresse', unitaMisura: 'cpr', lotto: 'L6001', scadenza: '2027-08-31', quantitaIniziale: 100, quantitaAttuale: 85, sogliaRiordino: 15, updatedAt: NOW, deletedAt: null, syncStatus: 'synced', _seeded: true },
    { id: '__demo__batch-8', drugId: '__demo__drug-7', nomeCommerciale: 'Lasix 40 mg', dosaggio: '40 mg', forma: 'Compresse', unitaMisura: 'cpr', lotto: 'L7001', scadenza: '2027-05-31', quantitaIniziale: 60, quantitaAttuale: 45, sogliaRiordino: 12, updatedAt: NOW, deletedAt: null, syncStatus: 'synced', _seeded: true },
    { id: '__demo__batch-9', drugId: '__demo__drug-8', nomeCommerciale: 'Omeprazen 20 mg', dosaggio: '20 mg', forma: 'Capsule', unitaMisura: 'cps', lotto: 'L8001', scadenza: '2027-04-30', quantitaIniziale: 80, quantitaAttuale: 60, sogliaRiordino: 18, updatedAt: NOW, deletedAt: null, syncStatus: 'synced', _seeded: true },
    { id: '__demo__batch-10', drugId: '__demo__drug-9', nomeCommerciale: 'Eutirox 100 mcg', dosaggio: '100 mcg', forma: 'Compresse', unitaMisura: 'cpr', lotto: 'L9001', scadenza: '2027-12-31', quantitaIniziale: 90, quantitaAttuale: 78, sogliaRiordino: 14, updatedAt: NOW, deletedAt: null, syncStatus: 'synced', _seeded: true },
    { id: '__demo__batch-11', drugId: '__demo__drug-10', nomeCommerciale: 'Tenormin 50 mg', dosaggio: '50 mg', forma: 'Compresse', unitaMisura: 'cpr', lotto: 'L10001', scadenza: '2027-07-31', quantitaIniziale: 70, quantitaAttuale: 52, sogliaRiordino: 16, updatedAt: NOW, deletedAt: null, syncStatus: 'synced', _seeded: true },
]

const DEMO_THERAPIES = [
    { id: '__demo__therapy-1', hostId: '__demo__host-1', drugId: '__demo__drug-1', stockBatchIdPreferito: '__demo__batch-1', dosePerSomministrazione: 1, unitaDose: 'cpr', somministrazioniGiornaliere: 2, consumoMedioSettimanale: 14, dataInizio: '2026-01-10T00:00:00.000Z', dataFine: null, attiva: true, note: '', updatedAt: NOW, deletedAt: null, syncStatus: 'synced', _seeded: true },
    { id: '__demo__therapy-2', hostId: '__demo__host-1', drugId: '__demo__drug-3', stockBatchIdPreferito: '__demo__batch-3', dosePerSomministrazione: 1, unitaDose: 'cpr', somministrazioniGiornaliere: 1, consumoMedioSettimanale: 7, dataInizio: '2025-11-15T00:00:00.000Z', dataFine: null, attiva: true, note: '', updatedAt: NOW, deletedAt: null, syncStatus: 'synced', _seeded: true },
    { id: '__demo__therapy-3', hostId: '__demo__host-2', drugId: '__demo__drug-2', stockBatchIdPreferito: '__demo__batch-2', dosePerSomministrazione: 1, unitaDose: 'cpr', somministrazioniGiornaliere: 3, consumoMedioSettimanale: 21, dataInizio: '2026-02-01T00:00:00.000Z', dataFine: null, attiva: true, note: '', updatedAt: NOW, deletedAt: null, syncStatus: 'synced', _seeded: true },
    { id: '__demo__therapy-4', hostId: '__demo__host-3', drugId: '__demo__drug-4', stockBatchIdPreferito: '__demo__batch-4', dosePerSomministrazione: 2, unitaDose: 'cpr', somministrazioniGiornaliere: 2, consumoMedioSettimanale: 28, dataInizio: '2025-09-01T00:00:00.000Z', dataFine: null, attiva: true, note: 'Controllare glicemia settimanalmente', updatedAt: NOW, deletedAt: null, syncStatus: 'synced', _seeded: true },
    { id: '__demo__therapy-5', hostId: '__demo__host-3', drugId: '__demo__drug-5', stockBatchIdPreferito: '__demo__batch-5', dosePerSomministrazione: 1, unitaDose: 'cpr', somministrazioniGiornaliere: 1, consumoMedioSettimanale: 7, dataInizio: '2026-03-01T00:00:00.000Z', dataFine: null, attiva: true, note: '', updatedAt: NOW, deletedAt: null, syncStatus: 'synced', _seeded: true },
    { id: '__demo__therapy-6', hostId: '__demo__host-4', drugId: '__demo__drug-1', stockBatchIdPreferito: '__demo__batch-1', dosePerSomministrazione: 1, unitaDose: 'cpr', somministrazioniGiornaliere: 1, consumoMedioSettimanale: 7, dataInizio: '2025-06-01T00:00:00.000Z', dataFine: '2026-02-28T23:59:59.000Z', attiva: false, note: 'Dimesso', updatedAt: NOW, deletedAt: NOW, syncStatus: 'synced', _seeded: true },
    { id: '__demo__therapy-7', hostId: '__demo__host-5', drugId: '__demo__drug-6', stockBatchIdPreferito: '__demo__batch-7', dosePerSomministrazione: 1, unitaDose: 'cpr', somministrazioniGiornaliere: 1, consumoMedioSettimanale: 7, dataInizio: '2025-12-01T00:00:00.000Z', dataFine: null, attiva: true, note: '', updatedAt: NOW, deletedAt: null, syncStatus: 'synced', _seeded: true },
    { id: '__demo__therapy-8', hostId: '__demo__host-5', drugId: '__demo__drug-7', stockBatchIdPreferito: '__demo__batch-8', dosePerSomministrazione: 1, unitaDose: 'cpr', somministrazioniGiornaliere: 1, consumoMedioSettimanale: 7, dataInizio: '2026-01-15T00:00:00.000Z', dataFine: null, attiva: true, note: 'Cardiopatia ischemica', updatedAt: NOW, deletedAt: null, syncStatus: 'synced', _seeded: true },
    { id: '__demo__therapy-9', hostId: '__demo__host-6', drugId: '__demo__drug-8', stockBatchIdPreferito: '__demo__batch-9', dosePerSomministrazione: 1, unitaDose: 'cps', somministrazioniGiornaliere: 1, consumoMedioSettimanale: 7, dataInizio: '2026-02-15T00:00:00.000Z', dataFine: null, attiva: true, note: '', updatedAt: NOW, deletedAt: null, syncStatus: 'synced', _seeded: true },
    { id: '__demo__therapy-10', hostId: '__demo__host-7', drugId: '__demo__drug-4', stockBatchIdPreferito: '__demo__batch-4', dosePerSomministrazione: 1, unitaDose: 'cpr', somministrazioniGiornaliere: 2, consumoMedioSettimanale: 14, dataInizio: '2025-08-20T00:00:00.000Z', dataFine: null, attiva: true, note: 'Diabete t2', updatedAt: NOW, deletedAt: null, syncStatus: 'synced', _seeded: true },
    { id: '__demo__therapy-11', hostId: '__demo__host-7', drugId: '__demo__drug-9', stockBatchIdPreferito: '__demo__batch-10', dosePerSomministrazione: 1, unitaDose: 'cpr', somministrazioniGiornaliere: 1, consumoMedioSettimanale: 7, dataInizio: '2025-10-10T00:00:00.000Z', dataFine: null, attiva: true, note: 'Ipotiroidismo', updatedAt: NOW, deletedAt: null, syncStatus: 'synced', _seeded: true },
    { id: '__demo__therapy-12', hostId: '__demo__host-8', drugId: '__demo__drug-10', stockBatchIdPreferito: '__demo__batch-11', dosePerSomministrazione: 1, unitaDose: 'cpr', somministrazioniGiornaliere: 1, consumoMedioSettimanale: 7, dataInizio: '2026-01-20T00:00:00.000Z', dataFine: null, attiva: true, note: '', updatedAt: NOW, deletedAt: null, syncStatus: 'synced', _seeded: true },
    { id: '__demo__therapy-13', hostId: '__demo__host-8', drugId: '__demo__drug-3', stockBatchIdPreferito: '__demo__batch-3', dosePerSomministrazione: 1, unitaDose: 'cpr', somministrazioniGiornaliere: 1, consumoMedioSettimanale: 7, dataInizio: '2025-07-01T00:00:00.000Z', dataFine: null, attiva: true, note: 'Ipertensione', updatedAt: NOW, deletedAt: null, syncStatus: 'synced', _seeded: true },
    { id: '__demo__therapy-14', hostId: '__demo__host-9', drugId: '__demo__drug-1', stockBatchIdPreferito: '__demo__batch-1', dosePerSomministrazione: 1, unitaDose: 'cpr', somministrazioniGiornaliere: 2, consumoMedioSettimanale: 14, dataInizio: '2026-02-10T00:00:00.000Z', dataFine: null, attiva: true, note: '', updatedAt: NOW, deletedAt: null, syncStatus: 'synced', _seeded: true },
    { id: '__demo__therapy-15', hostId: '__demo__host-9', drugId: '__demo__drug-2', stockBatchIdPreferito: '__demo__batch-2', dosePerSomministrazione: 1, unitaDose: 'cpr', somministrazioniGiornaliere: 1, consumoMedioSettimanale: 7, dataInizio: '2026-03-05T00:00:00.000Z', dataFine: null, attiva: true, note: '', updatedAt: NOW, deletedAt: null, syncStatus: 'synced', _seeded: true },
]

const DEMO_MOVEMENTS = [
    { id: '__demo__mov-1', stockBatchId: '__demo__batch-1', drugId: '__demo__drug-1', hostId: '__demo__host-1', therapyId: '__demo__therapy-1', tipoMovimento: 'CARICO', quantita: 60, unitaMisura: 'cpr', causale: 'Acquisto mensile', dataMovimento: '2026-03-01T09:00:00.000Z', settimanaRiferimento: '2026-W09', operatore: 'Admin MediTrace', source: 'manual', updatedAt: '2026-03-01T09:00:00.000Z', deletedAt: null, syncStatus: 'synced', _seeded: true },
    { id: '__demo__mov-2', stockBatchId: '__demo__batch-1', drugId: '__demo__drug-1', hostId: '__demo__host-1', therapyId: '__demo__therapy-1', tipoMovimento: 'SCARICO', quantita: 8, unitaMisura: 'cpr', causale: 'Somministrazione settimanale', dataMovimento: '2026-03-08T08:00:00.000Z', settimanaRiferimento: '2026-W10', operatore: 'Admin MediTrace', source: 'therapy', updatedAt: '2026-03-08T08:00:00.000Z', deletedAt: null, syncStatus: 'synced', _seeded: true },
    { id: '__demo__mov-3', stockBatchId: '__demo__batch-2', drugId: '__demo__drug-2', hostId: '__demo__host-2', therapyId: '__demo__therapy-3', tipoMovimento: 'SCARICO', quantita: 21, unitaMisura: 'cpr', causale: 'Somministrazione settimanale', dataMovimento: '2026-03-08T08:00:00.000Z', settimanaRiferimento: '2026-W10', operatore: 'Valerio Graziani', source: 'therapy', updatedAt: '2026-03-08T08:00:00.000Z', deletedAt: null, syncStatus: 'synced', _seeded: true },
    { id: '__demo__mov-4', stockBatchId: '__demo__batch-3', drugId: '__demo__drug-3', hostId: '__demo__host-1', therapyId: '__demo__therapy-2', tipoMovimento: 'SCARICO', quantita: 7, unitaMisura: 'cpr', causale: 'Somministrazione settimanale', dataMovimento: '2026-03-15T08:00:00.000Z', settimanaRiferimento: '2026-W11', operatore: 'Admin MediTrace', source: 'therapy', updatedAt: '2026-03-15T08:00:00.000Z', deletedAt: null, syncStatus: 'synced', _seeded: true },
    { id: '__demo__mov-5', stockBatchId: '__demo__batch-4', drugId: '__demo__drug-4', hostId: '__demo__host-3', therapyId: '__demo__therapy-4', tipoMovimento: 'SCARICO', quantita: 28, unitaMisura: 'cpr', causale: 'Somministrazione settimanale', dataMovimento: '2026-03-22T08:00:00.000Z', settimanaRiferimento: '2026-W12', operatore: 'Anna Maria Cigliano', source: 'therapy', updatedAt: '2026-03-22T08:00:00.000Z', deletedAt: null, syncStatus: 'synced', _seeded: true },
    { id: '__demo__mov-6', stockBatchId: '__demo__batch-5', drugId: '__demo__drug-5', hostId: '__demo__host-3', therapyId: '__demo__therapy-5', tipoMovimento: 'SCARICO', quantita: 7, unitaMisura: 'cpr', causale: 'Somministrazione settimanale', dataMovimento: '2026-03-29T08:00:00.000Z', settimanaRiferimento: '2026-W13', operatore: 'Valerio Graziani', source: 'therapy', updatedAt: '2026-03-29T08:00:00.000Z', deletedAt: null, syncStatus: 'synced', _seeded: true },
    { id: '__demo__mov-7', stockBatchId: '__demo__batch-2', drugId: '__demo__drug-2', hostId: null, therapyId: null, tipoMovimento: 'SCARICO', quantita: 21, unitaMisura: 'cpr', causale: 'Consumo generale', dataMovimento: '2026-04-01T08:00:00.000Z', settimanaRiferimento: '2026-W14', operatore: 'Admin MediTrace', source: 'manual', updatedAt: '2026-04-01T08:00:00.000Z', deletedAt: null, syncStatus: 'synced', _seeded: true },
    { id: '__demo__mov-8', stockBatchId: '__demo__batch-5', drugId: '__demo__drug-5', hostId: '__demo__host-3', therapyId: '__demo__therapy-5', tipoMovimento: 'SCARICO', quantita: 7, unitaMisura: 'cpr', causale: 'Somministrazione settimanale', dataMovimento: '2026-04-01T08:00:00.000Z', settimanaRiferimento: '2026-W14', operatore: 'Anna Maria Cigliano', source: 'therapy', updatedAt: '2026-04-01T08:00:00.000Z', deletedAt: null, syncStatus: 'synced', _seeded: true },
    { id: '__demo__mov-9', stockBatchId: '__demo__batch-7', drugId: '__demo__drug-6', hostId: '__demo__host-5', therapyId: '__demo__therapy-7', tipoMovimento: 'SCARICO', quantita: 7, unitaMisura: 'cpr', causale: 'Somministrazione settimanale', dataMovimento: '2026-04-01T08:00:00.000Z', settimanaRiferimento: '2026-W14', operatore: 'Admin MediTrace', source: 'therapy', updatedAt: '2026-04-01T08:00:00.000Z', deletedAt: null, syncStatus: 'synced', _seeded: true },
    { id: '__demo__mov-10', stockBatchId: '__demo__batch-8', drugId: '__demo__drug-7', hostId: '__demo__host-5', therapyId: '__demo__therapy-8', tipoMovimento: 'SCARICO', quantita: 7, unitaMisura: 'cpr', causale: 'Somministrazione settimanale', dataMovimento: '2026-04-02T08:00:00.000Z', settimanaRiferimento: '2026-W14', operatore: 'Valerio Graziani', source: 'therapy', updatedAt: '2026-04-02T08:00:00.000Z', deletedAt: null, syncStatus: 'synced', _seeded: true },
    { id: '__demo__mov-11', stockBatchId: '__demo__batch-9', drugId: '__demo__drug-8', hostId: '__demo__host-6', therapyId: '__demo__therapy-9', tipoMovimento: 'SCARICO', quantita: 7, unitaMisura: 'cps', causale: 'Somministrazione settimanale', dataMovimento: '2026-04-02T08:00:00.000Z', settimanaRiferimento: '2026-W14', operatore: 'Admin MediTrace', source: 'therapy', updatedAt: '2026-04-02T08:00:00.000Z', deletedAt: null, syncStatus: 'synced', _seeded: true },
    { id: '__demo__mov-12', stockBatchId: '__demo__batch-4', drugId: '__demo__drug-4', hostId: '__demo__host-7', therapyId: '__demo__therapy-10', tipoMovimento: 'SCARICO', quantita: 14, unitaMisura: 'cpr', causale: 'Somministrazione settimanale', dataMovimento: '2026-04-03T08:00:00.000Z', settimanaRiferimento: '2026-W14', operatore: 'Anna Maria Cigliano', source: 'therapy', updatedAt: '2026-04-03T08:00:00.000Z', deletedAt: null, syncStatus: 'synced', _seeded: true },
    { id: '__demo__mov-13', stockBatchId: '__demo__batch-10', drugId: '__demo__drug-9', hostId: '__demo__host-7', therapyId: '__demo__therapy-11', tipoMovimento: 'SCARICO', quantita: 7, unitaMisura: 'cpr', causale: 'Somministrazione settimanale', dataMovimento: '2026-04-03T08:00:00.000Z', settimanaRiferimento: '2026-W14', operatore: 'Valerio Graziani', source: 'therapy', updatedAt: '2026-04-03T08:00:00.000Z', deletedAt: null, syncStatus: 'synced', _seeded: true },
    { id: '__demo__mov-14', stockBatchId: '__demo__batch-11', drugId: '__demo__drug-10', hostId: '__demo__host-8', therapyId: '__demo__therapy-12', tipoMovimento: 'SCARICO', quantita: 7, unitaMisura: 'cpr', causale: 'Somministrazione settimanale', dataMovimento: '2026-04-03T08:00:00.000Z', settimanaRiferimento: '2026-W14', operatore: 'Admin MediTrace', source: 'therapy', updatedAt: '2026-04-03T08:00:00.000Z', deletedAt: null, syncStatus: 'synced', _seeded: true },
    { id: '__demo__mov-15', stockBatchId: '__demo__batch-3', drugId: '__demo__drug-3', hostId: '__demo__host-8', therapyId: '__demo__therapy-13', tipoMovimento: 'SCARICO', quantita: 7, unitaMisura: 'cpr', causale: 'Somministrazione settimanale', dataMovimento: '2026-04-04T08:00:00.000Z', settimanaRiferimento: '2026-W14', operatore: 'Anna Maria Cigliano', source: 'therapy', updatedAt: '2026-04-04T08:00:00.000Z', deletedAt: null, syncStatus: 'synced', _seeded: true },
]

const DEMO_REMINDERS = [
    { id: '__demo__rem-1', hostId: '__demo__host-1', therapyId: '__demo__therapy-1', drugId: '__demo__drug-1', scheduledAt: buildDateStr(-1, 8, 0), stato: 'ESEGUITO', eseguitoAt: buildDateStr(-1, 8, 12), operatore: 'Admin MediTrace', note: '', updatedAt: buildDateStr(-1, 8, 12), deletedAt: null, syncStatus: 'synced', _seeded: true },
    { id: '__demo__rem-2', hostId: '__demo__host-1', therapyId: '__demo__therapy-1', drugId: '__demo__drug-1', scheduledAt: buildDateStr(-1, 20, 0), stato: 'SALTATO', eseguitoAt: buildDateStr(-1, 20, 5), operatore: 'Admin MediTrace', note: 'Paziente dormiva', updatedAt: buildDateStr(-1, 20, 5), deletedAt: null, syncStatus: 'synced', _seeded: true },
    { id: '__demo__rem-3', hostId: '__demo__host-2', therapyId: '__demo__therapy-3', drugId: '__demo__drug-2', scheduledAt: buildDateStr(-1, 7, 0), stato: 'ESEGUITO', eseguitoAt: buildDateStr(-1, 7, 8), operatore: 'Valerio Graziani', note: '', updatedAt: buildDateStr(-1, 7, 8), deletedAt: null, syncStatus: 'synced', _seeded: true },
    { id: '__demo__rem-4', hostId: '__demo__host-3', therapyId: '__demo__therapy-5', drugId: '__demo__drug-5', scheduledAt: buildDateStr(-1, 21, 0), stato: 'POSTICIPATO', eseguitoAt: null, operatore: 'Anna Maria Cigliano', note: 'Rimandato a domani', updatedAt: buildDateStr(-1, 21, 5), deletedAt: null, syncStatus: 'synced', _seeded: true },
    // Oggi — mattina già eseguiti, pomeriggio/sera da eseguire
    { id: '__demo__rem-5', hostId: '__demo__host-1', therapyId: '__demo__therapy-2', drugId: '__demo__drug-3', scheduledAt: buildDateStr(0, 7, 30), stato: 'ESEGUITO', eseguitoAt: buildDateStr(0, 7, 35), operatore: 'Admin MediTrace', note: '', updatedAt: buildDateStr(0, 7, 35), deletedAt: null, syncStatus: 'synced', _seeded: true },
    { id: '__demo__rem-6', hostId: '__demo__host-5', therapyId: '__demo__therapy-7', drugId: '__demo__drug-6', scheduledAt: buildDateStr(0, 9, 0), stato: 'ESEGUITO', eseguitoAt: buildDateStr(0, 9, 5), operatore: 'Valerio Graziani', note: '', updatedAt: buildDateStr(0, 9, 5), deletedAt: null, syncStatus: 'synced', _seeded: true },
    { id: '__demo__rem-7', hostId: '__demo__host-6', therapyId: '__demo__therapy-9', drugId: '__demo__drug-8', scheduledAt: buildDateStr(0, 8, 0), stato: 'ESEGUITO', eseguitoAt: buildDateStr(0, 8, 10), operatore: 'Admin MediTrace', note: '', updatedAt: buildDateStr(0, 8, 10), deletedAt: null, syncStatus: 'synced', _seeded: true },
    { id: '__demo__rem-8', hostId: '__demo__host-5', therapyId: '__demo__therapy-8', drugId: '__demo__drug-7', scheduledAt: buildDateStr(0, 14, 0), stato: 'DA_ESEGUIRE', eseguitoAt: null, operatore: null, note: '', updatedAt: NOW, deletedAt: null, syncStatus: 'synced', _seeded: true },
    { id: '__demo__rem-9', hostId: '__demo__host-7', therapyId: '__demo__therapy-10', drugId: '__demo__drug-4', scheduledAt: buildDateStr(0, 18, 0), stato: 'DA_ESEGUIRE', eseguitoAt: null, operatore: null, note: '', updatedAt: NOW, deletedAt: null, syncStatus: 'synced', _seeded: true },
    { id: '__demo__rem-10', hostId: '__demo__host-9', therapyId: '__demo__therapy-14', drugId: '__demo__drug-1', scheduledAt: buildDateStr(0, 20, 0), stato: 'DA_ESEGUIRE', eseguitoAt: null, operatore: null, note: '', updatedAt: NOW, deletedAt: null, syncStatus: 'synced', _seeded: true },
    // Domani — tutti da eseguire
    { id: '__demo__rem-11', hostId: '__demo__host-2', therapyId: '__demo__therapy-3', drugId: '__demo__drug-2', scheduledAt: buildDateStr(1, 7, 0), stato: 'DA_ESEGUIRE', eseguitoAt: null, operatore: null, note: '', updatedAt: NOW, deletedAt: null, syncStatus: 'synced', _seeded: true },
    { id: '__demo__rem-12', hostId: '__demo__host-3', therapyId: '__demo__therapy-4', drugId: '__demo__drug-4', scheduledAt: buildDateStr(1, 8, 0), stato: 'DA_ESEGUIRE', eseguitoAt: null, operatore: null, note: '', updatedAt: NOW, deletedAt: null, syncStatus: 'synced', _seeded: true },
    { id: '__demo__rem-13', hostId: '__demo__host-8', therapyId: '__demo__therapy-12', drugId: '__demo__drug-10', scheduledAt: buildDateStr(1, 7, 0), stato: 'DA_ESEGUIRE', eseguitoAt: null, operatore: null, note: '', updatedAt: NOW, deletedAt: null, syncStatus: 'synced', _seeded: true },
    { id: '__demo__rem-14', hostId: '__demo__host-9', therapyId: '__demo__therapy-14', drugId: '__demo__drug-1', scheduledAt: buildDateStr(1, 8, 0), stato: 'DA_ESEGUIRE', eseguitoAt: null, operatore: null, note: '', updatedAt: NOW, deletedAt: null, syncStatus: 'synced', _seeded: true },
    { id: '__demo__rem-15', hostId: '__demo__host-9', therapyId: '__demo__therapy-15', drugId: '__demo__drug-2', scheduledAt: buildDateStr(1, 12, 0), stato: 'DA_ESEGUIRE', eseguitoAt: null, operatore: null, note: '', updatedAt: NOW, deletedAt: null, syncStatus: 'synced', _seeded: true },
]

// ── Manifest ──────────────────────────────────────────────────────────────────

const DEMO_MANIFEST = {
    rooms: [],
    hosts: DEMO_HOSTS.map(r => r.id),
    drugs: DEMO_DRUGS.map(r => r.id),
    stockBatches: DEMO_STOCK_BATCHES.map(r => r.id),
    therapies: DEMO_THERAPIES.map(r => r.id),
    movements: DEMO_MOVEMENTS.map(r => r.id),
    reminders: DEMO_REMINDERS.map(r => r.id),
}

// ── API pubblica ──────────────────────────────────────────────────────────────

/** Chiave per tracciare se il repair retroattivo è già stato eseguito */
const SEED_SYNC_REPAIR_KEY = '_seedSyncRepairCount'

/**
 * Ripara dati seed esistenti che sono stati caricati prima della fix di sync
 * (versione senza enqueue). Cerca tutti i record con _seeded:true e li
 * enqueua in syncQueue se non già presenti.
 *
 * Strategia a due livelli:
 *  1. Se esiste _demoDataManifest, usa gli ID del manifest
 *  2. Altrimenti, scansiona TUTTE le tabelle dati cercando _seeded:true
 *
 * Riprova fino a 5 volte (una per ogni avvio dell'app) finché tutti i record
 * _seeded sono in syncQueue. Dopo 5 tentativi si ferma.
 *
 * Chiamare da App.vue dopo initAuth().
 */
export async function repairUnsyncedSeedData() {
    try {
        const repairCount = Number(await getSetting(SEED_SYNC_REPAIR_KEY, 0)) || 0
        if (repairCount >= 5) return { repaired: false, reason: 'max-attempts' }

        // Raccogli tutti gli ID già presenti in syncQueue
        const allQueueEntries = await db.syncQueue.toArray()
        const queuedIds = new Set(allQueueEntries.map(e => e.entityId))

        // Strategia 1: usa il manifest se esiste
        const manifest = await getDemoManifest()
        let tableMap = null

        if (manifest) {
            tableMap = {
                hosts: manifest.hosts || [],
                drugs: manifest.drugs || [],
                stockBatches: manifest.stockBatches || [],
                therapies: manifest.therapies || [],
                movements: manifest.movements || [],
                reminders: manifest.reminders || [],
            }
        }

        // Strategia 2: se non c'è manifest, scansiona le tabelle per _seeded:true
        if (!tableMap) {
            const seededTables = {}
            const tableNames = ['hosts', 'drugs', 'stockBatches', 'therapies', 'movements', 'reminders']
            for (const name of tableNames) {
                const table = db[name]
                if (!table || typeof table.toArray !== 'function') continue
                const rows = await table.toArray()
                const seededIds = rows
                    .filter(r => r && !r.deletedAt && r._seeded === true)
                    .map(r => r.id)
                if (seededIds.length > 0) {
                    seededTables[name] = seededIds
                }
            }

            const hasSeeded = Object.values(seededTables).some(ids => ids.length > 0)
            if (!hasSeeded) {
                await setSetting(SEED_SYNC_REPAIR_KEY, 5) // stop
                return { repaired: false, reason: 'no-seed-data' }
            }

            tableMap = seededTables
        }

        // Enqueue i record mancanti
        let repaired = 0
        const enqueueAll = []
        for (const [entityType, ids] of Object.entries(tableMap)) {
            for (const id of ids) {
                if (!queuedIds.has(id)) {
                    enqueueAll.push(enqueue(entityType, id, 'upsert'))
                    repaired++
                }
            }
        }
        await Promise.all(enqueueAll)

        const nextCount = repaired > 0 ? repairCount + 1 : 5 // stop if nothing to repair
        await setSetting(SEED_SYNC_REPAIR_KEY, nextCount)
        return { repaired: repaired > 0, count: repaired, attempt: nextCount }
    } catch (err) {
        console.warn('[seedData] repairUnsyncedSeedData fallita:', err.message)
        return { repaired: false, reason: 'error', error: err.message }
    }
}

/**
 * Carica tutti i record demo nel database locale (idempotente: usa put()).
 * Tutti i dati vengono creati nella residenza "Residenza Demo".
 */
export async function loadDemoData(options = {}) {
    assertSeedEnabled(options)

    if (!SEED_ENABLED && !options.allowInProduction) {
        dataReadyResolve()
        return { skipped: true, reason: 'seed-disabled' }
    }

    // Ensure default residences exist (now includes "Residenza Demo")
    await ensureDefaultResidenze()

    // Find the "Residenza Demo" room (created by ensureDefaultResidenze or pre-existing)
    const allRooms = await db.rooms.toArray()
    const demoRoom = allRooms.find(
        r => !r.deletedAt && (String(r.codice || '').trim().toLowerCase() === 'demo' || String(r.codice || '').trim().toLowerCase() === 'residenza demo')
    )
    const demoRoomId = demoRoom?.id || '__demo__residenza-demo'

    // Patch demo data to use the real residence ID instead of hardcoded one
    const patchRoomId = (record) => {
        if (!record) return record
        const patched = { ...record }
        if (patched.roomId === '__demo__residenza-demo') patched.roomId = demoRoomId
        // Don't overwrite the existing room — skip demo room creation
        return patched
    }

    const patchedHosts = DEMO_HOSTS.map(patchRoomId)

    const availableStores = await getAvailableStoreNames(DEMO_STORE_NAMES)
    const transactionTables = [
        availableStores.has('rooms') ? db.rooms : null,
        availableStores.has('hosts') ? db.hosts : null,
        availableStores.has('drugs') ? db.drugs : null,
        availableStores.has('stockBatches') ? db.stockBatches : null,
        availableStores.has('therapies') ? db.therapies : null,
        availableStores.has('movements') ? db.movements : null,
        availableStores.has('reminders') ? db.reminders : null,
    ].filter(Boolean)

    if (transactionTables.length > 0) {
        await db.transaction('rw', transactionTables, async () => {
            // Skip DEMO_ROOMS — "Residenza Demo" is now a permanent default residence
            if (availableStores.has('hosts')) for (const record of patchedHosts) await db.hosts.put(record)
            if (availableStores.has('drugs')) for (const record of DEMO_DRUGS) await db.drugs.put(record)
            if (availableStores.has('stockBatches')) for (const record of DEMO_STOCK_BATCHES) await db.stockBatches.put(record)
            if (availableStores.has('therapies')) for (const record of DEMO_THERAPIES) await db.therapies.put(record)
            if (availableStores.has('movements')) for (const record of DEMO_MOVEMENTS) await db.movements.put(record)
            if (availableStores.has('reminders')) for (const record of DEMO_REMINDERS) await db.reminders.put(record)
        })

        // Notify UI that data has changed — all views should reload
        window.dispatchEvent(new CustomEvent('medi-trace:data-changed'))
    }

    dataReadyResolve()

    await setSetting(DEMO_MANIFEST_KEY, {
        rooms: [], // Residenza Demo is now a permanent default — never cleared
        hosts: availableStores.has('hosts') ? DEMO_MANIFEST.hosts : [],
        drugs: availableStores.has('drugs') ? DEMO_MANIFEST.drugs : [],
        stockBatches: availableStores.has('stockBatches') ? DEMO_MANIFEST.stockBatches : [],
        therapies: availableStores.has('therapies') ? DEMO_MANIFEST.therapies : [],
        movements: availableStores.has('movements') ? DEMO_MANIFEST.movements : [],
        reminders: availableStores.has('reminders') ? DEMO_MANIFEST.reminders : [],
    })

    await upsertDemoAuthUsers()

    // Pre-configure fasce orarie with production defaults
    await setSetting('fasceOrarieConfig', [
        { nome: 'Mattina', inizio: '06:00', fine: '11:59' },
        { nome: 'Pomeriggio', inizio: '12:00', fine: '17:59' },
        { nome: 'Sera', inizio: '18:00', fine: '23:59' },
        { nome: 'Notte', inizio: '00:00', fine: '05:59' },
    ])

    return getDemoStats()
}

/**
 * Rimuove tutti i record demo dal database locale.
 * Le residenze reali ("Il Rifugio", "Via Bellani") non vengono toccate.
 */
export async function clearDemoData(options = {}) {
    assertSeedEnabled(options)

    const manifest = await getDemoManifest()
    if (!manifest) {
        const authResult = await clearDemoAuthUsers({ preserveAdminUsername: 'admin' })
        return {
            cleared: false,
            reason: 'nessun dato demo trovato',
            removedOperators: authResult.removed,
        }
    }

    const availableStores = await getAvailableStoreNames(DEMO_STORE_NAMES)

    const linkedIds = {
        rooms: availableStores.has('rooms') ? await findDemoLinkedIds(db.rooms) : [],
        hosts: availableStores.has('hosts') ? await findDemoLinkedIds(db.hosts, ['roomId']) : [],
        drugs: availableStores.has('drugs') ? await findDemoLinkedIds(db.drugs) : [],
        stockBatches: availableStores.has('stockBatches') ? await findDemoLinkedIds(db.stockBatches, ['drugId']) : [],
        therapies: availableStores.has('therapies') ? await findDemoLinkedIds(db.therapies, ['hostId', 'drugId', 'stockBatchId', 'stockBatchIdPreferito']) : [],
        movements: availableStores.has('movements') ? await findDemoLinkedIds(db.movements, ['hostId', 'drugId', 'batchId', 'stockBatchId', 'therapyId', 'reminderId']) : [],
        reminders: availableStores.has('reminders') ? await findDemoLinkedIds(db.reminders, ['hostId', 'therapyId', 'drugId']) : [],
    }

    if (availableStores.size > 0) {
        const now = new Date().toISOString()
        const storeOps = [
            ['rooms', manifest.rooms, linkedIds.rooms],
            ['hosts', manifest.hosts, linkedIds.hosts],
            ['drugs', manifest.drugs, linkedIds.drugs],
            ['stockBatches', manifest.stockBatches, linkedIds.stockBatches],
            ['therapies', manifest.therapies, linkedIds.therapies],
            ['movements', manifest.movements, linkedIds.movements],
            ['reminders', manifest.reminders, linkedIds.reminders],
        ]
        for (const [storeName, manifestIds, extraIds] of storeOps) {
            if (!availableStores.has(storeName)) continue
            try {
                await softDeleteDemoRecords(storeName, [...(manifestIds ?? []), ...extraIds], now)
            } catch (_) { /* skip individual store errors */ }
        }
    }

    await setSetting(DEMO_MANIFEST_KEY, null)
    const authResult = await clearDemoAuthUsers({ preserveAdminUsername: 'admin' })

    // Notify UI that data has changed
    window.dispatchEvent(new CustomEvent('medi-trace:data-changed'))

    // Re-resolve dataReady so any late-mounted views can also proceed immediately
    dataReadyResolve()

    return { cleared: true, tables: Object.keys(manifest), removedOperators: authResult.removed }
}

/**
 * Restituisce true se il manifest demo è presente.
 */
export async function isDemoDataLoaded() {
    const manifest = await getDemoManifest()
    return Boolean(manifest)
}

/**
 * Conteggio record per tabella (statico, non accede al db).
 */
export function getDemoStats() {
    return {
        rooms: DEMO_ROOMS.length,
        hosts: DEMO_HOSTS.length,
        drugs: DEMO_DRUGS.length,
        stockBatches: DEMO_STOCK_BATCHES.length,
        therapies: DEMO_THERAPIES.length,
        movements: DEMO_MOVEMENTS.length,
        reminders: DEMO_REMINDERS.length,
    }
}

/** Esposto solo per i test unitari */
export const seedDataTestUtils = {
    SEED_ENABLED,
    DEMO_MANIFEST_KEY,
    DEMO_PREFIX,
    DEMO_MANIFEST,
    DEMO_ROOMS,
    DEMO_HOSTS,
    DEMO_DRUGS,
    DEMO_STOCK_BATCHES,
    DEMO_THERAPIES,
    DEMO_MOVEMENTS,
    DEMO_REMINDERS,
}

// ── Backward-compatible aliases (keep old imports working) ────────────────────

/** @deprecated Usare loadDemoData() */
export const loadSeedData = loadDemoData
/** @deprecated Usare clearDemoData() */
export const clearSeedData = clearDemoData
/** @deprecated Usare isDemoDataLoaded() */
export const isSeedDataLoaded = isDemoDataLoaded
/** @deprecated Usare getDemoStats() */
export const getSeedStats = getDemoStats

// Legacy realistic seed stubs (no-op, kept for backward compat)
/** @deprecated Il seed "realistico" è stato rimosso. Usare loadDemoData(). */
export async function loadRealisticSeedData(_options) {
    return getDemoStats()
}
/** @deprecated Il seed "realistico" è stato rimosso. Usare clearDemoData(). */
export async function clearRealisticSeedData(_options) {
    return { cleared: false, reason: 'seed realistico rimosso, usare clearDemoData()' }
}
/** @deprecated Il seed "realistico" è stato rimosso. */
export async function isRealisticSeedDataLoaded() {
    return false
}

