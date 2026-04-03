import Papa from 'papaparse'
import { db, enqueue, getSetting } from '../db'

const IMPORT_SCHEMAS = {
    '01_CatalogoFarmaci.csv': {
        table: 'drugs',
        idSource: 'drug_id',
        requiredHeaders: ['drug_id', 'principio_attivo'],
        fieldMap: {
            drug_id: 'id',
            principio_attivo: 'principioAttivo',
            classe_terapeutica: 'classeTerapeutica',
            scorta_minima_default: 'scortaMinima',
            fornitore_preferito: 'fornitore',
            note: 'note',
            updated_at: 'updatedAt',
            deleted_at: 'deletedAt',
        },
        numericFields: ['scortaMinima'],
    },
    '02_ConfezioniMagazzino.csv': {
        table: 'stockBatches',
        idSource: 'stock_item_id',
        requiredHeaders: ['stock_item_id', 'drug_id', 'nome_commerciale'],
        fieldMap: {
            stock_item_id: 'id',
            drug_id: 'drugId',
            nome_commerciale: 'nomeCommerciale',
            dosaggio: 'dosaggio',
            forma: 'forma',
            unita_misura: 'unitaMisura',
            lotto: 'lotto',
            scadenza: 'scadenza',
            quantita_iniziale: 'quantitaIniziale',
            quantita_attuale: 'quantitaAttuale',
            soglia_riordino: 'sogliaRiordino',
            copertura_settimane: 'coperturaSettimane',
            stato_scorta: 'statoScorta',
            updated_at: 'updatedAt',
            deleted_at: 'deletedAt',
        },
        numericFields: ['quantitaIniziale', 'quantitaAttuale', 'sogliaRiordino', 'coperturaSettimane'],
    },
    '03_Ospiti.csv': {
        table: 'hosts',
        idSource: 'guest_id',
        requiredHeaders: ['guest_id', 'codice_interno'],
        fieldMap: {
            guest_id: 'id',
            codice_interno: 'codiceInterno',
            iniziali: 'iniziali',
            casa_alloggio: 'casaAlloggio',
            attivo: 'attivo',
            note_essenziali: 'noteEssenziali',
            updated_at: 'updatedAt',
            deleted_at: 'deletedAt',
        },
        booleanFields: ['attivo'],
    },
    '04_TerapieAttive.csv': {
        table: 'therapies',
        idSource: 'therapy_id',
        requiredHeaders: ['therapy_id', 'guest_id', 'drug_id'],
        fieldMap: {
            therapy_id: 'id',
            guest_id: 'hostId',
            drug_id: 'drugId',
            stock_item_id_preferito: 'stockBatchIdPreferito',
            dose_per_somministrazione: 'dosePerSomministrazione',
            unita_dose: 'unitaDose',
            somministrazioni_giornaliere: 'somministrazioniGiornaliere',
            consumo_medio_settimanale: 'consumoMedioSettimanale',
            data_inizio: 'dataInizio',
            data_fine: 'dataFine',
            attiva: 'attiva',
            note: 'note',
            updated_at: 'updatedAt',
        },
        numericFields: ['somministrazioniGiornaliere', 'consumoMedioSettimanale'],
        booleanFields: ['attiva'],
    },
    '05_Movimenti.csv': {
        table: 'movements',
        idSource: 'movement_id',
        requiredHeaders: ['movement_id', 'stock_item_id', 'tipo_movimento'],
        fieldMap: {
            movement_id: 'id',
            stock_item_id: 'stockBatchId',
            drug_id: 'drugId',
            guest_id: 'hostId',
            tipo_movimento: 'tipoMovimento',
            quantita: 'quantita',
            unita_misura: 'unitaMisura',
            causale: 'causale',
            data_movimento: 'dataMovimento',
            settimana_riferimento: 'settimanaRiferimento',
            operatore: 'operatore',
            source: 'source',
            updated_at: 'updatedAt',
        },
        numericFields: ['quantita'],
    },
    '09_PromemoriaSomministrazioni.csv': {
        table: 'reminders',
        idSource: 'reminder_id',
        requiredHeaders: ['reminder_id', 'guest_id', 'therapy_id', 'scheduled_at'],
        fieldMap: {
            reminder_id: 'id',
            guest_id: 'hostId',
            therapy_id: 'therapyId',
            drug_id: 'drugId',
            scheduled_at: 'scheduledAt',
            stato: 'stato',
            eseguito_at: 'eseguitoAt',
            operatore: 'operatore',
            note: 'note',
            updated_at: 'updatedAt',
        },
    },
}

const REFERENCE_RULES = {
    stockBatches: [{ field: 'drugId', table: 'drugs' }],
    therapies: [{ field: 'hostId', table: 'hosts' }, { field: 'drugId', table: 'drugs' }],
    movements: [{ field: 'stockBatchId', table: 'stockBatches' }],
    reminders: [{ field: 'therapyId', table: 'therapies' }],
}

export function listSupportedImportSources() {
    return Object.keys(IMPORT_SCHEMAS)
}

