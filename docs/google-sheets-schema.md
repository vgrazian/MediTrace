# Schema Reale Dei Fogli Google

## Obiettivo

Questo schema traduce l'Excel attuale in un set di fogli Google stabili, sincronizzabili e leggibili. Il punto chiave e' separare tre concetti che oggi stanno nella stessa riga:

- anagrafica del farmaco
- giacenza reale per nome commerciale, dosaggio e scadenza
- consumo nel tempo

Nel file Excel attuale ogni riga rappresenta di fatto una confezione o una giacenza distinta, perche' lo stesso principio attivo puo' avere:

- nomi commerciali diversi
- dosaggi diversi
- scadenze diverse
- unita' diverse come compresse o gocce

Le colonne settimanali dell'Excel non vanno replicate come nuove colonne nel database. Devono diventare righe di eventi o essere ricostruite da una vista di riepilogo.

## Workbook Proposto

Il file Google Sheets principale deve contenere questi fogli:

1. `CatalogoFarmaci`
2. `ConfezioniMagazzino`
3. `Ospiti`
4. `Operatori`
5. `TerapieAttive`
6. `PromemoriaSomministrazioni`
7. `Movimenti`
8. `Ordini`
9. `DashboardScorte`
10. `SyncLog`
11. `AuditLogCentrale`

## 1. Foglio `CatalogoFarmaci`

Una riga per principio attivo. Serve a normalizzare i farmaci indipendentemente dal nome commerciale.

| Colonna | Tipo | Obbligatoria | Note |
|---|---|---|---|
| `drug_id` | testo | si | UUID generato dall'app |
| `principio_attivo` | testo | si | chiave umana principale |
| `classe_terapeutica` | testo | no | opzionale |
| `scorta_minima_default` | numero | si | soglia di default per alert |
| `fornitore_preferito` | testo | no | deposito, farmacia, altro |
| `note` | testo | no | uso interno |
| `updated_at` | timestamp UTC | si | ultima modifica |
| `deleted_at` | timestamp UTC | no | cancellazione logica |

Esempio:

| `drug_id` | `principio_attivo` | `scorta_minima_default` |
|---|---|---|
| `drug-metformina` | `Metformina` | `30` |
| `drug-allopurinolo` | `Allopurinolo` | `20` |

## 2. Foglio `ConfezioniMagazzino`

Una riga per confezione realmente gestita. Qui si rappresentano nome commerciale, dosaggio, forma e scadenza. Questo e' il foglio che sostituisce la logica della riga Excel attuale.

| Colonna | Tipo | Obbligatoria | Note |
|---|---|---|---|
| `stock_item_id` | testo | si | UUID della giacenza specifica |
| `drug_id` | testo | si | riferimento a `CatalogoFarmaci` |
| `nome_commerciale` | testo | si | es. Zyloric, Torvast |
| `dosaggio` | testo | si | es. 300 mg, 50 mg/200 mg/25 mg |
| `forma` | testo | si | compressa, capsula, gocce, flacone |
| `unita_misura` | testo | si | compresse, gocce, ml, unita' |
| `lotto` | testo | no | se disponibile |
| `scadenza` | data | no | puo' essere mese/anno se il dato nasce cosi' |
| `quantita_iniziale` | numero | si | quantita' caricata inizialmente |
| `quantita_attuale` | numero | si | cache aggiornata da app o formula |
| `soglia_riordino` | numero | si | puo' ereditare da farmaco |
| `copertura_settimane` | numero | no | formula o calcolo server |
| `stato_scorta` | testo | si | `OK`, `ATTENZIONE`, `URGENTE`, `ESAURITO` |
| `updated_at` | timestamp UTC | si | ultima modifica |
| `deleted_at` | timestamp UTC | no | cancellazione logica |

Note operative:

- righe diverse per stessa molecola se cambiano `nome_commerciale`, `dosaggio` o `scadenza`
- `quantita_attuale` non va inserita a mano se l'app e' in uso: deve derivare dai movimenti o essere aggiornata dal middleware
- quando la quantita' arriva a zero non si cancella la riga: si marca `stato_scorta = ESAURITO` o si compila `deleted_at`

Esempi presi dall'Excel:

