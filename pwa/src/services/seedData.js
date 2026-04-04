/**
 * seedData.js — Dati demo per sviluppo e test manuali
 *
 * Disponibile solo in modalità DEV (import.meta.env.DEV = true) oppure se
 * la variabile d'ambiente VITE_SEED_DATA=1 è esplicitamente impostata.
 *
 * Tutti i record portano il flag _seeded: true e ID con prefisso __seed__
 * per identificazione e rimozione univoca.
 *
 * API:
 *   loadSeedData(options?)     — carica tutti i record demo (idempotente)
 *   clearSeedData(options?)    — rimuove tutti i record demo
 *   isSeedDataLoaded() — true se il manifest è presente in settings
 *   getSeedStats()     — conteggio record per tabella (senza accesso al db)
 */
import { db, getSetting, setSetting } from '../db'

// ── Guard ─────────────────────────────────────────────────────────────────────

const SEED_ENABLED = import.meta.env.DEV || import.meta.env.VITE_SEED_DATA === '1'
const SEED_MANIFEST_KEY = '_seedDataManifest'

function assertSeedEnabled(options = {}) {
    if (SEED_ENABLED || options.allowInProduction === true) return
    throw new Error('Dati demo non disponibili in produzione. Usa il pannello admin per abilitarli esplicitamente quando necessario.')
}

// ── Dati demo ─────────────────────────────────────────────────────────────────

const NOW = '2026-04-04T08:00:00.000Z'

const SEED_DRUGS = [
    {
        id: '__seed__drug-1',
        principioAttivo: 'Paracetamolo',
        classeTerapeutica: 'Analgesici / Antipiretici',
        scortaMinima: 10,
        fornitore: 'Farmacia Centrale',
        note: '[DEMO]',
        updatedAt: NOW,
        deletedAt: null,
        syncStatus: 'pending',
        _seeded: true,
    },
    {
        id: '__seed__drug-2',
        principioAttivo: 'Ibuprofene',
        classeTerapeutica: 'FANS',
        scortaMinima: 8,
        fornitore: 'Farmacia Centrale',
        note: '[DEMO]',
        updatedAt: NOW,
        deletedAt: null,
        syncStatus: 'pending',
        _seeded: true,
    },
    {
        id: '__seed__drug-3',
        principioAttivo: 'Ramipril',
        classeTerapeutica: 'ACE inibitori / Antipertensivi',
        scortaMinima: 6,
        fornitore: 'Fornitore Salute SpA',
        note: '[DEMO]',
        updatedAt: NOW,
        deletedAt: null,
        syncStatus: 'pending',
        _seeded: true,
    },
    {
        id: '__seed__drug-4',
        principioAttivo: 'Metformina',
        classeTerapeutica: 'Antidiabetici orali',
        scortaMinima: 12,
        fornitore: 'Fornitore Salute SpA',
        note: '[DEMO]',
        updatedAt: NOW,
        deletedAt: null,
        syncStatus: 'pending',
        _seeded: true,
    },
    {
        id: '__seed__drug-5',
        principioAttivo: 'Lorazepam',
        classeTerapeutica: 'Ansiolitici / Benzodiazepine',
        scortaMinima: 4,
        fornitore: 'Farmacia Ospedaliera',
        note: '[DEMO]',
        updatedAt: NOW,
        deletedAt: null,
        syncStatus: 'pending',
        _seeded: true,
    },
]

