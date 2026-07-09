/**
 * axiomCrypto.js — Crittografia AES-256-GCM per log Axiom
 *
 * GDPR-compliant: i dati sensibili (stack trace, changedFields, dettagli conflitto)
 * vengono criptati lato client prima dell'invio ad Axiom. La chiave NON viene mai
 * inviata in rete. La decrittazione avviene solo localmente via axiom-decrypt.mjs.
 *
 * Utilizza ESCLUSIVAMENTE Web Crypto API (crypto.subtle), mai Node.js crypto.
 */

/** @type {CryptoKey|null} */
let cachedKey = null

/** @type {string|null} */
let cachedPassphrase = null

/**
 * Deriva una chiave AES-256-GCM da una passphrase usando PBKDF2-SHA256.
 * Il salt è hardcodato (NON è un segreto — serve solo a prevenire rainbow tables).
 *
 * @param {string} passphrase - passphrase condivisa fuori banda (min 16 caratteri)
 * @param {string} salt - salt esadecimale
 * @returns {Promise<CryptoKey>}
 */
export async function deriveKey(passphrase, salt) {
    if (cachedKey && cachedPassphrase === passphrase) {
        return cachedKey
    }

    const enc = new TextEncoder()
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        enc.encode(passphrase),
        'PBKDF2',
        false,
        ['deriveBits', 'deriveKey']
    )

    const saltBytes = hexToBytes(salt)

    const derived = await crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: saltBytes,
            iterations: 600_000,
            hash: 'SHA-256',
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    )

    cachedKey = derived
    cachedPassphrase = passphrase
    return derived
}

/**
 * Cripta dati sensibili con AES-256-GCM.
 * Output: base64(IV 12 byte || ciphertext || auth tag 16 byte)
 *
 * @param {*} data - dati da criptare (verrà serializzato con JSON.stringify)
 * @param {CryptoKey} key - chiave derivata da deriveKey()
 * @returns {Promise<{enc: boolean, data: string}>}
 */
export async function encrypt(data, key) {
    const iv = crypto.getRandomValues(new Uint8Array(12))
    const enc = new TextEncoder()
    const plaintext = enc.encode(JSON.stringify(data))

    const ciphertext = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        plaintext
    )

    // Concatena IV + ciphertext (che include già l'auth tag)
    const combined = new Uint8Array(iv.length + ciphertext.byteLength)
    combined.set(iv, 0)
    combined.set(new Uint8Array(ciphertext), iv.length)

    return {
        enc: true,
        data: bytesToBase64(combined),
    }
}

/**
 * Decripta dati criptati con encrypt().
 *
 * @param {{enc: boolean, data: string}} encrypted - output di encrypt()
 * @param {CryptoKey} key - chiave derivata da deriveKey()
 * @returns {Promise<*>} dati originali
 */
export async function decrypt(encrypted, key) {
    if (!encrypted || !encrypted.enc || !encrypted.data) {
        throw new Error('Formato criptato non valido: campi "enc" o "data" mancanti')
    }

    const combined = base64ToBytes(encrypted.data)
    const iv = combined.subarray(0, 12)
    const ciphertext = combined.subarray(12)

    const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        ciphertext
    )

    const dec = new TextDecoder()
    return JSON.parse(dec.decode(decrypted))
}

/**
 * Invalida la cache della chiave derivata (utile dopo cambio passphrase).
 */
export function clearKeyCache() {
    cachedKey = null
    cachedPassphrase = null
}

// -- Utility: conversione hex/bytes/base64 (senza dipendenze esterne) --

/**
 * @param {string} hex
 * @returns {Uint8Array}
 */
function hexToBytes(hex) {
    const bytes = new Uint8Array(hex.length / 2)
    for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16)
    }
    return bytes
}

/**
 * @param {Uint8Array} bytes
 * @returns {string} base64 (standard, senza padding URL-safe)
 */
function bytesToBase64(bytes) {
    let binary = ''
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i])
    }
    return btoa(binary)
}

/**
 * @param {string} base64
 * @returns {Uint8Array}
 */
function base64ToBytes(base64) {
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i)
    }
    return bytes
}
