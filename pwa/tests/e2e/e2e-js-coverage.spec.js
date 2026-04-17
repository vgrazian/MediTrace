import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { test, expect } from '@playwright/test'
import v8toIstanbul from 'v8-to-istanbul'
import istanbulCoverage from 'istanbul-lib-coverage'
import istanbulReport from 'istanbul-lib-report'
import istanbulReports from 'istanbul-reports'
import { loginOrRegisterSeededUser } from './helpers/login.js'

const { createCoverageMap } = istanbulCoverage
const { createContext } = istanbulReport
const createReport = istanbulReports.create

const SPEC_DIR = path.dirname(fileURLToPath(import.meta.url))
const PWA_ROOT = path.resolve(SPEC_DIR, '../..')
const OUTPUT_DIR = path.join(PWA_ROOT, 'coverage', 'e2e-js')
const RAW_FILE = path.join(OUTPUT_DIR, 'raw-v8-coverage.json')
const SUMMARY_FILE = path.join(OUTPUT_DIR, 'coverage-summary.json')

function sanitizeUrl(value) {
    return String(value || '').split('#')[0].trim()
}

function resolveWorkspacePathFromUrl(urlValue) {
    if (!urlValue) return null

    let parsed
    try {
        parsed = new URL(urlValue)
    } catch {
        return null
    }

    const pathname = decodeURIComponent(parsed.pathname || '')
    if (!pathname) return null

    if (pathname.startsWith('/@fs/')) {
        return pathname.replace(/^\/@fs\//, '/')
    }

    if (pathname.startsWith('/src/')) {
        return path.join(PWA_ROOT, pathname.slice(1))
    }

    return null
}

async function buildCoverageReport(entries) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true })
    fs.writeFileSync(RAW_FILE, `${JSON.stringify(entries, null, 2)}\n`, 'utf8')

    const coverageMap = createCoverageMap({})

    for (const entry of entries) {
        const scriptUrl = sanitizeUrl(entry?.url)
        const filePath = resolveWorkspacePathFromUrl(scriptUrl)
        if (!filePath || !fs.existsSync(filePath)) continue

        const converter = v8toIstanbul(filePath, 0, {
            source: String(entry.source || ''),
        })

        await converter.load()
        converter.applyCoverage(Array.isArray(entry.functions) ? entry.functions : [])
        coverageMap.merge(converter.toIstanbul())
    }

    const context = createContext({
        dir: OUTPUT_DIR,
        coverageMap,
    })

    createReport('json-summary').execute(context)
    createReport('lcovonly').execute(context)
    createReport('text-summary').execute(context)

    if (!fs.existsSync(SUMMARY_FILE)) {
        throw new Error('coverage-summary.json non generato')
    }

    const summary = JSON.parse(fs.readFileSync(SUMMARY_FILE, 'utf8'))
    return summary.total || null
}

test('collects deterministic E2E JS coverage metrics', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'La JS coverage Playwright e disponibile solo su Chromium')

    await page.coverage.startJSCoverage({
        resetOnNavigation: false,
        reportAnonymousScripts: false,
    })

    await page.goto('/')
    await loginOrRegisterSeededUser(page)

    await page.getByRole('link', { name: 'Farmaci' }).click()
    await expect(page.getByRole('heading', { name: 'Catalogo Farmaci' })).toBeVisible()

    const panel = page.locator('details:has(summary:has-text("Gestisci Farmaci"))')
    const addButton = page.locator('.card', { hasText: 'Farmaci registrati' }).getByRole('button', { name: 'Aggiungi' })
    await addButton.click()
    await expect(panel).toHaveAttribute('open', '')
    await page.getByRole('button', { name: 'Annulla' }).click()
    await expect(panel).not.toHaveAttribute('open', '')
    await expect(page.getByRole('heading', { name: 'Catalogo Farmaci' })).toBeVisible()

    await page.getByRole('link', { name: 'Cruscotto' }).click()
    await expect(page.getByRole('heading', { name: 'Cruscotto' })).toBeVisible()

    const entries = await page.coverage.stopJSCoverage()
    const total = await buildCoverageReport(entries)

    expect(total).toBeTruthy()
    expect(Number(total.lines?.pct || 0)).toBeGreaterThan(0)
    expect(Number(total.branches?.pct || 0)).toBeGreaterThanOrEqual(0)
})
