# Checklist Esecutiva MediTrace

## Obiettivo

Passare da documentazione e prototipo a un MVP operativo testato su dispositivi reali (telefono + tablet Android economici), con tracciamento operatori, promemoria terapia, audit centrale e backup/aggiornabilita'.

## Modalita' d'uso

- stato task: `TODO`, `IN CORSO`, `BLOCCATO`, `DONE`
- owner: nome referente
- evidenza: link a commit, screenshot, log o foglio

## Fase 1 - Setup Operativo (Settimana 1)

### 1.1 Congelamento specifiche v1

- [x] Confermare schema fogli v1 (`google-sheets-schema`)
- [x] Confermare endpoint API minimi (`google-apps-script-api`)
- [x] Confermare regole alert turno (`alert-rules-turni`)
- [x] Definire regole naming ID (`drug_id`, `therapy_id`, `operator_id`, `reminder_id`)

Criterio accettazione:

- un documento decisionale condiviso con versione `v1-approved`
- evidenza: `docs/decisione-v1-approved.md` (2026-03-27)

### 1.2 Workbook Google reale

- [x] Creare workbook produzione/staging
- [x] Importare tutti i CSV template
- [x] Applicare data validation su stati e priorita'
- [x] Proteggere fogli tecnici (`SyncLog`, `AuditLogCentrale`)
- [x] Verificare permessi di accesso per utenza autorizzata

Stato operativo:

- automazione pronta via `createWorkbookPairAndHarden()` in `templates/google-sheets/apps-script/MediTraceAutomation.gs`
- guida operativa aggiornata in `templates/google-sheets/apps-script/README.md`

Criterio accettazione:

- workbook accessibile e compilabile con struttura completa (11 fogli)
- evidenza minima: URL STAGING + URL PROD + screenshot fogli + screenshot protezioni/app validation

Evidenze raccolte (2026-03-27):

- STAGING: <https://docs.google.com/spreadsheets/d/1DCPzPHU_zjDfRbep-EyO4RXkwLR7tqzkvic2rqSB7vQ/edit>
- PROD: <https://docs.google.com/spreadsheets/d/1AJ6Qhw5-EG6ydEGz_5hRjh4xeKHtIiJiJcNZNOLkavw/edit>
- Pre-check editor: `meditace0@gmail.com` non valido (ignorato), `valeriograziani@gmail.com` valido

### 1.3 Middleware Apps Script base

- [ ] Implementare check API key
- [ ] Implementare routing `action` su GET/POST
- [ ] Implementare idempotenza con `requestId`
- [ ] Implementare endpoint operatori (`operators_list`, `operator_upsert`)
- [ ] Implementare endpoint promemoria (`reminders_due`, `reminder_update`)
- [ ] Implementare endpoint terapia/farmaco (`therapy_upsert`, `drug_upsert`)
- [ ] Implementare endpoint audit (`audit_log`)

Criterio accettazione:

- test manuale endpoint con risposta `200` e scrittura corretta su fogli

## Fase 2 - MVP Android (Settimana 2-3)

### 2.1 Fondazione app

- [ ] Inizializzare progetto Android Kotlin
- [ ] Configurare Room + Retrofit + OkHttp + WorkManager
- [ ] Impostare migrazione schema Room v1
- [ ] Configurare build variant `staging` e `prod`

Criterio accettazione:

- app avviabile su Android 11/12/13 senza crash al cold start

### 2.2 Flussi core MVP

- [ ] Selezione operatore da lista
- [ ] Aggiunta operatore se non presente
- [ ] Lista promemoria turno con stato e priorita'
- [ ] Chiusura promemoria (`SOMMINISTRATO`, `POSTICIPATO`, `SALTATO`)
- [ ] Modifica posologia e terapia attiva
- [ ] Inserimento nuovo farmaco nel catalogo centrale

Criterio accettazione:

- ogni azione clinico-operativa salva `operator_id` e viene auditata

### 2.3 Sync e resilienza

- [ ] Coda offline per operazioni senza rete
- [ ] Sync push/pull periodico con WorkManager
- [ ] Retry con backoff
- [ ] Gestione conflitti base su `updatedAt`
- [ ] Log tecnico su `SyncLog`

Criterio accettazione:

- scenario offline -> online completato senza perdita eventi

## Fase 3 - Qualita' Operativa (Settimana 4)

### 3.1 UI adattiva telefono/tablet

- [ ] Layout `compact` validato su telefono
- [ ] Layout `expanded` validato su tablet
- [ ] Navigazione coerente portrait/landscape
- [ ] Nessun clipping testuale su font maggiorato

Criterio accettazione:

- checklist UX completata su almeno 1 telefono + 1 tablet low-end

### 3.2 Performance e stabilita'

- [ ] Avvio app entro soglia definita
- [ ] Scrolling liste fluido su device entry-level
- [ ] Sync completato entro finestra operativa attesa
- [ ] Test memoria su sessione lunga turno

Criterio accettazione:

- nessun blocco critico in test turno simulato di 2 ore

### 3.3 Backup, restore, aggiornamenti

- [ ] Definire frequenza backup e owner operativo
- [ ] Testare restore completo su dispositivo secondario
- [ ] Definire canale aggiornamento (pilot + rollout)
- [ ] Testare upgrade versione con migrazione dati
- [ ] Documentare procedura rollback

Criterio accettazione:

- runbook operativo approvato e testato almeno una volta

## Gate Di Rilascio MVP

Prima del go-live, tutti i gate devono essere `DONE`:

- [ ] Gate A - End-to-end clinico: promemoria -> esito -> audit -> sync
- [ ] Gate B - Tracciabilita': nessuna azione clinica senza `operator_id`
- [ ] Gate C - Sicurezza base: API key attiva e accessi fogli controllati
- [ ] Gate D - Affidabilita': test offline/online e restore superati
- [ ] Gate E - Usabilita': test su telefono + tablet superati con feedback positivo

## Registro Rischi E Mitigazioni (Operativo)

- [ ] Rischio: operatori non allineati in anagrafica
  Mitigazione: revisione settimanale foglio `Operatori` + codici univoci
- [ ] Rischio: accumulo promemoria non chiusi a fine turno
  Mitigazione: escalation obbligatoria + passaggio consegne con report
- [ ] Rischio: regressioni dopo aggiornamento app
  Mitigazione: rollout pilot su 1-2 device prima del rilascio completo
- [ ] Rischio: errore umano su fogli manuali
  Mitigazione: protezioni range e audit operativo sempre attivo

## Cadenza Consigliata

- daily operativo: 15 minuti (stato task e blocchi)
- sync tecnico: 2 volte a settimana
- review stakeholder: fine di ogni settimana

## Evidenze Minime Da Conservare

- screenshot schermate chiave per telefono e tablet
- log endpoint middleware per test principali
- export `SyncLog` e `AuditLogCentrale` del test turno
- report test backup/restore
- changelog versioni app
