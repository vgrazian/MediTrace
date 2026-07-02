---
marp: true
theme: uncover
class:
  - lead
paginate: true
size: 16:9
footer: 'MediTrace — Gestione farmaci per RSA'
style: |
  @import url('https://fonts.googleapis.com/css2?family=Domine:wght@500;600;700&family=Roboto:wght@300;400;500;700&display=swap');

  :root {
    --ink: #1a2e4f;
    --muted: #526989;
    --line: #d6e0ec;
    --accent: #3d68c7;
    --bg: #f7fbff;
  }

  section {
    font-family: 'Roboto', 'Segoe UI', sans-serif;
    color: var(--ink);
    background: var(--bg);
    padding: 2rem 3rem;
  }

  section.lead {
    background: linear-gradient(160deg, #1a2e4f 0%, #2a3f73 60%, #1a2e4f 100%);
    color: #f5f9ff;
  }

  section.lead h1 {
    font-family: 'Domine', Georgia, serif;
    font-size: 2.8rem;
    font-weight: 700;
    letter-spacing: -0.02em;
    margin-bottom: .3rem;
  }

  section.lead h2 {
    font-family: 'Roboto', sans-serif;
    font-size: 1.3rem;
    font-weight: 300;
    color: #b8cef0;
    margin-top: 0;
  }

  section h1 {
    font-family: 'Domine', Georgia, serif;
    font-size: 2rem;
    color: var(--ink);
    margin-bottom: .8rem;
    border-bottom: 2px solid var(--line);
    padding-bottom: .4rem;
  }

  section h2 {
    font-family: 'Domine', Georgia, serif;
    font-size: 1.4rem;
    color: var(--ink);
    margin-top: 1.2rem;
    margin-bottom: .4rem;
  }

  section h3 {
    font-family: 'Roboto', sans-serif;
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--accent);
    margin-bottom: .3rem;
  }

  section p, section li {
    font-size: 1rem;
    line-height: 1.6;
    color: var(--muted);
  }

  section strong {
    color: var(--ink);
  }

  section ul, section ol {
    padding-left: 1.5rem;
  }

  section li {
    margin-bottom: .35rem;
  }

  section img {
    border-radius: 6px;
    border: 1px solid var(--line);
    max-width: 100%;
  }

  section table {
    width: 100%;
    border-collapse: collapse;
    font-size: .9rem;
    margin-top: .8rem;
  }

  section th {
    background: #edf3fb;
    color: var(--ink);
    font-weight: 600;
    padding: .45rem .6rem;
    border-bottom: 2px solid var(--line);
    text-align: left;
  }

  section td {
    padding: .4rem .6rem;
    border-bottom: 1px solid var(--line);
    color: var(--muted);
  }

  section code {
    background: #edf3fb;
    padding: .15rem .35rem;
    border-radius: 3px;
    font-size: .85rem;
    color: var(--accent);
  }

  section .muted {
    color: var(--muted);
    font-size: .85rem;
  }

  section .badge {
    display: inline-block;
    background: #edf3fb;
    color: var(--accent);
    font-size: .75rem;
    font-weight: 600;
    padding: .15rem .5rem;
    border-radius: 999px;
    letter-spacing: .03em;
    text-transform: uppercase;
  }

  section .badge-green {
    background: #edf3ec;
    color: #346538;
  }

  section .badge-amber {
    background: #fbf3db;
    color: #956400;
  }

  section .two-col {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem;
    margin-top: .8rem;
  }

  section .card {
    background: #fff;
    border: 1px solid var(--line);
    border-radius: 8px;
    padding: 1rem 1.2rem;
  }

  section .kpi-row {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
    margin-top: .8rem;
  }

  section .kpi {
    background: #fff;
    border: 1px solid var(--line);
    border-radius: 8px;
    padding: .7rem 1rem;
    text-align: center;
    flex: 1 1 120px;
  }

  section .kpi .kpi-num {
    font-family: 'Domine', serif;
    font-size: 1.8rem;
    font-weight: 700;
    color: var(--ink);
  }

  section .kpi .kpi-label {
    font-size: .75rem;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: .04em;
    margin-top: .15rem;
  }

  footer {
    font-size: .7rem;
    color: #94a3b8;
  }

  section::after {
    font-size: .7rem;
    color: #94a3b8;
  }
---

# MediTrace
## Gestione Farmaci e Terapie per RSA

<div style="margin-top:2.5rem;font-size:.95rem;color:#94a3b8">
Presentazione tecnica — Luglio 2026
</div>

---

# Il Problema

<div class="two-col">
<div>

### ❌ Situazione attuale