const SEED_HOSTS = [
    {
        id: '__seed__host-1',
        codiceInterno: 'DEMO-N01',
        iniziali: 'M.R.',
        casaAlloggio: 'Casa Nord',
        attivo: true,
        noteEssenziali: '[DEMO] Ospite dimostrativo — non soggetto reale.',
        updatedAt: NOW,
        deletedAt: null,
        syncStatus: 'pending',
        _seeded: true,
    },
    {
        id: '__seed__host-2',
        codiceInterno: 'DEMO-N02',
        iniziali: 'A.B.',
        casaAlloggio: 'Casa Nord',
        attivo: true,
        noteEssenziali: '[DEMO] Ospite dimostrativo — non soggetto reale.',
        updatedAt: NOW,
        deletedAt: null,
        syncStatus: 'pending',
        _seeded: true,
    },
    {
        id: '__seed__host-3',
        codiceInterno: 'DEMO-S01',
        iniziali: 'G.P.',
        casaAlloggio: 'Casa Sud',
        attivo: true,
        noteEssenziali: '[DEMO] Ospite dimostrativo — non soggetto reale.',
        updatedAt: NOW,
        deletedAt: null,
        syncStatus: 'pending',
        _seeded: true,
    },
    {
        id: '__seed__host-4',
        codiceInterno: 'DEMO-S02',
        iniziali: 'L.T.',
        casaAlloggio: 'Casa Sud',
        attivo: false,
        noteEssenziali: '[DEMO] Ospite inattivo (dimesso) — non soggetto reale.',
        updatedAt: NOW,
        deletedAt: null,
        syncStatus: 'pending',
        _seeded: true,
    },
]

const SEED_STOCK_BATCHES = [
    {
        id: '__seed__batch-1',
        drugId: '__seed__drug-1',
        nomeCommerciale: 'Tachipirina 500 mg',
        dosaggio: '500 mg',
        forma: 'Compresse',
        unitaMisura: 'cpr',
        lotto: 'DEMO-L1001',
        scadenza: '2027-06-30',
        quantitaIniziale: 100,
        quantitaAttuale: 52,
        sogliaRiordino: 20,
        updatedAt: NOW,
        deletedAt: null,
        syncStatus: 'pending',
        _seeded: true,
    },
    {
        id: '__seed__batch-2',
        drugId: '__seed__drug-2',
        nomeCommerciale: 'Moment 200 mg',
        dosaggio: '200 mg',
        forma: 'Compresse rivestite',
        unitaMisura: 'cpr',
        lotto: 'DEMO-L2001',
        scadenza: '2026-12-31',
        quantitaIniziale: 60,
        quantitaAttuale: 5,
        sogliaRiordino: 15,
        updatedAt: NOW,
        deletedAt: null,
        syncStatus: 'pending',
        _seeded: true,
    },
    {
        id: '__seed__batch-3',
        drugId: '__seed__drug-3',
        nomeCommerciale: 'Triatec 5 mg',
        dosaggio: '5 mg',
        forma: 'Compresse',
        unitaMisura: 'cpr',
        lotto: 'DEMO-L3001',
        scadenza: '2027-03-31',
        quantitaIniziale: 90,
        quantitaAttuale: 72,
        sogliaRiordino: 10,
        updatedAt: NOW,
        deletedAt: null,
        syncStatus: 'pending',
        _seeded: true,
    },
    {
        id: '__seed__batch-4',
        drugId: '__seed__drug-4',
        nomeCommerciale: 'Glucophage 500 mg',
        dosaggio: '500 mg',
        forma: 'Compresse',
        unitaMisura: 'cpr',
        lotto: 'DEMO-L4001',
        scadenza: '2027-09-30',
        quantitaIniziale: 120,
        quantitaAttuale: 80,
        sogliaRiordino: 20,
        updatedAt: NOW,
        deletedAt: null,
        syncStatus: 'pending',
        _seeded: true,
    },
    {
        id: '__seed__batch-5',
        drugId: '__seed__drug-5',
        nomeCommerciale: 'Tavor 1 mg',
        dosaggio: '1 mg',
        forma: 'Compresse sublinguali',
        unitaMisura: 'cpr',
        lotto: 'DEMO-L5001',
        scadenza: '2026-08-31',
        quantitaIniziale: 30,
        quantitaAttuale: 3,
        sogliaRiordino: 8,
        updatedAt: NOW,
        deletedAt: null,
        syncStatus: 'pending',
        _seeded: true,
    },
    {
        id: '__seed__batch-6',
        drugId: '__seed__drug-1',
        nomeCommerciale: 'Paracetamolo TEVA 1000 mg',
        dosaggio: '1000 mg',
        forma: 'Compresse effervescenti',
        unitaMisura: 'cpr',
        lotto: 'DEMO-L1002',
        scadenza: '2027-01-31',
        quantitaIniziale: 50,
        quantitaAttuale: 0,
        sogliaRiordino: 10,
        updatedAt: NOW,
        deletedAt: null,
        syncStatus: 'pending',
        _seeded: true,
    },
]

