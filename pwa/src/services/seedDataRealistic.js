/**
 * seedDataRealistic.js — Dati realistici per test basati su CSV fixture
 * 
 * Questo modulo carica e trasforma dati realistici da CSV fixture
 * e li genera come strutture pronte per il database IndexedDB.
 * 
 * API:
 *   generateRealisticSeedData() — Genera oggetti hosts/rooms/beds/drugs/batches/therapies
 *   loadRealisticSeedData(options) — Carica tutto nel database
 *   clearRealisticSeedData(options) — Rimuove tutto dal database
 */

import { db, getSetting, setSetting } from '../db'
import realisticDataset from '../data/realisticDataset.json'

const REALISTIC_SEED_KEY = '_realisticSeedDataManifest'
const REALISTIC_SEED_PREFIX = '__realistic__'
const REALISTIC_SEED_STORE_NAMES = ['rooms', 'beds', 'hosts', 'drugs', 'stockBatches', 'therapies']

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

async function findRealisticSeedIds(table) {
    if (!table || typeof table.toArray !== 'function') return []
    const rows = await table.toArray()
    return rows
        .map(row => row?.id)
        .filter(id => typeof id === 'string' && id.startsWith(REALISTIC_SEED_PREFIX))
}

async function getRealisticSeedManifest() {
    const manifest = await getSetting(REALISTIC_SEED_KEY, null)
    if (manifest) return manifest

    const [rooms, beds, hosts, drugs, stockBatches, therapies] = await Promise.all([
        findRealisticSeedIds(db.rooms),
        findRealisticSeedIds(db.beds),
        findRealisticSeedIds(db.hosts),
        findRealisticSeedIds(db.drugs),
        findRealisticSeedIds(db.stockBatches),
        findRealisticSeedIds(db.therapies),
    ])

    const fallbackManifest = { rooms, beds, hosts, drugs, stockBatches, therapies }
    const hasSeedRows = Object.values(fallbackManifest).some(ids => ids.length > 0)
    return hasSeedRows ? fallbackManifest : null
}

const CSV_FARMACI = `marca,farmaco
Pfizer,Donepezil
Novartis,Rivastigmina
Lundbeck,Memantina
Biogen,Interferone beta-1a
Roche,Ocrelizumab
Teva,Glatiramer acetato
UCB,Levodopa/Carbidopa
AbbVie,Duodopa
Boehringer Ingelheim,Pramipexolo
BMS,Apixaban
Bayer,Rivaroxaban
Sanofi,Furosemide
AstraZeneca,Bisoprololo
Novartis,Sacubitril/Valsartan
GlaxoSmithKline,Salbutamolo
Boehringer Ingelheim,Tiotropio
Chiesi,Beclometasone/Formoterolo
Angelini,Ramipril
Menarini,Perindopril
Pfizer,Gabapentin
Eli Lilly,Duloxetina
Janssen,Fentanil
Takeda,Pregabalin
Roche,Riluzolo
Biogen,Edaravone
Takeda,Morfin solfato
Sandoz,Warfarin
Zambon,Acetilcisteina
Otsuka,Tolvaptan
Teva,Baclofene`

/**
 * Parse CSV helper
 */
function parseCSV(csvContent) {
    const lines = csvContent.trim().split('\n')
    const headers = lines[0].split(',').map(h => h.trim())

    return lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim())
        const obj = {}
        headers.forEach((header, i) => {
            obj[header] = values[i] || ''
        })
        return obj
    })
}

function normalizePatologie(value) {
    if (Array.isArray(value)) return value.filter(Boolean).join(', ')
    return String(value ?? '').trim()
}

/**
 * Generate realistic hosts from provided JSON dataset
 */
function generateRealisticHosts(now) {
    const templateHosts = Array.isArray(realisticDataset?.hosts) ? realisticDataset.hosts : []
    return templateHosts.map((row, idx) => {
        const templateId = Number(row.id || idx + 1)
        const nome = String(row.nome ?? '').trim()
        const cognome = String(row.cognome ?? '').trim()
        return {
            id: `__realistic__host-${templateId}`,
            codiceInterno: String(row.codiceInterno || `OSP-${String(templateId).padStart(3, '0')}`),
            iniziali: `${nome?.[0] ?? ''}${cognome?.[0] ?? ''}`.toUpperCase(),
            nome,
            cognome,
            luogoNascita: '',
            dataNascita: null,
            sesso: '',
            codiceFiscale: '',
            patologie: normalizePatologie(row.patologie),
            roomId: row.roomId ? `__realistic__room-${Number(row.roomId)}` : null,
            bedId: row.bedId ? `__realistic__bed-${Number(row.bedId)}` : null,
            attivo: true,
            updatedAt: now,
            deletedAt: null,
            syncStatus: 'pending',
            _seeded: true,
        }
    })
}

