# Dati Realistici per Seed Automatico (seedDataRealistic)

**Utilizzo nella UI**: Genera 30 ospiti + stanze/letti + farmaci/terapie automaticamente in modalità DEV.

## Acquisizione Rapida

```javascript
// In un componente Vue o admin panel:
import { loadRealisticSeedData, clearRealisticSeedData } from '@/services/seedData'

// Genera tutti i dati realistici nel DB
await loadRealisticSeedData()
// ✓ Carica: 60 ospiti assegnati a 60 letti in 20 stanze, 30 farmaci, 81 terapie

// Pulisci i dati generati
await clearRealisticSeedData()
```

## Dati Generati

### Ospiti (60 totali)

- Da `src/data/realisticDataset.json`
- Assegnati automaticamente a letti/stanze
- Con dati demografici (nome, cognome, CF, patologia, data nascita)
- IDs con prefisso `__realistic__host-1` ... `__realistic__host-60`

### Stanze e Letti

Derivate dal dataset realistico JSON:

- **20 stanze**
- **60 letti**
- Ogni ospite assegnato a 1 letto univoco

### Farmaci (30 totali)

- Da CSV `farmaci_test_sanitari.csv`
- Con marca e principio attivo realistico
- IDs con prefisso `__realistic__drug-1` ... `__realistic__drug-30`

### Lotti Farmaci (70+ totali)

- 2-3 lotti per farmaco
- Scadenze variate nel tempo
- Quantità realistiche (500-1000 unità)
- IDs con prefisso `__realistic__batch-X-Y`

### Terapie (81 totali)

- 1-3 terapie per ospite
- Con dosaggio, frequenze realistiche (`1 volta/die`, `2 volte/die`, `ogni 8 ore`, `al bisogno`), note
- IDs con prefisso `__realistic__therapy-...`

## Come Usare nella UI

### 1. Pulsante "Genera Dati Realistici" in Impostazioni

```vue
<template>
  <div class="admin-panel">
    <button @click="generateRealisticData" class="btn btn-primary">
      Genera Dati Realistici (30 ospiti + stanze + farmaci + terapie)
    </button>
    <button @click="clearRealisticData" class="btn btn-danger">
      Rimuovi Dati Realistici
    </button>
    <div v-if="status" class="status">{{ status }}</div>
  </div>
</template>

<script setup>
import { loadRealisticSeedData, clearRealisticSeedData } from '@/services/seedData'
import { ref } from 'vue'

const status = ref('')

async function generateRealisticData() {
  try {
    const stats = await loadRealisticSeedData()
    status.value = `✓ Caricati: ${stats.hosts} ospiti, ${stats.rooms} stanze, ${stats.drugs} farmaci, ${stats.therapies} terapie`
  } catch (error) {
    status.value = `✗ Errore: ${error.message}`
  }
}

async function clearRealisticData() {
  try {
    const result = await clearRealisticSeedData()
    if (result.cleared) {
      status.value = '✓ Dati realistici rimossi'
    } else {
      status.value = '✓ Nessun dato da rimuovere'
    }
  } catch (error) {
    status.value = `✗ Errore: ${error.message}`
  }
}
</script>
```

### 2. Check Automatico al Login

```javascript
// In auth service o auth guard
import { isRealisticSeedDataLoaded, loadRealisticSeedData } from '@/services/seedData'

export async function ensureTestDataIfDev() {
  if (!import.meta.env.DEV) return
  
  const isLoaded = await isRealisticSeedDataLoaded()
  if (!isLoaded) {
    await loadRealisticSeedData()
    console.log('✓ Dati realistici caricati automaticamente')
  }
}
```

## Differenza vs `loadSeedData()`

| Feature | loadSeedData() | loadRealisticSeedData() |
| --- | --- | --- |
| **Ospiti** | 10 ospiti mini | **60 ospiti realistici** |
| **Stanze/Letti** | 3 stanze, 6 letti | **20 stanze, 60 letti** |
| **Farmaci** | 10 farmaci | **30 farmaci** |
| **Terapie** | 15 terapie | **81 terapie** |
| **Dati demografici** | Baselinari | **Nomi reali, CF, patologie simili** |
| **Assegnamento ospiti** | Manuale | **Automatico a letti/stanze** |
| **Logica terapie** | Statiche | **Basata su patologie ospiti** |
| **Uso** | Demo veloce | **Test realistica, sviluppo** |

## Implementazione Interna

I dati realistici usano `src/data/realisticDataset.json` per rooms/beds/hosts/therapies,
e `farmaci_test_sanitari.csv` per il catalogo farmaci.

- Mapping browser-safe in `seedDataRealistic.js`
- IDs seed prefissati `__realistic__*`
- Compatibile anche in production (se `VITE_SEED_DATA=1`)

## Limitazioni

- ✓ Funziona solo in modalità DEV o con `VITE_SEED_DATA=1`
- ✓ Genera sempre gli stessi 60 ospiti (deterministico)
- ✓ Non usa `crypto.randomUUID` negli ID (usa prefissi fissi)
- ✓ Idempotente: puoi chiamare più volte, sovrascrive

## Note Importanti

1. **Prefissi univoci**: Tutti gli ID usano `__realistic__` per non conflittare con dati manuali o seed classici
2. **Pulizzia sicura**: `clearRealisticSeedData()` rimuove SOLO i record con prefisso `__realistic__`
3. **Patologie coerenti**: Le terapie rispecchiano le patologie degli ospiti (logica intelligente)
4. **Determinismo**: Dataset stabile per regressioni e confronti E2E ripetibili
