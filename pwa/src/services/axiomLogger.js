/**
 * axiomLogger.js — Servizio di logging operazionale GDPR-compliant su Axiom
 *
 * Invia eventi strutturati ad Axiom Edge in batch, con retry, circuit breaker
 * e crittografia AES-256-GCM per i dati di contesto sensibili.
 *
 * Degrada graziosamente a console.warn quando VITE_AXIOM_TOKEN non è configurato.
 *
 * GDPR: NON invia MAI dati sanitari, PII, o password in chiaro.
 *       Solo operatorId (username), entityId (UUID), action, timestamp, view, deviceId.
 */

import { deriveKey, encrypt } from './axiomCrypto'

// -- Config da variabili d'ambiente (lette dinamicamente per supportare test) --

function getAxiomToken() { return import.meta.env.VITE_AXIOM_TOKEN || '' }
function getAxiomEdgeUrl() { return import.meta.env.VITE_AXIOM_EDGE_URL || 'https://eu-central-1.aws.edge.axiom.co' }
function getAxiomDataset() { return import.meta.env.VITE_AXIOM_DATASET || 'meditrace' }
function getAxiomEncryptionSalt() { return import.meta.env.VITE_AXIOM_ENCRYPTION_SALT || '' }
function getAxiomEncryptionPassphrase() { return import.meta.env.VITE_AXIOM_ENCRYPTION_PASSPHRASE || '' }

// -- Stato interno --

/** @type {Array<object>} */
let batchBuffer = []

/** @type {number|null} */
let flushTimer = null

/** @type {number} */
const BATCH_INTERVAL_MS = 5000

/** @type {number} */
const MAX_BATCH_SIZE = 50

/** @type {number} */
const MAX_RETRIES = 3

/** @type {number} */
const CIRCUIT_BREAKER_COOLDOWN_MS = 60_000

/** @type {number} */
let circuitOpenUntil = 0

/** @type {number} */
let consecutiveFailures = 0

/** @type {CryptoKey|null} */
let encryptionKey = null

/** @type {boolean} */
let keyInitAttempted = false

// -- Inizializzazione --

/**
 * Inizializza la chiave di crittografia se configurata.
 * Chiamata lazy al primo utilizzo.
 */
async function ensureEncryptionKey() {
    if (keyInitAttempted) return
    keyInitAttempted = true

    if (getAxiomEncryptionPassphrase() && getAxiomEncryptionSalt()) {
        try {
            encryptionKey = await deriveKey(getAxiomEncryptionPassphrase(), getAxiomEncryptionSalt())
        } catch (err) {
            console.warn('[axiomLogger] Impossibile derivare chiave crittografia, i context saranno inviati con placeholder', err.message)
        }
    }
}

/**
 * Restituisce true se Axiom è configurato e disponibile.
 */
export function isAxiomConfigured() {
    return Boolean(getAxiomToken())
}

/**
 * Restituisce true se il circuit breaker è aperto (logging sospeso).
 */
export function isCircuitOpen() {
    return Date.now() < circuitOpenUntil
}

// -- Buffer e flushing --

/**
 * Aggiunge un evento al buffer e programma il flush.
 * @param {object} event - evento log (action, page_view, error, auth, sync, perf)
 */
function bufferEvent(event) {
    batchBuffer.push(event)

    // Flush immediato se superata la soglia
    if (batchBuffer.length >= MAX_BATCH_SIZE) {
        flushNow()
        return
    }

    // Programma flush differito
    if (!flushTimer) {
        flushTimer = setTimeout(flushNow, BATCH_INTERVAL_MS)
    }
}

/**
 * Svuota il buffer e invia gli eventi ad Axiom.
 */
function flushNow() {
    if (flushTimer) {
        clearTimeout(flushTimer)
        flushTimer = null
    }

    if (batchBuffer.length === 0) return

    const events = batchBuffer.splice(0)
    sendBatch(events)
}

/**
 * Invia un batch di eventi ad Axiom con retry.
 * @param {Array<object>} events
 */
