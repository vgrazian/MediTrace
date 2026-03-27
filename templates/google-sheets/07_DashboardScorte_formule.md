# Formule Iniziali Per `DashboardScorte`

Queste formule sono pensate per Google Sheets con separatore `;` e per il template attuale dei fogli MediTrace.

## Modalita' Consigliata: Apps Script

Per ridurre drasticamente il numero di formule, usare `apps-script/MediTraceAutomation.gs` ed eseguire `runMediTraceRefresh`.

Con questa modalita':

- `DashboardScorte` viene rigenerato senza formule di calcolo distribuite
- `Ordini` riceve suggerimenti automatici senza formule complesse
- la logica resta in un solo punto, quindi e' piu' semplice da mantenere

Le formule sotto restano disponibili come fallback senza script.

## Preparazione

1. Importare tutti i CSV del template.
2. Aprire il foglio `DashboardScorte`.
3. Lasciare la riga 1 come intestazione.
4. Incollare le formule sotto indicate nelle celle della riga 2.
5. Nascondere le colonne `K`, `L` e `M` dopo avere verificato il risultato.

## Colonne Visibili

### `A2` - principio_attivo

```gs
=ARRAYFORMULA(IF($L2:$L="";"";IFERROR(VLOOKUP($L2:$L;CatalogoFarmaci!$A:$B;2;FALSE);"")))
```

### `B2` - nome_commerciale

```gs
=ARRAYFORMULA(IF($K2:$K="";"";ConfezioniMagazzino!$C$2:$C))
```

### `C2` - dosaggio

```gs
=ARRAYFORMULA(IF($K2:$K="";"";ConfezioniMagazzino!$D$2:$D))
```

### `D2` - scadenza

```gs
=ARRAYFORMULA(IF($K2:$K="";"";ConfezioniMagazzino!$H$2:$H))
```

### `E2` - quantita_attuale

```gs
=ARRAYFORMULA(IF($K2:$K="";"";ConfezioniMagazzino!$J$2:$J))
```

### `F2` - consumo_medio_settimanale

Questa formula somma i consumi medi settimanali di tutte le terapie attive collegate allo stesso `drug_id`.

```gs
=ARRAYFORMULA(IF($L2:$L="";"";IFERROR(VLOOKUP($L2:$L;QUERY(TerapieAttive!$C$2:$M;"select C,sum(H) where K = TRUE group by C label sum(H) ''";0);2;FALSE);0)))
```

### `G2` - residuo_post_settimana

```gs
=ARRAYFORMULA(IF($K2:$K="";"";IF($E2:$E="";"";$E2:$E-$F2:$F)))
```

### `H2` - copertura_settimane

```gs
=ARRAYFORMULA(IF($K2:$K="";"";IF($F2:$F>0;ROUND($E2:$E/$F2:$F;2);"")))
```

### `I2` - stato_scorta

Ordine logico:

- `ESAURITO` se la quantita' e' zero o negativa
- `URGENTE` se la quantita' e' sotto soglia
- `ATTENZIONE` se la scadenza e' entro 30 giorni
- `ATTENZIONE` se la copertura e' inferiore a 2 settimane
- `OK` negli altri casi

```gs
=ARRAYFORMULA(IF($K2:$K="";"";IF($E2:$E<=0;"ESAURITO";IF(($M2:$M<>"")*($E2:$E<=$M2:$M);"URGENTE";IF(($D2:$D<>"")*($D2:$D<=TODAY()+30);"ATTENZIONE";IF(($H2:$H<>"")*($H2:$H<2);"ATTENZIONE";"OK"))))))
```

### `J2` - ordine_aperto

Restituisce `SI` se esiste almeno un ordine aperto per quella confezione o per quel farmaco.

```gs
=ARRAYFORMULA(IF($K2:$K="";"";IF((COUNTIF(IFERROR(FILTER(Ordini!$C$2:$C;Ordini!$G$2:$G="DA_ORDINARE");{});$K2:$K)+COUNTIF(IFERROR(FILTER(Ordini!$B$2:$B;Ordini!$G$2:$G="DA_ORDINARE");{});$L2:$L))>0;"SI";"NO")))
```

## Colonne Di Supporto Da Nascondere

### `K2` - stock_item_id

```gs
=ARRAYFORMULA(IF(ConfezioniMagazzino!$A$2:$A="";"";ConfezioniMagazzino!$A$2:$A))
```

### `L2` - drug_id

```gs
=ARRAYFORMULA(IF(ConfezioniMagazzino!$B$2:$B="";"";ConfezioniMagazzino!$B$2:$B))
```

### `M2` - soglia_riordino

```gs
=ARRAYFORMULA(IF(ConfezioniMagazzino!$K$2:$K="";"";ConfezioniMagazzino!$K$2:$K))
```

## Formattazione Condizionale Consigliata

Applicare sul range `A2:J`.

### Rosso per esaurito

Formula personalizzata:

```gs
=$I2="ESAURITO"
```

### Giallo per attenzione

Formula personalizzata:

```gs
=$I2="ATTENZIONE"
```

### Arancione per urgente

Formula personalizzata:

```gs
=$I2="URGENTE"
```

## Nota Operativa

Questo assetto usa `ConfezioniMagazzino` come sorgente di righe. Quindi `DashboardScorte` mostra una riga per confezione/scadenza, che e' il comportamento piu' vicino all'Excel attuale.
