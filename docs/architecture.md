# Architettura Iniziale

## Visione d'insieme

MediTrace segue un'architettura offline-first. Il client Android scrive sempre sul database locale; la sincronizzazione con il cloud avviene in background tramite un worker periodico.

## Livelli del sistema

### 1. Cloud stack

#### Google Sheets

Database operativo leggero. Ogni riga rappresenta un record applicativo o un evento di movimentazione.

Tabelle suggerite:

- `Farmaci`
- `Pazienti`
- `Giacenze`
- `Movimenti`
- `Ordini`
- `SyncLog`

#### Google Apps Script Web App

Espone endpoint HTTP per lettura e scrittura.

Responsabilita':

- validazione API key tramite header `X-API-KEY`
- validazione minima del payload
- scrittura serializzata sul foglio
- risposta JSON coerente per sincronizzazione delta

#### Sicurezza

- chiave condivisa lato client e script
- deployment privato con accesso limitato all'utenza autorizzata
- auditing minimo tramite foglio `SyncLog`

### 2. Android client

#### UI + Presentation

MVVM con ViewModel per ogni area funzionale:

- dashboard scorte
- anagrafica farmaci
- pazienti in cura
- movimenti di carico/scarico
- alert riordino

#### Local persistence

Room gestisce la persistenza locale e i flag di sincronizzazione.

Campi trasversali raccomandati su ogni entita' sincronizzabile:

- `id`
- `updatedAt`
- `deletedAt`
- `isSynced`
- `syncVersion`

#### Networking

- Retrofit per definire il contratto API
- OkHttp con interceptor per aggiungere `X-API-KEY`
- timeout brevi e retry controllati

#### Sync engine

WorkManager esegue:

- push dei record locali con `isSynced = false`
- pull dei delta remoti per aggiornare Room
- riconciliazione elementare basata su `updatedAt`

#### Concorrenza

Coroutines su dispatcher I/O per database e rete.

## Flusso dati principale

1. L'operatore registra un movimento o aggiorna una giacenza.
2. Il client salva subito il dato in Room con `isSynced = false`.
3. La UI mostra subito il nuovo stato locale.
4. Quando c'e' rete, WorkManager invia i record al middleware.
5. Apps Script valida la richiesta e aggiorna Google Sheets.
6. Il client marca il record come sincronizzato e scarica eventuali delta remoti.

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
