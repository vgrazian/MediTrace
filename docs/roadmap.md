# Roadmap Iniziale

## Fase 0 - Fondazione

- definire modello dati condiviso
- definire naming stabile delle tabelle Google Sheets
- tradurre l'Excel corrente in fogli normalizzati
- creare repository GitHub MediTrace
- inizializzare progetto Android
- fissare `minSdk` e test plan su tablet Android Go (11-13)

## Fase 1 - MVP operativo

- schermata farmaci
- schermata giacenze
- registrazione movimenti
- scheda terapia attiva per ospite con iniziali
- agenda promemoria farmaci per paziente
- registrazione esito somministrazione
- modifica posologia e terapia da parte operatore
- alert riordino
- sync push/pull basilare
- verifica prestazioni su hardware entry-level (avvio, scrolling liste, sync)
- layout responsive verificato su telefono e tablet
- prima procedura di backup manuale e test restore

## Fase 2 - Robustezza

- log sincronizzazione leggibile
- log operativo centralizzato su Sheet (audit modifiche e azioni operatore)
- gestione conflitti
- backup e ripristino
- ruoli utente minimi
- pipeline rilascio aggiornamenti con migrazioni schema testate
- checklist regressione UI multi-form-factor per ogni release

## Fase 3 - Efficienza operativa

- suggerimento ordini automatici
- storico consumi per farmaco
- vista per paziente in cura
- esportazione report

## Decisioni da chiudere subito

1. Un solo dispositivo principale o piu' dispositivi Android.
2. Livello di dettaglio dei dati paziente da conservare nell'app.
3. Processo reale di approvvigionamento da riflettere nel modulo ordini.
4. Politica di backup dei dati Google.
5. Gestione di gocce, flaconi e unita' non in compresse nel calcolo del consumo.
6. Modello/i di tablet economico da usare come riferimento per i test reali.
7. Finestra temporale dei promemoria (anticipo, ritardo ammesso, escalation).
8. Livello di dettaglio dei dati da salvare nel log operativo centralizzato.
9. Canale di aggiornamento app (Play privata, MDM, sideload controllato).
10. Frequenza backup e responsabilita' operativa del restore.
