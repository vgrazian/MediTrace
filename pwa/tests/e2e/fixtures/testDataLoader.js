import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { randomUUID } from 'crypto'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

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
    const csvPath = path.join(__dirname, 'persone_test_sanitarie.csv')
    const csvContent = fs.readFileSync(csvPath, 'utf-8')
    const rows = parseCSV(csvContent)

    return rows.map((row, idx) => ({
        id: randomUUID(),
        codiceInterno: `H${String(idx + 1).padStart(3, '0')}`, // H001, H002, etc.
        iniziali: `${row.nome?.[0] ?? ''}${row.cognome?.[0] ?? ''}`.toUpperCase(),
        nome: row.nome || '',
        cognome: row.cognome || '',
        luogoNascita: row.luogo_nascita || '',
        dataNascita: row.data_nascita || null,
        sesso: 'M', // Default, adjust if needed
        codiceFiscale: row.codice_fiscale || '',
        patologie: row.patologia || '',
        attivo: true,
        roomId: null,
        bedId: null,
        updatedAt: new Date().toISOString(),
        syncStatus: 'pending',
    }))
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
    const hostCount = hosts ? hosts.length : loadHostsFromCSV().length

    // Room config: mix of 4-bed and 2-bed rooms to accommodate hostCount
    const roomConfigs = []
    let totalBeds = 0

    // Add 4-bed rooms
    const bedsFour = Math.floor(hostCount / 4)
    for (let i = 0; i < bedsFour; i++) {
        roomConfigs.push({ bedsCount: 4, codice: `R${String(i + 1).padStart(2, '0')}` })
        totalBeds += 4
    }

    // Add 2-bed rooms for remainder
    const remaining = hostCount - totalBeds
    const bedsTwo = Math.ceil(remaining / 2)
    for (let i = 0; i < bedsTwo; i++) {
        roomConfigs.push({ bedsCount: 2, codice: `R${String(bedsFour + i + 1).padStart(2, '0')}` })
    }

    // Generate room entities
    const rooms = roomConfigs.map((config, idx) => ({
        id: randomUUID(),
        codice: config.codice,
        descrizione: config.bedsCount === 4 ? 'Stanza 4 letti' : 'Stanza 2 letti',
        updatedAt: new Date().toISOString(),
        syncStatus: 'pending',
    }))

    // Generate bed entities linked to rooms
    const beds = []
    let bedCounter = 1
    roomConfigs.forEach((config, roomIdx) => {
        for (let i = 0; i < config.bedsCount; i++) {
            beds.push({
                id: randomUUID(),
                roomId: rooms[roomIdx].id,
                numero: i + 1,
                occupato: false,
                updatedAt: new Date().toISOString(),
                syncStatus: 'pending',
            })
            bedCounter++
        }
    })

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
    const hostList = hosts || loadHostsFromCSV()
    const drugList = drugs || loadDrugsFromCSV()
    const batchList = batches || loadStockBatchesFromDrugs(drugList)

    const pathologyDrugMap = {
        'Insufficienza cardiaca': [0, 1, 14, 15], // Aspirin-like, beta-blockers
        'Demenza senile': [0, 1, 2], // Donepezil, Rivastigmina, Memantina
        'Sclerosi multipla': [3, 4, 5], // Interferone, Ocrelizumab, Glatiramer
        'Parkinson': [6, 7, 8], // Levodopa, Duodopa, Pramipexolo
        'SLA': [24, 25], // Riluzolo, Edaravone
        'Alzheimer': [0, 1, 2], // Donepezil, Rivastigmina, Memantina
    }

    const therapies = []
    let therapyCounter = 0

    hostList.forEach((host) => {
        // Determine therapy count based on pathology severity
        let therapyCount = 1
        if (host.patologie && host.patologie.length > 10) {
            therapyCount = 2 + Math.floor(Math.random() * 2) // 2-3 therapies
        } else if (host.patologie) {
            therapyCount = 1 + Math.floor(Math.random() * 2) // 1-2 therapies
        }

        // Find matching drugs for this host's pathology
        const matchingDrugs = []
        Object.entries(pathologyDrugMap).forEach(([pathology, drugIndices]) => {
            if (host.patologie && host.patologie.includes(pathology)) {
                matchingDrugs.push(...drugIndices)
            }
        })

        // Fallback: use random drugs if no pathology match
        if (matchingDrugs.length === 0) {
            for (let i = 0; i < therapyCount; i++) {
                matchingDrugs.push(Math.floor(Math.random() * drugList.length))
            }
        }

        // Create therapies
        for (let i = 0; i < therapyCount; i++) {
            const drugIdx = matchingDrugs[i % matchingDrugs.length]
            const drug = drugList[drugIdx]
            const associatedBatches = batchList.filter(b => b.drugId === drug.id)
            const batch = associatedBatches.length > 0
                ? associatedBatches[Math.floor(Math.random() * associatedBatches.length)]
                : null

            const startDate = new Date()
            startDate.setDate(startDate.getDate() - Math.floor(Math.random() * 30)) // Started 0-30 days ago

            therapies.push({
                id: randomUUID(),
                hostId: host.id,
                drugId: drug.id,
                stockBatchId: batch ? batch.id : null,
                dataInizio: startDate.toISOString().split('T')[0],
                dataFine: null,
                dosaggio: `${(500 + Math.random() * 500).toFixed(0)} mg`,
                frequenza: ['1 volta al giorno', '2 volte al giorno', '3 volte al giorno'][Math.floor(Math.random() * 3)],
                notaTerapia: `Terapia per ${host.patologie || 'patologia'}`,
                updatedAt: new Date().toISOString(),
                syncStatus: 'pending',
            })

            therapyCounter++
        }
    })

    return therapies
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
