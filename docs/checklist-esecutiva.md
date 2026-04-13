# Checklist Esecutiva MediTrace

## Obiettivo

Passare da documentazione e prototipo a un MVP operativo PWA testato su dispositivi reali (telefono, tablet, PC), con sync multi-dispositivo via GitHub Gist privato, promemoria terapia e backup/restore.

## Modalita' d'uso

- stato task: `TODO`, `IN CORSO`, `BLOCCATO`, `DONE`
- owner: nome referente
- evidenza: link a commit, screenshot, log o test report

## Fase 1 - Setup Operativo (Settimana 1)

### 1.1 Congelamento specifiche v1

- [x] Confermare architettura PWA + IndexedDB + GitHub Gist privato
- [x] Confermare approccio login operatore con utenza/password
- [x] Confermare strategia sync multi-dispositivo su Gist condiviso
- [x] Confermare regole alert turno (`alert-rules-turni`)
- [x] Definire regole naming ID (`drug_id`, `therapy_id`, `host_id`, `reminder_id`, `batch_id`)

Criterio accettazione:

- un documento decisionale condiviso con versione `v1-approved`
- evidenza: `docs/decisione-v1-approved.md` (2026-03-31)

### 1.2 Setup autenticazione e accessi (GitHub)

- [x] Definire strategia auth senza backend: utenza/password operatore
- [x] Validare login con account operatore
- [x] Validare accesso API GitHub Gist
- [x] Creare storage remoto iniziale (Gist privato)

Stato operativo:

- decisione architetturale aggiornata in `docs/decisione-v1-approved.md`
- architettura applicativa aggiornata in `docs/architecture.md`

Criterio accettazione:

- login browser riuscito con utenza/password valide
- primo accesso a Gist privato riuscito senza errori permessi
- evidenza minima: account autenticato + Gist ID visibile in Impostazioni

### 1.3 Shell applicativa PWA

- [x] Inizializzare progetto Vue 3 + Vite — `pwa/` scaffold creato (2026-03-31)
- [x] Configurare plugin PWA con manifest e icone — `vite.config.js` con `vite-plugin-pwa`
- [x] Configurare Dexie.js e bootstrap IndexedDB — `src/db/index.js` schema v1
- [x] Implementare client GitHub Gist API — `src/services/gist.js`
- [x] Scaffold sync bidirezionale — `src/services/sync.js`
- [x] Scaffold auth browser con utenza/password — `src/services/auth.js`
- [x] Test login/logout con account reale
- [x] Implementare e verificare creazione automatica `meditrace-manifest.json`
- [x] Implementare e verificare creazione automatica `meditrace-data.json`

Stato operativo:

- scaffold PWA presente in `pwa/` — compilabile con `npm install && npm run dev`
- servizi `auth`, `gist`, `sync` strutturati e validati con token reale
- bootstrap remoto completato: Gist `76793e4ea227...`
- GitHub Actions deploy workflow presente in `.github/workflows/deploy-pwa.yml`

Criterio accettazione:

- app avviabile in locale e su preview deploy
- primo bootstrap con dataset vuoto funzionante
- PWA installabile su almeno un telefono e un browser desktop

## Fase 2 - MVP PWA (Settimana 2-3)

### 2.1 Fondazione app

- [ ] Definire schema Dexie v1
- [ ] Implementare migration path schema locale
- [ ] Configurare ambienti `staging` e `prod`
- [ ] Implementare service worker offline base

Stato operativo:

- integrazione flussi MVP ancora da completare

Criterio accettazione:

- app avviabile offline da installazione PWA senza errori al cold start

### 2.2 Flussi core MVP

- [ ] Gestione ospiti con iniziali o codice interno
- [ ] Gestione farmaci con principio attivo, nome commerciale, dosaggio e scadenza
- [ ] Lista promemoria turno con stato e priorita'
- [ ] Chiusura promemoria (`SOMMINISTRATO`, `POSTICIPATO`, `SALTATO`)
- [ ] Modifica posologia e terapia attiva
- [ ] Calcolo residuo e warning su consumo settimanale

Criterio accettazione:

- ogni azione e' salvata localmente e ricostruibile dopo refresh o offline restart