- **Fogli Excel** condivisi via email
- **Errori di trascrizione** nelle somministrazioni
- **Scorte farmaci** non tracciate in tempo reale
- **Nessuna tracciabilità** delle operazioni
- **Dispositivi eterogenei** (tablet, desktop)

</div>
<div>

### ✅ Soluzione MediTrace

- **PWA offline-first** — funziona senza connessione
- **Sync multi-dispositivo** automatico via Supabase
- **Tracciamento scorte** con soglie e alert
- **Audit log** completo di ogni operazione
- **Un'unica app** per tablet Android e desktop

</div>
</div>

---

# Cosa Fa MediTrace

<div class="kpi-row">
  <div class="kpi"><div class="kpi-num">7</div><div class="kpi-label">Moduli operativi</div></div>
  <div class="kpi"><div class="kpi-num">3</div><div class="kpi-label">Ruoli utente</div></div>
  <div class="kpi"><div class="kpi-num">PWA</div><div class="kpi-label">Offline-first</div></div>
  <div class="kpi"><div class="kpi-num">Sync</div><div class="kpi-label">Multi-device</div></div>
</div>

<div class="two-col" style="margin-top:1.5rem">
<div class="card">

### 📦 Gestione Farmaci
Catalogo con principio attivo, classe terapeutica, scorta minima, soglie riordino

### 📊 Monitoraggio Scorte
Report operativo con KPI, trend consumi, copertura settimanale, alert esaurimento

### 🏥 Ospiti & Residenze
Anagrafica ospiti con assegnazione stanza/letto e storico terapie

</div>
<div class="card">

### 💊 Terapie & Posologia
Piani terapici con dose, frequenza, orari somministrazione e durata

### 🔔 Promemoria
Notifiche per somministrazioni, scadenze e scorte in esaurimento

### 📋 Audit & Tracciabilità
Registro completo operazioni con filtri per operatore, entità, data

</div>
</div>

---

# Architettura del Sistema

![height:420px](architecture.png)

<div class="two-col" style="margin-top:.6rem">
<div>

<span class="badge">PWA</span> Vue 3 + Vite + Dexie (IndexedDB)

<span class="badge badge-green">Cloud</span> Supabase PostgreSQL + Auth RLS

</div>
<div>

<span class="badge badge-amber">CI/CD</span> GitHub Pages + Actions

<span class="badge">Sync</span> gzip + snapshot + conflict resolution

</div>
</div>

---

# Flusso Dati e Sincronizzazione

![height:420px](dataflow.png)

<div style="margin-top:.4rem;font-size:.85rem;color:var(--muted);text-align:center">
Sync bidirezionale con compressione gzip (~80%), retry automatico (3x),<br/>
risoluzione conflitti manuale (locale vs remoto), datasetVersion per merge ottimistico.
</div>

---

# Cruscotto — Home

![height:380px](screen-cruscotto.png)

<div style="margin-top:.3rem">

<span class="badge badge-amber">Attenzione</span> Alert su scorte critiche, promemoria pending, sync in coda

<span class="badge">Riepilogo</span> KPI turno: promemoria eseguiti/da eseguire/posticipati

<span class="badge badge-green">Sync</span> Stato sincronizzazione con conteggio operazioni in coda

</div>

---

# Ospiti

![height:380px](screen-ospiti.png)

<div class="two-col" style="margin-top:.3rem">
<div>

### Funzionalità
- Anagrafica completa (nome, cognome, CF, data nascita)
- Assegnazione stanza e letto
- Filtro per residenza e ricerca avanzata
- Collegamento diretto alle terapie dell'ospite

</div>
<div>

### Dettagli tecnici
- <span class="badge">Soft-delete</span> con undo (10 sec)
- <span class="badge badge-green">Ricerca</span> avanzata con pannello filtri
- <span class="badge">Shortcut</span> `/` cerca, `N` nuovo, `D` elimina

</div>
</div>

---

# Catalogo Farmaci

![height:380px](screen-farmaci.png)

<div class="two-col" style="margin-top:.3rem">
<div>

### Scheda Farmaco
- Nome commerciale + principio attivo
- Classe terapeutica
- Scorta minima e soglia autonomia (giorni)
- Gestione confezioni multiple per farmaco

</div>
<div>

### Confezioni
- Lotto, dosaggio, quantità attuale
- Soglia riordino personalizzabile
- Data scadenza con alert
- Confezione predefinita per terapia

</div>
</div>

---

# Scorte & Report Operativo

![height:380px](screen-scorte.png)

<div style="margin-top:.3rem">

<span class="badge badge-amber">Alert</span> Farmaci sotto soglia: critici (rossi) e in esaurimento (gialli)

