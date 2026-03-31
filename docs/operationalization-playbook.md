# MediTrace Operationalization Playbook

Data: 2026-03-31
Ambito: stabilizzazione operativa dopo rilascio PWA + sync Google Drive + deploy GitHub Pages

## Obiettivo

Passare da implementazione funzionante a esercizio operativo ripetibile e controllato:

- test automatici frontend e sync affidabili
- segreti e configurazioni OAuth gestiti correttamente
- policy di merge protette
- evidenze di rilascio tracciabili

## Prerequisiti

- Deploy GitHub Pages attivo e accessibile.
- Progetto Google Cloud configurato per OAuth browser.
- Google Drive API abilitata.
- Workflow GitHub presente per build e smoke test PWA.

## Fase 1: Attivazione CI Build + Smoke

1. Aprire GitHub repository settings.
2. Andare su Secrets and variables > Actions.
3. Configurare le variabili e i secrets repository necessari al deploy.
4. Lanciare workflow manuale build + smoke test PWA.
5. Verificare esito positivo su build, lint e smoke di bootstrap app.
6. Lanciare smoke test multi-device simulato, se disponibile.
7. Documentare chiaramente eventuali precondizioni OAuth per gli ambienti di test.

Criterio di uscita:

- build green
- smoke green
- deploy preview raggiungibile

## Fase 2: Igiene Segreti e Configurazioni OAuth

1. Verificare i redirect URI configurati per `localhost`, preview e produzione.
2. Verificare utenti autorizzati nel consent screen se l'app e' in test mode.
3. Aggiornare le configurazioni ambiente in GitHub se cambiano client ID o URL.
4. Rieseguire smoke build e bootstrap login.
5. Revocare configurazioni obsolete non piu' usate.

Nota:

- non committare mai credenziali reali nei file del repository.
- mantenere i valori sensibili solo in secret store e password manager.

## Fase 3: Protezione Branch Main

1. Abilitare branch protection su main.
2. Richiedere status check obbligatorio prima del merge.
3. Impostare come required check il workflow build/smoke.
4. Abilitare blocco merge in caso di check non riusciti.
5. Opzionale consigliato: richiedere almeno 1 review umana.

Criterio di uscita:

- nessuna PR puo' essere mergiata su main con build o smoke rosso.

## Fase 4: Allineamento Deploy E Sync

1. Verificare differenze tra documentazione e implementazione PWA reale.
2. Confermare che il bootstrap crei correttamente `manifest` e `data` in `appDataFolder`.
3. Confermare che il resume dell'app scarichi un dataset remoto piu' recente.
4. Rieseguire smoke e aggiornare evidenze.

Criterio di uscita:

- documentazione e comportamento runtime allineati.

## Fase 5: Rilascio Operativo

Checklist minima pre-rilascio:

- build green
- smoke multi-device green oppure rischio documentato
- configurazioni OAuth confermate
- branch protection attiva
- documentazione architetturale aggiornata
- evidenze test archiviate in docs

Checklist post-rilascio (24-72h):

- monitorare errori login, token e Drive API nei log client
- verificare che almeno due dispositivi leggano lo stesso dataset remoto
- controllare conflitti o retry anomali in sync

## Evidenze consigliate da conservare

- screenshot esecuzioni workflow GitHub
- timestamp aggiornamento configurazioni OAuth
- conferma branch protection
- link commit/documenti aggiornati

## RACI sintetico

- Owner prodotto: approvazione go/no-go
- Responsabile tecnico: configurazioni GitHub e policy branch
- Operazioni: gestione Google Cloud, segreti e accessi
- QA/validazione: esecuzione smoke e raccolta evidenze

## Frequenza operativa consigliata

- Build + smoke bootstrap: giornaliero (schedulato)
- Smoke multi-device: ad ogni rilascio e dopo cambi al motore sync
- Review configurazioni OAuth: almeno trimestrale o immediata in caso di incidente
