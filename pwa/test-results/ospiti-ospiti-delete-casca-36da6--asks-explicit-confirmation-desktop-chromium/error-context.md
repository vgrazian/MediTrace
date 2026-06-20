# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ospiti.spec.js >> ospiti delete cascades therapies and asks explicit confirmation
- Location: tests/e2e/ospiti.spec.js:95:1

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
                - option "[OSP-CASCADE] - OSP-CASCADE" [selected]
            - generic [ref=e85]:
              - text: Farmaco
              - combobox "Farmaco" [ref=e86]:
                - option "Seleziona farmaco"
                - option "Farmaco Cascata" [selected]
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
  44  |     await page.getByLabel('Codice fiscale').fill('BNCCRL47E52L219Z')
  45  |     await page.getByLabel('Patologie').fill('Ipertensione')
  46  |     const roomSelect = page.getByLabel('Stanza')
  47  |     if (await roomSelect.isEnabled()) {
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
> 144 |     await page.getByLabel('Consumo medio settimanale').fill('14')
      |                                                        ^ Error: locator.fill: Test timeout of 30000ms exceeded.
  145 |     await page.getByLabel('Data inizio').fill('2030-01-01')
  146 |     await page.getByRole('button', { name: 'Salva terapia' }).click()
  147 |     await expect(page.getByText(/Terapia salvata/i)).toBeVisible()
  148 | 
  149 |     await page.getByRole('link', { name: 'Ospiti', exact: true }).click()
  150 |     await expect(page.getByRole('heading', { name: 'Ospiti' })).toBeVisible()
  151 | 
  152 |     const hostRow = page.locator('tbody tr', { hasText: 'OSP-CASCADE' }).first()
  153 |     await expect(hostRow).toBeVisible()
  154 |     await hostRow.locator('input[type="checkbox"]').first().check()
  155 | 
  156 |     await page.locator('.card', { hasText: 'Lista ospiti' }).getByRole('button', { name: 'Elimina (1)' }).click()
  157 | 
  158 |     const confirmDialog = page.locator('.confirm-dialog')
  159 |     await expect(confirmDialog).toBeVisible()
  160 |     await expect(confirmDialog).toContainText('terapie associate')
  161 |     await expect(confirmDialog).toContainText('stanza/letto')
  162 |     await confirmDialog.locator('.actions button').last().click()
  163 | 
  164 |     await expect(page.locator('p.muted', { hasText: /eliminato\./i })).toBeVisible({ timeout: 5000 })
  165 |     await expect(page.locator('tbody tr', { hasText: 'OSP-CASCADE' })).toHaveCount(0)
  166 | 
  167 |     await page.getByRole('link', { name: 'Farmaci' }).click()
  168 |     await expect(page.getByRole('heading', { name: 'Catalogo Farmaci' })).toBeVisible()
  169 | 
  170 |     const drugRow = page.locator('tbody tr', { hasText: 'Farmaco Cascata' }).first()
  171 |     await expect(drugRow).toBeVisible()
  172 |     await drugRow.locator('input[type="checkbox"]').first().check()
  173 |     await runWithAcceptedConfirmation(page, async () => {
  174 |         await page.locator('.card', { hasText: 'Farmaci registrati' }).getByRole('button', { name: 'Elimina (1)' }).click()
  175 |     })
  176 | 
  177 |     await expect(page.getByText(/Farmaco eliminato/i)).toBeVisible()
  178 |     await expect(page.getByText(/Non e' possibile eliminare (il farmaco|uno o piu' farmaci)/i)).toHaveCount(0)
  179 | })
  180 | 
  181 | test('ospiti seeded from impostazioni keep 5 plus 7 split by residenza', async ({ page }) => {
  182 |     await page.route('https://api.github.com/user', async route => {
  183 |         await route.fulfill({
  184 |             status: 200,
  185 |             contentType: 'application/json',
  186 |             body: JSON.stringify({
  187 |                 login: 'seeded-gh-user',
  188 |                 name: 'Seeded User',
  189 |                 avatar_url: 'https://avatars.githubusercontent.com/u/1?v=4',
  190 |             }),
  191 |         })
  192 |     })
  193 | 
  194 |     await page.goto('/')
  195 |     await loginOrRegisterSeededUser(page)
  196 | 
  197 |     await page.getByRole('link', { name: '⚙' }).click()
  198 |     await expect(page.getByRole('heading', { name: 'Impostazioni' })).toBeVisible()
  199 | 
  200 |     const testDataCard = page.locator('.card', { hasText: 'Dati di test (live)' })
  201 |     const toggleTestDataButton = testDataCard.getByRole('button', {
  202 |         name: /Genera dati di test|Rimuovi dati di test/i,
  203 |     }).first()
  204 | 
  205 |     const buttonLabel = ((await toggleTestDataButton.textContent()) || '').trim()
  206 |     if (buttonLabel.includes('Rimuovi dati di test')) {
  207 |         await runWithAcceptedConfirmation(page, async () => {
  208 |             await toggleTestDataButton.click()
  209 |         })
  210 |         await expect(page.getByText('Dati di test rimossi.')).toBeVisible({ timeout: 10_000 })
  211 |     }
  212 | 
  213 |     await toggleTestDataButton.click()
  214 |     for (let i = 0; i < 2; i += 1) {
  215 |         const confirmDialog = page.locator('.confirm-dialog')
  216 |         if (!(await confirmDialog.isVisible().catch(() => false))) break
  217 |         await confirmDialog.locator('.actions button').last().click()
  218 |     }
  219 | 
  220 |     await expect(page.getByText('Importati dati di test:', { exact: false })).toBeVisible({ timeout: 15_000 })
  221 | 
  222 |     await page.getByRole('link', { name: 'Ospiti', exact: true }).click()
  223 |     await expect(page.getByRole('heading', { name: 'Ospiti' })).toBeVisible()
  224 | 
  225 |     const countsByResidenza = await page.locator('table.conflict-table tbody tr').evaluateAll((rows) => {
  226 |         return rows.reduce((acc, row) => {
  227 |             const cells = row.querySelectorAll('td')
  228 |             if (cells.length < 9) return acc
  229 |             const residenza = (cells[6]?.textContent || '').trim()
  230 |             if (!residenza || residenza === '—') return acc
  231 |             acc[residenza] = (acc[residenza] || 0) + 1
  232 |             return acc
  233 |         }, {})
  234 |     })
  235 | 
  236 |     expect(countsByResidenza['Il Rifugio']).toBe(5)
  237 |     expect(countsByResidenza['Via Bellani']).toBe(7)
  238 |     expect(Object.keys(countsByResidenza).sort()).toEqual(['Il Rifugio', 'Via Bellani'])
  239 | })
  240 | 
```