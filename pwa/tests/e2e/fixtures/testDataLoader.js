import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { randomUUID } from 'crypto'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATASET_PATH = path.resolve(__dirname, '../../../src/data/realisticDataset.json')

function loadRealisticDataset() {
    const raw = fs.readFileSync(DATASET_PATH, 'utf-8')
    const parsed = JSON.parse(raw)
    return {
        rooms: Array.isArray(parsed.rooms) ? parsed.rooms : [],
        beds: Array.isArray(parsed.beds) ? parsed.beds : [],
        hosts: Array.isArray(parsed.hosts) ? parsed.hosts : [],
        therapies: Array.isArray(parsed.therapies) ? parsed.therapies : [],
    }
}

function generateFakeCodiceFiscale(idx) {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    const letters = (start) => alphabet.slice(start, start + 6)
    const year = String((idx % 90) + 10).padStart(2, '0')
    const month = alphabet[(idx * 3) % alphabet.length]
    const day = String(((idx * 7) % 28) + 1).padStart(2, '0')
    const city = alphabet[(idx * 5) % alphabet.length]
    const num = String(((idx * 37) % 900) + 100)
    const check = alphabet[(idx * 11) % alphabet.length]
    return `${letters(idx % 20)}${year}${month}${day}${city}${num}${check}`
}

/**
 * Parse CSV string into array of objects
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

/**
 * Load hosts from CSV fixture
 * Maps: persone_test_sanitarie.csv → db.hosts schema
 */
export function loadHostsFromCSV() {
    const dataset = loadRealisticDataset()
    const rows = dataset.hosts

    return rows.map((row, idx) => {
        const nome = String(row.nome || '').trim()
        const cognome = String(row.cognome || '').trim()
        const patologie = Array.isArray(row.patologie)
            ? row.patologie.filter(Boolean).join(', ')
            : String(row.patologie || '').trim()

        return {
            id: randomUUID(),
            codiceInterno: String(row.codiceInterno || `OSP-${String(idx + 1).padStart(3, '0')}`),
            iniziali: `${nome?.[0] ?? ''}${cognome?.[0] ?? ''}`.toUpperCase(),
            nome,
            cognome,
            luogoNascita: '',
            dataNascita: null,
            sesso: 'M', // Default, adjust if needed
            codiceFiscale: generateFakeCodiceFiscale(idx),
            patologie,
            attivo: true,
            roomId: null,
            bedId: null,
            updatedAt: new Date().toISOString(),
            syncStatus: 'pending',
            _templateHostId: Number(row.id || idx + 1),
        }
    })
}

/**
 * Load drugs from CSV fixture
 * Maps: farmaci_test_sanitari.csv → db.drugs schema
 */
export function loadDrugsFromCSV() {
    const csvPath = path.join(__dirname, 'farmaci_test_sanitari.csv')
    const csvContent = fs.readFileSync(csvPath, 'utf-8')
    const rows = parseCSV(csvContent)

    return rows.map((row, idx) => ({
        id: randomUUID(),
        marca: row.marca || '',
        principioAttivo: row.farmaco || '',
        classeTerapeutica: 'Generico', // Default, adjust if needed
        updatedAt: new Date().toISOString(),
        syncStatus: 'pending',
    }))
}

/**
 * Generate rooms and beds scaled to host count
 * Distribution: 6 rooms x 4 beds + 3 rooms x 2 beds = 30 beds for 30 hosts
 */
export function loadRoomsAndBedsFromHosts(hosts = null) {
    const dataset = loadRealisticDataset()
    const hostCount = hosts ? hosts.length : loadHostsFromCSV().length
    const selectedBeds = dataset.beds.slice(0, hostCount)
    const usedRoomTemplateIds = Array.from(new Set(selectedBeds.map(bed => Number(bed.roomId))))

    const roomIdMap = new Map()
    const rooms = dataset.rooms
        .filter(room => usedRoomTemplateIds.includes(Number(room.id)))
        .map(room => {
            const id = randomUUID()
            roomIdMap.set(Number(room.id), id)
            return {
                id,
                codice: String(room.codice || ''),
                descrizione: String(room.descrizione || ''),
                updatedAt: new Date().toISOString(),
                syncStatus: 'pending',
            }
        })

    const beds = selectedBeds.map(bed => ({
        id: randomUUID(),
        roomId: roomIdMap.get(Number(bed.roomId)),
        numero: Number(bed.numero || 1),
        occupato: Boolean(bed.occupato),
        updatedAt: new Date().toISOString(),
        syncStatus: 'pending',
    }))

    return { rooms, beds }
}

/**
 * Assign hosts to rooms/beds and update their references
 */
export function assignHostsToBedsAndRooms(hosts, rooms, beds) {
    const hostsWithAssignment = hosts.map((host, idx) => ({
        ...host,
        roomId: beds[idx] ? beds[idx].roomId : null,
        bedId: beds[idx] ? beds[idx].id : null,
    }))
    return hostsWithAssignment
}

/**
 * Generate stock batches for drugs
 */
export function loadStockBatchesFromDrugs(drugs = null) {
    const drugList = drugs || loadDrugsFromCSV()

    return drugList.flatMap((drug, idx) => {
        // Each drug has 2-3 different batches/lots
        const batchCount = (idx % 3) + 2 // 2-3 batches per drug
        const batches = []

        for (let i = 0; i < batchCount; i++) {
            const lotNumber = `LOT${String(idx + 1).padStart(3, '0')}-${String(i + 1).padStart(2, '0')}`
            const scadenzaDate = new Date()
            scadenzaDate.setMonth(scadenzaDate.getMonth() + (3 + (i * 2))) // Vary expiry dates

            batches.push({
                id: randomUUID(),
                drugId: drug.id,
                nomeCommerciale: `${drug.principioAttivo} - Batch ${lotNumber}`,
                lotto: lotNumber,
                scadenza: scadenzaDate.toISOString().split('T')[0],
                quantita: 500 + Math.floor(Math.random() * 500),
                updatedAt: new Date().toISOString(),
                syncStatus: 'pending',
            })
        }

        return batches
    })
}

