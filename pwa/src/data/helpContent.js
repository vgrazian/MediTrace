/**
 * Contenuto della guida in linea in italiano, organizzato per sezione dell'applicazione.
 * Ogni sezione ha un titolo, un testo introduttivo e un array di sotto-sezioni.
 */
export const helpContent = {
    home: {
        titolo: 'Cruscotto — Panoramica generale',
        intro:
            'Il Cruscotto è la pagina di partenza di MediTrace. Da qui puoi vedere in un colpo d\'occhio lo stato della struttura e raggiungere rapidamente le sezioni principali.',
        sezioni: [
            {
                titolo: 'Stato sincronizzazione',
                testo:
                    'Indica se i dati salvati sul dispositivo sono allineati con il server. "Allineato" significa tutto a posto. Se vedi "operazioni in coda", i dati verranno inviati al server non appena la connessione sarà disponibile. Non è necessario fare nulla.',
            },
            {
                titolo: 'Azioni rapide',
                testo:
                    'Pulsanti di collegamento diretto alle sezioni più usate: Catalogo farmaci, Stanze, Ospiti, Scorte, Terapie. Cliccane uno per aprire direttamente quella sezione.',
            },
            {
                titolo: 'Indicatori KPI',
                testo:
                    'Numeri di sintesi aggiornati in tempo reale: scorte in esaurimento, terapie attive, promemoria aperti e ospiti presenti. Un numero evidenziato in arancione o rosso segnala una situazione che richiede attenzione.',
            },
            {
                titolo: 'Versione dataset',
                testo:
                    'Numero progressivo che si aggiorna ad ogni sincronizzazione riuscita. Serve principalmente per il supporto tecnico: non è necessario tenerlo sotto controllo durante l\'uso quotidiano.',
            },
        ],
    },

    farmaci: {
        titolo: 'Catalogo Farmaci — Guida',
        intro:
            'Questa sezione contiene l\'elenco di tutti i farmaci registrati nella struttura, con le rispettive confezioni (lotti) disponibili in magazzino.',
        sezioni: [
            {
                titolo: 'Cosa sono i farmaci e le confezioni?',
                testo:
                    'Un farmaco è la scheda generale del principio attivo (es. Paracetamolo). Una confezione è la versione specifica in magazzino (es. Tachipirina 500mg, scadenza giu 2026, quantità 24 compresse). Ogni farmaco può avere più confezioni.',
            },
            {
                titolo: 'Come aggiungere un nuovo farmaco',
                testo:
                    'Apri il pannello "Gestisci Farmaci", compila i campi Nome farmaco e Principio attivo (obbligatori), poi premi "Salva farmaco". Il farmaco comparirà nella tabella in basso.',
            },
            {
                titolo: 'Come aggiungere una confezione',
                testo:
                    'Seleziona il farmaco dal menù a tendina nel pannello confezioni, compila Nome commerciale e gli altri campi, poi premi "Salva confezione". La confezione verrà aggiunta alla tabella.',
            },
            {
                titolo: 'Modificare un farmaco o una confezione',
                testo:
                    'Spunta la casellina a sinistra della riga che vuoi modificare, poi premi il pulsante "Modifica" nella barra in alto. Si aprirà il modulo già compilato: correggi i dati e premi "Salva modifica".',
            },
            {
                titolo: 'Eliminare un farmaco o una confezione',
                testo:
                    'Spunta una o più righe, poi premi "Elimina" nella barra azioni. Verrà richiesta conferma prima di procedere. L\'operazione è reversibile solo dal pannello Audit entro 30 giorni.',
            },
            {
                titolo: 'Scorta minima',
                testo:
                    'Se la quantità di una confezione scende sotto la soglia di riordino, il sistema la evidenzia in rosso nel Cruscotto. Imposta questo valore quando crei o modifichi una confezione.',
            },
        ],
    },

    ospiti: {
        titolo: 'Ospiti — Guida',
        intro:
            'In questa sezione gestisci l\'anagrafica degli ospiti della struttura: le generalità, il letto assegnato e il collegamento con le terapie attive.',
        sezioni: [
            {
                titolo: 'Come aggiungere un ospite',
                testo:
                    'Apri il modulo con il pulsante "Aggiungi", compila almeno Nome, Cognome e Stanza, poi premi "Salva ospite". L\'ospite apparirà nella tabella.',
            },
            {
                titolo: 'Codice interno',
                testo:
                    'Il codice interno (es. OSP-01) viene assegnato automaticamente dal sistema. Non è necessario inserirlo a mano.',
            },
            {
                titolo: 'Modificare i dati di un ospite',
                testo:
                    'Spunta la casellina accanto all\'ospite, premi "Modifica", correggi i dati nel modulo e premi "Salva modifica".',
            },
            {
                titolo: 'Terapie associate',
                testo:
                    'Espandi la riga di un ospite per vedere le sue terapie attive. Per aggiungere o modificare una terapia, vai alla sezione "Terapie".',
            },
            {
                titolo: 'Ospiti dimessi',
                testo:
                    'Gli ospiti dimessi vengono nascosti dalla lista principale. Puoi visualizzarli attivando il filtro "Mostra tutti" nella barra di ricerca.',
            },
        ],
    },

    stanze: {
        titolo: 'Stanze e Letti — Guida',
        intro:
            'Questa sezione permette di gestire la mappa della struttura: edifici, stanze e posti letto. Ogni ospite viene assegnato a un letto specifico.',
        sezioni: [
            {
                titolo: 'Struttura gerarchica',
                testo:
                    'L\'organizzazione è: Edificio → Stanza → Letto. Devi creare prima l\'edificio, poi la stanza, poi il letto. Solo dopo potrai assegnare un ospite a quel letto.',
            },
            {
                titolo: 'Come aggiungere una stanza',
                testo:
                    'Premi "Aggiungi stanza", inserisci il nome e seleziona l\'edificio, poi salva. Ripeti per ogni stanza necessaria.',
            },
            {
                titolo: 'Come aggiungere un letto',
                testo:
                    'Seleziona la stanza dall\'elenco, premi "Aggiungi letto" e inserisci il numero o codice del letto.',
            },
            {
                titolo: 'Letto occupato o libero',
                testo:
                    'Un letto con un ospite assegnato viene mostrato come "occupato". Non è possibile assegnare due ospiti allo stesso letto.',
            },
        ],
    },

    scorte: {
        titolo: 'Scorte — Guida',
        intro:
            'La sezione Scorte mostra la situazione attuale del magazzino farmaci: quantità disponibili, soglie di riordino e confezioni prossime alla scadenza.',
        sezioni: [
            {
                titolo: 'Cosa vedo in questa pagina?',
                testo:
                    'Una tabella con tutte le confezioni di farmaci presenti in magazzino, con la quantità attuale e la soglia minima. Le righe evidenziate in rosso indicano scorte insufficienti.',
            },
            {
                titolo: 'Scorta sotto soglia',
                testo:
                    'Quando la quantità attuale è inferiore alla soglia di riordino, la riga viene evidenziata. Questo significa che è necessario ordinare nuove confezioni.',
            },
            {
                titolo: 'Confezioni in scadenza',
                testo:
                    'Le confezioni con data di scadenza entro 30 giorni sono marcate con un avviso. Controlla regolarmente questa sezione, soprattutto prima dei fine settimana.',
            },
            {
                titolo: 'Come aggiornare la quantità',
                testo:
                    'Vai alla sezione "Movimenti" per registrare un carico (arrivo merce) o uno scarico (utilizzo). La quantità nelle Scorte si aggiorna automaticamente.',
            },
        ],
    },

    movimenti: {
        titolo: 'Movimenti — Guida',
        intro:
            'Qui registri ogni entrata e uscita di farmaci dal magazzino. Ogni movimento aggiorna automaticamente la quantità in Scorte.',
        sezioni: [
            {
                titolo: 'Carico (entrata)',
                testo:
                    'Registra l\'arrivo di nuove confezioni in magazzino. Seleziona la confezione, inserisci la quantità ricevuta e la data, poi salva. La scorta viene incrementata.',
            },
            {
                titolo: 'Scarico (uscita)',
                testo:
                    'Registra l\'utilizzo o la consegna di farmaci. Seleziona la confezione, inserisci la quantità prelevata, poi salva. La scorta viene ridotta.',
            },
            {
                titolo: 'Come modificare un movimento',
                testo:
                    'Spunta la riga del movimento, premi "Modifica", correggi i dati e salva. Il sistema aggiusta automaticamente la scorta in base alla variazione.',
            },
            {
                titolo: 'Come eliminare un movimento',
                testo:
                    'Spunta una o più righe e premi "Elimina". Anche in questo caso la scorta viene ricalcolata. È richiesta conferma prima di procedere.',
            },
            {
                titolo: 'Storico',
                testo:
                    'Tutti i movimenti sono visibili nella tabella. Puoi filtrare per data o per tipo (carico/scarico) usando i campi in alto.',
            },
        ],
    },

    terapie: {
        titolo: 'Terapie Attive — Guida',
        intro:
            'In questa sezione inserisci e gestisci le terapie farmacologiche in corso per ogni ospite: farmaco somministrato, dose, frequenza e periodo di trattamento.',
        sezioni: [
            {
                titolo: 'Come aggiungere una terapia',
                testo:
                    'Premi "Aggiungi", seleziona l\'ospite e il farmaco, inserisci dose e numero di somministrazioni giornaliere, imposta la data di inizio. La data di fine è opzionale. Premi "Salva terapia".',
            },
            {
                titolo: 'Dose e somministrazioni',
                testo:
                    '"Dose per somministrazione" è la quantità da dare ogni volta (es. 1 compressa, 5 ml). "Somministrazioni giornaliere" è quante volte al giorno va somministrata (es. 3 volte al giorno).',
            },
            {
                titolo: 'Modificare una terapia',
                testo:
                    'Spunta la riga, premi "Modifica", correggi i dati e premi "Salva modifica". Tutte le modifiche vengono tracciate nel registro Audit.',
            },
            {
                titolo: 'Disattivare una terapia',
                testo:
                    'Quando un trattamento termina, seleziona la riga e usa "Elimina" per disattivare la terapia. La terapia non viene cancellata definitivamente ma marcata come terminata.',
            },
            {
                titolo: 'Terapie scadute',
                testo:
                    'Le terapie con data di fine superata vengono evidenziate. Controlla questa sezione periodicamente per mantenere l\'elenco aggiornato.',
            },
        ],
    },

    promemoria: {
        titolo: 'Promemoria — Guida',
        intro:
            'I promemoria ti ricordano le attività quotidiane legate alle terapie e alla gestione degli ospiti. Possono essere generati automaticamente o inseriti manualmente.',
        sezioni: [
            {
                titolo: 'Cosa sono i promemoria?',
                testo:
                    'Sono avvisi collegati a un ospite o a una terapia. Per esempio: "Somministrare Tachipirina alle 08:00 a Mario Rossi". Compaiono nella lista appena è il momento di agire.',
            },
            {
                titolo: 'Segnare un promemoria come completato',
                testo:
                    'Spunta la casellina a sinistra del promemoria, poi premi "Segna completato". Il promemoria sparirà dalla lista attiva e verrà archiviato.',
            },
            {
                titolo: 'Aggiungere un promemoria manuale',
                testo:
                    'Premi "Aggiungi", seleziona l\'ospite (se applicabile), scrivi il testo del promemoria e imposta la data/ora. Premi "Salva".',
            },
            {
                titolo: 'Promemoria scaduti',
                testo:
                    'I promemoria non completati entro l\'orario previsto vengono evidenziati in rosso. Gestiscili al più presto e poi segnali come completati.',
            },
            {
                titolo: 'Notifiche',
                testo:
                    'Se il browser ha il permesso di inviare notifiche, riceverai un avviso anche quando l\'applicazione è in background. Puoi gestire questo permesso nelle Impostazioni del browser.',
            },
        ],
    },

    audit: {
        titolo: 'Registro Operazioni — Guida',
        intro:
            'Il Registro Operazioni (Audit) è un pannello in sola lettura che mostra tutto quello che è stato fatto nell\'applicazione: chi ha fatto cosa e quando.',
        sezioni: [
            {
                titolo: 'A cosa serve?',
                testo:
                    'Serve a verificare la tracciabilità delle operazioni: aggiunte, modifiche e cancellazioni di farmaci, terapie, ospiti e movimenti. È uno strumento di controllo, non di lavoro quotidiano.',
            },
            {
                titolo: 'Come leggere il registro',
                testo:
                    'Ogni riga mostra: data e ora, tipo di operazione (creazione, modifica, cancellazione), nome del dato modificato e utente che ha eseguito l\'operazione.',
            },
            {
                titolo: 'Filtrare per data o tipo',
                testo:
                    'Usa i campi in alto per filtrare le voci per periodo o per tipo di operazione. Premi "Applica" per aggiornare la lista.',
            },
            {
                titolo: 'Non trovo un\'operazione',
                testo:
                    'Il registro conserva le operazioni degli ultimi 90 giorni. Per operazioni più vecchie è necessario contattare l\'amministratore di sistema.',
            },
        ],
    },

    impostazioni: {
        titolo: 'Impostazioni — Guida',
        intro:
            'In questa sezione puoi gestire il tuo profilo utente, cambiare la password e configurare le preferenze dell\'applicazione.',
        sezioni: [
            {
                titolo: 'Cambiare la password',
                testo:
                    'Vai al pannello "Profilo", inserisci la password attuale e quella nuova (almeno 8 caratteri), poi premi "Salva password".',
            },
            {
                titolo: 'Importare dati da CSV',
                testo:
                    'Se devi caricare dati in blocco (ospiti, farmaci, terapie), usa la funzione "Importa CSV". Scarica il modello, compila il file con i dati e caricalo. L\'applicazione ti mostrerà un\'anteprima prima di salvare.',
            },
            {
                titolo: 'Sincronizzazione',
                testo:
                    'Il pannello di sincronizzazione mostra lo stato della connessione con il server remoto. Se ci sono errori di sincronizzazione, contatta l\'amministratore.',
            },
            {
                titolo: 'Ruolo utente',
                testo:
                    'Il ruolo (operatore o amministratore) determina cosa puoi fare nell\'applicazione. Solo gli amministratori possono creare nuovi utenti e accedere a tutte le funzioni avanzate.',
            },
        ],
    },
}

/**
 * Elenco ordinato delle sezioni per la visualizzazione del Manuale completo.
 */
export const manualeSezioni = [
    { key: 'home', etichetta: 'Cruscotto' },
    { key: 'farmaci', etichetta: 'Farmaci' },
    { key: 'ospiti', etichetta: 'Ospiti' },
    { key: 'stanze', etichetta: 'Stanze e Letti' },
    { key: 'scorte', etichetta: 'Scorte' },
    { key: 'movimenti', etichetta: 'Movimenti' },
    { key: 'terapie', etichetta: 'Terapie' },
    { key: 'promemoria', etichetta: 'Promemoria' },
    { key: 'audit', etichetta: 'Registro Operazioni' },
    { key: 'impostazioni', etichetta: 'Impostazioni' },
]