| `stock_item_id` | `drug_id` | `nome_commerciale` | `dosaggio` | `scadenza` | `quantita_attuale` |
|---|---|---|---|---|---|
| `stock-allo-2026-12` | `drug-allopurinolo` | `Zyloric` | `300 mg` | `2026-12-31` | `30` |
| `stock-allo-2028-12` | `drug-allopurinolo` | `Zyloric` | `300 mg` | `2028-12-31` | `15` |
| `stock-biktarvy-2027-02-a` | `drug-bictegravir-emtricitabina-tenofovir` | `Biktarvy` | `50 mg/200 mg/25 mg` | `2027-02-28` | `30` |

## 3. Foglio `Ospiti`

Una riga per ospite in cura. Per minimizzare i dati personali si usa un codice e, se utile, solo le iniziali.

| Colonna | Tipo | Obbligatoria | Note |
|---|---|---|---|
| `guest_id` | testo | si | UUID o codice interno |
| `codice_interno` | testo | si | identificativo usato nel lavoro quotidiano |
| `iniziali` | testo | si | evitare nome completo nel cloud |
| `casa_alloggio` | testo | si | Casa A, Casa B o nome interno |
| `attivo` | booleano | si | in carico o no |
| `note_essenziali` | testo | no | minimo indispensabile |
| `updated_at` | timestamp UTC | si | ultima modifica |
| `deleted_at` | timestamp UTC | no | cancellazione logica |

Volume atteso iniziale:

- 12 ospiti totali nelle due case alloggio
- circa 7 ospiti con terapie attive oggi

## 4. Foglio `Operatori`

Una riga per operatore autorizzato ad agire su terapia e somministrazioni.

| Colonna | Tipo | Obbligatoria | Note |
|---|---|---|---|
| `operator_id` | testo | si | UUID |
| `codice_operatore` | testo | si | univoco, breve, usabile su tablet |
| `nome_visualizzato` | testo | si | nome/cognome o forma concordata |
| `attivo` | booleano | si | abilitato/disabilitato |
| `ruolo` | testo | no | es. infermiere, volontario, coordinatore |
| `created_at` | timestamp UTC | si | creazione |
| `updated_at` | timestamp UTC | si | ultima modifica |

Regola operativa:

- in app l'operatore deve poter selezionare il proprio nominativo o aggiungerlo se autorizzato

## 5. Foglio `TerapieAttive`

Una riga per terapia attiva di un ospite. Questo foglio sostituisce il calcolo implicito dei consumi settimanali che oggi viene annotato direttamente sulle righe di magazzino.

| Colonna | Tipo | Obbligatoria | Note |
|---|---|---|---|
| `therapy_id` | testo | si | UUID |
| `guest_id` | testo | si | riferimento a `Ospiti` |
| `drug_id` | testo | si | riferimento a `CatalogoFarmaci` |
| `stock_item_id_preferito` | testo | no | se si vuole legare a una confezione specifica |
| `dose_per_somministrazione` | numero/testo | si | es. 1 compressa, 10 gocce |
| `unita_dose` | testo | si | compressa, gocce, ml |
| `somministrazioni_giornaliere` | numero | si | es. 1, 2, 3 |
| `consumo_medio_settimanale` | numero | si | base per riordino |
| `ultima_revisione_by` | testo | no | nome visualizzato operatore |
| `ultima_revisione_by_id` | testo | no | riferimento a `Operatori` |
| `data_inizio` | data | si | inizio terapia |
| `data_fine` | data | no | se prevista |
| `attiva` | booleano | si | terapia aperta o chiusa |
| `note` | testo | no | minimo indispensabile |
| `updated_at` | timestamp UTC | si | ultima modifica |

Regola utile:

- `consumo_medio_settimanale` deve essere salvato esplicitamente, anche se ricavabile, per evitare ambiguita' su gocce, mezze compresse o schemi non lineari

## 6. Foglio `PromemoriaSomministrazioni`

Una riga per promemoria terapia pianificato o eseguito.