const SEED_THERAPIES = [
    {
        id: '__seed__therapy-1',
        hostId: '__seed__host-1',
        drugId: '__seed__drug-1',
        stockBatchIdPreferito: '__seed__batch-1',
        dosePerSomministrazione: 1,
        unitaDose: 'cpr',
        somministrazioniGiornaliere: 2,
        consumoMedioSettimanale: 14,
        dataInizio: '2026-01-10T00:00:00.000Z',
        dataFine: null,
        attiva: true,
        note: '[DEMO] Terapia dimostrativa',
        updatedAt: NOW,
        deletedAt: null,
        syncStatus: 'pending',
        _seeded: true,
    },
    {
        id: '__seed__therapy-2',
        hostId: '__seed__host-1',
        drugId: '__seed__drug-3',
        stockBatchIdPreferito: '__seed__batch-3',
        dosePerSomministrazione: 1,
        unitaDose: 'cpr',
        somministrazioniGiornaliere: 1,
        consumoMedioSettimanale: 7,
        dataInizio: '2025-11-15T00:00:00.000Z',
        dataFine: null,
        attiva: true,
        note: '[DEMO] Terapia dimostrativa',
        updatedAt: NOW,
        deletedAt: null,
        syncStatus: 'pending',
        _seeded: true,
    },
    {
        id: '__seed__therapy-3',
        hostId: '__seed__host-2',
        drugId: '__seed__drug-2',
        stockBatchIdPreferito: '__seed__batch-2',
        dosePerSomministrazione: 1,
        unitaDose: 'cpr',
        somministrazioniGiornaliere: 3,
        consumoMedioSettimanale: 21,
        dataInizio: '2026-02-01T00:00:00.000Z',
        dataFine: null,
        attiva: true,
        note: '[DEMO] Terapia dimostrativa',
        updatedAt: NOW,
        deletedAt: null,
        syncStatus: 'pending',
        _seeded: true,
    },
    {
        id: '__seed__therapy-4',
        hostId: '__seed__host-3',
        drugId: '__seed__drug-4',
        stockBatchIdPreferito: '__seed__batch-4',
        dosePerSomministrazione: 2,
        unitaDose: 'cpr',
        somministrazioniGiornaliere: 2,
        consumoMedioSettimanale: 28,
        dataInizio: '2025-09-01T00:00:00.000Z',
        dataFine: null,
        attiva: true,
        note: '[DEMO] Terapia dimostrativa',
        updatedAt: NOW,
        deletedAt: null,
        syncStatus: 'pending',
        _seeded: true,
    },
    {
        id: '__seed__therapy-5',
        hostId: '__seed__host-3',
        drugId: '__seed__drug-5',
        stockBatchIdPreferito: '__seed__batch-5',
        dosePerSomministrazione: 1,
        unitaDose: 'cpr',
        somministrazioniGiornaliere: 1,
        consumoMedioSettimanale: 7,
        dataInizio: '2026-03-01T00:00:00.000Z',
        dataFine: null,
        attiva: true,
        note: '[DEMO] Terapia dimostrativa',
        updatedAt: NOW,
        deletedAt: null,
        syncStatus: 'pending',
        _seeded: true,
    },
    {
        id: '__seed__therapy-6',
        hostId: '__seed__host-4',
        drugId: '__seed__drug-1',
        stockBatchIdPreferito: '__seed__batch-1',
        dosePerSomministrazione: 1,
        unitaDose: 'cpr',
        somministrazioniGiornaliere: 1,
        consumoMedioSettimanale: 7,
        dataInizio: '2025-06-01T00:00:00.000Z',
        dataFine: '2026-02-28T23:59:59.000Z',
        attiva: false,
        note: '[DEMO] Terapia conclusa (ospite inattivo)',
        updatedAt: NOW,
        deletedAt: null,
        syncStatus: 'pending',
        _seeded: true,
    },
]

