# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: offline-performance.spec.js >> @ops offline prolonged session remains usable after login
- Location: tests/e2e/offline-performance.spec.js:204:1

# Error details

```
Error: Navigazione offline fallita per voce menu: Farmaci
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test'
  2   | import { loginOrRegisterSeededUser } from './helpers/login'
  3   | 
  4   | const NAV_ROUTE_BY_LINK = {
  5   |     Farmaci: '/#/farmaci',
  6   |     Scorte: '/#/scorte',
  7   |     Terapie: '/#/terapie',
  8   |     Promemoria: '/#/promemoria',
  9   | }
  10  | 
  11  | async function navigateByMenuWithRetry(page, linkName) {
  12  |     if (!NAV_ROUTE_BY_LINK[linkName]) throw new Error(`Nessuna route fallback per link ${linkName}`)
  13  | 
  14  |     for (let attempt = 0; attempt < 3; attempt += 1) {
  15  |         try {
  16  |             const link = page.getByRole('link', { name: linkName })
  17  |             await link.waitFor({ state: 'visible', timeout: 5000 })
  18  |             await link.click({ timeout: 5000 })
  19  |             await page.waitForTimeout(250)
  20  |             await expect(page.locator('main')).toBeVisible({ timeout: 10000 })
  21  |             return
  22  |         } catch {
> 23  |             if (attempt === 2) throw new Error(`Navigazione offline fallita per voce menu: ${linkName}`)
      |                                      ^ Error: Navigazione offline fallita per voce menu: Farmaci
  24  |             await page.waitForTimeout(300)
  25  |         }
  26  |     }
  27  | }
  28  | 
  29  | async function seedPerformanceBaselineDataset(page) {
  30  |     await page.evaluate(async () => {
  31  |         const nowIso = new Date().toISOString()
  32  | 
  33  |         function makeDrug(index) {
  34  |             return {
  35  |                 id: `perf-drug-${index}`,
  36  |                 principioAttivo: `Principio ${index}`,
  37  |                 classeTerapeutica: 'Test',
  38  |                 scortaMinima: 20,
  39  |                 updatedAt: nowIso,
  40  |                 deletedAt: null,
  41  |                 syncStatus: 'pending',
  42  |             }
  43  |         }
  44  | 
  45  |         function makeBatch(index, drugId) {
  46  |             return {
  47  |                 id: `perf-batch-${index}`,
  48  |                 drugId,
  49  |                 nomeCommerciale: `Batch ${index}`,
  50  |                 quantitaAttuale: 500,
  51  |                 sogliaRiordino: 50,
  52  |                 updatedAt: nowIso,
  53  |                 deletedAt: null,
  54  |                 syncStatus: 'pending',
  55  |             }
  56  |         }
  57  | 
  58  |         function makeHost(index) {
  59  |             return {
  60  |                 id: `perf-host-${index}`,
  61  |                 codiceInterno: `PERF-${String(index).padStart(3, '0')}`,
  62  |                 iniziali: `H${index}`,
  63  |                 nome: `Nome${index}`,
  64  |                 cognome: `Cognome${index}`,
  65  |                 luogoNascita: '',
  66  |                 dataNascita: null,
  67  |                 sesso: '',
  68  |                 codiceFiscale: '',
  69  |                 patologie: 'Monitoraggio',
  70  |                 roomId: null,
  71  |                 bedId: null,
  72  |                 stanza: '',
  73  |                 letto: '',
  74  |                 attivo: true,
  75  |                 updatedAt: nowIso,
  76  |                 deletedAt: null,
  77  |                 syncStatus: 'pending',
  78  |             }
  79  |         }
  80  | 
  81  |         function makeTherapy(index, hostId, drugId, stockBatchId) {
  82  |             return {
  83  |                 id: `perf-therapy-${index}`,
  84  |                 hostId,
  85  |                 drugId,
  86  |                 stockBatchId,
  87  |                 dataInizio: nowIso,
  88  |                 dataFine: null,
  89  |                 dosaggio: '1',
  90  |                 frequenza: '1/die',
  91  |                 dosePerSomministrazione: 1,
  92  |                 somministrazioniGiornaliere: 1,
  93  |                 consumoMedioSettimanale: 7,
  94  |                 attiva: true,
  95  |                 updatedAt: nowIso,
  96  |                 deletedAt: null,
  97  |                 syncStatus: 'pending',
  98  |             }
  99  |         }
  100 | 
  101 |         function makeMovement(index, stockBatchId, hostId, therapyId) {
  102 |             return {
  103 |                 id: `perf-mov-${index}`,
  104 |                 stockBatchId,
  105 |                 hostId,
  106 |                 therapyId,
  107 |                 tipoMovimento: 'SCARICO',
  108 |                 quantita: 1,
  109 |                 dataMovimento: nowIso,
  110 |                 updatedAt: nowIso,
  111 |                 deletedAt: null,
  112 |                 syncStatus: 'pending',
  113 |             }
  114 |         }
  115 | 
  116 |         await new Promise((resolve, reject) => {
  117 |             const request = indexedDB.open('meditrace')
  118 |             request.onerror = () => reject(request.error)
  119 |             request.onsuccess = () => {
  120 |                 const database = request.result
  121 |                 const tx = database.transaction(
  122 |                     ['hosts', 'drugs', 'stockBatches', 'therapies', 'movements'],
  123 |                     'readwrite',
```