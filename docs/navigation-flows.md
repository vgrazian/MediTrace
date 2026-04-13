# Flussi di Navigazione MediTrace

Documentazione completa della navigazione globale e dei flussi interni di Aggiungi/Modifica per ciascuna vista.

---

## 1. Navigazione tra Viste Principali

Diagramma della navigazione globale: come l'utente si muove tra le viste principali attraverso la barra di navigazione (AppNav).

```mermaid
graph TD
    Login["Login"]
    Cruscotto["Cruscotto"]

    Farmaci["Farmaci"]
    Ospiti["Ospiti"]
    Stanze["Stanze"]
    Scorte["Scorte"]
    Movimenti["Movimenti"]
    Terapie["Terapie"]
    Promemoria["Promemoria"]
    Audit["Audit"]
    Informazioni["Informazioni"]
    Impostazioni["Impostazioni"]
    Manuale["Manuale"]
    Help["Help"]

    Logout["Logout"]

    Login -->|Autenticazione| Cruscotto

    Cruscotto -->|AppNav| Farmaci
    Cruscotto -->|AppNav| Ospiti
    Cruscotto -->|AppNav| Stanze
    Cruscotto -->|AppNav| Scorte
    Cruscotto -->|AppNav| Movimenti
    Cruscotto -->|AppNav| Terapie
    Cruscotto -->|AppNav| Promemoria
    Cruscotto -->|AppNav| Audit
    Cruscotto -->|AppNav| Informazioni
    Cruscotto -->|AppNav| Impostazioni
    Cruscotto -->|AppNav| Manuale
    Cruscotto -->|AppNav| Help

    Farmaci -->|AppNav| Cruscotto
    Ospiti -->|AppNav| Cruscotto
    Stanze -->|AppNav| Cruscotto
    Scorte -->|AppNav| Cruscotto
    Movimenti -->|AppNav| Cruscotto
    Terapie -->|AppNav| Cruscotto
    Promemoria -->|AppNav| Cruscotto
    Audit -->|AppNav| Cruscotto
    Informazioni -->|AppNav| Cruscotto
    Impostazioni -->|AppNav| Cruscotto
    Manuale -->|AppNav| Cruscotto
    Help -->|AppNav| Cruscotto

    Cruscotto -->|Logout| Logout
    Farmaci -->|Logout| Logout
    Ospiti -->|Logout| Logout
    Stanze -->|Logout| Logout
    Scorte -->|Logout| Logout
    Movimenti -->|Logout| Logout
    Terapie -->|Logout| Logout
    Promemoria -->|Logout| Logout
    Audit -->|Logout| Logout
    Informazioni -->|Logout| Logout
    Impostazioni -->|Logout| Logout
    Manuale -->|Logout| Logout
    Help -->|Logout| Logout

    Logout -->|Termina sessione| Login
```

**Flusso Principale:**
- Utente fa login -> accesso a Cruscotto (home dashboard).
- Dalla barra di navigazione (AppNav), accede a qualsiasi vista.
- Da qualsiasi vista, torna al Cruscotto o accede direttamente alle altre viste.
- Pulsante Logout disponibile ovunque -> logout e ritorno a login.

---

## 2. Flussi Interni: Aggiungi/Modifica per Ciascuna Vista

Diagrammi separati per vista, con i flussi effettivi del codice.

Legenda traduzioni usata nei diagrammi:
- Save = Salva
- Cancel = Elimina
- Undo = Annulla Operazione
- Form = Modulo

### Farmaci

```mermaid
graph TD
  ListaFarmaci["Lista Farmaci"] -->|Aggiungi| ModuloNuovoFarmaco["Modulo Nuovo Farmaco"]
  ModuloNuovoFarmaco -->|Salva| ListaFarmaci
  ModuloNuovoFarmaco -->|Elimina| ListaFarmaci

  ListaFarmaci -->|Modifica riga| ModuloModificaFarmaco["Modulo Modifica Farmaco"]
  ModuloModificaFarmaco -->|Salva| ListaFarmaci
  ModuloModificaFarmaco -->|Elimina| ListaFarmaci

  ListaFarmaci -->|Elimina da lista| EliminaFarmaco["Elimina Farmaco"]
  EliminaFarmaco -->|Annulla Operazione| ListaFarmaci
  EliminaFarmaco -->|Scadenza timer| ListaFarmaci

  ListaFarmaci -->|Verifica vincoli terapia| VerificaTerapieFarmaco["Verifica terapie attive collegate"]
  VerificaTerapieFarmaco -->|Nessuna terapia attiva| EliminaFarmaco
  VerificaTerapieFarmaco -->|Terapie attive presenti| ErroreFarmaco["Errore: farmaco in uso da terapia"]
  ErroreFarmaco --> ListaFarmaci
```

