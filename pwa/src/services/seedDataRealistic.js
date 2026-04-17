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
import { upsertDemoAuthUsers, clearDemoAuthUsers } from './seedAuthUsers.js'

const REALISTIC_SEED_KEY = '_realisticSeedDataManifest'
const REALISTIC_SEED_PREFIX = '__realistic__'
const REALISTIC_SEED_STORE_NAMES = ['rooms', 'beds', 'hosts', 'drugs', 'stockBatches', 'therapies', 'movements', 'reminders', 'activityLog']

const TARGET_ROOM_IDS = [1, 2]
const TARGET_HOST_COUNT = 12
const TARGET_ROOM_DISTRIBUTION = [
    { roomId: 1, roomCode: 'Il Rifugio', hostCount: 5 },
    { roomId: 2, roomCode: 'Via Bellani', hostCount: 7 },
]
const TARGET_DRUG_COUNT = 12
const TREND_PREVIOUS_WEEKS = 4
const REMINDER_LOOKAHEAD_DAYS = 7

const REALISTIC_HOST_IDENTITIES = [
    { nome: 'Elisa', cognome: 'Montelupo' },
    { nome: 'Marco', cognome: 'Valdieri' },
    { nome: 'Nadia', cognome: 'Serafini' },
    { nome: 'Pietro', cognome: 'Campolmi' },
    { nome: 'Giulia', cognome: 'Ventresca' },
    { nome: 'José', cognome: 'Álvarez' },
    { nome: 'Dario', cognome: 'Nervetti' },
    { nome: 'Chiara', cognome: 'Roventi' },
    { nome: 'Zoë', cognome: 'Serralta' },
    { nome: 'Marta', cognome: 'Bellinati' },
]

const THERAPY_DETAIL_NOTES = [
    'A stomaco vuoto prima del pasto',
    'A stomaco pieno dopo il pranzo',
    'Con abbondante acqua',
    'Somministrare dopo controllo pressione',
    'Preferibilmente entro le 09:00',
    'Diluire in acqua e monitorare tolleranza',
]

const PATHOLOGY_THERAPY_LABELS = [
    { match: /(ipertension|cardi|scompenso|pressione)/i, label: 'Controllo cardiovascolare' },
    { match: /(bronco|asma|copd|respirat)/i, label: 'Supporto respiratorio' },
    { match: /(diabet|glicem)/i, label: 'Controllo glicemico' },
    { match: /(alzheimer|demenza|cognitiv)/i, label: 'Supporto cognitivo' },
    { match: /(parkinson|neurolog|neuropat)/i, label: 'Stabilizzazione neurologica' },
    { match: /(dolore|algic|oncolog)/i, label: 'Terapia analgesica' },
    { match: /(insufficienza renale|renale|edema)/i, label: 'Bilancio idro-elettrolitico' },
]

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

    const [rooms, beds, hosts, drugs, stockBatches, therapies, movements, reminders, activityLog] = await Promise.all([
        findRealisticSeedIds(db.rooms),
        findRealisticSeedIds(db.beds),
        findRealisticSeedIds(db.hosts),
        findRealisticSeedIds(db.drugs),
        findRealisticSeedIds(db.stockBatches),
        findRealisticSeedIds(db.therapies),
        findRealisticSeedIds(db.movements),
        findRealisticSeedIds(db.reminders),
        findRealisticSeedActivityLogIds(),
    ])

    const fallbackManifest = { rooms, beds, hosts, drugs, stockBatches, therapies, movements, reminders, activityLog }
    const hasSeedRows = Object.values(fallbackManifest).some(ids => ids.length > 0)
    return hasSeedRows ? fallbackManifest : null
}