| Colonna | Tipo | Obbligatoria | Note |
|---|---|---|---|
| `reminder_id` | testo | si | UUID |
| `guest_id` | testo | si | riferimento a `Ospiti` |
| `therapy_id` | testo | si | riferimento a `TerapieAttive` |
| `drug_id` | testo | si | riferimento a `CatalogoFarmaci` |
| `scheduled_at` | timestamp UTC | si | orario previsto |
| `stato` | testo | si | `DA_ESEGUIRE`, `SOMMINISTRATO`, `POSTICIPATO`, `SALTATO` |
| `eseguito_at` | timestamp UTC | no | quando chiuso |
| `operatore` | testo | no | nome visualizzato |
| `operatore_id` | testo | no | riferimento a `Operatori` |
| `note` | testo | no | motivazione o annotazioni |
| `updated_at` | timestamp UTC | si | ultima modifica |

Note operative:

- il foglio supporta alert lato app per pazienti/farmaci da somministrare
- ogni cambio stato deve essere tracciato anche in `AuditLogCentrale`

## 7. Foglio `Movimenti`

Una riga per evento di magazzino. Questo e' il foglio storico principale e sostituisce le colonne settimanali dell'Excel.

| Colonna | Tipo | Obbligatoria | Note |
|---|---|---|---|
| `movement_id` | testo | si | UUID |
| `stock_item_id` | testo | si | riferimento a `ConfezioniMagazzino` |
| `drug_id` | testo | si | denormalizzazione utile per report |
| `guest_id` | testo | no | valorizzato per scarichi verso ospite |
| `tipo_movimento` | testo | si | `CARICO`, `SCARICO`, `RETTIFICA`, `SCARTO` |
| `quantita` | numero | si | positiva |
| `unita_misura` | testo | si | compresse, gocce, ml |
| `causale` | testo | si | somministrazione, inventario, approvvigionamento |
| `data_movimento` | data | si | data operativa |
| `settimana_riferimento` | testo | no | es. `2026-W13` |
| `operatore` | testo | si | iniziali o codice operatore |
| `operatore_id` | testo | no | riferimento a `Operatori` |
| `source` | testo | si | `APP`, `IMPORT_XLS`, `SCRIPT` |
| `updated_at` | timestamp UTC | si | ultima modifica |

Questo foglio permette di ricostruire:

- il consumo settimanale per farmaco
- il residuo per confezione/scadenza
- il consumo per ospite, senza esporre nomi completi
- lo storico reale, che nell'Excel oggi si perde quando una riga viene cancellata a zero

## 8. Foglio `Ordini`

Una riga per fabbisogno o ordine reale.

| Colonna | Tipo | Obbligatoria | Note |
|---|---|---|---|
| `order_id` | testo | si | UUID |
| `drug_id` | testo | si | riferimento a `CatalogoFarmaci` |
| `stock_item_id` | testo | no | se l'ordine riguarda un brand/dosaggio specifico |
| `quantita_suggerita` | numero | si | calcolo sistema o input operatore |
| `motivo` | testo | si | sotto soglia, scadenza vicina, nuova terapia |
| `priorita` | testo | si | `BASSA`, `MEDIA`, `ALTA`, `URGENTE` |
| `stato` | testo | si | `DA_ORDINARE`, `ORDINATO`, `RICEVUTO`, `ANNULLATO` |
| `fornitore` | testo | no | deposito, farmacia, altro |
| `created_at` | timestamp UTC | si | creazione |
| `updated_at` | timestamp UTC | si | ultima modifica |

## 9. Foglio `DashboardScorte`

Foglio di lettura, non di input manuale. Serve a mantenere una vista familiare simile all'Excel, ma generata dai dati normalizzati.

Colonne consigliate:

| Colonna |
|---|
| `principio_attivo` |
| `nome_commerciale` |
| `dosaggio` |
| `scadenza` |
| `quantita_attuale` |
| `consumo_medio_settimanale` |
| `residuo_post_settimana` |
| `copertura_settimane` |
| `stato_scorta` |
| `ordine_aperto` |

Questo foglio puo' colorare le righe come oggi:

- giallo quando il residuo stimato e' inferiore al consumo medio settimanale
- rosso quando `quantita_attuale <= 0`
- arancione quando la scadenza e' ravvicinata

## 10. Foglio `SyncLog`

Una riga per esecuzione di sincronizzazione o errore middleware.

| Colonna | Tipo | Obbligatoria | Note |
|---|---|---|---|
| `log_id` | testo | si | UUID |
| `timestamp` | timestamp UTC | si | evento |
| `device_id` | testo | no | client sorgente |
| `azione` | testo | si | `PUSH`, `PULL`, `AUTH_FAIL`, `ERROR` |
| `entity` | testo | no | entita' coinvolta |
| `record_count` | numero | no | numero righe |
| `esito` | testo | si | `OK`, `WARN`, `ERROR` |
| `messaggio` | testo | no | dettagli leggibili |