### 2.3 Sync e resilienza

- [ ] Coda offline per operazioni senza rete
- [ ] Upload dataset su Gist al salvataggio o ritorno online
- [ ] Download dataset piu' recente all'avvio su secondo dispositivo
- [ ] Retry con backoff
- [ ] Gestione conflitti base su `updatedAt`
- [ ] Log tecnico locale di sync

Criterio accettazione:

- scenario telefono offline -> online -> apertura su PC completato senza perdita dati

## Fase 3 - Qualita' Operativa (Settimana 4)

### 3.1 UI adattiva telefono/tablet/desktop

- [ ] Layout `compact` validato su telefono
- [ ] Layout `expanded` validato su tablet
- [ ] Layout desktop validato su browser moderno
- [ ] Navigazione coerente portrait/landscape
- [ ] Nessun clipping testuale su font maggiorato

Criterio accettazione:

- checklist UX completata su almeno 1 telefono + 1 tablet + 1 browser desktop

### 3.2 Performance e stabilita'

- [ ] Avvio app entro soglia definita
- [ ] Scrolling liste fluido su device entry-level
- [ ] Sync completato entro finestra operativa attesa
- [ ] Test memoria su sessione lunga turno
- [ ] Tempo caricamento iniziale sotto 2 secondi su connessione standard

Criterio accettazione:

- nessun blocco critico in test turno simulato di 2 ore

### 3.3 Backup, restore, aggiornamenti

- [ ] Definire frequenza backup e owner operativo
- [ ] Testare restore completo su dispositivo secondario (file JSON locale)
- [ ] Definire canale aggiornamento GitHub Pages / release rollback
- [ ] Testare upgrade versione con migrazione dati
- [ ] Documentare procedura rollback

Test cases minimi richiesti:

- [ ] Backup JSON scaricato e riaperto con validazione struttura (tabelle v1)
- [ ] Restore JSON su device pulito con riallineamento datasetVersion
- [ ] Verifica sync queue valorizzata dopo restore e sync manuale riuscita
- [ ] Verifica pannello Impostazioni: stato Push API + stato Supabase con messaggi variabili mancanti

Criterio accettazione:

- runbook operativo approvato e testato almeno una volta

## Gate Di Rilascio MVP

Prima del go-live, tutti i gate devono essere `DONE`:

- [ ] Gate A - End-to-end clinico: promemoria -> esito -> sync
- [ ] Gate B - Multi-device: modifica su un dispositivo visibile sull'altro dopo sync
- [ ] Gate C - Sicurezza base: login con utenza/password e accessi controllati
- [ ] Gate D - Affidabilita': test offline/online e restore superati
- [ ] Gate E - Usabilita': test su telefono + tablet + desktop superati con feedback positivo

## Gate Automatico CI (Obbligatorio)

- [x] Workflow quality gate presente (`.github/workflows/quality-gate.yml`)
- [x] Unit test con coverage threshold attivo
- [x] E2E Playwright attivi sui flussi critici
- [x] Build produzione inclusa nel gate
- [x] Branch protection `main` con required check `test`

## Registro Rischi E Mitigazioni (Operativo)

- [ ] Rischio: operatori non allineati in anagrafica
  Mitigazione: dizionario locale sincronizzato + codici univoci
- [ ] Rischio: accumulo promemoria non chiusi a fine turno
  Mitigazione: escalation obbligatoria + passaggio consegne con report
- [ ] Rischio: regressioni dopo aggiornamento app
  Mitigazione: rollout pilot su 1-2 device prima del rilascio completo
- [ ] Rischio: conflitto tra due dispositivi sullo stesso record
  Mitigazione: controllo `datasetVersion`, merge guidato e tombstone logiche

## Cadenza Consigliata

- daily operativo: 15 minuti (stato task e blocchi)
- sync tecnico: 2 volte a settimana
- review stakeholder: fine di ogni settimana

## Evidenze Minime Da Conservare

- screenshot schermate chiave per telefono e tablet
- screenshot schermate chiave per browser desktop
- log sync locale e Gist/API GitHub per test principali
- report test backup/restore
- changelog versioni app
