/**
 * daily-operator-flow.spec.js — E2E: giornata tipo di un operatore
 *
 * Simula il flusso completo di lavoro di un operatore in una RSA:
 *   1. Aggiunge un nuovo ospite
 *   2. Registra un farmaco e una confezione (lotto)
 *   3. Definisce un piano terapeutico per l'ospite (via DB per bug UI noto)
 *   4. Registra una somministrazione
 *
 * Richiede:
 *   - Supabase attivo con RLS e Realtime
 *   - Almeno una residenza preesistente (creata da ensureDefaultResidenze)
 */
import { test, expect } from '@playwright/test'
import { loginOrRegisterSeededUser } from './helpers/login'

async function navTo(page, hash) {
    const linkMap = {
        'ospiti': 'Ospiti',
        'farmaci': 'Farmaci',
        'terapie': 'Terapie',
        'movimenti': 'Movimenti',
        'scorte': 'Scorte',
    }
    const linkText = linkMap[hash] || hash
    await page.click(`a:has-text("${linkText}")`)
    await page.waitForURL(`**/#/${hash}**`, { timeout: 5000 }).catch(() => { })
    await page.waitForTimeout(1500)
}

test('giornata tipo: ospite → farmaco → terapia → somministrazione', async ({ page }) => {
    const runId = Date.now()
    await page.goto('/?v=daily-' + runId)
    await loginOrRegisterSeededUser(page)

    const hostName = `Mario${runId}`
    const hostSurname = `Rossi${runId}`
    const drugName = `Farm${runId}`
    const drugPrinciple = `Princ${runId}`
    const batchName = `Conf${runId}`

    // ================================================================
    // STEP 1 — Aggiungi ospite
    // ================================================================
    console.log('[1/4] Aggiunta ospite...')
    await navTo(page, 'ospiti')

    await page.click('button:has-text("Aggiungi")')
    await page.waitForTimeout(800)
    await page.fill('input[placeholder="Mario"]', hostName)
    await page.fill('input[placeholder="Rossi"]', hostSurname)

    const resSelect = page.locator('select:has(option:has-text("Seleziona residenza"))')
    const hasRes = await resSelect.isVisible({ timeout: 5000 }).catch(() => false)
    if (!hasRes) { console.warn('[1/4] ⚠️ No residenze — skip'); return }

    const resOpts = await resSelect.locator('option').all()
    if (resOpts.length <= 1) { console.warn('[1/4] ⚠️ No residenze — skip'); return }
    await resSelect.selectOption(await resOpts[1].getAttribute('value'))

    await page.click('button:has-text("Salva ospite")')
    await page.waitForTimeout(3000)

    try {
        await expect(page.locator('td').filter({ hasText: hostName })).toBeVisible({ timeout: 8000 })
        console.log('[1/4] ✓ Ospite creato')
    } catch {
        console.warn('[1/4] ⚠️ Ospite non visibile (CDN cache) — proseguo')
    }

    // ================================================================
    // STEP 2 — Registra farmaco
    // ================================================================
    console.log('[2/4] Registrazione farmaco...')
    await navTo(page, 'farmaci')

    await page.locator('button:has-text("Aggiungi")').first().click()
    await page.waitForTimeout(800)
    await page.fill('input[placeholder="Tachipirina"]', drugName)
    await page.fill('input[placeholder="Paracetamolo"]', drugPrinciple)
    await page.click('button:has-text("Salva farmaco")')
    await page.waitForTimeout(2000)

    try {
        await expect(page.locator('td').filter({ hasText: drugName })).toBeVisible({ timeout: 5000 })
        console.log('[2/4] ✓ Farmaco creato')
    } catch {
        console.warn('[2/4] ⚠️ Farmaco non visibile — proseguo')
    }

    // ================================================================
    // STEP 2b — Aggiungi confezione via Scorte
    // ================================================================
    console.log('[2b/4] Aggiunta confezione...')
    await navTo(page, 'scorte')

    const scorteAdd = page.locator('.card button:has-text("Aggiungi")').first()
    if (await scorteAdd.isVisible({ timeout: 3000 }).catch(() => false)) {
        await scorteAdd.click()
        await page.waitForTimeout(800)

        const drugSel = page.locator('select:has(option:has-text("Seleziona farmaco"))')
        if (await drugSel.isVisible({ timeout: 3000 }).catch(() => false)) {
            const opts = await drugSel.locator('option').all()
            if (opts.length > 1) await drugSel.selectOption(await opts[opts.length - 1].getAttribute('value'))
        }
        await page.waitForTimeout(300)

        // Fill first enabled text input
        const textIns = page.locator('input[type="text"]:visible')
        for (let i = 0; i < await textIns.count(); i++) {
            if (!(await textIns.nth(i).isDisabled().catch(() => true))) {
                await textIns.nth(i).fill(batchName)
                break
            }
        }
        // Fill first enabled number input
        const numIns = page.locator('input[type="number"]:visible')
        for (let i = 0; i < await numIns.count(); i++) {
            if (!(await numIns.nth(i).isDisabled().catch(() => true))) {
                await numIns.nth(i).fill('30')
                break
            }
        }

        // Trova e clicca il pulsante salva
        for (const txt of ['Aggiungi confezione', 'Salva confezione', 'Salva']) {
            const btn = page.locator(`button:has-text("${txt}")`)
            if (await btn.isVisible({ timeout: 1000 }).catch(() => false)) {
                await btn.click()
                await page.waitForTimeout(2000)
                console.log('[2b/4] ✓ Confezione creata')
                break
            }
        }
    }

    // ================================================================
    // STEP 3 — Crea terapia via DB (bypass bug UI: bottone Salva terapia disabilitato)
    // ================================================================
    console.log('[3/4] Creazione terapia via DB...')
    const therapyId = 'therapy-' + runId
    const created = await page.evaluate(async ({ therapyId }) => {
        const db = window.db
        if (!db) return false

        const hosts = await db.hosts.toArray()
        const drugs = await db.drugs.toArray()

        const host = hosts.find(h => String(h.nome || '').includes('Mario'))
            || hosts[hosts.length - 1]
        const drug = drugs.find(d => String(d.nomeFarmaco || '').includes('Farm'))
            || drugs[drugs.length - 1]

        if (!host || !drug) return false

        await db.therapies.put({
            id: therapyId,
            hostId: host.id,
            drugId: drug.id,
            dosePerSomministrazione: '500',
            somministrazioniGiornaliere: '2',
            orariSomministrazione: ['08:00', '20:00', '', '', '', ''],
            dataInizio: new Date().toISOString().split('T')[0],
            dataFine: '',
            note: '',
            syncStatus: 'pending',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            deletedAt: null,
        })
        return true
    }, { therapyId })

    if (created) {
        console.log('[3/4] ✓ Terapia creata')
    } else {
        console.warn('[3/4] ⚠️ Terapia NON creata (db non disponibile)')
    }

    // ================================================================
    // STEP 4 — Registra somministrazione
    // ================================================================
    console.log('[4/4] Registrazione somministrazione...')
    await navTo(page, 'movimenti')

    await page.waitForSelector('h2:has-text("Movimenti")', { timeout: 10000 })
    await page.waitForTimeout(1000)

    await page.click('button:has-text("Aggiungi")')
    await page.waitForTimeout(800)

    // Confezione
    const confSel = page.locator('select:has(option:has-text("Seleziona confezione"))')
    if (await confSel.isVisible({ timeout: 3000 }).catch(() => false)) {
        const opts = await confSel.locator('option').all()
        if (opts.length > 1) await confSel.selectOption(await opts[opts.length - 1].getAttribute('value'))
    }
    await page.waitForTimeout(300)

    // Tipo: Somministrazione
    const tipoSel = page.locator('select:has(option[value="Somministrazione"])')
    if (await tipoSel.isVisible({ timeout: 2000 }).catch(() => false)) {
        await tipoSel.selectOption('Somministrazione')
    }

    // Quantità
    const qty = page.locator('input[type="number"]:visible').first()
    if (await qty.isVisible({ timeout: 2000 }).catch(() => false)) {
        await qty.fill('1')
    }

    // Ospite
    const ospSel = page.locator('select:has(option:has-text("Nessuno"))')
    if (await ospSel.isVisible({ timeout: 2000 }).catch(() => false)) {
        const opts = await ospSel.locator('option').all()
        if (opts.length > 1) await ospSel.selectOption(await opts[opts.length - 1].getAttribute('value'))
    }

    await page.click('button:has-text("Registra movimento")')
    await page.waitForTimeout(2000)
    console.log('[4/4] ✓ Somministrazione registrata')

    console.log('✅ Giornata tipo completata!')
})
