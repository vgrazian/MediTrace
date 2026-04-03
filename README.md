# MediTrace

MediTrace e' un progetto offline-first per tracciare farmaci, terapie e scorte in contesto socio-sanitario, con supporto multi-dispositivo e sincronizzazione cloud personale.

## Architettura corrente (v1 approved)

- frontend: PWA Vue.js + Vite
- storage locale: IndexedDB (Dexie.js)
- autenticazione: GitHub Personal Access Token (scope `gists`)
- sync cloud: GitHub Gist privato (snapshot JSON)
- hosting: GitHub Pages

## Obiettivi della prima fase

- registrare i farmaci disponibili e assegnati ai pazienti
- rendere immediato l'inserimento dati anche senza rete (offline-first)
- sincronizzare appena disponibile una connessione
- evidenziare scorte basse e necessita' di riordino
- notificare/promuovere il completamento promemoria di somministrazione per paziente
- consentire all'operatore di aggiornare posologia e terapia con sync remoto
- mantenere log operativo sincronizzabile per audit
- garantire una UI flessibile per telefoni e tablet con dimensioni diverse
- garantire backup dati e procedura di ripristino semplice
- consentire aggiornamenti applicativi controllati senza perdita dati locali
- mantenere costi e complessita' operativa minimi

## Vincoli di piattaforma

- l'app deve funzionare su smartphone e tablet economici
- UX e prestazioni devono restare stabili anche su device entry-level
- la UI deve adattarsi a schermi piccoli (telefono) e grandi (tablet)

## Struttura del repository

- `docs/architecture.md`: architettura tecnica corrente (Option A)
- `docs/decisione-v1-approved.md`: freeze scope e decisione tecnica approvata
- `docs/checklist-esecutiva.md`: checklist operativa MVP
- `docs/week1-execution-checklist-owner-ready.md`: avanzamento dettagliato Week 1
- `docs/schema-json-mapping-v1.md`: mapping CSV/Excel -> dataset JSON
- `docs/domain-model.md`: modello dati applicativo
- `docs/roadmap.md`: roadmap ed evolutive priorizzate
- `docs/archive/`: documenti legacy superseded
- `pwa/`: applicazione Vue/Vite/PWA
- `prototype/`: prototipo statico storico

## Avvio rapido PWA (sviluppo)

1. Installare dipendenze:

 ```bash
 npm --prefix pwa install
 ```

1. Avviare in locale:

 ```bash
 npm --prefix pwa run dev
 ```

1. Aprire l'URL mostrato (default `http://localhost:5173/`).

2. Inserire un GitHub PAT con permesso `gists` e completare il primo bootstrap remoto.

## Build produzione

```bash
npm --prefix pwa run build
npm --prefix pwa run preview
```

## Sicurezza operativa

- Non committare token, credenziali o file `.env` con segreti.
- Usare PAT dedicato al progetto, ruotarlo periodicamente e revocarlo in caso di esposizione.
- Per policy dettagliate consultare `docs/security-secrets-policy.md`.

## Stato progetto

- Week 1: chiusa (setup, bootstrap, smoke test, install test).
- Week 2+: in corso flussi MVP, resilienza sync e quality gates.
