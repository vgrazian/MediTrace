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

const REALISTIC_SEED_KEY = '_realisticSeedDataManifest'
const REALISTIC_SEED_PREFIX = '__realistic__'

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

/**
 * CSV fixture data embedded inline for browser compatibility
 */
const CSV_PERSONE = `nome,cognome,data_nascita,luogo_nascita,codice_fiscale,patologia
Carlo,Russo,1941-12-07,Torino,RSSCRL41T07L219I,Insufficienza cardiaca severa
Lucia,Ricci,1951-07-05,Torino,RCCLCU51L45L219U,Demenza senile con necessità di sorveglianza
Paola,Greco,1953-02-13,Palermo,GRCPLA53B53G273F,Sclerosi multipla in fase progressiva
Angela,Rossi,1954-01-26,Genova,RSSNGL54A66D969L,Parkinson in stadio avanzato
Giovanni,Esposito,1954-09-08,Firenze,SPSGNN54P08D612L,Sclerosi multipla in fase progressiva
Carlo,Russo,1948-04-23,Roma,RSSCRL48D23H501I,Parkinson in stadio avanzato
Stefano,Ferrari,1956-10-20,Torino,FRRSFN56R20L219U,Alzheimer avanzato con assistenza continua
Franco,Colombo,1954-06-18,Roma,CLMFNC54H18H501F,Insufficienza cardiaca severa
Antonio,Marino,1959-10-08,Milano,MRNNTN59R08F205L,Sclerosi multipla in fase progressiva
Paola,Ferrari,1955-12-20,Genova,FRRPLA55T60D969R,Parkinson in stadio avanzato
Stefano,Ricci,1959-03-01,Napoli,RCCSFN59C01F839E,Insufficienza respiratoria cronica
Angela,Esposito,1949-12-02,Torino,SPSNGL49T42L219B,Alzheimer avanzato con assistenza continua
Giovanni,Esposito,1944-12-26,Palermo,SPSGNN44T26G273R,Sclerosi multipla in fase progressiva
Giovanni,Romano,1950-02-26,Firenze,RMNGNN50B26D612D,Sclerosi multipla in fase progressiva
Caterina,Marino,1955-10-27,Palermo,MRNCRN55R67G273W,Insufficienza cardiaca severa
Stefano,Esposito,1951-11-14,Bologna,SPSSFN51S14A944X,Parkinson in stadio avanzato
Stefano,Ricci,1942-09-04,Bari,RCCSFN42P04A662E,Parkinson in stadio avanzato
Paola,Rossi,1951-02-13,Palermo,RSSPLA51B53G273E,Sclerosi multipla in fase progressiva
Paola,Esposito,1953-06-06,Roma,SPSPLA53H46H501A,Insufficienza cardiaca severa
Giuseppina,Ferrari,1955-04-17,Torino,FRRGPP55D57L219R,Sclerosi multipla in fase progressiva
Giuseppe,Russo,1954-04-07,Napoli,RSSGPP54D07F839V,Parkinson in stadio avanzato
Franco,Colombo,1961-07-22,Torino,CLMFNC61L22L219W,Demenza senile con necessità di sorveglianza
Giovanni,Russo,1955-05-21,Firenze,RSSGNN55E21D612A,SLA (sclerosi laterale amiotrofica)
Lucia,Rossi,1945-04-11,Catania,RSSLCU45D51C351K,SLA (sclerosi laterale amiotrofica)
Caterina,Marino,1943-12-21,Bologna,MRNCRN43T61A944O,Alzheimer avanzato con assistenza continua
Angela,Greco,1960-09-11,Torino,GRCNGL60P51L219H,Insufficienza respiratoria cronica
Mario,Colombo,1956-10-20,Milano,CLMMRA56R20F205D,Sclerosi multipla in fase progressiva
Anna,Esposito,1955-03-26,Torino,SPSNNA55C66L219Y,Parkinson in stadio avanzato
Rosa,Ferrari,1949-08-08,Firenze,FRRRSO49M48D612I,Insufficienza cardiaca severa
Roberto,Rossi,1944-07-07,Firenze,RSSRRT44L07D612K,Demenza senile con necessità di sorveglianza`

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

