# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ospiti.spec.js >> ospiti view supports create, selection-based edit, and bulk delete with extended anagrafica fields
- Location: tests/e2e/ospiti.spec.js:5:1

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.isEnabled: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByLabel('Stanza')

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
        - heading "Ospiti" [level=2] [ref=e35]
        - button "Aiuto" [ref=e36] [cursor=pointer]
      - generic [ref=e37]:
        - paragraph [ref=e38]:
          - strong [ref=e39]: Lista ospiti
        - generic [ref=e40]:
          - generic [ref=e41]:
            - text: Filtra ospiti
            - searchbox "Filtra ospiti" [ref=e42]
          - paragraph [ref=e43]: 0 risultati su 0
        - generic [ref=e44]:
          - text: Ordina per
          - combobox "Ordina ospiti" [ref=e45]:
            - option "Codice interno" [selected]
            - option "Cognome/Nome"
            - option "Residenza"
            - option "Terapie attive"
        - generic [ref=e46]:
          - checkbox "Mostra anche disattivati" [ref=e47]
          - text: Mostra anche disattivati
        - generic [ref=e48]:
          - button "Aggiungi" [ref=e49]
          - button "Modifica" [disabled] [ref=e50]
          - button "Elimina" [disabled] [ref=e51]
          - button "Cerca" [ref=e52]
        - table [ref=e54]:
          - rowgroup [ref=e55]:
            - row "Seleziona tutti gli ospiti Ospite Codice Iniziali Nome Cognome Residenza Terapie attive Azioni" [ref=e56]:
              - columnheader "Seleziona tutti gli ospiti" [ref=e57]:
                - checkbox "Seleziona tutti gli ospiti" [ref=e58]
              - columnheader "Ospite" [ref=e59]
              - columnheader "Codice" [ref=e60]
              - columnheader "Iniziali" [ref=e61]
              - columnheader "Nome" [ref=e62]
              - columnheader "Cognome" [ref=e63]
              - columnheader "Residenza" [ref=e64]
              - columnheader "Terapie attive" [ref=e65]
              - columnheader "Azioni" [ref=e66]
          - rowgroup [ref=e67]:
            - row "Nessun ospite disponibile." [ref=e68]:
              - cell "Nessun ospite disponibile." [ref=e69]
      - group [ref=e71]:
        - generic "Gestione Ospiti" [ref=e72] [cursor=pointer]:
          - strong [ref=e73]: Gestione Ospiti
        - generic [ref=e74]:
          - generic [ref=e75]:
            - button "Ospiti" [ref=e76] [cursor=pointer]
            - generic [ref=e77]: /
            - generic [ref=e78]: Aggiungi
            - button "Chiudi" [ref=e79] [cursor=pointer]
          - paragraph [ref=e80]:
            - strong [ref=e81]: Aggiungi nuovo ospite
          - paragraph [ref=e82]: "Pannello guidato: compila i dati essenziali e salva per tornare subito alla lista ospiti."
          - generic [ref=e83]:
            - generic [ref=e84]:
              - text: Codice interno
              - textbox "Codice interno" [ref=e85]:
                - /placeholder: Codice operativo
                - text: OSP-E2E-001
            - generic [ref=e86]:
              - text: Iniziali
              - textbox "Iniziali" [ref=e87]:
                - /placeholder: M.R.
            - generic [ref=e88]:
              - generic [ref=e89]: Nome *
              - textbox "Nome obbligatorio" [ref=e90]:
                - /placeholder: Mario
                - text: Carla
            - generic [ref=e91]:
              - generic [ref=e92]: Cognome *
              - textbox "Cognome obbligatorio" [ref=e93]:
                - /placeholder: Rossi
                - text: Bianchi
            - generic [ref=e94]:
              - text: Luogo di nascita
              - textbox "Luogo di nascita" [ref=e95]:
                - /placeholder: Roma
                - text: Torino
            - generic [ref=e96]:
              - generic [ref=e97]: Data di nascita
              - textbox "Data di nascita" [ref=e98]:
                - /placeholder: ""
                - text: 1947-05-12
            - generic [ref=e99]:
              - text: Sesso
              - combobox "Sesso" [ref=e100]:
                - option "Seleziona"
                - option "M"
                - option "F" [selected]
                - option "Altro"
            - generic [ref=e101]:
              - generic [ref=e102]: Codice fiscale
              - textbox "Codice fiscale" [ref=e103]:
                - /placeholder: RSSMRA80A01H501U
                - text: BNCCRL47E52L219Z
            - generic [ref=e104]:
              - text: Patologie
              - textbox "Patologie" [active] [ref=e105]:
                - /placeholder: Patologie o note cliniche
                - text: Ipertensione
            - generic [ref=e106]:
              - text: Residenza
              - combobox "Residenza" [disabled] [ref=e107]:
                - option "Seleziona residenza" [selected]
            - generic [ref=e108]:
              - text: Letto
              - combobox "Letto" [disabled] [ref=e109]:
                - option "Seleziona letto (opzionale)"
            - generic [ref=e110]:
              - text: Note
              - textbox "Note" [ref=e111]:
                - /placeholder: Note opzionali
            - button "Salva ospite" [ref=e112]
            - button "Annulla" [ref=e113]
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test'
  2   | import { loginOrRegisterSeededUser } from './helpers/login'
  3   | import { runWithAcceptedConfirmation } from './helpers/confirm'
  4   | 
  5   | test('ospiti view supports create, selection-based edit, and bulk delete with extended anagrafica fields', async ({ page }) => {
  6   |     await page.route('https://api.github.com/user', async route => {
  7   |         await route.fulfill({
  8   |             status: 200,
  9   |             contentType: 'application/json',
  10  |             body: JSON.stringify({
  11  |                 login: 'seeded-gh-user',
  12  |                 name: 'Seeded User',
  13  |                 avatar_url: 'https://avatars.githubusercontent.com/u/1?v=4',
  14  |             }),
  15  |         })
  16  |     })
  17  | 
  18  |     await page.goto('/')
  19  |     await loginOrRegisterSeededUser(page)
  20  | 
  21  |     await page.getByRole('link', { name: 'Ospiti', exact: true }).click()
  22  |     await expect(page.getByRole('heading', { name: 'Ospiti' })).toBeVisible()
  23  |     await expect(page.locator('.dataset-frame')).toHaveCount(1)
  24  | 
  25  |     const details = page.locator('details:has(summary:has-text("Gestione Ospiti"))')
  26  |     await expect(details).toBeVisible({ timeout: 5000 })
  27  |     await expect(details).not.toHaveAttribute('open', '')
  28  | 
  29  |     const addButton = page.getByRole('button', { name: 'Aggiungi' })
  30  |     const editButton = page.getByRole('button', { name: 'Modifica' }).first()
  31  |     const deleteButton = page.getByRole('button', { name: 'Elimina' })
  32  |     await expect(addButton).toBeVisible()
  33  |     await expect(editButton).toBeDisabled()
  34  |     await expect(deleteButton).toBeDisabled()
  35  | 
  36  |     await addButton.click()
  37  |     await expect(details).toHaveAttribute('open', '')
  38  |     await page.getByLabel('Codice interno').fill('OSP-E2E-001')
  39  |     await page.getByLabel(/^Nome/).fill('Carla')
  40  |     await page.getByLabel(/^Cognome/).fill('Bianchi')
  41  |     await page.getByLabel('Luogo di nascita').fill('Torino')
  42  |     await page.getByLabel('Data di nascita').fill('1947-05-12')
  43  |     await page.getByLabel('Sesso').selectOption('F')
  44  |     await page.getByLabel('Codice fiscale').fill('BNCCRL47E52L219Z')
  45  |     await page.getByLabel('Patologie').fill('Ipertensione')
  46  |     const roomSelect = page.getByLabel('Stanza')
> 47  |     if (await roomSelect.isEnabled()) {
      |                          ^ Error: locator.isEnabled: Test timeout of 30000ms exceeded.
  48  |         await roomSelect.selectOption({ index: 1 })
  49  |     }
  50  |     await page.getByLabel('Note').fill('Creato da test E2E')
  51  |     await page.getByRole('button', { name: 'Salva ospite' }).click()
  52  | 
  53  |     await expect(page.getByText(/Ospite ".+" creato\./i)).toBeVisible({ timeout: 5000 })
  54  |     await expect(details).not.toHaveAttribute('open', '')
  55  | 
  56  |     const firstRow = page.locator('tbody tr', {
  57  |         has: page.getByRole('cell', { name: 'OSP-E2E-001', exact: true }),
  58  |     }).first()
  59  |     await expect(firstRow).toBeVisible({ timeout: 5000 })
  60  |     await expect(firstRow.getByRole('cell', { name: '[OSP-E2E-001] - Bianchi Carla', exact: true })).toBeVisible()
  61  | 
  62  |     const firstRowCheckbox = firstRow.getByRole('checkbox', { name: /Seleziona/i })
  63  |     await firstRowCheckbox.check()
  64  |     await expect(page.getByText(/1 ospite selezionato/i)).toBeVisible()
  65  |     await expect(editButton).toBeEnabled()
  66  |     await expect(page.getByRole('button', { name: 'Elimina \(1\)' })).toBeEnabled()
  67  | 
  68  |     await editButton.click()
  69  |     await page.getByLabel(/^Nome/).fill('Carlotta')
  70  |     await page.getByLabel('Patologie').fill('Ipertensione, diabete')
  71  |     await page.getByRole('button', { name: 'Salva modifica' }).click()
  72  | 
  73  |     await expect(page.getByText(/Ospite ".+" aggiornato\./i)).toBeVisible({ timeout: 5000 })
  74  | 
  75  |     const updatedFirstRow = page.locator('tbody tr', {
  76  |         has: page.getByRole('cell', { name: 'OSP-E2E-001', exact: true }),
  77  |     }).first()
  78  |     await expect(updatedFirstRow.getByRole('cell', { name: '[OSP-E2E-001] - Bianchi Carlotta', exact: true })).toBeVisible()
  79  | 
  80  |     const deleteOneButton = page.getByRole('button', { name: 'Elimina (1)' })
  81  |     await expect(deleteOneButton).toBeEnabled()
  82  | 
  83  |     await runWithAcceptedConfirmation(page, async () => {
  84  |         await deleteOneButton.click()
  85  |     })
  86  | 
  87  |     await expect(page.locator('p.muted', { hasText: /Ospite ".+" eliminato\./i })).toBeVisible({ timeout: 5000 })
  88  |     const undoBanner = page.locator('.undo-banner')
  89  |     await expect(undoBanner).toContainText('Ospite')
  90  |     await undoBanner.getByRole('button', { name: 'Annulla eliminazione' }).click()
  91  |     await expect(page.getByText(/Eliminazione annullata: ospite ripristinato\./i)).toBeVisible({ timeout: 5000 })
  92  |     await expect(page.getByRole('cell', { name: 'OSP-E2E-001', exact: true })).toBeVisible({ timeout: 5000 })
  93  | })
  94  | 
  95  | test('ospiti delete cascades therapies and asks explicit confirmation', async ({ page }) => {
  96  |     await page.route('https://api.github.com/user', async route => {
  97  |         await route.fulfill({
  98  |             status: 200,
  99  |             contentType: 'application/json',
  100 |             body: JSON.stringify({
  101 |                 login: 'seeded-gh-user',
  102 |                 name: 'Seeded User',
  103 |                 avatar_url: 'https://avatars.githubusercontent.com/u/1?v=4',
  104 |             }),
  105 |         })
  106 |     })
  107 | 
  108 |     await page.goto('/')
  109 |     await loginOrRegisterSeededUser(page)
  110 | 
  111 |     await page.getByRole('link', { name: '⚙' }).click()
  112 |     await expect(page.getByRole('heading', { name: 'Impostazioni' })).toBeVisible()
  113 | 
  114 |     const dryRunCheckbox = page.getByLabel('Esegui simulazione (nessuna scrittura)')
  115 |     if (await dryRunCheckbox.isChecked()) {
  116 |         await dryRunCheckbox.uncheck()
  117 |     }
  118 | 
  119 |     await page.getByLabel('Sorgente').selectOption('03_Ospiti.csv')
  120 |     await page.locator('input[type="file"][accept=".csv,text/csv"]').setInputFiles({
  121 |         name: '03_Ospiti.csv',
  122 |         mimeType: 'text/csv',
  123 |         buffer: Buffer.from('guest_id,codice_interno\nHOST-CASCADE,OSP-CASCADE\n'),
  124 |     })
  125 |     await page.getByRole('button', { name: 'Avvia import CSV' }).click()
  126 |     await expect(page.getByText('Accettate: 1')).toBeVisible()
  127 | 
  128 |     await page.getByLabel('Sorgente').selectOption('01_CatalogoFarmaci.csv')
  129 |     await page.locator('input[type="file"][accept=".csv,text/csv"]').setInputFiles({
  130 |         name: '01_CatalogoFarmaci.csv',
  131 |         mimeType: 'text/csv',
  132 |         buffer: Buffer.from('drug_id,principio_attivo\nDRUG-CASCADE,Farmaco Cascata\n'),
  133 |     })
  134 |     await page.getByRole('button', { name: 'Avvia import CSV' }).click()
  135 |     await expect(page.getByText('Accettate: 1')).toBeVisible()
  136 | 
  137 |     await page.getByRole('link', { name: 'Terapie' }).click()
  138 |     await expect(page.getByRole('heading', { name: 'Terapie Attive' })).toBeVisible()
  139 |     await page.getByRole('button', { name: 'Aggiungi' }).click()
  140 |     await page.getByLabel('Ospite').selectOption('HOST-CASCADE')
  141 |     await page.getByLabel('Farmaco').selectOption('DRUG-CASCADE')
  142 |     await page.getByLabel('Dose per somministrazione').fill('1')
  143 |     await page.getByLabel('Somministrazioni giornaliere').fill('2')
  144 |     await page.getByLabel('Consumo medio settimanale').fill('14')
  145 |     await page.getByLabel('Data inizio').fill('2030-01-01')
  146 |     await page.getByRole('button', { name: 'Salva terapia' }).click()
  147 |     await expect(page.getByText(/Terapia salvata/i)).toBeVisible()
```