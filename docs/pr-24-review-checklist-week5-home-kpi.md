# PR #24 Review Checklist - Week 5 Dashboard Home KPI

## Scope Verification

- [ ] Home non mostra piu' placeholder e presenta KPI reali.
- [ ] KPI principali includono ospiti attivi, terapie attive, confezioni attive e stock critico.
- [ ] Sezione promemoria del giorno mostra numero totale e quota non eseguita.
- [ ] Metadati dashboard espongono elementi utili (versione dataset, coda sync, ultimo sync).

## Data and Aggregation Integrity

- [ ] Aggregazione in `homeDashboard` usa dati locali reali da IndexedDB.
- [ ] Conteggio promemoria giornalieri usa finestra temporale corretta per il giorno corrente.
- [ ] Conteggio sync queue riflette lo stato locale senza side effect.
- [ ] Gestione fallback (assenza dati/invalid date) non rompe rendering della Home.

## Functional Validation

- [ ] Dopo seed/import dati, KPI in Home si aggiornano con valori coerenti.
- [ ] Link rapidi aprono le viste attese senza collisioni di selector E2E.
- [ ] Evidenziazione promemoria da deep-link resta leggibile e coerente con tema UI.
- [ ] Messaggi/microcopy restano comprensibili per operatori non tecnici.

## Regression and Quality

- [ ] Unit test `homeDashboard.spec.js` resta green.
- [ ] Suite E2E completa resta green dopo i nuovi quick-link.
- [ ] Build produzione resta green.
- [ ] Nessuna regressione grafica su palette branding (blu scuro, azzurro, bianco).

## Merge Readiness

- [ ] Criteri issue #23 soddisfatti end-to-end.
- [ ] Nessun commento bloccante aperto in review.
- [ ] Messaggio squash merge tracciabile rispetto a Week 5 Home KPI.