<span class="badge">KPI</span> Consumo settimanale, copertura in settimane, trend 6 mesi

<span class="badge badge-green">Export</span> PDF e CSV con report multi-sezione

</div>

---

# Movimenti di Magazzino

![height:380px](screen-movimenti.png)

<div class="two-col" style="margin-top:.3rem">
<div>

### Tipi movimento
- **Carico**: rifornimento scorte
- **Scarico**: somministrazione o consumo

</div>
<div>

### Collegamenti
- Ogni movimento aggancia: ospite, terapia, confezione
- Aggiornamento automatico quantità in magazzino

</div>
</div>

---

# Terapie

![height:380px](screen-terapie.png)

<div style="margin-top:.3rem">

<span class="badge">Posologia</span> Dose, frequenza giornaliera, 6 orari di somministrazione

<span class="badge badge-green">Vista</span> Somministrazioni attive raggruppate per ospite

<span class="badge">Durata</span> Data inizio e fine terapia, con controllo sovrapposizioni

</div>

---

# Promemoria

![height:380px](screen-promemoria.png)

<div class="two-col" style="margin-top:.3rem">
<div>

### Gestione Reminder
- Pianificazione automatica da terapie attive
- Fasce orarie configurabili (mattina, pomeriggio, sera, notte)
- Stati: da eseguire, eseguito, posticipato, saltato

</div>
<div>

### Notifiche
- <span class="badge badge-green">Web Push API</span> su browser compatibili
- <span class="badge">Test</span> integrato nel pannello Impostazioni
- <span class="badge badge-amber">Fallback</span> agenda locale sempre disponibile

</div>
</div>

---

# Audit Log

![height:380px](screen-audit.png)

<div style="margin-top:.3rem">

<span class="badge">Filtri</span> Operatore, ospite, farmaco, terapia, azione, entità, data

<span class="badge badge-green">Export</span> JSON e PDF del registro filtrato

<span class="badge">Dettaglio</span> JSON completo di ogni evento con expand/collapse

</div>

---

# Sicurezza

<div class="two-col">
<div class="card">

### Autenticazione

- **Table-Auth**: token di sessione condiviso via `sync_files`
- **Password policy**: 10+ caratteri, maiuscola, minuscola, numero, simbolo
- **Rate limiting**: integrato su endpoint Supabase
- **Session TTL**: configurabile, con scadenza automatica

</div>
<div class="card">

### Row Level Security

- **RLS su Supabase**: ogni tabella ha policy dedicate
- **anon key**: sola lettura `sync_files` per bootstrap
- **authenticated**: CRUD completo via RPC functions
- **Migration controllate**: 8 file SQL versionati nel repo

</div>
</div>

<div style="margin-top:1rem;text-align:center">
<span class="badge badge-green">GDPR-ready</span> &nbsp; dati sanitari solo su dispositivo locale
</div>

---

# PWA — Offline First

<div class="two-col">
<div>

### Caratteristiche PWA

- **Service Worker**: caching automatico build + assets
- **IndexedDB (Dexie)**: database locale completo
- **Installabile**: icona su home screen Android/desktop
- **Manifest**: nome, icone, colori, orientamento
- **Aggiornamento**: chunk-load error recovery

</div>
<div class="card">

### Perché Offline-First

> In una RSA la connettività non è garantita. L'app deve funzionare sempre, anche senza rete.

- **Nessuna interruzione** durante visita ai pazienti
- **Sync automatico** quando torna la connessione
- **Nessuna perdita dati**: tutto salvato localmente prima del sync

</div>
</div>

---

# Sincronizzazione — Dettaglio Tecnico

| Componente | Ruolo |
|---|---|
| `sync.js` | Orchestratore: `fullSync()` con merge snapshot-based |
| `syncBackend.js` | Selettore runtime: Supabase o GitHub Gist (legacy) |
| `supabaseSync.js` | Upload/download via RPC `app_list/upload/download_sync_file` |
| `syncCompress.js` | Compressione gzip con `pako` (~80% riduzione) |
| `useSyncState.js` | Stato reattivo: SYNCED / PENDING / CONFLICT / ERROR / OFFLINE |

<div class="two-col" style="margin-top:.8rem">
<div class="card">

### Cosa viene sincronizzato
- Ospiti, Farmaci, Terapie, Movimenti
- Confezioni, Promemoria, Residenze
- Profili utente, Impostazioni

</div>
<div class="card">

### Conflitti
- Rilevamento automatico per campo
- Scelta manuale: **mantieni locale** o **accetta remoto**
- Tracciamento in `activityLog`

</div>
</div>

---

