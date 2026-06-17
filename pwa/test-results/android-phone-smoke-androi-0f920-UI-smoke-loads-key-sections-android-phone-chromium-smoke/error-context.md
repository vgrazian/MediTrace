# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: android-phone-smoke.spec.js >> android phone UI smoke loads key sections
- Location: tests/e2e/android-phone-smoke.spec.js:4:1

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
    - link "Promemoria" [ref=e9] [cursor=pointer]:
      - /url: "#/promemoria"
    - link "Terapie" [ref=e10] [cursor=pointer]:
      - /url: "#/terapie"
    - link "Scorte" [ref=e11] [cursor=pointer]:
      - /url: "#/scorte"
    - link "Movimenti" [ref=e12] [cursor=pointer]:
      - /url: "#/movimenti"
    - link "Ospiti" [active] [ref=e13] [cursor=pointer]:
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
        - option "Seleziona" [selected]
        - option "M"
        - option "F"
        - option "Altro"
        - option "Seleziona residenza" [selected]
        - option "Seleziona letto (opzionale)"
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test'
  2  | import { loginOrRegisterSeededUser } from './helpers/login'
  3  | 
  4  | test('android phone UI smoke loads key sections', async ({ page }) => {
  5  |     await page.route('https://api.github.com/user', async (route) => {
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
  20 |     const viewport = page.viewportSize()
  21 |     expect(viewport?.width || 0).toBeLessThanOrEqual(500)
  22 | 
  23 |     await expect(page.getByRole('heading', { name: 'Cruscotto MediTrace' })).toBeVisible()
  24 | 
  25 |     await page.getByRole('link', { name: 'Farmaci' }).click()
  26 |     await expect(page.getByRole('heading', { name: 'Catalogo Farmaci' })).toBeVisible()
  27 | 
  28 |     await page.getByRole('link', { name: 'Ospiti', exact: true }).click()
  29 |     await expect(page.getByRole('heading', { name: 'Ospiti' })).toBeVisible()
  30 | 
> 31 |     await page.getByRole('link', { name: 'Manuale' }).click()
     |                                                       ^ Error: locator.click: Test timeout of 30000ms exceeded.
  32 |     await expect(page.getByRole('heading', { name: 'Manuale Utente' })).toBeVisible()
  33 | })
  34 | 
  35 | test('android phone ospiti table shows Residenza column for compact UI', async ({ page }) => {
  36 |     await page.route('https://api.github.com/user', async (route) => {
  37 |         await route.fulfill({
  38 |             status: 200,
  39 |             contentType: 'application/json',
  40 |             body: JSON.stringify({
  41 |                 login: 'seeded-gh-user',
  42 |                 name: 'Seeded User',
  43 |                 avatar_url: 'https://avatars.githubusercontent.com/u/1?v=4',
  44 |             }),
  45 |         })
  46 |     })
  47 | 
  48 |     await page.goto('/')
  49 |     await loginOrRegisterSeededUser(page)
  50 | 
  51 |     const viewport = page.viewportSize()
  52 |     expect(viewport?.width || 0).toBeLessThanOrEqual(500)
  53 | 
  54 |     await page.getByRole('link', { name: 'Ospiti', exact: true }).click()
  55 |     await expect(page.getByRole('heading', { name: 'Ospiti' })).toBeVisible()
  56 |     await expect(page.getByRole('columnheader', { name: 'Residenza' })).toBeVisible()
  57 |     await expect(page.getByRole('columnheader', { name: 'Stanza/Letto' })).toHaveCount(0)
  58 |     await expect(page.locator('.dataset-frame')).toBeVisible()
  59 | })
  60 | 
```