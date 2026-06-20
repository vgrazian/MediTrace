# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: menu-navigation.spec.js >> menu navigation opens major sections
- Location: tests/e2e/menu-navigation.spec.js:4:1

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByRole('link', { name: 'Manuale' })

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
    - link "Promemoria" [active] [ref=e9] [cursor=pointer]:
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
        - heading "Promemoria" [level=2] [ref=e35]
        - button "Aiuto" [ref=e36] [cursor=pointer]
      - generic [ref=e37]:
        - paragraph [ref=e38]:
          - strong [ref=e39]: Filtri
        - generic [ref=e40]:
          - generic [ref=e41]:
            - text: Data
            - combobox "Data" [ref=e42]:
              - option "Oggi" [selected]
              - option "Tutti"
          - generic [ref=e43]:
            - text: Stato
            - generic [ref=e44]:
              - generic [ref=e45]:
                - checkbox "Stato Da eseguire Posticipato Eseguito Saltato Annullato Tutti gli stati" [ref=e46]
                - generic [ref=e47]: Da eseguire
              - generic [ref=e48]:
                - checkbox "Posticipato" [ref=e49]
                - generic [ref=e50]: Posticipato
              - generic [ref=e51]:
                - checkbox "Eseguito" [ref=e52]
                - generic [ref=e53]: Eseguito
              - generic [ref=e54]:
                - checkbox "Saltato" [ref=e55]
                - generic [ref=e56]: Saltato
              - generic [ref=e57]:
                - checkbox "Annullato" [ref=e58]
                - generic [ref=e59]: Annullato
            - paragraph [ref=e60]: Tutti gli stati
          - generic [ref=e61]:
            - text: Ospite
            - combobox "Ospite" [ref=e62]:
              - option "Tutti gli ospiti" [selected]
          - generic [ref=e63]:
            - text: Fascia oraria
            - combobox "Fascia oraria" [ref=e64]:
              - option "Tutte le fasce" [selected]
              - option "Mattina (06:00-11:59)"
              - option "Pomeriggio (12:00-17:59)"
              - option "Sera (18:00-23:59)"
              - option "Notte (00:00-05:59)"
          - generic [ref=e65]:
            - text: Residenza operativa
            - combobox "Residenza operativa" [ref=e66]:
              - option "Tutte le residenze" [selected]
              - option "Il Rifugio"
              - option "Residenza Demo"
              - option "Via Bellani"
      - generic [ref=e67]:
        - paragraph [ref=e68]:
          - strong [ref=e69]: Somministrazioni previste
        - paragraph [ref=e70]: Registra l'esito di ogni somministrazione. Sincronizzato con gli altri dispositivi.
        - generic [ref=e71]:
          - button "Eseguito" [disabled] [ref=e72]
          - button "Posticipato" [disabled] [ref=e73]
          - button "Saltato" [disabled] [ref=e74]
          - button "Da eseguire" [disabled] [ref=e75]
          - generic [ref=e76]: "Selezionati: 0 / 0"
        - table [ref=e78]:
          - rowgroup [ref=e79]:
            - row "Orario Ospite Residenza Farmaco Dose Freq./giorno Stato Erogazione Azioni" [ref=e80]:
              - columnheader [ref=e81]:
                - checkbox [disabled] [ref=e82]
              - columnheader "Orario" [ref=e83]
              - columnheader "Ospite" [ref=e84]
              - columnheader "Residenza" [ref=e85]
              - columnheader "Farmaco" [ref=e86]
              - columnheader "Dose" [ref=e87]
              - columnheader "Freq./giorno" [ref=e88]
              - columnheader "Stato" [ref=e89]
              - columnheader "Erogazione" [ref=e90]
              - columnheader "Azioni" [ref=e91]
          - rowgroup [ref=e92]:
            - row "Nessun promemoria per il filtro selezionato." [ref=e93]:
              - cell "Nessun promemoria per il filtro selezionato." [ref=e94]
      - group [ref=e96]:
        - generic "Gestione Promemoria" [ref=e97]:
          - strong [ref=e98]: Gestione Promemoria
        - option "Da eseguire" [selected]
        - option "Eseguito"
        - option "Saltato"
        - option "Posticipato"
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test'
  2  | import { loginOrRegisterSeededUser } from './helpers/login'
  3  | 
  4  | test('menu navigation opens major sections', async ({ page }) => {
  5  |     await page.route('https://api.github.com/user', async route => {
  6  |         await route.fulfill({
  7  |             status: 200,
  8  |             contentType: 'application/json',
  9  |             body: JSON.stringify({
  10 |                 login: 'seeded-gh-user',
  11 |                 name: 'Seeded User',
  12 |                 avatar_url: 'https://avatars.githubusercontent.com/u/1?v=4',
  13 |             }),
  14 |         })
  15 |     })
  16 | 
  17 |     await page.goto('/')
  18 |     await loginOrRegisterSeededUser(page)
  19 | 
  20 |     await page.getByRole('link', { name: 'Farmaci' }).click()
  21 |     await expect(page.getByRole('heading', { name: 'Catalogo Farmaci' })).toBeVisible()
  22 | 
  23 |     await page.getByRole('link', { name: 'Ospiti', exact: true }).click()
  24 |     await expect(page.getByRole('heading', { name: 'Ospiti' })).toBeVisible()
  25 | 
  26 |     await page.getByRole('link', { name: 'Residenze', exact: true }).click()
  27 |     await expect(page.getByRole('heading', { name: 'Residenze' })).toBeVisible()
  28 | 
  29 |     await page.getByRole('link', { name: 'Terapie' }).click()
  30 |     await expect(page.getByRole('heading', { name: 'Terapie Attive' })).toBeVisible()
  31 | 
  32 |     await page.getByRole('link', { name: 'Promemoria' }).click()
  33 |     await expect(page.getByRole('heading', { name: 'Promemoria' })).toBeVisible()
  34 | 
> 35 |     await page.getByRole('link', { name: 'Manuale' }).click()
     |                                                       ^ Error: locator.click: Test timeout of 30000ms exceeded.
  36 |     await expect(page.getByRole('heading', { name: 'Manuale Utente' })).toBeVisible()
  37 | })
  38 | 
  39 | test('global logout is available from main navigation', async ({ page }) => {
  40 |     await page.route('https://api.github.com/user', async route => {
  41 |         await route.fulfill({
  42 |             status: 200,
  43 |             contentType: 'application/json',
  44 |             body: JSON.stringify({
  45 |                 login: 'seeded-gh-user',
  46 |                 name: 'Seeded User',
  47 |                 avatar_url: 'https://avatars.githubusercontent.com/u/1?v=4',
  48 |             }),
  49 |         })
  50 |     })
  51 | 
  52 |     await page.goto('/')
  53 |     await loginOrRegisterSeededUser(page)
  54 | 
  55 |     await page.getByRole('link', { name: 'Scorte' }).click()
  56 |     await expect(page.getByRole('heading', { name: 'Scorte' })).toBeVisible()
  57 | 
  58 |     await page.getByRole('button', { name: 'Logout' }).click()
  59 |     await expect(page.locator('.login-screen')).toBeVisible()
  60 |     await expect(page.getByRole('button', { name: 'Accedi' })).toBeVisible()
  61 | })
  62 | 
```