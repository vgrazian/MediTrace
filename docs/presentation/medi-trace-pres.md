---
marp: true
theme: uncover
class:
  - lead
paginate: true
size: 16:9
footer: '![h:14px](logo-mark.png) MediTrace · github.com/vgrazian/MediTrace'
style: |
  @import url('https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,400;6..72,500;6..72,600&family=Inter:wght@300;400;500;600&display=swap');

  :root {
    --primary:   #1e6f6b;
    --primary-l: #e8f4f3;
    --accent:    #d97706;
    --accent-l:  #fef7ed;
    --muted:     #787774;
    --border:    #eaeaea;
    --bg-card:   #fafaf9;
  }

  section {
    font-family: 'Inter', -apple-system, sans-serif;
    color: #2f3437;
    background: #ffffff;
    padding: 3.5rem 4.5rem;
    font-size: .82rem;
    line-height: 1.7;
  }

  /* ── Lead / Title slides ── */
  section.lead {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    text-align: center;
    padding: 3rem 5rem;
    background: linear-gradient(180deg, #f6fbfa 0%, #ffffff 100%);
  }
  section.lead h1 {
    font-family: 'Newsreader', Georgia, serif;
    font-size: 2.4rem;
    font-weight: 500;
    letter-spacing: -0.04em;
    line-height: 1.15;
    color: #1a1a1a;
    margin: 0 0 .6rem 0;
  }
  section.lead p {
    font-size: .9rem;
    font-weight: 400;
    color: var(--muted);
    margin: 0;
  }
  section.lead .tagline {
    display: inline-flex;
    gap: .6rem;
    margin-top: 1.2rem;
    font-size: .72rem;
    color: var(--primary);
    letter-spacing: .02em;
  }
  section.lead .tagline span {
    background: var(--primary-l);
    padding: .2rem .7rem;
    border-radius: 99px;
  }

  section h1 {
    font-family: 'Newsreader', Georgia, serif;
    font-size: 1.45rem;
    font-weight: 500;
    letter-spacing: -0.025em;
    color: #1a1a1a;
    margin: 0 0 1.2rem 0;
  }
  section h2 {
    font-family: 'Inter', sans-serif;
    font-size: .8rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: .07em;
    color: var(--primary);
    margin: 0 0 .4rem 0;
  }
  section h3 {
    font-family: 'Newsreader', Georgia, serif;
    font-size: 1.05rem;
    font-weight: 500;
    margin: 0 0 .3rem 0;
    color: #1a1a1a;
  }

  section p { font-size: .82rem; color: var(--muted); margin: 0 0 .5rem 0; }
  section a { color: var(--primary); text-decoration: none; }
  section img { border-radius: 6px; border: 1px solid var(--border); }

  section table {
    width: 100%;
    border-collapse: collapse;
    font-size: .76rem;
  }
  section th {
    background: var(--primary-l);
    font-weight: 600;
    padding: .35rem .6rem;
    border-bottom: 1.5px solid var(--primary);
    text-align: left;
    font-size: .68rem;
    text-transform: uppercase;
    letter-spacing: .05em;
    color: var(--primary);
  }
  section td {
    padding: .3rem .6rem;
    border-bottom: 1px solid #f2f2f2;
    color: #4a4a4a;
    font-size: .76rem;
  }
  section td:first-child { font-weight: 500; color: #2f3437; }
  section code {
    background: #f7f6f3;
    padding: .1rem .4rem;
    border-radius: 3px;
    font-size: .73rem;
    font-family: 'SF Mono', 'JetBrains Mono', monospace;
    color: #1a1a1a;
  }

  section .row { display: flex; gap: 2.2rem; margin-top: .6rem; }
  section .col { flex: 1; min-width: 0; }
  section .label {
    font-size: .62rem;
    text-transform: uppercase;
    letter-spacing: .07em;
    color: #b0b0b0;
    margin-bottom: .15rem;
  }
  section .quiet { color: #b0b0b0; font-size: .73rem; }

  section .card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 1rem 1.2rem;
    margin-bottom: .7rem;
  }
  section .card.accent { border-left: 3px solid var(--primary); }
  section .card.warn   { border-left: 3px solid var(--accent); }

  section .badge {
    display: inline-block;
    font-size: .68rem;
    font-weight: 600;
    padding: .12rem .6rem;
    border-radius: 99px;
    margin-right: .3rem;
    margin-bottom: .2rem;
  }
  section .badge.green  { background: #e8f5e9; color: #2e7d32; }
  section .badge.blue   { background: #e3f2fd; color: #1565c0; }
  section .badge.teal   { background: var(--primary-l); color: var(--primary); }
  section .badge.amber  { background: var(--accent-l); color: var(--accent); }
  section .badge.gray   { background: #f5f5f4; color: #787774; }

  section .big-num {
    font-family: 'Newsreader', Georgia, serif;
    font-size: 2.8rem;
    font-weight: 500;
    letter-spacing: -0.04em;
    color: var(--primary);
    line-height: 1;
  }

  section .steps { counter-reset: step; }
  section .step {
    display: flex;
    align-items: flex-start;
    gap: .8rem;
    margin-bottom: .55rem;
    counter-increment: step;
  }
  section .step::before {
    content: counter(step);
    flex-shrink: 0;
    width: 1.6rem; height: 1.6rem;
    background: var(--primary);
    color: #fff;
    border-radius: 99px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: .75rem;
    font-weight: 600;
    margin-top: .1rem;
  }
  section .step h3 { font-size: .85rem; margin: 0; font-family: 'Inter', sans-serif; font-weight: 600; }
  section .step p   { font-size: .75rem; margin: .1rem 0 0 0; }

  section::after { font-size: .52rem; color: #d4d4d2; right: 2rem; bottom: 1rem; }
  footer { font-size: .55rem; color: #c0c0c0; left: 2rem; bottom: 1rem; }
---

<!-- _footer: '' -->

![w:80px](logo-mark.png)

# MediTrace
Gestione farmaci per le Residenze<br>della Comunità di Sant'Egidio

<div class="tagline">
  <span>PWA offline-first</span>
  <span>Vue 3 + Supabase</span>
  <span>Open source</span>
</div>

---

# Il problema

<div class="row">
<div class="col">

<div class="card warn">

### ❌ Errori di somministrazione

Terapie cartacee o fogli Excel. Nessuna
tracciabilità. Orari sbagliati, farmaci confusi.

</div>

<div class="card warn">

### ❌ Scorte non monitorate

Farmaci esauriti senza preavviso.
Scadenze non tracciate. Riordini d'emergenza.

</div>

</div>
<div class="col">

<div class="card warn">

### ❌ Nessuna continuità

Passaggi di turno senza storico.
Nessuna visibilità su cosa è stato fatto
o su cosa resta da fare.

</div>

<div class="card warn">

### ❌ Zero audit

Nessuna registrazione di chi ha fatto cosa.
Impossibile risalire a errori o responsabilità.

</div>

</div>
</div>

---

# La soluzione

<div style="text-align:center;margin:1.2rem 0">

## Un'unica app, sempre disponibile,<br>che guida l'operatore in ogni fase

</div>

<div class="row" style="margin-top:1.8rem">
<div class="col" style="text-align:center">

<div class="big-num" style="color:#d97706">1</div>
**Dispositivo**  
Tablet o smartphone.
Installabile su home screen.
Funziona senza internet.

</div>
<div class="col" style="text-align:center">

<div class="big-num" style="color:#2e7d32">∞</div>
**Sempre attivo**  
Dati locali via IndexedDB.
Sync con Supabase quando
la connessione è disponibile.

</div>
<div class="col" style="text-align:center">

<div class="big-num">100%</div>
**Tracciabilità**  
Ogni operazione registrata.
Audit trail completo.
GDPR-ready, dati clinici on-device.

</div>
</div>

---

# Cosa fa MediTrace

<div class="row">
<div class="col">

<div class="card accent">
<h3>🏠 Cruscotto</h3>
KPI turno · Alert scorte · Stato sync · Promemoria in scadenza
</div>

<div class="card accent">
<h3>👤 Ospiti</h3>
Anagrafica · Assegnazione stanza/letto · Ricerca avanzata · Soft-delete
</div>

<div class="card accent">
<h3>💊 Farmaci</h3>
Catalogo principi attivi · Confezioni multiple · Lotto/scadenza · Scorta minima
</div>

<div class="card accent">
<h3>⏰ Terapie e Promemoria</h3>
Piano terapeutico · 6 fasce orarie per residenza · Push notification · Azioni batch
</div>

</div>
<div class="col">

<div class="card accent">
<h3>📦 Scorte e Movimenti</h3>
Report KPI · Consumo settimanale · Carico/scarico · Export PDF/CSV
</div>

<div class="card accent">
<h3>📋 Audit</h3>
Registro operazioni · Filtri avanzati · Dettaglio JSON · Export
</div>

<div class="card accent">
<h3>🔒 Multi‑tenancy</h3>
Accesso per residenza · Ruoli admin/operatore · Password policy
</div>

<div class="card accent">
<h3>🗂️ Import CSV</h3>
Caricamento massivo · Compatibile Google Sheets · Validazione automatica
</div>

</div>
</div>

---

<!-- _footer: '' -->

# Numeri del progetto

<div class="row" style="text-align:center;margin-top:1.5rem">
<div class="col">
<div class="big-num">15</div>
<p style="margin:0">viste<br>applicative</p>
</div>
<div class="col">
<div class="big-num">146</div>
<p style="margin:0">test E2E<br>Playwright</p>
</div>
<div class="col">
<div class="big-num">83%</div>
<p style="margin:0">code<br>coverage</p>
</div>
<div class="col">
<div class="big-num">8</div>
<p style="margin:0">migration<br>SQL Supabase</p>
</div>
<div class="col">
<div class="big-num">3</div>
<p style="margin:0">residenze<br>multi‑tenant</p>
</div>
</div>

<div style="text-align:center;margin-top:2.5rem">

<span class="badge teal">Vue 3 Composition API</span>
<span class="badge teal">Vite 5</span>
<span class="badge teal">Dexie.js IndexedDB</span>
<span class="badge teal">Supabase PostgreSQL</span>
<span class="badge teal">Workbox PWA</span>
<span class="badge teal">GitHub Pages</span>

</div>

---

# Architettura

![height:460px](architecture.png)

---

# Stack — Frontend

| Categoria | Tecnologia | Ruolo |
|---|---|---|
| Framework | Vue 3 | Composition API, reattività |
| Build | Vite 5 | Dev server, HMR, bundling |
| Routing | Vue Router 4 | Lazy loading, guard |
| Store locale | Dexie.js | IndexedDB, transazioni |
| Stile | CSS vanilla | Nessun framework UI esterno |
| PWA | vite-plugin-pwa + Workbox | Service Worker, caching, install |
| Test | Vitest + Playwright | 72 unit + 146 E2E |

---

# Stack — Backend & Infra

| Categoria | Tecnologia | Ruolo |
|---|---|---|
| Database | Supabase PostgreSQL | Dati operativi e sync |
| Auth | Table-auth + RLS | Accesso per residenza, ruoli |
| Realtime | Supabase Realtime | Sync multi-dispositivo |
| Hosting | GitHub Pages | Deploy automatico |
| CI/CD | GitHub Actions | Build, test, keep-alive |
| Monitoring | Axiom | Log analytics, diagnostica |
| Sicurezza | 8 migration SQL | RLS, policy, audit nativo |

---

![height:460px](screen-cruscotto.png)

# Cruscotto

KPI del turno · Alert scorte critiche · Promemoria in scadenza · Stato sync

---

![height:460px](screen-ospiti.png)

# Ospiti

Anagrafica completa · Assegnazione stanza/letto · Ricerca avanzata · Soft-delete

---

![height:460px](screen-farmaci.png)

# Catalogo farmaci

Principio attivo · Nome commerciale · Confezioni · Lotto · Scadenza · Scorta minima

---

![height:460px](screen-terapie.png)

# Terapie

Piano terapeutico · Dose, frequenza · 6 orari/giorno · Data inizio/fine · Quick-add

---

![height:460px](screen-promemoria.png)

# Promemoria

Pianificazione automatica · Fasce orarie per residenza · Stati multipli · Azioni batch

---

![height:460px](screen-scorte.png)

# Scorte

Report KPI · Consumo settimanale · Copertura · Trend 6 mesi · Export PDF/CSV

---

![height:460px](screen-movimenti.png)

# Movimenti

Carico/scarico · Aggancio a ospite/terapia/confezione · Ricerca avanzata · Validazione

---

![height:460px](screen-audit.png)

# Audit

Registro completo · Filtro operatore · Dettaglio JSON · Export PDF · Badge sync

---

# Flusso di lavoro — Turno

<div class="row">
<div class="col">

<h3 style="font-family:'Newsreader',Georgia,serif;font-size:1.1rem;color:var(--primary)">☀️ Inizio turno</h3>

<div class="steps">
<div class="step">
<div><h3>Login</h3><p>Credenziali personali, autenticazione locale+remota</p></div>
</div>
<div class="step">
<div><h3>Cruscotto</h3><p>Verifica KPI, alert scorte, promemoria in scadenza</p></div>
</div>
<div class="step">
<div><h3>Promemoria</h3><p>Apri la fascia oraria corrente. Lista somministrazioni</p></div>
</div>
</div>

</div>
<div class="col">

<h3 style="font-family:'Newsreader',Georgia,serif;font-size:1.1rem;color:var(--primary)">🔄 Giro terapia</h3>

<div class="steps">
<div class="step">
<div><h3>Scheda ospite</h3><p>Apri da promemoria → verifica terapia → conferma dose</p></div>
</div>
<div class="step">
<div><h3>Esito</h3><p>Eseguito / Posticipato / Saltato → eventuale nota</p></div>
</div>
<div class="step">
<div><h3>Scarico</h3><p>Se farmaco esaurito: Movimenti → scarico automatico</p></div>
</div>
</div>

</div>
</div>

---

# Flusso di lavoro — Continuità

<div class="row">
<div class="col">

<h3 style="font-family:'Newsreader',Georgia,serif;font-size:1.1rem;color:#d97706">📋 Passaggio di turno</h3>

<div class="card accent" style="margin-top:.8rem">
**Promemoria in sospeso** — filtrati per stato "da eseguire". Note su terapie saltate o posticipate. Verifica scorte per il fabbisogno del turno successivo.
</div>

<div class="card accent">
**Nessun foglio perso** — tutto registrato in Audit, cronologia sempre disponibile per ogni ospite.
</div>

</div>
<div class="col">

<h3 style="font-family:'Newsreader',Georgia,serif;font-size:1.1rem;color:#d97706">📅 Operazioni periodiche</h3>

<div class="card" style="margin-top:.8rem">
**Import CSV** — carico iniziale o aggiornamento massivo da Google Sheets
</div>

<div class="card">
**Movimenti** — carico periodico da farmacia con aggiornamento automatico quantità
</div>

<div class="card">
**Scorte** — verifica scadenze, riordino, report mensile di consumo
</div>

<div class="card">
**Audit** — controllo qualità, conformità normativa, statistiche operatore
</div>

</div>
</div>

---

# Sincronizzazione

![height:460px](dataflow.png)

---

# Sicurezza

<div class="row">
<div class="col">

### 🔐 Autenticazione
- Table-auth con session token
- Password policy: 10+ caratteri, maiuscola, minuscola, numero, simbolo
- Session TTL configurabile
- Due ruoli: `admin` e `operator`

### 🛡️ Row Level Security
- RLS su ogni tabella Supabase
- CRUD via RPC functions autenticate
- 8 migration SQL versionate
- Accesso filtrato per residenza

</div>
<div class="col">

### 🔒 Privacy
<div class="card accent" style="margin-top:.5rem">
I dati clinici risiedono **solo sul dispositivo locale** (IndexedDB). Nessun dato sanitario transita su server cloud. La sincronizzazione scambia solo metadati operativi e stato delle scorte.
</div>

<div class="card accent">
**GDPR-ready** — architettura progettata per la minimizzazione del dato: su Supabase transitano solo ID, quantità e log operativi, non dati clinici degli ospiti.
</div>

</div>
</div>

---

# Qualità e test

<div class="row" style="text-align:center;margin-top:1rem">
<div class="col">
<div class="big-num">72</div>
<p style="margin:0">unit test<br><span class="quiet">servizi, modelli, KPI, reporting</span></p>
</div>
<div class="col">
<div class="big-num">146</div>
<p style="margin:0">test E2E<br><span class="quiet">flussi CRUD, multi‑browser, sync</span></p>
</div>
<div class="col">
<div class="big-num">83%</div>
<p style="margin:0">copertura<br><span class="quiet">tra unit ed E2E</span></p>
</div>
</div>

<div style="text-align:center;margin-top:2rem">

<span class="badge green">41 test CRUD</span>
<span class="badge green">Duplicate detection</span>
<span class="badge green">30 ospiti fixture</span>
<span class="badge green">30 farmaci fixture</span>
<span class="badge blue">CI/CD su ogni PR</span>

</div>

---

# Roadmap

| Stato | Feature | Dettaglio |
|---|---|---|
| ✅ | PWA offline-first | Service Worker, IndexedDB, installabile |
| ✅ | Sync multi-dispositivo | Supabase Realtime + Direct API |
| ✅ | Multi-residenza | Switch residenza, fasce orarie per sede |
| ✅ | Import CSV | Multi-sorgente, validazione automatica |
| ✅ | Keep-alive | GitHub Actions cron + client-side ping |
| ✅ | Audit trail | Registro completo, export JSON/PDF |
| 🔄 | Push notification | Web Push API, notifiche promemoria |
| 📋 | Analytics avanzate | Dashboard consumi, trend predittivi |
| 📋 | App nativa Android | Capacitor wrapper, notifiche native |

---

# Link e accesso

<div class="row">
<div class="col">

### 🌐 Risorse

<div class="card accent">

**App live**  
[vgrazian.github.io/MediTrace](https://vgrazian.github.io/MediTrace/)

**Repository**  
[github.com/vgrazian/MediTrace](https://github.com/vgrazian/MediTrace)

**Documentazione**  
`docs/` — requisiti tecnici, flussi navigazione, schema JSON, runbook operativo

</div>

</div>
<div class="col">

### 🔑 Credenziali demo

| Ruolo | Utente | Password |
|---|---|---|
| Admin | `valerio` | `V@lerio123!` |
| Admin | `anna` | `Anna@456!Xy` |
| Admin | `admin` | `A9m4K2qL!Xy` |

<div class="card" style="margin-top:1rem;font-size:.73rem">
<span class="badge teal">Dati demo</span> 3 residenze · 10 ospiti · 10 farmaci · terapie attive · promemoria giornalieri
</div>

</div>
</div>

---

<!-- _footer: '' -->

# Grazie

<div style="text-align:center;margin-top:2.5rem">

![w:72px](logo-mark.png)

### MediTrace
Gestione farmaci per le Residenze della Comunità di Sant'Egidio

<div class="tagline" style="margin-top:1rem">
  <span>PWA</span>
  <span>Offline‑first</span>
  <span>Sync multi‑dispositivo</span>
  <span>Supabase</span>
  <span>Open source</span>
</div>

<p style="margin-top:2.5rem;font-size:.85rem">
  <a href="https://github.com/vgrazian/MediTrace">github.com/vgrazian/MediTrace</a>
</p>

<p class="quiet" style="margin-top:.6rem">Luglio 2026</p>

</div>
