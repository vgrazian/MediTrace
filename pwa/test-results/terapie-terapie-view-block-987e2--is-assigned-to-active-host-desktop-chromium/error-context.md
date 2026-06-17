# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: terapie.spec.js >> terapie view blocks delete when therapy is assigned to active host
- Location: tests/e2e/terapie.spec.js:5:1

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.fill: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByLabel('Consumo medio settimanale')

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - navigation [ref=e4]:
    - generic "MediTrace" [ref=e5]:
      - img "Comunità di Sant'Egidio" [ref=e6]
      - generic [ref=e7]: MediTrace
    - link "Cruscotto" [ref=e8] [cursor=pointer]:
      - /url: "#/"
    - link "Promemoria" [ref=e9] [cursor=pointer]:
      - /url: "#/promemoria"
    - link "Terapie" [ref=e10] [cursor=pointer]:
      - /url: "#/terapie"
    - link "Scorte" [ref=e11] [cursor=pointer]:
      - /url: "#/scorte"
    - link "Movimenti" [ref=e12] [cursor=pointer]:
      - /url: "#/movimenti"
    - link "Ospiti" [ref=e13] [cursor=pointer]:
      - /url: "#/ospiti"
    - link "Farmaci" [ref=e14] [cursor=pointer]:
      - /url: "#/farmaci"
    - link "Residenze" [ref=e15] [cursor=pointer]:
      - /url: "#/residenze"
    - link "Guida" [ref=e16] [cursor=pointer]:
      - /url: "#/manuale"
    - link "Operatori" [ref=e17] [cursor=pointer]:
      - /url: "#/operatori"
    - link "Audit" [ref=e18] [cursor=pointer]:
      - /url: "#/audit"
    - button "Stato sincronizzazione" [ref=e20] [cursor=pointer]:
      - img [ref=e21]
    - generic [ref=e24]:
      - button "Sincronizza" [ref=e25] [cursor=pointer]:
        - img [ref=e26]
      - link "Admin Emergenza" [ref=e29] [cursor=pointer]:
        - /url: "#/impostazioni"
      - link "⚙" [ref=e30] [cursor=pointer]:
        - /url: "#/impostazioni"
      - button "Logout" [ref=e31] [cursor=pointer]
  - main [ref=e32]:
    - generic [ref=e33]:
      - generic [ref=e34]:
        - heading "Terapie Attive" [level=2] [ref=e35]
        - button "Aiuto" [ref=e36] [cursor=pointer]
      - generic [ref=e37]:
        - paragraph [ref=e38]:
          - strong [ref=e39]: Elenco terapie attive
        - paragraph [ref=e40]: Terapie non eliminate presenti nel dataset locale.
        - generic [ref=e41]:
          - generic [ref=e42]:
            - text: Filtra terapie
            - searchbox "Filtra terapie" [ref=e43]
          - paragraph [ref=e44]: 0 risultati su 0
        - generic [ref=e45]:
          - text: Ordina terapie
          - combobox "Ordina terapie" [ref=e46]:
            - option "Ultima modifica" [selected]
            - option "Ospite"
            - option "Farmaco"
            - option "Data inizio"
        - generic [ref=e47]:
          - button "Aggiungi" [ref=e48]
          - button "Modifica" [disabled] [ref=e49]
          - button "Elimina" [disabled] [ref=e50]
          - button "Cerca" [ref=e51]
        - table [ref=e53]:
          - rowgroup [ref=e54]:
            - row "Seleziona tutte le terapie Ospite Farmaco Dose Freq./giorno Inizio Fine Azione" [ref=e55]:
              - columnheader "Seleziona tutte le terapie" [ref=e56]:
                - checkbox "Seleziona tutte le terapie" [ref=e57]
              - columnheader "Ospite" [ref=e58]
              - columnheader "Farmaco" [ref=e59]
              - columnheader "Dose" [ref=e60]
              - columnheader "Freq./giorno" [ref=e61]
              - columnheader "Inizio" [ref=e62]
              - columnheader "Fine" [ref=e63]
              - columnheader "Azione" [ref=e64]
          - rowgroup [ref=e65]:
            - row "Nessuna terapia attiva disponibile." [ref=e66]:
              - cell "Nessuna terapia attiva disponibile." [ref=e67]
      - group [ref=e69]:
        - generic "Gestione Terapie" [ref=e70] [cursor=pointer]:
          - strong [ref=e71]: Gestione Terapie
        - generic [ref=e72]:
          - generic [ref=e73]:
            - button "Terapie" [ref=e74] [cursor=pointer]
            - generic [ref=e75]: /
            - generic [ref=e76]: Aggiungi
            - button "Chiudi" [ref=e77] [cursor=pointer]
          - paragraph [ref=e78]:
            - strong [ref=e79]: Aggiungi nuova terapia
          - paragraph [ref=e80]: Compila i campi minimi per registrare una terapia attiva per ospite.
          - paragraph [ref=e81]: Dopo il salvataggio di una nuova terapia torni automaticamente alla lista.
          - generic [ref=e82]:
            - generic [ref=e83]:
              - text: Ospite
              - combobox "Ospite" [ref=e84]:
                - option "Seleziona ospite"
                - option "[OSP-01] - OSP-01" [selected]
            - generic [ref=e85]:
              - text: Farmaco
              - combobox "Farmaco" [ref=e86]:
                - option "Seleziona farmaco"
                - option "Paracetamolo" [selected]
            - generic [ref=e87]:
              - generic [ref=e88]: Dose per somministrazione *
              - spinbutton "Dose per somministrazione obbligatorio" [ref=e89]: "1"
            - generic [ref=e90]:
              - generic [ref=e91]: Somministrazioni giornaliere *
              - spinbutton "Somministrazioni giornaliere obbligatorio" [active] [ref=e92]: "2"
            - generic [ref=e93]:
              - strong [ref=e95]: Orari somministrazione
              - generic [ref=e96]:
                - textbox [ref=e97]:
                  - /placeholder: Orario 1
                - textbox [ref=e98]:
                  - /placeholder: Orario 2
                - textbox [disabled] [ref=e99]:
                  - /placeholder: Orario 3
                - textbox [disabled] [ref=e100]:
                  - /placeholder: Orario 4
                - textbox [disabled] [ref=e101]:
                  - /placeholder: Orario 5
                - textbox [disabled] [ref=e102]:
                  - /placeholder: Orario 6
              - text: Compila almeno un orario. Solo i primi N orari sono attivi, dove N = somministrazioni giornaliere.
            - generic [ref=e103]:
              - generic [ref=e104]: Data inizio *
              - textbox "Data inizio obbligatorio" [ref=e105]:
                - /placeholder: ""
            - generic [ref=e106]:
              - generic [ref=e107]: Data fine (opzionale)
              - textbox "Data fine (opzionale)" [ref=e108]:
                - /placeholder: ""
            - generic [ref=e109]:
              - generic [ref=e110]: Note terapia (dettagli somministrazione)
              - textbox "Note terapia (dettagli somministrazione)" [ref=e111]:
                - /placeholder: "Es: a stomaco vuoto prima del pasto"
            - button "Salva terapia" [ref=e112]
            - button "Annulla" [ref=e113]
      - generic [ref=e114]:
        - paragraph [ref=e115]:
          - strong [ref=e116]: Somministrazioni attive per ospite
        - paragraph [ref=e117]: Vista operativa per ospite con dettaglio terapia attiva.
        - table [ref=e119]:
          - rowgroup [ref=e120]:
            - row "Ospite Farmaco Dose Freq./giorno Dettagli somministrazione" [ref=e121]:
              - columnheader "Ospite" [ref=e122]
              - columnheader "Farmaco" [ref=e123]
              - columnheader "Dose" [ref=e124]
              - columnheader "Freq./giorno" [ref=e125]
              - columnheader "Dettagli somministrazione" [ref=e126]
          - rowgroup [ref=e127]:
            - row "Nessuna somministrazione attiva disponibile." [ref=e128]:
              - cell "Nessuna somministrazione attiva disponibile." [ref=e129]
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test'
  2  | import { loginOrRegisterSeededUser } from './helpers/login'
  3  | import { runWithAcceptedConfirmation } from './helpers/confirm'
  4  | 
  5  | test('terapie view blocks delete when therapy is assigned to active host', async ({ page }) => {
  6  |     await page.route('https://api.github.com/user', async route => {
  7  |         await route.fulfill({
  8  |             status: 200,
  9  |             contentType: 'application/json',
  10 |             body: JSON.stringify({
  11 |                 login: 'seeded-gh-user',
  12 |                 name: 'Seeded User',
  13 |                 avatar_url: 'https://avatars.githubusercontent.com/u/1?v=4',
  14 |             }),
  15 |         })
  16 |     })
  17 | 
  18 |     await page.goto('/')
  19 |     await loginOrRegisterSeededUser(page)
  20 | 
  21 |     await page.getByRole('link', { name: '⚙' }).click()
  22 |     await expect(page.getByRole('heading', { name: 'Impostazioni' })).toBeVisible()
  23 | 
  24 |     const dryRunCheckbox = page.getByLabel('Esegui simulazione (nessuna scrittura)')
  25 |     if (await dryRunCheckbox.isChecked()) {
  26 |         await dryRunCheckbox.uncheck()
  27 |     }
  28 | 
  29 |     await page.getByLabel('Sorgente').selectOption('03_Ospiti.csv')
  30 |     await page.locator('input[type="file"][accept=".csv,text/csv"]').setInputFiles({
  31 |         name: '03_Ospiti.csv',
  32 |         mimeType: 'text/csv',
  33 |         buffer: Buffer.from('guest_id,codice_interno\nHOST-1,OSP-01\n'),
  34 |     })
  35 |     await page.getByRole('button', { name: 'Avvia import CSV' }).click()
  36 |     await expect(page.getByText('Accettate: 1')).toBeVisible()
  37 | 
  38 |     await page.getByLabel('Sorgente').selectOption('01_CatalogoFarmaci.csv')
  39 |     await page.locator('input[type="file"][accept=".csv,text/csv"]').setInputFiles({
  40 |         name: '01_CatalogoFarmaci.csv',
  41 |         mimeType: 'text/csv',
  42 |         buffer: Buffer.from('drug_id,principio_attivo\nDRUG-1,Paracetamolo\n'),
  43 |     })
  44 |     await page.getByRole('button', { name: 'Avvia import CSV' }).click()
  45 |     await expect(page.getByText('Accettate: 1')).toBeVisible()
  46 | 
  47 |     await page.getByRole('link', { name: 'Terapie' }).click()
  48 |     await expect(page.getByRole('heading', { name: 'Terapie Attive' })).toBeVisible()
  49 |     await expect(page.locator('.dataset-frame')).toHaveCount(1)
  50 | 
  51 |     const panel = page.locator('details:has(summary:has-text("Gestione Terapie"))')
  52 |     await page.getByRole('button', { name: 'Aggiungi' }).click()
  53 |     await expect(panel).toHaveAttribute('open', '')
  54 | 
  55 |     await page.getByLabel('Ospite').selectOption('HOST-1')
  56 |     await page.getByLabel('Farmaco').selectOption('DRUG-1')
  57 |     await page.getByLabel('Dose per somministrazione').fill('1')
  58 |     await page.getByLabel('Somministrazioni giornaliere').fill('2')
> 59 |     await page.getByLabel('Consumo medio settimanale').fill('14')
     |                                                        ^ Error: locator.fill: Test timeout of 30000ms exceeded.
  60 |     await page.getByLabel('Data inizio').fill('2030-01-01')
  61 |     await page.getByRole('button', { name: 'Salva terapia' }).click()
  62 | 
  63 |     await expect(page.getByText(/Terapia salvata/i)).toBeVisible()
  64 |     await expect(panel).not.toHaveAttribute('open', '')
  65 |     await expect(page.getByRole('cell', { name: '[OSP-01] - OSP-01', exact: true })).toBeVisible()
  66 |     await expect(page.getByRole('cell', { name: 'Paracetamolo', exact: true })).toBeVisible()
  67 | 
  68 |     await page.getByLabel(/Seleziona terapia/i).check()
  69 |     await page.getByRole('button', { name: /^Modifica$/ }).first().click()
  70 |     await expect(page.getByRole('button', { name: 'Salva modifica' })).toBeVisible()
  71 |     await page.getByRole('button', { name: 'Annulla' }).first().click()
  72 | 
  73 |     await page.getByRole('button', { name: 'Elimina (1)' }).first().click()
  74 |     await expect(page.getByText(/Non e' possibile eliminare una o piu' terapie/i)).toBeVisible()
  75 |     await expect(page.getByText(/ancora assegnate a ospiti attivi/i)).toBeVisible()
  76 |     await expect(page.getByRole('cell', { name: '[OSP-01] - OSP-01', exact: true })).toBeVisible()
  77 | })
  78 | 
```