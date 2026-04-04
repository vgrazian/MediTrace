# PR #22 Review Checklist - Week 5 Catalogo Farmaci Operativo

## Scope Verification
- [ ] Vista Farmaci non e' piu' placeholder e supporta flusso operativo reale.
- [ ] Form creazione farmaco include principio attivo, classe, scorta minima.
- [ ] Form creazione confezione collega correttamente la confezione al farmaco selezionato.
- [ ] Tabella confezioni espone dati utili (nome commerciale, dosaggio, quantita', soglia, scadenza).

## Data Integrity and Sync
- [ ] Creazione farmaco scrive record `drugs` con `syncStatus: pending`.
- [ ] Creazione/disattivazione confezione scrive `stockBatches` con campi sync coerenti.
- [ ] Operazioni enqueuano correttamente `syncQueue` (`drugs` e `stockBatches`).
- [ ] Eventi audit sono registrati in `activityLog` con action attese.

## Functional Validation
- [ ] Salvataggio farmaco mostra feedback utente e aggiorna tabella farmaci.
- [ ] Salvataggio confezione mostra feedback utente e aggiorna tabella confezioni.
- [ ] Disattivazione confezione (con conferma) rimuove la riga dall'elenco attivo.
- [ ] Stati vuoti e messaggi guida sono chiari e non bloccano il flusso.

## Regression and Quality
- [ ] E2E `farmaci.spec.js` copre create + deactivate batch.
- [ ] Suite E2E completa resta green.
- [ ] Unit test suite resta green.
- [ ] Build produzione resta green.

## Merge Readiness
- [ ] Criteri issue #21 soddisfatti end-to-end.
- [ ] Nessun commento bloccante aperto in review.
- [ ] Messaggio squash merge chiaro e tracciabile rispetto a Week 5.
