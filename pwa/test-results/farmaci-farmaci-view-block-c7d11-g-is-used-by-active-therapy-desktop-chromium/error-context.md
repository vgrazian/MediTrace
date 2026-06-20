# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: farmaci.spec.js >> farmaci view blocks delete when drug is used by active therapy
- Location: tests/e2e/farmaci.spec.js:82:1

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
                - option "[OSP-BLOCK] - OSP-BLOCK" [selected]
            - generic [ref=e85]:
              - text: Farmaco
              - combobox "Farmaco" [ref=e86]:
                - option "Seleziona farmaco"
                - option "Farmaco Bloccato" [selected]
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
  31  |     await page.getByLabel('Nome farmaco').fill('Tachipirina Test')
  32  |     await page.getByLabel('Principio attivo').fill('Paracetamolo Test')
  33  |     await page.getByLabel('Classe terapeutica').fill('Analgesici')
  34  |     await page.getByLabel('Scorta minima').fill('10')
  35  |     await expect(page.getByLabel('Soglia autonomia (giorni)')).toHaveValue('30')
  36  |     await page.getByLabel('Soglia autonomia (giorni)').fill('45')
  37  |     await page.getByRole('button', { name: 'Salva farmaco' }).click()
  38  | 
  39  |     // Avoid flaky toast assertion on CI: verify persisted row directly.
  40  |     await expect(page.getByRole('cell', { name: 'Tachipirina Test', exact: true })).toBeVisible()
  41  |     await expect(page.getByRole('cell', { name: '45', exact: true })).toBeVisible()
  42  |     await expect(panel).not.toHaveAttribute('open', '')
  43  | 
  44  |     await page.getByLabel('Seleziona farmaco Tachipirina Test').check()
  45  |     await page.getByRole('button', { name: 'Modifica' }).first().click()
  46  |     await expect(page.getByRole('button', { name: 'Salva modifica' })).toBeVisible()
  47  |     await expect(page.getByLabel('Soglia autonomia (giorni)')).toHaveValue('45')
  48  |     await page.getByRole('button', { name: 'Annulla' }).first().click()
  49  | 
  50  |     await page.locator('.card', { hasText: 'Confezioni attive' }).getByRole('button', { name: 'Aggiungi' }).click()
  51  |     await expect(panel).toHaveAttribute('open', '')
  52  |     await page.getByLabel('Farmaco *').selectOption('Tachipirina Test (Paracetamolo Test)')
  53  |     await page.getByLabel('Nome commerciale').fill('Tachipirina Test')
  54  |     await page.getByLabel('Dosaggio').fill('500mg')
  55  |     await page.getByLabel(/Quantit.* attuale/).fill('12')
  56  |     await page.getByLabel('Soglia riordino').fill('4')
  57  |     await page.getByRole('button', { name: 'Salva confezione' }).click()
  58  | 
  59  |     await expect(page.getByText(/Confezione salvata/i)).toBeVisible()
  60  |     await expect(panel).not.toHaveAttribute('open', '')
  61  |     await expect(page.locator('tbody tr', { hasText: 'Tachipirina Test' }).first()).toBeVisible()
  62  | 
  63  |     await page.getByLabel('Seleziona confezione Tachipirina Test').check()
  64  |     const batchCard = page.locator('.card', { hasText: 'Confezioni attive' })
  65  |     await runWithAcceptedConfirmation(page, async () => {
  66  |         await batchCard.getByRole('button', { name: 'Elimina (1)' }).click()
  67  |     })
  68  | 
  69  |     await expect(page.getByText('Confezione eliminata.')).toBeVisible()
  70  |     await expect(page.locator('.undo-banner')).toContainText('Confezione')
  71  |     await page.locator('.undo-banner').getByRole('button', { name: 'Annulla eliminazione' }).click()
  72  |     await expect(page.getByText('Eliminazione annullata: confezione ripristinata.')).toBeVisible()
  73  |     await expect(page.locator('tbody tr', { hasText: 'Tachipirina Test' }).first()).toBeVisible()
  74  | 
  75  |     await page.getByLabel('Seleziona confezione Tachipirina Test').check()
  76  |     await runWithAcceptedConfirmation(page, async () => {
  77  |         await batchCard.getByRole('button', { name: 'Elimina (1)' }).click()
  78  |     })
  79  |     await expect(page.getByText('Nessuna confezione attiva disponibile.')).toBeVisible()
  80  | })
  81  | 
  82  | test('farmaci view blocks delete when drug is used by active therapy', async ({ page }) => {
  83  |     await page.route('https://api.github.com/user', async route => {
  84  |         await route.fulfill({
  85  |             status: 200,
  86  |             contentType: 'application/json',
  87  |             body: JSON.stringify({
  88  |                 login: 'seeded-gh-user',
  89  |                 name: 'Seeded User',
  90  |                 avatar_url: 'https://avatars.githubusercontent.com/u/1?v=4',
  91  |             }),
  92  |         })
  93  |     })
  94  | 
  95  |     await page.goto('/')
  96  |     await loginOrRegisterSeededUser(page)
  97  | 
  98  |     await page.getByRole('link', { name: '⚙' }).click()
  99  |     await expect(page.getByRole('heading', { name: 'Impostazioni' })).toBeVisible()
  100 | 
  101 |     const dryRunCheckbox = page.getByLabel('Esegui simulazione (nessuna scrittura)')
  102 |     if (await dryRunCheckbox.isChecked()) {
  103 |         await dryRunCheckbox.uncheck()
  104 |     }
  105 | 
  106 |     await page.getByLabel('Sorgente').selectOption('03_Ospiti.csv')
  107 |     await page.locator('input[type="file"][accept=".csv,text/csv"]').setInputFiles({
  108 |         name: '03_Ospiti.csv',
  109 |         mimeType: 'text/csv',
  110 |         buffer: Buffer.from('guest_id,codice_interno\nHOST-BLOCK,OSP-BLOCK\n'),
  111 |     })
  112 |     await page.getByRole('button', { name: 'Avvia import CSV' }).click()
  113 |     await expect(page.getByText('Accettate: 1')).toBeVisible()
  114 | 
  115 |     await page.getByLabel('Sorgente').selectOption('01_CatalogoFarmaci.csv')
  116 |     await page.locator('input[type="file"][accept=".csv,text/csv"]').setInputFiles({
  117 |         name: '01_CatalogoFarmaci.csv',
  118 |         mimeType: 'text/csv',
  119 |         buffer: Buffer.from('drug_id,principio_attivo\nDRUG-BLOCK,Farmaco Bloccato\n'),
  120 |     })
  121 |     await page.getByRole('button', { name: 'Avvia import CSV' }).click()
  122 |     await expect(page.getByText('Accettate: 1')).toBeVisible()
  123 | 
  124 |     await page.getByRole('link', { name: 'Terapie' }).click()
  125 |     await expect(page.getByRole('heading', { name: 'Terapie Attive' })).toBeVisible()
  126 |     await page.getByRole('button', { name: 'Aggiungi' }).click()
  127 |     await page.getByLabel('Ospite').selectOption('HOST-BLOCK')
  128 |     await page.getByLabel('Farmaco').selectOption('DRUG-BLOCK')
  129 |     await page.getByLabel('Dose per somministrazione').fill('1')
  130 |     await page.getByLabel('Somministrazioni giornaliere').fill('2')
> 131 |     await page.getByLabel('Consumo medio settimanale').fill('14')
      |                                                        ^ Error: locator.fill: Test timeout of 30000ms exceeded.
  132 |     await page.getByLabel('Data inizio').fill('2030-01-01')
  133 |     await page.getByRole('button', { name: 'Salva terapia' }).click()
  134 |     await expect(page.getByText(/Terapia salvata/i)).toBeVisible()
  135 | 
  136 |     await page.getByRole('link', { name: 'Farmaci' }).click()
  137 |     await expect(page.getByRole('heading', { name: 'Catalogo Farmaci' })).toBeVisible()
  138 | 
  139 |     const drugRow = page.locator('tbody tr', { hasText: 'Farmaco Bloccato' }).first()
  140 |     await expect(drugRow).toBeVisible()
  141 |     await drugRow.locator('input[type="checkbox"]').first().check()
  142 | 
  143 |     await runWithAcceptedConfirmation(page, async () => {
  144 |         await page.locator('.card', { hasText: 'Farmaci registrati' }).getByRole('button', { name: 'Elimina (1)' }).click()
  145 |     })
  146 | 
  147 |     await expect(page.getByText(/Non e' possibile eliminare (il farmaco|uno o piu' farmaci)/i)).toBeVisible()
  148 |     await expect(page.getByText(/terapie attive/i)).toBeVisible()
  149 |     await expect(drugRow).toBeVisible()
  150 | })
  151 | 
```