const SEED_MOVEMENTS = [
    {
        id: '__seed__mov-1',
        stockBatchId: '__seed__batch-1',
        drugId: '__seed__drug-1',
        hostId: '__seed__host-1',
        therapyId: '__seed__therapy-1',
        tipoMovimento: 'CARICO',
        quantita: 60,
        unitaMisura: 'cpr',
        causale: 'Acquisto mensile',
        dataMovimento: '2026-03-01T09:00:00.000Z',
        settimanaRiferimento: '2026-W09',
        operatore: 'DEMO',
        source: 'manual',
        updatedAt: '2026-03-01T09:00:00.000Z',
        deletedAt: null,
        syncStatus: 'pending',
        _seeded: true,
    },
    {
        id: '__seed__mov-2',
        stockBatchId: '__seed__batch-1',
        drugId: '__seed__drug-1',
        hostId: '__seed__host-1',
        therapyId: '__seed__therapy-1',
        tipoMovimento: 'SCARICO',
        quantita: 8,
        unitaMisura: 'cpr',
        causale: 'Somministrazione settimanale',
        dataMovimento: '2026-03-08T08:00:00.000Z',
        settimanaRiferimento: '2026-W10',
        operatore: 'DEMO',
        source: 'therapy',
        updatedAt: '2026-03-08T08:00:00.000Z',
        deletedAt: null,
        syncStatus: 'pending',
        _seeded: true,
    },
    {
        id: '__seed__mov-3',
        stockBatchId: '__seed__batch-2',
        drugId: '__seed__drug-2',
        hostId: '__seed__host-2',
        therapyId: '__seed__therapy-3',
        tipoMovimento: 'SCARICO',
        quantita: 21,
        unitaMisura: 'cpr',
        causale: 'Somministrazione settimanale',
        dataMovimento: '2026-03-08T08:00:00.000Z',
        settimanaRiferimento: '2026-W10',
        operatore: 'DEMO',
        source: 'therapy',
        updatedAt: '2026-03-08T08:00:00.000Z',
        deletedAt: null,
        syncStatus: 'pending',
        _seeded: true,
    },
    {
        id: '__seed__mov-4',
        stockBatchId: '__seed__batch-3',
        drugId: '__seed__drug-3',
        hostId: '__seed__host-1',
        therapyId: '__seed__therapy-2',
        tipoMovimento: 'SCARICO',
        quantita: 7,
        unitaMisura: 'cpr',
        causale: 'Somministrazione settimanale',
        dataMovimento: '2026-03-15T08:00:00.000Z',
        settimanaRiferimento: '2026-W11',
        operatore: 'DEMO',
        source: 'therapy',
        updatedAt: '2026-03-15T08:00:00.000Z',
        deletedAt: null,
        syncStatus: 'pending',
        _seeded: true,
    },
    {
        id: '__seed__mov-5',
        stockBatchId: '__seed__batch-4',
        drugId: '__seed__drug-4',
        hostId: '__seed__host-3',
        therapyId: '__seed__therapy-4',
        tipoMovimento: 'SCARICO',
        quantita: 28,
        unitaMisura: 'cpr',
        causale: 'Somministrazione settimanale',
        dataMovimento: '2026-03-22T08:00:00.000Z',
        settimanaRiferimento: '2026-W12',
        operatore: 'DEMO',
        source: 'therapy',
        updatedAt: '2026-03-22T08:00:00.000Z',
        deletedAt: null,
        syncStatus: 'pending',
        _seeded: true,
    },
    {
        id: '__seed__mov-6',
        stockBatchId: '__seed__batch-5',
        drugId: '__seed__drug-5',
        hostId: '__seed__host-3',
        therapyId: '__seed__therapy-5',
        tipoMovimento: 'SCARICO',
        quantita: 7,
        unitaMisura: 'cpr',
        causale: 'Somministrazione settimanale',
        dataMovimento: '2026-03-29T08:00:00.000Z',
        settimanaRiferimento: '2026-W13',
        operatore: 'DEMO',
        source: 'therapy',
        updatedAt: '2026-03-29T08:00:00.000Z',
        deletedAt: null,
        syncStatus: 'pending',
        _seeded: true,
    },
    {
        id: '__seed__mov-7',
        stockBatchId: '__seed__batch-2',
        drugId: '__seed__drug-2',
        hostId: null,
        therapyId: null,
        tipoMovimento: 'SCARICO',
        quantita: 21,
        unitaMisura: 'cpr',
        causale: 'Somministrazione settimanale',
        dataMovimento: '2026-04-01T08:00:00.000Z',
        settimanaRiferimento: '2026-W14',
        operatore: 'DEMO',
        source: 'therapy',
        updatedAt: '2026-04-01T08:00:00.000Z',
        deletedAt: null,
        syncStatus: 'pending',
        _seeded: true,
    },
    {
        id: '__seed__mov-8',
        stockBatchId: '__seed__batch-5',
        drugId: '__seed__drug-5',
        hostId: '__seed__host-3',
        therapyId: '__seed__therapy-5',
        tipoMovimento: 'SCARICO',
        quantita: 7,
        unitaMisura: 'cpr',
        causale: 'Somministrazione settimanale',
        dataMovimento: '2026-04-01T08:00:00.000Z',
        settimanaRiferimento: '2026-W14',
        operatore: 'DEMO',
        source: 'therapy',
        updatedAt: '2026-04-01T08:00:00.000Z',
        deletedAt: null,
        syncStatus: 'pending',
        _seeded: true,
    },
]

