# UI Color Policy (MediTrace)

## Palette ufficiale

Usare questa combinazione per tutte le superfici applicative (UI, card, nav, call-to-action):

- Blu scuro brand: `#223564`, `#1e315c`, `#162545`
- Azzurro chiaro supporto: `#eaf2fc`, `#edf3fb`, `#dfeafb`
- Bianco/pannelli: `#ffffff`, `#f7fbff`
- Testo principale: `#1a2e4f`

## Regola operativa

- I toni verdi NON sono ammessi nelle superfici applicative MediTrace.
- Eccezione: asset istituzionali esterni/loghi originali (quando richiesti dal brand source).

## Valori verdi bloccati (storici)

Non reintrodurre questi valori nel codice UI:

- `#0f766e`
- `#115e59`
- `#14532d`
- `#10b981`
- `#16a34a`
- `#22c55e`
- `#15803d`
- `#dcfce7`
- `#bbf7d0`
- `#86efac`
- `#4ade80`

## Verifica automatica

Eseguire:

```bash
npm --prefix pwa run check:palette
```

La pipeline `test` include il controllo palette prima di unit ed E2E.
