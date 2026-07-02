% MediTrace
% Gestione farmaci per le Residenze della Comunità di Sant'Egidio
% Luglio 2026

---

# Cruscotto

![](screen-cruscotto.png)

KPI del turno, alert scorte critiche, promemoria in scadenza, stato sincronizzazione.

---

# Ospiti

![](screen-ospiti.png)

Anagrafica completa, assegnazione stanza e letto, collegamento diretto alle terapie. Ricerca avanzata con pannello filtri. Soft-delete con undo.

---

# Catalogo farmaci

![](screen-farmaci.png)

Nome commerciale, principio attivo, classe terapeutica. Scorta minima e soglia autonomia. Confezioni multiple con lotto, dosaggio, scadenza.

---

# Scorte e report

![](screen-scorte.png)

Report operativo con KPI, consumo settimanale, copertura, trend 6 mesi. Alert su farmaci sotto soglia. Export PDF e CSV.

---

# Movimenti

![](screen-movimenti.png)

Carico e scarico scorte. Ogni movimento aggancia ospite, terapia e confezione. Aggiornamento automatico quantità. Ricerca per tipo, data, ospite, farmaco.

---

# Terapie

![](screen-terapie.png)

Dose, frequenza, 6 orari di somministrazione al giorno. Data inizio e fine. Vista per ospite con tutte le terapie attive.

---

# Promemoria

![](screen-promemoria.png)

Pianificazione automatica da terapie attive. Fasce orarie configurabili. Stati: da eseguire, eseguito, posticipato, saltato. Web Push API.

---

# Audit

![](screen-audit.png)

Registro completo operazioni. Filtri per operatore, entità, azione, data. Export JSON e PDF. Dettaglio JSON di ogni evento.

---

# Architettura del sistema

![](architecture.png)

---

# Sincronizzazione

![](dataflow.png)

---

# Sicurezza

- Autenticazione: table-auth con token di sessione, password policy, session TTL
- Row Level Security su ogni tabella Supabase
- anon key per bootstrap, CRUD via RPC functions autenticate
- 8 migration SQL versionate
- Dati sanitari solo su dispositivo locale (GDPR-ready)

---

# PWA offline-first

- Service Worker per caching automatico
- IndexedDB via Dexie — database locale completo
- Installabile su home screen Android e desktop
- Funziona senza connessione, sync quando la rete torna

---

# Keep-alive e automazione

- GitHub Actions: cron domenica e giovedì, ping REST API Supabase
- Client-side: keepAlive.js, check ogni 6 ore
- Previene pausa free tier dopo 7 giorni di inattività

---

# Stack tecnologico

- Frontend: Vue 3, Vite 5, Vue Router 4, IndexedDB/Dexie, Workbox PWA
- Backend: Supabase PostgreSQL, table-auth + RLS, RPC functions
- DevOps: GitHub Pages, GitHub Actions, Vitest + Playwright

---

# Test

- 72 unit test: servizi, modelli, validazione form, KPI, reporting
- 29 E2E: flussi CRUD, multi-browser, fixture CSV, sync online
- 83% coverage totale, 41 test CRUD + duplicate detection

---

# Roadmap

- Notifiche push Web API — in corso
- Import CSV multi-sorgente — completato
- Dashboard analytics avanzate — pianificato
- Multi-residenza con switch — completato
- App nativa Android (Capacitor) — valutazione
- Keep-alive automatizzato — completato

---

# Perché MediTrace

- Riduce errori di somministrazione
- Traccia scorte in tempo reale
- Semplifica la turnazione degli operatori
- Tracciabilità completa, nessun costo server
- Open source — github.com/vgrazian/MediTrace