# Keep-Alive & Automazione

<div class="two-col">
<div class="card">

### GitHub Actions Cron

```yaml
# .github/workflows/keep_alive.yml
on:
  schedule:
    - cron: '0 0 * * 0,4'  # Dom + Gio
```

- Ping REST API Supabase 2x/settimana
- Previene pausa per inattività (free tier: 7gg)
- `workflow_dispatch` per test manuale

</div>
<div class="card">

### Keep-Alive Client-Side

- Servizio `keepAlive.js` nell'app
- Check ogni 6 ore se DB inattivo da 6+ giorni
- Ping leggero: `SELECT name FROM sync_files LIMIT 1`
- Toggle on/off nelle Impostazioni

</div>
</div>

<div style="margin-top:1rem;text-align:center">
<span class="badge badge-green">Ridondanza</span> &nbsp; due meccanismi indipendenti: GitHub Actions + client-side
</div>

---

# Stack Tecnologico

<div class="two-col">
<div>

### Frontend

| Layer | Tecnologia |
|---|---|
| Framework | Vue 3 (Composition API) |
| Build | Vite 5 |
| Routing | Vue Router 4 (hash) |
| State | IndexedDB via Dexie.js |
| UI | CSS custom, nessun framework |
| PWA | vite-plugin-pwa + Workbox |

</div>
<div>

### Backend & DevOps

| Layer | Tecnologia |
|---|---|
| Database | Supabase PostgreSQL |
| Auth | Table-auth + RLS |
| Sync | RPC + gzip + snapshot merge |
| Hosting | GitHub Pages |
| CI | GitHub Actions |
| Test | Vitest + Playwright (72 unit, 29 E2E) |

</div>
</div>

---

# Copertura Test

<div class="kpi-row">
  <div class="kpi"><div class="kpi-num">72</div><div class="kpi-label">Unit test</div></div>
  <div class="kpi"><div class="kpi-num">29</div><div class="kpi-label">E2E Playwright</div></div>
  <div class="kpi"><div class="kpi-num">41</div><div class="kpi-label">CRUD + detection</div></div>
</div>

<div class="two-col" style="margin-top:1.2rem">
<div class="card">

### Unit Test (Vitest)
- Servizi: `auth`, `sync`, `terapie`, `farmaci`, `promemoria`
- Modelli: validazione form, calcolo KPI, reporting
- Utility: `formatDate`, `buildOperationalReport`, CSV import

</div>
<div class="card">

### E2E (Playwright)
- Flussi CRUD completi per ogni entità
- Multi-browser: Chromium, Firefox, WebKit
- Fixture CSV realistici (30 ospiti, 30 farmaci)
- Test online sync con Supabase reale

</div>
</div>

---

# Roadmap

| Priorità | Feature | Stato |
|---|---|---|
| 🔴 Alta | Notifiche push Web API | In corso |
| 🔴 Alta | Import CSV multi-sorgente | Completato |
| 🟡 Media | Dashboard analytics avanzate | Pianificato |
| 🟡 Media | Multi-residenza con switch | Completato |
| 🟢 Bassa | Integrazione stampante termica | Ideazione |
| 🟢 Bassa | App nativa Android (Capacitor) | Valutazione |
| ⚪ Tech | Supabase branches per staging | Completato |
| ⚪ Tech | Keep-alive automatizzato | Completato |

---

# Perché MediTrace

<div class="two-col">
<div class="card">

### 🎯 Per le RSA
- Riduce **errori di somministrazione**
- Traccia **scorte in tempo reale**
- Semplifica la **turnazione operatori**
- Garantisce **tracciabilità** completa
- **Nessun costo** di infrastruttura server

</div>
<div class="card">

### 🔧 Per lo Sviluppatore
- **Open source** su GitHub
- Stack **moderno e manutenibile**
- **83% test coverage** (unit + E2E)
- Deploy **automatico** su GitHub Pages
- **Documentazione** completa in `docs/`

</div>
</div>

<div style="margin-top:1.5rem;text-align:center;font-size:1.1rem">
<strong>github.com/vgrazian/MediTrace</strong>
</div>

---

# Domande?

<div style="text-align:center;margin-top:3rem">

### MediTrace
**Gestione Farmaci e Terapie per RSA**

<br/>

<span style="font-size:1.1rem;color:var(--muted)">
PWA · Offline-First · Sync Multi-Dispositivo · Supabase · Open Source
</span>

<br/><br/>

<span class="badge badge-green">Build: luglio 2026</span>
&nbsp;
<span class="badge">72 unit test</span>
&nbsp;
<span class="badge badge-amber">29 E2E</span>

</div>
