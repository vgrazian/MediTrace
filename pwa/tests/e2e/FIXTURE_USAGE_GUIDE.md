# Guide: Using CSV Fixtures in E2E Tests

Questo documento spiega come usare i dati realistici dai CSV fixture nei tuoi test E2E.

## Setup Veloce

### 1. Importa il loader

```javascript
import { loadHostsFromCSV, loadDrugsFromCSV } from './fixtures/testDataLoader.js'
```

### 2. Usa i dati nel test

```javascript
test('my test with realistic data', async ({ page }) => {
  // Carica ospiti
  const hosts = loadHostsFromCSV()
  const firstHost = hosts[0]
  
  // Naviga alla pagina
  await page.goto('/ospiti')
  
  // Verifica che i dati siano visibili
  expect(await page.locator(`text=${firstHost.cognome}`).isVisible()).toBeTruthy()
})
```

## Esempi Completi

### Esempio 1: Test di ricerca ospiti

```javascript
import { test, expect } from '@playwright/test'
import { loadHostsFromCSV } from './fixtures/testDataLoader.js'

test('ospiti view - search with fixture data', async ({ page }) => {
  const hosts = loadHostsFromCSV()
  const targetHost = hosts[4] // Usa il 5° ospite
  
  await page.goto('/ospiti')
  
  // Cerca per cognome
  await page.getByPlaceholder('Cerca...').fill(targetHost.cognome)
  
  // Verifica che appaia
  expect(await page.getByRole('row', { name: targetHost.cognome }).isVisible()).toBeTruthy()
  
  // Verifica i dettagli
  expect(await page.locator(`text=${targetHost.nome}`).isVisible()).toBeTruthy()
  expect(await page.locator(`text=${targetHost.dataNascita}`).isVisible()).toBeTruthy()
})
```

### Esempio 2: Test di creazione da template CSV

```javascript
import { test, expect } from '@playwright/test'
import { getRawCSVContent } from './fixtures/testDataLoader.js'

test('csv import with realistic fixture data', async ({ page }) => {
  const csvContent = getRawCSVContent('persone_test_sanitarie.csv')
  
  await page.goto('/import')
  
  // Carica il file CSV nei fixtures
  const buffer = Buffer.from(csvContent, 'utf-8')
  await page.locator('input[type="file"]').setInputFiles({
    name: 'persone_test_sanitarie.csv',
    mimeType: 'text/csv',
    buffer: buffer,
  })
  
  // Verifica import risultato
  await expect(page.locator('text=30 records importati')).toBeVisible()
})
```

### Esempio 3: Test di gestione farmaci con dati realistici

```javascript
import { test, expect } from '@playwright/test'
import { loadDrugsFromCSV } from './fixtures/testDataLoader.js'

test('farmaci view - edit with fixture data', async ({ page }) => {
  const drugs = loadDrugsFromCSV()
  const testDrug = drugs[0]
  
  await page.goto('/farmaci')
  
  // Cerca il farmaco
  await page.getByPlaceholder('Cerca...').fill(testDrug.marca)
  
  // Clicca modifica
  await page.getByRole('button', { name: 'Modifica' }).first().click()
  
  // Modifica il nome
  const newName = testDrug.principioAttivo + ' - Updated'
  await page.getByLabel('Principio attivo').fill(newName)
  
  // Salva
  await page.getByRole('button', { name: 'Salva' }).click()
  
  // Verifica
  expect(await page.locator(`text=${newName}`).isVisible()).toBeTruthy()
})
```

### Esempio 4: Test di combinazione ospiti + farmaci

```javascript
import { test, expect } from '@playwright/test'
import { loadHostsFromCSV, loadDrugsFromCSV } from './fixtures/testDataLoader.js'

test('terapie view - assign drug to host with fixtures', async ({ page }) => {
  const hosts = loadHostsFromCSV()
  const drugs = loadDrugsFromCSV()
  
  const host = hosts[0]
  const drug = drugs[0]
  
  await page.goto('/terapie')
  
  // Crea nuova terapia
  await page.getByRole('button', { name: 'Nuova terapia' }).click()
  
  // Seleziona ospite
  await page.getByLabel('Ospite').click()
  await page.getByRole('option', { name: `${host.cognome} ${host.nome}` }).click()
  
  // Seleziona farmaco
  await page.getByLabel('Farmaco').click()
  await page.getByRole('option', { name: drug.principioAttivo }).click()
  
  // Salva
  await page.getByRole('button', { name: 'Salva' }).click()
  
  // Verifica
  expect(await page.locator('text=Terapia creata').isVisible()).toBeTruthy()
})
```

