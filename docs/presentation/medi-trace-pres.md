---
marp: true
theme: uncover
class:
  - lead
paginate: true
size: 16:9
footer: '![h:14px](logo-mark.png) MediTrace · github.com/vgrazian/MediTrace'
style: |
  @import url('https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,400;6..72,500;6..72,600&family=Inter:wght@300;400;500;600;700&display=swap');

  :root {
    --brand:        #223564;
    --brand-light:  #edf3fb;
    --brand-lighter:#f4f8fd;
    --accent:       #c26b0a;
    --accent-light: #fef7ed;
    --text:         #1a2e4f;
    --text-muted:   #5f6b7a;
    --border:       #dfe6f0;
    --surface:      #f7fbff;
  }

  section {
    font-family: 'Inter', -apple-system, sans-serif;
    color: var(--text);
    background: #ffffff;
    padding: 3.2rem 4.2rem;
    font-size: .82rem;
    line-height: 1.7;
  }

  section.lead {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    text-align: center;
    padding: 3rem 5rem;
    background: linear-gradient(180deg, #edf3fb 0%, #ffffff 100%);
  }
  section.lead h1 {
    font-family: 'Newsreader', Georgia, serif;
    font-size: 2.6rem;
    font-weight: 500;
    letter-spacing: -0.04em;
    line-height: 1.12;
    color: var(--brand);
    margin: 0 0 .65rem 0;
  }
  section.lead p {
    font-size: .92rem;
    font-weight: 400;
    color: var(--text-muted);
    margin: 0;
  }
  section.lead .tagline {
    display: inline-flex;
    gap: .6rem;
    margin-top: 1.3rem;
    font-size: .7rem;
    color: var(--brand);
    letter-spacing: .03em;
  }
  section.lead .tagline span {
    background: var(--brand-light);
    padding: .2rem .7rem;
    border-radius: 99px;
    font-weight: 500;
  }

  section h1 {
    font-family: 'Newsreader', Georgia, serif;
    font-size: 1.5rem;
    font-weight: 500;
    letter-spacing: -0.025em;
    color: var(--brand);
    margin: 0 0 1.1rem 0;
  }
  section h2 {
    font-family: 'Inter', sans-serif;
    font-size: .78rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: .08em;
    color: var(--brand);
    margin: 0 0 .4rem 0;
  }
  section h3 {
    font-family: 'Newsreader', Georgia, serif;
    font-size: 1.08rem;
    font-weight: 500;
    margin: 0 0 .3rem 0;
    color: var(--text);
  }

  section p  { font-size: .82rem; color: var(--text-muted); margin: 0 0 .5rem 0; }
  section a  { color: var(--brand); text-decoration: none; }
  section img { border-radius: 7px; border: 1px solid var(--border); }

  section table {
    width: 100%;
    border-collapse: collapse;
    font-size: .76rem;
  }
  section th {
    background: var(--brand-light);
    font-weight: 600;
    padding: .35rem .6rem;
    border-bottom: 2px solid var(--brand);
    text-align: left;
    font-size: .66rem;
    text-transform: uppercase;
    letter-spacing: .06em;
    color: var(--brand);
  }
  section td {
    padding: .3rem .6rem;
    border-bottom: 1px solid var(--border);
    color: var(--text);
    font-size: .76rem;
  }
  section td:first-child { font-weight: 500; }
  section code {
    background: var(--brand-lighter);
    padding: .1rem .4rem;
    border-radius: 3px;
    font-size: .73rem;
    font-family: 'SF Mono', 'JetBrains Mono', monospace;
    color: var(--brand);
  }

  section .row { display: flex; gap: 2.2rem; margin-top: .6rem; }
  section .col { flex: 1; min-width: 0; }
  section .label {
    font-size: .6rem;
    text-transform: uppercase;
    letter-spacing: .08em;
    color: #9aa8be;
    margin-bottom: .15rem;
  }
  section .quiet { color: #9aa8be; font-size: .73rem; }

  section .card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: .95rem 1.15rem;
    margin-bottom: .65rem;
  }
  section .card.accent { border-left: 3px solid var(--brand); background: var(--brand-lighter); }
  section .card.warn   { border-left: 3px solid var(--accent); background: #fffbf5; }

  section .badge {
    display: inline-block;
    font-size: .66rem;
    font-weight: 600;
    padding: .12rem .6rem;
    border-radius: 99px;
    margin-right: .3rem;
    margin-bottom: .2rem;
  }
  section .badge.brand  { background: var(--brand-light); color: var(--brand); }
  section .badge.green  { background: #eaf5ea; color: #2e7d32; }
  section .badge.blue   { background: #e3f2fd; color: #1565c0; }
  section .badge.amber  { background: var(--accent-light); color: var(--accent); }
  section .badge.gray   { background: #f3f5f7; color: #5f6b7a; }

  section .big-num {
    font-family: 'Newsreader', Georgia, serif;
    font-size: 3rem;
    font-weight: 500;
    letter-spacing: -0.04em;
    color: var(--brand);
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
    background: var(--brand);
    color: #fff;
    border-radius: 99px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: .75rem;
    font-weight: 600;
    margin-top: .1rem;
  }
  section .step h3 { font-size: .85rem; margin: 0; font-family: 'Inter', sans-serif; font-weight: 600; color: var(--text); }
  section .step p   { font-size: .75rem; margin: .1rem 0 0 0; }

  section::after { font-size: .52rem; color: #c8d0dc; right: 2rem; bottom: 1rem; }
  footer { font-size: .55rem; color: #b4bfd1; left: 2rem; bottom: 1rem; }
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

### Errori di somministrazione

Terapie cartacee o fogli Excel. Nessuna
tracciabilità. Orari sbagliati, farmaci confusi.

</div>

<div class="card warn">

### Scorte non monitorate

Farmaci esauriti senza preavviso.
Scadenze non tracciate. Riordini d'emergenza.

</div>

</div>
<div class="col">

<div class="card warn">

### Nessuna continuità

Passaggi di turno senza storico.
Nessuna visibilità su cosa è stato fatto
o su cosa resta da fare.

</div>

<div class="card warn">

### Zero audit

Nessuna registrazione di chi ha fatto cosa.
Impossibile risalire a errori o responsabilità.

</div>

</div>
</div>

---

# La soluzione

<div style="text-align:center;margin:1.6rem 0">

## Un'unica app, sempre disponibile,<br>che guida l'operatore in ogni fase

</div>

<div class="row" style="margin-top:2rem">
<div class="col" style="text-align:center">

<div class="big-num" style="color:var(--accent)">1</div>
**Dispositivo**  
Tablet o smartphone.
Installabile su home screen.
Funziona senza internet.

</div>
<div class="col" style="text-align:center">

<div class="big-num" style="color:#2e7d32">&infin;</div>
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
<h3>Cruscotto</h3>
KPI turno · Alert scorte · Stato sync · Promemoria in scadenza
</div>

<div class="card accent">
<h3>Ospiti</h3>
Anagrafica · Assegnazione stanza/letto · Ricerca avanzata · Soft-delete
</div>

<div class="card accent">
<h3>Farmaci</h3>
Catalogo principi attivi · Confezioni multiple · Lotto/scadenza · Scorta minima
</div>

<div class="card accent">
<h3>Terapie e Promemoria</h3>
Piano terapeutico · Turni personalizzabili per residenza · Push notification · Azioni batch
</div>

</div>
<div class="col">

<div class="card accent">
<h3>Scorte e Movimenti</h3>
Report KPI · Consumo settimanale · Copertura giorni · Carico/scarico · Export PDF/CSV
</div>

<div class="card accent">
<h3>Audit e Diagnostica</h3>
Registro operazioni · Filtri avanzati · Dettaglio JSON · Dashboard Axiom integrata
</div>

<div class="card accent">
<h3>Multi‑tenancy</h3>
Accesso per residenza · Ruoli admin/operatore · Turni orari per sede · Password policy
</div>

<div class="card accent">
<h3>Import CSV</h3>
Caricamento massivo · Compatibile Google Sheets · Validazione automatica
</div>

</div>
</div>

---

<!-- _footer: '' -->

# Numeri del progetto

<div class="row" style="text-align:center;margin-top:1.8rem">
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

<div style="text-align:center;margin-top:2.8rem">

<span class="badge brand">Vue 3 Composition API</span>
<span class="badge brand">Vite 5</span>
<span class="badge brand">Dexie.js IndexedDB</span>
<span class="badge brand">Supabase PostgreSQL</span>
<span class="badge brand">Workbox PWA</span>
<span class="badge brand">GitHub Pages</span>

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
| Email | Supabase Edge Function | Reset password via Gmail SMTP |
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

Pianificazione automatica · Turni orari per residenza · Stati multipli · Azioni batch

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

Registro completo · Filtro operatore · Dettaglio JSON · Export PDF · Dashboard Axiom

---

# Funzionalità recenti

<div class="row">
<div class="col">

<div class="card accent">

### Turni personalizzabili per residenza

Ogni residenza può avere i propri turni (Mattina, Pomeriggio, Sera, Notte) con orari indipendenti. Configurabili dal pannello Residenze o Impostazioni. Override automatico dei turni globali.
<br>
<span class="badge brand">Luglio 2026</span>

</div>

</div>
<div class="col">

<div class="card accent">

### Reset password autonomo

Ogni operatore può reimpostare la propria password dal login tramite link email. Invio via Edge Function Supabase + Gmail SMTP. Token monouso con scadenza configurabile.
<br>
<span class="badge brand">Luglio 2026</span>

</div>

</div>
</div>

<div class="row" style="margin-top:.3rem">
<div class="col">

<div class="card accent">

### Diagnostica integrata

Dashboard Axiom accessibile direttamente dal pannello Audit: panoramica operatori, heatmap percorsi, errori raggruppati. Nessun tab separato.
<br>
<span class="badge brand">Luglio 2026</span>

</div>

</div>
<div class="col">

<div class="card accent">

### Dati demo per analytics

Trend consumi e grafici mostrano dati sintetici significativi anche in modalità demo. Utile per valutazione e formazione senza dati reali.
<br>
<span class="badge brand">Luglio 2026</span>

</div>

</div>
</div>

---

# Flusso di lavoro — Turno

<div class="row">
<div class="col">

<h3 style="font-family:'Newsreader',Georgia,serif;font-size:1.15rem;color:var(--brand);margin-bottom:.8rem">Inizio turno</h3>

<div class="steps">
<div class="step">
<div><h3>Login</h3><p>Credenziali personali, autenticazione locale+remota</p></div>
</div>
<div class="step">
<div><h3>Cruscotto</h3><p>Verifica KPI, alert scorte, promemoria in scadenza</p></div>
</div>
<div class="step">
<div><h3>Promemoria</h3><p>Apri il turno corrente. Lista somministrazioni</p></div>
</div>
</div>

</div>
<div class="col">

<h3 style="font-family:'Newsreader',Georgia,serif;font-size:1.15rem;color:var(--brand);margin-bottom:.8rem">Giro terapia</h3>

<div class="steps">
<div class="step">
<div><h3>Scheda ospite</h3><p>Apri da promemoria &rarr; verifica terapia &rarr; conferma dose</p></div>
</div>
<div class="step">
<div><h3>Esito</h3><p>Eseguito / Posticipato / Saltato &rarr; eventuale nota</p></div>
</div>
<div class="step">
<div><h3>Scarico</h3><p>Se farmaco esaurito: Movimenti &rarr; scarico automatico</p></div>
</div>
</div>

</div>
</div>

---

# Flusso di lavoro — Continuità

<div class="row">
<div class="col">

<h3 style="font-family:'Newsreader',Georgia,serif;font-size:1.15rem;color:var(--accent);margin-bottom:.8rem">Passaggio di turno</h3>

<div class="card accent" style="margin-top:.6rem">
**Promemoria in sospeso** — filtrati per stato "da eseguire". Note su terapie saltate o posticipate. Verifica scorte per il fabbisogno del turno successivo.
</div>

<div class="card accent">
**Nessun foglio perso** — tutto registrato in Audit, cronologia sempre disponibile per ogni ospite.
</div>

</div>
<div class="col">

<h3 style="font-family:'Newsreader',Georgia,serif;font-size:1.15rem;color:var(--accent);margin-bottom:.8rem">Operazioni periodiche</h3>

<div class="card" style="margin-top:.6rem">
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

### Autenticazione
- Table-auth con session token
- Password policy: 10+ caratteri, maiuscola, minuscola, numero, simbolo
- Reset password autonomo via email (Edge Function + Gmail SMTP)
- Session TTL configurabile
- Due ruoli: `admin` e `operator`

### Row Level Security
- RLS su ogni tabella Supabase
- CRUD via RPC functions autenticate
- 8 migration SQL versionate
- Accesso filtrato per residenza

</div>
<div class="col">

### Privacy
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

<div class="row" style="text-align:center;margin-top:1.2rem">
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

<div style="text-align:center;margin-top:2.2rem">

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
| ✅ | Multi-residenza | Switch residenza, turni personalizzabili per sede |
| ✅ | Reset password via email | Edge Function + Gmail SMTP, link monouso |
| ✅ | Import CSV | Multi-sorgente, validazione automatica |
| ✅ | Diagnostica integrata | Dashboard Axiom nel pannello Audit |
| ✅ | Audit trail | Registro completo, export JSON/PDF |
| 🔄 | Push notification | Web Push API, notifiche promemoria |
| 📋 | Analytics avanzate | Dashboard consumi, trend predittivi |
| 📋 | App nativa Android | Capacitor wrapper, notifiche native |

---

# Link e accesso

<div class="row">
<div class="col">

### Risorse

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

### Credenziali demo

| Ruolo | Utente |
|---|---|
| Admin | `valerio` |
| Admin | `anna` |
| Admin | `admin` |

<div class="card" style="margin-top:1rem;font-size:.73rem">
<span class="badge brand">Dati demo</span> 3 residenze · 10 ospiti · 10 farmaci · terapie attive · promemoria giornalieri
</div>

</div>
</div>

---

<!-- _footer: '' -->

# Grazie

<div style="text-align:center;margin-top:2.8rem">

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

<p style="margin-top:2.8rem;font-size:.85rem">
  <a href="https://github.com/vgrazian/MediTrace">github.com/vgrazian/MediTrace</a>
</p>

<p class="quiet" style="margin-top:.6rem">Luglio 2026</p>

</div>
