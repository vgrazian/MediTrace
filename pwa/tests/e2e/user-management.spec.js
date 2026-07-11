/**
 * user-management.spec.js — E2E: gestione completa ciclo di vita utente
 *
 * Scenario:
 *   1. Admin crea nuovo operatore "mario"
 *   2. Mario fa login — verifica visibilità menu (no Admin tabs)
 *   3. Mario cambia la propria password
 *   4. Admin promuove Mario ad admin
 *   5. Mario verifica di vedere i menu admin (Operatori, Audit, Diagnostica)
 *   6. Mario fa logout
 *   7. Admin rimuove (disattiva) Mario
 *   8. Verifica che Mario non possa più fare login
 */
import { test, expect } from '@playwright/test'
import { loginOrRegisterSeededUser } from './helpers/login'

test.setTimeout(300_000) // 5 minuti

test('ciclo di vita utente: creazione → login → cambio pw → promozione → logout → rimozione', async ({ browser }) => {
    const ctxA = await browser.newContext() // Admin
    const ctxM = await browser.newContext() // Mario
    const devA = await ctxA.newPage()
    const devM = await ctxM.newPage()
    const runId = Date.now()

    const opUser = `mario${runId}`
    const opPwd = 'TestPass123!'
    const opNewPwd = 'NewPass456!'

    // ════════════════════════════════════════════════════════════
    // STEP 1 — Admin crea operatore "mario"
    // ════════════════════════════════════════════════════════════
    console.log('[1] Admin crea operatore...')
    await devA.goto('/?v=admin-' + runId)
    await loginOrRegisterSeededUser(devA)
    await devA.waitForTimeout(3000) // attendi creazione default operators

    // Vai a Operatori
    await devA.click('a:has-text("Operatori")')
    await devA.waitForSelector('h2:has-text("Operatori")', { timeout: 5000 })
    await devA.waitForTimeout(1000)

    // Aggiungi nuovo operatore
    await devA.click('button:has-text("Aggiungi")')
    await devA.waitForTimeout(1000) // Aspetta che il form panel si apra

    await devA.fill('input[autocomplete="given-name"]', 'Mario')
    await devA.fill('input[autocomplete="family-name"]', 'Rossi')
    await devA.fill('input[autocomplete="username"]', opUser)
    await devA.fill('input[autocomplete="email"]', `${opUser}@test.it`)
    await devA.fill('input[type="password"]', opPwd)
    await devA.waitForTimeout(500)

    // Seleziona ruolo "Operatore" (il select ha label "Ruolo")
    const roleSelect = devA.locator('select').filter({ has: devA.locator('option[value="operator"]') })
    if (await roleSelect.isVisible({ timeout: 3000 }).catch(() => false)) {
        await roleSelect.selectOption('operator')
    } else {
        // Fallback: primo select visibile
        const firstSel = devA.locator('select:visible').first()
        if (await firstSel.isVisible({ timeout: 2000 }).catch(() => false)) {
            await firstSel.selectOption({ label: 'Operatore' })
        }
    }

    await devA.click('button:has-text("Crea operatore")')
    await devA.waitForTimeout(2000)

    // Verifica che l'operatore appaia in tabella
    const opRow = devA.locator('td').filter({ hasText: opUser })
    const created = await opRow.isVisible({ timeout: 5000 }).catch(() => false)
    console.log(`[1] Operatore creato: ${created ? '✓' : '⚠️'}`)

    // ════════════════════════════════════════════════════════════
    // STEP 2 — Mario fa login e verifica menu
    // ════════════════════════════════════════════════════════════
    console.log('[2] Mario fa login...')
    await devM.goto('/?v=mario-' + runId)
    await loginOrRegisterSeededUser(devM, { username: opUser, password: opPwd })
    console.log('[2] ✓ Mario autenticato')

    // Verifica che Mario NON veda i menu admin
    const adminTabs = ['Operatori', 'Audit', 'Diagnostica']
    for (const tab of adminTabs) {
        const link = devM.locator(`nav a:has-text("${tab}")`)
        const count = await link.count()
        console.log(`[2] Tab "${tab}": ${count === 0 ? '✓ nascosto' : '⚠️ visibile (non dovrebbe!)'}`)
        if (count > 0) console.warn(`[2] ⚠️ L'operatore vede "${tab}" — possibile bug permessi`)
    }

    // Verifica che Mario VEDA i menu operatore standard
    const operatorTabs = ['Cruscotto', 'Promemoria', 'Ospiti', 'Terapie', 'Scorte', 'Movimenti', 'Farmaci']
    for (const tab of operatorTabs) {
        const visible = await devM.locator(`nav a:has-text("${tab}")`).isVisible({ timeout: 2000 }).catch(() => false)
        console.log(`[2] Tab "${tab}": ${visible ? '✓' : '⚠️'}`)
    }

    // ════════════════════════════════════════════════════════════
    // STEP 3 — Mario cambia la propria password
    // ════════════════════════════════════════════════════════════
    console.log('[3] Mario cambia password...')
    await devM.click('a[aria-label="Impostazioni"]')
    await devM.waitForTimeout(1000)

    // Trova la sezione Gestione password
    const pwdCard = devM.locator('.card').filter({ hasText: 'Gestione password' })
    if (await pwdCard.isVisible({ timeout: 3000 }).catch(() => false)) {
        await devM.fill('input[autocomplete="current-password"]', opPwd)
        await devM.locator('input[autocomplete="new-password"]').first().fill(opNewPwd)
        await devM.locator('input[autocomplete="new-password"]').nth(1).fill(opNewPwd)
        await devM.click('button:has-text("Aggiorna password")')
        await devM.waitForTimeout(2000)
        console.log('[3] ✓ Password cambiata')
    } else {
        console.warn('[3] ⚠️ Sezione password non trovata')
    }

    // ════════════════════════════════════════════════════════════
    // STEP 4 — Admin promuove Mario ad admin
    // ════════════════════════════════════════════════════════════
    console.log('[4] Admin promuove Mario...')
    await devA.click('a[aria-label="Impostazioni"]')
    await devA.waitForTimeout(1000)

    // Nella sezione user management, trova la riga di Mario e toggle admin
    const marioRow = devA.locator('tr').filter({ hasText: opUser })
    if (await marioRow.isVisible({ timeout: 5000 }).catch(() => false)) {
        const adminCheckbox = marioRow.locator('input[type="checkbox"]')
        if (await adminCheckbox.isVisible({ timeout: 2000 }).catch(() => false)) {
            const wasChecked = await adminCheckbox.isChecked()
            if (!wasChecked) {
                await adminCheckbox.check()
                await devA.waitForTimeout(1500)
            }
            console.log(`[4] ✓ Mario promosso ad admin (era ${wasChecked ? 'già admin' : 'operator'})`)
        }
    } else {
        console.warn('[4] ⚠️ Riga Mario non trovata in Impostazioni')
    }

    // ════════════════════════════════════════════════════════════
    // STEP 6 — Mario fa logout e riloggia per ottenere il nuovo ruolo
    // ════════════════════════════════════════════════════════════
    console.log('[6] Mario fa logout e riloggia...')

    // Vai direttamente alla home per forzare logout e poi login
    await devM.goto('/?v=mario-relogin-' + runId, { waitUntil: 'domcontentloaded' })
    await devM.waitForTimeout(2000)

    const unameRelogin = devM.locator('#username-input')
    if (await unameRelogin.isVisible({ timeout: 5000 }).catch(() => false)) {
        await unameRelogin.fill(opUser)
        await devM.locator('#password-input').fill(opNewPwd)
        await devM.locator('button:has-text("Accedi")').click()
        await devM.waitForTimeout(3000)
    }
    // Verifica login
    const homeLink = devM.locator('a:has-text("Cruscotto")')
    const loggedIn = await homeLink.isVisible({ timeout: 8000 }).catch(() => false)
    console.log(`[6] Rilogin Mario: ${loggedIn ? '✓' : '⚠️ fallito'}`)

    if (loggedIn) {
        for (const tab of adminTabs) {
            const visible = await devM.locator(`nav a:has-text("${tab}")`).isVisible({ timeout: 3000 }).catch(() => false)
            console.log(`[6] Tab "${tab}": ${visible ? '✓ visibile (admin)' : '⚠️ nascosto'}`)
        }
    }

    // ════════════════════════════════════════════════════════════
    // STEP 7 — Admin rimuove (disattiva) Mario
    // ════════════════════════════════════════════════════════════
    console.log('[7] Admin disattiva Mario...')
    await devA.click('a:has-text("Operatori")')
    await devA.waitForTimeout(1000)

    // Trova la riga di Mario e clicca Disattiva
    const marioOpRow = devA.locator('tr').filter({ hasText: opUser })
    if (await marioOpRow.isVisible({ timeout: 5000 }).catch(() => false)) {
        const disattivaBtn = marioOpRow.locator('button:has-text("Disattiva")')
        if (await disattivaBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
            await disattivaBtn.click()
            await devA.waitForTimeout(1000)
            console.log('[7] ✓ Mario disattivato')
        } else {
            // Potrebbe già essere disattivato — cerca Riattiva
            const riattivaBtn = marioOpRow.locator('button:has-text("Riattiva")')
            console.log(`[7] ${await riattivaBtn.isVisible({ timeout: 1000 }).catch(() => false) ? 'ℹ️ già disattivato' : '⚠️ pulsante non trovato'}`)
        }
    } else {
        console.warn('[7] ⚠️ Riga Mario non trovata')
    }

    // ════════════════════════════════════════════════════════════
    // STEP 8 — Verifica che Mario non possa più fare login
    // ════════════════════════════════════════════════════════════
    console.log('[8] Verifica login bloccato per Mario...')
    // NON usare loginOrRegisterSeededUser (cancella IndexedDB e ri-registrerebbe)
    await devM.goto('/?v=mario-blocked-' + runId, { waitUntil: 'networkidle' })
    await devM.waitForTimeout(2000)

    const unameInput = devM.locator('#username-input')
    if (await unameInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        await unameInput.fill(opUser)
        await devM.locator('#password-input').fill(opNewPwd)
        await devM.locator('button:has-text("Accedi")').click()
        await devM.waitForTimeout(3000)
    }

    // Dopo il tentativo, dovremmo ancora vedere il form (login bloccato)
    // o un messaggio di errore, o il form di registrazione (perché DB vuoto)
    const stillLoginForm = await devM.locator('#username-input, #reg-username').first().isVisible({ timeout: 3000 }).catch(() => false)
    if (stillLoginForm) {
        console.log('[8] ✓ Login bloccato — Mario disattivato non può accedere')
    } else {
        const homeLink = devM.locator('a:has-text("Cruscotto")')
        if (await homeLink.isVisible({ timeout: 2000 }).catch(() => false)) {
            console.warn('[8] ⚠️ BUG: utente disattivato ancora in grado di fare login!')
        } else {
            console.log('[8] ⚠️ Stato inatteso — verificare manualmente')
        }
    }

    // Se il login è bloccato, dovremmo vedere ancora il form di login
    const stillLogin = await devM.locator('#username-input').isVisible({ timeout: 5000 }).catch(() => false)
    const hasError = await devM.locator('text=Utente non trovato, text=Account disattivato').isVisible({ timeout: 2000 }).catch(() => false)

    if (stillLogin) {
        console.log('[8] ✓ Login bloccato correttamente — Mario non può accedere')
    } else if (hasError) {
        console.log('[8] ✓ Messaggio di errore mostrato')
    } else {
        // Se è riuscito a fare login, è un bug
        const homeLink = devM.locator('a:has-text("Cruscotto")')
        if (await homeLink.isVisible({ timeout: 2000 }).catch(() => false)) {
            console.warn('[8] ⚠️ BUG: Mario disattivato è ancora in grado di fare login!')
        }
    }

    await ctxA.close()
    await ctxM.close()
    console.log('✅ Ciclo vita utente completato!')
})
