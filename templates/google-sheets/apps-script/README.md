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
