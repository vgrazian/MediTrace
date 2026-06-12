# Estrazione requisiti per nuovo progetto Android + Node + Supabase

Data estrazione: 2026-05-25
Sorgenti principali: requisiti tecnici, modello dominio, architettura, policy sicurezza, roadmap, README.

## 1) Obiettivo del nuovo progetto

Avviare un nuovo sistema denominato farma-trace con:

- app Android operativa sul campo
- applicazione gemella in Node.js
- database condiviso su Supabase (Postgres)

I requisiti sotto sono estratti dal progetto attuale e normalizzati per una architettura a due client sullo stesso DB.

## 2) Requisiti funzionali (FR)

### FR-01 Gestione residenze

- Il sistema deve gestire residenze operative con almeno: nome, capienza massima, note.
- Devono esistere viste con: ospiti attivi assegnati e posti disponibili per residenza.

### FR-02 Anagrafica ospiti

- CRUD ospiti con campi: nome, cognome, luogo/data nascita, sesso, codice fiscale, patologie.
- Eliminazione logica (soft-delete) con conferma.
- Nelle selezioni ospite va mostrato formato: [ID] - Nome Cognome.

### FR-03 Catalogo farmaci e confezioni

- CRUD farmaci e confezioni (principio attivo, nome commerciale, dosaggio, forma, unita misura, scadenza).
- Uno stesso principio attivo puo avere piu confezioni/referenze.

### FR-04 Scorte e warning operativi

- Gestione giacenze per confezione/scadenza con quantita disponibile, soglia riordino, lotto opzionale.
- Calcolo warning quando residuo < consumo settimanale.
- Evidenza esaurimento a residuo zero.

### FR-05 Movimenti di magazzino

- CRUD movimenti con tipi: CARICO, SCARICO, RETTIFICA.
- Ogni movimento deve tracciare: operatore, timestamp, causale, quantita, entita collegate.

### FR-06 Terapie attive

- CRUD terapie con posologia, frequenza, orari, data inizio/fine, note.
- Ogni modifica terapia/posologia deve produrre audit.

### FR-07 Promemoria somministrazioni

- Agenda promemoria con stati: DA_ESEGUIRE, SOMMINISTRATO, POSTICIPATO, SALTATO.
- Filtri minimi: data, stato, residenza operativa.
- Ordinamento per ora pianificata e sequenza operativa configurabile.

### FR-08 Ordini/fabbisogni

- Generazione bozza ordine farmaci con: farmaco, quantita suggerita, priorita, note.
- Inclusione farmaci sotto soglia anche quando il riepilogo aggregato e ok.

### FR-09 Audit log operativo

- Registro operazioni in sola lettura con almeno: timestamp, operatore, azione, entita, riferimento record.
- Filtri minimi: operatore, ospite, farmaco, terapia, periodo.
- Export JSON del log.

### FR-10 Autenticazione e account

- Login con utenza/password via tabella utenti e password.
- Gestione profilo personale (nome, cognome, telefono, email, password iniziale).
- Reset password via email (link one-time).
- Invito nuovo operatore via email.
- Vincolo email univoca tra utenti attivi.
- Cambio password utente con password iniziale al primo login

### FR-11 Ruoli e permessi

- Supporto minimo ruolo admin e operatore.
- Eliminazione movimenti consentita solo ad admin.

### FR-12 Import/Export dati

- Export backup JSON manuale.
- Restore JSON con conferma esplicita e audit evento backup_restored.
- Import guidato CSV con validazione e report errori.

### FR-13 Sincronizzazione multi-client sullo stesso DB

- Entrambe le applicazioni (Android e Node) devono leggere/scrivere lo stesso dataset Supabase.
- Le modifiche devono essere visibili cross-client con consistenza operativa.
- Gestione conflitti su record concorrenti (regole esplicite su campi critici).
- Regola conflitti approvata: priorita per ruolo (admin > operatore) e, a parita di ruolo, fallback last-write-wins.
- Ogni override su campi critici deve essere tracciato in audit.

### FR-14 Operativita offline app Android

- Lato Android l'utente deve poter lavorare offline e sincronizzare appena torna la connettivita.
- Le operazioni offline devono essere messe in coda locale e riallineate senza perdita.

## 3) Requisiti non funzionali (NFR)

### NFR-01 Sicurezza credenziali e chiavi

- Nessuna chiave privilegiata Supabase nel client Android o frontend Node.
- Uso esclusivo di chiavi publishable lato client; service role solo in contesti server protetti.
- Segreti fuori dal codice, con rotazione periodica e tracciabilita.

### NFR-02 Sicurezza applicativa e autorizzazione

- RLS abilitata sulle tabelle esposte in Supabase.
- Policy allineate ai ruoli reali (admin/operatore).
- Audit obbligatorio su eventi sensibili (auth fail, modifiche terapia, restore, azioni amministrative).

### NFR-03 Privacy e minimizzazione dato

- Conservare solo dati necessari all'operativita socio-sanitaria.
- Evitare esposizione di dati personali completi nei log.
- Supportare pseudonimizzazione ove applicabile.
- Nei log applicativi, export e telemetria usare solo ID tecnici/pseudonimi; nessun campo personale in chiaro.
- Supabase ha un limite di 500gb di dati gestibili con free tier

