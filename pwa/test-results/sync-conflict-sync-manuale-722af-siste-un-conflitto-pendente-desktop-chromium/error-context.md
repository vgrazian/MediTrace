# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: sync-conflict.spec.js >> sync manuale blocca upload quando esiste un conflitto pendente
- Location: tests/e2e/sync-conflict.spec.js:214:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('main')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('main')

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
      - text: prova
    - generic [ref=e10]: Password
    - textbox "Password" [ref=e11]:
      - /placeholder: Inserisci password
      - text: Prova1234!
    - button "Accedi" [ref=e12] [cursor=pointer]
  - paragraph [ref=e13]: Password non valida
  - paragraph [ref=e14]:
    - text: "Build: 17/06/2026, 17:28:34"
    - button "⟳ Aggiorna app" [ref=e15] [cursor=pointer]
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test'
  2   | 
  3   | async function loginAsSeededUser(page) {
  4   |     await page.goto('/')
  5   |     const usernameInput = page.locator('#username-input')
  6   |     const registerUsernameInput = page.locator('#reg-username')
  7   |     const homeLink = page.getByRole('link', { name: 'Cruscotto' })
  8   | 
  9   |     await Promise.race([
  10  |         usernameInput.waitFor({ state: 'visible', timeout: 5000 }).catch(() => null),
  11  |         registerUsernameInput.waitFor({ state: 'visible', timeout: 5000 }).catch(() => null),
  12  |         homeLink.waitFor({ state: 'visible', timeout: 5000 }).catch(() => null),
  13  |     ])
  14  | 
  15  |     if (await usernameInput.isVisible()) {
  16  |         await usernameInput.fill('prova')
  17  |         await page.locator('#password-input').fill('Prova1234!')
  18  |         await page.getByRole('button', { name: 'Accedi' }).click()
  19  |     } else if (await registerUsernameInput.isVisible()) {
  20  |         await registerUsernameInput.fill('prova')
  21  |         await page.locator('#reg-first-name').fill('Test')
  22  |         await page.locator('#reg-last-name').fill('Operator')
  23  |         await page.locator('#reg-email').fill('prova@example.com')
  24  |         await page.locator('#reg-password').fill('Prova1234!')
  25  |         await page.locator('#reg-confirm-password').fill('Prova1234!')
  26  |         const githubTokenInput = page.locator('#reg-gh-token')
  27  |         const tokenDisabled = await githubTokenInput.isDisabled().catch(() => false)
  28  |         if (!tokenDisabled) {
  29  |             await githubTokenInput.fill('github_pat_seeded')
  30  |         }
  31  |         await page.getByRole('button', { name: 'Crea account e accedi' }).click()
  32  |     }
  33  | 
> 34  |     await expect(page.locator('main')).toBeVisible()
      |                                        ^ Error: expect(locator).toBeVisible() failed
  35  | }
  36  | 
  37  | async function seedPendingConflict(page) {
  38  |     await page.evaluate(async () => {
  39  |         await new Promise((resolve, reject) => {
  40  |             const request = indexedDB.open('meditrace')
  41  |             request.onerror = () => reject(request.error)
  42  |             request.onsuccess = () => {
  43  |                 const db = request.result
  44  |                 const tx = db.transaction(['therapies', 'settings', 'syncQueue'], 'readwrite')
  45  | 
  46  |                 tx.objectStore('therapies').put({
  47  |                     id: 'therapy-e2e-1',
  48  |                     dosePerSomministrazione: '1',
  49  |                     somministrazioniGiornaliere: 1,
  50  |                     consumoMedioSettimanale: 7,
  51  |                     stockBatchIdPreferito: 'batch-local-1',
  52  |                     dataInizio: '2026-01-01',
  53  |                     dataFine: null,
  54  |                     updatedAt: '2026-04-03T10:00:00.000Z',
  55  |                     deletedAt: null,
  56  |                     syncStatus: 'conflict',
  57  |                 })
  58  | 
  59  |                 tx.objectStore('syncQueue').add({
  60  |                     entityType: 'therapies',
  61  |                     entityId: 'therapy-e2e-1',
  62  |                     operation: 'upsert',
  63  |                     createdAt: '2026-04-04T10:00:00.000Z',
  64  |                 })
  65  | 
  66  |                 tx.objectStore('settings').put({ key: 'datasetVersion', value: 1 })
  67  |                 tx.objectStore('settings').put({
  68  |                     key: 'pendingConflicts',
  69  |                     value: [
  70  |                         {
  71  |                             conflictId: 'therapies:therapy-e2e-1:2026-04-04T10:00:00.000Z',
  72  |                             table: 'therapies',
  73  |                             entityId: 'therapy-e2e-1',
  74  |                             fields: [{ field: 'dosePerSomministrazione', local: '1', remote: '2' }],
  75  |                             localRecord: {
  76  |                                 id: 'therapy-e2e-1',
  77  |                                 dosePerSomministrazione: '1',
  78  |                                 updatedAt: '2026-04-03T10:00:00.000Z',
  79  |                                 syncStatus: 'conflict',
  80  |                             },
  81  |                             remoteRecord: {
  82  |                                 id: 'therapy-e2e-1',
  83  |                                 dosePerSomministrazione: '2',
  84  |                                 updatedAt: '2026-04-04T10:00:00.000Z',
  85  |                                 syncStatus: 'synced',
  86  |                             },
  87  |                             detectedAt: '2026-04-04T10:30:00.000Z',
  88  |                         },
  89  |                     ],
  90  |                 })
  91  | 
  92  |                 tx.onerror = () => reject(tx.error)
  93  |                 tx.oncomplete = () => resolve()
  94  |             }
  95  |         })
  96  |     })
  97  | }
  98  | 
  99  | async function readConflictState(page) {
  100 |     return page.evaluate(async () => {
  101 |         return new Promise((resolve, reject) => {
  102 |             const request = indexedDB.open('meditrace')
  103 |             request.onerror = () => reject(request.error)
  104 |             request.onsuccess = () => {
  105 |                 const db = request.result
  106 |                 const tx = db.transaction(['settings', 'therapies', 'syncQueue'], 'readonly')
  107 |                 const getSettings = tx.objectStore('settings').get('pendingConflicts')
  108 |                 const getTherapy = tx.objectStore('therapies').get('therapy-e2e-1')
  109 |                 const getQueue = tx.objectStore('syncQueue').getAll()
  110 | 
  111 |                 tx.onerror = () => reject(tx.error)
  112 |                 tx.oncomplete = () => {
  113 |                     resolve({
  114 |                         pendingCount: Array.isArray(getSettings.result?.value) ? getSettings.result.value.length : 0,
  115 |                         therapy: getTherapy.result,
  116 |                         queue: getQueue.result ?? [],
  117 |                     })
  118 |                 }
  119 |             }
  120 |         })
  121 |     })
  122 | }
  123 | 
  124 | test.beforeEach(async ({ page }) => {
  125 |     const manifest = {
  126 |         schemaVersion: 1,
  127 |         datasetVersion: 1,
  128 |         exportedAt: '2026-04-04T11:00:00.000Z',
  129 |         updatedByDevice: 'remote-device',
  130 |         checksum: null,
  131 |     }
  132 | 
  133 |     const dataset = {
  134 |         schemaVersion: 1,
```