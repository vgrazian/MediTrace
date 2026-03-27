# MediTrace Operationalization Playbook

Data: 2026-03-27
Ambito: stabilizzazione operativa dopo rilascio API Apps Script + smoke test CI

## Obiettivo

Passare da implementazione funzionante a esercizio operativo ripetibile e controllato:

- test automatici backend affidabili
- segreti gestiti correttamente
- policy di merge protette
- evidenze di rilascio tracciabili

## Prerequisiti

- Deployment Web App Apps Script attivo e accessibile.
- Script Properties configurate nel progetto Apps Script corretto:
  - MEDITRACE_API_KEY
  - MEDITRACE_SPREADSHEET_ID
- Workflow GitHub presente: .github/workflows/apps-script-smoke.yml

## Fase 1: Attivazione CI Smoke

1. Aprire GitHub repository settings.
2. Andare su Secrets and variables > Actions.
3. Configurare i secrets repository:
   - MEDITRACE_WEB_APP_URL
   - MEDITRACE_API_KEY
4. Lanciare workflow manuale Apps Script Smoke Test in modalita fixture.
5. Verificare esito positivo end-to-end.
6. Lanciare workflow manuale in modalita strict.
7. Verificare che strict passi con dati reali disponibili, oppure documentare chiaramente la precondizione dati.

Criterio di uscita:

- fixture green
- strict green (oppure strict expected-fail con motivazione e piano di stabilizzazione)

## Fase 2: Igiene Segreti e Rotazione

1. Generare nuova API key per staging.
2. Aggiornare Script Properties nel progetto Apps Script di staging.
3. Aggiornare il secret MEDITRACE_API_KEY in GitHub.
4. Rieseguire smoke fixture e strict.
5. Revocare chiavi precedenti non piu usate.

Nota:

- non committare mai credenziali reali nei file del repository.
- mantenere i valori sensibili solo in secret store (GitHub Secrets, Script Properties, password manager).

## Fase 3: Protezione Branch Main

1. Abilitare branch protection su main.
2. Richiedere status check obbligatorio prima del merge.
3. Impostare come required check il workflow smoke test.
4. Abilitare blocco merge in caso di check non riusciti.
5. Opzionale consigliato: richiedere almeno 1 review umana.

Criterio di uscita:

- nessuna PR puo essere mergiata su main con smoke rosso.

## Fase 4: Allineamento Contratto API

1. Verificare differenze tra contratto e implementazione attuale.
2. Decisione esplicita su endpoint audit_log:
   - opzione A: endpoint pubblico dedicato
   - opzione B: audit solo interno agli endpoint clinici
3. Aggiornare documentazione API per eliminare ambiguita.
4. Rieseguire smoke e aggiornare evidenze.

Criterio di uscita:

- contratto e comportamento runtime allineati.

## Fase 5: Rilascio Operativo

Checklist minima pre-rilascio:

- workflow CI smoke fixture green
- workflow CI smoke strict green
- chiavi ruotate e confermate
- branch protection attiva
- documentazione API aggiornata
- evidenze test archiviate in docs

Checklist post-rilascio (24-72h):

- monitorare errori 401/403/500 nei log operativi
- verificare crescita controllata di AuditLogCentrale e SyncLog
- controllare ripetizioni anomale su requestId (idempotenza)

## Evidenze consigliate da conservare

- screenshot esecuzioni workflow GitHub (fixture + strict)
- timestamp rotazione segreti
- conferma branch protection
- link commit/documenti aggiornati

## RACI sintetico

- Owner prodotto: approvazione go/no-go
- Responsabile tecnico: configurazioni GitHub e policy branch
- Operazioni: gestione segreti e rotazioni
- QA/validazione: esecuzione smoke e raccolta evidenze

## Frequenza operativa consigliata

- Smoke fixture: giornaliero (schedulato)
- Smoke strict: giornaliero oppure ad ogni rilascio
- Rotazione key: almeno trimestrale o immediata in caso di sospetta esposizione
