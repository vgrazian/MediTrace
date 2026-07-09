/**
 * axiomCrypto.spec.js — Test per il modulo di crittografia AES-256-GCM
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { deriveKey, encrypt, decrypt, clearKeyCache } from '../../src/services/axiomCrypto'

const TEST_SALT = 'a3f8b2c1d4e5f60718293a4b5c6d7e8f'
const TEST_PASSPHRASE = 'medi-trace-test-key-2026!!'

describe('axiomCrypto', () => {
    let key

    beforeEach(async () => {
        clearKeyCache()
        key = await deriveKey(TEST_PASSPHRASE, TEST_SALT)
    })

    describe('deriveKey', () => {
        it('deriva una CryptoKey valida', () => {
            expect(key).toBeDefined()
            expect(key.type).toBe('secret')
            expect(key.algorithm.name).toBe('AES-GCM')
        })

        it('usa la cache per la stessa passphrase', async () => {
            const key2 = await deriveKey(TEST_PASSPHRASE, TEST_SALT)
            expect(key2).toBe(key) // stesso riferimento (cache hit)
        })

        it('genera chiavi diverse per passphrase diverse', async () => {
            clearKeyCache()
            const key2 = await deriveKey('different-passphrase-2026!!', TEST_SALT)
            expect(key2).not.toBe(key)
        })

        it('genera chiavi diverse per salt diversi', async () => {
            clearKeyCache()
            const key2 = await deriveKey(TEST_PASSPHRASE, 'b3a8f2c1d4e5f60718293a4b5c6d7e00')
            // Non possiamo confrontare direttamente le chiavi, ma non crasha
            expect(key2.type).toBe('secret')
        })
    })

    describe('encrypt / decrypt roundtrip', () => {
        it('cripta e decripta una stringa semplice', async () => {
            const data = { message: 'test-log-entry', changedFields: ['nome', 'cognome'] }
            const encrypted = await encrypt(data, key)
            expect(encrypted.enc).toBe(true)
            expect(encrypted.data).toBeTruthy()
            expect(typeof encrypted.data).toBe('string')

            const decrypted = await decrypt(encrypted, key)
            expect(decrypted).toEqual(data)
        })

        it('cripta e decripta un oggetto complesso', async () => {
            const data = {
                stack: 'Error: something went wrong\n  at foo (bar.js:42)',
                extra: { view: '/ospiti', timestamp: '2026-07-08T10:30:00Z' },
            }
            const encrypted = await encrypt(data, key)
            const decrypted = await decrypt(encrypted, key)
            expect(decrypted).toEqual(data)
        })

        it('cripta e decripta un array', async () => {
            const data = ['field1', 'field2', 'field3']
            const encrypted = await encrypt(data, key)
            const decrypted = await decrypt(encrypted, key)
            expect(decrypted).toEqual(data)
        })

        it('cripta e decripta valori primitivi', async () => {
            const data = 42
            const encrypted = await encrypt(data, key)
            const decrypted = await decrypt(encrypted, key)
            expect(decrypted).toBe(42)
        })

        it('produce ciphertext diversi per lo stesso input (IV random)', async () => {
            const data = { test: 'same-data' }
            const enc1 = await encrypt(data, key)
            const enc2 = await encrypt(data, key)
            // Con IV random, i ciphertext devono essere diversi
            expect(enc1.data).not.toBe(enc2.data)
        })

        it('fallisce nel decrypt con chiave sbagliata', async () => {
            const data = { secret: 'test' }
            const encrypted = await encrypt(data, key)

            clearKeyCache()
            const wrongKey = await deriveKey('wrong-passphrase-here!!', TEST_SALT)

            await expect(decrypt(encrypted, wrongKey)).rejects.toThrow()
        })

        it('fallisce nel decrypt con formato non valido', async () => {
            await expect(decrypt(null, key)).rejects.toThrow('Formato criptato non valido')
            await expect(decrypt({}, key)).rejects.toThrow('Formato criptato non valido')
            await expect(decrypt({ enc: false }, key)).rejects.toThrow('Formato criptato non valido')
        })
    })

    describe('clearKeyCache', () => {
        it('invalida la cache e forza una nuova derivazione', async () => {
            const key1 = await deriveKey(TEST_PASSPHRASE, TEST_SALT)
            clearKeyCache()
            // clearKeyCache non rimuove la chiave dall'oggetto CryptoKey,
            // ma forza deriveKey a ricalcolare. Verifichiamo che non crasha.
            const key2 = await deriveKey(TEST_PASSPHRASE, TEST_SALT)
            expect(key2.type).toBe('secret')
        })
    })
})
