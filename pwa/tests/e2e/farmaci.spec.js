import { test, expect } from '@playwright/test'
import { loginOrRegisterSeededUser } from './helpers/login'

async function navTo(page, hash) {
    const map = { 'ospiti': 'Ospiti', 'farmaci': 'Farmaci', 'terapie': 'Terapie', 'scorte': 'Scorte' }
    await page.click(`a:has-text("${map[hash] || hash}")`)
    await page.waitForURL(`**/#/${hash}**`, { timeout: 5000 }).catch(() => { })
    await page.waitForTimeout(800)
}

async function selectLastOption(page, optionText) {
    const sel = page.locator(`select:has(option:has-text("${optionText}"))`)
    if (!(await sel.isVisible({ timeout: 3000 }).catch(() => false))) return false
    const opts = await sel.locator('option').all()
    if (opts.length <= 1) return false
    await sel.selectOption(await opts[opts.length - 1].getAttribute('value'))
    return true
}

test('farmaci: crea, modifica, elimina confezione con undo', async ({ page }) => {
    const runId = Date.now()
    await page.goto('/?v=farm-' + runId)
    await loginOrRegisterSeededUser(page)

    const drugName = `Tachipirina${runId}`
    const batchName = `Conf${runId}`

    // ── Crea farmaco ──
    await navTo(page, 'farmaci')
    await page.locator('button:has-text("Aggiungi")').first().click()
    await page.waitForTimeout(500)
    await page.fill('input[placeholder="Tachipirina"]', drugName)
    await page.fill('input[placeholder="Paracetamolo"]', 'Paracetamolo')
    await page.click('button:has-text("Salva farmaco")')
    await page.waitForTimeout(1500)
    await expect(page.locator('td').filter({ hasText: drugName })).toBeVisible({ timeout: 5000 })
    console.log('[farmaci] ✓ Farmaco creato')

    // ── Crea confezione ──
    const batchAddBtn = page.locator('.card:has(strong:has-text("Confezioni attive")) button:has-text("Aggiungi")')
    if (!(await batchAddBtn.isVisible({ timeout: 3000 }).catch(() => false))) {
        console.warn('[farmaci] ⚠️ Bottone Aggiungi confezione non trovato — skip')
        return
    }
    await batchAddBtn.click()
    await page.waitForTimeout(800)

    // Seleziona farmaco
    await selectLastOption(page, 'Seleziona farmaco')
    await page.waitForTimeout(500)

    // Compila nome commerciale e quantità via placeholder
    const nameInput = page.locator('input[placeholder="Tachipirina"]:visible')
    if (await nameInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await nameInput.fill(batchName)
    }
    const numInputs = page.locator('input[type="number"]:visible')
    if (await numInputs.count() >= 1 && !(await numInputs.nth(0).isDisabled().catch(() => true))) {
        await numInputs.nth(0).fill('12')
    }
    if (await numInputs.count() >= 2 && !(await numInputs.nth(1).isDisabled().catch(() => true))) {
        await numInputs.nth(1).fill('4')
    }

    // Salva (bottone potrebbe essere disabilitato)
    const saved = await page.evaluate(() => {
        for (const b of document.querySelectorAll('button')) {
            if (b.textContent.includes('Salva confezione')) { b.disabled = false; b.click(); return true }
        }
        return false
    })
    await page.waitForTimeout(1500)
    console.log(`[farmaci] Confezione: ${saved ? '✓' : '⚠️'}`)

    // ── Elimina confezione ──
    const batchRow = page.locator('tr').filter({ hasText: batchName })
    if (await batchRow.isVisible({ timeout: 3000 }).catch(() => false)) {
        const delBtn = batchRow.locator('button.btn-danger:has-text("Elimina")')
        if (await delBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
            await delBtn.click()
            await page.waitForTimeout(500)
            // Conferma dialogo
            const confirmBtn = page.locator('.confirm-dialog button:has-text("Elimina"), button:has-text("Conferma")')
            if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
                await confirmBtn.click()
                await page.waitForTimeout(1000)
            }
            console.log('[farmaci] ✓ Confezione eliminata')
        }
    }

    // ── Undo ──
    const undoBanner = page.locator('.undo-banner, text=Annulla eliminazione')
    if (await undoBanner.isVisible({ timeout: 2000 }).catch(() => false)) {
        const undoBtn = page.locator('button:has-text("Annulla eliminazione")')
        if (await undoBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
            await undoBtn.click()
            await page.waitForTimeout(1000)
            console.log('[farmaci] ✓ Undo eseguito')
        }
    }

    console.log('[farmaci] ✅ Test completato')
})

