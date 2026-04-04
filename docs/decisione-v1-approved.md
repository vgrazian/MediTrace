# Decisione v1-approved

Data: 2026-03-31
Stato: APPROVATO

## Oggetto

Conferma del perimetro funzionale e tecnico v1 aggiornato per avvio implementazione MVP MediTrace multi-dispositivo.

## Punti Confermati

1. Frontend confermato come PWA Vue.js + Vite pubblicata su GitHub Pages.
2. Persistenza locale confermata su IndexedDB con Dexie.js.
3. Autenticazione confermata tramite utenza/password operatore.
4. Sincronizzazione confermata tramite GitHub Gist API su Gist privato, con segreto tecnico gestito internamente.
5. Strategia multi-dispositivo confermata: snapshot condiviso su Gist con merge locale e controllo versione dataset.
6. Regole alert turno confermate:
   - riferimento: `docs/archive/alert-rules-turni.md`
7. Regole naming ID confermate:
   - `drug_id`
   - `therapy_id`
   - `reminder_id`
   - `batch_id`
   - `host_id`

## Impatto Operativo

- L'architettura Android + Apps Script + Google Sheets non e' piu' la baseline di implementazione.
- Le prossime attivita' devono concentrarsi su PWA installabile, sync Gist e test cross-device.
- I documenti legacy relativi a Sheets/App Script restano storici finche' non rimossi, ma non guidano piu' il piano MVP.

## Nota

Ogni variazione successiva allo scope v1 deve essere registrata come change request con nuova revisione documento.
