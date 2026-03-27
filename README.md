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
- notificare al personale i promemoria di somministrazione farmaco per paziente
- consentire all'operatore di aggiornare posologia e terapia, con sync al database centrale
- consentire all'operatore di aggiungere nuovi farmaci al catalogo centrale
- mantenere un logging centralizzato su Google Sheets per audit operativo
- garantire una UI flessibile per telefoni e tablet con dimensioni diverse
- garantire backup dati e procedura di ripristino semplice
- consentire aggiornamenti applicativi controllati senza perdita dati locali
- mantenere costi e complessita' operativa minimi

## Vincoli di piattaforma

- l'app deve funzionare su tablet Android economici
- target minimo: Android 11, 12 e 13 (incluse varianti Android Go Edition)
- UX e prestazioni devono restare stabili anche con RAM ridotta e CPU entry-level
- la UI deve adattarsi a schermi piccoli (telefono) e grandi (tablet)

## Struttura del repository

- `docs/architecture.md`: architettura tecnica iniziale
- `docs/domain-model.md`: modello dati e tabelle principali
- `docs/google-sheets-schema.md`: schema reale dei fogli Google
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
5. Implementare il flusso minimo: anagrafica farmaco, posologie, promemoria paziente, movimento, alert scorte.
6. Definire backup/ripristino e piano aggiornamenti app (versionamento e rollout).
