# Template Operativo Google Sheets

Questa cartella contiene un template pronto da importare in Google Sheets.

Ogni file CSV corrisponde a un foglio del workbook MediTrace.

## Ordine consigliato di importazione

1. `01_CatalogoFarmaci.csv`
2. `02_ConfezioniMagazzino.csv`
3. `03_Ospiti.csv`
4. `04_TerapieAttive.csv`
5. `05_Movimenti.csv`
6. `06_Ordini.csv`
7. `07_DashboardScorte.csv`
8. `08_SyncLog.csv`
9. `09_PromemoriaSomministrazioni.csv`
10. `10_AuditLogCentrale.csv`
11. `11_Operatori.csv`

Per il foglio `DashboardScorte` usare anche le istruzioni in `07_DashboardScorte_formule.md`.
Per il foglio `Ordini` usare anche `06_Ordini_formule.md`.
Per ridurre il numero di formule, usare `apps-script/MediTraceAutomation.gs`.
Per endpoint e payload del middleware, usare `../../docs/google-apps-script-api.md`.
Per alert turni e escalation, usare `../../docs/alert-rules-turni.md`.

## Uso pratico

1. Creare un nuovo file Google Sheets.
2. Rinominare o creare i fogli con gli stessi nomi dei CSV.
3. Importare ogni CSV nel foglio corrispondente usando l'opzione di sostituzione del foglio corrente.
4. Bloccare la prima riga di ogni foglio.
5. Applicare convalide dati alle colonne con valori chiusi come `stato_scorta`, `tipo_movimento`, `priorita'`, `stato`.

## Note

- I CSV contengono solo intestazioni, quindi sono adatti come base pulita per l'import iniziale.
- `DashboardScorte` e' un foglio di lettura: puo' essere popolato con formule oppure dal middleware.
- `SyncLog` e' un foglio tecnico: non va compilato manualmente salvo emergenze.
- `AuditLogCentrale` e' il log operativo centralizzato (azioni operatore, modifiche terapia/posologia, esiti promemoria).
- `Operatori` e' la lista centralizzata per selezione nome operatore e tracciamento `operator_id`.
- Nel template `DashboardScorte` sono previste alcune colonne di supporto finali da nascondere dopo avere incollato le formule.
- Lo script Apps Script aggiorna `DashboardScorte` e suggerisce righe in `Ordini` con motivo `AUTO:`.
