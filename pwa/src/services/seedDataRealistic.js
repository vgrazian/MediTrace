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

const DATASET_REQUIRED_ARRAY_KEYS = ['rooms', 'beds', 'hosts', 'therapies']
const DATASET_REQUIRED_FIELDS = {
    rooms: ['id', 'codice', 'descrizione'],
    beds: ['id', 'roomId', 'numero', 'occupato'],
    hosts: ['id', 'codiceInterno', 'nome', 'cognome', 'patologie', 'roomId', 'bedId'],
    therapies: ['id', 'hostId', 'drugId', 'dataInizio', 'dosaggio', 'frequenza'],
}

function isPlainObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function isMissingRequiredValue(value) {
    if (value === null || value === undefined) return true
    if (typeof value === 'string') return value.trim() === ''
    return false
}

function toSafeNumericId(value) {
    const parsed = Number(value)
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

/**
 * Transform frequency string to daily dose count.
 * Supports: "1 volta/die", "2 volte/die", "ogni 8 ore", "ogni 6 ore", "al bisogno"
 */
function frequencyToCount(frequenza) {
    if (!frequenza) return null
    const freq = String(frequenza).toLowerCase().trim()

    if (freq.includes('1 volta') || freq.includes('1volta')) return 1
    if (freq.includes('2 volte') || freq.includes('2volte')) return 2
    if (freq.includes('3 volte') || freq.includes('3volte')) return 3
    if (freq.includes('4 volte') || freq.includes('4volte')) return 4
    if (freq.includes('ogni 4 ore')) return 6
    if (freq.includes('ogni 6 ore')) return 4
    if (freq.includes('ogni 8 ore')) return 3
    if (freq.includes('ogni 12 ore')) return 2
    if (freq.includes('al bisogno')) return null

    return null
}

/**
 * Transform dose string to numeric value.
 * Supports: "1 compressa", "0.5 compressa", "1 fiala", etc.
 */
function dosageToNumeric(dosaggio) {
    if (!dosaggio) return null
    const dose = String(dosaggio).toLowerCase().trim()

    if (dose.includes('0.5') || dose.includes('mezza')) return 0.5
    if (dose === '1 compressa' || dose === '1 fiala' || dose === '1 bustina') return 1
    if (dose === '2 compresse' || dose === '2 fiale') return 2
    if (dose === '3 compresse') return 3

    const match = dose.match(/[\d.]+/)
    if (match) return Number(match[0])

    return 1
}

export function validateRealisticDataset(dataset = realisticDataset) {
    const errors = []

    if (!isPlainObject(dataset)) {
        return { valid: false, errors: ['dataset deve essere un oggetto JSON'] }
    }

    for (const collectionKey of DATASET_REQUIRED_ARRAY_KEYS) {
        if (!Array.isArray(dataset[collectionKey])) {
            errors.push(`${collectionKey} deve essere un array`)
            continue
        }
        if (dataset[collectionKey].length === 0) {
            errors.push(`${collectionKey} non puo' essere vuoto`)
            continue
        }

        for (const [idx, row] of dataset[collectionKey].entries()) {
            if (!isPlainObject(row)) {
                errors.push(`${collectionKey}[${idx}] deve essere un oggetto`)
                continue
            }

            const requiredFields = DATASET_REQUIRED_FIELDS[collectionKey] ?? []
            for (const field of requiredFields) {
                if (isMissingRequiredValue(row[field])) {
                    errors.push(`${collectionKey}[${idx}].${field} e' obbligatorio`)
                }
            }
        }
    }

    const roomIds = new Set((Array.isArray(dataset.rooms) ? dataset.rooms : [])
        .map(row => toSafeNumericId(row?.id))
        .filter(Boolean))

    const bedIds = new Set((Array.isArray(dataset.beds) ? dataset.beds : [])
        .map(row => toSafeNumericId(row?.id))
        .filter(Boolean))

    const hostIds = new Set((Array.isArray(dataset.hosts) ? dataset.hosts : [])
        .map(row => toSafeNumericId(row?.id))
        .filter(Boolean))

    for (const [idx, bed] of (Array.isArray(dataset.beds) ? dataset.beds : []).entries()) {
        const roomId = toSafeNumericId(bed?.roomId)
        if (roomId === null || !roomIds.has(roomId)) {
            errors.push(`beds[${idx}].roomId deve riferire una room esistente`)
        }
    }

    for (const [idx, host] of (Array.isArray(dataset.hosts) ? dataset.hosts : []).entries()) {
        const roomId = toSafeNumericId(host?.roomId)
        const bedId = toSafeNumericId(host?.bedId)
        if (roomId === null || !roomIds.has(roomId)) {
            errors.push(`hosts[${idx}].roomId deve riferire una room esistente`)
        }
        if (bedId === null || !bedIds.has(bedId)) {
            errors.push(`hosts[${idx}].bedId deve riferire un letto esistente`)
        }
    }

    for (const [idx, therapy] of (Array.isArray(dataset.therapies) ? dataset.therapies : []).entries()) {
        const hostId = toSafeNumericId(therapy?.hostId)
        const drugId = toSafeNumericId(therapy?.drugId)
        if (hostId === null || !hostIds.has(hostId)) {
            errors.push(`therapies[${idx}].hostId deve riferire un host esistente`)
        }
        if (drugId === null) {
            errors.push(`therapies[${idx}].drugId deve essere un numero intero positivo`)
        }
    }

    return { valid: errors.length === 0, errors }
}

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

            // Transform frequency to numeric count
            const somministrazioniGiornaliere = frequencyToCount(therapy.frequenza) ?? 1
            // Transform dosage to numeric value
            const dosePerSomministrazione = dosageToNumeric(therapy.dosaggio) ?? 1
            // Calculate weekly consumption
            const consumoMedioSettimanale = dosePerSomministrazione * somministrazioniGiornaliere * 7

            return {
                id: `__realistic__therapy-${Number(therapy.id || idx + 1)}`,
                hostId: host.id,
                drugId: drug.id,
                stockBatchId: batch ? batch.id : null,
                dataInizio: therapy.dataInizio || now.slice(0, 10),
                dataFine: therapy.dataFine || null,
                dosePerSomministrazione,
                unitaDose: 'compressa',
                somministrazioniGiornaliere,
                consumoMedioSettimanale,
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
    const validation = validateRealisticDataset(realisticDataset)
    if (!validation.valid) {
        const details = validation.errors.map(error => `- ${error}`).join('\n')
        throw new Error(`Dataset realistico non valido:\n${details}`)
    }

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
    validateRealisticDataset,
    loadRealisticSeedData,
    clearRealisticSeedData,
    isRealisticSeedDataLoaded,
}
