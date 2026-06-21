/**
 * Contenuto della guida in linea in italiano, organizzato per sezione dell'applicazione.
 * Ogni sezione ha un titolo, un testo introduttivo e un array di sotto-sezioni.
 */
export const helpContent = {
    home: {
        titolo: 'Cruscotto — Panoramica generale',
        intro:
            'Il Cruscotto mostra in un colpo d\'occhio lo stato della struttura: promemoria del giorno, benvenuto, stato sincronizzazione e navigazione rapida verso le sezioni principali.',
        sezioni: [
            {
                titolo: 'Riepilogo turno di oggi',
                testo:
                    'Mostra i promemoria del giorno suddivisi per stato: eseguiti, da eseguire, posticipati e saltati, con conteggio aggiornato in tempo reale.',
            },
            {
                titolo: 'Stato sincronizzazione',
                testo:
                    'Indica se i dati salvati sul dispositivo sono allineati. La spia Sync nella barra in alto cambia colore: verde = tutto ok, arancione = operazioni in coda, rosso = conflitto.',
            },
            {
                titolo: 'Navigazione rapida',
                testo:
                    'Griglia di collegamenti diretti a tutte le sezioni dell\'applicazione. Clicca su una card per aprire direttamente quella sezione.',
            },
            {
                titolo: 'Versione build e deploy',
                testo:
                    'In fondo alla pagina trovi la data/ora di build e il commit GitHub Pages. Utile per verificare che l\'app sia aggiornata all\'ultima versione.',
            },
        ],
    },

    farmaci: {
        titolo: 'Catalogo Farmaci — Guida',
        intro:
            'Questa sezione contiene l\'elenco di tutti i farmaci registrati nella struttura, con le rispettive confezioni (lotti) disponibili in magazzino. Ogni farmaco può avere più confezioni.',
        sezioni: [
            {
                titolo: 'Cosa sono i farmaci e le confezioni?',
                testo:
                    'Un farmaco è la scheda generale del principio attivo (es. Paracetamolo). Una confezione è la versione specifica in magazzino: ha un nome commerciale (es. Tachipirina 500 mg), un dosaggio, una quantità, una soglia di riordino e una data di scadenza. Ogni farmaco può avere più confezioni. Le confezioni sono quelle che vengono effettivamente somministrate agli ospiti e tracciate nelle scorte.',
            },
            {
                titolo: 'Flusso completo: aggiungere farmaco + confezione',
                testo:
                    'Il flusso consigliato è: (1) clicca "Aggiungi" nella sezione Farmaci registrati, (2) digita il nome del farmaco — il campo ha un autocompletamento che suggerisce i farmaci già presenti nel catalogo, così eviti duplicati, (3) inserisci il principio attivo e la classe terapeutica, (4) clicca "Salva farmaco". Appena salvato, il pannello passa automaticamente alla creazione della confezione con il farmaco già selezionato. (5) Inserisci nome commerciale, dosaggio, quantità, soglia riordino e scadenza, (6) clicca "Aggiungi confezione". La confezione apparirà nella tabella "Confezioni attive" e sarà disponibile per terapie e movimenti.',
            },
            {
                titolo: 'Autocompletamento del nome farmaco',
                testo:
                    'Quando inizi a digitare nel campo "Nome farmaco", appare un menu a tendina con i nomi dei farmaci già presenti in catalogo. Puoi cliccare su un suggerimento per compilare automaticamente il campo. Questo aiuta a non creare duplicati: se il farmaco esiste già, ti basta aggiungere una nuova confezione invece di ricreare il farmaco.',
            },
            {
                titolo: 'Auto-switch alla confezione',
                testo:
                    'Dopo aver salvato un nuovo farmaco, il pannello non si chiude ma passa automaticamente alla modalità "crea confezione" con il farmaco appena creato già selezionato. Puoi così inserire subito la prima confezione senza dover riaprire il pannello e riselezionare il farmaco. Se stai modificando un farmaco esistente, il pannello si chiude normalmente.',
            },
            {
                titolo: 'Come aggiungere una confezione a un farmaco esistente',
                testo:
                    'Nella sezione "Confezioni attive" (seconda metà della pagina), clicca "Aggiungi". Seleziona il farmaco dal menu a tendina, compila Nome commerciale, Dosaggio, Quantità attuale, Soglia riordino e Scadenza, poi premi "Aggiungi confezione". La confezione comparirà nella tabella sottostante.',
            },
            {
                titolo: 'Modificare un farmaco o una confezione',
                testo:
                    'Spunta la casellina a sinistra della riga, poi premi "Modifica" nella barra azioni. Si apre il modulo già compilato: correggi i dati e salva. Puoi modificare un solo elemento alla volta.',
            },
            {
                titolo: 'Eliminare un farmaco o una confezione',
                testo:
                    'Spunta una o più righe e premi "Elimina". Verrà chiesta conferma. Attenzione: se elimini un farmaco, tutte le sue confezioni e terapie associate vengono disattivate. L\'operazione è reversibile dal pannello Audit.',
            },
            {
                titolo: 'Confezione predefinita',
                testo:
                    'Quando un farmaco ha più confezioni attive, puoi spuntare "Confezione predefinita" in fase di creazione o modifica. Questa confezione verrà proposta per prima quando un operatore registra una somministrazione nei Promemoria. La spunta compare solo se il farmaco ha già almeno una confezione.',
            },
            {
                titolo: 'Scorta minima e soglia di riordino',
                testo:
                    'La soglia di riordino è la quantità minima sotto la quale il sistema segnala che è necessario ordinare nuove confezioni. Quando la quantità attuale scende sotto questa soglia, il farmaco viene evidenziato in rosso nella sezione Scorte e nel Cruscotto.',
            },
        ],
    },

    ospiti: {
        titolo: 'Ospiti — Guida',
        intro:
            'In questa sezione gestisci l\'anagrafica degli ospiti della struttura: generalità, residenza assegnata e collegamento con le terapie attive.',
        sezioni: [
            {
                titolo: 'Come aggiungere un ospite',
                testo:
                    'Apri il pannello "Gestione Ospiti", inserisci Nome e Cognome (obbligatori). Il codice interno viene generato automaticamente. Completa i campi opzionali e scegli la residenza, poi salva.',
            },
            {
                titolo: 'Visualizzazione',
                testo:
                    'Gli ospiti sono mostrati in formato "Nome Cognome" (es. Mario Rossi) ordinati per cognome. La tabella mostra Ospite, Residenza e Terapie attive.',
            },
            {
                titolo: 'Pulsante Terapie',
                testo:
                    'Nella colonna Azioni trovi il pulsante "Terapie" che apre la sezione Terapie già filtrata per quell\'ospite, per modificare le terapie assegnate.',
            },
            {
                titolo: 'Modificare i dati di un ospite',
                testo:
                    'Spunta la casellina accanto all\'ospite, premi "Modifica", correggi i dati nel modulo e premi "Salva modifica".',
            },
            {
                titolo: 'Ospiti disattivati',
                testo:
                    'Gli ospiti disattivati vengono nascosti dalla lista principale. Puoi visualizzarli attivando il filtro "Mostra anche disattivati".',
            },
        ],
    },

    stanze: {
        titolo: 'Residenze — Guida',
        intro:
            'Questa sezione permette di gestire le residenze operative in cui lavorano gli operatori e monitorare capienza e posti disponibili.',
        sezioni: [
            {
                titolo: 'Anagrafica residenze',
                testo:
                    'Ogni residenza contiene nome, capienza massima, indirizzo, telefono, email e note operative. In avvio sono preconfigurate: Il Rifugio, Via Bellani e Demo.',
            },
            {
                titolo: 'Come aggiungere una residenza',
                testo:
                    'Apri il pannello "Gestione Residenze", inserisci Nome residenza e Max ospiti, poi salva. La residenza sarà disponibile anche nel filtro Promemoria.',
            },
            {
                titolo: 'Capienza ospiti',
                testo:
                    'La tabella mostra capienza e posti disponibili in tempo reale, calcolati sugli ospiti attivi assegnati alla residenza.',
            },
            {
                titolo: 'Eliminazione e ripristino',
                testo:
                    'Le residenze possono essere disattivate con conferma; in caso di errore è disponibile il comando di annullamento immediato.',
            },
        ],
    },

    scorte: {
        titolo: 'Scorte — Guida',
        intro:
            'La sezione Scorte mostra la situazione del magazzino farmaci: quantità, soglie di riordino, grafico consumi e confezioni in scadenza.',
        sezioni: [
            {
                titolo: 'Cosa vedo in questa pagina?',
                testo:
                    'Una tabella con tutte le confezioni di farmaci in magazzino. In alto trovi il grafico consumi mensili (barre SVG con gli scarichi degli ultimi 6 mesi) e la lista delle confezioni scadute o in scadenza.',
            },
            {
                titolo: 'Grafico consumi',
                testo:
                    'Il grafico a barre mostra il numero di movimenti di scarico per ciascuno degli ultimi 6 mesi. Utile per monitorare l\'andamento dei consumi nel tempo.',
            },
            {
                titolo: 'Confezioni scadute / in scadenza',
                testo:
                    'Una card dedicata elenca tutte le confezioni entro 60 giorni dalla scadenza, con sfondo rosso (scaduta), giallo (in scadenza) o grigio (prossima). Puoi cestinare le confezioni scadute con il pulsante Cestina.',
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
            'In questa sezione inserisci e gestisci le terapie farmacologiche in corso per ogni ospite: farmaco, confezione, dose, frequenza e periodo di trattamento.',
        sezioni: [
            {
                titolo: 'Come aggiungere una terapia',
                testo:
                    'Premi "Aggiungi", seleziona l\'ospite e il farmaco. Puoi opzionalmente scegliere la confezione specifica (per tracciare i consumi per lotto). Inserisci dose e somministrazioni giornaliere, data inizio. Premi "Salva terapia".',
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
            'I promemoria ti ricordano le attività quotidiane legate alle terapie. Puoi segnare l\'esito di ogni somministrazione e ripristinare quelle segnate per errore.',
        sezioni: [
            {
                titolo: 'Cosa sono i promemoria?',
                testo:
                    'Sono avvisi collegati a un ospite e a una terapia. Per esempio: "Somministrare Tachipirina alle 08:00 a Mario Rossi". Compaiono nella lista quando è il momento di agire.',
            },
            {
                titolo: 'Registrare l\'esito',
                testo:
                    'Seleziona uno o più promemoria e premi Eseguito, Posticipato o Saltato. Lo stato viene aggiornato immediatamente. Quando premi Eseguito e il farmaco ha più confezioni attive, ti verrà chiesto di scegliere da quale confezione scaricare la dose.',
            },
            {
                titolo: 'Scelta confezione (batch picker)',
                testo:
                    'Se un farmaco ha più confezioni in magazzino (es. Tachipirina 500 mg e Tachipirina 1000 mg), al momento di registrare Eseguito apparirà una finestra di scelta. Clicca sulla confezione desiderata e premi Conferma. La prima confezione è sempre pre-selezionata. Puoi premere Invio per confermare rapidamente.',
            },
            {
                titolo: 'Ripristina (annulla esito)',
                testo:
                    'Se hai segnato un promemoria per errore, selezionalo e premi "Ripristina". Ti verrà chiesta conferma prima di riportarlo a "Da eseguire". Funziona sia per singoli promemoria che in blocco.',
            },
            {
                titolo: 'Residenza operativa',
                testo:
                    'Il selettore della residenza si trova nella barra di navigazione in alto, accanto al tuo nome utente. Clicca su "Residenza" per scegliere la sede. Il filtro "Residenza operativa" nella scheda Promemoria mostra solo i promemoria della sede selezionata.',
            },
            {
                titolo: 'Colonne della tabella',
                testo:
                    'La tabella mostra: Orario (frequenza giornaliera, es. "08:00 / 20:00"), Ospite, Farmaco, Dose, Stato ed Erogazione. La colonna Orario indica gli orari di somministrazione previsti dalla terapia.',
            },
        ],
    },

    operatori: {
        titolo: 'Operatori — Guida',
        intro:
            'Questa sezione (visibile solo agli amministratori) permette di gestire gli account degli operatori: creazione, modifica profilo, disattivazione e assegnazione ruoli.',
        sezioni: [
            {
                titolo: 'Aggiungere un operatore',
                testo:
                    'Clicca "Aggiungi" per aprire il pannello di creazione. Compila Nome, Cognome, Username, Email e Password iniziale. Scegli il Ruolo (Operatore o Amministratore) e opzionalmente la Residenza predefinita.',
            },
            {
                titolo: 'Residenza predefinita',
                testo:
                    'Ogni operatore può avere una residenza predefinita: "Ultima utilizzata" mantiene l\'ultima residenza attiva, oppure puoi assegnarne una fissa che verrà applicata a ogni login.',
            },
            {
                titolo: 'Modificare un operatore',
                testo:
                    'Clicca "Modifica" sulla riga dell\'operatore per cambiarne Nome, Cognome, Email, Telefono e Ruolo. Puoi modificare il tuo profilo in qualsiasi momento.',
            },
            {
                titolo: 'Disattivare / Eliminare',
                testo:
                    'Puoi disattivare temporaneamente un operatore (Riattiva per ripristinarlo) o eliminarlo definitivamente. L\'eliminazione richiede conferma.',
            },
        ],
    },

    audit: {
        titolo: 'Registro Operazioni — Guida',
        intro:
            'Il Registro Operazioni (Audit) è un pannello in sola lettura che mostra tutto quello che è stato fatto nell\'applicazione: chi ha fatto cosa e quando. Include anche le statistiche di connettività al database Supabase.',
        sezioni: [
            {
                titolo: 'A cosa serve?',
                testo:
                    'Serve a verificare la tracciabilità delle operazioni: aggiunte, modifiche e cancellazioni di farmaci, terapie, ospiti e movimenti. È uno strumento di controllo, non di lavoro quotidiano.',
            },
            {
                titolo: 'Stato Supabase',
                testo:
                    'Il pannello in alto mostra in tempo reale: connessioni attive al database, dimensione occupata, numero di tabelle e una stima del traffico API. Le barre colorate (blu, verde, ambra) indicano il consumo rispetto ai limiti del piano.',
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
                    'Se devi caricare dati in blocco (ospiti, farmaci, terapie), usa la funzione "Importa CSV". Nel Manuale completo trovi file CSV di esempio scaricabili per ogni sorgente supportata. L\'applicazione mostra sempre un\'anteprima prima di salvare.',
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
    { key: 'stanze', etichetta: 'Residenze' },
    { key: 'scorte', etichetta: 'Scorte' },
    { key: 'movimenti', etichetta: 'Movimenti' },
    { key: 'terapie', etichetta: 'Terapie' },
    { key: 'promemoria', etichetta: 'Promemoria' },
    { key: 'operatori', etichetta: 'Operatori' },
    { key: 'audit', etichetta: 'Registro Operazioni' },
    { key: 'impostazioni', etichetta: 'Impostazioni' },
]