// Promemoria per oggi (2026-04-04) e domani — utili per testare la home dashboard
const SEED_REMINDERS = [
    {
        id: '__seed__rem-1',
        hostId: '__seed__host-1',
        therapyId: '__seed__therapy-1',
        drugId: '__seed__drug-1',
        scheduledAt: '2026-04-04T08:00:00.000Z',
        stato: 'ESEGUITO',
        eseguitoAt: '2026-04-04T08:12:00.000Z',
        operatore: 'DEMO',
        note: '[DEMO]',
        updatedAt: '2026-04-04T08:12:00.000Z',
        deletedAt: null,
        syncStatus: 'pending',
        _seeded: true,
    },
    {
        id: '__seed__rem-2',
        hostId: '__seed__host-1',
        therapyId: '__seed__therapy-1',
        drugId: '__seed__drug-1',
        scheduledAt: '2026-04-04T20:00:00.000Z',
        stato: 'DA_ESEGUIRE',
        eseguitoAt: null,
        operatore: null,
        note: '[DEMO]',
        updatedAt: NOW,
        deletedAt: null,
        syncStatus: 'pending',
        _seeded: true,
    },
    {
        id: '__seed__rem-3',
        hostId: '__seed__host-2',
        therapyId: '__seed__therapy-3',
        drugId: '__seed__drug-2',
        scheduledAt: '2026-04-04T07:00:00.000Z',
        stato: 'DA_ESEGUIRE',
        eseguitoAt: null,
        operatore: null,
        note: '[DEMO]',
        updatedAt: NOW,
        deletedAt: null,
        syncStatus: 'pending',
        _seeded: true,
    },
    {
        id: '__seed__rem-4',
        hostId: '__seed__host-3',
        therapyId: '__seed__therapy-5',
        drugId: '__seed__drug-5',
        scheduledAt: '2026-04-04T21:00:00.000Z',
        stato: 'DA_ESEGUIRE',
        eseguitoAt: null,
        operatore: null,
        note: '[DEMO]',
        updatedAt: NOW,
        deletedAt: null,
        syncStatus: 'pending',
        _seeded: true,
    },
    {
        id: '__seed__rem-5',
        hostId: '__seed__host-1',
        therapyId: '__seed__therapy-2',
        drugId: '__seed__drug-3',
        scheduledAt: '2026-04-05T09:00:00.000Z',
        stato: 'DA_ESEGUIRE',
        eseguitoAt: null,
        operatore: null,
        note: '[DEMO]',
        updatedAt: NOW,
        deletedAt: null,
        syncStatus: 'pending',
        _seeded: true,
    },
]