/**
 * Generate realistic drugs from CSV data
 */
function generateRealisticDrugs() {
    const rows = parseCSV(CSV_FARMACI)
    const now = new Date().toISOString()

    return rows.map((row, idx) => ({
        id: `__realistic__drug-${idx + 1}`,
        marca: row.marca || '',
        principioAttivo: row.farmaco || '',
        classeTerapeutica: 'Generico',
        scortaMinima: 10,
        fornitore: 'Fornitore Centrale',
        note: '',
        updatedAt: now,
        deletedAt: null,
        syncStatus: 'pending',
        _seeded: true,
    }))
}

/**
 * Generate rooms and beds from provided JSON dataset
 */
function generateRealisticRoomsAndBeds(now) {
    const templateRooms = Array.isArray(realisticDataset?.rooms) ? realisticDataset.rooms : []
    const templateBeds = Array.isArray(realisticDataset?.beds) ? realisticDataset.beds : []

    const rooms = templateRooms.map((room, idx) => {
        const roomId = Number(room.id || idx + 1)
        return {
            id: `__realistic__room-${roomId}`,
            codice: String(room.codice || `Stanza ${roomId}`),
            descrizione: String(room.descrizione || ''),
            updatedAt: now,
            deletedAt: null,
            syncStatus: 'pending',
            _seeded: true,
        }
    })

    const beds = templateBeds.map((bed, idx) => {
        const bedId = Number(bed.id || idx + 1)
        return {
            id: `__realistic__bed-${bedId}`,
            roomId: `__realistic__room-${Number(bed.roomId)}`,
            numero: Number(bed.numero || 1),
            occupato: Boolean(bed.occupato),
            updatedAt: now,
            deletedAt: null,
            syncStatus: 'pending',
            _seeded: true,
        }
    })

    return { rooms, beds }
}

/**
 * Generate stock batches for all drugs
 */
function generateRealisticStockBatches(drugs) {
    const now = new Date().toISOString()
    const batches = []

    drugs.forEach((drug, idx) => {
        const batchCount = (idx % 3) + 2
        for (let i = 0; i < batchCount; i++) {
            const lotNumber = `LOT${String(idx + 1).padStart(3, '0')}-${String(i + 1).padStart(2, '0')}`
            const scadenzaDate = new Date()
            scadenzaDate.setMonth(scadenzaDate.getMonth() + (3 + i * 2))

            batches.push({
                id: `__realistic__batch-${idx + 1}-${i + 1}`,
                drugId: drug.id,
                nomeCommerciale: `${drug.principioAttivo} - Batch ${lotNumber}`,
                lotto: lotNumber,
                scadenza: scadenzaDate.toISOString().split('T')[0],
                quantita: 500 + Math.floor(Math.random() * 500),
                updatedAt: now,
                deletedAt: null,
                syncStatus: 'pending',
                _seeded: true,
            })
        }
    })

    return batches
}

/**
 * Generate therapies from provided JSON dataset
 */
function generateRealisticTherapies(hosts, drugs, batches, now) {
    const templateTherapies = Array.isArray(realisticDataset?.therapies) ? realisticDataset.therapies : []

    return templateTherapies
        .map((therapy, idx) => {
            const hostId = `__realistic__host-${Number(therapy.hostId)}`
            const host = hosts.find(item => item.id === hostId)
            if (!host || drugs.length === 0) return null

            const drugIdx = ((Number(therapy.drugId) || 1) - 1) % drugs.length
            const safeDrugIdx = drugIdx < 0 ? 0 : drugIdx
            const drug = drugs[safeDrugIdx]
            const associatedBatches = batches.filter(batch => batch.drugId === drug.id)
            const batch = associatedBatches[0] ?? null

            return {
                id: `__realistic__therapy-${Number(therapy.id || idx + 1)}`,
                hostId: host.id,
                drugId: drug.id,
                stockBatchId: batch ? batch.id : null,
                dataInizio: therapy.dataInizio || now.slice(0, 10),
                dataFine: therapy.dataFine || null,
                dosaggio: String(therapy.dosaggio || '1 compressa'),
                frequenza: String(therapy.frequenza || '1 volta/die'),
                notaTerapia: String(therapy.notaTerapia || `Terapia per ${host.patologie || 'patologia'}`),
                attiva: !therapy.dataFine,
                updatedAt: now,
                deletedAt: null,
                syncStatus: 'pending',
                _seeded: true,
            }
        })
        .filter(Boolean)
}

/**
 * Generate complete realistic seed data bundle
 */
export function generateRealisticSeedData() {
    const now = new Date().toISOString()
    const hosts = generateRealisticHosts(now)
    const drugs = generateRealisticDrugs()
    const { rooms, beds } = generateRealisticRoomsAndBeds(now)
    const batches = generateRealisticStockBatches(drugs)
    const therapies = generateRealisticTherapies(hosts, drugs, batches, now)

    return {
        hosts,
        rooms,
        beds,
        drugs,
        stockBatches: batches,
        therapies,
    }
}

