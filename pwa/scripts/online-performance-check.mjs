import fs from 'node:fs'
import path from 'node:path'
import { chromium } from '@playwright/test'

const SITE_URL = String(process.env.SITE_URL || process.argv[2] || '').trim()
const REPORT_FILE = String(process.env.REPORT_FILE || '').trim()
const HEADLESS = String(process.env.HEADLESS || '1') !== '0'
const MAX_DOM_CONTENT_LOADED_MS = Number.parseInt(process.env.MAX_DOM_CONTENT_LOADED_MS || '3000', 10)
const MAX_LOAD_EVENT_MS = Number.parseInt(process.env.MAX_LOAD_EVENT_MS || '5000', 10)
const MAX_FIRST_CONTENTFUL_PAINT_MS = Number.parseInt(process.env.MAX_FIRST_CONTENTFUL_PAINT_MS || '2500', 10)
const MAX_TOTAL_TRANSFER_KB = Number.parseInt(process.env.MAX_TOTAL_TRANSFER_KB || '1500', 10)

if (!SITE_URL) {
    throw new Error('SITE_URL obbligatorio. Esempio: SITE_URL=https://vgrazian.github.io/MediTrace/ npm run test:online-performance')
}

function writeReport(report) {
    if (!REPORT_FILE) return
    const reportDir = path.dirname(REPORT_FILE)
    if (reportDir && reportDir !== '.') {
        fs.mkdirSync(reportDir, { recursive: true })
    }
    fs.writeFileSync(REPORT_FILE, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
}

function assertBudget(name, value, budget) {
    if (Number.isFinite(value) && value > budget) {
        throw new Error(`${name} oltre budget: ${value}ms > ${budget}ms`)
    }
}

async function main() {
    const browser = await chromium.launch({ headless: HEADLESS })
    const context = await browser.newContext()
    const page = await context.newPage()

    try {
        await page.goto(SITE_URL, { waitUntil: 'load' })
        await page.locator('#app-root').waitFor({ state: 'visible', timeout: 20000 })

        const metrics = await page.evaluate(() => {
            const navigation = performance.getEntriesByType('navigation')[0]
            const resources = performance.getEntriesByType('resource')
            const firstContentfulPaint = performance.getEntriesByName('first-contentful-paint')[0]
            const jsResources = resources.filter(entry => entry.name.endsWith('.js'))
            const cssResources = resources.filter(entry => entry.name.endsWith('.css'))
            const totalTransferBytes = resources.reduce((sum, entry) => sum + (entry.transferSize || 0), 0)

            return {
                domContentLoadedMs: Math.round(navigation?.domContentLoadedEventEnd || 0),
                loadEventMs: Math.round(navigation?.loadEventEnd || 0),
                firstContentfulPaintMs: firstContentfulPaint ? Math.round(firstContentfulPaint.startTime) : null,
                jsResourceCount: jsResources.length,
                cssResourceCount: cssResources.length,
                totalTransferKb: Math.round(totalTransferBytes / 1024),
                jsTransferKb: Math.round(jsResources.reduce((sum, entry) => sum + (entry.transferSize || 0), 0) / 1024),
                cssTransferKb: Math.round(cssResources.reduce((sum, entry) => sum + (entry.transferSize || 0), 0) / 1024),
            }
        })

        assertBudget('domContentLoaded', metrics.domContentLoadedMs, MAX_DOM_CONTENT_LOADED_MS)
        assertBudget('loadEvent', metrics.loadEventMs, MAX_LOAD_EVENT_MS)
        assertBudget('firstContentfulPaint', metrics.firstContentfulPaintMs, MAX_FIRST_CONTENTFUL_PAINT_MS)
        if (Number.isFinite(metrics.totalTransferKb) && metrics.totalTransferKb > MAX_TOTAL_TRANSFER_KB) {
            throw new Error(`transfer size oltre budget: ${metrics.totalTransferKb}KB > ${MAX_TOTAL_TRANSFER_KB}KB`)
        }

        const report = {
            siteUrl: SITE_URL,
            measuredAt: new Date().toISOString(),
            budgets: {
                maxDomContentLoadedMs: MAX_DOM_CONTENT_LOADED_MS,
                maxLoadEventMs: MAX_LOAD_EVENT_MS,
                maxFirstContentfulPaintMs: MAX_FIRST_CONTENTFUL_PAINT_MS,
                maxTotalTransferKb: MAX_TOTAL_TRANSFER_KB,
            },
            metrics,
        }

        writeReport(report)
        console.log('[online-perf] PASS')
        console.log(JSON.stringify(report, null, 2))
    } finally {
        await context.close().catch(() => null)
        await browser.close().catch(() => null)
    }
}

main().catch(error => {
    console.error('[online-perf] FAIL', error.message)
    process.exitCode = 1
})