### NFR-04 Disponibilita e resilienza

- App Android utilizzabile offline con persistenza locale robusta.
- Retry sync con backoff e gestione errori non bloccante.
- Procedure di backup/restore documentate e testate periodicamente.
- La piattaforma web Node e online-only: nessuna coda offline lato web.
- In assenza di rete la piattaforma web e non operativa e deve mostrare stato esplicito di mancanza connettivita.

### NFR-05 Prestazioni

- Tempo di avvio lato client entro soglia operativa (<2s come benchmark iniziale web; definire target Android equivalente).
- Interazioni principali fluide su dispositivi entry-level Android.

### NFR-06 Multi-dispositivo e consistenza

- Coerenza dati tra Android e Node dopo sincronizzazione.
- Risoluzione conflitti deterministica, con eventuale intervento guidato per campi critici.
- SLO tecnico MVP per propagazione cross-client: entro 5s.

### NFR-07 Usabilita e accessibilita operativa

- UI adattiva per smartphone e tablet (Android) e layout efficace lato Node.
- Flussi rapidi per turni operativi, con feedback chiari su stato sync e errori.

### NFR-08 Testabilita e quality gate

- Copertura minima di flussi critici: auth, CRUD core, sync cross-client, backup/restore, permessi ruoli.

### NFR-09 Osservabilita

- Logging tecnico per sync, auth e errori operativi.
- Tracciamento eventi cross-client con correlazione temporale.

### NFR-10 Manutenibilita

- Modello dati condiviso e versionato (schema/versioning chiaro).
- Migrazioni DB tracciate e reversibili.

## 4) Requisiti specifici per i due client

### 4.1 Android (obbligatori MVP)

- Supporto smartphone e tablet Android.
- Persistenza locale offline-first.
- Notifiche promemoria (base) con fallback in-app.
- Sync bidirezionale verso Supabase con indicatori stato.

### 4.2 Node app (obbligatori MVP)

- Accesso agli stessi domini dati (ospiti, farmaci, terapie, movimenti, audit).
- Operazioni amministrative (utenti admin) e replica web dei flussi di erogazione farmaci (operatori autorizzati).
- Gestione utenti/permessi e strumenti di controllo dati.
- Compatibilita completa con schema e regole business condivise.

## 5) Vincoli architetturali consigliati

- Unico source of truth: Supabase Postgres.
- Regole business critiche condivise tra client (libreria comune o RPC lato DB).
- Contratto API/versioning stabile per evitare drift Android vs Node.
- Ambiente separato almeno in DEV/STAGING/PROD.

## 6) Priorita MVP consigliata

1. Auth + ruoli + RLS su Supabase.
2. CRUD core (ospiti, farmaci, terapie, movimenti, scorte).
3. Audit log e vincoli permessi.
4. Offline queue Android + sync cross-client con Node.
5. Backup/restore e import CSV.
6. Test E2E cross-client e hardening sicurezza.

## 7) Gap da decidere subito per avvio progetto

Sezione chiusa: tutti i nodi decisionali sono stati recepiti nelle sezioni normative del documento.

Riallocazione decisioni:
- Ruolo app Node: vedi sezione 4.2.
- Strategia offline web Node: vedi NFR-04.
- Regole conflitto terapia/posologia/giacenze: vedi FR-13 e NFR-06.
- Pseudonimizzazione log/export/telemetria: vedi NFR-03.
- Target sincronizzazione cross-client: vedi NFR-06.

## 8) Wireframe testuali + copy UI (pronti per sviluppo)

Questa sezione traduce i requisiti in schermate operative con gerarchia componenti, stati e microcopy in italiano.

### 8.1 Android app (smartphone + tablet)

#### A) Login + stato connessione

Obiettivo: accesso rapido e chiaro stato rete/sync.

Struttura componenti:
- Header: nome app.
- Card accesso: campo Email, campo Password, toggle Mostra password.
- Selettore Residenza (step obbligatorio come prima azione operativa dopo accesso).
- CTA primaria: Accedi.
- CTA secondaria: Password dimenticata?.
- Footer stato: Connessione disponibile / Nessuna connessione.

Copy UI:
- Titolo: Benvenuto nel turno.
- Sottotitolo: Accedi per visualizzare terapie e scorte del reparto.
- Placeholder email: nome.cognome@clinica.it
- Placeholder password: Inserisci password
- Label selettore: Seleziona Residenza
- Placeholder selettore: Scegli una residenza
- Hint selettore: Ultima residenza usata: {nome_residenza}
- CTA primaria: Accedi
- Stato online: Connessione disponibile
- Stato offline: Nessuna connessione. Riprova tra pochi secondi.

Tablet notes:
- Colonna sinistra con branding e stato servizio.
- Colonna destra con card login centrata.

---

#### B) Dashboard Turno (Home)

Obiettivo: lista cronologica somministrazioni con priorita visiva immediata.

