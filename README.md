# MediTrace

Gestione terapie farmacologiche — offline-first PWA per strutture di assistenza.

**Live**: [vgrazian.github.io/MediTrace](https://vgrazian.github.io/MediTrace/)

## Caratteristiche

- 📱 **PWA offline-first** — funziona senza connessione, si installa su Android/iOS
- 🔄 **Sync multi-dispositivo** — Supabase Realtime + Direct API
- 💊 **Gestione farmaci** — catalogo principi attivi, confezioni, scorte, scadenze
- 👤 **Anagrafica ospiti** — registro, assegnazione residenza, terapie attive
- ⏰ **Promemoria somministrazioni** — piano terapeutico con orari, esiti, batch picker
- 📊 **Dashboard KPI** — riepilogo turno, scorte critiche, sincronizzazione
- 📋 **Audit trail** — registro operazioni con statistiche Supabase in tempo reale
- 🗂️ **Import CSV** — importazione guidata da fogli Google Sheets

## Stack

| Tecnologia | Dettaglio |
|---|---|
| **Framework** | Vue 3 (Composition API) |
| **Build** | Vite 5 |
| **Stile** | CSS vanilla (NO Tailwind) |
| **Database locale** | Dexie.js (IndexedDB) |
| **Auth** | Supabase + fallback locale |
| **Sync** | Supabase Realtime + Direct API |
| **PWA** | vite-plugin-pwa (Workbox) |
| **Test** | Vitest (487 test) + Playwright (146 e2e) |

## Sviluppo

```bash
cd pwa
npm install
npm run dev          # http://localhost:5173
npm run build        # build
npm run test:unit    # 487 test
npm run test:e2e     # playwright (146 test, --workers=1 raccomandato)
```

## Deploy (GitHub Pages)

```bash
# Build con base path corretto
cd pwa && VITE_BASE_URL=/MediTrace/ npx vite build

# Sync dist → root
cd .. && cp pwa/dist/index.html index.html
cp pwa/dist/manifest.webmanifest manifest.webmanifest
cp pwa/dist/sw.js sw.js
cp pwa/dist/favicon.svg favicon.svg
cp -r pwa/dist/assets/* assets/
cp -r pwa/dist/icons/* icons/

# Oppure:
bash scripts/deploy-gh-pages.sh

git add -A && git commit -m "deploy: ..." && git push origin gh-pages
```

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
