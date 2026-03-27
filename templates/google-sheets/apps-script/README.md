# Automazione Apps Script

Il file `MediTraceAutomation.gs` riduce il numero di formule nel workbook:

- rigenera `DashboardScorte` con logica centralizzata
- genera suggerimenti automatici in `Ordini`

## Installazione Rapida

1. Aprire il Google Sheet.
2. Aprire `Estensioni > Apps Script`.
3. Incollare il contenuto di `MediTraceAutomation.gs`.
4. Salvare.
5. Eseguire `runMediTraceRefresh`.
6. Concedere i permessi richiesti.

Dopo il primo avvio comparira' il menu `MediTrace` nel foglio.

## Funzioni Principali

- `createWorkbookPairFromTemplates()`: crea workbook STAGING e PROD con tutti i fogli template e intestazioni
- `createWorkbookPairAndHarden()`: crea workbook STAGING e PROD e applica data validation + protezioni fogli tecnici
- `initializeCurrentWorkbookFromTemplates()`: inizializza il workbook corrente con i fogli template
- `applyWorkbookHardeningToCurrent()`: applica data validation e protezione fogli tecnici al workbook corrente
- `runMediTraceRefresh()`: aggiorna dashboard e suggerimenti ordini
- `refreshDashboardScorte()`: rigenera il foglio `DashboardScorte`
- `refreshOrdiniSuggeriti()`: aggiorna suggerimenti automatici su `Ordini`

## Web API (Fase 1.3)

Il file `MediTraceApi.gs` aggiunge endpoint Web App con router `action`:

- `GET action=pull`
- `POST action=push`
- `GET action=operators_list`
- `POST action=operator_upsert`
- `GET action=reminders_due`
- `POST action=reminder_update`
- `POST action=therapy_upsert`
- `POST action=drug_upsert`

Note operative:

- idempotenza su tutte le `POST` tramite `requestId`
- validazione API key tramite parametro `apiKey` in query/body
- API key lette da `Script Properties`:
  - `MEDITRACE_API_KEY`
  - `MEDITRACE_STAGING_API_KEY`
  - `MEDITRACE_PROD_API_KEY`
- Spreadsheet target (fortemente consigliato):
  - `MEDITRACE_SPREADSHEET_ID` (ID del workbook da usare per tutte le operazioni API)

Nota:

- Se `MEDITRACE_SPREADSHEET_ID` non e' impostato, l'API prova a usare lo spreadsheet attivo del contesto script, che puo' non corrispondere al workbook atteso in deployment Web App.

Se non trovi il pannello `Project Settings > Script properties` nell'editor Apps Script:

1. Esegui la funzione `apiSetupScriptPropertiesTemplate_()` da `MediTraceApi.gs`.
2. Apri poi `Project Settings > Script properties` e sostituisci i placeholder con i valori reali.
3. Esegui `apiScriptPropertiesStatus_()` per verificare la configurazione (mostra solo stato, non i segreti).

### Utility operative

- Smoke test endpoint (8 action contratto + 1 fixture reminder): `smoke-test-api.sh`
- Wrapper smoke test con URL+key: `run-smoke-test.sh`
- Checklist deploy Script Properties: `deployment-checklist-script-properties.md`

Esempio rapido smoke test:

```bash
cd templates/google-sheets/apps-script
WEB_APP_URL="https://script.google.com/macros/s/XXXX/exec" API_KEY="<env-key>" ./smoke-test-api.sh
```

Esempio wrapper (popola WEB_APP_URL e API_KEY e avvia il test):

```bash
cd templates/google-sheets/apps-script
./run-smoke-test.sh --url "https://script.google.com/macros/s/XXXX/exec" --key "<env-key>"
```

## Creazione Workbook Produzione/Staging

Passi consigliati:

1. Aprire un progetto Apps Script (standalone o dal foglio).
2. Incollare `MediTraceAutomation.gs`.
3. Eseguire `createWorkbookPairAndHarden()`.
4. Copiare gli URL restituiti (STAGING e PROD).

Il bootstrap crea tutti i fogli con intestazioni equivalenti all'import dei CSV template in `templates/google-sheets/`.

## Hardening Incluso (Checklist 1.2)

Lo script applica automaticamente:

- data validation su stati/priorita' nei fogli operativi
- protezione fogli tecnici: `SyncLog`, `AuditLogCentrale`
- pre-check email editor: alert con lista email non valide prima di applicare protezioni

Nota:

- verificare e aggiornare `SECURITY_CONFIG.ALLOWED_EDITORS` prima dell'uso in produzione