async function findRealisticSeedActivityLogIds() {
    if (!db.activityLog || typeof db.activityLog.toArray !== 'function') return []
    const rows = await db.activityLog.toArray()
    return rows
        .filter((row) => {
            const entityId = String(row?.entityId || '')
            return entityId.startsWith(REALISTIC_SEED_PREFIX) || row?.seedTag === REALISTIC_SEED_PREFIX
        })
        .map(row => row?.id)
        .filter(id => id !== null && id !== undefined)
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

const FALLBACK_FIRST_NAMES = [
    'Alberto', 'Beatrice', 'Carlo', 'Daniela', 'Enrico', 'Francesca', 'Giorgio', 'Helena',
    'Ivano', 'Lidia', 'Marco', 'Nadia', 'Omar', 'Paola', 'Renato', 'Silvia',
]

const FALLBACK_LAST_NAMES = [
    'Conti', 'Moretti', 'Ferrari', 'Galli', 'Fontana', 'Mariani', 'De Luca', 'Caruso',
    'Lombardi', 'Rinaldi', 'Longo', 'Bianco', 'Mancini', 'Leone', 'Barbieri', 'Pellegrini',
]

function capitalizeHumanName(value) {
    const raw = String(value ?? '').trim().toLowerCase()
    if (!raw) return ''
    return raw
        .split(/\s+/)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ')
}

function pickUniqueHostName({ templateNome, templateCognome, hostIndex, usedNames }) {
    const baseNome = capitalizeHumanName(templateNome)
    const baseCognome = capitalizeHumanName(templateCognome)
    let nome = capitalizeHumanName(templateNome)
    let cognome = capitalizeHumanName(templateCognome)

    if (!nome) nome = FALLBACK_FIRST_NAMES[hostIndex % FALLBACK_FIRST_NAMES.length]
    if (!cognome) cognome = FALLBACK_LAST_NAMES[hostIndex % FALLBACK_LAST_NAMES.length]

    let candidate = `${nome} ${cognome}`.toLowerCase()
    let attempt = 0
    while (usedNames.has(candidate)) {
        const altFirst = FALLBACK_FIRST_NAMES[(hostIndex + attempt) % FALLBACK_FIRST_NAMES.length]
        const altLast = FALLBACK_LAST_NAMES[(hostIndex * 3 + attempt) % FALLBACK_LAST_NAMES.length]
        if (attempt % 2 === 0) {
            nome = altFirst
        } else {
            cognome = altLast
        }
        // If fallback rotations are exhausted, add a deterministic numeric suffix.
        if (attempt > (FALLBACK_FIRST_NAMES.length * FALLBACK_LAST_NAMES.length)) {
            nome = baseNome || altFirst
            cognome = `${baseCognome || altLast} ${attempt - 255}`
        }
        candidate = `${nome} ${cognome}`.toLowerCase()
        attempt += 1
    }

    usedNames.add(candidate)
    return { nome, cognome }
}

function buildAvailableBedsByRoom(bedsById = new Map()) {
    const bedsByRoom = new Map()
    for (const bed of bedsById.values()) {
        if (!bed?.id || !bed?.roomId) continue
        const list = bedsByRoom.get(bed.roomId) ?? []
        list.push(bed)
        bedsByRoom.set(bed.roomId, list)
    }

    for (const [roomId, beds] of bedsByRoom.entries()) {
        beds.sort((a, b) => Number(a?.numero || 0) - Number(b?.numero || 0))
        bedsByRoom.set(roomId, beds)
    }

    return bedsByRoom
}

function pickNextAvailableBed({ preferredRoomId, bedsByRoom, allBeds, usedBedIds }) {
    if (preferredRoomId) {
        const roomBeds = bedsByRoom.get(preferredRoomId) ?? []
        const freeRoomBed = roomBeds.find(bed => bed?.id && !usedBedIds.has(bed.id))
        if (freeRoomBed) return freeRoomBed
    }

    return allBeds.find(bed => bed?.id && !usedBedIds.has(bed.id)) ?? null
}

function getPlannedRoomIdForHostIndex(hostIndex) {
    let runningTotal = 0
    for (const roomPlan of TARGET_ROOM_DISTRIBUTION) {
        runningTotal += roomPlan.hostCount
        if (hostIndex < runningTotal) return roomPlan.roomId
    }

    const fallback = TARGET_ROOM_DISTRIBUTION[TARGET_ROOM_DISTRIBUTION.length - 1]
    return fallback?.roomId ?? null
}

/**
 * Generate realistic hosts from provided JSON dataset
 */
function generateRealisticHosts(now, { roomsById = new Map(), bedsById = new Map() } = {}) {
    const templateHosts = (Array.isArray(realisticDataset?.hosts) ? realisticDataset.hosts : [])
        .slice(0, TARGET_HOST_COUNT)
    const usedNames = new Set()
    const usedBedIds = new Set()
    const bedsByRoom = buildAvailableBedsByRoom(bedsById)
    const allBeds = Array.from(bedsById.values())

    return templateHosts.map((row, idx) => {
        const templateId = Number(row.id || idx + 1)
        const identity = REALISTIC_HOST_IDENTITIES[idx] || {
            nome: `Operatore${idx + 1}`,
            cognome: `Ospite${idx + 1}`,
        }
        const { nome, cognome } = pickUniqueHostName({
            templateNome: identity.nome,
            templateCognome: identity.cognome,
            hostIndex: idx,
            usedNames,
        })
        const plannedRoomNumericId = getPlannedRoomIdForHostIndex(idx)
        const preferredRoomId = plannedRoomNumericId ? `__realistic__room-${plannedRoomNumericId}` : null
        const preferredBedId = null

        let bedId = preferredBedId && bedsById.has(preferredBedId) && !usedBedIds.has(preferredBedId)
            ? preferredBedId
            : null

        if (!bedId) {
            const fallbackBed = pickNextAvailableBed({
                preferredRoomId,
                bedsByRoom,
                allBeds,
                usedBedIds,
            })
            bedId = fallbackBed?.id ?? null
        }

        if (bedId) {
            usedBedIds.add(bedId)
        }

        const bed = bedId ? bedsById.get(bedId) : null
        const roomId = bed?.roomId || preferredRoomId || null
        const room = roomId ? roomsById.get(roomId) : null

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
            roomId,
            bedId,
            stanza: room?.codice || '',
            letto: bed ? String(bed.numero || '') : '',
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
    const rows = parseCSV(CSV_FARMACI).slice(0, TARGET_DRUG_COUNT)
    const now = new Date().toISOString()

    return rows.map((row, idx) => ({
        id: `__realistic__drug-${idx + 1}`,
        nomeFarmaco: `${row.marca || 'N.D.'} - ${row.farmaco || ''}`.trim(),
        marca: row.marca || '',
        principioAttivo: row.farmaco || '',
        classeTerapeutica: 'Generico',
        scortaMinima: 8 + (idx % 5),
        sogliaGiorniAutonomia: 15 + (idx % 20),
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

    const selectedRooms = templateRooms.filter(room => TARGET_ROOM_IDS.includes(Number(room.id)))

    const rooms = selectedRooms.map((room, idx) => {
        const roomId = Number(room.id || idx + 1)
        const roomPlan = TARGET_ROOM_DISTRIBUTION.find(item => item.roomId === roomId)
        return {
            id: `__realistic__room-${roomId}`,
            codice: String(roomPlan?.roomCode || room.codice || `Stanza ${roomId}`),
            descrizione: String(room.descrizione || ''),
            metadata: {
                maxOspiti: Number(roomPlan?.hostCount || 10),
            },
            updatedAt: now,
            deletedAt: null,
            syncStatus: 'pending',
            _seeded: true,
        }
    })

    const beds = TARGET_ROOM_DISTRIBUTION.flatMap((roomPlan) => {
        return Array.from({ length: roomPlan.hostCount }, (_, idx) => ({
            id: `__realistic__bed-${roomPlan.roomId}-${idx + 1}`,
            roomId: `__realistic__room-${roomPlan.roomId}`,
            numero: idx + 1,
            occupato: true,
            updatedAt: now,
            deletedAt: null,
            syncStatus: 'pending',
            _seeded: true,
        }))
    })

    return { rooms, beds }
}

function weekKeyFromDate(dateValue) {
    const date = new Date(dateValue)
    if (Number.isNaN(date.getTime())) return ''
    const tmp = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
    const day = tmp.getUTCDay() || 7
    tmp.setUTCDate(tmp.getUTCDate() + 4 - day)
    const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1))
    const weekNo = Math.ceil((((tmp - yearStart) / 86400000) + 1) / 7)
    return `${tmp.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`
}

function isoDateDaysAgo(now, daysAgo, hour = 8, minute = 0) {
    const ref = new Date(now)
    ref.setDate(ref.getDate() - daysAgo)
    ref.setHours(hour, minute, 0, 0)
    return ref.toISOString()
}

function isoDateDaysFromNow(now, daysFromNow, hour = 8, minute = 0) {
    const ref = new Date(now)
    ref.setDate(ref.getDate() + daysFromNow)
    ref.setHours(hour, minute, 0, 0)
    return ref.toISOString()
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

            // Ensure first 3 drugs have low stock (in esaurimento)
            let quantitaAttuale, quantitaIniziale, consumoStimato, sogliaRiordino
            if (idx < 3) {
                // Low stock: quantita < soglia to trigger urgent reorder
                quantitaIniziale = 20 + (idx * 5)
                consumoStimato = 10 + idx * 3
                sogliaRiordino = 15 + (idx * 2)
                quantitaAttuale = 3 + (idx % 4) // Very low: 3-6 units
            } else {
                // Normal stock for other drugs
                quantitaIniziale = 70 + (idx * 9) + (i * 14)
                consumoStimato = 10 + ((idx * 5 + i * 7) % 40)
                sogliaRiordino = 8 + ((idx + i) % 9)
                quantitaAttuale = Math.max(4, quantitaIniziale - consumoStimato)
            }

            batches.push({
                id: `__realistic__batch-${idx + 1}-${i + 1}`,
                drugId: drug.id,
                nomeCommerciale: `${drug.principioAttivo} - Batch ${lotNumber}`,
                dosaggio: `${(idx % 4 + 1) * 100} mg`,
                unitaMisura: 'cpr',
                lotto: lotNumber,
                scadenza: scadenzaDate.toISOString().split('T')[0],
                quantitaIniziale,
                quantitaAttuale,
                sogliaRiordino,
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
    if (hosts.length === 0 || drugs.length === 0) return []

    const baseSlots = [
        [0, 0, 1, 2], [1, 1, 1, 1], [2, 2, 1.5, 2], [3, 3, 2, 2], [4, 4, 1, 1],
        [5, 5, 1, 2], [6, 6, 0.5, 3], [7, 7, 1, 1], [8, 8, 1, 2],
        [0, 9, 1, 1], [2, 10, 1, 1], [4, 11, 1, 1], [6, 2, 1, 2], [8, 3, 1, 1],
        [1, 4, 2, 1], [3, 6, 1, 3],
    ]

    return baseSlots.map((slot, idx) => {
        const [hostIdx, drugIdx, dose, freq] = slot
        const host = hosts[hostIdx % hosts.length]
        const drug = drugs[drugIdx % drugs.length]
        const associatedBatches = batches.filter(batch => batch.drugId === drug.id)
        const batch = associatedBatches[0] ?? null
        const dosePerSomministrazione = Number(dose)
        const somministrazioniGiornaliere = Number(freq)
        const consumoMedioSettimanale = dosePerSomministrazione * somministrazioniGiornaliere * 7
        const detailNote = THERAPY_DETAIL_NOTES[idx % THERAPY_DETAIL_NOTES.length]
        const hostPatologie = String(host?.patologie || '').trim()
        const pathologyLabel = PATHOLOGY_THERAPY_LABELS.find((item) => item.match.test(hostPatologie))?.label || 'Piano terapeutico personalizzato'
        const therapyLabel = `${pathologyLabel} - ${drug.principioAttivo}`

        return {
            id: `__realistic__therapy-${idx + 1}`,
            hostId: host.id,
            drugId: drug.id,
            stockBatchId: batch ? batch.id : null,
            dataInizio: isoDateDaysAgo(now, 30 - idx, 8, 0),
            dataFine: null,
            dosePerSomministrazione,
            unitaDose: 'compressa',
            somministrazioniGiornaliere,
            consumoMedioSettimanale,
            dosaggio: `${dosePerSomministrazione} compressa`,
            frequenza: `${somministrazioniGiornaliere} volta/die`,
            nomeTerapia: therapyLabel,
            notaTerapia: detailNote,
            note: `${therapyLabel}. ${detailNote}`,
            attiva: true,
            updatedAt: now,
            deletedAt: null,
            syncStatus: 'pending',
            _seeded: true,
        }
    })
}

function generateRealisticMovements(therapies, batches, now) {
    if (therapies.length === 0) return []

    const batchById = new Map(batches.map(batch => [batch.id, batch]))
    const movements = []

    let movementId = 1
    const weeklyOffsets = Array.from({ length: TREND_PREVIOUS_WEEKS + 1 }, (_, idx) => idx)
    const weeklyTypePattern = ['SCARICO', 'SOMMINISTRAZIONE', 'SCARICO', 'CONSUMO']

    for (let i = 0; i < therapies.length; i += 1) {
        const therapy = therapies[i]
        const batch = batchById.get(therapy.stockBatchId)
        const baseQty = Math.max(1, Number(therapy.dosePerSomministrazione || 1) * Number(therapy.somministrazioniGiornaliere || 1))

        for (const weekOffset of weeklyOffsets) {
            const performedAt = isoDateDaysAgo(
                now,
                (weekOffset * 7) + (i % 3),
                8 + ((i + weekOffset) % 4),
                10 + ((i + weekOffset) % 40),
            )
            const qty = Math.max(1, Number((baseQty * (1 + (weekOffset * 0.08))).toFixed(2)))
            const tipoMovimento = weeklyTypePattern[(i + weekOffset) % weeklyTypePattern.length]

            movements.push({
                id: `__realistic__mov-${movementId}`,
                stockBatchId: therapy.stockBatchId || null,
                drugId: therapy.drugId,
                hostId: therapy.hostId,
                therapyId: therapy.id,
                tipoMovimento,
                quantita: qty,
                unitaMisura: therapy.unitaDose || 'compressa',
                causale: 'Consumo terapeutico settimanale',
                dataMovimento: performedAt,
                settimanaRiferimento: weekKeyFromDate(performedAt),
                operatore: `op-demo-${((i + weekOffset) % 3) + 1}`,
                source: 'therapy',
                note: `Somministrazione ${batch?.nomeCommerciale || 'farmaco'}`,
                updatedAt: performedAt,
                deletedAt: null,
                syncStatus: 'pending',
                _seeded: true,
            })
            movementId += 1
        }
    }

    for (let i = 0; i < 8 && i < batches.length; i += 1) {
        const recordedAt = isoDateDaysAgo(now, (i % (TREND_PREVIOUS_WEEKS + 1)) * 7 + (6 - (i % 5)), 10, 30)
        const batch = batches[i]
        movements.push({
            id: `__realistic__mov-${movementId}`,
            stockBatchId: batch.id,
            drugId: batch.drugId,
            hostId: null,
            therapyId: null,
            tipoMovimento: 'CARICO',
            quantita: 20 + (i * 5),
            unitaMisura: batch.unitaMisura || 'cpr',
            causale: 'Reintegro magazzino',
            dataMovimento: recordedAt,
            settimanaRiferimento: weekKeyFromDate(recordedAt),
            operatore: `op-demo-${(i % 3) + 1}`,
            source: 'manual',
            note: 'Consegna settimanale',
            updatedAt: recordedAt,
            deletedAt: null,
            syncStatus: 'pending',
            _seeded: true,
        })
        movementId += 1
    }

    return movements
}

function generateRealisticReminders(therapies, now) {
    if (therapies.length === 0) return []

    const reminders = []

    let reminderId = 1
    const timeSlotsByFrequency = {
        1: [8],
        2: [8, 20],
        3: [8, 14, 20],
    }

    for (let i = 0; i < therapies.length; i += 1) {
        const therapy = therapies[i]
        const freq = Math.max(1, Math.min(3, Number(therapy.somministrazioniGiornaliere || 1)))
        const baseSlots = timeSlotsByFrequency[freq] ?? [8]
        const slots = baseSlots.map(hour => (hour + (i % 2)) % 24)

        for (let dayOffset = 0; dayOffset <= REMINDER_LOOKAHEAD_DAYS; dayOffset += 1) {
            for (let slotIndex = 0; slotIndex < slots.length; slotIndex += 1) {
                const scheduledAt = isoDateDaysFromNow(now, dayOffset, slots[slotIndex], (i * 7 + slotIndex * 10) % 60)
                let stato = 'DA_ESEGUIRE'

                if (dayOffset === 0) {
                    const stateCycle = ['ESEGUITO', 'DA_ESEGUIRE', 'POSTICIPATO', 'SALTATO']
                    stato = stateCycle[(i + slotIndex) % stateCycle.length]
                }

                reminders.push({
                    id: `__realistic__rem-${reminderId}`,
                    hostId: therapy.hostId,
                    therapyId: therapy.id,
                    drugId: therapy.drugId,
                    scheduledAt,
                    stato,
                    eseguitoAt: stato === 'ESEGUITO' ? isoDateDaysFromNow(now, 0, slots[slotIndex], ((i + slotIndex) % 40) + 5) : null,
                    operatore: stato === 'ESEGUITO' || stato === 'SALTATO' ? `op-demo-${((i + slotIndex) % 3) + 1}` : null,
                    note: therapy.note || '',
                    updatedAt: scheduledAt,
                    deletedAt: null,
                    syncStatus: 'pending',
                    _seeded: true,
                })
                reminderId += 1
            }
        }
    }

    return reminders
}

function generateRealisticAuditEvents({ rooms, beds, hosts, drugs, stockBatches, therapies, movements, reminders }) {
    const events = []
    const operators = ['admin', 'operatore1', 'operatore2', 'operatore3']
    const now = new Date()

    const pushEvent = ({ entityType, entityId, action, operatorId, ts }) => {
        events.push({
            entityType,
            entityId,
            action,
            deviceId: 'seed-device-demo',
            operatorId,
            ts,
            seedTag: REALISTIC_SEED_PREFIX,
        })
    }

    rooms.forEach((item, idx) => {
        pushEvent({
            entityType: 'rooms',
            entityId: item.id,
            action: 'room_created',
            operatorId: operators[idx % operators.length],
            ts: isoDateDaysAgo(now, 8 - (idx % 5), 9, 10 + idx),
        })
    })

    beds.slice(0, hosts.length).forEach((item, idx) => {
        pushEvent({
            entityType: 'beds',
            entityId: item.id,
            action: 'bed_created',
            operatorId: operators[(idx + 1) % operators.length],
            ts: isoDateDaysAgo(now, 8 - (idx % 5), 9, 25 + idx),
        })
    })

    hosts.forEach((item, idx) => {
        pushEvent({
            entityType: 'hosts',
            entityId: item.id,
            action: 'host_updated',
            operatorId: operators[(idx + 2) % operators.length],
            ts: isoDateDaysAgo(now, 7 - (idx % 6), 10, 5 + idx),
        })
    })

    drugs.slice(0, 8).forEach((item, idx) => {
        pushEvent({
            entityType: 'drugs',
            entityId: item.id,
            action: idx % 2 === 0 ? 'drug_created' : 'drug_updated',
            operatorId: operators[(idx + 3) % operators.length],
            ts: isoDateDaysAgo(now, 6 - (idx % 5), 10, 35 + idx),
        })
    })

    stockBatches.slice(0, 10).forEach((item, idx) => {
        pushEvent({
            entityType: 'stockBatches',
            entityId: item.id,
            action: idx % 3 === 0 ? 'stock_batch_created' : 'stock_batch_updated',
            operatorId: operators[idx % operators.length],
            ts: isoDateDaysAgo(now, 6 - (idx % 5), 11, idx),
        })
    })

    therapies.forEach((item, idx) => {
        pushEvent({
            entityType: 'therapies',
            entityId: item.id,
            action: idx % 4 === 0 ? 'therapy_updated' : 'therapy_created',
            operatorId: operators[(idx + 1) % operators.length],
            ts: isoDateDaysAgo(now, idx % 7, 12, idx),
        })
    })

    movements.slice(0, 18).forEach((item, idx) => {
        pushEvent({
            entityType: 'movements',
            entityId: item.id,
            action: 'movement_recorded',
            operatorId: operators[(idx + 2) % operators.length],
            ts: item.dataMovimento || isoDateDaysAgo(now, idx % 7, 13, idx),
        })
    })

    reminders.slice(0, 22).forEach((item, idx) => {
        const statusAction = {
            ESEGUITO: 'reminder_eseguito',
            SALTATO: 'reminder_saltato',
            POSTICIPATO: 'reminder_posticipato',
            DA_ESEGUIRE: 'reminder_pending',
        }
        pushEvent({
            entityType: 'reminders',
            entityId: item.id,
            action: statusAction[item.stato] || 'reminder_pending',
            operatorId: item.operatore || operators[(idx + 3) % operators.length],
            ts: item.updatedAt || item.scheduledAt || isoDateDaysAgo(now, idx % 7, 14, idx),
        })
    })

    return events
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
    const { rooms, beds } = generateRealisticRoomsAndBeds(now)
    const roomsById = new Map(rooms.map(room => [room.id, room]))
    const bedsById = new Map(beds.map(bed => [bed.id, bed]))
    const hosts = generateRealisticHosts(now, { roomsById, bedsById })
    const drugs = generateRealisticDrugs()
    const batches = generateRealisticStockBatches(drugs)
    const therapies = generateRealisticTherapies(hosts, drugs, batches, now)
    const movements = generateRealisticMovements(therapies, batches, now)
    const reminders = generateRealisticReminders(therapies, now)
    const activityLog = generateRealisticAuditEvents({
        rooms,
        beds,
        hosts,
        drugs,
        stockBatches: batches,
        therapies,
        movements,
        reminders,
    })

    return {
        hosts,
        rooms,
        beds,
        drugs,
        stockBatches: batches,
        therapies,
        movements,
        reminders,
        activityLog,
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
        availableStores.has('movements') ? db.movements : null,
        availableStores.has('reminders') ? db.reminders : null,
        availableStores.has('activityLog') ? db.activityLog : null,
    ].filter(Boolean)

    const insertedActivityLogIds = []

    if (transactionTables.length > 0) {
        await db.transaction('rw', transactionTables, async () => {
            if (availableStores.has('rooms')) for (const record of bundle.rooms) await db.rooms.put(record)
            if (availableStores.has('beds')) for (const record of bundle.beds) await db.beds.put(record)
            if (availableStores.has('hosts')) for (const record of bundle.hosts) await db.hosts.put(record)
            if (availableStores.has('drugs')) for (const record of bundle.drugs) await db.drugs.put(record)
            if (availableStores.has('stockBatches')) for (const record of bundle.stockBatches) await db.stockBatches.put(record)
            if (availableStores.has('therapies')) for (const record of bundle.therapies) await db.therapies.put(record)
            if (availableStores.has('movements')) for (const record of bundle.movements) await db.movements.put(record)
            if (availableStores.has('reminders')) for (const record of bundle.reminders) await db.reminders.put(record)
            if (availableStores.has('activityLog')) {
                for (const event of bundle.activityLog) {
                    const insertedId = await db.activityLog.add(event)
                    insertedActivityLogIds.push(insertedId)
                }
            }
        })
    }

    const manifest = {
        rooms: availableStores.has('rooms') ? bundle.rooms.map(r => r.id) : [],
        beds: availableStores.has('beds') ? bundle.beds.map(r => r.id) : [],
        hosts: availableStores.has('hosts') ? bundle.hosts.map(r => r.id) : [],
        drugs: availableStores.has('drugs') ? bundle.drugs.map(r => r.id) : [],
        stockBatches: availableStores.has('stockBatches') ? bundle.stockBatches.map(r => r.id) : [],
        therapies: availableStores.has('therapies') ? bundle.therapies.map(r => r.id) : [],
        movements: availableStores.has('movements') ? bundle.movements.map(r => r.id) : [],
        reminders: availableStores.has('reminders') ? bundle.reminders.map(r => r.id) : [],
        activityLog: availableStores.has('activityLog') ? insertedActivityLogIds : [],
    }

    await setSetting(REALISTIC_SEED_KEY, manifest)
    const operatorStats = await upsertDemoAuthUsers()

    return {
        rooms: bundle.rooms.length,
        beds: bundle.beds.length,
        hosts: bundle.hosts.length,
        drugs: bundle.drugs.length,
        stockBatches: bundle.stockBatches.length,
        therapies: bundle.therapies.length,
        movements: bundle.movements.length,
        reminders: bundle.reminders.length,
        activityLog: bundle.activityLog.length,
        operators: operatorStats.total,
    }
}

/**
 * Clear realistic seed data from database
 */
export async function clearRealisticSeedData(options = {}) {
    const manifest = await getRealisticSeedManifest()
    if (!manifest) {
        const authResult = await clearDemoAuthUsers({ preserveAdminUsername: 'admin' })
        return {
            cleared: false,
            reason: 'nessun dato realistico trovato',
            removedOperators: authResult.removed,
        }
    }

    const availableStores = await getAvailableStoreNames(REALISTIC_SEED_STORE_NAMES)
    const transactionTables = [
        availableStores.has('rooms') ? db.rooms : null,
        availableStores.has('beds') ? db.beds : null,
        availableStores.has('hosts') ? db.hosts : null,
        availableStores.has('drugs') ? db.drugs : null,
        availableStores.has('stockBatches') ? db.stockBatches : null,
        availableStores.has('therapies') ? db.therapies : null,
        availableStores.has('movements') ? db.movements : null,
        availableStores.has('reminders') ? db.reminders : null,
        availableStores.has('activityLog') ? db.activityLog : null,
    ].filter(Boolean)

    if (transactionTables.length > 0) {
        await db.transaction('rw', transactionTables, async () => {
            if (availableStores.has('rooms')) for (const id of (manifest.rooms ?? [])) await db.rooms.delete(id)
            if (availableStores.has('beds')) for (const id of (manifest.beds ?? [])) await db.beds.delete(id)
            if (availableStores.has('hosts')) for (const id of (manifest.hosts ?? [])) await db.hosts.delete(id)
            if (availableStores.has('drugs')) for (const id of (manifest.drugs ?? [])) await db.drugs.delete(id)
            if (availableStores.has('stockBatches')) for (const id of (manifest.stockBatches ?? [])) await db.stockBatches.delete(id)
            if (availableStores.has('therapies')) for (const id of (manifest.therapies ?? [])) await db.therapies.delete(id)
            if (availableStores.has('movements')) for (const id of (manifest.movements ?? [])) await db.movements.delete(id)
            if (availableStores.has('reminders')) for (const id of (manifest.reminders ?? [])) await db.reminders.delete(id)
            if (availableStores.has('activityLog')) for (const id of (manifest.activityLog ?? [])) await db.activityLog.delete(id)
        })
    }

    await setSetting(REALISTIC_SEED_KEY, null)
    const authResult = await clearDemoAuthUsers({ preserveAdminUsername: 'admin' })
    return { cleared: true, tables: Object.keys(manifest), removedOperators: authResult.removed }
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