Struttura componenti:
- App bar: Reparto, fascia turno, stato sync (Sincronizzato / In coda / Errore).
- Filtri chip: Tutte, In ritardo, Prossime 60 min, Completate.
- Lista card ospiti ordinata per orario:
  - Riga 1: Ora, Stato colore, Nome Ospite.
  - Riga 2: Stanza/Letto, Farmaco principale, Dosaggio.
  - Riga 3: CTA Apri scheda.
- FAB secondaria: Segnala scorta bassa.

Copy UI:
- Titolo pagina: Dashboard Turno
- Label filtro: In ritardo
- Card stato giallo: In attesa
- Card stato rosso: Ritardo grave
- Card stato verde: Somministrazione completata
- CTA card: Apri scheda
- FAB: Segnala scorta bassa

Regole anti errore:
- Stato rosso sempre in cima alla lista.
- Conferma toast dopo ogni cambio stato: Evento registrato.

Tablet notes:
- Layout Master-Detail:
  - Colonna sinistra: lista ospiti.
  - Colonna destra: anteprima scheda somministrazione dell'elemento selezionato.

---

#### C) Scheda Somministrazione Sicura

Obiettivo: ridurre errori umani durante l'esito terapia.

Struttura componenti:
- Blocco Identita Ospite:
  - Foto ospite
  - Nome e cognome
  - Stanza/Letto
  - Data nascita (solo dove necessario)
- Blocco Farmaco:
  - Foto farmaco
  - Nome farmaco (massima evidenza)
  - Principio attivo
  - Dose prescritta + unita
  - Orario previsto
- Blocco Alert clinici:
  - Allergia critica (rosso)
  - Nota terapia (giallo)
- Blocco Azioni esito (bottoni grandi, separati):
  - Somministrato (verde)
  - Rifiutato (giallo)
  - Ospite assente (rosso)
- Feedback immediato post-azione:
  - Toast di conferma registrazione
  - CTA Annulla (undo rapido)

Copy UI:
- Titolo pagina: Somministrazione sicura
- Etichetta verifica: Verifica ospite e farmaco prima di confermare.
- Pulsante verde: Somministrato
- Pulsante giallo: Rifiutato
- Pulsante rosso: Ospite assente
- Messaggio successo: Esito registrato.
- CTA feedback: Annulla (10 secondi)

Regole anti errore:
- Registrazione immediata dell'esito senza modale di conferma.
- Se presente alert allergia critica: warning ad alta evidenza e richiesta motivazione, senza blocco del flusso.
- Correzioni successive consentite solo ad admin con audit obbligatorio.
- Per Rifiutato/Assente: motivo obbligatorio.

---

#### D) Segnalazione rapida scorte (mobilita)

Obiettivo: inviare alert immediato al centro senza operazioni complesse.

Struttura componenti:
- Campo ricerca farmaco.
- Lista farmaci reparto con stato: Disponibile / Sotto soglia / Esaurito.
- CTA rapida per riga: Segnala scorta bassa.
- Campo opzionale: Quantita residua stimata.
- Conferma invio alert.

Copy UI:
- Titolo pagina: Controllo rapido scorte
- Placeholder ricerca: Cerca farmaco
- CTA riga: Segnala scorta bassa
- Label campo: Quantita residua (opzionale)
- CTA invio: Invia segnalazione
- Feedback: Segnalazione inviata al magazzino centrale.

Regole anti errore:
- Debounce su invii multipli in 30 secondi sullo stesso farmaco.
- Se alert gia aperto: mostra gia segnalato oggi.

---

#### E) Registro note e consegne

Obiettivo: tracciare anomalie e passaggi turno con linguaggio standardizzato.

Struttura componenti:
- Tab Note turno.
- Campo testo multilinea.
- Pulsante nota vocale (con trascrizione).
- Tag rapidi: Terapia, Comportamento ospite, Scorte, Altro.
- Timeline note del turno.

Copy UI:
- Titolo pagina: Note e consegne
- Placeholder nota: Scrivi una nota operativa...
- CTA vocale: Registra nota vocale
- CTA salva: Salva nota
- Feedback: Nota salvata nel registro del turno.

Regole anti errore:
- Nessun dato personale in chiaro nelle note di sistema; usare riferimento ID ospite dove possibile.

---

### 8.2 Web desktop (Node online-only, piattaforma duale admin + erogazione)

#### A) Pannello di Controllo Centrale

Obiettivo: supervisione real-time delle somministrazioni.

Struttura componenti:
- Top KPI bar:
  - Terapie previste oggi
  - Somministrate
  - In ritardo
  - Alert scorte aperti
- Griglia reparti (card).
- Feed eventi live (tabella): ora, operatore, ospite ID, farmaco, esito, reparto.
- Pannello dettaglio evento laterale.

Copy UI:
- Titolo pagina: Controllo centrale
- KPI 1: Terapie previste oggi
- KPI 2: Somministrazioni completate
- KPI 3: Eventi in ritardo
- KPI 4: Alert scorte aperti
- Label tabella vuota: Nessun evento nelle ultime 2 ore.

Regole anti errore:
- Evidenziazione automatica eventi critici (rosso) non letti.
- Conferma visuale quando un alert viene preso in carico.

---

#### B) Erogazione farmaci (replica web UI)