Messaggio errore previsto per il vincolo farmaco-terapia:
- Non e' possibile eliminare il farmaco "xx" in quanto contiene ancora oggetti di tipo terapia attiva (elenco terapie collegate).

### Ospiti

```mermaid
graph TD
  ListaOspiti["Lista Ospiti"] -->|Aggiungi| ModuloNuovoOspite["Modulo Nuovo Ospite"]
  ModuloNuovoOspite -->|Salva| ListaOspiti
  ModuloNuovoOspite -->|Elimina| ListaOspiti

  ListaOspiti -->|Modifica riga| ModuloModificaOspite["Modulo Modifica Ospite"]
  ModuloModificaOspite -->|Salva| ListaOspiti
  ModuloModificaOspite -->|Elimina| ListaOspiti

  ListaOspiti -->|Elimina da lista| EliminaOspite["Elimina Ospite"]
  EliminaOspite -->|Annulla Operazione| ListaOspiti
```

### Stanze

```mermaid
graph TD
  ListaStanze["Lista Stanze e Letti"] -->|Aggiungi stanza| ModuloNuovaStanza["Modulo Nuova Stanza"]
  ModuloNuovaStanza -->|Salva| ListaStanze
  ModuloNuovaStanza -->|Elimina| ListaStanze

  ListaStanze -->|Aggiungi letto| ModuloNuovoLetto["Modulo Nuovo Letto"]
  ModuloNuovoLetto -->|Salva| ListaStanze
  ModuloNuovoLetto -->|Elimina| ListaStanze

  ListaStanze -->|Modifica letto| ModuloModificaLetto["Modulo Modifica Letto"]
  ModuloModificaLetto -->|Salva| ListaStanze
  ModuloModificaLetto -->|Elimina| ListaStanze

  ListaStanze -->|Elimina letto| EliminaLetto["Elimina Letto"]
  EliminaLetto -->|Annulla Operazione| ListaStanze

  ListaStanze -->|Elimina stanza| VerificaContenuti["Verifica contenuti stanza"]
  VerificaContenuti -->|Nessun letto contenuto| EliminaStanza["Elimina Stanza"]
  EliminaStanza -->|Annulla Operazione| ListaStanze
  VerificaContenuti -->|Contiene letti| ErroreBlocco["Errore: eliminazione non consentita"]
  ErroreBlocco --> ListaStanze
```

Messaggio errore previsto per il vincolo CRUD parent-child:
- Non e' possibile eliminare xx in quanto contiene ancora oggetti di tipo yyy (elenco degli oggetti contenuti).

### Scorte

```mermaid
graph TD
  ListaScorte["Lista Scorte"] -->|Prepara ordine| GeneraBozza["Genera Bozza"]
  GeneraBozza --> BozzaOrdine["Bozza Testo Ordine"]
  BozzaOrdine -->|Modifica testo| BozzaOrdine
  BozzaOrdine -->|Copia| CopiaAppunti["Copia Appunti"]
  CopiaAppunti --> ListaScorte
  BozzaOrdine -->|Annulla| ResetBozza["Reset Bozza"]
  ResetBozza --> ListaScorte
```

### Movimenti

```mermaid
graph TD
  ListaMovimenti["Lista Movimenti"] -->|Aggiungi| ModuloNuovoMovimento["Modulo Nuovo Movimento"]
  ModuloNuovoMovimento -->|Salva| ListaMovimenti
  ModuloNuovoMovimento -->|Elimina| ListaMovimenti

  ListaMovimenti -->|Modifica riga| ModuloModificaMovimento["Modulo Modifica Movimento"]
  ModuloModificaMovimento -->|Salva| ListaMovimenti
  ModuloModificaMovimento -->|Elimina| ListaMovimenti

  ListaMovimenti -->|Elimina da lista| EliminaMovimento["Elimina Movimento"]
  EliminaMovimento -->|Annulla Operazione| ListaMovimenti
```

### Terapie

