#!/usr/bin/env node
/**
 * reset-clean.js — Ripristina l'applicazione pulita e pronta all'uso in produzione.
 *
 * Cancella TUTTI i dati locali (IndexedDB + localStorage + sessionStorage):
 *   • database IndexedDB "meditrace" (utenti, terapie, movimenti, scorte…)
 *   • chiavi localStorage dell'app
 *   • profilo demo Chromium (.demo-profile/)
 *
 * Al termine l'app è nello stato "primo avvio": richiede la registrazione
 * del primo operatore e non contiene dati preesistenti.
 *
 * ⚠  Operazione irreversibile: esegui un backup prima se necessario.
 *    (Impostazioni → Esporta backup JSON)
 *
 * Utilizzo:
 *   npm --prefix pwa run demo:reset
 *   node pwa/scripts/reset-clean.js
 */

import { chromium } from '@playwright/test'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { rm } from 'node:fs/promises'
import { existsSync } from 'node:fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PORT = 5175
const BASE_URL = `http://127.0.0.1:${PORT}`
const DEMO_PROFILE = resolve(__dirname, '../.demo-profile')
const DB_NAME = 'meditrace'

// ── Helpers ───────────────────────────────────────────────────────────────────

async function waitForServer(url, timeoutMs = 45_000) {
    const deadline = Date.now() + timeoutMs
    while (Date.now() < deadline) {
        try {
            const res = await fetch(url, { signal: AbortSignal.timeout(800) })
            if (res.status < 500) return
        } catch { /* not ready yet */ }
        await new Promise(r => setTimeout(r, 500))
    }
    throw new Error(`Server non raggiungibile su ${url} entro ${timeoutMs / 1000}s`)
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
    console.log('')
    console.log('⚠  RESET COMPLETO — tutti i dati locali verranno eliminati.')
    console.log('   Premi Ctrl+C entro 5 secondi per annullare.')
    console.log('')

    await new Promise(r => setTimeout(r, 5_000))

    // ── 1. Avvia dev server temporaneo ────────────────────────────────────────
    console.log('▶  Avvio server Vite dev (porta temporanea)…')

    const server = spawn(
        'npx', ['vite', '--host', '127.0.0.1', '--port', String(PORT)],
        {
            cwd: resolve(__dirname, '..'),
            env: {
                ...process.env,
                VITE_BASE_URL: '/',
                FORCE_COLOR: '1',
            },
            stdio: ['ignore', 'pipe', 'pipe'],
        }
    )

    const cleanup = () => { try { server.kill() } catch { } }
    process.on('exit', cleanup)
    process.on('SIGINT', () => { cleanup(); process.exit(0) })
    process.on('SIGTERM', () => { cleanup(); process.exit(0) })

    try {
        await waitForServer(BASE_URL)
        console.log(`✔  Server pronto → ${BASE_URL}`)

        // ── 2. Apri browser (headless) e cancella il DB ───────────────────────
        const browser = await chromium.launch({ headless: true })
        const context = await browser.newContext()
        const page = await context.newPage()

        await page.goto(`${BASE_URL}/#/`)

        // Attendi che Dexie/app sia inizializzata (aspetta che il DOM sia montato)
        await page.waitForFunction(
            () => document.querySelector('#app') !== null,
            { timeout: 10_000 }
        )

        // Piccola pausa per far completare l'init di Dexie
        await page.waitForTimeout(1500)

        // Cancella IndexedDB, localStorage e sessionStorage
        const result = await page.evaluate(async (dbName) => {
            // Cancella IndexedDB
            const dbDeleted = await new Promise((res) => {
                const req = indexedDB.deleteDatabase(dbName)
                req.onsuccess = () => res(true)
                req.onerror = () => res(false)
                req.onblocked = () => res(false)
            })

            // Elenca e cancella tutte le banche dati (coprire eventuali versioni/prefissi)
            let extraDeleted = 0
            if ('databases' in indexedDB) {
                const dbs = await indexedDB.databases()
                for (const db of dbs) {
                    if (db.name && db.name.startsWith('meditrace')) {
                        await new Promise((res) => {
                            const r = indexedDB.deleteDatabase(db.name)
                            r.onsuccess = res; r.onerror = res
                        })
                        extraDeleted++
                    }
                }
            }

            // Cancella localStorage e sessionStorage
            const lsKeys = Object.keys(localStorage).filter(k => k.startsWith('meditrace') || k.startsWith('_seed'))
            lsKeys.forEach(k => localStorage.removeItem(k))
            localStorage.clear()
            sessionStorage.clear()

            return { dbDeleted, extraDeleted, lsKeysCleaned: lsKeys.length }
        }, DB_NAME)

        await browser.close()

        console.log(`✔  IndexedDB "${DB_NAME}" cancellata: ${result.dbDeleted}`)
        if (result.extraDeleted > 0) {
            console.log(`✔  Database aggiuntivi cancellati: ${result.extraDeleted}`)
        }
        console.log(`✔  localStorage ripulito (${result.lsKeysCleaned} chiavi rimosse).`)

    } finally {
        cleanup()
    }

    // ── 3. Rimuovi il profilo demo Chromium ───────────────────────────────────
    if (existsSync(DEMO_PROFILE)) {
        console.log('▶  Rimozione profilo demo Chromium (.demo-profile/)…')
        await rm(DEMO_PROFILE, { recursive: true, force: true })
        console.log('✔  Profilo demo rimosso.')
    }

    console.log('')
    console.log('══════════════════════════════════════════════════════════════')
    console.log('  Reset completato.')
    console.log('  L\'app è pronta per il primo utilizzo in produzione.')
    console.log('  Al primo accesso sarà richiesta la registrazione operatore.')
    console.log('══════════════════════════════════════════════════════════════')
    console.log('')
}

main().catch(err => {
    console.error('\n✖  Errore reset-clean:', err.message)
    process.exit(1)
})
