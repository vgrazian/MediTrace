# Modello Dati Iniziale

## Entita' principali

### Farmaco

- `id`: UUID
- `nome`
- `principioAttivo`
- `dosaggio`
- `forma`
- `unitaMisura`
- `scortaMinima`
- `fornitore`
- `note`
- `updatedAt`
- `isSynced`

### Paziente

- `id`: UUID
- `codiceInterno`
- `nome`
- `cognome`
- `dataNascita`
- `noteClinicheEssenziali`
- `attivo`
- `updatedAt`
- `isSynced`

### Prescrizione / Piano terapeutico

- `id`: UUID
- `patientId`
- `drugId`
- `frequenza`
- `dose`
- `dataInizio`
- `dataFine`
- `note`
- `updatedAt`
- `isSynced`

### Giacenza

- `id`: UUID
- `drugId`
- `quantitaDisponibile`
- `quantitaImpegnata`
- `sogliaRiordino`
- `ultimaVerificaAt`
- `updatedAt`
- `isSynced`

### Movimento Magazzino

- `id`: UUID
- `drugId`
- `patientId` opzionale
- `tipoMovimento`: `CARICO`, `SCARICO`, `RETTIFICA`
- `quantita`
- `causale`
- `operatore`
- `timestampOperazione`
- `updatedAt`
- `isSynced`

### Ordine / Fabbisogno

- `id`: UUID
- `drugId`
- `quantitaSuggerita`
- `priorita`
- `stato`: `DA_ORDINARE`, `ORDINATO`, `RICEVUTO`
- `motivo`
- `createdAt`
- `updatedAt`
- `isSynced`

## Regole iniziali

- le giacenze sono derivate dai movimenti ma possono avere una cache locale per performance
- gli ordini possono essere generati automaticamente quando `quantitaDisponibile <= sogliaRiordino`
- le cancellazioni devono essere logiche, non fisiche
- ogni record sincronizzabile deve avere un timestamp di modifica in UTC

## MVP consigliato

Per la prima release basta implementare:

1. Farmaco
2. Giacenza
3. Movimento Magazzino
4. Ordine / Fabbisogno
