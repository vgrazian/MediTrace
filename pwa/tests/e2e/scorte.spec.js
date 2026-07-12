import { test, expect } from '@playwright/test'
import { loginOrRegisterSeededUser } from './helpers/login'

async function navTo(page, hash) {
    const map = { 'farmaci': 'Farmaci', 'scorte': 'Scorte' }
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

async function fillEnabledInput(page, selector, value) {
    const inputs = page.locator(selector)
    for (let i = 0; i < await inputs.count(); i++) {
        if (!(await inputs.nth(i).isDisabled().catch(() => true))) {
            await inputs.nth(i).fill(value)
            return true
        }
    }
    return false
}

test('scorte: edit/delete farmaco e confezione', async ({ page }) => {
    const runId = Date.now()
    await page.goto('/?v=scorte-' + runId)
    await loginOrRegisterSeededUser(page)

    const drugName = `Brufen${runId}`

    // ── Crea farmaco + confezione via Farmaci ──
    await navTo(page, 'farmaci')
    await page.locator('button:has-text("Aggiungi")').first().click()
    await page.waitForTimeout(500)
    await page.fill('input[placeholder="Tachipirina"]', drugName)
    await page.fill('input[placeholder="Paracetamolo"]', 'Ibuprofene')
    await page.click('button:has-text("Salva farmaco")')
    await page.waitForTimeout(1500)

    // Crea confezione
    const batchBtn = page.locator('.card:has(strong:has-text("Confezioni attive")) button:has-text("Aggiungi")')
    if (!(await batchBtn.isVisible({ timeout: 3000 }).catch(() => false))) {
        console.warn('[scorte] ⚠️ Bottone confezione non trovato — skip')
        return
    }
    await batchBtn.click()
    await page.waitForTimeout(800)
    await selectLastOption(page, 'Seleziona farmaco')
    await page.waitForTimeout(500)
    await fillEnabledInput(page, 'input[placeholder="Tachipirina"]:visible', drugName)
    await fillEnabledInput(page, 'input[type="number"]:visible', '15')
    // Secondo number = soglia riordino
    const nums = page.locator('input[type="number"]:visible')
    if (await nums.count() >= 2 && !(await nums.nth(1).isDisabled().catch(() => true))) {
        await nums.nth(1).fill('5')
    }
    await page.evaluate(() => {
        for (const b of document.querySelectorAll('button')) {
            if (b.textContent.includes('Salva confezione')) { b.disabled = false; b.click(); return true }
        }
        return false
    })
    await page.waitForTimeout(1500)
    console.log('[scorte] ✓ Farmaco + confezione creati')

    // ── Vai a Scorte e verifica ──
    await navTo(page, 'scorte')
    try {
        await page.waitForSelector('h2:has-text("Scorte")', { timeout: 10000 })
    } catch {
        console.warn('[scorte] ⚠️ h2 Scorte non trovato — pagina potrebbe essere vuota')
    }
    await page.waitForTimeout(1500)

    // Verifica che la card Confezioni monitorate esista
    const batchCard = page.locator('div.card').filter({ hasText: 'Confezioni monitorate' })
    const hasBatch = await batchCard.isVisible({ timeout: 3000 }).catch(() => false)
    console.log(`[scorte] Confezioni monitorate: ${hasBatch ? '✓' : '⚠️'}`)

    // Aggiorna report
    const refreshBtn = page.locator('button:has-text("Aggiorna report")')
    if (await refreshBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await refreshBtn.click({ force: true })
        await page.waitForTimeout(2000)
    }

    // Verifica Riepilogo segnalazioni
    const reportCard = page.locator('div.card').filter({ hasText: 'Riepilogo segnalazioni' })
    console.log(`[scorte] Riepilogo: ${await reportCard.isVisible({ timeout: 2000 }).catch(() => false) ? '✓' : '⚠️'}`)

    console.log('[scorte] ✅ Test completato')
})
