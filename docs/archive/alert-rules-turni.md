# Regole Alert Per Turno

## Obiettivo

Definire regole pratiche e semplici per ricordare al personale quali pazienti devono ricevere farmaci, con una gestione coerente dei ritardi e delle escalation.

## Identificazione Operatore

Prima di operare nel turno, l'utente deve:

1. selezionare il proprio nome dall'elenco `Operatori`
2. in assenza del nominativo, aggiungerlo se autorizzato

Regole minime:

- ogni esito promemoria deve salvare `operatore` e `operatore_id`
- ogni modifica posologia/terapia deve salvare `operatore` e `operatore_id`
- senza `operatore_id` l'azione non puo' essere confermata

## Stato Alert

Ogni promemoria in `PromemoriaSomministrazioni` usa uno stato operativo:

- `DA_ESEGUIRE`
- `SOMMINISTRATO`
- `POSTICIPATO`
- `SALTATO`

L'app deve mostrare alert solo per record non chiusi (`DA_ESEGUIRE`, `POSTICIPATO`).

## Parametri Standard Per Turno

Parametri consigliati iniziali:

- finestra anticipo: 30 minuti prima dell'orario previsto
- ritardo ammesso: 30 minuti dopo l'orario previsto
- soglia critica: oltre 60 minuti dal previsto
- ciclo reminder locale: ogni 10 minuti per item non chiusi

Questi valori vanno salvati in configurazione centrale e possono essere adattati per tipo farmaco.

## Regole Di Visualizzazione In App

1. Stato normale (in anticipo): nessun alert bloccante, solo badge informativo.
2. In finestra operativa (`scheduled_at - 30m` fino a `scheduled_at + 30m`): alert giallo.
3. Ritardo oltre finestra ammessa (`> +30m`): alert arancione e ordinamento in cima lista turno.
4. Ritardo critico (`> +60m`): alert rosso, richiesta esplicita di azione (`SOMMINISTRATO`, `POSTICIPATO`, `SALTATO`).

## Escalation Per Turno

1. Primo livello: notifica locale al tablet dell'operatore attivo.
2. Secondo livello (oltre 60 minuti): evidenza persistente nella dashboard turno.
3. Terzo livello (fine turno con item aperti): passaggio consegne obbligatorio con lista non chiusi.

Escalation minima su sheet:

- scrivere evento in `AuditLogCentrale` con `azione = PROMEMORIA_ESCALATION`
- includere `patient_id`, `therapy_id`, `scheduled_at`, livello escalation e operatore turno

## Regole Operative Su Esito

### `SOMMINISTRATO`

- compilare `eseguito_at`
- aggiornare eventuale movimento di scarico correlato
- scrivere audit `PROMEMORIA_ESITO`

### `POSTICIPATO`

- richiedere motivazione breve
- generare nuovo `scheduled_at` entro finestra turno o turno successivo
- scrivere audit con valore prima/dopo

### `SALTATO`

- motivazione obbligatoria
- nessun movimento di scarico automatico
- scrivere audit `PROMEMORIA_ESITO` con esito `WARN`

## Regole Di Sicurezza E Continuita'

- offline-first: gli alert devono funzionare anche senza rete
- in assenza rete, gli esiti restano in coda locale con `isSynced = false`
- alla riconnessione, sync prioritario di promemoria ed esiti prima di altri dati non critici

## KPI Minimi Da Monitorare

- promemoria chiusi entro finestra ammessa
- promemoria in ritardo critico per turno
- percentuale `POSTICIPATO` e `SALTATO` per farmaco
- tempo medio di chiusura promemoria

## Impostazioni Iniziali Raccomandate

- anticipo: 30 minuti
- ritardo ammesso: 30 minuti
- soglia critica: 60 minuti
- reminder ripetuto: 10 minuti
- audit escalation: sempre attivo
