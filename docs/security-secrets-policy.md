# Security Secrets Policy - MediTrace

## Obiettivo

Definire regole operative per gestire in modo sicuro:

- GitHub Personal Access Token (PAT) e credenziali operatore
- backup e restore
- dataset remoto e risposta a incidenti

Questa policy e' obbligatoria per tutti gli ambienti (`STAGING`, `PROD`).

## Principi Base

1. Minimo privilegio: ogni utente e servizio ha solo i permessi strettamente necessari.
2. Segreti fuori dal codice: nessuna chiave, token o password nei file del repository.
3. Rotazione periodica: credenziali operative e segreti tecnici devono avere piano di rinnovo.
4. Tracciabilita': ogni azione critica deve lasciare evidenza in log.
5. Verifica restore: un backup non testato equivale a un backup non affidabile.

## Classificazione Dati Sensibili

Sono considerati segreti:

- GitHub Personal Access Token (PAT)
- token o cookie di sessione
- file di export DB locale non cifrati
- eventuali identificativi personali non pseudonimizzati

## Regole Per GitHub PAT

1. Generare PAT con scope minimo: solo `gists` (Read and write).
2. Non riutilizzare lo stesso PAT per scopi diversi (es. non usare il PAT sync anche per automazioni CI).
3. Ruotare il PAT almeno ogni 90 giorni e immediatamente in caso di sospetta compromissione.
4. Revocare i token obsoleti da github.com/settings/tokens.
5. Registrare ogni rinnovo di PAT nelle evidenze operative di rilascio.

## Regole Per Credenziali Utente

1. Password uniche, lunghe e generate da password manager.
2. 2FA obbligatoria sull'account GitHub usato per MediTrace.
3. Vietato condividere password o PAT in testo chiaro su chat, email o documenti.
4. In caso di condivisione accidentale: revoca immediata del PAT + generazione nuovo token.
5. Accesso al Gist privato solo tramite l'account GitHub proprietario del token.

## Regole Repository E Sviluppo

1. Vietato committare segreti in qualsiasi file.
2. Mantenere `.gitignore` aggiornato per file locali sensibili.
3. Prima di push rilevanti, eseguire controllo manuale su eventuali stringhe sensibili.
4. Non includere credenziali in issue, PR, commit message o screenshot.

## Gestione Segreti Nell'Applicazione

1. Non hardcodare segreti, token persistenti o credenziali nel codice sorgente.
2. Usare configurazioni per ambiente (`staging` / `prod`) per segreti tecnici e parametri di deploy.
3. Non salvare refresh token o token di accesso in chiaro oltre la durata strettamente necessaria.
4. Minimizzare metadati sensibili nei log client e disabilitare log verbosi in produzione.
5. Proteggere export JSON locali con cifratura o con chiaro avviso operativo se il file non e' cifrato.

## Logging Sicurezza

Canali:

- log locale applicativo: eventi tecnici (auth fail, errori sync, restore, conflitti)
- evidenze di rilascio/deploy: cambi operativi e amministrativi

Eventi minimi da tracciare:

- auth fallita (`AUTH_FAIL`)
- rotazione o revoca GitHub PAT
- restore eseguito
- update applicativo con migrazione schema

Regola: i log non devono contenere password, token o dati personali completi.

## Monitoraggio Continuo Automatizzato

Controlli schedulati in repository:

1. Secret scan periodico con workflow `security-ops-monitoring.yml`.
2. Reminder mensile di rotazione credenziali tramite issue automatica.
3. Quality gate CI su `main` con test automatici obbligatori prima del merge.

Obiettivo: intercettare precocemente esposizioni di segreti e rendere tracciabile la rotazione operativa.

## Backup E Restore Sicuro

### Backup

1. Il Gist privato GitHub e' la copia cloud primaria condivisa tra dispositivi.
2. I backup manuali locali JSON devono essere cifrati oppure custoditi come dato sensibile.
3. Frequenza minima consigliata:
   - backup incrementale giornaliero
   - backup completo settimanale

### Restore

1. Restore consentito solo a operatori autorizzati.
2. Verifica integrita' prima del ripristino operativo.
3. Test restore almeno una volta al mese in ambiente controllato.
4. Registrare ogni restore nelle evidenze operative con esito.

## Access Control GitHub PAT E Dispositivi

1. Ogni ambiente (`STAGING`, `PROD`) usa un PAT distinto con scopo dichiarato.
2. Consentire uso solo a operatori autorizzati con account GitHub verificato con 2FA.
3. Mantenere inventario minimo dei dispositivi che hanno effettuato sync sul dataset.
4. Revocare il PAT entro 24h dalla dismissione di un dispositivo o operatore.

## Incident Response (Playbook Minimo)

Quando si sospetta compromissione di segreti o accesso improprio al dataset:

1. Contenimento immediato:
   - revocare immediatamente il GitHub PAT compromesso da github.com/settings/tokens
   - generare un nuovo PAT e aggiornarlo nell'app su tutti i dispositivi attivi
   - invalidare sessioni attive nell'app (logout + rimozione PAT da IndexedDB)
2. Eradicazione:
   - identificare origine leak
   - eliminare segreti esposti da file/chat
3. Ripristino:
   - verificare che il Gist non sia stato alterato (confrontare hash dataset)
   - rieseguire smoke sync con il nuovo PAT
4. Post-mortem:
   - registrare incidente nelle evidenze operative
   - aggiornare questa policy e checklist operativa

## Checklist Operativa Rapida

- [ ] 2FA attiva sull'account GitHub di progetto
- [ ] PAT separati per `STAGING` e `PROD` con scope `gists`
- [ ] PAT non scaduti e ruotati negli ultimi 90 giorni
- [ ] Nessun PAT o segreto presente nel repository
- [ ] Backup manuale JSON eseguito di recente
- [ ] Test restore mensile eseguito

## Riferimenti Correlati

- `docs/alert-rules-turni.md`
- `docs/checklist-esecutiva.md`
