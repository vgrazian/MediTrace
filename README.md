# MediTrace

MediTrace è un'applicazione offline-first per la gestione farmacologica integrata in contesto socio-sanitario. Consente la tracciatura di ospiti, farmaci, scorte, terapie e promemoria con sincronizzazione cloud bidirezionale, supporto multi-dispositivo e affidabilità anche in assenza di connessione.

## Architettura attuale (v0.20.5)

| Componente | Implementazione |
| --- | --- |
| **Frontend** | PWA Vue.js 3 + Vite 5 |
| **Storage locale** | IndexedDB (Dexie.js 3.2.7) |
| **Autenticazione** | Utenza + password locale + profilo utente (nome/cognome/email) + Supabase Auth per reset/inviti email |
| **Sync cloud** | GitHub Gist privato (manifest + snapshot dati) |
| **Hosting** | GitHub Pages + PWA Service Worker |
| **Test** | Vitest (unit + coverage v8) + Playwright (E2E) |
| **Build** | Vite 5.4.21 (56 moduli → 70kb gzip) |

## Funzionalità MVP attive

✅ **Ospiti**: crud con anagrafica base (nome, cognome, DOB, patologie)  
✅ **Farmaci**: catalogo con dosaggio, scadenza, quantità; scorte settimanali  
✅ **Terapie**: assegnazione agli ospiti con posologia e frequency  
✅ **Promemoria**: notifiche di somministrazione con mark eseguito/saltato  
✅ **Sync bidirezionale**: upload locale → Gist, download Gist → locale  
✅ **Offline-first**: UI completa usabile senza connessione  
✅ **Multi-dispositivo**: responsive (telefono, tablet, desktop)  
✅ **Backup**: esportazione manuale JSON + ripristino automatico  
✅ **Audit log**: cronologia operazioni con timestamp e operatore  
✅ **Test data**: 30 ospiti realistici + 70+ terapie generabili via UI (fixture system)

## Quality & Coverage

**Test Automation**:

- 72/72 unit tests ✅ (auth, seed, promemoria, CSV import)
- 29/29 E2E tests ✅ (UI flows, sync, offline, conflict resolution)
- CI/CD: GitHub Actions quality gate (test status check required for merge)

**Code Coverage** (v8 instrumentation):

- Statements: 63.79% | Branches: 50.22% | Funcs: 66.66% | Lines: 67.85%
- Best: promemoria.js (100% lines), reporting.js (97% lines), homeDashboard.js (100% functions)
- To improve: notifications.js (45% statements), seedDataRealistic.js (3% lines — E2E-only, browser-generated)

**Performance**:

- Initial load: <2s (GitHub Pages CDN)
- E2E test suite: ~11s (29 tests × 4 workers)
- Production build: 191kb raw → 70kb gzip

## Struttura repository

```text
docs/
  ├── architecture.md              (scelte tecniche, Option A approvata)
  ├── requisiti-tecnici.md         (spec funzionali + non-funzionali)
  ├── domain-model.md              (modello dati: ospiti, farmaci, terapie)
  ├── schema-json-mapping-v1.md    (CSV ↔ JSON)
  ├── roadmap.md                   (priorità evolutive)
  ├── ui-color-policy.md           (palette + anti-regressione)
  ├── security-secrets-policy.md   (credenziali, token management)
  └── release-rollback-runbook.md  (deploy/rollback GH Pages)

pwa/
  ├── src/
  │   ├── services/
  │   │   ├── auth.js              (utenti, credenziali, sessioni, audit)
  │   │   ├── sync.js              (GitHub Gist bidirezionale)
  │   │   ├── csvImport.js         (parsing CSV, bulk import)
  │   │   ├── seedData.js          (demo data + fixture loading)
  │   │   ├── seedDataRealistic.js (30 ospiti, 9 stanze, 70+ terapie)
  │   │   ├── promemoria.js        (reminder scheduling + notifications)
  │   │   ├── notifications.js     (Web Push API)
  │   │   └── [altri servizi]
  │   ├── views/                   (Vue components: Ospiti, Farmaci, Terapie, Stanze, etc.)
  │   ├── router/                  (Vue Router v4)
  │   ├── db/                      (Dexie schema, object stores)
  │   └── App.vue
  ├── tests/
  │   ├── unit/                    (Vitest mocks)
  │   ├── e2e/                     (Playwright browser automation)
  │   └── fixtures/                (CSV test data + testDataLoader)
  ├── public/                      (manifest.json, icons, branding)
  └── package.json

templates/csv-import/             (CSV templates per data import)
prototype/                        (legacy prototipo)
```

## Avvio rapido

### Sviluppo

```bash
# Installare dipendenze
npm --prefix pwa install

# Avviare server locale (hot reload)
npm --prefix pwa run dev
# → http://localhost:5173

# Al primo avvio:
# 1. Registrati con username/password e GitHub PAT
# 2. L'app crea automaticamente Gist privato per il sync
# 3. Accedi su altri dispositivi con stesse credenziali

# Per abilitare reset password/inviti email (Supabase)
# Copiare pwa/.env.example in pwa/.env.local e impostare:
# - VITE_SUPABASE_URL
# - VITE_SUPABASE_PUBLISHABLE_KEY
# - VITE_SUPABASE_REDIRECT_TO
```

### Test

```bash
# Unit tests + coverage report
npm --prefix pwa run test:unit

# E2E tests (Playwright, browser real)
npm --prefix pwa run test:e2e

# Tutti i test + palette check + build pre-verify
npm --prefix pwa run test
```

### Produzione

```bash
# Build ottimizzato (Vite, tree-shaking, minify)
npm --prefix pwa run build

# Output: pwa/dist/ → deploy su GitHub Pages via Actions

# Preview build
npm --prefix pwa run preview
```

## Workflow tipico developer

1. **Feature branch**: `git checkout -b feat/feature-name`
2. **Develop + test locally**: `npm --prefix pwa run dev` + `npm --prefix pwa run test:unit`
3. **E2E validation**: `npm --prefix pwa run test:e2e` (full PWA integration)
4. **Commit**: `git add . && git commit -m "type(scope): message"`
5. **Push + PR**: GitHub Actions quality gate runs automatically
6. **Status check**: test workflow must PASS (unit + E2E + coverage)
7. **Merge**: fast-forward su main, auto-deploy su GitHub Pages

## Security & Privacy

- **Dati**: Esclusivamente sul dispositivo (IndexedDB) o Gist privato GitHub (con crittografia utente via GitHub OAuth)
- **Credenziali**: Password con salt/hash SHA256 locale; GitHub PAT solo per sync Gist
- **Audit**: Cronologia operazioni salvata e sincronizzabile
- **Policy**: Vedi `docs/security-secrets-policy.md`

## Roadmap

**Phase 2 (in progress)**:

- [x] Gestione utenti estesa: nome, cognome, email (avvio implementazione)
- [x] Password reset via email (Supabase, avvio implementazione)
- [x] Invito utenti via link email (Supabase OTP, avvio implementazione)
- [ ] Management panel per admin

**Phase 3 (pianificato)**:

- [ ] Crittografia end-to-end opzionale su Gist
- [ ] Multi-organizzazione (team, facility)
- [ ] Reporting avanzato + export PDF/Excel
- [ ] Mobile app nativa (React Native / Flutter)

## Supporto & Issues

- Consultare [docs/](./docs) per dettagli tecnici
- Aprire issue su GitHub per bug/feature requests
- Vedi `docs/release-rollback-runbook.md` per procedure di emergenza
