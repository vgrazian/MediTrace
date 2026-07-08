#!/usr/bin/env node
/**
 * axiom-decrypt.mjs — Tool locale per decrittografare i log Axiom
 *
 * Legge gli eventi da Axiom via API query, decrittografa i campi `context`
 * criptati con AES-256-GCM, e produce output JSON o tabellare.
 *
 * Uso:
 *   AXIOM_PASSPHRASE="..." node scripts/axiom-decrypt.mjs [opzioni]
 *
 * Opzioni:
 *   --from <ISO>        Data inizio (default: -24h)
 *   --to <ISO>          Data fine (default: now)
 *   --operator <user>   Filtra per operatore
 *   --action <action>   Filtra per tipo azione
 *   --format json|table Output format (default: table)
 *   --limit <n>         Max eventi (default: 200)
 *
 * Requisiti:
 *   - Node.js 20+
 *   - Variabili d'ambiente: AXIOM_TOKEN, AXIOM_PASSPHRASE, AXIOM_ENCRYPTION_SALT
 *   - Opzionali: AXIOM_EDGE_URL (default: eu-central-1), AXIOM_DATASET (default: meditrace)
 */

import { webcrypto as crypto } from 'node:crypto'

// -- Config da env --
const AXIOM_TOKEN = process.env.AXIOM_TOKEN || ''
const AXIOM_PASSPHRASE = process.env.AXIOM_PASSPHRASE || ''
const AXIOM_ENCRYPTION_SALT = process.env.AXIOM_ENCRYPTION_SALT || ''
const AXIOM_EDGE_URL = process.env.AXIOM_EDGE_URL || 'https://eu-central-1.aws.edge.axiom.co'
const AXIOM_DATASET = process.env.AXIOM_DATASET || 'meditrace'

// -- Parse CLI args --
function parseArgs() {
  const args = process.argv.slice(2)
  const opts = {
    from: null,
    to: null,
    operator: null,
    action: null,
    format: 'table',
    limit: 200,
  }

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--from':
        opts.from = args[++i]
        break
      case '--to':
        opts.to = args[++i]
        break
      case '--operator':
        opts.operator = args[++i]
        break
      case '--action':
        opts.action = args[++i]
        break
      case '--format':
        opts.format = args[++i]
        break
      case '--limit':
        opts.limit = parseInt(args[++i], 10)
        break
      default:
        break
    }
  }

  // Default: ultime 24 ore
  if (!opts.from) {
    const d = new Date(Date.now() - 24 * 60 * 60 * 1000)
    opts.from = d.toISOString()
  }
  if (!opts.to) {
    opts.to = new Date().toISOString()
  }

  return opts
}

// -- Crittografia (compatibile con axiomCrypto.js Web Crypto API) --

/**
 * Deriva chiave AES-256-GCM con PBKDF2-SHA256.
 * Deve corrispondere ESATTAMENTE a deriveKey() in axiomCrypto.js.
 */
async function deriveKey(passphrase, saltHex) {
  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  )

  const salt = hexToBytes(saltHex)

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 600_000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  )
}

async function decrypt(encryptedObj, key) {
  if (!encryptedObj?.enc || !encryptedObj?.data) return encryptedObj

  const combined = base64ToBytes(encryptedObj.data)
  const iv = combined.subarray(0, 12)
  const ciphertext = combined.subarray(12)

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  )

  const dec = new TextDecoder()
  try {
    return JSON.parse(dec.decode(decrypted))
  } catch {
    return dec.decode(decrypted)
  }
}

// -- Query Axiom --
async function queryAxiom(opts) {
  const filter = []
  if (opts.operator) {
    filter.push({ field: 'operatorId', op: 'eq', value: opts.operator })
  }
  if (opts.action) {
    filter.push({ field: 'action', op: 'eq', value: opts.action })
  }

  const body = {
    startTime: opts.from,
    endTime: opts.to,
    limit: opts.limit,
  }
  if (filter.length > 0) {
    body.filter = filter.length === 1 ? filter[0] : { op: 'and', arguments: filter }
  }

  const res = await fetch(`${AXIOM_EDGE_URL}/v1/query/${AXIOM_DATASET}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AXIOM_TOKEN}`,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    throw new Error(`Axiom query failed: ${res.status} ${res.statusText}`)
  }

  return res.json()
}

// -- Formattazione output --
function formatTable(events) {
  const header = ['TS', 'OPERATORE', 'AZIONE', 'ENTITÀ', 'CONTEXT']
  const rows = events.map(e => [
    e._time || '',
    e.data?.operatorId || e.operatorId || '-',
    e.data?.action || e.action || '-',
    `${e.data?.entityType || '-'}/${e.data?.entityId || '-'}`,
    typeof e.data?.context === 'object' ? JSON.stringify(e.data.context) : '-',
  ])

  const colWidths = header.map((_, ci) =>
    Math.max(header[ci].length, ...rows.map(r => String(r[ci]).length))
  )

  const padRight = (s, w) => String(s).padEnd(w)

  let out = ''
  // Header
  out += header.map((h, i) => padRight(h, colWidths[i])).join('  ') + '\n'
  out += colWidths.map(w => '-'.repeat(w)).join('  ') + '\n'
  // Rows
  for (const row of rows) {
    out += row.map((c, i) => padRight(c, colWidths[i])).join('  ') + '\n'
  }

  return out
}

// -- Utility --
function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16)
  }
  return bytes
}

function base64ToBytes(base64) {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

// -- Main --
async function main() {
  if (!AXIOM_TOKEN) {
    console.error('❌ AXIOM_TOKEN non configurato. Imposta la variabile d\'ambiente.')
    process.exit(1)
  }

  const opts = parseArgs()

  console.error(`🔍 Query Axiom: ${opts.from} → ${opts.to}`)
  if (opts.operator) console.error(`   Operatore: ${opts.operator}`)
  if (opts.action) console.error(`   Azione: ${opts.action}`)

  const result = await queryAxiom(opts)
  const events = result?.matches || []

  console.error(`📊 Trovati ${events.length} eventi`)

  // Decrypt contexts if passphrase is configured
  let key = null
  if (AXIOM_PASSPHRASE && AXIOM_ENCRYPTION_SALT) {
    try {
      key = await deriveKey(AXIOM_PASSPHRASE, AXIOM_ENCRYPTION_SALT)
      let decryptedCount = 0
      for (const event of events) {
        if (event.data?.context?.enc) {
          try {
            event.data.context = await decrypt(event.data.context, key)
            decryptedCount++
          } catch {
            // Lascia criptato se la chiave non corrisponde
            event.data.context = { enc: true, data: '[decrypt fallito — passphrase errata?]' }
          }
        }
      }
      console.error(`🔓 Decrittografati ${decryptedCount} context`)
    } catch (err) {
      console.error(`⚠️  Decrypt non disponibile: ${err.message}`)
    }
  } else {
    console.error('ℹ️  AXIOM_PASSPHRASE non configurata — i context rimangono criptati')
  }

  if (opts.format === 'json') {
    console.log(JSON.stringify(events, null, 2))
  } else {
    console.log(formatTable(events))
  }
}

main().catch(err => {
  console.error('❌', err.message)
  process.exit(1)
})