Obiettivo: permettere da PC la stessa operativita di somministrazione dell'app mobile, con identiche regole di sicurezza.

Struttura componenti:
- Filtro turno/reparto.
- Lista cronologica ospiti e dosi pianificate (stessa semantica colori della mobile app).
- Pannello dettaglio somministrazione:
  - Ospite (nome, stanza/letto, foto se disponibile)
  - Farmaco (nome, dose, orario)
  - Alert clinici (allergie/note)
- Azioni esito:
  - Somministrato
  - Rifiutato
  - Ospite assente
- Feedback immediato post-azione con undo rapido.

Copy UI:
- Titolo pagina: Erogazione farmaci
- Placeholder filtro: Filtra per reparto o fascia oraria
- CTA esito 1: Somministrato
- CTA esito 2: Rifiutato
- CTA esito 3: Ospite assente
- Feedback: Esito registrato.
- CTA feedback: Annulla (10 secondi)

Regole anti errore:
- Registrazione immediata senza pannelli modali di conferma.
- Motivo obbligatorio per Rifiutato e Ospite assente.
- Alert allergia critica non bloccante con warning ad alta evidenza e motivazione obbligatoria.
- Correzioni successive consentite solo ad admin con audit obbligatorio.
- Accesso consentito solo a operatori autorizzati.

---

#### C) Gestione scorte magazzino

Obiettivo: carico/scarico manuale affidabile, con controllo lotti e scadenze.

Struttura componenti:
- Tabella principale:
  - Farmaco
  - Lotto
  - Scadenza
  - Quantita residua
  - Soglia minima
  - Stato
- Filtri: Reparto, stato scorta, scadenza, principio attivo.
- CTA: Nuovo carico, Nuovo scarico, Rettifica.
- Drawer operazione con campi obbligatori e riepilogo.

Copy UI:
- Titolo pagina: Magazzino e scorte
- CTA primaria: Nuovo carico
- CTA secondaria: Nuovo scarico
- CTA terziaria: Rettifica
- Label campo: Causale operazione
- Label campo: Quantita
- Label campo: Conferma lotto
- CTA conferma: Registra movimento
- Feedback: Movimento registrato correttamente.

Regole anti errore:
- Controllo range quantita (no valori negativi non previsti).
- Conferma aggiuntiva per scarichi oltre soglia rischio.
- Blocco scarico se quantita disponibile insufficiente.

---

#### D) Anagrafica ospiti

Obiettivo: CRUD ospiti chiaro e veloce con riduzione errori anagrafici.

Struttura componenti:
- Lista ospiti a sinistra con ricerca.
- Dettaglio ospite al centro.
- Azioni in alto: Nuovo ospite, Modifica, Disattiva.
- Pannello informazioni cliniche sintetiche.

Copy UI:
- Titolo pagina: Anagrafica ospiti
- Placeholder ricerca: Cerca per nome, cognome o ID
- CTA: Nuovo ospite
- CTA: Salva modifiche
- Dialog conferma: Confermi la disattivazione di questo ospite?

Regole anti errore:
- Validazione immediata campi obbligatori.
- Doppia conferma su disattivazione.

---

#### E) Piani terapeutici

Obiettivo: configurare terapie e posologie con coerenza temporale.

Struttura componenti:
- Selettore ospite.
- Tabella terapie attive con timeline oraria.
- Form terapia:
  - Farmaco
  - Dose
  - Frequenza
  - Orari
  - Data inizio/fine
  - Note cliniche
- Audit panel modifiche recenti.

Copy UI:
- Titolo pagina: Piani terapeutici
- CTA: Aggiungi terapia
- CTA: Salva piano
- Warning: Conflitto orario rilevato. Verifica prima di salvare.
- Feedback: Piano terapeutico aggiornato.

Regole anti errore:
- Validatore conflitti su orari sovrapposti.
- Tracciamento audit automatico su ogni modifica dose/frequenza.

---

### 8.3 Stati globali, messaggi e fallback

Stati rete/sync:
- Online sincronizzato: Tutto sincronizzato.
- Online con coda: Sincronizzazione in corso...
- Errore sync: Errore di sincronizzazione. Riprovo automaticamente.
- Web offline (Node): Connessione assente. Piattaforma temporaneamente non operativa.

Stati vuoti:
- Nessuna terapia pianificata in questa fascia oraria.
- Nessun alert scorte aperto.
- Nessuna nota registrata nel turno.

Messaggi errore validazione (esempi):
- Campo obbligatorio.
- Quantita non valida.
- Operazione non consentita per il tuo ruolo.

### 8.4 Token UX/UI da implementare nel design system

Colori semantici:
- success: verde (completato/disponibile)
- warning: giallo (attesa/sotto soglia)
- danger: rosso (ritardo grave/esaurito/allergia critica)

Tipografia:
- Mobile Android: Roboto
- Web desktop: Inter
- Gerarchia: farmaco, dose e stanza/letto sempre con peso visivo massimo.

Dimensioni minime interattive:
- Touch target mobile: almeno 48dp.
- Spaziatura bottoni esito somministrazione: minimo 12dp tra pulsanti.

