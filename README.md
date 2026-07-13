# MediTrace

Gestione terapie farmacologiche — offline-first PWA per strutture di assistenza.

**Live**: [vgrazian.github.io/MediTrace](https://vgrazian.github.io/MediTrace/)

## Caratteristiche

- 📱 **PWA offline-first** — funziona senza connessione, si installa su Android/iOS
- 🔄 **Sync multi-dispositivo** — Supabase Realtime + Direct API
- 💊 **Gestione farmaci** — catalogo principi attivi, confezioni, scorte, scadenze
- 👤 **Anagrafica ospiti** — registro, assegnazione residenza, terapie attive
- ⏰ **Promemoria somministrazioni** — piano terapeutico, 6 fasce orarie configurabili per residenza
- 📊 **Dashboard KPI** — riepilogo turno, alert scorte critiche, stato sincronizzazione
- 📋 **Audit trail** — registro operazioni con filtri, export JSON/PDF
- 🗂️ **Import CSV** — importazione guidata da fogli Google Sheets
- 🔑 **Password reset via email** — Supabase Edge Function + Resend API
- 🏢 **Multi-residenza** — switch residenza, fasce orarie per sede, ruoli admin/operatore

## Stack

| Tecnologia | Dettaglio |
|---|---|
| **Framework** | Vue 3 (Composition API) |
| **Build** | Vite 5 |
| **Stile** | CSS vanilla (NO Tailwind) |
| **Database locale** | Dexie.js (IndexedDB) |
| **Backend** | Supabase PostgreSQL + Edge Functions |
| **Auth** | Table-auth + RLS |
| **Sync** | Supabase Realtime + Direct API |
| **Email** | Resend API via Supabase Edge Function |
| **PWA** | vite-plugin-pwa (Workbox) |
| **Test** | Vitest (487 unit) + Playwright (146 E2E) |

## Sviluppo

```bash
cd pwa
npm install
npm run dev          # http://localhost:5173
npm run build        # build (include dati demo con VITE_SEED_DATA=1)
npm run test:unit    # 487 test
npm run test:e2e     # playwright (146 test, --workers=1 raccomandato)
```

## Deploy (GitHub Pages)

```bash
# Deploy automatico con cleanup
bash scripts/deploy.sh
```

## Demo credentials

| Ruolo | Utente | Password |
|---|---|---|
| Admin | `admin` | `A9m4K2qL!Xy` |
| Admin | `valerio` | `V@lerio123!` |
| Admin | `anna` | `Anna@456!Xy` |

Dati demo precaricati: 3 residenze, 10 ospiti, 10 farmaci, terapie attive, promemoria giornalieri.

**CDN cache**: GitHub Pages ha TTL 10 minuti. Dopo il push attendere prima di verificare.

## Credenziali demo

| Utente | Password |
|---|---|
| `admin` | Vedi `credentials.local.env` |
| `valerio` | Vedi `credentials.local.env` |

Dati demo caricabili da Impostazioni → "Genera dati demo".

## Palette

```css
--bg: #eaf2fc;
--panel: #f7fbff;
--ink: #1a2e4f;
--muted: #526989;
--line: #d6e0ec;
--brand-700: #223564;
--accent: #3d68c7;
```

## Licenza

Copyright © 2026. Uso interno — struttura di assistenza.
