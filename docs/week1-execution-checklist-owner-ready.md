# Week 1 Execution Checklist (Owner-Ready)

Data: 2026-03-27
Fonte: `docs/checklist-esecutiva.md` (Fase 1 - Settimana 1)
Orizzonte: 5 giorni lavorativi

## Ruoli consigliati

- `PM`: coordinamento e avanzamento daily
- `AS-Lead`: Apps Script Web API
- `Data-Owner`: workbook, schema, validazioni, permessi
- `Android-Lead`: bootstrap client Android
- `QA-Ops`: test evidenze e gate sicurezza base

## Piano operativo (giorno per giorno)

| ID | Task | Owner | Giorno target | Dipendenze | Evidenza richiesta | Stato |
| --- | --- | --- | --- | --- | --- | --- |
| W1-01 | Kickoff operativo + assegnazione owner nominali | PM | D1 mattina | nessuna | Verbale kickoff in repo/wiki | TODO |
| W1-02 | Verifica scope congelato v1 e freeze cambi | PM | D1 mattina | W1-01 | Link a `docs/decisione-v1-approved.md` | TODO |
| W1-03 | Validare workbook STAGING/PROD creati e accessibili | Data-Owner | D1 | W1-01 | URL STAGING + PROD + screenshot fogli | TODO |
| W1-04 | Verifica permessi tecnici (`SyncLog`, `AuditLogCentrale`) | Data-Owner | D1 | W1-03 | Screenshot protezioni e lista editor autorizzati | TODO |
| W1-05 | Allineare `ALLOWED_EDITORS` reale in script | Data-Owner | D1 | W1-03 | Commit script + screenshot pre-check pulito | TODO |
| W1-06 | Disegnare skeleton middleware API (`doGet`/`doPost`) | AS-Lead | D2 mattina | W1-02 | Commit con dispatcher `action` + smoke test | TODO |
| W1-07 | Implementare auth `X-API-KEY` + errori 401/403 | AS-Lead | D2 | W1-06 | Log test con key valida/non valida | TODO |
| W1-08 | Implementare idempotenza `requestId` | AS-Lead | D2 | W1-06 | Test doppia submit con stesso `requestId` | TODO |
| W1-09 | Endpoint `operators_list` + `operator_upsert` | AS-Lead | D3 | W1-07, W1-08 | `curl` test + righe su `Operatori` | TODO |
| W1-10 | Endpoint `reminders_due` + `reminder_update` con audit | AS-Lead | D3 | W1-07, W1-08 | `curl` test + righe su `Promemoria` e `AuditLogCentrale` | TODO |
| W1-11 | Endpoint `therapy_upsert` + `drug_upsert` con audit | AS-Lead | D4 | W1-07, W1-08 | `curl` test + righe su `TerapieAttive`/`CatalogoFarmaci` + audit | TODO |
| W1-12 | Endpoint `audit_log` + validazione payload minima | AS-Lead | D4 | W1-07, W1-08 | `curl` test + audit write verificata | TODO |
| W1-13 | Smoke test end-to-end middleware (8 endpoint) | QA-Ops | D5 mattina | W1-09..W1-12 | Test report con esito `200`/errori attesi | TODO |
| W1-14 | Bootstrap progetto Android multi-modulo locale | Android-Lead | D5 | W1-01 | Build locale + avvio emulatore/dispositivo | TODO |
| W1-15 | Review di chiusura Week 1 e blocchi Week 2 | PM | D5 pomeriggio | W1-13, W1-14 | Note review + backlog aggiornato | TODO |

## Definition of Done Week 1

Per chiudere settimana 1 come `DONE`:

1. Tutti i task W1-01..W1-15 in stato `DONE` o con blocker esplicito.
2. Gli 8 endpoint minimi rispondono secondo contratto con test manuali ripetibili.
3. Security base attiva (`X-API-KEY`, permessi workbook verificati, nessun segreto in repo).
4. Struttura Android iniziale creata e compilabile localmente.

## Riti operativi

- Daily 15 minuti: 09:00, owner aggiornano stato e blocchi.
- Sync tecnico: martedi e giovedi.
- Review stakeholder: venerdi 16:00.

## Tracciamento rapido

Usare questo blocco nel daily:

```text
Task ID:
Owner:
Stato: TODO | IN CORSO | BLOCCATO | DONE
Prossimo passo:
Blocco:
Evidenza link:
```