async function sendBatch(events, attempt = 0) {
    if (!isAxiomConfigured()) {
        if (import.meta.env.DEV) {
            console.warn('[axiomLogger] Axiom non configurato — eventi scartati:', events.length)
        }
        return
    }

    if (isCircuitOpen()) {
        if (import.meta.env.DEV) {
            console.warn('[axiomLogger] Circuit breaker aperto — eventi scartati:', events.length)
        }
        return
    }

    try {
        const response = await fetch(`${getAxiomEdgeUrl()}/v1/ingest/${getAxiomDataset()}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getAxiomToken()}`,
            },
            body: JSON.stringify(events),
            // keepalive permette l'invio anche durante page unload
            keepalive: true,
        })

        if (!response.ok) {
            throw new Error(`Axiom ingest failed: ${response.status} ${response.statusText}`)
        }

        // Successo: reset failure count
        consecutiveFailures = 0
    } catch (err) {
        consecutiveFailures++

        if (attempt < MAX_RETRIES) {
            // Exponential backoff: 1s, 2s, 4s
            const delay = Math.pow(2, attempt) * 1000
            if (import.meta.env.DEV) {
                console.warn(`[axiomLogger] Retry ${attempt + 1}/${MAX_RETRIES} tra ${delay}ms:`, err.message)
            }
            await new Promise(resolve => setTimeout(resolve, delay))
            return sendBatch(events, attempt + 1)
        }

        // Circuit breaker dopo troppi fallimenti consecutivi
        if (consecutiveFailures >= 5) {
            circuitOpenUntil = Date.now() + CIRCUIT_BREAKER_COOLDOWN_MS
            console.warn('[axiomLogger] Circuit breaker APERTO per 60s dopo 5 fallimenti consecutivi')
        }

        console.warn('[axiomLogger] Invio fallito dopo tutti i retry, eventi persi:', events.length, err.message)
    }
}

// -- API pubblica —

/**
 * Registra un'azione CRUD o operazione utente.
 *
 * @param {object} params
 * @param {string} params.operatorId - username dell'operatore
 * @param {string} params.action - azione standardizzata (es. 'host_created')
 * @param {string} params.entityType - tabella interessata (es. 'hosts')
 * @param {string} params.entityId - UUID dell'entità
 * @param {string} [params.view] - route corrente
 * @param {number} [params.duration] - durata operazione in ms
 * @param {object} [params.contextData] - dati di contesto da criptare (es. { changedFields: [...] })
 */
export async function logAction({ operatorId, action, entityType, entityId, view, duration, contextData }) {
    await ensureEncryptionKey()

    let context = null
    if (contextData && encryptionKey) {
        try {
            context = await encrypt(contextData, encryptionKey)
        } catch (err) {
            // Fallback: contesto senza dati sensibili, solo placeholder
            context = { enc: false, note: 'encryption_failed' }
        }
    }

    const event = {
        _time: new Date().toISOString(),
        level: 'info',
        type: 'action',
        operatorId,
        action,
        entityType,
        entityId,
        view: view || (typeof window !== 'undefined' ? window.location.hash : ''),
        deviceId: getDeviceId(),
        version: getAppVersion(),
        duration: duration || null,
        context,
    }

    bufferEvent(event)
}

/**
 * Registra una navigazione tra viste.
 *
 * @param {string} view - percorso della route (es. '/farmaci')
 * @param {string} [referrer] - route precedente
 */
export function logPageView(view, referrer) {
    const event = {
        _time: new Date().toISOString(),
        level: 'info',
        type: 'page_view',
        operatorId: getCurrentOperatorId(),
        view,
        referrer: referrer || null,
        deviceId: getDeviceId(),
        version: getAppVersion(),
    }

    bufferEvent(event)
}

/**
 * Registra un errore applicativo.
 *
 * @param {object} params
 * @param {Error|object} params.error - oggetto errore
 * @param {string} [params.operatorId] - operatore corrente
 * @param {string} [params.view] - route corrente
 * @param {object} [params.extra] - metadati aggiuntivi
 */
export async function logError({ error, operatorId, view, extra }) {
    await ensureEncryptionKey()

    const errorMessage = error?.message || String(error)
    const errorName = error?.name || 'Error'
    const errorHash = hashString(`${errorName}:${errorMessage}`)

    let context = null
    const stack = error?.stack || null

    if (stack && encryptionKey) {
        try {
            context = await encrypt({ stack, extra: extra || null }, encryptionKey)
        } catch (err) {
            context = { enc: false, note: 'encryption_failed' }
        }
    }

    const event = {
        _time: new Date().toISOString(),
        level: 'error',
        type: 'error',
        operatorId: operatorId || getCurrentOperatorId(),
        action: 'error',
        entityType: null,
        entityId: null,
        view: view || (typeof window !== 'undefined' ? window.location.hash : ''),
        deviceId: getDeviceId(),
        version: getAppVersion(),
        errorHash,
        context,
    }

    bufferEvent(event)
}

/**
 * Registra un evento di autenticazione (login, logout, password change).
 * NON include mai password o token.
 *
 * @param {'login'|'logout'|'password_change'|'register'} authAction
 * @param {string} operatorId - username
 * @param {object} [meta] - metadati aggiuntivi (es. { method: 'password' })
 */
