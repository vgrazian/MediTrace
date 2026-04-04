# Architettura v2 - PWA multi-dispositivo

## Visione d'insieme

MediTrace adotta un'architettura offline-first basata su web app installabile. La UI gira come PWA pubblicata su GitHub Pages; ogni dispositivo salva subito i dati in IndexedDB e sincronizza una copia condivisa del dataset in un Gist GitHub privato dell'utente autenticato.

Questa scelta sostituisce il precedente disegno Android + Apps Script + Google Sheets per allinearsi ai requisiti tecnici correnti:

- accesso da piu' dispositivi con lo stesso account GitHub
- accesso operatore con utenza/password gestita dall'app
- nessun server intermedio che legga i dati clinico-operativi
- installazione come app su smartphone e desktop
- costo operativo vicino a zero

## Livelli del sistema

### 1. Frontend PWA

Stack applicativo:

- Vue.js 3
- Vite
- plugin PWA per service worker, manifest e installabilita'
- Dexie.js sopra IndexedDB per persistenza locale

Responsabilita':

- rendering UI responsive su telefono, tablet e desktop
- accesso offline immediato alle viste principali
- gestione stato locale e coda operazioni non sincronizzate
- autenticazione operatore con utenza/password
- export manuale JSON per backup locale

### 2. Storage locale

IndexedDB e' la fonte primaria durante l'uso quotidiano. Ogni modifica utente viene confermata localmente prima di qualsiasi chiamata remota.

Store principali raccomandati:

- `settings`
- `rooms`
- `beds`
- `hosts`
- `drugs`
- `stockBatches`
- `therapies`
- `movements`
- `reminders`
- `syncQueue`
- `syncState`
- `activityLog`

Campi trasversali raccomandati per ogni entita' sincronizzabile:

- `id`
- `updatedAt`
- `deletedAt`
- `lastModifiedByDevice`
- `lastModifiedByUser`
- `syncStatus`
- `version`

### 3. Storage cloud personale

Il cloud condiviso tra dispositivi e' un Gist GitHub privato di proprieta' dell'utente. Il Gist non e' pubblico e resta accessibile solo ai dispositivi autorizzati dalla sessione operatore valida.

File minimi previsti:

- `meditrace-manifest.json`: metadata globali, schema version, versione dataset, device registry
- `meditrace-data.json`: snapshot canonico del dataset
- `meditrace-backup-YYYYMMDD.json`: backup espliciti creati su richiesta

Il `manifest` serve a evitare che ogni client lavori alla cieca: contiene `datasetVersion`, `updatedAt`, `updatedByDevice`, `checksum` e metadata di sincronizzazione.

### 4. Integrazione GitHub

Autenticazione e autorizzazioni:

- accesso operatore in app con utenza/password
- token GitHub usato solo come segreto tecnico di sincronizzazione Gist, non esposto come credenziale primaria all'operatore
- permesso minimo richiesto sul segreto tecnico: `gists` (read/write)

Responsabilita':

- login/logout browser
- rinnovo sessione
- individuazione file applicativi nel Gist privato
- upload e download dataset

## Approccio multi-dispositivo

### Modello di sincronizzazione

Per supportare uso da PC, smartphone e tablet senza backend dedicato, MediTrace usa un modello a snapshot condiviso con merge locale:

1. ogni dispositivo scrive subito su IndexedDB e accoda l'operazione in `syncQueue`
2. al salvataggio o al ritorno della connettivita', il client legge il `manifest` remoto
3. se il `datasetVersion` remoto coincide con quello noto localmente, il client genera un nuovo snapshot e lo carica sul Gist
4. se il remoto e' piu' nuovo, il client scarica `meditrace-data.json`, esegue merge locale e solo dopo tenta un nuovo upload
5. dopo upload riuscito, il client aggiorna il `manifest` con nuova versione e metadata dispositivo

Questo approccio evita lock permanenti e rimane sostenibile per 1-2 utenti e dataset ridotto.

### Regole di merge

Per ridurre conflitti tra dispositivi:

- entita' anagrafiche e terapie: `last-write-wins` basato su `updatedAt`, con salvataggio del record precedente in `activityLog`
- movimenti e reminder completati: append-only, mai sovrascritti se hanno `id` diverso
- cancellazioni: sempre logiche tramite `deletedAt`, mai hard delete immediata
- conflitti veri sullo stesso record: il client conserva la copia locale, mostra la copia remota e richiede risoluzione guidata solo se i campi critici divergono

Campi critici per conflitto esplicito:

- posologia
- frequenza terapia
- quantita' residua manualmente corretta
- scadenza confezione

### Device identity

Ogni installazione PWA genera un `deviceId` stabile, salvato localmente e registrato nel `manifest` remoto insieme a:

- `deviceLabel`
- `platform`
- `firstSeenAt`
- `lastSyncAt`

Questo serve a capire da quale dispositivo arriva l'ultima modifica e a supportare troubleshooting minimo senza server centrale.

## Flusso dati principale

1. L'operatore registra un movimento o modifica una terapia.
2. La PWA salva subito il dato in IndexedDB con `syncStatus = pending`.
3. La UI aggiorna immediatamente scorte, residui e alert.
4. Se la rete e' disponibile, il client confronta il `manifest` remoto nel Gist.
5. Se necessario scarica il dataset piu' recente, esegue merge e ricalcola le viste derivate.
6. Il client carica il nuovo `meditrace-data.json` e aggiorna il `manifest`.
7. Tutti gli altri dispositivi rilevano la nuova `datasetVersion` al successivo avvio, refresh o resume dell'app.

## Flussi funzionali chiave

### Scorte e consumo settimanale

1. Ogni confezione mantiene principio attivo, nome commerciale, dosaggio, scadenza e quantita' residua.
2. Il consumo settimanale previsto viene usato per evidenziare rischio esaurimento.
3. Quando il residuo scende sotto il consumo settimanale, la UI passa in stato warning.
4. Quando il residuo raggiunge zero, la riga viene marcata come esaurita e puo' essere archiviata logicamente.

### Terapie ospiti

1. Gli ospiti sono identificati con iniziali o codice interno per minimizzare dati personali.
2. Le terapie attive generano reminder locali in base alla frequenza pianificata.
3. Gli esiti `SOMMINISTRATO`, `POSTICIPATO`, `SALTATO` sono sincronizzati tra dispositivi.

### Apertura su un secondo dispositivo

1. L'utente effettua login con la stessa utenza operatore.
2. La PWA crea il proprio `deviceId` e cerca i file nel Gist privato.
3. Se trova un dataset remoto piu' recente del locale, lo scarica prima di mostrare le viste operative.
4. Se il dispositivo e' nuovo ma il cloud e' vuoto, puo' inizializzare il dataset solo dopo conferma esplicita.

## Quality Gate Obbligatorio

Ogni modifica al ramo principale deve superare un quality gate automatico eseguito in CI:

- unit test con soglia minima coverage
- test E2E browser sui flussi critici
- build produzione della PWA

Il check richiesto sul branch `main` e' `test`; senza esito positivo non e' consentito il merge.

## Backup e ripristino

Strategia minima:

- backup automatico implicito nel file remoto piu' recente nel Gist
- backup manuale locale tramite export JSON scaricabile
- restore guidato da file locale o da snapshot Gist precedente
- verifica di `schemaVersion` prima di importare dati

## Aggiornabilita' applicazione

Strategia minima:

- versionamento semantico della PWA
- `schemaVersion` nei file remoti per gestire migrazioni dati
- migration step eseguiti al bootstrap locale prima della sync
- rilascio continuo su GitHub Pages con rollback all'ultima build valida

## Scelte architetturali intenzionali

- nessun backend custom
- nessun database cloud leggibile da terzi
- una sola codebase per desktop e mobile
- compatibilita' naturale multi-dispositivo via browser
- costi nulli o molto vicini a zero nel perimetro previsto

## Rischi da gestire presto

- conflitti su modifiche concorrenti alla stessa terapia
- corruzione logica del dataset se manca validazione pre-upload
- segreto tecnico GitHub revocato o scaduto durante sync in background
- rate limit GitHub API su retry troppo aggressivi
- restore di file JSON con schema obsoleto
- assenza di cifratura client-side se in futuro il livello privacy dovesse essere alzato ulteriormente
- regressioni offline se service worker e migrazioni IndexedDB non vengono testati insieme