export async function importCsv({ sourceName, csvText, dryRun = true, operatorId = null }) {
    const schema = IMPORT_SCHEMAS[sourceName]
    if (!schema) {
        throw new Error('Sorgente CSV non supportata')
    }

    const parsed = Papa.parse(csvText, {
        header: true,
        skipEmptyLines: 'greedy',
        transformHeader: value => String(value || '').trim(),
    })

    if (parsed.errors?.length > 0) {
        throw new Error(`Errore parsing CSV: ${parsed.errors[0].message}`)
    }

    const headers = parsed.meta?.fields ?? []
    const missingHeaders = schema.requiredHeaders.filter(header => !headers.includes(header))
    if (missingHeaders.length > 0) {
        throw new Error(`Header mancanti: ${missingHeaders.join(', ')}`)
    }

    const rejects = []
    const accepted = []
    const seenIds = new Set()
    const references = await loadReferenceIds()

    for (let i = 0; i < parsed.data.length; i += 1) {
        const rawRow = parsed.data[i]
        const rowNumber = i + 2

        if (isEmptyRow(rawRow)) {
            continue
        }

        const transformed = transformRow(rawRow, schema)
        const validationError = validateRow(transformed, schema, references, seenIds)

        if (validationError) {
            rejects.push({ rowNumber, reason: validationError, row: rawRow })
            continue
        }

        accepted.push(transformed)
        seenIds.add(transformed.id)
    }

    if (!dryRun && accepted.length > 0) {
        await persistAcceptedRows(schema.table, accepted, operatorId)
    }

    return {
        sourceName,
        table: schema.table,
        dryRun,
        totalRows: parsed.data.length,
        acceptedRows: accepted.length,
        rejectedRows: rejects.length,
        rejects,
    }
}

function transformRow(rawRow, schema) {
    const out = {}

    for (const [sourceField, targetField] of Object.entries(schema.fieldMap)) {
        out[targetField] = normalizeScalar(rawRow[sourceField])
    }

    if (!out.id) {
        out.id = crypto.randomUUID()
    }

    if (!out.updatedAt) {
        out.updatedAt = new Date().toISOString()
    }

    for (const field of schema.booleanFields ?? []) {
        out[field] = parseBoolean(out[field])
    }

    for (const field of schema.numericFields ?? []) {
        if (out[field] === null) continue
        const num = Number(out[field])
        out[field] = Number.isFinite(num) ? num : Number.NaN
    }

    out.deletedAt = out.deletedAt ?? null
    out.syncStatus = 'pending'
    return out
}

function validateRow(row, schema, references, seenIds) {
    if (!row.id) return 'ID mancante'
    if (seenIds.has(row.id)) return 'ID duplicato nel file importato'

    for (const requiredHeader of schema.requiredHeaders) {
        const field = schema.fieldMap[requiredHeader]
        if (field && (row[field] === null || row[field] === '')) {
            return `Campo obbligatorio mancante: ${requiredHeader}`
        }
    }

    for (const field of schema.numericFields ?? []) {
        if (Number.isNaN(row[field])) {
            return `Campo numerico non valido: ${field}`
        }
    }

    if (!isIsoDate(row.updatedAt)) {
        return 'updatedAt non valido (atteso ISO 8601)'
    }

    const rules = REFERENCE_RULES[schema.table] ?? []
    for (const rule of rules) {
        const value = row[rule.field]
        if (!value) continue
        if (!references[rule.table].has(value)) {
            return `Riferimento non trovato: ${rule.field}=${value}`
        }
    }

    return null
}

async function persistAcceptedRows(table, rows, operatorId) {
    const deviceId = (await getSetting('deviceId')) ?? 'unknown'
    const now = new Date().toISOString()

    await db.transaction('rw', db[table], db.syncQueue, db.activityLog, async () => {
        for (const row of rows) {
            await db[table].put(row)
            await enqueue(table, row.id, 'upsert')
        }

        await db.activityLog.add({
            entityType: table,
            entityId: `batch:${rows.length}`,
            action: 'csv_import_apply',
            deviceId,
            operatorId,
            ts: now,
            details: {
                importedRows: rows.length,
            },
        })
    })
}

async function loadReferenceIds() {
    const [drugs, hosts, stockBatches, therapies] = await Promise.all([
        db.drugs.toCollection().primaryKeys(),
        db.hosts.toCollection().primaryKeys(),
        db.stockBatches.toCollection().primaryKeys(),
        db.therapies.toCollection().primaryKeys(),
    ])

    return {
        drugs: new Set(drugs.map(String)),
        hosts: new Set(hosts.map(String)),
        stockBatches: new Set(stockBatches.map(String)),
        therapies: new Set(therapies.map(String)),
    }
}

function normalizeScalar(value) {
    if (value === undefined || value === null) return null
    const trimmed = String(value).trim()
    return trimmed === '' ? null : trimmed
}

function parseBoolean(value) {
    if (value === null) return null
    const lower = String(value).trim().toLowerCase()
    if (['true', '1', 'si', 's', 'yes', 'y'].includes(lower)) return true
    if (['false', '0', 'no', 'n'].includes(lower)) return false
    return null
}

function isIsoDate(value) {
    if (!value) return false
    const date = new Date(value)
    return !Number.isNaN(date.getTime())
}

function isEmptyRow(row) {
    return Object.values(row).every(value => normalizeScalar(value) === null)
}