# Roadmap v2

## Fase 0 - Fondazione

- definire modello dati condiviso in JSON
- definire schema IndexedDB e naming stabile degli identificativi
- tradurre l'Excel corrente in entita' normalizzate per dataset locale/remoto
- creare repository GitHub MediTrace
- inizializzare progetto Vue.js + Vite + plugin PWA
- configurare OAuth Google e accesso Drive `appDataFolder`
- definire strategia sync e merge multi-dispositivo

## Fase 1 - MVP operativo

- schermata farmaci e confezioni con scadenze
- schermata giacenze con warning su residuo < consumo settimanale
- registrazione movimenti di carico/scarico
- scheda terapia attiva per ospite con iniziali o codice interno
- agenda promemoria farmaci per paziente
- registrazione esito somministrazione
- modifica terapia e posologia
- sync upload/download basilare tramite Drive
- installazione PWA su smartphone e desktop
- verifica prestazioni iniziali su telefono Android, tablet Android e browser desktop
- prima procedura di backup JSON manuale e test restore

## Fase 2 - Robustezza

- log sincronizzazione locale leggibile per dispositivo
- gestione conflitti con merge e schermata di risoluzione minima
- backup e ripristino con validazione `schemaVersion`
- cifratura opzionale export locale
- pipeline deploy GitHub Pages con smoke test PWA
- checklist regressione offline/sync multi-form-factor per ogni release

## Fase 3 - Efficienza operativa

- suggerimento ordini automatici
- storico consumi per farmaco
- vista per paziente in cura
- esportazione report
- cifratura client-side end-to-end del dataset remoto, se richiesta

## Evolutive Candidate (Post-MVP) con impatto pianificazione

### E1 - Ruoli e permessi operatore (RBAC leggero)

- valore: riduce errori operativi e accessi non coerenti
- impatto: ALTO (tocca UI, audit, regole di modifica)
- effort stimato: M/L
- pianificazione specifica: SI (richiede matrice permessi e test regressione)

### E2 - Notifiche push promemoria (Web Push)

- valore: migliora aderenza ai turni e puntualita' somministrazioni
- impatto: ALTO (service worker, permessi browser, UX fallback)
- effort stimato: M
- pianificazione specifica: SI (dipendenze browser/device e policy notifiche)

### E3 - Risoluzione conflitti guidata su campi critici

- valore: riduce rischio clinico in modifiche concorrenti
- impatto: ALTO (motore merge + UI compare/resolve)
- effort stimato: M/L
- pianificazione specifica: SI (definizione policy e flussi di escalation)

### E4 - Import guidato CSV/Excel con validazione e report errori

- valore: onboarding iniziale rapido e pulizia dati legacy
- impatto: MEDIO/ALTO
- effort stimato: M
- pianificazione specifica: SI (regole mapping, error handling, rollback import)

### E5 - Reportistica operativa (consumi, scorte, aderenza)

- valore: supporto decisionale per riordini e pianificazione turni
- impatto: MEDIO
- effort stimato: M
- pianificazione specifica: PARZIALE (serve definire KPI e periodicita')

### E6 - Hardening sicurezza token e sessione

- valore: riduce superficie di rischio PAT/client
- impatto: MEDIO
- effort stimato: S/M
- pianificazione specifica: SI (policy rotazione, scadenza, revoca e handling errori)

### E7 - Cifratura client-side del dataset remoto

- valore: massimizza riservatezza dati anche su storage cloud personale
- impatto: ALTO
- effort stimato: L
- pianificazione specifica: SI (key management, recovery, UX emergenza)

### E8 - Pacchetto affidabilita' rilascio (smoke test automatici + rollback)

- valore: riduce regressioni su sync/offline/installabilita'
- impatto: MEDIO
- effort stimato: S/M
- pianificazione specifica: PARZIALE (pipeline CI/CD e gate quality)

## Priorita' raccomandata (dopo MVP)

1. E3 Risoluzione conflitti guidata
2. E4 Import guidato CSV/Excel
3. E8 Pacchetto affidabilita' rilascio
4. E2 Notifiche push promemoria
5. E6 Hardening sicurezza token/sessione
6. E5 Reportistica operativa
7. E1 Ruoli e permessi operatore
8. E7 Cifratura client-side end-to-end

## Decisioni da chiudere subito

1. Quanti dispositivi reali devono poter lavorare sullo stesso dataset nella fase MVP.
2. Livello di dettaglio dei dati ospite da conservare nel file remoto.
3. Processo reale di approvvigionamento da riflettere nel modulo ordini.
4. Politica di backup manuale oltre alla copia su Drive.
5. Gestione di gocce, flaconi e unita' non in compresse nel calcolo del consumo.
6. Browser/dispositivi di riferimento per i test reali.
7. Finestra temporale dei promemoria e comportamento offline in caso di ritardi.
8. Regole di merge in caso di modifica concorrente della stessa terapia.
9. Livello privacy richiesto per eventuale cifratura client-side.
10. Frequenza backup e responsabilita' operativa del restore.
