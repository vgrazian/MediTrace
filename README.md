# MediTrace

MediTrace è un'applicazione **offline-first** per la gestione farmacologica in contesto socio-sanitario. Permette la tracciatura di ospiti, farmaci, terapie, scorte, movimenti di magazzino, promemoria di somministrazione e residenze operative, con sincronizzazione cloud bidirezionale su Supabase, supporto multi-dispositivo e piena operatività anche in assenza di connessione.

## Cosa fa l'applicazione

| Area | Funzionalità |
| --- | --- |
| **Ospiti** | Anagrafica (nome, cognome, dati anagrafici, patologie), codice interno, assegnazione residenza |
| **Farmaci** | Catalogo farmaci con principio attivo, classe terapeutica, scorta minima |
| **Scorte** | Confezioni di magazzino per farmaco: quantità, soglia riordino, scadenza; riepilogo segnalazioni |
| **Terapie** | Assegnazione farmaci agli ospiti con posologia, frequenza e date inizio/fine |
| **Movimenti** | Registrazione carico/scarico magazzino con tracciabilità ospite e terapia |
| **Promemoria** | Agenda somministrazioni con esito (eseguito/saltato), filtri per data, stato e residenza operativa |
| **Residenze** | Gestione sedi operative, capienza e posti disponibili |
| **Sync** | Caricamento e scaricamento dati da Supabase Postgres |
| **Audit Log** | Registro operazioni in sola lettura con filtri per operatore, ospite, farmaco, terapia e periodo |
| **Impostazioni account** | Aggiornamento profilo personale (nome, cognome, telefono, email) e cambio password |
| **Import CSV** | Bulk import da file CSV strutturati secondo i template inclusi |
| **Home / KPI** | Cruscotto scorte critiche, terapie attive, promemoria in scadenza |

## Architettura

```text
Dispositivo A                     Supabase (Auth + Postgres)
┌────────────────────────┐         ┌──────────────────────────┐
│  Vue 3 PWA             │ ──────► │  auth.users              │
│  ┌──────────────────┐  │         │  public.profiles         │
│  │ Views (Vue SFC)  │  │ ◄────── │  public.sync_files       │
│  └────────┬─────────┘  │         └──────────────────────────┘
│           │ Dexie.js   │
│  ┌────────▼─────────┐  │
│  │   IndexedDB      │  │
│  │ (fonte primaria) │  │
│  └──────────────────┘  │
└────────────────────────┘
```

### Stack tecnico

| Componente | Implementazione |
| --- | --- |
| **Frontend** | Vue.js 3 + Vite 5 (PWA, installabile) |
| **Storage locale** | IndexedDB via Dexie.js 3.2.7 |
| **Autenticazione** | Supabase Auth + cache offline locale |
| **Sync cloud** | Supabase Postgres (`sync_files`) |
| **Hosting** | GitHub Pages + Service Worker (offline cache) |
| **Test** | Vitest 3 (unit + coverage v8) + Playwright (E2E, Chromium + WebKit + Android phone emulation smoke) |
| **Build** | Vite 5 — ~70 kb gzip |

### Object store IndexedDB

`settings` · `rooms` · `beds` · `hosts` · `drugs` · `stockBatches` · `therapies` · `movements` · `reminders` · `syncQueue` · `syncState` · `activityLog`

### Struttura repository

```text
docs/                            Documentazione tecnica e decisioni
  archive/                       Checklist PR completate e documenti storici archiviati
  architecture.md                Architettura e scelte tecnologiche
  domain-model.md                Modello dati ed entità
  requisiti-tecnici.md           Specifiche funzionali e non-funzionali
  roadmap.md                     Evolutive pianificate
  security-secrets-policy.md     Policy credenziali e token
  release-rollback-runbook.md    Procedure deploy/rollback GitHub Pages
  ui-color-policy.md             Palette colori e linee guida UI
  schema-json-mapping-v1.md      Mappatura CSV ↔ JSON
pwa/
  src/
    services/
      auth.js                    Utenti, credenziali, sessioni, audit
      ids.js                     Generazione ID entità (prefixed UUID)
      sync.js                    Sync bidirezionale backend condiviso
      supabaseSync.js            Backend sync Supabase
      syncBackend.js             Selettore backend sync
      farmaci.js                 CRUD farmaci e confezioni
      ospiti.js                  CRUD ospiti con audit trail
      stanze.js                  CRUD stanze e letti
      residenze.js               CRUD residenze operative
      terapie.js                 CRUD terapie attive
      movimenti.js               CRUD movimenti magazzino
      promemoria.js              Scheduling promemoria
      notifications.js           Web Push API
      csvImport.js               Parsing e bulk import CSV
      homeDashboard.js           KPI cruscotto home
      reporting.js               Scorte e aderenza terapie
      seedData.js                Dati demo + fixture E2E
    views/                       Componenti Vue per ogni sezione
    router/index.js              Vue Router v4 (hash history)
    db/index.js                  Schema Dexie e object stores
    App.vue                      Shell autenticazione + navigazione
  tests/
    unit/                        Test Vitest con mock IndexedDB
    e2e/                         Test Playwright (chromium + webkit)
  public/                        manifest.json, icone PWA, branding
  playwright.config.js
  vite.config.js
  vitest.config.js
templates/csv-import/            Template CSV per import iniziale
```

