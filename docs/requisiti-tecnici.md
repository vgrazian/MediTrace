# Requisiti Tecnici - MediTrace

Data: 2026-04-05

---

## 1. Requisiti Funzionali

### 1.1 Contesto operativo

L'app gestisce le terapie farmacologiche degli ospiti di due case alloggio, per un totale di 12 persone. Le terapie attive riguardano attualmente 7 ospiti.

### 1.1a Anagrafica ospiti

Ogni ospite deve avere i seguenti campi anagrafici:

- **Nome** e **Cognome** (obbligatori)
- **Luogo di nascita** (opzionale)
- **Data di nascita** (opzionale)
- **Sesso**: M / F / Altro (opzionale)
- **Codice fiscale** (opzionale, 16 caratteri)
- **Patologie**: campo testo libero per elenco patologie o note cliniche rilevanti

In tutti i pannelli e dropdown dove l'ospite è menzionato, il nome `Cognome Nome` deve essere visualizzato accanto all'ID (formato: `[ID] - Cognome Nome`).

La sezione Gestione ospiti deve offrire tre azioni:

1. **Crea** nuovo ospite
2. **Modifica** ospite esistente (pre-compilazione form con dati attuali)
3. **Elimina** ospite (soft-delete con dialog di conferma)

### 1.2 Catalogo farmaci e scorte

- Ogni farmaco ha: principio attivo, nome commerciale, dosaggio, data di scadenza.
- Uno stesso principio attivo può avere nomi commerciali e scadenze differenti (approvvigionamento da deposito interno).
- La colonna **consumo settimanale** viene sottratta dalla quantità totale di compresse.
- Quando il **residuo** è inferiore al consumo settimanale, la riga segnala visivamente l'esaurimento imminente (cambio colore o indicatore).
- Quando il residuo raggiunge zero, la riga viene rimossa manualmente dall'operatore.

### 1.3 Autenticazione

- Login applicativo tramite utenza + password.
- Gestione credenziali utente: creazione utenza, cambio password, revoca/disattivazione utenza.
- Ogni utente deve includere i campi anagrafici minimi: **nome**, **cognome**, **email** (obbligatori) e **telefono** (facoltativo).
- L'email deve essere validata sintatticamente e mantenuta univoca tra utenti attivi.
- La gestione autenticazione non deve richiedere inserimento manuale di GitHub PAT lato operatore.

### 1.3c Gestione profilo personale da Impostazioni

- Nel pannello **Impostazioni** l'utente autenticato deve poter aggiornare il proprio profilo senza intervento admin.
- Campi modificabili: **nome**, **cognome**, **telefono**, **email**.
- Vincoli:
  - nome/cognome obbligatori
  - telefono opzionale ma validato sintatticamente se compilato
  - email obbligatoria, validata sintatticamente e univoca
- Ogni aggiornamento profilo deve essere registrato nell'audit auth con evento dedicato.
- Il cambiamento password resta separato nel pannello sicurezza, con policy password invariata.

### 1.3a Reset password via email

- Deve essere disponibile un flusso **"Password dimenticata"** con invio email di reset.
- Il reset deve essere gestito da provider esterno (Supabase Auth free tier) con link one-time.
- L'app deve mostrare feedback esplicito di invio riuscito/errore.

### 1.3b Inviti utente via email

- Un utente admin deve poter inviare un **link di invito** a nuovo operatore tramite email.
- Il payload invito deve includere nome/cognome/email del destinatario.
- Il flusso invito deve appoggiarsi a Supabase Auth (magic link / OTP) senza esporre chiavi privilegiate lato client.
- In assenza configurazione Supabase, l'app deve mostrare un messaggio esplicito con variabili mancanti (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`).

### 1.3d Web Push API base

- Il pannello Impostazioni deve mostrare chiaramente stato Push API, presenza VAPID key e stato sottoscrizione.
- In assenza VAPID key, il messaggio deve indicare che manca `VITE_VAPID_PUBLIC_KEY` sia in `.env.local` sia nelle GitHub Variables di deploy.

### 1.4 Inizializzazione storage

- Al primo avvio l'app crea automaticamente un Gist privato GitHub che contiene `meditrace-manifest.json` e `meditrace-data.json`.

### 1.5 Gestione dati offline

- L'utente può inserire, visualizzare e modificare i dati anche senza connessione internet.
- I dati vengono persistiti localmente in IndexedDB.

### 1.6 Sincronizzazione bidirezionale

- **Upload:** i dati locali vengono caricati sul Gist privato al salvataggio o al ripristino della connessione.
- **Download:** all'apertura dell'app su un secondo dispositivo (es. da PC a smartphone), l'app verifica la presenza di una versione più recente sul Gist e la scarica.