### Esempio 5: Test con subset di dati

```javascript
import { test, expect } from '@playwright/test'
import { loadHostsFromCSV } from './fixtures/testDataLoader.js'

test('ospiti view - bulk actions with limited fixtures', async ({ page }) => {
  const allHosts = loadHostsFromCSV()
  const hosts = allHosts.slice(0, 5) // Usa solo i primi 5
  
  await page.goto('/ospiti')
  
  // Seleziona i primi 5
  for (const host of hosts) {
    await page.getByRole('checkbox', { name: host.codiceInterno }).check()
  }
  
  // Esegui azione bulk
  await page.getByRole('button', { name: 'Esporta selezionati' }).click()
  
  // Verifica che il download sia stato creato
  const downloadPromise = page.waitForEvent('download')
  // ...
})
```

## Tips & Tricks

### Filtrare dati per caratteristiche

```javascript
const hosts = loadHostsFromCSV()

// Ospiti con patologie specifiche
const cardiaci = hosts.filter(h => h.patologie.includes('cardiaca'))

// Ospiti nati in città specifica
const torinesi = hosts.filter(h => h.luogoNascita === 'Torino')

// Ospiti più anziani (data nascita prima del 1950)
const over70 = hosts.filter(h => new Date(h.dataNascita).getFullYear() < 1950)
```

### Generare dati dinamicamente

```javascript
const hosts = loadHostsFromCSV()

// Crea una mappa per lookup veloce
const hostsByCode = Object.fromEntries(
  hosts.map(h => [h.codiceInterno, h])
)

const host = hostsByCode['H001']
```

### Test parametrizzati con fixture data

```javascript
import { test, expect } from '@playwright/test'
import { loadHostsFromCSV } from './fixtures/testDataLoader.js'

const hosts = loadHostsFromCSV()

// Crea un test per ogni ospite (primi 3 solo per velocità)
for (const host of hosts.slice(0, 3)) {
  test(`ospiti - search for ${host.cognome}`, async ({ page }) => {
    await page.goto('/ospiti')
    await page.getByPlaceholder('Cerca...').fill(host.cognome)
    expect(await page.locator(`text=${host.cognome}`).isVisible()).toBeTruthy()
  })
}
```

## Dataset disponibili

I tuoi CSV contengono:

**persone_test_sanitarie.csv**

- 30 ospiti con nomi realistici italiani
- Dati demografici completi (data nascita, luogo, CF)
- Patologie mediche differenziate

**farmaci_test_sanitari.csv**

- 30 farmaci con marche farmaceutiche reali
- Principi attivi pertinenti alle patologie degli ospiti

## Performance Notes

- `loadHostsFromCSV()` legge e parsa il file ogni volta (~2-5ms)
- Per test con molte iterazioni, cache il risultato:

  ```javascript
  const hosts = loadHostsFromCSV() // Una sola volta
  test('test 1', () => { /* usa hosts */ })
  test('test 2', () => { /* usa hosts */ })
  ```

## Aggiungere nuovi CSV

Se aggiungi nuovi CSV fixture:

1. Metti il file in `pwa/tests/e2e/fixtures/`
2. Aggiungi una funzione helper in `testDataLoader.js`
3. Usa come gli altri: `loadMyDataFromCSV()`

Esempio:

```javascript
export function loadMovimentiFromCSV() {
  const csvPath = path.join(__dirname, 'movimenti_test.csv')
  const csvContent = fs.readFileSync(csvPath, 'utf-8')
  const rows = parseCSV(csvContent)
  
  return rows.map(row => ({
    id: randomUUID(),
    // Mappa i campi...
  }))
}
```

## Debugging CSV Data

```javascript
import { loadHostsFromCSV } from './fixtures/testDataLoader.js'

const hosts = loadHostsFromCSV()

// Stampa il primo ospite
console.log('First host:', JSON.stringify(hosts[0], null, 2))

// Stampa i cognomi
console.log('Cognomi:', hosts.map(h => h.cognome))

// Stampa statistiche
console.log('Total hosts:', hosts.length)
console.log('Locations:', new Set(hosts.map(h => h.luogoNascita)).size)
```
