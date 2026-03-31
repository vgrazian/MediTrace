# Security Secrets Policy - MediTrace

## Obiettivo

Definire regole operative per gestire in modo sicuro:

- credenziali OAuth e account Google
- backup e restore
- dataset remoto e risposta a incidenti

Questa policy e' obbligatoria per tutti gli ambienti (`STAGING`, `PROD`).

## Principi Base

1. Minimo privilegio: ogni utente e servizio ha solo i permessi strettamente necessari.
2. Segreti fuori dal codice: nessuna chiave, token o password nei file del repository.
3. Rotazione periodica: credenziali e configurazioni OAuth devono avere piano di rinnovo.
4. Tracciabilita': ogni azione critica deve lasciare evidenza in log.
5. Verifica restore: un backup non testato equivale a un backup non affidabile.

## Classificazione Dati Sensibili

Sono considerati segreti:

- password account Google
- client secret OAuth se usato lato configurazione build/deploy
- token o cookie di sessione
- file di export DB locale non cifrati
- eventuali identificativi personali non pseudonimizzati

## Regole Per OAuth E Google Cloud

1. Conservare eventuali client secret solo in storage sicuro e solo se realmente necessari per tooling lato deploy.
2. Preferire configurazioni browser che non richiedano segreti distribuiti ai client.
3. Usare progetti Google Cloud separati tra `STAGING` e `PROD`.
4. Limitare scope ai minimi necessari, in particolare accesso a `appDataFolder` invece che a tutto Drive.
5. Revisionare almeno ogni 90 giorni schermata consenso, redirect URI e utenti autorizzati.
6. Registrare cambi rilevanti di configurazione OAuth nelle evidenze operative di rilascio.

## Regole Per Credenziali Utente

1. Password uniche, lunghe e generate da password manager.
2. 2FA obbligatoria sugli account Google usati per MediTrace.
3. Vietato condividere password in testo chiaro su chat, email o documenti.
4. In caso di condivisione accidentale: reset immediato password + revoca sessioni attive.
5. Accesso al dataset Drive solo agli account Google nominativamente autorizzati.

## Regole Repository E Sviluppo

1. Vietato committare segreti in qualsiasi file.
2. Mantenere `.gitignore` aggiornato per file locali sensibili.
3. Prima di push rilevanti, eseguire controllo manuale su eventuali stringhe sensibili.
4. Non includere credenziali in issue, PR, commit message o screenshot.

## Gestione Segreti Nell'Applicazione

1. Non hardcodare segreti, token persistenti o credenziali nel codice sorgente.
2. Usare configurazioni per ambiente (`staging` / `prod`) per endpoint OAuth e parametri di deploy.
3. Non salvare refresh token o token di accesso in chiaro oltre la durata strettamente necessaria.
4. Minimizzare metadati sensibili nei log client e disabilitare log verbosi in produzione.
5. Proteggere export JSON locali con cifratura o con chiaro avviso operativo se il file non e' cifrato.

## Logging Sicurezza

Canali:

- log locale applicativo: eventi tecnici (auth fail, errori sync, restore, conflitti)
- evidenze di rilascio/deploy: cambi operativi e amministrativi

Eventi minimi da tracciare:

- auth fallita (`AUTH_FAIL`)
- cambio configurazione OAuth
- modifica permessi account Google / Drive
- restore eseguito
- update applicativo con migrazione schema

Regola: i log non devono contenere password, token o dati personali completi.

## Backup E Restore Sicuro

### Backup

1. Il file remoto in `appDataFolder` e' la copia cloud primaria condivisa tra dispositivi.
2. I backup manuali locali JSON devono essere cifrati oppure custoditi come dato sensibile.
3. Frequenza minima consigliata:
   - backup incrementale giornaliero
   - backup completo settimanale

### Restore

1. Restore consentito solo a operatori autorizzati.
2. Verifica integrita' prima del ripristino operativo.
3. Test restore almeno una volta al mese in ambiente controllato.
4. Registrare ogni restore nelle evidenze operative con esito.

## Access Control Google Drive E Dispositivi

1. Separare configurazioni `STAGING` e `PROD` con client OAuth distinti quando possibile.
2. Consentire uso solo ad account Google autorizzati e verificati con 2FA.
3. Mantenere inventario minimo dei dispositivi che hanno effettuato sync sul dataset.
4. Rimuovere accessi non piu' necessari entro 24h dalla dismissione.

## Incident Response (Playbook Minimo)

Quando si sospetta compromissione di segreti o accesso improprio al dataset:

1. Contenimento immediato:
   - revocare sessioni e accessi Google sospetti
   - forzare reset password account coinvolti
   - invalidare sessioni attive
2. Eradicazione:
   - identificare origine leak
   - eliminare segreti esposti da file/chat
3. Ripristino:
   - riallineare configurazioni OAuth
   - verificare servizi, sync e integrita' del dataset remoto
4. Post-mortem:
   - registrare incidente nelle evidenze operative
   - aggiornare questa policy e checklist operativa

## Checklist Operativa Rapida

- [ ] 2FA attiva su tutti gli account Google di progetto
- [ ] Configurazioni OAuth separate per `STAGING` e `PROD`
- [ ] Redirect URI e scope verificati
- [ ] Accessi account Google verificati
- [ ] Backup automatico attivo
- [ ] Test restore mensile eseguito
- [ ] Nessun segreto presente nel repository

## Riferimenti Correlati

- `docs/alert-rules-turni.md`
- `docs/checklist-esecutiva.md`
