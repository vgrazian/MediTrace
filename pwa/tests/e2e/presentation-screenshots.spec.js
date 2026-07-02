import { test } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SCREENSHOT_DIR = path.resolve(__dirname, '../../../docs/presentation')

test('capture presentation screenshots with demo data', async ({ page }) => {
  test.setTimeout(120_000)

  await page.goto('/')
  await page.waitForTimeout(2000)

  // Check if already authenticated (nav visible)
  const homeLink = page.getByRole('link', { name: 'Cruscotto' })
  const isAuth = await homeLink.isVisible({ timeout: 5000 }).catch(() => false)

  if (!isAuth) {
    // Login flow
    const usernameInput = page.locator('#username-input')
    if (await usernameInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await usernameInput.fill('admin')
      await page.locator('#password-input').fill('A7!vQ2#kLp9zXw4$eRt6@bY8^sJ0uH3m')
      await page.getByRole('button', { name: 'Accedi' }).click()
      await page.waitForTimeout(3000)
    }
  }

  // Load demo data
  await page.getByRole('link', { name: 'Impostazioni' }).click()
  await page.waitForTimeout(1500)

  const demoBtn = page.getByRole('button', { name: 'Genera dati demo' })
  if (await demoBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await demoBtn.click()
    await page.waitForTimeout(800)
    const c1 = page.getByRole('button', { name: 'Importa dati' })
    if (await c1.isVisible({ timeout: 3000 }).catch(() => false)) { await c1.click(); await page.waitForTimeout(800) }
    const c2 = page.getByRole('button', { name: 'Procedi comunque' })
    if (await c2.isVisible({ timeout: 3000 }).catch(() => false)) { await c2.click(); await page.waitForTimeout(4000) }
  }

  // Screenshots
  const views = [
    { name: 'screen-cruscotto', link: 'Cruscotto' },
    { name: 'screen-ospiti', link: 'Ospiti' },
    { name: 'screen-farmaci', link: 'Farmaci' },
    { name: 'screen-scorte', link: 'Scorte' },
    { name: 'screen-movimenti', link: 'Movimenti' },
    { name: 'screen-terapie', link: 'Terapie' },
    { name: 'screen-promemoria', link: 'Promemoria' },
    { name: 'screen-audit', link: 'Audit' },
  ]

  for (const { name, link } of views) {
    await page.getByRole('link', { name: link }).click()
    await page.waitForTimeout(1500)
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.waitForTimeout(500)
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, `${name}.png`),
      fullPage: false,
    })
  }
})
