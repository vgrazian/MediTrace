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

const SEED_ROOMS = [
    { id: '__seed__room-A', codice: 'A - Piano Terra', note: 'Ala nord, piano terra', updatedAt: NOW, deletedAt: null, syncStatus: 'pending', _seeded: true },
    { id: '__seed__room-B', codice: 'B - Piano Terra', note: 'Ala sud, piano terra', updatedAt: NOW, deletedAt: null, syncStatus: 'pending', _seeded: true },
    { id: '__seed__room-C', codice: 'C - Piano Primo', note: 'Ala centrale, primo piano', updatedAt: NOW, deletedAt: null, syncStatus: 'pending', _seeded: true },
]

const SEED_BEDS = [
    { id: '__seed__bed-A-1', roomId: '__seed__room-A', numero: 1, note: '', updatedAt: NOW, deletedAt: null, syncStatus: 'pending', _seeded: true },
    { id: '__seed__bed-A-2', roomId: '__seed__room-A', numero: 2, note: '', updatedAt: NOW, deletedAt: null, syncStatus: 'pending', _seeded: true },
    { id: '__seed__bed-B-1', roomId: '__seed__room-B', numero: 1, note: '', updatedAt: NOW, deletedAt: null, syncStatus: 'pending', _seeded: true },
    { id: '__seed__bed-B-2', roomId: '__seed__room-B', numero: 2, note: '', updatedAt: NOW, deletedAt: null, syncStatus: 'pending', _seeded: true },
    { id: '__seed__bed-C-1', roomId: '__seed__room-C', numero: 1, note: '', updatedAt: NOW, deletedAt: null, syncStatus: 'pending', _seeded: true },
    { id: '__seed__bed-C-2', roomId: '__seed__room-C', numero: 2, note: '', updatedAt: NOW, deletedAt: null, syncStatus: 'pending', _seeded: true },
]

const SEED_DRUGS = [
    { id: '__seed__drug-1', principioAttivo: 'Paracetamolo', classeTerapeutica: 'Analgesici / Antipiretici', scortaMinima: 10, fornitore: 'Farmacia Centrale', note: '', updatedAt: NOW, deletedAt: null, syncStatus: 'pending', _seeded: true },
    { id: '__seed__drug-2', principioAttivo: 'Ibuprofene', classeTerapeutica: 'FANS', scortaMinima: 8, fornitore: 'Farmacia Centrale', note: '', updatedAt: NOW, deletedAt: null, syncStatus: 'pending', _seeded: true },
    { id: '__seed__drug-3', principioAttivo: 'Ramipril', classeTerapeutica: 'ACE inibitori', scortaMinima: 6, fornitore: 'Fornitore Salute SpA', note: '', updatedAt: NOW, deletedAt: null, syncStatus: 'pending', _seeded: true },
    { id: '__seed__drug-4', principioAttivo: 'Metformina', classeTerapeutica: 'Antidiabetici orali', scortaMinima: 12, fornitore: 'Fornitore Salute SpA', note: '', updatedAt: NOW, deletedAt: null, syncStatus: 'pending', _seeded: true },
    { id: '__seed__drug-5', principioAttivo: 'Lorazepam', classeTerapeutica: 'Ansiolitici', scortaMinima: 4, fornitore: 'Farmacia Ospedaliera', note: '', updatedAt: NOW, deletedAt: null, syncStatus: 'pending', _seeded: true },
    { id: '__seed__drug-6', principioAttivo: 'Amlodipina', classeTerapeutica: 'Antiipertensivi CA', scortaMinima: 8, fornitore: 'Fornitore Salute SpA', note: '', updatedAt: NOW, deletedAt: null, syncStatus: 'pending', _seeded: true },
    { id: '__seed__drug-7', principioAttivo: 'Furosemide', classeTerapeutica: 'Diuretici', scortaMinima: 5, fornitore: 'Farmacia Centrale', note: '', updatedAt: NOW, deletedAt: null, syncStatus: 'pending', _seeded: true },
    { id: '__seed__drug-8', principioAttivo: 'Omeprazolo', classeTerapeutica: 'Inibitori pompa protonica', scortaMinima: 10, fornitore: 'Fornitore Salute SpA', note: '', updatedAt: NOW, deletedAt: null, syncStatus: 'pending', _seeded: true },
    { id: '__seed__drug-9', principioAttivo: 'Levotiroxina', classeTerapeutica: 'Ormoni tiroidei', scortaMinima: 6, fornitore: 'Farmacia Centrale', note: '', updatedAt: NOW, deletedAt: null, syncStatus: 'pending', _seeded: true },
    { id: '__seed__drug-10', principioAttivo: 'Atenololo', classeTerapeutica: 'Beta bloccanti', scortaMinima: 7, fornitore: 'Fornitore Salute SpA', note: '', updatedAt: NOW, deletedAt: null, syncStatus: 'pending', _seeded: true },
]

