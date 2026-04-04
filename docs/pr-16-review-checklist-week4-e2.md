# PR #16 Review Checklist - Week 4 E2 Notification Hardening

PR: https://github.com/vgrazian/MediTrace/pull/16

## Acceptance Criteria

- [ ] Le notifiche hanno stato esplicito in UI (`ready`, `permission-required`, `blocked-by-browser`, `api-unsupported`).
- [ ] Il pulsante `Invia notifica test` funziona solo con permesso granted.
- [ ] Il pulsante `Verifica promemoria imminenti` esegue il controllo manuale senza attendere il timer.
- [ ] Lo stesso reminder non viene rinotificato durante la finestra di cooldown.
- [ ] Il click sulla notifica porta alla vista Promemoria con highlight del reminder target.
- [ ] In ambiente non supportato viene mostrato fallback operativo chiaro.

## Evidence Checklist

- [ ] Screenshot stato notifiche in Impostazioni.
- [ ] Screenshot/registrazione notifica test.
- [ ] Screenshot deep-link su vista Promemoria evidenziata.
- [ ] `test` GitHub Actions verde.
- [ ] Validazione locale eseguita: `npm run test:unit`, `npm run test:e2e`, `npm run build`.

## File Scope

- [pwa/src/services/notifications.js](pwa/src/services/notifications.js)
- [pwa/src/views/ImpostazioniView.vue](pwa/src/views/ImpostazioniView.vue)
- [pwa/src/views/PromemoriaView.vue](pwa/src/views/PromemoriaView.vue)
- [pwa/tests/unit/notifications.spec.js](pwa/tests/unit/notifications.spec.js)
- [pwa/tests/e2e/notifications.spec.js](pwa/tests/e2e/notifications.spec.js)

## Go / No-Go

### GO

- [ ] Merge se il check `test` resta verde e i 6 acceptance criteria sono verificati.

### NO-GO

- [ ] Deep-link notifica non funzionante.
- [ ] Reminder rinotificati troppo frequentemente.
- [ ] Fallback non chiaro su browser non supportato.