/**
 * Generate realistic hosts from CSV data
 */
function generateRealisticHosts() {
    const rows = parseCSV(CSV_PERSONE)
    const now = new Date().toISOString()

    return rows.map((row, idx) => ({
        id: `__realistic__host-${idx + 1}`,
        codiceInterno: `H${String(idx + 1).padStart(3, '0')}`,
        iniziali: `${row.nome?.[0] ?? ''}${row.cognome?.[0] ?? ''}`.toUpperCase(),
        nome: row.nome || '',
        cognome: row.cognome || '',
        luogoNascita: row.luogo_nascita || '',
        dataNascita: row.data_nascita || null,
        sesso: 'M',
        codiceFiscale: row.codice_fiscale || '',
        patologie: row.patologia || '',
        roomId: null,
        bedId: null,
        attivo: true,
        updatedAt: now,
        deletedAt: null,
        syncStatus: 'pending',
        _seeded: true,
    }))
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
 * Generate rooms and beds to accommodate all hosts
 */
function generateRealisticRoomsAndBeds(hostCount) {
    const now = new Date().toISOString()
    const roomConfigs = []
    let totalBeds = 0

    // 4-bed rooms
    const bedsFour = Math.floor(hostCount / 4)
    for (let i = 0; i < bedsFour; i++) {
        roomConfigs.push({ bedsCount: 4, codice: `R${String(i + 1).padStart(2, '0')}` })
        totalBeds += 4
    }

    // 2-bed rooms for remainder
    const remaining = hostCount - totalBeds
    const bedsTwo = Math.ceil(remaining / 2)
    for (let i = 0; i < bedsTwo; i++) {
        roomConfigs.push({ bedsCount: 2, codice: `R${String(bedsFour + i + 1).padStart(2, '0')}` })
    }

    // Generate rooms
    const rooms = roomConfigs.map((config, idx) => ({
        id: `__realistic__room-${idx + 1}`,
        codice: config.codice,
        descrizione: config.bedsCount === 4 ? 'Stanza 4 letti' : 'Stanza 2 letti',
        updatedAt: now,
        deletedAt: null,
        syncStatus: 'pending',
        _seeded: true,
    }))

    // Generate beds
    const beds = []
    roomConfigs.forEach((config, roomIdx) => {
        for (let i = 0; i < config.bedsCount; i++) {
            beds.push({
                id: `__realistic__bed-${roomIdx + 1}-${i + 1}`,
                roomId: rooms[roomIdx].id,
                numero: i + 1,
                occupato: false,
                updatedAt: now,
                deletedAt: null,
                syncStatus: 'pending',
                _seeded: true,
            })
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
 * Generate therapies for all hosts
 */
function generateRealisticTherapies(hosts, drugs, batches) {
    const now = new Date().toISOString()
    const therapies = []

    const pathologyDrugMap = {
        'Insufficienza cardiaca': [0, 1, 13, 14],
        'Demenza senile': [0, 1, 2],
        'Sclerosi multipla': [3, 4, 5],
        'Parkinson': [6, 7, 8],
        'SLA': [23, 24],
        'Alzheimer': [0, 1, 2],
    }

    hosts.forEach((host) => {
        let therapyCount = 1
        if (host.patologie && host.patologie.length > 10) {
            therapyCount = 2 + Math.floor(Math.random() * 2)
        } else if (host.patologie) {
            therapyCount = 1 + Math.floor(Math.random() * 2)
        }

        const matchingDrugs = []
        Object.entries(pathologyDrugMap).forEach(([pathology, drugIndices]) => {
            if (host.patologie && host.patologie.includes(pathology)) {
                matchingDrugs.push(...drugIndices)
            }
        })

        if (matchingDrugs.length === 0) {
            for (let i = 0; i < therapyCount; i++) {
                matchingDrugs.push(Math.floor(Math.random() * drugs.length))
            }
        }

        for (let i = 0; i < therapyCount; i++) {
            const drugIdx = Math.min(matchingDrugs[i % matchingDrugs.length], drugs.length - 1)
            const drug = drugs[drugIdx]
            const associatedBatches = batches.filter(b => b.drugId === drug.id)
            const batch = associatedBatches.length > 0
                ? associatedBatches[Math.floor(Math.random() * associatedBatches.length)]
                : null

            const startDate = new Date()
            startDate.setDate(startDate.getDate() - Math.floor(Math.random() * 30))

            therapies.push({
                id: `__realistic__therapy-${host.id}-${i + 1}`.replace('__realistic__host-', ''),
                hostId: host.id,
                drugId: drug.id,
                stockBatchId: batch ? batch.id : null,
                dataInizio: startDate.toISOString().split('T')[0],
                dataFine: null,
                dosaggio: `${(500 + Math.random() * 500).toFixed(0)} mg`,
                frequenza: ['1 volta al giorno', '2 volte al giorno', '3 volte al giorno'][Math.floor(Math.random() * 3)],
                notaTerapia: `Terapia per ${host.patologie || 'patologia'}`,
                attiva: true,
                updatedAt: now,
                deletedAt: null,
                syncStatus: 'pending',
                _seeded: true,
            })
        }
    })

    return therapies
}

/**
 * Generate complete realistic seed data bundle
 */
export function generateRealisticSeedData() {
    const hosts = generateRealisticHosts()
    const drugs = generateRealisticDrugs()
    const { rooms, beds } = generateRealisticRoomsAndBeds(hosts.length)
    const batches = generateRealisticStockBatches(drugs)
    const therapies = generateRealisticTherapies(hosts, drugs, batches)

    // Assign hosts to beds
    const hostsWithAssignments = hosts.map((host, idx) => ({
        ...host,
        roomId: beds[idx] ? beds[idx].roomId : null,
        bedId: beds[idx] ? beds[idx].id : null,
    }))

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
 * Load realistic seed data into database
 */
export async function loadRealisticSeedData(options = {}) {
    const { allowInProduction = false } = options
    const SEED_ENABLED = import.meta.env.DEV || import.meta.env.VITE_SEED_DATA === '1' || allowInProduction

    if (!SEED_ENABLED) {
        throw new Error('Dati realistici non disponibili. Modalità DEV richiesta.')
    }

    const bundle = generateRealisticSeedData()

    await db.transaction('rw', [
        db.rooms, db.beds, db.hosts, db.drugs, db.stockBatches, db.therapies,
    ], async () => {
        for (const record of bundle.rooms) await db.rooms.put(record)
        for (const record of bundle.beds) await db.beds.put(record)
        for (const record of bundle.hosts) await db.hosts.put(record)
        for (const record of bundle.drugs) await db.drugs.put(record)
        for (const record of bundle.stockBatches) await db.stockBatches.put(record)
        for (const record of bundle.therapies) await db.therapies.put(record)
    })

    const manifest = {
        rooms: bundle.rooms.map(r => r.id),
        beds: bundle.beds.map(r => r.id),
        hosts: bundle.hosts.map(r => r.id),
        drugs: bundle.drugs.map(r => r.id),
        stockBatches: bundle.stockBatches.map(r => r.id),
        therapies: bundle.therapies.map(r => r.id),
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

    await db.transaction('rw', [
        db.rooms, db.beds, db.hosts, db.drugs, db.stockBatches, db.therapies,
    ], async () => {
        for (const id of (manifest.rooms ?? [])) await db.rooms.delete(id)
        for (const id of (manifest.beds ?? [])) await db.beds.delete(id)
        for (const id of (manifest.hosts ?? [])) await db.hosts.delete(id)
        for (const id of (manifest.drugs ?? [])) await db.drugs.delete(id)
        for (const id of (manifest.stockBatches ?? [])) await db.stockBatches.delete(id)
        for (const id of (manifest.therapies ?? [])) await db.therapies.delete(id)
    })

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
