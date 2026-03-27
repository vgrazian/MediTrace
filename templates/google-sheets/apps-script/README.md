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

- `runMediTraceRefresh()`: aggiorna dashboard e suggerimenti ordini
- `refreshDashboardScorte()`: rigenera il foglio `DashboardScorte`
- `refreshOrdiniSuggeriti()`: aggiorna suggerimenti automatici su `Ordini`
