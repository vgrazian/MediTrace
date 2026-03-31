# Requisiti Tecnici - MediTrace

Data: 2026-03-31

---

## 1. Requisiti Funzionali

### 1.1 Contesto operativo

L'app gestisce le terapie farmacologiche degli ospiti di due case alloggio, per un totale di 12 persone. Le terapie attive riguardano attualmente 7 ospiti. I nomi degli ospiti vengono registrati come iniziali per tutelare la privacy.

### 1.2 Catalogo farmaci e scorte

- Ogni farmaco ha: principio attivo, nome commerciale, dosaggio, data di scadenza.
- Uno stesso principio attivo può avere nomi commerciali e scadenze differenti (approvvigionamento da deposito interno).
- La colonna **consumo settimanale** viene sottratta dalla quantità totale di compresse.
- Quando il **residuo** è inferiore al consumo settimanale, la riga segnala visivamente l'esaurimento imminente (cambio colore o indicatore).
- Quando il residuo raggiunge zero, la riga viene rimossa manualmente dall'operatore.

### 1.3 Autenticazione

- Login tramite account Google dell'utente (OAuth 2.0).
- Nessuna gestione di password proprietarie.

### 1.4 Inizializzazione storage

- Al primo avvio l'app crea automaticamente un file `data.json` nella cartella nascosta `appDataFolder` del Google Drive dell'utente autenticato.

### 1.5 Gestione dati offline

- L'utente può inserire, visualizzare e modificare i dati anche senza connessione internet.
- I dati vengono persistiti localmente in IndexedDB.

### 1.6 Sincronizzazione bidirezionale

- **Upload:** i dati locali vengono caricati su Drive al salvataggio o al ripristino della connessione.
- **Download:** all'apertura dell'app su un secondo dispositivo (es. da PC a smartphone), l'app verifica la presenza di una versione più recente su Drive e la scarica.

### 1.7 Installazione su dispositivo

- L'app può essere aggiunta alla home dello smartphone o al desktop del PC come applicazione nativa tramite meccanismo PWA.

### 1.8 Esportazione manuale

- L'utente può scaricare i dati in formato JSON localmente come misura di backup aggiuntiva.

---

## 2. Requisiti Non Funzionali

### 2.1 Costo zero

- Tutti i servizi utilizzati devono essere gratuiti e non richiedere carta di credito.
- Servizi coinvolti: GitHub Pages (hosting), Google Drive API (sync), Google OAuth (autenticazione).

### 2.2 Privacy e sicurezza

- I dati risiedono esclusivamente sul dispositivo dell'utente o nel suo spazio Google Drive personale.
- Nessun server intermedio ha accesso ai dati.
- Architettura compatibile con crittografia client-side (zero-knowledge opzionale).

### 2.3 Disponibilità offline

- L'interfaccia viene caricata istantaneamente tramite Service Worker anche in assenza di rete.

### 2.4 Multi-piattaforma

- L'interfaccia è responsive e si adatta a schermi di PC, tablet e smartphone.

### 2.5 Prestazioni

- Caricamento iniziale della pagina su GitHub Pages inferiore a 2 secondi.

### 2.6 Limiti di quota API

- L'app gestisce con eleganza i limiti di quota delle Google API (generosi per 1–2 utenti attivi).

---

## 3. Vincoli Tecnici

| Componente      | Scelta tecnologica                                  |
|-----------------|-----------------------------------------------------|
| Hosting         | GitHub Pages (HTTPS obbligatorio)                   |
| Database locale | IndexedDB — libreria Dexie.js                       |
| Sincronizzazione| Google Drive REST API v3 via JavaScript             |
| Autenticazione  | Google OAuth 2.0 (browser flow)                     |
| UI Framework    | Vue.js 3 + Vite                                     |
| PWA             | Vite PWA Plugin (manifest, service worker, icone)   |
| Deploy CI/CD    | GitHub Actions (push → build → deploy su Pages)     |
