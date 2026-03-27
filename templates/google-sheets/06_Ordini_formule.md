# Formule Iniziali Per `Ordini`

Questo file propone due modalita'.

- Modalita' consigliata: Apps Script (meno formule e manutenzione piu' semplice)
- Modalita' fallback: formule nel foglio `Ordini`

## Modalita' Consigliata: Apps Script

Usare `apps-script/MediTraceAutomation.gs` e lanciare `runMediTraceRefresh`.

Effetto:

1. aggiorna `DashboardScorte`
2. crea in `Ordini` solo i suggerimenti automatici mancanti
3. evita duplicati di ordini aperti per lo stesso farmaco/confezione

## Modalita' Fallback: Formule

Se non usi Apps Script, puoi popolare `Ordini` da `DashboardScorte`.

Nota: la formula di `B2` popola automaticamente sia `B` che `C`.

### `A2` - order_id

```gs
=ARRAYFORMULA(IF(B2:B="";"";"ord-auto-"&SUBSTITUTE(C2:C;" ";"-")&"-"&TEXT(ROW(B2:B)-1;"00000")))
```

### `B2` - drug_id

```gs
=ARRAYFORMULA(IFERROR(QUERY(DashboardScorte!$A$2:$M;"select L, K where (I = 'URGENTE' or I = 'ATTENZIONE') and J = 'NO' and L is not null";0);""))
```

### `C2` - stock_item_id

```gs
=Formula non necessaria. La colonna `C` viene riempita automaticamente dalla formula in `B2`.
```

### `D2` - quantita_suggerita

Formula di calcolo: `max(1; arrotonda_per_eccesso(soglia + 2 settimane di consumo - quantita_attuale))`.

```gs
=ARRAYFORMULA(IF(C2:C="";"";IFERROR(IF((XLOOKUP(C2:C;DashboardScorte!$K:$K;DashboardScorte!$M:$M;0)+2*XLOOKUP(C2:C;DashboardScorte!$K:$K;DashboardScorte!$F:$F;0)-XLOOKUP(C2:C;DashboardScorte!$K:$K;DashboardScorte!$E:$E;0))<1;1;ROUNDUP(XLOOKUP(C2:C;DashboardScorte!$K:$K;DashboardScorte!$M:$M;0)+2*XLOOKUP(C2:C;DashboardScorte!$K:$K;DashboardScorte!$F:$F;0)-XLOOKUP(C2:C;DashboardScorte!$K:$K;DashboardScorte!$E:$E;0);0));1)))
```

### `E2` - motivo

```gs
=ARRAYFORMULA(IF(B2:B="";"";"AUTO: suggerito da DashboardScorte"))
```

### `F2` - priorita

```gs
=ARRAYFORMULA(IF(C2:C="";"";IF(IFERROR(XLOOKUP(C2:C;DashboardScorte!$K:$K;DashboardScorte!$I:$I;"ATTENZIONE")="URGENTE";FALSE);"URGENTE";"ALTA")))
```

### `G2` - stato

```gs
=ARRAYFORMULA(IF(B2:B="";"";"DA_ORDINARE"))
```

### `H2` - fornitore

```gs
=ARRAYFORMULA(IF(B2:B="";"";""))
```

### `I2` - created_at

```gs
=ARRAYFORMULA(IF(B2:B="";"";TEXT(NOW();"yyyy-mm-dd\"T\"hh:mm:ss")))
```

### `J2` - updated_at

```gs
=ARRAYFORMULA(IF(B2:B="";"";TEXT(NOW();"yyyy-mm-dd\"T\"hh:mm:ss")))
```

## Nota Importante

La modalita' formule e' piu' fragile. Per produzione e' preferibile lo script, che centralizza la logica e riduce formule duplicate.
