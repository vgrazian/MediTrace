# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: manuale.spec.js >> Manuale section can be expanded and collapsed
- Location: tests/e2e/manuale.spec.js:37:1

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
        - generic [ref=e35]:
          - heading "Cruscotto MediTrace" [level=2] [ref=e36]
          - button "Aiuto" [ref=e37] [cursor=pointer]
        - paragraph [ref=e38]: Monitoraggio scorte, terapie e promemoria con controllo operativo continuo.
      - generic [ref=e39]:
        - paragraph [ref=e40]:
          - strong [ref=e41]: 📋 Riepilogo turno di oggi
        - paragraph [ref=e42]: Nessun promemoria pianificato per oggi.
      - generic [ref=e43]:
        - paragraph [ref=e44]:
          - text: Benvenuto/a,
          - strong [ref=e45]: Admin Emergenza
        - paragraph [ref=e46]: "Ruolo attivo: amministratore"
      - generic [ref=e47]:
        - paragraph [ref=e48]:
          - strong [ref=e49]: Stato sincronizzazione
        - paragraph [ref=e50]:
          - text: "Versione dataset locale: —"
          - text: "Stato: Allineato (nessuna operazione in coda)"
          - text: "Ultima sincronizzazione: —"
      - generic [ref=e51]:
        - paragraph [ref=e52]:
          - strong [ref=e53]: Navigazione rapida
        - generic [ref=e54]:
          - generic [ref=e55]:
            - link "Shortcut cruscotto 1" [ref=e56] [cursor=pointer]:
              - /url: "#/promemoria"
              - text: Promemoria
            - paragraph [ref=e57]: Promemoria somministrazioni e notifiche pendenti.
          - generic [ref=e58]:
            - link "Shortcut cruscotto 2" [ref=e59] [cursor=pointer]:
              - /url: "#/terapie"
              - text: Terapie
            - paragraph [ref=e60]: "Piani terapici attivi per ospite: dosaggi, frequenze e storico."
          - generic [ref=e61]:
            - link "Shortcut cruscotto 3" [ref=e62] [cursor=pointer]:
              - /url: "#/scorte"
              - text: Scorte
            - paragraph [ref=e63]: Monitoraggio scorte, KPI operativi e report consumi farmaci.
          - generic [ref=e64]:
            - link "Shortcut cruscotto 4" [ref=e65] [cursor=pointer]:
              - /url: "#/movimenti"
              - text: Movimenti
            - paragraph [ref=e66]: "Storico movimenti di magazzino: carichi, scarichi e rettifiche."
          - generic [ref=e67]:
            - link "Shortcut cruscotto 5" [ref=e68] [cursor=pointer]:
              - /url: "#/ospiti"
              - text: Ospiti
            - paragraph [ref=e69]: Registro ospiti con assegnazione residenza e terapie attive.
          - generic [ref=e70]:
            - link "Shortcut cruscotto 6" [ref=e71] [cursor=pointer]:
              - /url: "#/farmaci"
              - text: Farmaci
            - paragraph [ref=e72]: Catalogo principi attivi, classi terapeutiche e schede farmaco.
          - generic [ref=e73]:
            - link "Shortcut cruscotto 7" [ref=e74] [cursor=pointer]:
              - /url: "#/residenze"
              - text: Residenze
            - paragraph [ref=e75]: Gestione residenze operative e capienza ospiti per sede.
          - generic [ref=e76]:
            - link "Shortcut cruscotto 8" [ref=e77] [cursor=pointer]:
              - /url: "#/impostazioni"
              - text: Impostazioni
            - paragraph [ref=e78]: Configurazione utenti, import dati, notifiche e gestione sistema.
          - generic [ref=e79]:
            - link "Shortcut cruscotto 9" [ref=e80] [cursor=pointer]:
              - /url: "#/audit"
              - text: Audit
            - paragraph [ref=e81]: Registro completo delle attività e operazioni di sistema.
          - generic [ref=e82]:
            - link "Shortcut cruscotto 10" [ref=e83] [cursor=pointer]:
              - /url: "#/manuale"
              - text: Guida
            - paragraph [ref=e84]: Guida utente con istruzioni su ogni sezione dell'applicazione.
      - generic [ref=e85]:
        - paragraph [ref=e86]:
          - strong [ref=e87]: Versione build
        - paragraph [ref=e88]: "Data/ora build: 17/06/2026, 17:28:34"
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test'
  2  | import { loginOrRegisterSeededUser } from './helpers/login'
  3  | 
  4  | test.beforeEach(async ({ page }) => {
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
  16 | })
  17 | 
  18 | test('Manuale page is accessible via nav and shows all sections', async ({ page }) => {
  19 |     await page.goto('/')
  20 |     await loginOrRegisterSeededUser(page)
  21 | 
  22 |     await page.getByRole('link', { name: 'Manuale' }).click()
  23 |     await expect(page.getByRole('heading', { name: 'Manuale Utente' })).toBeVisible()
  24 | 
  25 |     // Table of contents should be present
  26 |     await expect(page.getByRole('navigation', { name: 'Indice del manuale' })).toBeVisible()
  27 | 
  28 |     // First section should be expanded by default (Cruscotto)
  29 |     await expect(page.getByText(/Il Cruscotto è la pagina di partenza/i)).toBeVisible()
  30 | 
  31 |     // Other sections should exist (buttons/headers)
  32 |     await expect(page.getByText(/Catalogo Farmaci — Guida/i)).toBeVisible()
  33 |     await expect(page.getByText(/Ospiti — Guida/i)).toBeVisible()
  34 |     await expect(page.getByText(/Terapie Attive — Guida/i)).toBeVisible()
  35 | })
  36 | 
  37 | test('Manuale section can be expanded and collapsed', async ({ page }) => {
  38 |     await page.goto('/')
  39 |     await loginOrRegisterSeededUser(page)
  40 | 
> 41 |     await page.getByRole('link', { name: 'Manuale' }).click()
     |                                                       ^ Error: locator.click: Test timeout of 30000ms exceeded.
  42 |     await expect(page.getByRole('heading', { name: 'Manuale Utente' })).toBeVisible()
  43 | 
  44 |     // Click the Farmaci section toggle to expand it
  45 |     const farmaciToggle = page.getByRole('button', { name: /Catalogo Farmaci — Guida/i })
  46 |     await farmaciToggle.click()
  47 |     await expect(page.getByText(/Questa sezione contiene l'elenco di tutti i farmaci/i)).toBeVisible()
  48 | 
  49 |     // Click again to collapse
  50 |     await farmaciToggle.click()
  51 |     await expect(page.getByText(/Questa sezione contiene l'elenco di tutti i farmaci/i)).toBeHidden()
  52 | })
  53 | 
  54 | test('contextual help opens from Farmaci view and shows content', async ({ page }) => {
  55 |     await page.goto('/')
  56 |     await loginOrRegisterSeededUser(page)
  57 | 
  58 |     await page.getByRole('link', { name: 'Farmaci' }).click()
  59 |     await expect(page.getByRole('heading', { name: 'Catalogo Farmaci' })).toBeVisible()
  60 | 
  61 |     const farmaciView = page.locator('.view').filter({ has: page.getByRole('heading', { name: 'Catalogo Farmaci' }) }).first()
  62 |     const helpBtn = farmaciView.getByRole('button', { name: 'Aiuto' })
  63 |     await expect(helpBtn).toBeVisible()
  64 | 
  65 |     await helpBtn.click()
  66 | 
  67 |     await expect(page).toHaveURL(/\/manuale(\?[^#]*)?#farmaci$/)
  68 |     await expect(page.getByRole('heading', { name: 'Manuale Utente' })).toBeVisible()
  69 |     await expect(page.locator('#farmaci')).toBeVisible()
  70 |     await expect(page.getByRole('button', { name: 'Torna alla pagina precedente' })).toBeVisible()
  71 | })
  72 | 
  73 | test('contextual help opens from Terapie view', async ({ page }) => {
  74 |     await page.goto('/')
  75 |     await loginOrRegisterSeededUser(page)
  76 | 
  77 |     await page.getByRole('link', { name: 'Terapie' }).click()
  78 |     await expect(page.getByRole('heading', { name: 'Terapie Attive' })).toBeVisible()
  79 | 
  80 |     const terapieView = page.locator('.view').filter({ has: page.getByRole('heading', { name: 'Terapie Attive' }) }).first()
  81 |     await terapieView.getByRole('button', { name: 'Aiuto' }).click()
  82 |     await expect(page).toHaveURL(/\/manuale(\?[^#]*)?#terapie$/)
  83 |     await expect(page.getByRole('heading', { name: 'Manuale Utente' })).toBeVisible()
  84 |     await expect(page.locator('#terapie')).toBeVisible()
  85 | })
  86 | 
  87 | test('help drawer link navigates to full manual', async ({ page }) => {
  88 |     await page.goto('/')
  89 |     await loginOrRegisterSeededUser(page)
  90 | 
  91 |     await page.getByRole('link', { name: 'Ospiti', exact: true }).click()
  92 |     const ospitiView = page.locator('.view').filter({ has: page.getByRole('heading', { name: 'Ospiti' }) }).first()
  93 |     await ospitiView.getByRole('button', { name: 'Aiuto' }).click()
  94 |     await expect(page).toHaveURL(/\/manuale(\?[^#]*)?#ospiti$/)
  95 |     await expect(page.getByRole('heading', { name: 'Manuale Utente' })).toBeVisible()
  96 | })
  97 | 
```