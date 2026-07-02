---
marp: true
theme: uncover
class:
  - lead
paginate: true
size: 16:9
footer: ''
style: |
  @import url('https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,400;6..72,500;6..72,600&family=Inter:wght@300;400;500;600&display=swap');

  :root {
    --ink: #1a1a1a;
    --muted: #787774;
    --line: #eaeaea;
    --bg: #fbfbfa;
    --surface: #ffffff;
  }

  section {
    font-family: 'Inter', -apple-system, sans-serif;
    color: var(--ink);
    background: var(--bg);
    padding: 3rem 3.5rem;
  }

  section.lead {
    background: #1a1a1a;
    color: #f5f5f4;
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 3rem 5rem;
  }

  section.lead h1 {
    font-family: 'Newsreader', Georgia, serif;
    font-size: 2.2rem;
    font-weight: 500;
    letter-spacing: -0.03em;
    line-height: 1.15;
    margin: 0 0 .25rem 0;
    color: #f5f5f4;
    border: none;
    padding: 0;
  }

  section.lead h2 {
    font-family: 'Inter', sans-serif;
    font-size: 1rem;
    font-weight: 400;
    color: #a1a09e;
    margin: 0;
  }

  section h1 {
    font-family: 'Newsreader', Georgia, serif;
    font-size: 1.5rem;
    font-weight: 500;
    letter-spacing: -0.02em;
    color: var(--ink);
    margin: 0 0 1rem 0;
    border: none;
    padding: 0;
  }

  section h2 {
    font-family: 'Inter', sans-serif;
    font-size: .95rem;
    font-weight: 600;
    color: var(--ink);
    margin: 1rem 0 .35rem 0;
    text-transform: uppercase;
    letter-spacing: .05em;
  }

  section h3 {
    font-family: 'Inter', sans-serif;
    font-size: .9rem;
    font-weight: 600;
    color: var(--ink);
    margin-bottom: .25rem;
  }

  section p, section li {
    font-size: .85rem;
    line-height: 1.65;
    color: var(--muted);
  }

  section strong {
    color: var(--ink);
    font-weight: 600;
  }

  section ul, section ol {
    padding-left: 1.2rem;
  }

  section li {
    margin-bottom: .2rem;
  }

  section img {
    border-radius: 4px;
    border: 1px solid var(--line);
    max-width: 100%;
  }

  section table {
    width: 100%;
    border-collapse: collapse;
    font-size: .8rem;
    margin-top: .6rem;
  }

  section th {
    background: #f7f6f3;
    color: var(--ink);
    font-weight: 600;
    padding: .35rem .5rem;
    border-bottom: 1px solid var(--line);
    text-align: left;
    font-size: .75rem;
    text-transform: uppercase;
    letter-spacing: .04em;
  }

  section td {
    padding: .3rem .5rem;
    border-bottom: 1px solid var(--line);
    color: var(--muted);
    font-size: .8rem;
  }

  section code {
    background: #f7f6f3;
    padding: .1rem .3rem;
    border-radius: 3px;
    font-size: .78rem;
    color: var(--ink);
    font-family: 'SF Mono', 'JetBrains Mono', monospace;
  }

  section .muted {
    color: var(--muted);
    font-size: .78rem;
  }

  section .badge {
    display: inline-block;
    background: #f7f6f3;
    color: var(--ink);
    font-size: .68rem;
    font-weight: 500;
    padding: .1rem .45rem;
    border-radius: 999px;
    letter-spacing: .04em;
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

  section .badge-red {
    background: #fdebec;
    color: #9f2f2d;
  }

  section .two-col {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.2rem;
    margin-top: .6rem;
  }

  section .card {
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: 6px;
    padding: .85rem 1rem;
  }

  section .kpi-row {
    display: flex;
    gap: .8rem;
    flex-wrap: wrap;
    margin-top: .6rem;
  }

  section .kpi {
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: 6px;
    padding: .5rem .8rem;
    text-align: center;
    flex: 1 1 100px;
  }

  section .kpi .kpi-num {
    font-family: 'Newsreader', serif;
    font-size: 1.5rem;
    font-weight: 500;
    color: var(--ink);
  }

  section .kpi .kpi-label {
    font-size: .65rem;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: .05em;
    margin-top: .1rem;
  }

  section::after {
    font-size: .6rem;
    color: #d4d4d2;
  }
---

# MediTrace
## Gestione farmaci per le Residenze della Comunità di Sant'Egidio

<div style="margin-top:3rem;font-size:.8rem;color:#787774">
Presentazione tecnica  ·  Luglio 2026
</div>

---

# MediTrace in numeri

<div class="kpi-row">
  <div class="kpi"><div class="kpi-num">7</div><div class="kpi-label">Moduli</div></div>
  <div class="kpi"><div class="kpi-num">3</div><div class="kpi-label">Ruoli</div></div>
  <div class="kpi"><div class="kpi-num">PWA</div><div class="kpi-label">Offline-first</div></div>
  <div class="kpi"><div class="kpi-num">Sync</div><div class="kpi-label">Multi-device</div></div>
</div>

<div class="two-col" style="margin-top:1.2rem">
<div class="card">

### Gestione farmaci
Catalogo con principio attivo, classe terapeutica, scorta minima, soglie riordino.

### Monitoraggio scorte
Report operativo con KPI, trend consumi, copertura settimanale, alert esaurimento.

### Ospiti e Residenze
Anagrafica ospiti con assegnazione stanza e storico terapie.

</div>
<div class="card">

### Terapie e posologia
Piani terapici con dose, frequenza, orari somministrazione e durata.

### Promemoria
Notifiche per somministrazioni, scadenze e scorte in esaurimento.

### Audit e tracciabilità
Registro completo operazioni con filtri per operatore, entità, data.

</div>
</div>

---

# Architettura del sistema

![height:430px](architecture.png)

---

# Flusso dati e sincronizzazione

![height:430px](dataflow.png)

<div style="margin-top:.3rem;font-size:.78rem;color:var(--muted);text-align:center">
Sync bidirezionale con compressione gzip (~80%), retry automatico, risoluzione conflitti manuale, datasetVersion per merge ottimistico.
</div>

---

# Cruscotto

![height:400px](screen-cruscotto.png)

<div style="margin-top:.2rem">

<span class="badge badge-amber">Alert</span> scorte critiche, promemoria pending, sync in coda
&nbsp;
<span class="badge">KPI</span> promemoria eseguiti, da eseguire, posticipati
&nbsp;
<span class="badge badge-green">Sync</span> stato con conteggio operazioni

</div>

---

# Ospiti

![height:400px](screen-ospiti.png)

<div class="two-col" style="margin-top:.2rem">
<div>

Anagrafica completa: nome, cognome, codice fiscale, data di nascita. Assegnazione stanza e letto. Ricerca avanzata con pannello filtri. Collegamento diretto alle terapie.

</div>
<div>

<span class="badge">Soft-delete</span> con undo 10 sec
&nbsp;
<span class="badge badge-green">Ricerca</span> avanzata con filtri
&nbsp;
<span class="badge">Shortcut</span> `/` cerca, `N` nuovo

</div>
</div>

---

# Catalogo farmaci

![height:400px](screen-farmaci.png)

<div class="two-col" style="margin-top:.2rem">
<div>

Nome commerciale e principio attivo. Classe terapeutica. Scorta minima e soglia autonomia in giorni. Gestione confezioni multiple per farmaco.

</div>
<div>

Lotto, dosaggio, quantità attuale. Soglia riordino personalizzabile. Data scadenza con alert. Confezione predefinita per terapia.

</div>
</div>

---

# Scorte e report

![height:400px](screen-scorte.png)

<div style="margin-top:.2rem">

<span class="badge badge-amber">Alert</span> farmaci sotto soglia: critici e in esaurimento
&nbsp;
<span class="badge">KPI</span> consumo settimanale, copertura, trend 6 mesi
&nbsp;
<span class="badge badge-green">Export</span> PDF e CSV

</div>

---

# Movimenti

![height:400px](screen-movimenti.png)

<div class="two-col" style="margin-top:.2rem">
<div>

**Carico**: rifornimento scorte.
**Scarico**: somministrazione o consumo.
Ogni movimento aggancia ospite, terapia e confezione.

</div>
<div>

Aggiornamento automatico della quantità in magazzino. Ricerca avanzata per tipo, data, ospite e farmaco.

</div>
</div>

---

# Terapie

![height:400px](screen-terapie.png)

<div style="margin-top:.2rem">

<span class="badge">Posologia</span> dose, frequenza, 6 orari giornalieri
&nbsp;
<span class="badge badge-green">Vista</span> somministrazioni raggruppate per ospite
&nbsp;
<span class="badge">Durata</span> data inizio e fine con controllo sovrapposizioni

</div>

---

# Promemoria

![height:400px](screen-promemoria.png)

<div class="two-col" style="margin-top:.2rem">
<div>

Pianificazione automatica da terapie attive. Fasce orarie configurabili: mattina, pomeriggio, sera, notte. Stati: da eseguire, eseguito, posticipato, saltato.

</div>
<div>

<span class="badge badge-green">Web Push API</span> su browser compatibili
&nbsp;
<span class="badge">Test</span> integrato in Impostazioni
&nbsp;
<span class="badge badge-amber">Fallback</span> agenda locale sempre disponibile

</div>
</div>

---

# Audit

![height:400px](screen-audit.png)

<div style="margin-top:.2rem">

<span class="badge">Filtri</span> operatore, ospite, farmaco, terapia, azione, entità, data
&nbsp;
<span class="badge badge-green">Export</span> JSON e PDF
&nbsp;
<span class="badge">Dettaglio</span> JSON completo di ogni evento

</div>

---

# Sicurezza

<div class="two-col">
<div class="card">

### Autenticazione

Table-Auth: token di sessione condiviso via `sync_files`. Password policy: 10+ caratteri, maiuscola, minuscola, numero, simbolo. Rate limiting su endpoint Supabase. Session TTL configurabile.

</div>
<div class="card">

### Row Level Security

RLS su ogni tabella Supabase. `anon key`: sola lettura per bootstrap. `authenticated`: CRUD via RPC functions. 8 migration SQL versionate nel repository.

</div>
</div>

<div style="margin-top:.8rem;text-align:center">
<span class="badge badge-green">GDPR-ready</span> &nbsp; dati sanitari solo sul dispositivo locale
</div>

---

# PWA — offline first

<div class="two-col">
<div>

Service Worker per caching automatico. IndexedDB (Dexie) come database locale. Installabile su home screen Android e desktop. Manifest con nome, icone, orientamento. Chunk-load error recovery dopo deploy.

</div>
<div class="card">

> In una residenza la connettività non è garantita. L'app deve funzionare sempre, anche senza rete.

Nessuna interruzione durante la visita ai pazienti. Sync automatico quando torna la connessione. Nessuna perdita dati: tutto salvato localmente prima del sync.

</div>
</div>

---

# Sincronizzazione

| Componente | Ruolo |
|---|---|
| `sync.js` | Orchestratore: `fullSync()` con merge snapshot-based |
| `syncBackend.js` | Selettore runtime: Supabase o GitHub Gist (legacy) |
| `supabaseSync.js` | Upload/download via RPC |
| `syncCompress.js` | Compressione gzip con `pako` (~80% riduzione) |
| `useSyncState.js` | Stato reattivo: SYNCED / PENDING / CONFLICT / ERROR / OFFLINE |

<div class="two-col" style="margin-top:.6rem">
<div class="card">

### Cosa viene sincronizzato
Ospiti, farmaci, terapie, movimenti, confezioni, promemoria, residenze, profili utente, impostazioni.

</div>
<div class="card">

### Conflitti
Rilevamento automatico per campo. Scelta manuale: mantieni locale o accetta remoto. Tracciamento in `activityLog`.

</div>
</div>

---

# Keep-alive e automazione

<div class="two-col">
<div class="card">

### GitHub Actions

Cron ogni domenica e giovedì a mezzanotte UTC. Ping REST API Supabase: `SELECT name FROM sync_files LIMIT 1`. Previene la pausa per inattività del free tier (7 giorni).

</div>
<div class="card">

### Client-side

Servizio `keepAlive.js` nell'app. Check ogni 6 ore: se DB inattivo da 6+ giorni, esegue un ping leggero. Toggle on/off nelle Impostazioni.

</div>
</div>

<div style="margin-top:.8rem;text-align:center">
<span class="badge badge-green">Ridondanza</span> &nbsp; due meccanismi indipendenti
</div>

---

# Stack tecnologico

<div class="two-col">
<div>

| Layer | Tecnologia |
|---|---|
| Framework | Vue 3 (Composition API) |
| Build | Vite 5 |
| Routing | Vue Router 4 (hash) |
| State | IndexedDB via Dexie.js |
| UI | CSS custom |
| PWA | vite-plugin-pwa + Workbox |

</div>
<div>

| Layer | Tecnologia |
|---|---|
| Database | Supabase PostgreSQL |
| Auth | Table-auth + RLS |
| Sync | RPC + gzip + snapshot |
| Hosting | GitHub Pages |
| CI | GitHub Actions |
| Test | Vitest + Playwright |

</div>
</div>

---

# Copertura test

<div class="kpi-row">
  <div class="kpi"><div class="kpi-num">72</div><div class="kpi-label">Unit test</div></div>
  <div class="kpi"><div class="kpi-num">29</div><div class="kpi-label">E2E</div></div>
  <div class="kpi"><div class="kpi-num">41</div><div class="kpi-label">CRUD + detection</div></div>
</div>

<div class="two-col" style="margin-top:.8rem">
<div class="card">

### Unit test (Vitest)

Servizi: `auth`, `sync`, `terapie`, `farmaci`, `promemoria`. Modelli: validazione form, KPI, reporting. Utility: `formatDate`, `buildOperationalReport`, CSV import.

</div>
<div class="card">

### E2E (Playwright)

Flussi CRUD completi per ogni entità. Multi-browser: Chromium, Firefox, WebKit. Fixture CSV realistici: 30 ospiti, 30 farmaci. Test online sync con Supabase.

</div>
</div>

---

# Roadmap

| Priorità | Feature | Stato |
|---|---|---|
| Alta | Notifiche push Web API | In corso |
| Alta | Import CSV multi-sorgente | Completato |
| Media | Dashboard analytics avanzate | Pianificato |
| Media | Multi-residenza con switch | Completato |
| Bassa | Integrazione stampante termica | Ideazione |
| Bassa | App nativa Android (Capacitor) | Valutazione |
| Tech | Supabase branches per staging | Completato |
| Tech | Keep-alive automatizzato | Completato |

---

# Perché MediTrace

<div class="two-col">
<div class="card">

### Per le residenze

Riduce gli errori di somministrazione. Traccia le scorte in tempo reale. Semplifica la turnazione degli operatori. Garantisce tracciabilità completa. Nessun costo di infrastruttura server.

</div>
<div class="card">

### Per chi sviluppa

Open source su GitHub. Stack moderno e manutenibile. 83% test coverage tra unit e E2E. Deploy automatico su GitHub Pages. Documentazione completa in `docs/`.

</div>
</div>

<div style="margin-top:1.2rem;text-align:center;font-size:.85rem">
<strong>github.com/vgrazian/MediTrace</strong>
</div>

---

# Domande?

<div style="text-align:center;margin-top:4rem">

### MediTrace
**Gestione farmaci per le Residenze della Comunità di Sant'Egidio**

<br/>

<span style="font-size:.9rem;color:var(--muted)">
PWA  ·  Offline-first  ·  Sync multi-dispositivo  ·  Supabase  ·  Open source
</span>

<br/><br/>

<span class="badge badge-green">Luglio 2026</span>
&nbsp;
<span class="badge">72 test</span>
&nbsp;
<span class="badge badge-amber">29 E2E</span>

</div>
