# PR #12 Review Checklist - Week 3 (E2/E5/E6)

Obiettivo: chiudere rapidamente la review con criteri di accettazione oggettivi e verificabili.

PR: https://github.com/vgrazian/MediTrace/pull/12

## 1) Blocco E2 - Notifiche Push Foundation

### Acceptance Criteria

- [ ] Stato notifiche visibile in Impostazioni (supporto browser, permesso, stato attivo/non attivo).
- [ ] Pulsante abilita notifiche richiede correttamente il consenso utente.
- [ ] Pulsante test notifica invia una notifica quando il permesso e' granted.
- [ ] Polling promemoria attivo all'avvio app (senza azione manuale).
- [ ] Nessuna notifica duplicata per lo stesso reminder gia notificato.

### Evidence Checklist

- [ ] Screenshot UI sezione notifiche in Impostazioni.
- [ ] Screenshot/browser proof della notifica di test ricevuta.
- [ ] Test unit notifications PASS.
- [ ] Regressione E2E complessiva PASS.

### File Scope

- [pwa/src/services/notifications.js](pwa/src/services/notifications.js)
- [pwa/src/main.js](pwa/src/main.js)
- [pwa/src/views/ImpostazioniView.vue](pwa/src/views/ImpostazioniView.vue)
- [pwa/tests/unit/notifications.spec.js](pwa/tests/unit/notifications.spec.js)

## 2) Blocco E5 - Reportistica Operativa Base

### Acceptance Criteria

- [ ] In Scorte e' disponibile report KPI consumi/scorte.
- [ ] KPI minimi presenti: stock corrente, consumo settimanale, copertura settimane, soglia riordino.
- [ ] Priorita warning valorizzata (critica/alta/media/ok) con motivo esplicito.
- [ ] Ordinamento report prioritizza i warning piu critici.
- [ ] Export CSV report disponibile e scaricabile.

### Evidence Checklist

- [ ] Screenshot tabella report Scorte.
- [ ] Esempio CSV esportato con header e almeno una riga.
- [ ] Test unit reporting PASS.
- [ ] Build PASS.

### File Scope

- [pwa/src/services/reporting.js](pwa/src/services/reporting.js)
- [pwa/src/views/ScorteView.vue](pwa/src/views/ScorteView.vue)
- [pwa/tests/unit/reporting.spec.js](pwa/tests/unit/reporting.spec.js)

## 3) Blocco E6 - Session Hardening + Admin RBAC

### Acceptance Criteria

- [ ] Sessione con TTL attiva e verificata su azioni sensibili.
- [ ] Sessione invalidata esplicitamente su sign out e cambio password.
- [ ] Eventi auth critici tracciati in audit locale.
- [ ] Gestione utenti consentita solo ad account admin.
- [ ] Account non admin bloccato su operazioni gestione utenti.

### Evidence Checklist

- [ ] Verifica UI ruolo corrente in Impostazioni.
- [ ] Verifica blocco gestione utenti da account operator.
- [ ] Test unit auth aggiornati PASS.
- [ ] E2E auth/users PASS.

### File Scope

- [pwa/src/services/auth.js](pwa/src/services/auth.js)
- [pwa/src/views/ImpostazioniView.vue](pwa/src/views/ImpostazioniView.vue)
- [pwa/tests/unit/auth.spec.js](pwa/tests/unit/auth.spec.js)
- [pwa/tests/e2e/auth-and-users.spec.js](pwa/tests/e2e/auth-and-users.spec.js)

## 4) Quality Gate di Chiusura PR

- [ ] Unit test PASS
- [ ] E2E test PASS
- [ ] Build PASS
- [ ] Nessuna regressione funzionale nei flussi E3/E4/E8
- [ ] Branch protection soddisfatta (check test + review)

## 5) Go/No-Go

### GO se tutti i punti sono verificati

- [ ] Merge autorizzato
- [ ] Deploy monitorato post-merge
- [ ] Nota di rilascio Week 3 aggiornata

### NO-GO se almeno uno dei seguenti punti fallisce

- [ ] Failure in test/build
- [ ] Bug bloccante su auth/sessione o gestione utenti
- [ ] KPI report non coerenti su dataset di test
- [ ] Notifiche non funzionanti con permesso granted