/**
 * Generate therapies: assign drugs to hosts with coherent patterns
 * Each host gets 1-3 therapies based on their pathologies
 */
export function loadTherapiesFromHostsAndDrugs(hosts = null, drugs = null, batches = null) {
    const dataset = loadRealisticDataset()
    const hostList = hosts || loadHostsFromCSV()
    const drugList = drugs || loadDrugsFromCSV()
    const batchList = batches || loadStockBatchesFromDrugs(drugList)

    return dataset.therapies
        .filter(templateTherapy => Number(templateTherapy.hostId) <= hostList.length)
        .map(templateTherapy => {
            const host = hostList[Number(templateTherapy.hostId) - 1]
            if (!host || drugList.length === 0) return null

            const drugIdx = ((Number(templateTherapy.drugId) || 1) - 1) % drugList.length
            const safeDrugIdx = drugIdx < 0 ? 0 : drugIdx
            const drug = drugList[safeDrugIdx]
            const associatedBatches = batchList.filter(b => b.drugId === drug.id)
            const batch = associatedBatches[0] ?? null

            return {
                id: randomUUID(),
                hostId: host.id,
                drugId: drug.id,
                stockBatchId: batch ? batch.id : null,
                dataInizio: templateTherapy.dataInizio || new Date().toISOString().split('T')[0],
                dataFine: templateTherapy.dataFine || null,
                dosaggio: String(templateTherapy.dosaggio || '1 compressa'),
                frequenza: String(templateTherapy.frequenza || '1 volta/die'),
                notaTerapia: String(templateTherapy.notaTerapia || `Terapia per ${host.patologie || 'patologia'}`),
                updatedAt: new Date().toISOString(),
                syncStatus: 'pending',
            }
        })
        .filter(Boolean)
}

/**
 * Return raw CSV data for file upload testing
 */
export function getRawCSVContent(filename) {
    const csvPath = path.join(__dirname, filename)
    return fs.readFileSync(csvPath, 'utf-8')
}

/**
 * Complete test data bundle: hosts + rooms + beds + drugs + batches + therapies
 */
export function loadCompleteTestDataBundle(maxHosts = null) {
    const hosts = loadHostsFromCSV()
    const limitedHosts = maxHosts ? hosts.slice(0, maxHosts) : hosts

    const drugs = loadDrugsFromCSV()
    const { rooms, beds } = loadRoomsAndBedsFromHosts(limitedHosts)
    const hostsWithAssignments = assignHostsToBedsAndRooms(limitedHosts, rooms, beds)
    const batches = loadStockBatchesFromDrugs(drugs)
    const therapies = loadTherapiesFromHostsAndDrugs(hostsWithAssignments, drugs, batches)

    return {
        hosts: hostsWithAssignments,
        rooms,
        beds,
        drugs,
        stockBatches: batches,
        therapies,
    }
}

/**
 * Helper: seed test data into IndexedDB via Playwright context fixture
 */
export async function seedTestData(page, options = {}) {
    const {
        hostsEnabled = true,
        drugsEnabled = true,
        roomsEnabled = true,
        bedsEnabled = true,
        therapiesEnabled = true,
        maxHosts = null,
        maxDrugs = null,
    } = options

    let data = {}

    if (maxHosts || (hostsEnabled || roomsEnabled || bedsEnabled || therapiesEnabled)) {
        // Load complete bundle if any spatial/relational data needed
        const bundle = loadCompleteTestDataBundle(maxHosts)

        if (hostsEnabled) data.hosts = bundle.hosts
        if (roomsEnabled) data.rooms = bundle.rooms
        if (bedsEnabled) data.beds = bundle.beds
        if (drugsEnabled) data.drugs = maxDrugs ? bundle.drugs.slice(0, maxDrugs) : bundle.drugs
        if (therapiesEnabled) data.therapies = bundle.therapies
        if (drugsEnabled || therapiesEnabled) data.stockBatches = bundle.stockBatches
    } else {
        // Fallback for minimal seeding
        if (hostsEnabled) {
            let hosts = loadHostsFromCSV()
            if (maxHosts) hosts = hosts.slice(0, maxHosts)
            data.hosts = hosts
        }
        if (drugsEnabled) {
            let drugs = loadDrugsFromCSV()
            if (maxDrugs) drugs = drugs.slice(0, maxDrugs)
            data.drugs = drugs
        }
    }

    // Inject data into IndexedDB via window context
    await page.addInitScript(({ seedData }) => {
        window.__E2E_SEED_DATA__ = seedData
    }, { seedData: data })

    return data
}

/**
 * Helper: Get fixture CSV for manual upload in test UI
 */
export function getFixturePath(filename) {
    return path.join(__dirname, filename)
}

export default {
    loadHostsFromCSV,
    loadDrugsFromCSV,
    loadRoomsAndBedsFromHosts,
    assignHostsToBedsAndRooms,
    loadStockBatchesFromDrugs,
    loadTherapiesFromHostsAndDrugs,
    loadCompleteTestDataBundle,
    getRawCSVContent,
    seedTestData,
    getFixturePath,
}