### 8.5 Criteri di accettazione UX (handoff dev + QA)

- Ogni esito somministrazione viene registrato immediatamente senza modale di conferma.
- Dopo registrazione esito e disponibile undo rapido (10 secondi).
- Ogni evento Rifiutato/Assente richiede motivo obbligatorio.
- La dashboard mobile mostra prima gli eventi in ritardo grave.
- La replica web di erogazione adotta gli stessi esiti e le stesse regole anti errore della mobile app.
- La UI web di erogazione e visibile solo a operatori autorizzati.
- Il web mostra banner bloccante quando non c'e connettivita.
- Le operazioni di scarico non possono portare quantita sotto zero.
- Correzioni di esiti gia registrati consentite solo ad admin con audit obbligatorio.
- Ogni modifica a terapia/posologia genera audit verificabile.

## 9) Percorsi di utilizzo operativi (day by day)

Questa sezione definisce i percorsi principali da privilegiare in UI per agevolare il lavoro quotidiano degli operatori.

### 9.1 Percorso somministrazioni: flusso per residenza e sequenza letti

Obiettivo:
- Supportare il giro abituale turno con navigazione lineare paziente > farmaci, paziente > farmaci.
- Ridurre tempi morti e cambi contesto durante la somministrazione.

Regole di ordinamento obbligatorie:
- Ordinamento primario: Residenza.
- Ordinamento secondario: Reparto/Zona (se presente).
- Ordinamento terziario: Numero stanza.
- Ordinamento quaternario: Sequenza letto configurata (giro turno).
- Ordinamento finale: Orario dose (a parita di letto).

Modalita operativa consigliata (mobile e replica web):
1. Operatore seleziona Residenza e Turno (mattina/pomeriggio/notte).
2. Il sistema propone automaticamente l'ultima Residenza selezionata per quello specifico operatore/dispositivo.
3. Sistema apre la lista giro turno gia ordinata per sequenza letti.
4. Per ogni paziente viene mostrata una card compatta con:
- Nome ospite
- Stanza/Letto
- Prossima dose da eseguire
- Stato dose (in attesa, in ritardo, completata)
1. Tap su card apre Scheda Somministrazione Sicura.
2. Operatore registra esito (Somministrato/Rifiutato/Ospite assente) con registrazione immediata.
3. Al salvataggio, il sistema propone automaticamente il paziente successivo nel giro.
4. A fine giro, sistema mostra riepilogo turno con:
- completate
- rifiutate
- assenti
- eventi in ritardo residui

Pattern UX da implementare:
- Pulsante persistente: Prossimo paziente.
- Badge progressione giro: Paziente 7 di 24.
- Toggle vista: Solo da eseguire / Tutti.
- Blocco salti involontari: se si cambia paziente senza esito, chiedere conferma.
- Undo rapido post-registrazione (10 secondi).
- Evidenza warning per allergie/alert critici.

Copy UI chiave:
- Titolo lista: Giro turno - Residenza {nome}
- Sottotitolo: Sequenza letti attiva
- CTA: Prossimo paziente
- Dialog: Vuoi passare al prossimo paziente senza registrare un esito?
- CTA dialog primaria: Registra esito prima di continuare
- CTA dialog secondaria: Continua senza registrare
- Riepilogo: Giro completato. Controlla gli eventi non risolti.

Criteri di accettazione:
- L'ordine della lista deve rispettare sempre la sequenza letti configurata.
- La scelta Residenza e obbligatoria come primo step operativo del turno.
- Il sistema precompila la Residenza con l'ultima selezione valida dell'operatore, con possibilita di cambio manuale.
- Dopo ogni esito confermato, il focus va automaticamente al paziente successivo.
- Il sistema deve consentire filtro rapido sugli eventi in ritardo.

### 9.2 Percorso controllo magazzino: verifica rapida + riconciliazione

Obiettivo:
- Agevolare il controllo periodico delle scorte con pochi passaggi e rischio errore ridotto.
- Distinguere chiaramente controllo rapido reparto da gestione amministrativa di magazzino.

Modalita A - Controllo rapido reparto (operatore):
1. Apri Controllo rapido scorte.
2. Filtra per Residenza/Reparto.
3. Visualizza lista farmaci con stato semaforico.
4. Per farmaci critici, invia Segnala scorta bassa con quantita stimata opzionale.
5. Sistema crea alert tracciato per il magazzino centrale.

Modalita B - Riconciliazione magazzino centrale (admin):
1. Apri Magazzino e scorte (web).
2. Filtra alert aperti e farmaci sotto soglia.
3. Verifica giacenze per lotto/scadenza.
4. Esegui carico/scarico/rettifica con causale obbligatoria.
5. Chiudi alert solo dopo registrazione movimento coerente.

Pattern UX da implementare:
- Coda prioritaria: Esauriti > Sotto soglia > In scadenza.
- Vista differenza: Quantita attesa vs quantita rilevata.
- Conferma rinforzata su scarichi ad alto impatto.
- Stato alert: Aperto, Preso in carico, Risolto.
- Cronologia movimenti contestuale al farmaco.