## Avvio rapido

### Prerequisiti

- Node.js ≥ 18
- Un progetto Supabase con URL e chiave publishable/anon

### Sviluppo

```bash
# Installare dipendenze
npm --prefix pwa install

# Avviare server locale con hot reload
npm --prefix pwa run dev
# → http://localhost:5173
```

Al primo avvio:

1. Configura `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`
2. Registrati con username, password, nome, cognome ed email
3. Accedi su altri dispositivi con le stesse credenziali: la sync condivisa Supabase mantiene il dataset allineato

Per abilitare auth condivisa, reset password e inviti email:

```bash
# Copia il file di esempio e imposta le chiavi Supabase
cp pwa/.env.example pwa/.env.local
# VITE_SUPABASE_URL=...
# VITE_SUPABASE_PUBLISHABLE_KEY=...
# VITE_SUPABASE_REDIRECT_TO=...
# VITE_VAPID_PUBLIC_KEY=...
```

### Test

```bash
# Unit test + coverage
npm --prefix pwa run test:unit

# E2E con Playwright (Chromium + WebKit + Android phone smoke)
npm --prefix pwa run test:e2e

# Scenario operativo giornaliero (E2E user journey)
npm --prefix pwa run -s test:e2e -- tests/e2e/daily-operations-scenario.spec.js

# Suite completa (unit + E2E + palette check + build pre-verify)
npm --prefix pwa run test
```

### Build e deploy

```bash
# Build produzione (Vite, tree-shaking, minify)
npm --prefix pwa run build
# Output: pwa/dist/ — deployato automaticamente su GitHub Pages via CI

# Preview del build
npm --prefix pwa run preview
```

### Setup deployment produzione (variabili ambiente)

Le variabili applicative usate dal build sono:

- `VITE_BASE_URL` (default `/MediTrace/`)
- `VITE_SUPABASE_URL` (obbligatoria per deployment condiviso)
- `VITE_SUPABASE_PUBLISHABLE_KEY` (obbligatoria per deployment condiviso)
- `VITE_SUPABASE_REDIRECT_TO` (opzionale; se assente viene derivata verso `#/auth/reset-password`)
- `VITE_VAPID_PUBLIC_KEY` (opzionale, richiesto per Web Push API)
- `VITE_EMERGENCY_ADMIN_ENABLED` (consigliato `0` in produzione)
- `VITE_EMERGENCY_ADMIN_USERNAME` (opzionale)
- `VITE_EMERGENCY_ADMIN_PASSWORD` (opzionale)
- `VITE_EMERGENCY_ADMIN_EMAIL` (opzionale)
- `VITE_EMERGENCY_ADMIN_FIRST_NAME` (opzionale)
- `VITE_EMERGENCY_ADMIN_LAST_NAME` (opzionale)
- `VITE_EMERGENCY_ADMIN_GITHUB_TOKEN` (opzionale)

Script automatico (interattivo):

```bash
# Dalla root del repository
bash pwa/scripts/setup-production-deploy.sh
```

Lo script:

1. legge i valori da `credentials.local.env` (o da file passato con `--env-file`)
2. genera `pwa/.env.production.local` (non tracciato da git)
3. sincronizza automaticamente anche `pwa/.env.local` (usa `--no-sync-local-env` per disattivare)
4. opzionalmente aggiorna GitHub Variables/Secrets (`--set-gh`)
5. opzionalmente esegue build (`--build`)
6. opzionalmente avvia il workflow deploy (`--trigger-deploy`)

Esempi:

```bash
# solo setup env locale
bash pwa/scripts/setup-production-deploy.sh

# setup + build produzione
bash pwa/scripts/setup-production-deploy.sh --build

# setup + sync variabili repository + build
bash pwa/scripts/setup-production-deploy.sh --set-gh --build

# setup + build + trigger deploy GitHub Pages
bash pwa/scripts/setup-production-deploy.sh --build --trigger-deploy

# smoke online sul sito già deployato
SITE_URL="https://vgrazian.github.io/MediTrace/" npm --prefix pwa run test:online-smoke

# chaos test online non distruttivo
SITE_URL="https://vgrazian.github.io/MediTrace/" npm --prefix pwa run test:online-chaos

# performance budget sul deployment live
SITE_URL="https://vgrazian.github.io/MediTrace/" npm --prefix pwa run test:online-performance

# validazione live a 2 utenti concorrenti
SITE_URL="https://vgrazian.github.io/MediTrace/" \
SUPABASE_URL="$VITE_SUPABASE_URL" \
SUPABASE_PUBLISHABLE_KEY="$VITE_SUPABASE_PUBLISHABLE_KEY" \
npm --prefix pwa run test:online-main
```

Le verifiche online usano dati sintetici e tracciabili: namespace per esecuzione, nomi deterministici quando viene passato un seed, nessun dato reale o derivato dalla produzione. Se sono disponibili credenziali dedicate (`ONLINE_USER_A_*`, `ONLINE_USER_B_*`), lo script le usa; in alternativa prova a creare utenti operatore temporanei via Supabase con la chiave publishable. Le credenziali dedicate devono rispettare la policy password applicativa (minimo 10 caratteri con maiuscola, minuscola, numero e simbolo).

### Backup/Restore locale e CSV d'esempio

- In `Impostazioni > Backup locale` sono disponibili:
  - download backup JSON completo
  - restore da file JSON con conferma e ri-coda sync
- Nel `Manuale Utente` (sezione Impostazioni) sono disponibili file CSV di esempio scaricabili per `Import CSV guidato`.

Deploy operativo:

1. Esegui lo script di setup
2. Push su `main` (oppure avvia manualmente workflow `Deploy PWA su GitHub Pages`)
3. Verifica URL pubblicato dal job `Deploy to GitHub Pages`
4. Verifica smoke check (`Smoke test deployed Pages`)
5. Opzionale: avvia workflow `Online Chaos Test` oppure `npm --prefix pwa run test:online-chaos`
6. Opzionale consigliato: avvia workflow `Online Main Validation` per controllo live multi-utente + performance budget

## Qualità e copertura

| Metrica | Valore |
| --- | --- |
| Unit test | **303 / 303** ✅ (22 file, Vitest) |
| E2E test | **55 / 55** ✅ (Playwright, Chromium + WebKit + Android phone emulation smoke) |
| Statements | 56.73 % |
| Branches | 46.98 % |
| Functions | 62.33 % |
| Lines | 60.19 % |

CI/CD: GitHub Actions esegue `test` (unit + E2E) su ogni PR; il pass è requisito obbligatorio per il merge su `main`.

## Workflow sviluppatore

1. `git checkout -b feat/nome-feature`
2. Sviluppa in locale con `npm --prefix pwa run dev`
3. Verifica unit test: `npm --prefix pwa run test:unit`
4. Verifica E2E: `npm --prefix pwa run test:e2e`
5. `git add . && git commit -m "type(scope): messaggio"`
6. Apri PR su GitHub — la quality gate parte automaticamente
7. Dopo il pass del check `test`, effettua merge su `main`
8. GitHub Pages si aggiorna automaticamente dopo il merge

## Sicurezza e privacy

- **Dati**: risiedono esclusivamente sul dispositivo (IndexedDB) o nel Gist privato GitHub dell'utente
- **Credenziali**: password con salt + hash SHA-256 locale; il GitHub PAT è usato solo per le chiamate Gist API
- **Sessioni**: TTL configurabile (default 8 ore), scadenza automatica, invalidazione su cambio credenziali
- **ID entità**: generati automaticamente con `crypto.randomUUID()` prefisso-tipato (es. `host_<uuid>`)
- **Audit**: ogni operazione rilevante è registrata in `activityLog` con timestamp e operatore
- **Policy completa**: `docs/security-secrets-policy.md`

## Roadmap

Vedi `docs/roadmap.md` per il dettaglio completo. Evolutive prioritarie:

- Pannello amministratore (gestione utenti, ruoli, RBAC esteso)
- Crittografia end-to-end opzionale per il dataset Gist
- Reportistica avanzata ed export PDF/Excel
- Multi-organizzazione e gestione strutture multiple

## Supporto

- Documentazione tecnica: [`docs/`](./docs)
- Bug e feature request: aprire issue su GitHub
- Emergenze deploy: `docs/release-rollback-runbook.md`
