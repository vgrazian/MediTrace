# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: router-redirects.spec.js >> route /stanze redirects to /residenze after authentication
- Location: tests/e2e/router-redirects.spec.js:4:1

# Error details

```
Error: expect(page).toHaveURL(expected) failed

Expected pattern: /\/#\/residenze$/
Received string:  "http://127.0.0.1:5176/#/"
Timeout: 5000ms

Call log:
  - Expect "toHaveURL" with timeout 5000ms
    9 × unexpected value "http://127.0.0.1:5176/#/"

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
  4  | test('route /stanze redirects to /residenze after authentication', async ({ page }) => {
  5  |     await page.goto('/#/stanze')
  6  |     await loginOrRegisterSeededUser(page)
  7  | 
> 8  |     await expect(page).toHaveURL(/\/#\/residenze$/)
     |                        ^ Error: expect(page).toHaveURL(expected) failed
  9  |     await expect(page.getByRole('heading', { name: 'Residenze' })).toBeVisible()
  10 | })
  11 | 
  12 | test('route /informazioni redirects to /manuale after authentication', async ({ page }) => {
  13 |     await page.goto('/#/informazioni')
  14 |     await loginOrRegisterSeededUser(page)
  15 | 
  16 |     await expect(page).toHaveURL(/\/#\/manuale$/)
  17 |     await expect(page.getByRole('heading', { name: 'Manuale Utente' })).toBeVisible()
  18 | })
```