Copy UI chiave:
- Titolo reparto: Controllo scorte reparto
- CTA operatore: Segnala scorta bassa
- Feedback operatore: Alert inviato al magazzino centrale.
- Titolo admin: Riconciliazione magazzino
- Label stato: Preso in carico
- CTA admin: Registra movimento e chiudi alert
- Feedback admin: Alert risolto con movimento tracciato.

Criteri di accettazione:
- Ogni alert di scorta deve avere stato e timestamp di presa in carico.
- Nessun alert puo essere chiuso senza movimento associato.
- La lista magazzino deve evidenziare sempre prima esauriti e sotto soglia.

## 10) Matrice operativa (Ruolo x Schermata x Azione)

La matrice seguente converte i percorsi in elementi pronti per pianificazione backlog e test di accettazione.

### 10.1 Matrice somministrazioni (giro turno)

| Ruolo | Piattaforma | Schermata | Azione utente | Output atteso sistema | Regole/validazioni | KPI operativo |
|---|---|---|---|---|---|---|
| Operatore | Android | Dashboard Turno | Seleziona Residenza + Turno | Lista pazienti ordinata per sequenza letti | Ordinamento: residenza > reparto/zona > stanza > letto > orario dose | Tempo apertura lista turno |
| Operatore | Android | Dashboard Turno | Applica filtro In ritardo | Mostra solo eventi in ritardo | Gli eventi ritardo grave restano in cima | Tempo identificazione criticita |
| Operatore | Android | Scheda Somministrazione Sicura | Registra Somministrato | Evento salvato + audit + avanzamento al prossimo paziente | Salvataggio immediato + undo 10 secondi | Tempo medio per somministrazione |
| Operatore | Android | Scheda Somministrazione Sicura | Registra Rifiutato | Evento salvato con motivazione | Motivo obbligatorio | Percentuale eventi con motivo completo |
| Operatore | Android | Scheda Somministrazione Sicura | Registra Ospite assente | Evento salvato con motivazione | Motivo obbligatorio | Tempo di registrazione eccezione |
| Operatore | Android | Dashboard Turno | Usa CTA Prossimo paziente | Focus automatico sul paziente successivo | Se esito mancante: dialog di conferma | Riduzione tocchi per giro |
| Operatore autorizzato | Web Node | Erogazione farmaci (replica UI) | Seleziona paziente dal giro | Carica dettaglio ospite/farmaco | Stessa semantica stati della mobile app | Parita esiti mobile/web |
| Operatore autorizzato | Web Node | Erogazione farmaci (replica UI) | Registra esito terapia | Evento salvato + audit + refresh feed centrale | Salvataggio immediato + undo 10 secondi; warning allergia critica | Tasso errori pre-salvataggio |
| Admin | Web Node | Controllo centrale | Monitora eventi live | Feed aggiornato in tempo reale | Evidenza automatica eventi critici non letti | Tempo presa in carico evento critico |

### 10.2 Matrice controllo magazzino

| Ruolo | Piattaforma | Schermata | Azione utente | Output atteso sistema | Regole/validazioni | KPI operativo |
|---|---|---|---|---|---|---|
| Operatore | Android | Controllo rapido scorte | Filtra per residenza/reparto | Lista farmaci con stato semaforico | Priorita visiva: esaurito > sotto soglia > in scadenza | Tempo identificazione farmaco critico |
| Operatore | Android | Controllo rapido scorte | Invia Segnala scorta bassa | Alert aperto al magazzino centrale | Debounce invii duplicati; stato alert tracciato | Tempo invio segnalazione |
| Operatore | Android | Controllo rapido scorte | Inserisce quantita residua stimata | Allega stima all'alert | Campo opzionale con controllo valore numerico | Completezza alert |
| Admin | Web Node | Magazzino e scorte | Filtra alert aperti | Lista alert prioritizzata | Ordinamento: esauriti > sotto soglia > in scadenza | Tempo presa in carico alert |
| Admin | Web Node | Magazzino e scorte | Registra carico | Aggiorna giacenza e storico movimenti | Causale obbligatoria | Accuratezza giacenze |
| Admin | Web Node | Magazzino e scorte | Registra scarico | Aggiorna giacenza e storico movimenti | Blocco se quantita insufficiente; conferma rinforzata su alto impatto | Errori inventario evitati |
| Admin | Web Node | Magazzino e scorte | Registra rettifica | Allinea giacenza reale e log audit | Causale obbligatoria + tracciamento operatore | Tempo riconciliazione |
| Admin | Web Node | Magazzino e scorte | Chiude alert | Alert in stato Risolto con riferimento movimento | Chiusura consentita solo con movimento associato | Percentuale alert chiusi correttamente |

### 10.3 Matrice autorizzazioni per ruolo

| Azione | Operatore | Admin |
|---|---|---|
| Erogare terapia (mobile) | Consentito | Consentito |
| Erogare terapia (replica web) | Consentito se autorizzato | Consentito |
| Segnalare scorta bassa | Consentito | Consentito |
| Registrare carico/scarico/rettifica | Non consentito | Consentito |
| Chiudere alert scorta | Non consentito | Consentito |
| Gestire utenti/permessi | Non consentito | Consentito |

