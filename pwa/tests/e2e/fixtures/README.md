# Test Data Fixtures

Questa cartella contiene dati realistici in CSV per test E2E.

## File disponibili

- **persone_test_sanitarie.csv** – 30 ospiti con dati anagrafi realistici
  - nome, cognome, data_nascita, luogo_nascita, codice_fiscale, patologia
  
- **farmaci_test_sanitari.csv** – 30 farmaci realistici
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
  //   codiceInterno: 'H001',
  //   nome: 'Carlo',
  //   cognome: 'Russo',
  //   luogoNascita: 'Torino',
  //   dataNascita: '1941-12-07',
  //   codiceFiscale: 'RSSCRL41T07L219I',
  //   patologie: 'Insufficienza cardiaca severa',
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
  codiceInterno: string (H001, H002, ...)
  iniziali: string (2 chars)
  nome: string
  cognome: string
  luogoNascita: string
  dataNascita: string (YYYY-MM-DD)
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

## Aggiungi nuovi CSV

Se vuoi aggiungere altri CSV di dati realistici:

1. Metti il file `.csv` in questa cartella
2. Aggiungi una funzione helper in `testDataLoader.js`:

   ```javascript
   export function loadMyDataFromCSV() {
     const csvPath = path.join(__dirname, 'mydata.csv')
     const csvContent = fs.readFileSync(csvPath, 'utf-8')
     const rows = parseCSV(csvContent)
     // Trasforma e ritorna...
   }
   ```

3. Usa nei test come gli altri

## Note

- Tutti gli ospiti hanno `uuid` generati automaticamente
- Il `codiceInterno` segue pattern H001, H002, etc.
- I dati fiscali (CF) sono realistici ma fittizi
- I farmaci usano nomi commerciali reali ma senza fini medici
