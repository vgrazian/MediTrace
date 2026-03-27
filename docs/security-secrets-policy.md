# Security Secrets Policy - MediTrace

## Obiettivo

Definire regole operative per gestire in modo sicuro:

- API key
- credenziali account
- backup e restore
- audit e risposta a incidenti

Questa policy e' obbligatoria per tutti gli ambienti (`STAGING`, `PROD`).

## Principi Base

1. Minimo privilegio: ogni utente e servizio ha solo i permessi strettamente necessari.
2. Segreti fuori dal codice: nessuna chiave o password nei file del repository.
3. Rotazione periodica: API key e credenziali devono avere piano di rinnovo.
4. Tracciabilita': ogni azione critica deve lasciare evidenza in log.
5. Verifica restore: un backup non testato equivale a un backup non affidabile.

## Classificazione Dati Sensibili

Sono considerati segreti:

- password account Google
- API key del middleware Apps Script
- token o cookie di sessione
- file di export DB locale non cifrati
- eventuali identificativi personali non pseudonimizzati

## Regole Per API Key

1. Conservare API key solo in storage sicuro (non in repo, non in chat, non in screenshot).
2. Usare chiavi diverse tra `STAGING` e `PROD`.
3. Nominare chiavi con convenzione: `MEDITRACE_<ENV>_API_KEY_V<NUM>`.
4. Rotazione minima ogni 90 giorni o immediata in caso di sospetto leak.
5. Revoca immediata della chiave precedente dopo validazione nuova chiave.
6. Registrare in `AuditLogCentrale` gli eventi di rotazione/revoca.

## Regole Per Credenziali Utente

1. Password uniche, lunghe e generate da password manager.
2. 2FA obbligatoria sugli account Google usati per MediTrace.
3. Vietato condividere password in testo chiaro su chat, email o documenti.
4. In caso di condivisione accidentale: reset immediato password + revoca sessioni attive.
5. Accesso ai workbook solo a utenti autorizzati e nominativi.

## Regole Repository E Sviluppo

1. Vietato committare segreti in qualsiasi file.
2. Mantenere `.gitignore` aggiornato per file locali sensibili.
3. Prima di push rilevanti, eseguire controllo manuale su eventuali stringhe sensibili.
4. Non includere credenziali in issue, PR, commit message o screenshot.

## Gestione Segreti Nell'App Android

1. Non hardcodare API key nel codice sorgente.
2. Usare configurazioni per ambiente (`staging` / `prod`).
3. Offuscare il build release e minimizzare metadati sensibili nei log client.
4. Disabilitare log verbosi in produzione.

## Logging Sicurezza

Canali:

- `SyncLog`: eventi tecnici (auth fail, errori sync)
- `AuditLogCentrale`: eventi operativi e amministrativi

Eventi minimi da tracciare:

- auth fallita (`AUTH_FAIL`)
- rotazione/revoca API key
- modifica permessi workbook
- restore eseguito
- update applicativo con migrazione

Regola: i log non devono contenere password o chiavi complete.

## Backup E Restore Sicuro

### Backup

1. Backup cloud periodico di workbook e Apps Script.
2. Eventuale backup locale DB solo in formato cifrato.
3. Frequenza minima consigliata:
   - backup incrementale giornaliero
   - backup completo settimanale

### Restore

1. Restore consentito solo a operatori autorizzati.
2. Verifica integrita' prima del ripristino operativo.
3. Test restore almeno una volta al mese in ambiente controllato.
4. Registrare ogni restore in `AuditLogCentrale` con esito.

## Access Control Workbook Google

1. Separare workbook `STAGING` e `PROD` con condivisioni distinte.
2. Proteggere range/sheet tecnici (`SyncLog`, `AuditLogCentrale`).
3. Abilitare modifica solo ai ruoli necessari.
4. Rimuovere accessi non piu' necessari entro 24h dalla dismissione.

## Incident Response (Playbook Minimo)

Quando si sospetta compromissione di segreti:

1. Contenimento immediato:
   - revocare API key sospetta
   - forzare reset password account coinvolti
   - invalidare sessioni attive
2. Eradicazione:
   - identificare origine leak
   - eliminare segreti esposti da file/chat
3. Ripristino:
   - emettere nuove chiavi
   - verificare servizi e sync
4. Post-mortem:
   - registrare incidente in `AuditLogCentrale`
   - aggiornare questa policy e checklist operativa

## Checklist Operativa Rapida

- [ ] 2FA attiva su tutti gli account Google di progetto
- [ ] API key separate per `STAGING` e `PROD`
- [ ] Rotazione API key pianificata
- [ ] Condivisioni workbook verificate
- [ ] Backup automatico attivo
- [ ] Test restore mensile eseguito
- [ ] Nessun segreto presente nel repository

## Riferimenti Correlati

- `docs/google-apps-script-api.md`
- `docs/alert-rules-turni.md`
- `docs/checklist-esecutiva.md`
