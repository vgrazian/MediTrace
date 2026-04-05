# Test Data Fixtures

Questa cartella contiene fixture realistiche per test E2E.
La sorgente principale è ora un dataset JSON condiviso con la seed reale della PWA.

## File disponibili

- **realisticDataset.json** (in `src/data/`) – dataset realistico principale
  - 20 stanze, 60 letti, 60 ospiti, 81 terapie

- **persone_test_sanitarie.csv** – CSV di supporto storico
  - nome, cognome, data_nascita, luogo_nascita, codice_fiscale, patologia
  
- **farmaci_test_sanitari.csv** – 30 farmaci realistici (sorgente farmaci)
  - marca, farmaco (principio attivo)

## Utilizzo

### 1. Caricare ospiti in test

```javascript
import { loadHostsFromCSV } from './fixtures/testDataLoader.js'

test('ospiti scenario', () => {
  const hosts = loadHostsFromCSV()
  
  console.log(hosts[0])
  // {
  //   id: 'uuid-...',
  //   codiceInterno: 'OSP-001',
  //   nome: 'Carlo',
  //   cognome: 'Russo',
  //   luogoNascita: '',
  //   dataNascita: null,
  //   codiceFiscale: 'ABCDEF10A01A100A' (fittizio),
  //   patologie: 'Parkinson',
  //   ...
  // }
})
```

### 2. Caricare farmaci in test

```javascript
import { loadDrugsFromCSV } from './fixtures/testDataLoader.js'

test('farmaci scenario', () => {
  const drugs = loadDrugsFromCSV()
  
  console.log(drugs[0])
  // {
  //   id: 'uuid-...',
  //   marca: 'Pfizer',
  //   principioAttivo: 'Donepezil',
  //   classeTerapeutica: 'Generico',
  //   ...
  // }
})
```

### 3. Leggere CSV raw per upload

```javascript
import { getRawCSVContent } from './fixtures/testDataLoader.js'

test('csv upload scenario', () => {
  const csvContent = getRawCSVContent('persone_test_sanitarie.csv')
  // Passare al sistema di upload...
})
```

### 4. Seed completo nel DB IndexedDB

```javascript
import { seedTestData } from './fixtures/testDataLoader.js'

test('test with seeded database', async ({ page }) => {
  // Seed 10 ospiti e 15 farmaci nel DB
  const data = await seedTestData(page, {
    hostsEnabled: true,
    drugsEnabled: true,
    maxHosts: 10,
    maxDrugs: 15,
  })
  
  console.log(data.hosts)  // Array di 10 ospiti
  console.log(data.drugs) // Array di 15 farmaci
})
```

## Struttura dati

### Host (ospite)

```javascript
{
  id: string (UUID),
  codiceInterno: string (OSP-001, OSP-002, ...)
  iniziali: string (2 chars)
  nome: string
  cognome: string
  luogoNascita: string (può essere vuoto)
  dataNascita: string|null
  sesso: string (M/F/Altro)
  codiceFiscale: string
  patologie: string
  attivo: boolean
  roomId: null
  bedId: null
  updatedAt: string (ISO 8601)
  syncStatus: string (pending/synced)
}
```

### Drug (farmaco)

```javascript
{
  id: string (UUID),
  marca: string
  principioAttivo: string
  classeTerapeutica: string (Generico)
  updatedAt: string (ISO 8601)
  syncStatus: string (pending/synced)
}
```

## Aggiorna dataset realistico

Per aggiornare i dati test realistici:

1. Sostituisci/aggiorna `pwa/src/data/realisticDataset.json`
2. Verifica schema minimo: `rooms`, `beds`, `hosts`, `therapies`
3. Esegui `npm --prefix pwa run test:e2e -- tests/e2e/fixtures.spec.js`

## Note

- Tutti gli ospiti hanno `uuid` runtime nei test
- Il `codiceInterno` segue pattern OSP-001, OSP-002, etc.
- I CF nei test sono fittizi e generati automaticamente
- Le terapie riflettono frequenze realistiche (`1 volta/die`, `2 volte/die`, `ogni 8 ore`, `al bisogno`)