// ── Manifest — indice degli ID per tabella ────────────────────────────────────

const SEED_MANIFEST = {
    drugs: SEED_DRUGS.map(r => r.id),
    hosts: SEED_HOSTS.map(r => r.id),
    stockBatches: SEED_STOCK_BATCHES.map(r => r.id),
    therapies: SEED_THERAPIES.map(r => r.id),
    movements: SEED_MOVEMENTS.map(r => r.id),
    reminders: SEED_REMINDERS.map(r => r.id),
}

// ── API pubblica ──────────────────────────────────────────────────────────────

/**
 * Carica tutti i record demo nel database locale (idempotente: usa put()).
 * Lancia errore se non siamo in modalità DEV.
 */
export async function loadSeedData(options = {}) {
    assertSeedEnabled(options)

    await db.transaction('rw', [
        db.drugs, db.hosts, db.stockBatches,
        db.therapies, db.movements, db.reminders,
    ], async () => {
        for (const record of SEED_DRUGS) await db.drugs.put(record)
        for (const record of SEED_HOSTS) await db.hosts.put(record)
        for (const record of SEED_STOCK_BATCHES) await db.stockBatches.put(record)
        for (const record of SEED_THERAPIES) await db.therapies.put(record)
        for (const record of SEED_MOVEMENTS) await db.movements.put(record)
        for (const record of SEED_REMINDERS) await db.reminders.put(record)
    })

    await setSetting(SEED_MANIFEST_KEY, SEED_MANIFEST)

    return getSeedStats()
}

/**
 * Rimuove tutti i record demo dal database locale.
 * Sicuro da eseguire anche se i dati non sono stati caricati.
 */
export async function clearSeedData(options = {}) {
    assertSeedEnabled(options)

    const manifest = await getSetting(SEED_MANIFEST_KEY, null)
    if (!manifest) return { cleared: false, reason: 'nessun dato demo trovato' }

    await db.transaction('rw', [
        db.drugs, db.hosts, db.stockBatches,
        db.therapies, db.movements, db.reminders,
    ], async () => {
        for (const id of (manifest.drugs ?? [])) await db.drugs.delete(id)
        for (const id of (manifest.hosts ?? [])) await db.hosts.delete(id)
        for (const id of (manifest.stockBatches ?? [])) await db.stockBatches.delete(id)
        for (const id of (manifest.therapies ?? [])) await db.therapies.delete(id)
        for (const id of (manifest.movements ?? [])) await db.movements.delete(id)
        for (const id of (manifest.reminders ?? [])) await db.reminders.delete(id)
    })

    await setSetting(SEED_MANIFEST_KEY, null)

    return { cleared: true, tables: Object.keys(manifest) }
}

/**
 * Restituisce true se il manifest è presente in settings
 * (cioè i dati demo sono stati caricati).
 */
export async function isSeedDataLoaded() {
    const manifest = await getSetting(SEED_MANIFEST_KEY, null)
    return Boolean(manifest)
}

/**
 * Conteggio record per tabella (statico, non accede al db).
 */
export function getSeedStats() {
    return {
        drugs: SEED_DRUGS.length,
        hosts: SEED_HOSTS.length,
        stockBatches: SEED_STOCK_BATCHES.length,
        therapies: SEED_THERAPIES.length,
        movements: SEED_MOVEMENTS.length,
        reminders: SEED_REMINDERS.length,
    }
}

/** Esposto solo per i test unitari */
export const seedDataTestUtils = {
    SEED_ENABLED,
    SEED_MANIFEST_KEY,
    SEED_MANIFEST,
    SEED_DRUGS,
    SEED_HOSTS,
    SEED_STOCK_BATCHES,
    SEED_THERAPIES,
    SEED_MOVEMENTS,
    SEED_REMINDERS,
}
