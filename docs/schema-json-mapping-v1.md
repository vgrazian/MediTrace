# Schema JSON v1 e Mapping Excel -> Dataset

Data: 2026-03-31
Stato: APPROVATO (baseline W1-05)

## Obiettivo

Definire il mapping operativo tra i template CSV legacy e il dataset JSON v1 usato dalla PWA (IndexedDB + sync su Gist), con regole di trasformazione univoche.

## Dataset JSON v1 (target)

Ogni snapshot `meditrace-data.json` include:

- `schemaVersion`
- `datasetVersion`
- `exportedAt`
- `rooms[]`
- `beds[]`
- `hosts[]`
- `drugs[]`
- `stockBatches[]`
- `therapies[]`
- `movements[]`
- `reminders[]`
- `operators[]`

Campi trasversali raccomandati per record sincronizzabili:

- `id`
- `updatedAt`
- `deletedAt` (quando applicabile)
- `syncStatus` (`pending`, `synced`, `conflict`)

## Mapping sorgente -> target

### 01_CatalogoFarmaci.csv -> `drugs[]`

Sorgente:
`drug_id,principio_attivo,classe_terapeutica,scorta_minima_default,fornitore_preferito,note,updated_at,deleted_at`

Mapping:

- `drug_id` -> `id`
- `principio_attivo` -> `principioAttivo`
- `classe_terapeutica` -> `classeTerapeutica`
- `scorta_minima_default` -> `scortaMinima`
- `fornitore_preferito` -> `fornitore`
- `note` -> `note`
- `updated_at` -> `updatedAt`
- `deleted_at` -> `deletedAt`

### 02_ConfezioniMagazzino.csv -> `stockBatches[]`

Sorgente:
`stock_item_id,drug_id,nome_commerciale,dosaggio,forma,unita_misura,lotto,scadenza,quantita_iniziale,quantita_attuale,soglia_riordino,copertura_settimane,stato_scorta,updated_at,deleted_at`

Mapping:

- `stock_item_id` -> `id`
- `drug_id` -> `drugId`
- `nome_commerciale` -> `nomeCommerciale`
- `dosaggio` -> `dosaggio`
- `forma` -> `forma`
- `unita_misura` -> `unitaMisura`
- `lotto` -> `lotto`
- `scadenza` -> `scadenza`
- `quantita_iniziale` -> `quantitaIniziale`
- `quantita_attuale` -> `quantitaAttuale`
- `soglia_riordino` -> `sogliaRiordino`
- `copertura_settimane` -> `coperturaSettimane`
- `stato_scorta` -> `statoScorta`
- `updated_at` -> `updatedAt`
- `deleted_at` -> `deletedAt`

### 03_Ospiti.csv -> `hosts[]`

Sorgente:
`guest_id,codice_interno,iniziali,casa_alloggio,stanza_id,letto_id,attivo,note_essenziali,updated_at,deleted_at`

Mapping:

- `guest_id` -> `id`
- `codice_interno` -> `codiceInterno`
- `iniziali` -> `iniziali`
- `casa_alloggio` -> `casaAlloggio`
- `stanza_id` -> `stanzaId` (opzionale, retrocompatibilità)
- `letto_id` -> `lettoId` (opzionale, retrocompatibilità)
- `attivo` -> `attivo`
- `note_essenziali` -> `noteEssenziali`
- `updated_at` -> `updatedAt`
- `deleted_at` -> `deletedAt`

### 12_Stanze.csv -> `rooms[]`

Sorgente:
`room_id,nome,descrizione,piano,note,updated_at,deleted_at`

Mapping:

- `room_id` -> `id`
- `nome` -> `nome`
- `descrizione` -> `descrizione`
- `piano` -> `piano`
- `note` -> `note`
- `updated_at` -> `updatedAt`
- `deleted_at` -> `deletedAt`

### 13_Letti.csv -> `beds[]`

Sorgente:
`bed_id,room_id,numero,descrizione,note,updated_at,deleted_at`

Mapping:

- `bed_id` -> `id`
- `room_id` -> `roomId`
- `numero` -> `numero`
- `descrizione` -> `descrizione`
- `note` -> `note`
- `updated_at` -> `updatedAt`
- `deleted_at` -> `deletedAt`

### 04_TerapieAttive.csv -> `therapies[]`