export function logAuth(authAction, operatorId, meta) {
    const event = {
        _time: new Date().toISOString(),
        level: 'info',
        type: 'auth',
        operatorId,
        action: `auth_${authAction}`,
        entityType: null,
        entityId: null,
        view: typeof window !== 'undefined' ? window.location.hash : '',
        deviceId: getDeviceId(),
        version: getAppVersion(),
        context: meta ? { enc: false, data: meta } : null,
    }

    bufferEvent(event)
}

/**
 * Registra un evento di sincronizzazione.
 *
 * @param {'sync_start'|'sync_complete'|'sync_conflict'|'sync_error'} syncAction
 * @param {string} operatorId
 * @param {object} [details] - conteggio entità sincronizzate o dettagli conflitto
 */
export async function logSync(syncAction, operatorId, details) {
    await ensureEncryptionKey()

    let context = null
    if (details && encryptionKey) {
        try {
            context = await encrypt(details, encryptionKey)
        } catch (err) {
            context = { enc: false, note: 'encryption_failed' }
        }
    }

    const event = {
        _time: new Date().toISOString(),
        level: syncAction === 'sync_error' ? 'error' : 'info',
        type: 'sync',
        operatorId,
        action: syncAction,
        entityType: null,
        entityId: null,
        view: typeof window !== 'undefined' ? window.location.hash : '',
        deviceId: getDeviceId(),
        version: getAppVersion(),
        context,
    }

    bufferEvent(event)
}

/**
 * Registra una metrica di performance (Web Vitals o custom).
 *
 * @param {object} params
 * @param {string} params.metric - nome metrica (es. 'LCP', 'FID', 'CLS', 'route_timing')
 * @param {number} params.value - valore della metrica
 * @param {string} [params.rating] - 'good' | 'needs-improvement' | 'poor'
 * @param {object} [params.extra] - dati aggiuntivi
 */
export function logPerf({ metric, value, rating, extra }) {
    const event = {
        _time: new Date().toISOString(),
        level: 'info',
        type: 'perf',
        operatorId: getCurrentOperatorId(),
        action: 'perf',
        entityType: null,
        entityId: null,
        view: typeof window !== 'undefined' ? window.location.hash : '',
        deviceId: getDeviceId(),
        version: getAppVersion(),
        context: {
            enc: false,
            data: {
                metric,
                value,
                rating: rating || null,
                ...(extra || {}),
            },
        },
    }

    bufferEvent(event)
}

/**
 * Forza il flush immediato del buffer (utile prima di page unload).
 */
export function flush() {
    flushNow()
}

// -- Helpers interni --

/**
 * Restituisce un identificativo stabile del dispositivo, persistente in localStorage.
 * GDPR-safe: è un UUID casuale, non tracciabile all'utente reale.
 *
 * @returns {string}
 */
function getDeviceId() {
    if (typeof window === 'undefined') return 'server'
    try {
        let id = localStorage.getItem('axiom_device_id')
        if (!id) {
            id = 'device-' + crypto.randomUUID()
            localStorage.setItem('axiom_device_id', id)
        }
        return id
    } catch {
        return 'device-unknown'
    }
}

/**
 * Restituisce la versione dell'app dal DOM o fallback.
 * @returns {string}
 */
function getAppVersion() {
    if (typeof document === 'undefined') return '0.0.0'
    try {
        const el = document.querySelector('[data-app-version]')
        return el?.getAttribute('data-app-version') || '0.0.0'
    } catch {
        return '0.0.0'
    }
}

/**
 * Restituisce l'username dell'operatore corrente, se disponibile.
 * @returns {string}
 */
function getCurrentOperatorId() {
    if (typeof window === 'undefined') return 'unknown'
    try {
        // Legge dalla sessione auth (chiave usata da auth.js)
        const sessionRaw = localStorage.getItem('meditrace_auth_session')
        if (sessionRaw) {
            const session = JSON.parse(sessionRaw)
            return session?.username || 'unknown'
        }
    } catch {
        // ignore
    }
    return 'unknown'
}

/**
 * Hash semplice (FNV-1a 32-bit) per identificare errori unici.
 * Non è crittografico — serve solo a raggruppare errori simili.
 *
 * @param {string} str
 * @returns {string} hash esadecimale
 */
function hashString(str) {
    let hash = 2166136261 // FNV offset basis
    for (let i = 0; i < str.length; i++) {
        hash ^= str.charCodeAt(i)
        hash = Math.imul(hash, 16777619) // FNV prime
    }
    return (hash >>> 0).toString(16).padStart(8, '0')
}

// -- Flush automatico al page unload --

if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
        flushNow()
    })
    // Anche su visibilitychange per tab in background
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            flushNow()
        }
    })
}
