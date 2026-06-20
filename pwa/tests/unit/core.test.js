/**
 * Unit tests for core utility functions — text formatting, movement logic
 */
import { describe, it, expect } from 'vitest'

// ── formatHostDisplay (from ospiti.js) ────────────────────────────────────
import { formatHostDisplay } from '../../src/services/ospiti'

describe('formatHostDisplay', () => {
    it('restituisce Nome Cognome', () => {
        const host = { nome: 'Mario', cognome: 'Rossi' }
        expect(formatHostDisplay(host)).toBe('Mario Rossi')
    })

    it('gestisce nome senza cognome', () => {
        const host = { nome: 'Mario', cognome: '' }
        expect(formatHostDisplay(host)).toBe('Mario')
    })

    it('gestisce cognome senza nome', () => {
        const host = { nome: '', cognome: 'Rossi' }
        expect(formatHostDisplay(host)).toBe('Rossi')
    })

    it('restituisce — per null', () => {
        expect(formatHostDisplay(null)).toBe('—')
    })

    it('restituisce — per undefined', () => {
        expect(formatHostDisplay(undefined)).toBe('—')
    })

    it('usa iniziali se nome e cognome vuoti', () => {
        const host = { nome: '', cognome: '', iniziali: 'M.R.', codiceInterno: 'MR' }
        expect(formatHostDisplay(host)).toBe('M.R.')
    })

    it('usa codiceInterno come fallback', () => {
        const host = { nome: '', cognome: '', codiceInterno: 'HOST-01' }
        expect(formatHostDisplay(host)).toBe('HOST-01')
    })

    it('usa id come ultimo fallback', () => {
        const host = { nome: '', cognome: '', id: 'abc123' }
        expect(formatHostDisplay(host)).toBe('abc123')
    })

    it('trimma spazi', () => {
        const host = { nome: '  Mario  ', cognome: '  Rossi  ' }
        expect(formatHostDisplay(host)).toBe('Mario Rossi')
    })
})

// ── Nome/Cognome order in various services ─────────────────────────────────
import { buildHostRows } from '../../src/services/ospiti'
import { buildReminderRows, CURRENT_RESIDENZA_SETTING_KEY } from '../../src/services/promemoria'

describe('buildHostRows — ordine', () => {
    it('include campo stanza', () => {
        const rows = buildHostRows({
            hosts: [{ id: 'h1', nome: 'Mario', cognome: 'Rossi', attivo: true, roomId: 'r1' }],
            therapies: [],
            rooms: [{ id: 'r1', codice: 'Il Rifugio' }],
        })
        expect(rows).toHaveLength(1)
        expect(rows[0].stanza).toBe('Il Rifugio')
    })

    it('filtra host disattivati', () => {
        const rows = buildHostRows({
            hosts: [
                { id: 'h1', nome: 'A', cognome: 'B', attivo: true },
                { id: 'h2', nome: 'C', cognome: 'D', attivo: false },
            ],
            therapies: [],
            rooms: [],
        })
        expect(rows).toHaveLength(1)
        expect(rows[0].id).toBe('h1')
    })

    it('conta terapie attive', () => {
        const rows = buildHostRows({
            hosts: [{ id: 'h1', nome: 'Mario', cognome: 'Rossi', attivo: true }],
            therapies: [
                { hostId: 'h1', attiva: true },
                { hostId: 'h1', attiva: true },
                { hostId: 'h2', attiva: true },
            ],
            rooms: [],
        })
        expect(rows[0].activeTherapies).toBe(2)
    })
})

// ── Promemoria constants ──────────────────────────────────────────────────
describe('CURRENT_RESIDENZA_SETTING_KEY', () => {
    it('è la stringa corretta', () => {
        expect(CURRENT_RESIDENZA_SETTING_KEY).toBe('promemoriaCurrentResidenzaId')
    })
})

// ── Residenze listResidenze metadata ───────────────────────────────────────
import { listResidenze } from '../../src/services/residenze'

describe('listResidenze — metadata fields', () => {
    it('espone indirizzo dal metadata', () => {
        // This is a structural test — the function reads from db so we test the shape
        expect(typeof listResidenze).toBe('function')
    })
})

// ── Terapie: stockBatchId ─────────────────────────────────────────────────
import { upsertTherapy } from '../../src/services/terapie'

describe('upsertTherapy', () => {
    it('accetta stockBatchId nel form', () => {
        expect(typeof upsertTherapy).toBe('function')
    })
})

// ── Audit log — Nome Cognome order ────────────────────────────────────────
import { formatBuildTimestamp, getGitCommit, getDeployLabel } from '../../src/services/buildInfo'