const SEED_HOSTS = [
    { id: '__seed__host-1', codiceInterno: 'OSP-01', iniziali: 'M.R.', roomId: '__seed__room-A', bedId: '__seed__bed-A-1', stanza: 'A', letto: '1', attivo: true, noteEssenziali: 'Allergia penicillina', updatedAt: NOW, deletedAt: null, syncStatus: 'pending', _seeded: true },
    { id: '__seed__host-2', codiceInterno: 'OSP-02', iniziali: 'A.B.', roomId: '__seed__room-A', bedId: '__seed__bed-A-2', stanza: 'A', letto: '2', attivo: true, noteEssenziali: '', updatedAt: NOW, deletedAt: null, syncStatus: 'pending', _seeded: true },
    { id: '__seed__host-3', codiceInterno: 'OSP-03', iniziali: 'G.P.', roomId: '__seed__room-B', bedId: '__seed__bed-B-1', stanza: 'B', letto: '1', attivo: true, noteEssenziali: '', updatedAt: NOW, deletedAt: null, syncStatus: 'pending', _seeded: true },
    { id: '__seed__host-4', codiceInterno: 'OSP-04', iniziali: 'L.T.', roomId: '__seed__room-B', bedId: '__seed__bed-B-2', stanza: 'B', letto: '2', attivo: true, noteEssenziali: '', updatedAt: NOW, deletedAt: null, syncStatus: 'pending', _seeded: true },
    { id: '__seed__host-5', codiceInterno: 'OSP-05', iniziali: 'E.S.', roomId: '__seed__room-C', bedId: '__seed__bed-C-1', stanza: 'C', letto: '1', attivo: true, noteEssenziali: 'Follow-up cardiologo mensile', updatedAt: NOW, deletedAt: null, syncStatus: 'pending', _seeded: true },
    { id: '__seed__host-6', codiceInterno: 'OSP-06', iniziali: 'P.C.', roomId: '__seed__room-C', bedId: '__seed__bed-C-2', stanza: 'C', letto: '2', attivo: true, noteEssenziali: '', updatedAt: NOW, deletedAt: null, syncStatus: 'pending', _seeded: true },
    { id: '__seed__host-7', codiceInterno: 'OSP-07', iniziali: 'V.D.', roomId: '__seed__room-A', bedId: null, stanza: 'A', letto: '3', attivo: true, noteEssenziali: 'Diabete controllato', updatedAt: NOW, deletedAt: null, syncStatus: 'pending', _seeded: true },
    { id: '__seed__host-8', codiceInterno: 'OSP-08', iniziali: 'F.M.', roomId: '__seed__room-B', bedId: null, stanza: 'B', letto: '3', attivo: true, noteEssenziali: '', updatedAt: NOW, deletedAt: null, syncStatus: 'pending', _seeded: true },
    { id: '__seed__host-9', codiceInterno: 'OSP-09', iniziali: 'C.N.', roomId: '__seed__room-C', bedId: null, stanza: 'C', letto: '3', attivo: true, noteEssenziali: 'Stato stabile', updatedAt: NOW, deletedAt: null, syncStatus: 'pending', _seeded: true },
    { id: '__seed__host-10', codiceInterno: 'OSP-10', iniziali: 'S.R.', roomId: null, bedId: null, stanza: 'D', letto: '1', attivo: false, noteEssenziali: 'Dimesso 2026-03-28', updatedAt: NOW, deletedAt: NOW, syncStatus: 'pending', _seeded: true },
]