## 11. Foglio `AuditLogCentrale`

Una riga per evento operativo utente, separato dal log tecnico di sincronizzazione.

| Colonna | Tipo | Obbligatoria | Note |
|---|---|---|---|
| `audit_id` | testo | si | UUID |
| `timestamp` | timestamp UTC | si | evento |
| `operatore` | testo | si | iniziali o codice operatore |
| `operatore_id` | testo | si | riferimento a `Operatori` |
| `azione` | testo | si | `ADD_FARMACO`, `UPDATE_POSOLOGIA`, `UPDATE_TERAPIA`, `PROMEMORIA_ESITO` |
| `entity_type` | testo | si | `Farmaco`, `Terapia`, `Promemoria`, `Ordine` |
| `entity_id` | testo | si | id record coinvolto |
| `patient_id` | testo | no | se pertinente |
| `before_json` | testo | no | snapshot sintetico prima modifica |
| `after_json` | testo | no | snapshot sintetico dopo modifica |
| `esito` | testo | si | `OK`, `WARN`, `ERROR` |
| `source` | testo | si | `APP`, `SCRIPT`, `IMPORT` |
| `updated_at` | timestamp UTC | si | ultima modifica |

## Mappatura Dall'Excel Attuale

| Excel attuale | Nuova destinazione |
|---|---|
| `Principio Attivo` | `CatalogoFarmaci.principio_attivo` |
| `Nome commerciale` | `ConfezioniMagazzino.nome_commerciale` |
| `Dosaggio` | `ConfezioniMagazzino.dosaggio` |
| `Scadenza` | `ConfezioniMagazzino.scadenza` |
| `Quantita'` | `ConfezioniMagazzino.quantita_iniziale` e `quantita_attuale` |
| colonne `Settimana ...` | righe in `Movimenti` aggregate per `settimana_riferimento` |
| `Resto` | calcolo da `ConfezioniMagazzino.quantita_attuale` |
| cancellazione della riga a zero | mantenimento riga con stato `ESAURITO` |
| promemoria somministrazione non presente | `PromemoriaSomministrazioni` |
| tracciamento modifiche operatore non presente | `AuditLogCentrale` |
| anagrafica operatori non presente | `Operatori` |

## Regole Di Calcolo

1. `quantita_attuale = quantita_iniziale + carichi - scarichi +/- rettifiche`.
2. `consumo_medio_settimanale` deriva prima di tutto da `TerapieAttive`; in assenza di terapia strutturata puo' essere calcolato dai `Movimenti` recenti.
3. `copertura_settimane = quantita_attuale / consumo_medio_settimanale` quando il consumo e' maggiore di zero.
4. lo stato passa a `URGENTE` quando la copertura e' inferiore a una settimana o la quantita' e' sotto soglia.
5. una scadenza vicina deve generare alert anche se la quantita' non e' bassa.

## Importazione Iniziale Dall'Excel

Passi consigliati:

1. deduplicare i principi attivi per creare `CatalogoFarmaci`
2. importare ogni riga non vuota dell'Excel in `ConfezioniMagazzino`
3. tradurre i valori delle colonne settimanali in righe `Movimenti` di tipo `SCARICO`
4. impostare `source = IMPORT_XLS` per distinguere il dato storico
5. non cancellare le righe con resto zero: conservarle per storico e audit
6. creare promemoria iniziali dalle terapie attive per il primo periodo operativo

## Scelte Pragmatiche Per L'MVP

- `DashboardScorte` puo' essere anche un foglio con formule se si vuole leggibilita' immediata per chi oggi usa Excel
- il database logico resta comunque basato su `ConfezioniMagazzino`, `TerapieAttive` e `Movimenti`
- per i farmaci in gocce o unita' non standard conviene salvare sempre l'unita' esplicita e non forzare conversioni all'inizio
- i log centrali devono restare su Sheet per semplicita', ma separati in tecnico (`SyncLog`) e operativo (`AuditLogCentrale`)
- gli eventi clinico-operativi devono usare `operator_id` per tracciabilita' consistente anche se cambia il nome visualizzato
