# Modello Dati Iniziale

## Entita' principali

### Farmaco

- `id`: UUID
- `principioAttivo`
- `classeTerapeutica` opzionale
- `scortaMinima`
- `fornitore`
- `note`
- `updatedAt`
- `isSynced`

### Confezione / Referenza commerciale

Questa entita' separa il principio attivo dal modo in cui il farmaco entra realmente in magazzino. E' necessaria per riflettere il file Excel attuale, dove uno stesso principio attivo compare con piu' nomi commerciali, dosaggi e scadenze diverse.

- `id`: UUID
- `drugId`
- `nomeCommerciale`
- `dosaggio`
- `forma`
- `unitaMisura`
- `pezziPerConfezione` opzionale
- `note`
- `updatedAt`
- `isSynced`

### Paziente

- `id`: UUID
- `codiceInterno`
- `iniziali`
- `casaAlloggio`
- `dataNascita`
- `noteClinicheEssenziali`
- `attivo`
- `updatedAt`
- `isSynced`

### Operatore

- `id`: UUID
- `codiceOperatore` univoco
- `nomeVisualizzato`
- `attivo`
- `createdAt`
- `updatedAt`
- `isSynced`

### Terapia attiva

- `id`: UUID
- `patientId`
- `drugId`
- `confezioneId` opzionale
- `dosePerSomministrazione`
- `somministrazioniGiornaliere`
- `consumoMedioSettimanale`
- `orariSomministrazione` lista/orari standard del giorno
- `ultimaRevisioneBy` operatore
- `ultimaRevisioneById` operatorId
- `dataInizio`
- `dataFine`
- `note`
- `updatedAt`
- `isSynced`

### Promemoria somministrazione

- `id`: UUID
- `patientId`
- `therapyId`
- `drugId`
- `scheduledAt`
- `stato`: `DA_ESEGUIRE`, `SOMMINISTRATO`, `POSTICIPATO`, `SALTATO`
- `eseguitoAt` opzionale
- `operatore`
- `operatoreId`
- `note`
- `updatedAt`
- `isSynced`

### Giacenza per scadenza

- `id`: UUID
- `drugId`
- `confezioneId`
- `scadenza`
- `lotto` opzionale
- `quantitaDisponibile`
- `quantitaImpegnata`
- `sogliaRiordino`
- `coperturaStimataSettimane` opzionale
- `ultimaVerificaAt`
- `updatedAt`
- `isSynced`

### Movimento Magazzino

- `id`: UUID
- `drugId`
- `stockItemId` opzionale
- `patientId` opzionale
- `tipoMovimento`: `CARICO`, `SCARICO`, `RETTIFICA`
- `quantita`
- `causale`
- `operatore`
- `operatoreId`
- `timestampOperazione`
- `updatedAt`
- `isSynced`

### Ordine / Fabbisogno

- `id`: UUID
- `drugId`
- `confezioneId` opzionale
- `quantitaSuggerita`
- `priorita`
- `stato`: `DA_ORDINARE`, `ORDINATO`, `RICEVUTO`
- `motivo`
- `createdAt`
- `updatedAt`
- `isSynced`

### Audit Log Operativo

- `id`: UUID
- `timestamp`
- `operatore`
- `operatoreId`
- `azione`: `ADD_FARMACO`, `UPDATE_POSOLOGIA`, `UPDATE_TERAPIA`, `PROMEMORIA_ESITO`, `SYNC_EVENT`
- `entityType`
- `entityId`
- `patientId` opzionale
- `payloadSintetico`
- `esito`: `OK`, `WARN`, `ERROR`
- `isSynced`

## Regole iniziali

- le giacenze sono per confezione e scadenza, non solo per principio attivo
- le giacenze sono derivate dai movimenti ma possono avere una cache locale per performance
- gli ordini possono essere generati automaticamente quando `quantitaDisponibile <= sogliaRiordino`
- le cancellazioni devono essere logiche, non fisiche
- ogni record sincronizzabile deve avere un timestamp di modifica in UTC
- i dati paziente devono essere pseudonimizzati usando iniziali o codice interno nel foglio cloud
- lo storico settimanale non deve vivere in colonne dinamiche: deve essere ricostruibile dai movimenti o da una vista aggregata
- ogni modifica a terapia o posologia deve produrre un record di audit
- ogni promemoria deve avere uno stato finale tracciabile
- ogni azione clinico-operativa deve contenere sia `operatore` che `operatoreId`
- l'app deve permettere selezione operatore da elenco e aggiunta rapida operatore autorizzato

## MVP consigliato

Per la prima release basta implementare:

1. Farmaco
2. Confezione / Referenza commerciale
3. Giacenza per scadenza
4. Movimento Magazzino
5. Terapia attiva
6. Promemoria somministrazione
7. Ordine / Fabbisogno
8. Audit Log Operativo
