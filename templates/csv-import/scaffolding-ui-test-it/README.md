# Scaffolding UI Test Dataset (Italia)

ATTENZIONE: DATI FITTIZI SOLO PER TEST.

- Questi file sono pensati per testare la UI in locale/staging.
- Non usare in produzione.
- Prima del go-live, rimuovere i record con prefisso `TEST_`.

## Contenuto

- `01_CatalogoFarmaci.csv`: principi attivi e metadati farmaco.
- `02_ConfezioniMagazzino.csv`: confezioni collegate ai farmaci.
- `03_Ospiti.csv`: ospiti fittizi (prevalenza nomi italiani + alcuni nomi stranieri).
- `04_TerapieAttive.csv`: terapie attive di esempio.
- `05_Movimenti.csv`: movimenti di carico/scarico.
- `09_PromemoriaSomministrazioni.csv`: promemoria prossimi e passati.

## Note operative

- Usa in Impostazioni > Import CSV selezionando la sorgente corretta.
- Disattiva `dry-run` per popolare il DB locale di test.
- Tutti gli ID hanno prefisso `TEST_` per facilitare la pulizia finale.
