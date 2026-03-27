# Architettura Iniziale

## Visione d'insieme

MediTrace segue un'architettura offline-first. Il client Android scrive sempre sul database locale; la sincronizzazione con il cloud avviene in background tramite un worker periodico.

## Livelli del sistema

### 1. Cloud stack

#### Google Sheets

Database operativo leggero. Ogni riga rappresenta un record applicativo o un evento di movimentazione.

Fogli operativi proposti:

- `CatalogoFarmaci`
- `ConfezioniMagazzino`
- `Ospiti`
- `Operatori`
- `TerapieAttive`
- `PromemoriaSomministrazioni`
- `Movimenti`
- `Ordini`
- `DashboardScorte`
- `SyncLog`
- `AuditLogCentrale`

La struttura reale dei fogli e' documentata in `docs/google-sheets-schema.md` e nasce dalla migrazione dell'Excel oggi usato, che miscela anagrafica farmaco, giacenza per scadenza e consumi settimanali nella stessa riga.

#### Google Apps Script Web App

Espone endpoint HTTP per lettura e scrittura.

Responsabilita':

- validazione API key tramite header `X-API-KEY`
- validazione minima del payload
- scrittura serializzata sul foglio
- risposta JSON coerente per sincronizzazione delta
- registrazione centralizzata degli eventi applicativi e delle modifiche clinico-operative

#### Sicurezza

- chiave condivisa lato client e script
- deployment privato con accesso limitato all'utenza autorizzata
- auditing minimo tramite foglio `SyncLog`
- dati ospite minimizzati nel foglio `Ospiti`, con iniziali o codice interno invece del nome completo

### 2. Android client

#### Vincolo dispositivi

Il client deve supportare tablet Android economici, inclusi dispositivi Android Go Edition.

Baseline di compatibilita':

- Android 11
- Android 12
- Android 13

Form factor supportati:

- telefoni Android (small/normal)
- tablet Android (large/xlarge)

Conseguenze architetturali:

- query Room ottimizzate e paginazione delle liste
- riduzione al minimo del lavoro in main thread
- payload di sync piccoli e incrementali
- niente dipendenze UI pesanti non necessarie
- test su risoluzioni tablet comuni e su dispositivi a bassa memoria
- layout responsive con varianti per compact e expanded width
- componenti riusabili con comportamento adattivo (lista, dettaglio, azioni rapide)

#### UI + Presentation

MVVM con ViewModel per ogni area funzionale:

- dashboard scorte
- anagrafica farmaci
- pazienti in cura
- agenda promemoria somministrazioni
- modifica terapia e posologia per paziente
- selezione operatore attivo da elenco e creazione operatore autorizzato
- movimenti di carico/scarico
- alert riordino

Requisiti UI adattiva:

- singola codebase UI con breakpoints per telefono/tablet
- navigazione semplificata su telefono e split-view su tablet quando possibile
- supporto orientamento portrait e landscape
- densita' informativa regolabile senza perdita di leggibilita'

#### Local persistence

Room gestisce la persistenza locale e i flag di sincronizzazione.

Campi trasversali raccomandati su ogni entita' sincronizzabile:

- `id`
- `updatedAt`
- `deletedAt`
- `isSynced`
- `syncVersion`

Include anche tabelle locali per:

- promemoria terapeutici (pianificati, eseguiti, saltati)
- audit locale delle azioni operatore da inviare al log centralizzato

#### Networking

- Retrofit per definire il contratto API
- OkHttp con interceptor per aggiungere `X-API-KEY`
- timeout brevi e retry controllati

#### Sync engine

WorkManager esegue:

- push dei record locali con `isSynced = false`
- pull dei delta remoti per aggiornare Room
- riconciliazione elementare basata su `updatedAt`
- invio periodico dei log tecnici e operativi al foglio `AuditLogCentrale`

#### Backup e ripristino

Strategia minima:

- backup cloud: Google Sheets + Apps Script versionato
- backup locale: export cifrato periodico del database Room (quando richiesto da policy)
- procedura di restore guidata con verifica integrita' prima della riattivazione sync
- test periodico di ripristino su dispositivo secondario

#### Aggiornabilita' applicazione

Strategia minima:

- versionamento semantico app e schema dati
- migrazioni Room obbligatorie e testate per ogni release
- rollout progressivo (pilot su 1-2 dispositivi prima del rollout completo)
- fallback: possibilita' di rollback alla release precedente in caso di regressioni

#### Concorrenza

Coroutines su dispatcher I/O per database e rete.

## Flusso dati principale

1. L'operatore registra un movimento o aggiorna una giacenza.
2. Il client salva subito il dato in Room con `isSynced = false`.
3. La UI mostra subito il nuovo stato locale.
4. Quando c'e' rete, WorkManager invia i record al middleware.
5. Apps Script valida la richiesta e aggiorna Google Sheets.
6. Il client marca il record come sincronizzato e scarica eventuali delta remoti.

## Flussi funzionali aggiuntivi

### Alert terapeutico per paziente

1. Le terapie attive generano promemoria con frequenza pianificata.
2. L'app mostra elenco pazienti/farmaci da somministrare nel turno corrente.
3. L'operatore registra esito: `SOMMINISTRATO`, `POSTICIPATO`, `SALTATO`.
4. L'esito aggiorna i dati locali e viene sincronizzato su cloud.

### Modifica posologia e farmaci da operatore

1. L'operatore aggiorna posologia, frequenza o farmaco in terapia.
2. Il client salva la nuova versione con `updatedAt`, `operatore` e `operatoreId` autore modifica.
3. Il middleware aggiorna `TerapieAttive` e registra l'evento in `AuditLogCentrale`.

### Logging centralizzato su Sheet

1. Eventi tecnici (sync, errori, auth fail) continuano su `SyncLog`.
2. Eventi operativi (modifica posologia, aggiunta farmaco, esito promemoria) vanno su `AuditLogCentrale`.
3. Ogni record log include timestamp UTC, operatore, azione, entita', id record e payload sintetico.

### Selezione e registrazione operatore

1. All'avvio turno l'app richiede selezione `operatore` da foglio `Operatori`.
2. Se l'operatore non esiste, puo' essere creato con endpoint dedicato e subito selezionato.
3. Le azioni di somministrazione e variazione posologia senza `operatoreId` non devono essere confermabili.

## Scelte architetturali intenzionali

- niente server dedicato
- niente database cloud tradizionale
- complessita' operativa molto bassa
- costo vicino a zero nel perimetro attuale
- adatto a un numero ristretto di utenti concorrenti

## Rischi da gestire presto

- conflitti di modifica sullo stesso record
- gestione delle cancellazioni logiche
- rotazione sicura della API key
- struttura del foglio da mantenere stabile nel tempo
- backup periodico del foglio e dell'App Script
- disallineamento tra logica storica dell'Excel e nuovo modello basato su movimenti/eventi
- degrado prestazionale su tablet low-end se la UI non resta leggera o se la sync cresce troppo
- alert non confermati in tempo su turni con connettivita' intermittente
- conflitti su modifiche concorrenti di posologia/terapia
- regressioni UI su form factor diversi se manca una matrice test device/schermo
- restore incompleto o mismatch di versione schema dopo aggiornamenti app