### 1.7 Installazione su dispositivo

- L'app può essere aggiunta alla home dello smartphone o al desktop del PC come applicazione nativa tramite meccanismo PWA.

### 1.8 Esportazione manuale

- L'utente può scaricare i dati in formato JSON localmente come misura di backup aggiuntiva.

### 1.8a Restore manuale da file backup

- L'utente admin deve poter ripristinare un backup JSON da file locale.
- Il restore deve richiedere conferma esplicita, sovrascrivere il dataset locale e riaccodare i record alla sync queue.
- Il restore deve registrare evento audit dedicato (`backup_restored`).

### 1.8b CSV d'esempio per import guidato

- Il Manuale Utente deve rendere scaricabili CSV di esempio per tutte le sorgenti supportate (`01`, `02`, `03`, `04`, `05`, `09`).

### 1.9 Preparazione testo ordine farmaci (requisito pianificato)

- Deve essere presente un pulsante che prepari automaticamente un testo di ordine farmaci pronto da copiare/incollare in email o altri canali.
- Il testo deve includere almeno: farmaco, quantità da ordinare, priorità e note operative.
- Questo requisito è approvato ma **fuori dallo sviluppo corrente**: implementazione rimandata a una milestone successiva.

### 1.10 Pannello audit operativo (sola lettura)

- Deve essere disponibile in app un pannello dedicato al **registro operazioni** in modalita' **sola lettura** (nessuna modifica dei record audit).
- Ogni evento deve mostrare almeno: timestamp, operatore, azione, entita' e riferimento record.
- Il pannello deve includere filtri per:
  - **Operatore**
  - **Ospite**
  - **Farmaco**
  - **Terapia**
  - **Periodo** (data inizio/fine)
- L'elenco eventi deve essere visualizzato in una finestra **scrollabile** che si adatta a desktop/tablet/smartphone.
- Deve essere possibile esportare il log in JSON per uso amministrativo.

---

## 2. Requisiti Non Funzionali

### 2.1 Costo zero

- Tutti i servizi utilizzati devono essere gratuiti e non richiedere carta di credito.
- Servizi coinvolti: GitHub Pages (hosting), GitHub Gist API (sync), servizio autenticazione con utenza/password.

### 2.2 Privacy e sicurezza

- I dati risiedono esclusivamente sul dispositivo dell'utente o nel suo Gist privato GitHub.
- Nessun server intermedio ha accesso ai dati.
- Architettura compatibile con crittografia client-side (zero-knowledge opzionale).
- Le chiavi Supabase privilegiate (service role, DB password) non devono mai essere inserite nel frontend PWA.
- In frontend deve essere usata solo chiave publishable/anon.
- Le variabili build-time per Supabase e VAPID devono essere allineate tra `pwa/.env.local`, `pwa/.env.production.local` e GitHub Variables usate dal workflow deploy.

### 2.3 Disponibilità offline

- L'interfaccia viene caricata istantaneamente tramite Service Worker anche in assenza di rete.

### 2.4 Multi-piattaforma

- L'interfaccia è responsive e si adatta a schermi di PC, tablet e smartphone.

### 2.5 Prestazioni

- Caricamento iniziale della pagina su GitHub Pages inferiore a 2 secondi.

### 2.6 Limiti di quota API

- L'app gestisce con eleganza i limiti di quota delle GitHub REST API (5 000 req/ora per utente autenticato, ampiamente sufficiente per 1–2 utenti attivi).

### 2.7 Testabilita' automatica end-to-end

- Tutti i flussi critici devono essere testabili automaticamente senza passaggi manuali.
- La pipeline CI deve eseguire almeno: test unitari, test end-to-end browser e build produzione.
- Nessuna release su `main` e' considerata valida se i quality gate automatici falliscono.
- I test devono coprire almeno autenticazione, navigazione principale, impostazioni utente e import/export dati.
- I test devono coprire anche restore backup JSON e stato configurazione Push API/Supabase nel pannello Impostazioni.

---

## 3. Vincoli Tecnici

| Componente       | Scelta tecnologica                                                |
| ---------------- | ----------------------------------------------------------------- |
| Hosting          | GitHub Pages (HTTPS obbligatorio)                                 |
| Database locale  | IndexedDB — libreria Dexie.js                                     |
| Sincronizzazione | GitHub Gist API v3 via JavaScript                                 |
| Autenticazione   | Utenza + password locale + Supabase Auth per email reset/inviti   |
| UI Framework     | Vue.js 3 + Vite                                                   |
| PWA              | Vite PWA Plugin (manifest, service worker, icone)                 |
| Deploy CI/CD     | GitHub Actions (push → build → deploy su Pages)                   |