### 10.4 Mapping matrice -> backlog (template ticket)

Per ogni riga delle matrici 10.1 e 10.2 creare un ticket con:
- Titolo: [Ruolo] [Piattaforma] [Schermata] - [Azione utente]
- Descrizione: flusso atteso + output sistema
- Acceptance criteria: regole/validazioni della riga
- Metriche: KPI operativo della riga
- Priorita: P0 se impatta sicurezza somministrazione o coerenza giacenze

## 11) User story derivate dalla matrice (pronte per backlog)

### 11.1 User story somministrazioni (giro turno)

#### US-01 - Apertura giro turno ordinato
As a Operatore Android
I want selezionare Residenza e Turno e ottenere la lista pazienti gia ordinata
So that posso seguire il giro abituale senza riordinare mentalmente i pazienti

Acceptance criteria:
- La lista e ordinata per residenza > reparto/zona > stanza > letto > orario dose.
- Il tempo di apertura lista turno e misurabile come KPI.

#### US-02 - Filtro eventi in ritardo
As a Operatore Android
I want applicare il filtro In ritardo nella Dashboard Turno
So that individuo subito le somministrazioni prioritarie

Acceptance criteria:
- Vengono mostrati solo eventi in ritardo.
- Gli eventi in ritardo grave restano in cima.

#### US-03 - Esito Somministrato con sicurezza
As a Operatore Android
I want confermare l'esito Somministrato dalla Scheda Somministrazione Sicura
So that registro l'evento in modo tracciato e posso passare al prossimo paziente

Acceptance criteria:
- L'evento viene salvato con audit.
- Il salvataggio e immediato senza modale di conferma.
- E disponibile undo rapido entro 10 secondi.
- Dopo salvataggio viene proposto il paziente successivo.

#### US-04 - Esito Rifiutato con motivazione
As a Operatore Android
I want registrare l'esito Rifiutato con motivazione
So that il rifiuto e documentato correttamente nel contesto clinico

Acceptance criteria:
- Il motivo e obbligatorio.
- L'evento viene salvato con audit e motivazione.

#### US-05 - Esito Ospite assente con motivazione
As a Operatore Android
I want registrare l'esito Ospite assente con motivazione
So that il mancato trattamento e tracciato e gestibile nel riepilogo turno

Acceptance criteria:
- Il motivo e obbligatorio.
- L'evento viene salvato con audit e motivazione.

#### US-06 - Avanzamento rapido al prossimo paziente
As a Operatore Android
I want usare la CTA Prossimo paziente dalla Dashboard Turno
So that riduco i tocchi necessari durante il giro

Acceptance criteria:
- Il focus passa al paziente successivo nella sequenza.
- Se manca un esito, compare dialog di conferma prima del cambio paziente.

#### US-07 - Selezione paziente nella replica web
As a Operatore autorizzato Web Node
I want selezionare un paziente dal giro in Erogazione farmaci
So that visualizzo subito dettaglio ospite/farmaco allineato alla mobile app

Acceptance criteria:
- Il pannello mostra dettaglio ospite/farmaco coerente con i dati correnti.
- Gli stati usano la stessa semantica della mobile app.

#### US-08 - Registrazione esito terapia su web
As a Operatore autorizzato Web Node
I want confermare un esito terapia dalla replica web
So that registro l'evento in tempo reale nel feed centrale

Acceptance criteria:
- L'evento viene salvato con audit e refresh del feed centrale.
- Il salvataggio e immediato senza modale di conferma.
- E disponibile undo rapido entro 10 secondi.
- In presenza di allergia critica viene mostrato warning ad alta evidenza.

#### US-09 - Supervisione eventi live
As a Admin Web Node
I want monitorare gli eventi live dal Controllo centrale
So that posso prendere in carico rapidamente gli eventi critici

Acceptance criteria:
- Il feed eventi e aggiornato in tempo reale.
- Gli eventi critici non letti hanno evidenza automatica.

### 11.2 User story controllo magazzino

#### US-10 - Filtro rapido scorte per reparto
As a Operatore Android
I want filtrare il Controllo rapido scorte per residenza/reparto
So that individuo velocemente i farmaci critici del mio contesto operativo

Acceptance criteria:
- La lista mostra stato semaforico dei farmaci.
- L'ordinamento prioritario e esaurito > sotto soglia > in scadenza.

#### US-11 - Segnalazione scorta bassa
As a Operatore Android
I want inviare Segnala scorta bassa da Controllo rapido scorte
So that il magazzino centrale riceve un alert tracciato immediato

Acceptance criteria:
- L'alert viene creato in stato Aperto.
- Sono bloccati invii duplicati ravvicinati (debounce).

#### US-12 - Inserimento quantita stimata
As a Operatore Android
I want inserire una quantita residua stimata durante la segnalazione
So that l'admin abbia un contesto migliore per la presa in carico

Acceptance criteria:
- Il campo quantita e opzionale.
- Se valorizzato, accetta solo valori numerici validi.
- Il valore viene allegato all'alert.

#### US-13 - Presa in carico alert magazzino
As a Admin Web Node
I want filtrare e visualizzare gli alert aperti in Magazzino e scorte
So that posso priorizzare la riconciliazione in modo efficace

