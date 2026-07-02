---
marp: true
theme: uncover
class:
  - lead
paginate: true
size: 16:9
footer: ''
style: |
  @import url('https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,400;6..72,500&family=Inter:wght@300;400;500&display=swap');

  section {
    font-family: 'Inter', -apple-system, sans-serif;
    color: #2f3437;
    background: #ffffff;
    padding: 4rem 5rem;
    font-size: .82rem;
    line-height: 1.7;
  }

  section.lead {
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 4rem 6rem;
  }

  section.lead h1 {
    font-family: 'Newsreader', Georgia, serif;
    font-size: 2rem;
    font-weight: 400;
    letter-spacing: -0.03em;
    line-height: 1.2;
    margin: 0;
  }

  section.lead p {
    font-family: 'Inter', sans-serif;
    font-size: .85rem;
    font-weight: 400;
    color: #787774;
    margin: .5rem 0 0 0;
  }

  section h1 {
    font-family: 'Newsreader', Georgia, serif;
    font-size: 1.35rem;
    font-weight: 400;
    letter-spacing: -0.02em;
    margin: 0 0 1.5rem 0;
  }

  section p {
    font-size: .82rem;
    color: #787774;
    margin: 0 0 .5rem 0;
  }

  section img {
    border-radius: 4px;
    border: 1px solid #eaeaea;
  }

  section table {
    width: 100%;
    border-collapse: collapse;
    font-size: .78rem;
  }
  section th {
    background: #f9f9f8;
    font-weight: 500;
    padding: .3rem .5rem;
    border-bottom: 1px solid #eaeaea;
    text-align: left;
    font-size: .7rem;
    text-transform: uppercase;
    letter-spacing: .04em;
    color: #787774;
  }
  section td {
    padding: .25rem .5rem;
    border-bottom: 1px solid #f2f2f2;
    color: #787774;
    font-size: .78rem;
  }

  section code {
    background: #f7f6f3;
    padding: .1rem .3rem;
    border-radius: 3px;
    font-size: .75rem;
    font-family: 'SF Mono', 'JetBrains Mono', monospace;
  }

  section .row {
    display: flex;
    gap: 2rem;
    margin-top: .5rem;
  }
  section .col {
    flex: 1;
  }

  section .label {
    font-size: .65rem;
    text-transform: uppercase;
    letter-spacing: .06em;
    color: #b0b0b0;
    margin-bottom: .15rem;
  }

  section .quiet {
    color: #b0b0b0;
    font-size: .75rem;
  }

  section::after {
    font-size: .55rem;
    color: #d4d4d2;
  }
---

# MediTrace
Gestione farmaci per le Residenze della Comunità di Sant'Egidio

<p>Presentazione tecnica  ·  Luglio 2026</p>

---

![height:480px](screen-cruscotto.png)

# Cruscotto

KPI del turno, alert scorte critiche, promemoria in scadenza, stato sincronizzazione.

---

![height:480px](screen-ospiti.png)

# Ospiti

Anagrafica completa, assegnazione stanza e letto, collegamento diretto alle terapie. Ricerca avanzata con pannello filtri. Soft-delete con undo.

---

![height:480px](screen-farmaci.png)

# Catalogo farmaci

Nome commerciale, principio attivo, classe terapeutica. Scorta minima e soglia autonomia. Confezioni multiple con lotto, dosaggio, scadenza.

---

![height:480px](screen-scorte.png)

# Scorte e report

Report operativo con KPI, consumo settimanale, copertura, trend 6 mesi. Alert su farmaci sotto soglia. Export PDF e CSV.

---

![height:480px](screen-movimenti.png)

# Movimenti

Carico e scarico scorte. Ogni movimento aggancia ospite, terapia e confezione. Aggiornamento automatico quantità. Ricerca per tipo, data, ospite, farmaco.

---

![height:480px](screen-terapie.png)

# Terapie

