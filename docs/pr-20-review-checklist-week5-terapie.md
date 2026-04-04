# PR #20 Review Checklist - Week 5 Terapie CRUD

## Scope Verification

- [ ] Vista Terapie non e' piu' placeholder ed espone flusso operativo reale.
- [ ] Form creazione terapia include host, farmaco, dose/frequenza, consumo e finestra date.
- [ ] Elenco terapie attive mostra i dati principali con mapping host/farmaco leggibile.
- [ ] Azione di disattivazione applica soft-delete coerente con modello locale.

## Data Integrity and Sync

- [ ] Creazione terapia scrive in `therapies` con `syncStatus: pending`.
- [ ] Creazione e disattivazione enqueuano correttamente `syncQueue` (`entityType: therapies`).
- [ ] Eventi audit vengono registrati in `activityLog` con action attesa.
- [ ] Nessuna regressione su campi `updatedAt`/`deletedAt` per sincronizzazione.

## Functional Validation

- [ ] Con dataset senza host/farmaci, UI mostra messaggio guida e blocca creazione.
- [ ] Dopo import host/farmaco, selettori si abilitano e consentono salvataggio.
- [ ] Dopo disattivazione, la terapia non compare piu' tra le attive.
- [ ] Messaggi successo/errore sono chiari e coerenti.

## Regression and Quality

- [ ] E2E dedicato `terapie.spec.js` copre create + deactivate end-to-end.
- [ ] Suite E2E completa resta green.
- [ ] Suite unit test resta green.
- [ ] Build produzione resta green.

## Merge Readiness

- [ ] Accettazione issue #19 soddisfatta end-to-end.
- [ ] Nessun commento review bloccante aperto.
- [ ] Messaggio squash merge chiaro e coerente con Week 5.