Acceptance criteria:
- La lista alert e prioritizzata.
- L'ordinamento segue esauriti > sotto soglia > in scadenza.

#### US-14 - Registrazione carico
As a Admin Web Node
I want registrare un carico di magazzino con causale
So that aggiorno correttamente giacenze e storico movimenti

Acceptance criteria:
- La causale e obbligatoria.
- La giacenza viene aggiornata e il movimento viene tracciato.

#### US-15 - Registrazione scarico con controlli
As a Admin Web Node
I want registrare uno scarico con controlli preventivi
So that evito errori inventariali e inconsistenze di stock

Acceptance criteria:
- Lo scarico e bloccato se la quantita disponibile e insufficiente.
- E prevista conferma rinforzata su scarichi ad alto impatto.
- Il movimento viene tracciato in audit.

#### US-16 - Rettifica giacenze
As a Admin Web Node
I want registrare una rettifica con motivazione e tracciamento operatore
So that riallineo giacenza reale e sistema con evidenza audit

Acceptance criteria:
- La causale e obbligatoria.
- Ogni rettifica registra operatore, timestamp e valore precedente/nuovo.

#### US-17 - Chiusura alert con vincolo movimento
As a Admin Web Node
I want chiudere un alert solo dopo aver registrato il movimento correlato
So that la risoluzione sia verificabile e coerente con la giacenza

Acceptance criteria:
- La chiusura alert e consentita solo con riferimento movimento valido.
- Lo stato alert passa a Risolto con timestamp di chiusura.

### 11.3 Priorita e stima (MoSCoW + Story Points)

Scala Story Points adottata (Fibonacci): 1, 2, 3, 5, 8, 13.

| ID | Titolo breve | MoSCoW | Story Points | Dependencies |
|---|---|---|---|---|
| US-01 | Apertura giro turno ordinato | Must | 5 | Nessuna |
| US-02 | Filtro eventi in ritardo | Must | 3 | US-01 |
| US-03 | Esito Somministrato con sicurezza | Must | 8 | US-01 |
| US-04 | Esito Rifiutato con motivazione | Must | 5 | US-01 |
| US-05 | Esito Ospite assente con motivazione | Must | 5 | US-01 |
| US-06 | Avanzamento rapido al prossimo paziente | Should | 3 | US-01, US-03, US-04, US-05 |
| US-07 | Selezione paziente replica web | Should | 3 | US-01 |
| US-08 | Registrazione esito terapia su web | Must | 8 | US-07 |
| US-09 | Supervisione eventi live | Should | 5 | US-03, US-04, US-05, US-08 |
| US-10 | Filtro rapido scorte per reparto | Must | 3 | Nessuna |
| US-11 | Segnalazione scorta bassa | Must | 5 | US-10 |
| US-12 | Inserimento quantita stimata | Could | 2 | US-11 |
| US-13 | Presa in carico alert magazzino | Must | 5 | US-11 |
| US-14 | Registrazione carico | Must | 5 | US-13 |
| US-15 | Registrazione scarico con controlli | Must | 8 | US-13 |
| US-16 | Rettifica giacenze | Should | 5 | US-13 |
| US-17 | Chiusura alert con vincolo movimento | Must | 5 | US-13, US-14 o US-15 o US-16 |

Legenda Dependencies:
- Nessuna: user story avviabile subito.
- Elenco US: user story avviabile dopo completamento delle dipendenze indicate.

Totali:
- Must: 12 story, 65 SP
- Should: 4 story, 16 SP
- Could: 1 story, 2 SP
- Totale complessivo: 83 SP

### 11.4 Proposta pacchetti sprint (backlog quasi pronto)

Sprint 1 (core safety somministrazioni + alert scorte) - 34 SP:
- US-01, US-02, US-03, US-04, US-05, US-10, US-11

Sprint 2 (web replica erogazione + magazzino core) - 34 SP:
- US-08, US-13, US-14, US-15, US-17, US-07

Sprint 3 (ottimizzazioni operative e supervisione) - 15 SP:
- US-06, US-09, US-16, US-12

### 11.5 Ordine di esecuzione consigliato (linearizzato per Wave)

Derivazione automatica dalle dipendenze della tabella 11.3 (approccio topological layering).

Wave 1 - Fondazioni operative (8 SP):
- US-01 (Apertura giro turno ordinato)
- US-10 (Filtro rapido scorte per reparto)

Wave 2 - Core operativo su fondazioni pronte (34 SP):
- US-02, US-03, US-04, US-05, US-07, US-11

Wave 3 - Consolidamento, web avanzato e chiusura ciclo (41 SP):
- US-06, US-08, US-12, US-13, US-09, US-14, US-15, US-16, US-17

Sequenza interna consigliata per Wave 3 (per rispettare tutte le dipendenze):
1. US-06, US-08, US-12, US-13
2. US-09, US-14, US-15, US-16
3. US-17

Note implementative:
- US-17 richiede US-13 e almeno uno tra US-14/US-15/US-16.
- Le user story senza dipendenze dirette dal layer precedente possono essere sviluppate in parallelo nello stesso step.