const SEED_STOCK_BATCHES = [
    { id: '__seed__batch-1', drugId: '__seed__drug-1', nomeCommerciale: 'Tachipirina 500 mg', dosaggio: '500 mg', forma: 'Compresse', unitaMisura: 'cpr', lotto: 'L1001', scadenza: '2027-06-30', quantitaIniziale: 100, quantitaAttuale: 52, sogliaRiordino: 20, updatedAt: NOW, deletedAt: null, syncStatus: 'pending', _seeded: true },
    { id: '__seed__batch-2', drugId: '__seed__drug-2', nomeCommerciale: 'Moment 200 mg', dosaggio: '200 mg', forma: 'Compresse rivestite', unitaMisura: 'cpr', lotto: 'L2001', scadenza: '2026-12-31', quantitaIniziale: 60, quantitaAttuale: 5, sogliaRiordino: 15, updatedAt: NOW, deletedAt: null, syncStatus: 'pending', _seeded: true },
    { id: '__seed__batch-3', drugId: '__seed__drug-3', nomeCommerciale: 'Triatec 5 mg', dosaggio: '5 mg', forma: 'Compresse', unitaMisura: 'cpr', lotto: 'L3001', scadenza: '2027-03-31', quantitaIniziale: 90, quantitaAttuale: 72, sogliaRiordino: 10, updatedAt: NOW, deletedAt: null, syncStatus: 'pending', _seeded: true },
    { id: '__seed__batch-4', drugId: '__seed__drug-4', nomeCommerciale: 'Glucophage 500 mg', dosaggio: '500 mg', forma: 'Compresse', unitaMisura: 'cpr', lotto: 'L4001', scadenza: '2027-09-30', quantitaIniziale: 120, quantitaAttuale: 80, sogliaRiordino: 20, updatedAt: NOW, deletedAt: null, syncStatus: 'pending', _seeded: true },
    { id: '__seed__batch-5', drugId: '__seed__drug-5', nomeCommerciale: 'Tavor 1 mg', dosaggio: '1 mg', forma: 'Compresse sublinguali', unitaMisura: 'cpr', lotto: 'L5001', scadenza: '2026-08-31', quantitaIniziale: 30, quantitaAttuale: 3, sogliaRiordino: 8, updatedAt: NOW, deletedAt: null, syncStatus: 'pending', _seeded: true },
    { id: '__seed__batch-6', drugId: '__seed__drug-1', nomeCommerciale: 'Paracetamolo TEVA 1000 mg', dosaggio: '1000 mg', forma: 'Compresse effervescenti', unitaMisura: 'cpr', lotto: 'L1002', scadenza: '2027-01-31', quantitaIniziale: 50, quantitaAttuale: 0, sogliaRiordino: 10, updatedAt: NOW, deletedAt: null, syncStatus: 'pending', _seeded: true },
    { id: '__seed__batch-7', drugId: '__seed__drug-6', nomeCommerciale: 'Norvasc 5 mg', dosaggio: '5 mg', forma: 'Compresse', unitaMisura: 'cpr', lotto: 'L6001', scadenza: '2027-08-31', quantitaIniziale: 100, quantitaAttuale: 85, sogliaRiordino: 15, updatedAt: NOW, deletedAt: null, syncStatus: 'pending', _seeded: true },
    { id: '__seed__batch-8', drugId: '__seed__drug-7', nomeCommerciale: 'Lasix 40 mg', dosaggio: '40 mg', forma: 'Compresse', unitaMisura: 'cpr', lotto: 'L7001', scadenza: '2027-05-31', quantitaIniziale: 60, quantitaAttuale: 45, sogliaRiordino: 12, updatedAt: NOW, deletedAt: null, syncStatus: 'pending', _seeded: true },
    { id: '__seed__batch-9', drugId: '__seed__drug-8', nomeCommerciale: 'Nexium 20 mg', dosaggio: '20 mg', forma: 'Capsule', unitaMisura: 'cps', lotto: 'L8001', scadenza: '2027-04-30', quantitaIniziale: 80, quantitaAttuale: 60, sogliaRiordino: 18, updatedAt: NOW, deletedAt: null, syncStatus: 'pending', _seeded: true },
    { id: '__seed__batch-10', drugId: '__seed__drug-9', nomeCommerciale: 'Eutirox 100 mcg', dosaggio: '100 mcg', forma: 'Compresse', unitaMisura: 'cpr', lotto: 'L9001', scadenza: '2027-12-31', quantitaIniziale: 90, quantitaAttuale: 78, sogliaRiordino: 14, updatedAt: NOW, deletedAt: null, syncStatus: 'pending', _seeded: true },
    { id: '__seed__batch-11', drugId: '__seed__drug-10', nomeCommerciale: 'Tenormin 50 mg', dosaggio: '50 mg', forma: 'Compresse', unitaMisura: 'cpr', lotto: 'L10001', scadenza: '2027-07-31', quantitaIniziale: 70, quantitaAttuale: 52, sogliaRiordino: 16, updatedAt: NOW, deletedAt: null, syncStatus: 'pending', _seeded: true },
]

