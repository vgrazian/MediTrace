# Week 1 Execution Checklist (Owner-Ready)

Data: 2026-03-31
Fonte: `docs/checklist-esecutiva.md` (Fase 1 - Settimana 1)
Orizzonte: 5 giorni lavorativi

## Ruoli consigliati

- `PM`: coordinamento e avanzamento daily
- `Frontend-Lead`: bootstrap PWA e shell applicativa
- `Data-Owner`: modello dati, mapping Excel, validazioni dataset
- `Auth-Lead`: GitHub PAT + Gist API
- `QA-Ops`: test evidenze e gate sicurezza base

## Piano operativo (giorno per giorno)

| ID | Task | Owner | Giorno target | Dipendenze | Evidenza richiesta | Stato |
| --- | --- | --- | --- | --- | --- | --- |
| W1-01 | Kickoff operativo + assegnazione owner nominali | PM | D1 mattina | nessuna | Verbale kickoff in repo/wiki | DONE — kickoff operativo eseguito, owner attivi sulle task W1 |
| W1-02 | Verifica scope congelato v1 e freeze cambi | PM | D1 mattina | W1-01 | Link a `docs/decisione-v1-approved.md` | DONE — freeze scope v1 confermato in `docs/decisione-v1-approved.md` |
| W1-03 | Configurare progetto Google Cloud STAGING e Drive API | Auth-Lead | D1 | W1-01 | Screenshot API abilitate + OAuth client creato | BLOCCATO — SUPERSEDED da scelta GitHub PAT + Gist |
| W1-04 | Configurare consent screen e utenti autorizzati | Auth-Lead | D1 | W1-03 | Screenshot configurazione + test user list | BLOCCATO — SUPERSEDED da scelta GitHub PAT + Gist |
| W1-05 | Definire schema JSON e mapping Excel -> dataset | Data-Owner | D1 | W1-02 | Documento schema o ADR breve | DONE — baseline definita in `docs/schema-json-mapping-v1.md` |
| W1-06 | Bootstrap progetto Vue 3 + Vite | Frontend-Lead | D2 mattina | W1-02 | Commit scaffold + avvio locale | DONE — `pwa/` scaffold 2026-03-31 |
| W1-07 | Configurare plugin PWA + manifest installabile | Frontend-Lead | D2 | W1-06 | Screenshot install prompt o manifest valido | DONE — `vite.config.js` + `vite-plugin-pwa` |
| W1-08 | Integrare Dexie e store locali base | Frontend-Lead | D2 | W1-06 | Commit schema IndexedDB + test bootstrap | DONE — `src/db/index.js` schema v1 |
| W1-09 | Implementare login browser con GitHub PAT | Auth-Lead | D3 | W1-06 | Login riuscito con account autorizzato | DONE — login confermato (`@vgrazian`) |
| W1-10 | Implementare accesso storage remoto (Gist) e create/list file | Auth-Lead | D3 | W1-09 | Log API + file creati in ambiente test | DONE — Gist creato e accessibile |
| W1-11 | Implementare bootstrap `meditrace-manifest.json` | Frontend-Lead | D4 | W1-08, W1-10 | Commit + verifica contenuto file remoto | DONE — bootstrap completato nel Gist `76793e4ea227...` |
| W1-12 | Implementare bootstrap `meditrace-data.json` | Frontend-Lead | D4 | W1-08, W1-10 | Commit + verifica contenuto file remoto | DONE — bootstrap completato nel Gist `76793e4ea227...` |
| W1-13 | Smoke test end-to-end bootstrap PWA + login + Gist | QA-Ops | D5 mattina | W1-09..W1-12 | Test report con esito login/create/read | DONE — PASS (user=vgrazian, gistId=76793e4ea227f20fa45c879d133192f8, manifest/data datasetVersion=0) |
| W1-14 | Test installazione su telefono o tablet e browser desktop | QA-Ops | D5 | W1-07, W1-13 | Screenshot installazione + cold start | DONE — test da telefono confermato OK; desktop prerequisiti installabilità PASS (`/manifest.webmanifest`, `/sw.js`, icone 192/512 = 200) |
| W1-15 | Review di chiusura Week 1 e blocchi Week 2 | PM | D5 pomeriggio | W1-13, W1-14 | Note review + backlog aggiornato | DONE — Week 1 chiusa; backlog Week 2 aggiornato con priorita' evolutive: E3, E4, E8, E2, E6 |

## Definition of Done Week 1

Per chiudere settimana 1 come `DONE`:

1. Tutti i task W1-01..W1-15 in stato `DONE` o con blocker esplicito.
2. Login con GitHub PAT e accesso Gist funzionano con test manuali ripetibili.
3. Security base attiva (token dedicato, accessi verificati, nessun segreto in repo).
4. Struttura PWA iniziale creata e compilabile localmente.

## Esito Review W1-15

- Week 1 chiusa con baseline tecnica funzionante: PWA installabile, auth GitHub PAT, sync su Gist, smoke test PASS.
- Task superseded formalizzati: W1-03 e W1-04 (Google Cloud/Drive) non applicabili dopo adozione Option A.
- Input per Week 2 recepito dal roadmap evolutive: priorita' operativa E3 -> E4 -> E8 -> E2 -> E6.
- Blocco aperto da monitorare: rotazione periodica PAT e hardening gestione token lato client.

## Riti operativi

- Daily 15 minuti: 09:00, owner aggiornano stato e blocchi.
- Sync tecnico: martedi e giovedi.
- Review stakeholder: venerdi 16:00.

## Tracciamento rapido

Usare questo blocco nel daily:

```text
Task ID:
Owner:
Stato: TODO | IN CORSO | BLOCCATO | DONE
Prossimo passo:
Blocco:
Evidenza link:
```

## Checklist Avvio Prossima Sessione (Week 2) - Copy/Paste

### 1) Setup locale e avvio applicazione

```bash
cd /Users/valer/dev/medi-trace
git checkout main
git pull origin main
npm --prefix pwa install
npm --prefix pwa run dev
```

### 2) Aprire backlog Week 2 (milestone + issue prioritarie)

```text
Milestone: https://github.com/vgrazian/MediTrace/milestone/1
E3: https://github.com/vgrazian/MediTrace/issues/1
E4: https://github.com/vgrazian/MediTrace/issues/2
E8: https://github.com/vgrazian/MediTrace/issues/3
```

### 3) Creare branch di lavoro per E3 (prima priorita')

```bash
cd /Users/valer/dev/medi-trace
git checkout -b feat/e3-conflict-resolution
```

### 4) Scope tecnico minimo E3 (sessione corrente)

```text
- Estendere merge engine in pwa/src/services/sync.js
- Restituire payload conflitti strutturato su campi critici
- Aggiungere UI minima compare/resolve in pwa/src/views/ImpostazioniView.vue (o view dedicata)
- Salvare esito risoluzione in activityLog
```

### 5) Comandi di controllo durante sviluppo

```bash
cd /Users/valer/dev/medi-trace
npm --prefix pwa run build
git status --short
```

### 6) Chiusura sessione e handoff

```bash
cd /Users/valer/dev/medi-trace
git add pwa docs
git commit -m "feat(e3): guided conflict resolution baseline"
git push -u origin feat/e3-conflict-resolution
```

Checklist handoff (compilare prima di chiudere):

- [ ] build PWA verde
- [ ] issue E3 aggiornata con note/test svolti
- [ ] eventuali blocker annotati su issue E3
- [ ] prossima azione esplicita per ripartenza sessione