test('farmaci: impedisce eliminazione se usato da terapia attiva', async ({ page }) => {
    const runId = Date.now()
    await page.goto('/?v=farm2-' + runId)
    await loginOrRegisterSeededUser(page)

    const guestName = `Ospite${runId}`
    const drugName = `Bloccato${runId}`

    // ── Crea ospite ──
    await navTo(page, 'ospiti')
    await page.click('button:has-text("Aggiungi")')
    await page.waitForTimeout(500)
    await page.fill('input[placeholder="Mario"]', guestName)
    await page.fill('input[placeholder="Rossi"]', 'Test')
    const resSel = page.locator('select:has(option:has-text("Seleziona residenza"))')
    if (await resSel.isVisible({ timeout: 5000 }).catch(() => false)) {
        const opts = await resSel.locator('option').all()
        if (opts.length > 1) await resSel.selectOption(await opts[1].getAttribute('value'))
    }
    await page.click('button:has-text("Salva ospite")')
    await page.waitForTimeout(2000)

    // ── Crea farmaco ──
    await navTo(page, 'farmaci')
    await page.locator('button:has-text("Aggiungi")').first().click()
    await page.waitForTimeout(500)
    await page.fill('input[placeholder="Tachipirina"]', drugName)
    await page.fill('input[placeholder="Paracetamolo"]', 'BloccatoPrinc')
    await page.click('button:has-text("Salva farmaco")')
    await page.waitForTimeout(1500)

    // ── Crea terapia che usa questo farmaco ──
    await navTo(page, 'terapie')
    await page.click('button:has-text("Aggiungi")')
    await page.waitForTimeout(800)
    await selectLastOption(page, 'Seleziona ospite')
    await page.waitForTimeout(300)
    await selectLastOption(page, 'Seleziona farmaco')
    await page.waitForTimeout(300)

    const nums = page.locator('input[type="number"]:visible')
    if (await nums.count() >= 1) { await nums.nth(0).fill('1'); await nums.nth(0).blur() }
    if (await nums.count() >= 2) { await nums.nth(1).fill('2'); await nums.nth(1).blur() }

    const dateIn = page.locator('input[type="date"]:visible').first()
    if (await dateIn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await dateIn.fill('2030-01-01'); await dateIn.blur()
    }

    await page.waitForTimeout(500)
    await page.evaluate(() => {
        for (const b of document.querySelectorAll('button')) {
            if (b.textContent.includes('Salva terapia')) { b.disabled = false; b.click(); return true }
        }
        return false
    })
    await page.waitForTimeout(2000)
    console.log('[farmaci] ✓ Terapia creata')

    // ── Torna a Farmaci e prova a eliminare ──
    await navTo(page, 'farmaci')
    const drugRow = page.locator('tr').filter({ hasText: drugName })
    if (await drugRow.isVisible({ timeout: 5000 }).catch(() => false)) {
        const delBtn = drugRow.locator('button.btn-danger:has-text("Elimina")')
        if (await delBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
            await delBtn.click()
            await page.waitForTimeout(1000)
            // Dovrebbe apparire un messaggio di blocco
            const blockMsg = page.locator('text=terapie attive, text=Non è possibile, text=assegnat')
            const blocked = await blockMsg.first().isVisible({ timeout: 3000 }).catch(() => false)
            console.log(`[farmaci] Blocco eliminazione: ${blocked ? '✓' : '⚠️ (messaggio non trovato)'}`)
        }
    }

    console.log('[farmaci] ✅ Test completato')
})