Dose, frequenza, 6 orari di somministrazione al giorno. Data inizio e fine. Vista per ospite con tutte le terapie attive.

---

![height:480px](screen-promemoria.png)

# Promemoria

Pianificazione automatica da terapie attive. Fasce orarie configurabili. Stati: da eseguire, eseguito, posticipato, saltato. Web Push API.

---

![height:480px](screen-audit.png)

# Audit

Registro completo operazioni. Filtri per operatore, entità, azione, data. Export JSON e PDF. Dettaglio JSON di ogni evento.

---

# Architettura

![height:460px](architecture.png)

---

# Sincronizzazione

![height:460px](dataflow.png)

---

# Sicurezza

<div class="row">
<div class="col">

**Autenticazione**  
Table-auth con token di sessione. Password policy: 10+ caratteri, maiuscola, minuscola, numero, simbolo. Session TTL configurabile.

</div>
<div class="col">

**Row Level Security**  
RLS su ogni tabella Supabase. `anon key` per bootstrap. CRUD via RPC functions autenticate. 8 migration SQL versionate.

</div>
</div>

<p style="margin-top:1rem">Dati sanitari solo sul dispositivo locale. GDPR-ready.</p>

---

# PWA offline‑first

Service Worker per caching. IndexedDB via Dexie. Installabile su home screen. Funziona senza connessione — sync automatico quando la rete torna.

---

# Keep‑alive e CI

<div class="row">
<div class="col">

**GitHub Actions**  
Cron domenica e giovedì. Ping REST API Supabase. Previene pausa free tier dopo 7 giorni di inattività.

</div>
<div class="col">

**Client‑side**  
`keepAlive.js`: check ogni 6 ore. Se DB inattivo da 6+ giorni, ping leggero. Toggle nelle Impostazioni.

</div>
</div>

---

# Stack

<div class="row">
<div class="col">

| | |
|---|---|
| Framework | Vue 3 |
| Build | Vite 5 |
| Routing | Vue Router 4 |
| Database | IndexedDB / Dexie |
| PWA | Workbox |

</div>
<div class="col">

| | |
|---|---|
| Backend | Supabase PostgreSQL |
| Auth | Table-auth + RLS |
| Hosting | GitHub Pages |
| CI | GitHub Actions |
| Test | Vitest + Playwright |

</div>
</div>

---

# Test

<div class="row">
<div class="col">

<p class="label">Unit</p>
72 test — servizi, modelli, validazione form, KPI, reporting.

<p class="label" style="margin-top:1rem">E2E</p>
29 test — flussi CRUD, multi‑browser, fixture CSV, sync online.

</div>
<div class="col">

<p class="label">Copertura</p>
83% tra unit e E2E. 41 test CRUD + duplicate detection. Fixture: 30 ospiti, 30 farmaci.

</div>
</div>

---

# Roadmap

| | |
|---|---|
| Notifiche push Web API | In corso |
| Import CSV multi‑sorgente | Completato |
| Dashboard analytics avanzate | Pianificato |
| Multi‑residenza con switch | Completato |
| App nativa Android (Capacitor) | Valutazione |
| Keep‑alive automatizzato | Completato |

---

# Perché MediTrace

<div class="row">
<div class="col">

**Per le residenze**  
Riduce errori di somministrazione. Traccia scorte in tempo reale. Semplifica la turnazione. Tracciabilità completa. Nessun costo server.

</div>
<div class="col">

**Per chi sviluppa**  
Open source. Stack moderno. 83% test coverage. Deploy automatico su GitHub Pages. Documentazione in `docs/`.

</div>
</div>

<p style="margin-top:2rem;text-align:center">github.com/vgrazian/MediTrace</p>

---

# Domande?

<div style="text-align:center;margin-top:5rem">

### MediTrace
Gestione farmaci per le Residenze della Comunità di Sant'Egidio

<span class="quiet">
PWA  ·  Offline‑first  ·  Sync multi‑dispositivo  ·  Supabase  ·  Open source
</span>

</div>
