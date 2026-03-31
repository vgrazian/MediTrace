> ⚠️ **DOCUMENTO STORICO — SUPERATO**
> Questo documento riporta la validazione degli endpoint Apps Script dell'architettura precedente (Android + Apps Script + Google Sheets).
> Non è più la baseline di implementazione. Riferirsi a [architecture.md](architecture.md) per l'architettura corrente (PWA + IndexedDB + Google Drive).

# Validazione Endpoint Apps Script vs Contratto API

Data verifica: 2026-03-27
Verificato da: GitHub Copilot
Riferimenti:

- Contratto: `docs/google-apps-script-api.md`
- Implementazione corrente: `templates/google-sheets/apps-script/MediTraceApi.gs`
- Script smoke test: `templates/google-sheets/apps-script/smoke-test-api.sh`

## Esito sintetico

- Copertura endpoint richiesta: **8/8 endpoint HTTP implementati (contratto fase 1.3)**
- Copertura convenzioni middleware (auth, routing, idempotenza, error payload): **implementata**
- Copertura automazione workbook/dashboard/ordini: **implementata** (file separato)

Conclusione: la Web API Apps Script e' operativa su deployment pubblico e allineata al contratto base fase 1.3.

## Matrice di copertura endpoint

| Requisito contratto | Stato | Evidenza nel codice |
| --- | --- | --- |
| `GET /exec?action=pull&since=...` | COPERTO | `apiHandlePull_` in dispatcher `doGet` |
| `POST /exec?action=push` | COPERTO | `apiHandlePush_` con batch accepted/rejected |
| `GET action=operators_list` | COPERTO | `apiHandleOperatorsList_` |
| `POST action=operator_upsert` | COPERTO | `apiHandleOperatorUpsert_` |
| `GET action=reminders_due` | COPERTO | `apiHandleRemindersDue_` |
| `POST action=reminder_update` | COPERTO | `apiHandleReminderUpdate_` con audit |
| `POST action=therapy_upsert` | COPERTO | `apiHandleTherapyUpsert_` con audit |
| `POST action=drug_upsert` | COPERTO | `apiHandleDrugUpsert_` con audit |

## Matrice di copertura convenzioni middleware

| Convenzione | Stato | Evidenza |
| --- | --- | --- |
| API key obbligatoria (`apiKey` query/body) | COPERTO | `apiAuthorize_` + Script Properties |
| Routing `action` su GET/POST | COPERTO | `apiDispatch_`, `API_GET_ROUTES`, `API_POST_ROUTES` |
| Idempotenza con `requestId` su POST | COPERTO | `apiCheckIdempotency_`, `apiMarkIdempotent_` |
| Risposta JSON uniforme con `serverTime` | COPERTO | `apiJsonResponse_`, `apiErrorPayload_` |
| Codici errore dominio (400/401/403/422/500 in payload) | COPERTO | envelope `error.code/message/httpStatus` |
| Obbligo `operatorId` per azioni cliniche | COPERTO | validazione in reminder/therapy/drug upsert |
| Workbook target esplicito | COPERTO | `MEDITRACE_SPREADSHEET_ID` in `apiSpreadsheet_` |

## Evidenza test operativa (deploy live)

Smoke test eseguito con deployment pubblico aggiornato:

- GET `pull`: OK
- POST `push`: OK
- GET `operators_list`: OK
- POST `operator_upsert`: OK
- GET `reminders_due`: OK
- POST `reminder_update`: OK (con fixture reminder creato dallo smoke flow)
- POST `therapy_upsert`: OK
- POST `drug_upsert`: OK

Nota: lo smoke script esegue una `push` aggiuntiva di fixture reminder prima di `reminder_update` per evitare falsi negativi dovuti a dataset vuoto.

## Evidenze puntuali (line references)

- Entry points web: `doGet`, `doPost` in `templates/google-sheets/apps-script/MediTraceApi.gs`
- Dispatcher action + auth + idempotenza: `apiDispatch_` in `templates/google-sheets/apps-script/MediTraceApi.gs`
- Handler endpoint fase 1.3: `apiHandle*` in `templates/google-sheets/apps-script/MediTraceApi.gs`
- Script di verifica end-to-end: `templates/google-sheets/apps-script/smoke-test-api.sh`

## Gap residui (non bloccanti fase 1.3)

1. Allineare documentazione contratto se si vuole supportare anche endpoint `audit_log` dedicato (oggi audit e' scritto internamente agli endpoint clinici).
2. Aggiungere test di concorrenza/idempotenza su carico piu' elevato.
3. Definire policy di retention per chiavi `idem:*` in Script Properties.

## Raccomandazione operativa immediata

Separare in due file Apps Script per ridurre rischio regressioni:

- `MediTraceAutomation.gs`: resta dedicato a bootstrap/hardening/dashboard/ordini.
- `MediTraceApi.gs`: contiene solo Web API (`doGet`/`doPost`, auth, routing, endpoint handlers, error mapping).

Stato attuale: separazione applicata.