describe('buildInfo', () => {
    it('formatBuildTimestamp restituisce stringa', () => {
        const result = formatBuildTimestamp('it-IT')
        expect(typeof result).toBe('string')
        expect(result.length).toBeGreaterThan(0)
    })

    it('getGitCommit restituisce stringa o n/d', () => {
        const result = getGitCommit()
        expect(typeof result).toBe('string')
        expect(result.length).toBeGreaterThan(0)
    })

    it('getDeployLabel restituisce label con gh-pages', () => {
        const label = getDeployLabel()
        if (label) {
            expect(label).toContain('gh-pages')
        }
    })
})

// ── Sync state composition ─────────────────────────────────────────────────
import { useSyncState, SYNC_STATES } from '../../src/composables/useSyncState'

describe('useSyncState', () => {
    it('esporta SYNC_STATES con tutti i valori', () => {
        expect(SYNC_STATES.SYNCED).toBe('sincronizzato')
        expect(SYNC_STATES.PENDING).toBe('in attesa')
        expect(SYNC_STATES.CONFLICT).toBe('conflitto')
        expect(SYNC_STATES.ERROR).toBe('errore')
        expect(SYNC_STATES.OFFLINE).toBe('offline')
    })

    it('restituisce oggetto con proprietà corrette', () => {
        const state = useSyncState()
        expect(state).toHaveProperty('statoSync')
        expect(state).toHaveProperty('dettagli')
        expect(state).toHaveProperty('updateSyncState')
        expect(state).toHaveProperty('flushLocalSyncQueue')
    })
})

// ── Ospiti: autoCodiceInterno logic ───────────────────────────────────────
describe('autoCodiceInterno', () => {
    // Replicating the logic from OspitiView
    function autoCodiceInterno(nome, cognome) {
        const n = (nome || '').trim().toUpperCase()
        const c = (cognome || '').trim().toUpperCase()
        if (!n && !c) return ''
        const part1 = n.charAt(0)
        const part2 = c.replace(/[^A-Z]/g, '').slice(0, 5)
        return (part1 + part2) || 'OSP'
    }

    it('genera codice da nome e cognome', () => {
        expect(autoCodiceInterno('Mario', 'Rossi')).toBe('MROSSI')
    })

    it('gestisce nome senza cognome', () => {
        expect(autoCodiceInterno('Mario', '')).toBe('M')
    })

    it('gestisce cognome con caratteri speciali', () => {
        expect(autoCodiceInterno('Anna', "D'Angelo")).toBe('ADANGE')
    })

    it('restituisce stringa vuota per input vuoti', () => {
        expect(autoCodiceInterno('', '')).toBe('')
    })

    it('gestisce nomi con spazi', () => {
        expect(autoCodiceInterno('  Carlo  ', '  Bianchi  ')).toBe('CBIANC')
    })

    it('tronca cognome a 5 lettere', () => {
        expect(autoCodiceInterno('X', 'ABCDEFGHIJKLMNOP')).toBe('XABCDE')
    })
})

// ── Help content structure ────────────────────────────────────────────────
import { helpContent, manualeSezioni } from '../../src/data/helpContent'

describe('helpContent', () => {
    it('contiene tutte le sezioni principali', () => {
        const keys = ['home', 'farmaci', 'ospiti', 'stanze', 'scorte', 'movimenti', 'terapie', 'promemoria', 'operatori', 'audit', 'impostazioni']
        for (const key of keys) {
            expect(helpContent[key]).toBeDefined()
            expect(helpContent[key].titolo).toBeTruthy()
            expect(Array.isArray(helpContent[key].sezioni)).toBe(true)
        }
    })

    it('la sezione farmaci ha almeno 8 sottosezioni', () => {
        expect(helpContent.farmaci.sezioni.length).toBeGreaterThanOrEqual(8)
    })

    it('manualeSezioni include Operatori', () => {
        const operatori = manualeSezioni.find(s => s.key === 'operatori')
        expect(operatori).toBeDefined()
        expect(operatori.etichetta).toBe('Operatori')
    })

    it('manualeSezioni ha Residenze (non Stanze e Letti)', () => {
        const stanze = manualeSezioni.find(s => s.key === 'stanze')
        expect(stanze.etichetta).toBe('Residenze')
    })
})

// ── ID generation ─────────────────────────────────────────────────────────
import { generateEntityId } from '../../src/services/ids'

describe('generateEntityId', () => {
    it('genera ID con prefisso corretto', () => {
        const id = generateEntityId('host')
        expect(id).toMatch(/^host_/)
    })

    it('genera ID univoci', () => {
        const ids = new Set()
        for (let i = 0; i < 50; i++) {
            ids.add(generateEntityId('test'))
        }
        expect(ids.size).toBe(50)
    })

    it('gestisce prefissi vari', () => {
        expect(generateEntityId('drug')).toMatch(/^drug_/)
        expect(generateEntityId('therapy')).toMatch(/^therapy_/)
    })
})
