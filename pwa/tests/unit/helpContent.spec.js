import { describe, it, expect, beforeEach } from 'vitest'
import { helpContent, manualeSezioni } from '../../src/data/helpContent'

const EXPECTED_KEYS = [
    'home', 'farmaci', 'ospiti', 'stanze', 'scorte',
    'movimenti', 'terapie', 'promemoria', 'audit', 'impostazioni',
]

describe('helpContent data integrity', () => {
    it('exports all expected section keys', () => {
        for (const key of EXPECTED_KEYS) {
            expect(helpContent).toHaveProperty(key)
        }
    })

    it.each(EXPECTED_KEYS)('section "%s" has required fields', (key) => {
        const section = helpContent[key]
        expect(typeof section.titolo).toBe('string')
        expect(section.titolo.length).toBeGreaterThan(5)
        expect(typeof section.intro).toBe('string')
        expect(section.intro.length).toBeGreaterThan(10)
        expect(Array.isArray(section.sezioni)).toBe(true)
        expect(section.sezioni.length).toBeGreaterThan(0)
    })

    it.each(EXPECTED_KEYS)('each sub-section of "%s" has titolo and testo', (key) => {
        for (const item of helpContent[key].sezioni) {
            expect(typeof item.titolo).toBe('string')
            expect(item.titolo.length).toBeGreaterThan(3)
            expect(typeof item.testo).toBe('string')
            expect(item.testo.length).toBeGreaterThan(10)
        }
    })
})

describe('manualeSezioni index', () => {
    it('contains an entry for every help section', () => {
        const manualeKeys = manualeSezioni.map(s => s.key)
        for (const key of EXPECTED_KEYS) {
            expect(manualeKeys).toContain(key)
        }
    })

    it('every entry has key and etichetta', () => {
        for (const entry of manualeSezioni) {
            expect(typeof entry.key).toBe('string')
            expect(typeof entry.etichetta).toBe('string')
            expect(entry.etichetta.length).toBeGreaterThan(0)
        }
    })

    it('has no duplicate keys', () => {
        const keys = manualeSezioni.map(s => s.key)
        expect(new Set(keys).size).toBe(keys.length)
    })
})