```mermaid
graph TD
  ListaTerapie["Lista Terapie"] -->|Aggiungi| ModuloNuovaTerapia["Modulo Nuova Terapia"]
  ModuloNuovaTerapia -->|Salva| ListaTerapie
  ModuloNuovaTerapia -->|Elimina| ListaTerapie

  ListaTerapie -->|Modifica riga| ModuloModificaTerapia["Modulo Modifica Terapia"]
  ModuloModificaTerapia -->|Salva| ListaTerapie
  ModuloModificaTerapia -->|Elimina| ListaTerapie

  ListaTerapie -->|Elimina da lista| EliminaTerapia["Elimina Terapia"]
  EliminaTerapia -->|Annulla Operazione| ListaTerapie

  ListaTerapie -->|Verifica assegnazione| VerificaOspite["Verifica ospite assegnato"]
  VerificaOspite -->|Nessun ospite attivo assegnato| EliminaTerapia
  VerificaOspite -->|Ospite attivo assegnato| ErroreTerapia["Errore: terapia assegnata a ospite"]
  ErroreTerapia --> ListaTerapie
```

Messaggio errore previsto per il vincolo terapia-ospite:
- Non e' possibile eliminare la terapia "xx" in quanto contiene ancora oggetti di tipo ospite assegnato (elenco assegnazioni).

### Promemoria

```mermaid
graph TD
  ListaPromemoria["Lista Promemoria"] -->|Eseguito| StatoEseguito["Cambio Stato"]
  StatoEseguito --> ListaPromemoria

  ListaPromemoria -->|Posticipato| StatoPosticipato["Cambio Stato"]
  StatoPosticipato --> ListaPromemoria

  ListaPromemoria -->|Saltato| StatoSaltato["Cambio Stato"]
  StatoSaltato --> ListaPromemoria

  ListaPromemoria -->|Modifica riga| ModuloModificaPromemoria["Modulo Modifica Promemoria"]
  ModuloModificaPromemoria -->|Salva| ListaPromemoria
  ModuloModificaPromemoria -->|Elimina| ListaPromemoria

  ListaPromemoria -->|Elimina da lista| EliminaPromemoria["Elimina Promemoria"]
  EliminaPromemoria -->|Annulla Operazione| ListaPromemoria
```

---

## Pattern Riassuntivi

### Pattern CRUD Standard (Farmaci, Ospiti, Movimenti, Terapie)

```text
Lista (read)
  - Aggiungi -> Modulo -> Salva/Elimina -> Lista
  - Click Row -> Modifica -> Modulo -> Salva/Elimina -> Lista
  - Elimina (riga o selezione) -> verifica vincoli -> Annulla Operazione
```

### Pattern Multi-Entity (Stanze)

```text
Lista (read)
  - Aggiungi Stanza -> Modulo -> Salva/Elimina -> Lista
  - Aggiungi Letto -> Modulo -> Salva/Elimina -> Lista
  - Click Letto -> Modifica -> Modulo -> Salva/Elimina -> Lista
  - Elimina Letto -> Annulla Operazione
  - Elimina Stanza -> Verifica contenuti:
      - se contiene letti -> errore con elenco letti
      - se non contiene letti -> elimina -> Annulla Operazione
```

### Pattern Editable Draft (Scorte)

```text
Lista
  - Prepara Ordine -> Bozza -> Modifica -> Copia/Annulla -> Lista
```

### Pattern State-Change (Promemoria)

```text
Lista
  - State Change (Eseguito/Posticipato/Saltato) -> Lista
  - Modifica -> Modulo -> Salva/Elimina -> Lista
  - Elimina (da lista) -> Annulla Operazione
```

---

## Componenti UI Utilizzati

- AppNav.vue: Navigazione globale (viste principali + Logout).
- Pannelli Collapsibili: details HTML per toggle lista/modulo.
- ConfirmDialog.vue: Conferma per azioni distruttive.
- TextArea (Scorte): Bozza ordine modificabile con copia appunti.
- Moduli validati: Validazione, error display, submit handling.

---

## Note Implementative

1. Ogni vista mantiene stato panelMode (list/create/edit).
2. Le azioni di eliminazione usano undo con timeout dove previsto.
3. Vincolo CRUD parent-child in Stanze: una stanza non e' eliminabile se contiene letti non eliminati.
4. In caso di blocco eliminazione stanza, viene mostrato errore con elenco dei letti contenuti.
5. Vincolo CRUD parent-child in Farmaci: un farmaco non e' eliminabile se referenziato da terapie attive.
6. Vincolo CRUD parent-child in Terapie: una terapia non e' eliminabile se assegnata a un ospite attivo.
7. Logout globale disponibile da AppNav.
