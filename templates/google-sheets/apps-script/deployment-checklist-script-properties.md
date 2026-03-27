# Deployment Checklist - Script Properties (Web API)

Data: 2026-03-27
Scope: setup properties and deploy `MediTraceApi.gs` as Web App.

## 1. Prerequisites

- `MediTraceApi.gs` and `MediTraceAutomation.gs` are in the same Apps Script project.
- Workbook has all required sheets:
  - `CatalogoFarmaci`
  - `ConfezioniMagazzino`
  - `TerapieAttive`
  - `Movimenti`
  - `PromemoriaSomministrazioni`
  - `Operatori`
  - `SyncLog`
  - `AuditLogCentrale`
- Deployment account has edit permission on workbook and script.

## 2. Configure Script Properties

In Apps Script:

1. Open Project Settings.
2. Under Script Properties, add keys:
   - `MEDITRACE_STAGING_API_KEY`
   - `MEDITRACE_PROD_API_KEY`
   - `MEDITRACE_SPREADSHEET_ID`
3. Optional compatibility key:
   - `MEDITRACE_API_KEY`

Per `MEDITRACE_SPREADSHEET_ID`:

- usare l'ID del workbook MediTrace (la parte tra `/d/` e `/edit` nell'URL del foglio)
- esempio URL: `https://docs.google.com/spreadsheets/d/abc123DEF456/edit`
- valore da salvare: `abc123DEF456`

Recommended policy:

- Use separate keys for staging and prod.
- Use strong random values (>= 32 chars).
- Store master copies in a password manager.
- Rotate keys every 90 days.

## 3. Deploy Web App

1. Click Deploy > New deployment.
2. Select type: Web app.
3. Description example: `MediTrace API v1`.
4. Execute as: account owner.
5. Who has access: restricted to authorized users as per policy.
6. Deploy and save Web App URL.

## 4. Environment Mapping

- STAGING URL -> save in staging mobile config.
- PROD URL -> save in prod mobile config.
- Keep URLs and API keys mapped correctly (never cross-use).

## 5. Post-deploy Validation

Run smoke test script from repo:

```bash
cd templates/google-sheets/apps-script
chmod +x smoke-test-api.sh
WEB_APP_URL="https://script.google.com/macros/s/XXXX/exec" API_KEY="<env-key>" ./smoke-test-api.sh
```

Expected baseline:

- `pull`, `operators_list`, `reminders_due` return JSON with `serverTime`.
- `operator_upsert`, `therapy_upsert`, `drug_upsert` return `ok: true`.
- `push` returns `accepted`/`rejected` arrays.
- `reminder_update` can fail with `BAD_REQUEST` if `reminderId` does not exist yet.

## 6. Security Checks

- Confirm no real API keys are committed in repository files.
- Confirm script logs do not print full keys.
- Confirm `SyncLog` tracks `AUTH_FAIL` on invalid key tests.
- Confirm workbook sharing only includes authorized accounts.

## 7. Rollback Plan

- Keep previous Web App deployment version available.
- If regression occurs, redeploy previous stable version.
- Rotate key immediately if accidental exposure is suspected.