/**
 * Load realistic seed data into database
 */
export async function loadRealisticSeedData(options = {}) {
    const { allowInProduction = false } = options
    const SEED_ENABLED = import.meta.env.DEV || import.meta.env.VITE_SEED_DATA === '1' || allowInProduction

    if (!SEED_ENABLED) {
        throw new Error('Dati realistici non disponibili. Modalità DEV richiesta.')
    }

    const bundle = generateRealisticSeedData()
    const availableStores = await getAvailableStoreNames(REALISTIC_SEED_STORE_NAMES)
    const transactionTables = [
        availableStores.has('rooms') ? db.rooms : null,
        availableStores.has('beds') ? db.beds : null,
        availableStores.has('hosts') ? db.hosts : null,
        availableStores.has('drugs') ? db.drugs : null,
        availableStores.has('stockBatches') ? db.stockBatches : null,
        availableStores.has('therapies') ? db.therapies : null,
    ].filter(Boolean)

    if (transactionTables.length > 0) {
        await db.transaction('rw', transactionTables, async () => {
            if (availableStores.has('rooms')) for (const record of bundle.rooms) await db.rooms.put(record)
            if (availableStores.has('beds')) for (const record of bundle.beds) await db.beds.put(record)
            if (availableStores.has('hosts')) for (const record of bundle.hosts) await db.hosts.put(record)
            if (availableStores.has('drugs')) for (const record of bundle.drugs) await db.drugs.put(record)
            if (availableStores.has('stockBatches')) for (const record of bundle.stockBatches) await db.stockBatches.put(record)
            if (availableStores.has('therapies')) for (const record of bundle.therapies) await db.therapies.put(record)
        })
    }

    const manifest = {
        rooms: availableStores.has('rooms') ? bundle.rooms.map(r => r.id) : [],
        beds: availableStores.has('beds') ? bundle.beds.map(r => r.id) : [],
        hosts: availableStores.has('hosts') ? bundle.hosts.map(r => r.id) : [],
        drugs: availableStores.has('drugs') ? bundle.drugs.map(r => r.id) : [],
        stockBatches: availableStores.has('stockBatches') ? bundle.stockBatches.map(r => r.id) : [],
        therapies: availableStores.has('therapies') ? bundle.therapies.map(r => r.id) : [],
    }

    await setSetting(REALISTIC_SEED_KEY, manifest)

    return {
        rooms: bundle.rooms.length,
        beds: bundle.beds.length,
        hosts: bundle.hosts.length,
        drugs: bundle.drugs.length,
        stockBatches: bundle.stockBatches.length,
        therapies: bundle.therapies.length,
    }
}

/**
 * Clear realistic seed data from database
 */
export async function clearRealisticSeedData(options = {}) {
    const manifest = await getRealisticSeedManifest()
    if (!manifest) return { cleared: false, reason: 'nessun dato realistico trovato' }

    const availableStores = await getAvailableStoreNames(REALISTIC_SEED_STORE_NAMES)
    const transactionTables = [
        availableStores.has('rooms') ? db.rooms : null,
        availableStores.has('beds') ? db.beds : null,
        availableStores.has('hosts') ? db.hosts : null,
        availableStores.has('drugs') ? db.drugs : null,
        availableStores.has('stockBatches') ? db.stockBatches : null,
        availableStores.has('therapies') ? db.therapies : null,
    ].filter(Boolean)

    if (transactionTables.length > 0) {
        await db.transaction('rw', transactionTables, async () => {
            if (availableStores.has('rooms')) for (const id of (manifest.rooms ?? [])) await db.rooms.delete(id)
            if (availableStores.has('beds')) for (const id of (manifest.beds ?? [])) await db.beds.delete(id)
            if (availableStores.has('hosts')) for (const id of (manifest.hosts ?? [])) await db.hosts.delete(id)
            if (availableStores.has('drugs')) for (const id of (manifest.drugs ?? [])) await db.drugs.delete(id)
            if (availableStores.has('stockBatches')) for (const id of (manifest.stockBatches ?? [])) await db.stockBatches.delete(id)
            if (availableStores.has('therapies')) for (const id of (manifest.therapies ?? [])) await db.therapies.delete(id)
        })
    }

    await setSetting(REALISTIC_SEED_KEY, null)
    return { cleared: true, tables: Object.keys(manifest) }
}

/**
 * Check if realistic seed data is loaded
 */
export async function isRealisticSeedDataLoaded() {
    const manifest = await getRealisticSeedManifest()
    return Boolean(manifest)
}

export default {
    generateRealisticSeedData,
    loadRealisticSeedData,
    clearRealisticSeedData,
    isRealisticSeedDataLoaded,
}