const SEED_THERAPIES = [
    { id: '__seed__therapy-1', hostId: '__seed__host-1', drugId: '__seed__drug-1', stockBatchIdPreferito: '__seed__batch-1', dosePerSomministrazione: 1, unitaDose: 'cpr', somministrazioniGiornaliere: 2, consumoMedioSettimanale: 14, dataInizio: '2026-01-10T00:00:00.000Z', dataFine: null, attiva: true, note: '', updatedAt: NOW, deletedAt: null, syncStatus: 'pending', _seeded: true },
    { id: '__seed__therapy-2', hostId: '__seed__host-1', drugId: '__seed__drug-3', stockBatchIdPreferito: '__seed__batch-3', dosePerSomministrazione: 1, unitaDose: 'cpr', somministrazioniGiornaliere: 1, consumoMedioSettimanale: 7, dataInizio: '2025-11-15T00:00:00.000Z', dataFine: null, attiva: true, note: '', updatedAt: NOW, deletedAt: null, syncStatus: 'pending', _seeded: true },
    { id: '__seed__therapy-3', hostId: '__seed__host-2', drugId: '__seed__drug-2', stockBatchIdPreferito: '__seed__batch-2', dosePerSomministrazione: 1, unitaDose: 'cpr', somministrazioniGiornaliere: 3, consumoMedioSettimanale: 21, dataInizio: '2026-02-01T00:00:00.000Z', dataFine: null, attiva: true, note: '', updatedAt: NOW, deletedAt: null, syncStatus: 'pending', _seeded: true },
    { id: '__seed__therapy-4', hostId: '__seed__host-3', drugId: '__seed__drug-4', stockBatchIdPreferito: '__seed__batch-4', dosePerSomministrazione: 2, unitaDose: 'cpr', somministrazioniGiornaliere: 2, consumoMedioSettimanale: 28, dataInizio: '2025-09-01T00:00:00.000Z', dataFine: null, attiva: true, note: 'Controllare glicemia settimanalmente', updatedAt: NOW, deletedAt: null, syncStatus: 'pending', _seeded: true },
    { id: '__seed__therapy-5', hostId: '__seed__host-3', drugId: '__seed__drug-5', stockBatchIdPreferito: '__seed__batch-5', dosePerSomministrazione: 1, unitaDose: 'cpr', somministrazioniGiornaliere: 1, consumoMedioSettimanale: 7, dataInizio: '2026-03-01T00:00:00.000Z', dataFine: null, attiva: true, note: '', updatedAt: NOW, deletedAt: null, syncStatus: 'pending', _seeded: true },
    { id: '__seed__therapy-6', hostId: '__seed__host-4', drugId: '__seed__drug-1', stockBatchIdPreferito: '__seed__batch-1', dosePerSomministrazione: 1, unitaDose: 'cpr', somministrazioniGiornaliere: 1, consumoMedioSettimanale: 7, dataInizio: '2025-06-01T00:00:00.000Z', dataFine: '2026-02-28T23:59:59.000Z', attiva: false, note: 'Dimesso', updatedAt: NOW, deletedAt: NOW, syncStatus: 'pending', _seeded: true },
    { id: '__seed__therapy-7', hostId: '__seed__host-5', drugId: '__seed__drug-6', stockBatchIdPreferito: '__seed__batch-7', dosePerSomministrazione: 1, unitaDose: 'cpr', somministrazioniGiornaliere: 1, consumoMedioSettimanale: 7, dataInizio: '2025-12-01T00:00:00.000Z', dataFine: null, attiva: true, note: '', updatedAt: NOW, deletedAt: null, syncStatus: 'pending', _seeded: true },
    { id: '__seed__therapy-8', hostId: '__seed__host-5', drugId: '__seed__drug-7', stockBatchIdPreferito: '__seed__batch-8', dosePerSomministrazione: 1, unitaDose: 'cpr', somministrazioniGiornaliere: 1, consumoMedioSettimanale: 7, dataInizio: '2026-01-15T00:00:00.000Z', dataFine: null, attiva: true, note: 'Cardiopatia ischemica', updatedAt: NOW, deletedAt: null, syncStatus: 'pending', _seeded: true },
    { id: '__seed__therapy-9', hostId: '__seed__host-6', drugId: '__seed__drug-8', stockBatchIdPreferito: '__seed__batch-9', dosePerSomministrazione: 1, unitaDose: 'cps', somministrazioniGiornaliere: 1, consumoMedioSettimanale: 7, dataInizio: '2026-02-15T00:00:00.000Z', dataFine: null, attiva: true, note: '', updatedAt: NOW, deletedAt: null, syncStatus: 'pending', _seeded: true },
    { id: '__seed__therapy-10', hostId: '__seed__host-7', drugId: '__seed__drug-4', stockBatchIdPreferito: '__seed__batch-4', dosePerSomministrazione: 1, unitaDose: 'cpr', somministrazioniGiornaliere: 2, consumoMedioSettimanale: 14, dataInizio: '2025-08-20T00:00:00.000Z', dataFine: null, attiva: true, note: 'Diabete t2', updatedAt: NOW, deletedAt: null, syncStatus: 'pending', _seeded: true },
    { id: '__seed__therapy-11', hostId: '__seed__host-7', drugId: '__seed__drug-9', stockBatchIdPreferito: '__seed__batch-10', dosePerSomministrazione: 1, unitaDose: 'cpr', somministrazioniGiornaliere: 1, consumoMedioSettimanale: 7, dataInizio: '2025-10-10T00:00:00.000Z', dataFine: null, attiva: true, note: 'Ipotiroidismo', updatedAt: NOW, deletedAt: null, syncStatus: 'pending', _seeded: true },
    { id: '__seed__therapy-12', hostId: '__seed__host-8', drugId: '__seed__drug-10', stockBatchIdPreferito: '__seed__batch-11', dosePerSomministrazione: 1, unitaDose: 'cpr', somministrazioniGiornaliere: 1, consumoMedioSettimanale: 7, dataInizio: '2026-01-20T00:00:00.000Z', dataFine: null, attiva: true, note: '', updatedAt: NOW, deletedAt: null, syncStatus: 'pending', _seeded: true },
    { id: '__seed__therapy-13', hostId: '__seed__host-8', drugId: '__seed__drug-3', stockBatchIdPreferito: '__seed__batch-3', dosePerSomministrazione: 1, unitaDose: 'cpr', somministrazioniGiornaliere: 1, consumoMedioSettimanale: 7, dataInizio: '2025-07-01T00:00:00.000Z', dataFine: null, attiva: true, note: 'Ipertensione', updatedAt: NOW, deletedAt: null, syncStatus: 'pending', _seeded: true },
    { id: '__seed__therapy-14', hostId: '__seed__host-9', drugId: '__seed__drug-1', stockBatchIdPreferito: '__seed__batch-1', dosePerSomministrazione: 1, unitaDose: 'cpr', somministrazioniGiornaliere: 2, consumoMedioSettimanale: 14, dataInizio: '2026-02-10T00:00:00.000Z', dataFine: null, attiva: true, note: '', updatedAt: NOW, deletedAt: null, syncStatus: 'pending', _seeded: true },
    { id: '__seed__therapy-15', hostId: '__seed__host-9', drugId: '__seed__drug-2', stockBatchIdPreferito: '__seed__batch-2', dosePerSomministrazione: 1, unitaDose: 'cpr', somministrazioniGiornaliere: 1, consumoMedioSettimanale: 7, dataInizio: '2026-03-05T00:00:00.000Z', dataFine: null, attiva: true, note: '', updatedAt: NOW, deletedAt: null, syncStatus: 'pending', _seeded: true },
]