Sorgente:
`therapy_id,guest_id,drug_id,stock_item_id_preferito,dose_per_somministrazione,unita_dose,somministrazioni_giornaliere,consumo_medio_settimanale,data_inizio,data_fine,attiva,note,updated_at`

Mapping:

- `therapy_id` -> `id`
- `guest_id` -> `hostId`
- `drug_id` -> `drugId`
- `stock_item_id_preferito` -> `stockBatchIdPreferito`
- `dose_per_somministrazione` -> `dosePerSomministrazione`
- `unita_dose` -> `unitaDose`
- `somministrazioni_giornaliere` -> `somministrazioniGiornaliere`
- `consumo_medio_settimanale` -> `consumoMedioSettimanale`
- `data_inizio` -> `dataInizio`
- `data_fine` -> `dataFine`
- `attiva` -> `attiva`
- `note` -> `note`
- `updated_at` -> `updatedAt`

### 05_Movimenti.csv -> `movements[]`

Sorgente:
`movement_id,stock_item_id,drug_id,guest_id,tipo_movimento,quantita,unita_misura,causale,data_movimento,settimana_riferimento,operatore,source,updated_at`

Mapping:

- `movement_id` -> `id`
- `stock_item_id` -> `stockBatchId`
- `drug_id` -> `drugId`
- `guest_id` -> `hostId`
- `tipo_movimento` -> `tipoMovimento`
- `quantita` -> `quantita`
- `unita_misura` -> `unitaMisura`
- `causale` -> `causale`
- `data_movimento` -> `dataMovimento`
- `settimana_riferimento` -> `settimanaRiferimento`
- `operatore` -> `operatore`
- `source` -> `source`
- `updated_at` -> `updatedAt`

### 09_PromemoriaSomministrazioni.csv -> `reminders[]`

Sorgente:
`reminder_id,guest_id,therapy_id,drug_id,scheduled_at,stato,eseguito_at,operatore,note,updated_at`

Mapping:

- `reminder_id` -> `id`
- `guest_id` -> `hostId`
- `therapy_id` -> `therapyId`
- `drug_id` -> `drugId`
- `scheduled_at` -> `scheduledAt`
- `stato` -> `stato`
- `eseguito_at` -> `eseguitoAt`
- `operatore` -> `operatore`
- `note` -> `note`
- `updated_at` -> `updatedAt`

### 11_Operatori.csv -> `operators[]`

Sorgente:
`operator_id,codice_operatore,nome_visualizzato,attivo,ruolo,created_at,updated_at`

Mapping:

- `operator_id` -> `id`
- `codice_operatore` -> `codiceOperatore`
- `nome_visualizzato` -> `nomeVisualizzato`
- `attivo` -> `attivo`
- `ruolo` -> `ruolo`
- `created_at` -> `createdAt`
- `updated_at` -> `updatedAt`

## Regole di trasformazione

- date/timestamp in ISO 8601 UTC nel dataset (`YYYY-MM-DDTHH:mm:ss.sssZ`).
- booleani normalizzati: `true`/`false`.
- numerici (`quantita`, `sogliaRiordino`, `consumoMedioSettimanale`) convertiti in Number.
- valori vuoti in campi opzionali convertiti a `null`.
- identificativi preservati dalla sorgente quando presenti; in assenza, generazione UUID v4.
- cancellazioni sempre logiche via `deletedAt`.

## Vincoli di qualita' dati

- chiavi primarie univoche per ogni entita'.
- referential integrity minima:
  - `beds.roomId` deve esistere in `rooms.id`
  - `hosts.stanzaId` deve esistere in `rooms.id` (opzionale, retrocompatibilità)
  - `hosts.lettoId` deve esistere in `beds.id` (opzionale, retrocompatibilità)
  - `stockBatches.drugId` deve esistere in `drugs.id`
  - `therapies.hostId` deve esistere in `hosts.id`
  - `therapies.drugId` deve esistere in `drugs.id`
  - `movements.stockBatchId` deve esistere in `stockBatches.id`
  - `reminders.therapyId` deve esistere in `therapies.id`
- righe con errori bloccanti entrano in `rejects` con motivo.

## Evidenze

- Header sorgente verificati da `templates/csv-import/*.csv` (inclusi 12_Stanze.csv e 13_Letti.csv).
- Coerenza confermata con schema Dexie in `pwa/src/db/index.js`.
- Coerenza confermata con snapshot remoto `meditrace-data.json` (W1-13).
- Relazioni rooms ↔ beds ↔ hosts sincronizzate e testate in E2E.
