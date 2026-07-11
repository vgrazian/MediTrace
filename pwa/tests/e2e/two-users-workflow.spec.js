import { test, expect } from '@playwright/test'
import { loginOrRegisterSeededUser } from './helpers/login'

test('cross-device: create and delete drug', async ({ browser }) => {
    const ctxA = await browser.newContext()
    const ctxB = await browser.newContext()
    const devA = await ctxA.newPage()
    const devB = await ctxB.newPage()

    await devA.goto('/?v=devA-' + Date.now())
    await loginOrRegisterSeededUser(devA)
    await devB.goto('/?v=devB-' + Date.now())
    await loginOrRegisterSeededUser(devB)

    const drugName = `Test-Drug-${Date.now()}`

    await devA.click('a:has-text("Farmaci")')
    await devA.waitForTimeout(1000)
    const addBtn = devA.locator('button:has-text("Aggiungi")')
    if (await addBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await addBtn.click()
        await devA.waitForTimeout(1000)
        const input = devA.locator('input[placeholder*="principio"]').first()
        if (await input.isVisible({ timeout: 2000 }).catch(() => false)) {
            await input.fill(drugName)
        }
        await devA.click('button:has-text("Salva")')
        await devA.waitForTimeout(2000)
    }

    await devB.click('a:has-text("Farmaci")')
    await devB.waitForTimeout(1000)
    await devB.click('button[aria-label="Sincronizza"]')
    await devB.waitForTimeout(3000)

    const rowA = devA.locator('td').filter({ hasText: drugName })
    if (await rowA.isVisible({ timeout: 3000 }).catch(() => false)) {
        await devA.locator('tr', { has: rowA }).locator('button:has-text("Elimina")').click()
        await devA.waitForTimeout(500)
        const conf = devA.locator('button:has-text("Conferma")')
        if (await conf.isVisible({ timeout: 2000 }).catch(() => false)) {
            await conf.click()
            await devA.waitForTimeout(1000)
        }
    }

    await devB.click('button[aria-label="Sincronizza"]')
    await devB.waitForTimeout(3000)
    await expect(devB.locator('td').filter({ hasText: drugName })).not.toBeVisible({ timeout: 8000 })

    await ctxA.close()
    await ctxB.close()
})