const SEED_MOVEMENTS = [
    { id: '__seed__mov-1', stockBatchId: '__seed__batch-1', drugId: '__seed__drug-1', hostId: '__seed__host-1', therapyId: '__seed__therapy-1', tipoMovimento: 'CARICO', quantita: 60, unitaMisura: 'cpr', causale: 'Acquisto mensile', dataMovimento: '2026-03-01T09:00:00.000Z', settimanaRiferimento: '2026-W09', operatore: 'Oper1', source: 'manual', updatedAt: '2026-03-01T09:00:00.000Z', deletedAt: null, syncStatus: 'pending', _seeded: true },
    { id: '__seed__mov-2', stockBatchId: '__seed__batch-1', drugId: '__seed__drug-1', hostId: '__seed__host-1', therapyId: '__seed__therapy-1', tipoMovimento: 'SCARICO', quantita: 8, unitaMisura: 'cpr', causale: 'Somministrazione settimanale', dataMovimento: '2026-03-08T08:00:00.000Z', settimanaRiferimento: '2026-W10', operatore: 'Oper1', source: 'therapy', updatedAt: '2026-03-08T08:00:00.000Z', deletedAt: null, syncStatus: 'pending', _seeded: true },
    { id: '__seed__mov-3', stockBatchId: '__seed__batch-2', drugId: '__seed__drug-2', hostId: '__seed__host-2', therapyId: '__seed__therapy-3', tipoMovimento: 'SCARICO', quantita: 21, unitaMisura: 'cpr', causale: 'Somministrazione settimanale', dataMovimento: '2026-03-08T08:00:00.000Z', settimanaRiferimento: '2026-W10', operatore: 'Oper2', source: 'therapy', updatedAt: '2026-03-08T08:00:00.000Z', deletedAt: null, syncStatus: 'pending', _seeded: true },
    { id: '__seed__mov-4', stockBatchId: '__seed__batch-3', drugId: '__seed__drug-3', hostId: '__seed__host-1', therapyId: '__seed__therapy-2', tipoMovimento: 'SCARICO', quantita: 7, unitaMisura: 'cpr', causale: 'Somministrazione settimanale', dataMovimento: '2026-03-15T08:00:00.000Z', settimanaRiferimento: '2026-W11', operatore: 'Oper1', source: 'therapy', updatedAt: '2026-03-15T08:00:00.000Z', deletedAt: null, syncStatus: 'pending', _seeded: true },
    { id: '__seed__mov-5', stockBatchId: '__seed__batch-4', drugId: '__seed__drug-4', hostId: '__seed__host-3', therapyId: '__seed__therapy-4', tipoMovimento: 'SCARICO', quantita: 28, unitaMisura: 'cpr', causale: 'Somministrazione settimanale', dataMovimento: '2026-03-22T08:00:00.000Z', settimanaRiferimento: '2026-W12', operatore: 'Oper3', source: 'therapy', updatedAt: '2026-03-22T08:00:00.000Z', deletedAt: null, syncStatus: 'pending', _seeded: true },
    { id: '__seed__mov-6', stockBatchId: '__seed__batch-5', drugId: '__seed__drug-5', hostId: '__seed__host-3', therapyId: '__seed__therapy-5', tipoMovimento: 'SCARICO', quantita: 7, unitaMisura: 'cpr', causale: 'Somministrazione settimanale', dataMovimento: '2026-03-29T08:00:00.000Z', settimanaRiferimento: '2026-W13', operatore: 'Oper2', source: 'therapy', updatedAt: '2026-03-29T08:00:00.000Z', deletedAt: null, syncStatus: 'pending', _seeded: true },
    { id: '__seed__mov-7', stockBatchId: '__seed__batch-2', drugId: '__seed__drug-2', hostId: null, therapyId: null, tipoMovimento: 'SCARICO', quantita: 21, unitaMisura: 'cpr', causale: 'Consumo generale', dataMovimento: '2026-04-01T08:00:00.000Z', settimanaRiferimento: '2026-W14', operatore: 'Oper1', source: 'manual', updatedAt: '2026-04-01T08:00:00.000Z', deletedAt: null, syncStatus: 'pending', _seeded: true },
    { id: '__seed__mov-8', stockBatchId: '__seed__batch-5', drugId: '__seed__drug-5', hostId: '__seed__host-3', therapyId: '__seed__therapy-5', tipoMovimento: 'SCARICO', quantita: 7, unitaMisura: 'cpr', causale: 'Somministrazione settimanale', dataMovimento: '2026-04-01T08:00:00.000Z', settimanaRiferimento: '2026-W14', operatore: 'Oper3', source: 'therapy', updatedAt: '2026-04-01T08:00:00.000Z', deletedAt: null, syncStatus: 'pending', _seeded: true },
    { id: '__seed__mov-9', stockBatchId: '__seed__batch-7', drugId: '__seed__drug-6', hostId: '__seed__host-5', therapyId: '__seed__therapy-7', tipoMovimento: 'SCARICO', quantita: 7, unitaMisura: 'cpr', causale: 'Somministrazione settimanale', dataMovimento: '2026-04-01T08:00:00.000Z', settimanaRiferimento: '2026-W14', operatore: 'Oper1', source: 'therapy', updatedAt: '2026-04-01T08:00:00.000Z', deletedAt: null, syncStatus: 'pending', _seeded: true },
    { id: '__seed__mov-10', stockBatchId: '__seed__batch-8', drugId: '__seed__drug-7', hostId: '__seed__host-5', therapyId: '__seed__therapy-8', tipoMovimento: 'SCARICO', quantita: 7, unitaMisura: 'cpr', causale: 'Somministrazione settimanale', dataMovimento: '2026-04-02T08:00:00.000Z', settimanaRiferimento: '2026-W14', operatore: 'Oper2', source: 'therapy', updatedAt: '2026-04-02T08:00:00.000Z', deletedAt: null, syncStatus: 'pending', _seeded: true },
    { id: '__seed__mov-11', stockBatchId: '__seed__batch-9', drugId: '__seed__drug-8', hostId: '__seed__host-6', therapyId: '__seed__therapy-9', tipoMovimento: 'SCARICO', quantita: 7, unitaMisura: 'cps', causale: 'Somministrazione settimanale', dataMovimento: '2026-04-02T08:00:00.000Z', settimanaRiferimento: '2026-W14', operatore: 'Oper1', source: 'therapy', updatedAt: '2026-04-02T08:00:00.000Z', deletedAt: null, syncStatus: 'pending', _seeded: true },
    { id: '__seed__mov-12', stockBatchId: '__seed__batch-4', drugId: '__seed__drug-4', hostId: '__seed__host-7', therapyId: '__seed__therapy-10', tipoMovimento: 'SCARICO', quantita: 14, unitaMisura: 'cpr', causale: 'Somministrazione settimanale', dataMovimento: '2026-04-03T08:00:00.000Z', settimanaRiferimento: '2026-W14', operatore: 'Oper3', source: 'therapy', updatedAt: '2026-04-03T08:00:00.000Z', deletedAt: null, syncStatus: 'pending', _seeded: true },
    { id: '__seed__mov-13', stockBatchId: '__seed__batch-10', drugId: '__seed__drug-9', hostId: '__seed__host-7', therapyId: '__seed__therapy-11', tipoMovimento: 'SCARICO', quantita: 7, unitaMisura: 'cpr', causale: 'Somministrazione settimanale', dataMovimento: '2026-04-03T08:00:00.000Z', settimanaRiferimento: '2026-W14', operatore: 'Oper2', source: 'therapy', updatedAt: '2026-04-03T08:00:00.000Z', deletedAt: null, syncStatus: 'pending', _seeded: true },
    { id: '__seed__mov-14', stockBatchId: '__seed__batch-11', drugId: '__seed__drug-10', hostId: '__seed__host-8', therapyId: '__seed__therapy-12', tipoMovimento: 'SCARICO', quantita: 7, unitaMisura: 'cpr', causale: 'Somministrazione settimanale', dataMovimento: '2026-04-03T08:00:00.000Z', settimanaRiferimento: '2026-W14', operatore: 'Oper1', source: 'therapy', updatedAt: '2026-04-03T08:00:00.000Z', deletedAt: null, syncStatus: 'pending', _seeded: true },
    { id: '__seed__mov-15', stockBatchId: '__seed__batch-3', drugId: '__seed__drug-3', hostId: '__seed__host-8', therapyId: '__seed__therapy-13', tipoMovimento: 'SCARICO', quantita: 7, unitaMisura: 'cpr', causale: 'Somministrazione settimanale', dataMovimento: '2026-04-04T08:00:00.000Z', settimanaRiferimento: '2026-W14', operatore: 'Oper3', source: 'therapy', updatedAt: '2026-04-04T08:00:00.000Z', deletedAt: null, syncStatus: 'pending', _seeded: true },
]

