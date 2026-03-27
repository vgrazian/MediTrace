# MediTrace

MediTrace e' un progetto per tracciare i farmaci destinati ai pazienti seguiti nella clinica della Comunita' di Sant'Egidio e monitorare per tempo il fabbisogno di riordino.

L'architettura iniziale segue un modello offline-first:

- client Android in Kotlin con persistenza locale Room
- sincronizzazione in background con WorkManager
- API HTTP tramite Google Apps Script
- storage cloud leggero su Google Sheets

## Obiettivi della prima fase

- registrare i farmaci disponibili e assegnati ai pazienti
- rendere immediato l'inserimento dati anche senza rete
- sincronizzare automaticamente appena disponibile una connessione
- evidenziare scorte basse e necessita' di riordino
- mantenere costi e complessita' operativa minimi

## Struttura del repository

- `docs/architecture.md`: architettura tecnica iniziale
- `docs/domain-model.md`: modello dati e tabelle principali
- `docs/roadmap.md`: primi passi di consegna
- `docs/google-apps-script-api.md`: contratto API del middleware
- `docs/ui-wireframes.md`: schermate iniziali e flussi UX
- `prototype/index.html`: mockup statico della dashboard
- `prototype/styles.css`: stile del mockup

## Stack proposto

- Android app: Kotlin, MVVM, Room, Retrofit, OkHttp, WorkManager, Coroutines
- Cloud bridge: Google Apps Script Web App
- Cloud storage: Google Sheets
- Repository: GitHub

## Avvio del prototipo statico

Aprire `prototype/index.html` nel browser per visualizzare una prima proposta grafica della dashboard operativa.

## Prossimi passi tecnici

1. Creare il repository GitHub e collegare il remote.
2. Avviare il client Android con moduli `app`, `data`, `sync`.
3. Preparare il foglio Google con le tabelle operative.
4. Pubblicare una prima Web App Apps Script protetta da API key.
5. Implementare il flusso minimo: anagrafica farmaco, movimento, alert scorte.
