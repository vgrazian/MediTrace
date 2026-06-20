# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: sync-indicator.spec.js >> Indicatore stato sincronizzazione >> Mostra "In attesa" se ci sono modifiche da sincronizzare
- Location: tests/e2e/sync-indicator.spec.js:19:5

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.getAttribute: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('.sync-indicator')

```

# Page snapshot

```yaml
- generic [ref=e4]:
  - heading "MediTrace" [level=1] [ref=e5]
  - paragraph [ref=e6]: Accesso con utenza e password
  - generic [ref=e7]:
    - generic [ref=e8]: Username
    - textbox "Username" [ref=e9]:
      - /placeholder: Inserisci username
    - generic [ref=e10]: Password
    - textbox "Password" [ref=e11]:
      - /placeholder: Inserisci password
    - button "Accedi" [disabled] [ref=e12]
  - paragraph [ref=e13]:
    - text: "Build: 17/06/2026, 17:28:34"
    - button "⟳ Aggiorna app" [ref=e14] [cursor=pointer]
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test'
  2  | 
  3  | // Percorsi e testi in italiano coerenti con la UI
  4  | const SYNC_SELECTOR = '.sync-indicator'
  5  | 
  6  | // Helper per simulare offline
  7  | async function goOffline(page) {
  8  |     await page.route('**/*', route => route.abort())
  9  | }
  10 | 
  11 | test.describe('Indicatore stato sincronizzazione', () => {
  12 |     test('Mostra "Sincronizzato" quando tutto è aggiornato', async ({ page }) => {
  13 |         await page.goto('/')
  14 |         await page.waitForSelector(SYNC_SELECTOR)
  15 |         const tooltip = await page.getAttribute(SYNC_SELECTOR, 'title')
  16 |         expect(tooltip).toContain('Tutti i dati sono sincronizzati')
  17 |     })
  18 | 
  19 |     test('Mostra "In attesa" se ci sono modifiche da sincronizzare', async ({ page }) => {
  20 |         await page.goto('/')
  21 |         // Simula una modifica in coda
  22 |         await page.evaluate(() => window.db && window.db.syncQueue.add({ entityType: 'hosts', entityId: 'test', operation: 'upsert', createdAt: new Date().toISOString() }))
  23 |         await page.waitForTimeout(2100)
> 24 |         const tooltip = await page.getAttribute(SYNC_SELECTOR, 'title')
     |                                    ^ Error: page.getAttribute: Test timeout of 30000ms exceeded.
  25 |         expect(tooltip).toContain('in attesa')
  26 |     })
  27 | 
  28 |     test('Mostra "Conflitto" se ci sono conflitti', async ({ page }) => {
  29 |         await page.goto('/')
  30 |         // Simula conflitto
  31 |         await page.evaluate(() => window.db && window.db.settings.put({ key: 'pendingConflicts', value: [{ conflictId: 'c1' }] }))
  32 |         await page.waitForTimeout(2100)
  33 |         const tooltip = await page.getAttribute(SYNC_SELECTOR, 'title')
  34 |         expect(tooltip).toContain('conflitti da risolvere')
  35 |     })
  36 | 
  37 |     test('Mostra "Offline" se il browser è offline', async ({ page, context }) => {
  38 |         await page.goto('/')
  39 |         await context.setOffline(true)
  40 |         await page.waitForTimeout(2100)
  41 |         const tooltip = await page.getAttribute(SYNC_SELECTOR, 'title')
  42 |         expect(tooltip).toContain('offline')
  43 |         await context.setOffline(false)
  44 |     })
  45 | })
  46 | 
```