const SEED_REMINDERS = [
    { id: '__seed__rem-1', hostId: '__seed__host-1', therapyId: '__seed__therapy-1', drugId: '__seed__drug-1', scheduledAt: '2026-04-04T08:00:00.000Z', stato: 'ESEGUITO', eseguitoAt: '2026-04-04T08:12:00.000Z', operatore: 'Oper1', note: '', updatedAt: '2026-04-04T08:12:00.000Z', deletedAt: null, syncStatus: 'pending', _seeded: true },
    { id: '__seed__rem-2', hostId: '__seed__host-1', therapyId: '__seed__therapy-1', drugId: '__seed__drug-1', scheduledAt: '2026-04-04T20:00:00.000Z', stato: 'DA_ESEGUIRE', eseguitoAt: null, operatore: null, note: '', updatedAt: NOW, deletedAt: null, syncStatus: 'pending', _seeded: true },
    { id: '__seed__rem-3', hostId: '__seed__host-2', therapyId: '__seed__therapy-3', drugId: '__seed__drug-2', scheduledAt: '2026-04-04T07:00:00.000Z', stato: 'DA_ESEGUIRE', eseguitoAt: null, operatore: null, note: '', updatedAt: NOW, deletedAt: null, syncStatus: 'pending', _seeded: true },
    { id: '__seed__rem-4', hostId: '__seed__host-3', therapyId: '__seed__therapy-5', drugId: '__seed__drug-5', scheduledAt: '2026-04-04T21:00:00.000Z', stato: 'DA_ESEGUIRE', eseguitoAt: null, operatore: null, note: '', updatedAt: NOW, deletedAt: null, syncStatus: 'pending', _seeded: true },
    { id: '__seed__rem-5', hostId: '__seed__host-1', therapyId: '__seed__therapy-2', drugId: '__seed__drug-3', scheduledAt: '2026-04-05T09:00:00.000Z', stato: 'DA_ESEGUIRE', eseguitoAt: null, operatore: null, note: '', updatedAt: NOW, deletedAt: null, syncStatus: 'pending', _seeded: true },
    { id: '__seed__rem-6', hostId: '__seed__host-5', therapyId: '__seed__therapy-7', drugId: '__seed__drug-6', scheduledAt: '2026-04-04T09:30:00.000Z', stato: 'DA_ESEGUIRE', eseguitoAt: null, operatore: null, note: '', updatedAt: NOW, deletedAt: null, syncStatus: 'pending', _seeded: true },
    { id: '__seed__rem-7', hostId: '__seed__host-5', therapyId: '__seed__therapy-8', drugId: '__seed__drug-7', scheduledAt: '2026-04-04T09:45:00.000Z', stato: 'DA_ESEGUIRE', eseguitoAt: null, operatore: null, note: '', updatedAt: NOW, deletedAt: null, syncStatus: 'pending', _seeded: true },
    { id: '__seed__rem-8', hostId: '__seed__host-6', therapyId: '__seed__therapy-9', drugId: '__seed__drug-8', scheduledAt: '2026-04-04T08:00:00.000Z', stato: 'ESEGUITO', eseguitoAt: '2026-04-04T08:05:00.000Z', operatore: 'Oper2', note: '', updatedAt: '2026-04-04T08:05:00.000Z', deletedAt: null, syncStatus: 'pending', _seeded: true },
    { id: '__seed__rem-9', hostId: '__seed__host-7', therapyId: '__seed__therapy-10', drugId: '__seed__drug-4', scheduledAt: '2026-04-04T08:00:00.000Z', stato: 'DA_ESEGUIRE', eseguitoAt: null, operatore: null, note: '', updatedAt: NOW, deletedAt: null, syncStatus: 'pending', _seeded: true },
    { id: '__seed__rem-10', hostId: '__seed__host-7', therapyId: '__seed__therapy-11', drugId: '__seed__drug-9', scheduledAt: '2026-04-04T18:00:00.000Z', stato: 'DA_ESEGUIRE', eseguitoAt: null, operatore: null, note: '', updatedAt: NOW, deletedAt: null, syncStatus: 'pending', _seeded: true },
    { id: '__seed__rem-11', hostId: '__seed__host-8', therapyId: '__seed__therapy-12', drugId: '__seed__drug-10', scheduledAt: '2026-04-04T07:00:00.000Z', stato: 'DA_ESEGUIRE', eseguitoAt: null, operatore: null, note: '', updatedAt: NOW, deletedAt: null, syncStatus: 'pending', _seeded: true },
    { id: '__seed__rem-12', hostId: '__seed__host-8', therapyId: '__seed__therapy-13', drugId: '__seed__drug-3', scheduledAt: '2026-04-04T20:00:00.000Z', stato: 'DA_ESEGUIRE', eseguitoAt: null, operatore: null, note: '', updatedAt: NOW, deletedAt: null, syncStatus: 'pending', _seeded: true },
    { id: '__seed__rem-13', hostId: '__seed__host-9', therapyId: '__seed__therapy-14', drugId: '__seed__drug-1', scheduledAt: '2026-04-04T08:00:00.000Z', stato: 'DA_ESEGUIRE', eseguitoAt: null, operatore: null, note: '', updatedAt: NOW, deletedAt: null, syncStatus: 'pending', _seeded: true },
    { id: '__seed__rem-14', hostId: '__seed__host-9', therapyId: '__seed__therapy-14', drugId: '__seed__drug-1', scheduledAt: '2026-04-04T20:00:00.000Z', stato: 'DA_ESEGUIRE', eseguitoAt: null, operatore: null, note: '', updatedAt: NOW, deletedAt: null, syncStatus: 'pending', _seeded: true },
    { id: '__seed__rem-15', hostId: '__seed__host-9', therapyId: '__seed__therapy-15', drugId: '__seed__drug-2', scheduledAt: '2026-04-04T12:00:00.000Z', stato: 'DA_ESEGUIRE', eseguitoAt: null, operatore: null, note: '', updatedAt: NOW, deletedAt: null, syncStatus: 'pending', _seeded: true },
]

// ── Manifest — indice degli ID per tabella ────────────────────────────────────

// ── Manifest — indice degli ID per tabella ────────────────────────────────────

const SEED_MANIFEST = {
    rooms: SEED_ROOMS.map(r => r.id),
    beds: SEED_BEDS.map(r => r.id),
    hosts: SEED_HOSTS.map(r => r.id),
    drugs: SEED_DRUGS.map(r => r.id),
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
        db.rooms, db.beds, db.hosts, db.drugs, db.stockBatches,
        db.therapies, db.movements, db.reminders,
    ], async () => {
        for (const record of SEED_ROOMS) await db.rooms.put(record)
        for (const record of SEED_BEDS) await db.beds.put(record)
        for (const record of SEED_HOSTS) await db.hosts.put(record)
        for (const record of SEED_DRUGS) await db.drugs.put(record)
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
        db.rooms, db.beds, db.hosts, db.drugs, db.stockBatches,
        db.therapies, db.movements, db.reminders,
    ], async () => {
        for (const id of (manifest.rooms ?? [])) await db.rooms.delete(id)
        for (const id of (manifest.beds ?? [])) await db.beds.delete(id)
        for (const id of (manifest.hosts ?? [])) await db.hosts.delete(id)
        for (const id of (manifest.drugs ?? [])) await db.drugs.delete(id)
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
        rooms: SEED_ROOMS.length,
        beds: SEED_BEDS.length,
        hosts: SEED_HOSTS.length,
        drugs: SEED_DRUGS.length,
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
    SEED_ROOMS,
    SEED_BEDS,
    SEED_HOSTS,
    SEED_DRUGS,
    SEED_STOCK_BATCHES,
    SEED_THERAPIES,
    SEED_MOVEMENTS,
    SEED_REMINDERS,
}
