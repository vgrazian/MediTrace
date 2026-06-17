# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: operatori.spec.js >> operatori management: add, list, reactivate, delete users with audit logging
- Location: tests/e2e/operatori.spec.js:4:1

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: locator('div.card').filter({ has: locator('strong').filter({ hasText: 'Account operatore' }) }).first()
Expected substring: "Username: prova"
Received string:    "Account operatoreUsername: adminNome: Admin EmergenzaTelefono: —Email: admin@example.comRuolo: amministratoreBackend sincronizzazione: GitHub Gist (legacy)EsciDisattiva utente di prova"
Timeout: 5000ms

Call log:
  - Expect "toContainText" with timeout 5000ms
  - waiting for locator('div.card').filter({ has: locator('strong').filter({ hasText: 'Account operatore' }) }).first()
    8 × locator resolved to <div class="card">…</div>
      - unexpected value "Account operatoreUsername: adminNome: Admin EmergenzaTelefono: —Email: admin@example.comRuolo: amministratoreBackend sincronizzazione: GitHub Gist (legacy)EsciDisattiva utente di prova"

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
      - link "⚙" [active] [ref=e30] [cursor=pointer]:
        - /url: "#/impostazioni"
      - button "Logout" [ref=e31] [cursor=pointer]
  - main [ref=e32]:
    - generic [ref=e33]:
      - generic [ref=e34]:
        - heading "Impostazioni" [level=2] [ref=e35]
        - button "Aiuto" [ref=e36] [cursor=pointer]
      - generic [ref=e37]:
        - paragraph [ref=e38]:
          - strong [ref=e39]: Fasce orarie configurabili
        - generic [ref=e40]:
          - table [ref=e41]:
            - rowgroup [ref=e42]:
              - row "Nome fascia Inizio Fine Azioni" [ref=e43]:
                - columnheader "Nome fascia" [ref=e44]
                - columnheader "Inizio" [ref=e45]
                - columnheader "Fine" [ref=e46]
                - columnheader "Azioni" [ref=e47]
            - rowgroup
          - button "Aggiungi fascia" [ref=e48]
          - button "Salva fasce orarie" [ref=e49]
      - generic [ref=e50]:
        - paragraph [ref=e51]:
          - strong [ref=e52]: Account operatore
        - paragraph [ref=e53]: "Username: admin"
        - paragraph [ref=e54]: "Nome: Admin Emergenza"
        - paragraph [ref=e55]: "Telefono: —"
        - paragraph [ref=e56]: "Email: admin@example.com"
        - paragraph [ref=e57]: "Ruolo: amministratore"
        - paragraph [ref=e58]: "Backend sincronizzazione: GitHub Gist (legacy)"
        - button "Esci" [ref=e59]
        - button "Disattiva utente di prova" [ref=e60]
      - generic [ref=e61]:
        - paragraph [ref=e62]:
          - strong [ref=e63]: Profilo personale
        - generic [ref=e64]:
          - generic [ref=e65]:
            - text: Username accesso
            - textbox "Username accesso" [ref=e66]
          - generic [ref=e67]:
            - text: Nome profilo
            - textbox "Nome profilo" [ref=e68]
          - generic [ref=e69]:
            - text: Cognome profilo
            - textbox "Cognome profilo" [ref=e70]
          - generic [ref=e71]:
            - text: Telefono profilo
            - textbox "Telefono profilo" [ref=e72]:
              - /placeholder: +39 333 1234567
          - generic [ref=e73]:
            - text: Email profilo
            - textbox "Email profilo" [ref=e74]
          - button "Aggiorna profilo" [disabled] [ref=e75]
      - generic [ref=e76]:
        - paragraph [ref=e77]:
          - strong [ref=e78]: Gestione password
        - generic [ref=e79]:
          - generic [ref=e80]:
            - text: Password corrente
            - textbox "Password corrente" [ref=e81]
          - generic [ref=e82]:
            - text: Nuova password
            - textbox "Nuova password" [ref=e83]
          - paragraph [ref=e84]:
            - text: "Regole: 10+ caratteri, maiuscola, minuscola, numero e simbolo."
            - text: "Verifica: no lunghezza · no maiuscola · no minuscola · no numero · no simbolo"
          - generic [ref=e85]:
            - text: Conferma nuova password
            - textbox "Conferma nuova password" [ref=e86]
          - button "Aggiorna password" [disabled] [ref=e87]
      - generic [ref=e88]:
        - paragraph [ref=e89]:
          - strong [ref=e90]: Utenti
        - paragraph [ref=e91]: Gestione utenti consentita solo ad account amministratore. Gli operatori vengono creati direttamente da questo pannello.
        - generic [ref=e92]:
          - paragraph [ref=e93]:
            - strong [ref=e94]: Crea nuovo utente
          - generic [ref=e95]:
            - text: Nome
            - textbox "Nome" [ref=e96]
          - generic [ref=e97]:
            - text: Cognome
            - textbox "Cognome" [ref=e98]
          - generic [ref=e99]:
            - text: Username suggerito
            - textbox "Username suggerito" [ref=e100]
          - paragraph [ref=e101]: "Suggerimento: prime 8 lettere del nome + prime 7 del cognome, modificabile manualmente."
          - generic [ref=e102]:
            - text: Email
            - textbox "Email" [ref=e103]
          - generic [ref=e104]:
            - text: Telefono
            - textbox "Telefono" [ref=e105]:
              - /placeholder: +39 333 1234567
          - generic [ref=e106]:
            - text: Password iniziale
            - textbox "Password iniziale" [ref=e107]
          - paragraph [ref=e108]: "Regole password: no lunghezza · no maiuscola · no minuscola · no numero · no simbolo"
          - generic [ref=e109]:
            - text: Ruolo
            - combobox "Ruolo" [ref=e110]:
              - option "Operatore" [selected]
              - option "Amministratore"
          - generic [ref=e111]:
            - checkbox "Marca come utente di prova" [ref=e112]
            - text: Marca come utente di prova
          - button "Crea utente" [disabled] [ref=e113]
        - table [ref=e115]:
          - rowgroup [ref=e116]:
            - 'row "Username Nome Cognome Telefono Email Admin <<<<<<< HEAD <<<<<<< HEAD Prova ======= Prova >>>>>>> e43e62c (fix(e2e): robust selectors and admin-only time slot config section; all E2E tests green) ======= Prova >>>>>>> 2a10e8f (fix(ui): aggiorna label utente di prova/standard e colonna in impostazioni) Disabilitato Ultima attività Creato il Azioni Tipo Stato Azione" [ref=e117]':
              - columnheader "Username" [ref=e118]
              - columnheader "Nome" [ref=e119]
              - columnheader "Cognome" [ref=e120]
              - columnheader "Telefono" [ref=e121]
              - columnheader "Email" [ref=e122]
              - columnheader "Admin" [ref=e123]
              - text: <<<<<<< HEAD <<<<<<< HEAD
              - columnheader "Prova" [ref=e124]
              - text: =======
              - columnheader "Prova" [ref=e125]
              - text: ">>>>>>> e43e62c (fix(e2e): robust selectors and admin-only time slot config section; all E2E tests green) ======="
              - columnheader "Prova" [ref=e126]
              - text: ">>>>>>> 2a10e8f (fix(ui): aggiorna label utente di prova/standard e colonna in impostazioni)"
              - columnheader "Disabilitato" [ref=e127]
              - columnheader "Ultima attività" [ref=e128]
              - columnheader "Creato il" [ref=e129]
              - columnheader "Azioni" [ref=e130]
              - columnheader "Tipo" [ref=e131]
              - columnheader "Stato" [ref=e132]
              - columnheader "Azione" [ref=e133]
          - rowgroup [ref=e134]:
            - 'row "admin (sessione attiva) Admin Emergenza — admin@example.com <<<<<<< HEAD <<<<<<< HEAD ✔ ======= ✔ >>>>>>> e43e62c (fix(e2e): robust selectors and admin-only time slot config section; all E2E tests green) ======= ✔ >>>>>>> 2a10e8f (fix(ui): aggiorna label utente di prova/standard e colonna in impostazioni) — 2026-06-17 15:29:16 <<<<<<< HEAD <<<<<<< HEAD prova ======= prova >>>>>>> e43e62c (fix(e2e): robust selectors and admin-only time slot config section; all E2E tests green) ======= prova >>>>>>> 2a10e8f (fix(ui): aggiorna label utente di prova/standard e colonna in impostazioni) attivo —" [ref=e135]':
              - cell "admin (sessione attiva)" [ref=e136]
              - cell "Admin" [ref=e137]
              - cell "Emergenza" [ref=e138]
              - cell "—" [ref=e139]
              - cell "admin@example.com" [ref=e140]
              - cell [ref=e141]:
                - checkbox [checked] [disabled] [ref=e142]
              - 'cell "<<<<<<< HEAD <<<<<<< HEAD ✔ ======= ✔ >>>>>>> e43e62c (fix(e2e): robust selectors and admin-only time slot config section; all E2E tests green) ======= ✔ >>>>>>> 2a10e8f (fix(ui): aggiorna label utente di prova/standard e colonna in impostazioni)" [ref=e143]'
              - cell [ref=e144]
              - cell "—" [ref=e145]
              - cell "2026-06-17 15:29:16" [ref=e146]
              - cell [ref=e147]
              - text: <<<<<<< HEAD <<<<<<< HEAD
              - cell "prova" [ref=e148]
              - text: =======
              - cell "prova" [ref=e149]
              - text: ">>>>>>> e43e62c (fix(e2e): robust selectors and admin-only time slot config section; all E2E tests green) ======="
              - cell "prova" [ref=e150]
              - text: ">>>>>>> 2a10e8f (fix(ui): aggiorna label utente di prova/standard e colonna in impostazioni)"
              - cell "attivo" [ref=e151]
              - cell "—" [ref=e152]
            - 'row "anna Anna Bianchi — anna@example.com <<<<<<< HEAD <<<<<<< HEAD ✔ ======= ✔ >>>>>>> e43e62c (fix(e2e): robust selectors and admin-only time slot config section; all E2E tests green) ======= ✔ >>>>>>> 2a10e8f (fix(ui): aggiorna label utente di prova/standard e colonna in impostazioni) — 2026-06-17 15:29:16 Reset PW Logout <<<<<<< HEAD <<<<<<< HEAD prova ======= prova >>>>>>> e43e62c (fix(e2e): robust selectors and admin-only time slot config section; all E2E tests green) ======= prova >>>>>>> 2a10e8f (fix(ui): aggiorna label utente di prova/standard e colonna in impostazioni) attivo Disattiva Elimina" [ref=e153]':
              - cell "anna" [ref=e154]
              - cell "Anna" [ref=e155]
              - cell "Bianchi" [ref=e156]
              - cell "—" [ref=e157]
              - cell "anna@example.com" [ref=e158]
              - cell [ref=e159]:
                - checkbox [ref=e160]
              - 'cell "<<<<<<< HEAD <<<<<<< HEAD ✔ ======= ✔ >>>>>>> e43e62c (fix(e2e): robust selectors and admin-only time slot config section; all E2E tests green) ======= ✔ >>>>>>> 2a10e8f (fix(ui): aggiorna label utente di prova/standard e colonna in impostazioni)" [ref=e161]'
              - cell [ref=e162]
              - cell "—" [ref=e163]
              - cell "2026-06-17 15:29:16" [ref=e164]
              - cell "Reset PW Logout" [ref=e165]:
                - button "Reset PW" [ref=e166]
                - button "Logout" [ref=e167]
              - text: <<<<<<< HEAD <<<<<<< HEAD
              - cell "prova" [ref=e168]
              - text: =======
              - cell "prova" [ref=e169]
              - text: ">>>>>>> e43e62c (fix(e2e): robust selectors and admin-only time slot config section; all E2E tests green) ======="
              - cell "prova" [ref=e170]
              - text: ">>>>>>> 2a10e8f (fix(ui): aggiorna label utente di prova/standard e colonna in impostazioni)"
              - cell "attivo" [ref=e171]
              - cell "Disattiva Elimina" [ref=e172]:
                - button "Disattiva" [ref=e173]
                - button "Elimina" [ref=e174]
            - 'row "prova — — — — <<<<<<< HEAD <<<<<<< HEAD ✔ ======= ✔ >>>>>>> e43e62c (fix(e2e): robust selectors and admin-only time slot config section; all E2E tests green) ======= ✔ >>>>>>> 2a10e8f (fix(ui): aggiorna label utente di prova/standard e colonna in impostazioni) — 2026-06-17 15:29:16 Reset PW Logout <<<<<<< HEAD <<<<<<< HEAD prova ======= prova >>>>>>> e43e62c (fix(e2e): robust selectors and admin-only time slot config section; all E2E tests green) ======= prova >>>>>>> 2a10e8f (fix(ui): aggiorna label utente di prova/standard e colonna in impostazioni) attivo Disattiva Elimina" [ref=e175]':
              - cell "prova" [ref=e176]
              - cell "—" [ref=e177]
              - cell "—" [ref=e178]
              - cell "—" [ref=e179]
              - cell "—" [ref=e180]
              - cell [ref=e181]:
                - checkbox [checked] [ref=e182]
              - 'cell "<<<<<<< HEAD <<<<<<< HEAD ✔ ======= ✔ >>>>>>> e43e62c (fix(e2e): robust selectors and admin-only time slot config section; all E2E tests green) ======= ✔ >>>>>>> 2a10e8f (fix(ui): aggiorna label utente di prova/standard e colonna in impostazioni)" [ref=e183]'
              - cell [ref=e184]
              - cell "—" [ref=e185]
              - cell "2026-06-17 15:29:16" [ref=e186]
              - cell "Reset PW Logout" [ref=e187]:
                - button "Reset PW" [ref=e188]
                - button "Logout" [ref=e189]
              - text: <<<<<<< HEAD <<<<<<< HEAD
              - cell "prova" [ref=e190]
              - text: =======
              - cell "prova" [ref=e191]
              - text: ">>>>>>> e43e62c (fix(e2e): robust selectors and admin-only time slot config section; all E2E tests green) ======="
              - cell "prova" [ref=e192]
              - text: ">>>>>>> 2a10e8f (fix(ui): aggiorna label utente di prova/standard e colonna in impostazioni)"
              - cell "attivo" [ref=e193]
              - cell "Disattiva Elimina" [ref=e194]:
                - button "Disattiva" [ref=e195]
                - button "Elimina" [ref=e196]
            - 'row "valerio Valerio Graziani — valerio@example.com <<<<<<< HEAD <<<<<<< HEAD ✔ ======= ✔ >>>>>>> e43e62c (fix(e2e): robust selectors and admin-only time slot config section; all E2E tests green) ======= ✔ >>>>>>> 2a10e8f (fix(ui): aggiorna label utente di prova/standard e colonna in impostazioni) — 2026-06-17 15:29:16 Reset PW Logout <<<<<<< HEAD <<<<<<< HEAD prova ======= prova >>>>>>> e43e62c (fix(e2e): robust selectors and admin-only time slot config section; all E2E tests green) ======= prova >>>>>>> 2a10e8f (fix(ui): aggiorna label utente di prova/standard e colonna in impostazioni) attivo Disattiva Elimina" [ref=e197]':
              - cell "valerio" [ref=e198]
              - cell "Valerio" [ref=e199]
              - cell "Graziani" [ref=e200]
              - cell "—" [ref=e201]
              - cell "valerio@example.com" [ref=e202]
              - cell [ref=e203]:
                - checkbox [ref=e204]
              - 'cell "<<<<<<< HEAD <<<<<<< HEAD ✔ ======= ✔ >>>>>>> e43e62c (fix(e2e): robust selectors and admin-only time slot config section; all E2E tests green) ======= ✔ >>>>>>> 2a10e8f (fix(ui): aggiorna label utente di prova/standard e colonna in impostazioni)" [ref=e205]'
              - cell [ref=e206]
              - cell "—" [ref=e207]
              - cell "2026-06-17 15:29:16" [ref=e208]
              - cell "Reset PW Logout" [ref=e209]:
                - button "Reset PW" [ref=e210]
                - button "Logout" [ref=e211]
              - text: <<<<<<< HEAD <<<<<<< HEAD
              - cell "prova" [ref=e212]
              - text: =======
              - cell "prova" [ref=e213]
              - text: ">>>>>>> e43e62c (fix(e2e): robust selectors and admin-only time slot config section; all E2E tests green) ======="
              - cell "prova" [ref=e214]
              - text: ">>>>>>> 2a10e8f (fix(ui): aggiorna label utente di prova/standard e colonna in impostazioni)"
              - cell "attivo" [ref=e215]
              - cell "Disattiva Elimina" [ref=e216]:
                - button "Disattiva" [ref=e217]
                - button "Elimina" [ref=e218]
        - generic [ref=e219]:
          - paragraph [ref=e220]:
            - strong [ref=e221]: Dati demo (live)
          - paragraph [ref=e222]: Usa questo pulsante per importare rapidamente dati dimostrativi o per ripulirli. I dati vengono creati nella residenza "Residenza Demo", lasciando "Il Rifugio" e "Via Bellani" vuote.
          - paragraph [ref=e223]: "Pacchetto: 10 farmaci · 10 ospiti · 11 confezioni · 15 terapie · 15 movimenti · 15 promemoria"
          - button "Genera dati demo" [ref=e224]
      - generic [ref=e225]:
        - paragraph [ref=e226]:
          - strong [ref=e227]: Notifiche promemoria
        - paragraph [ref=e228]: "Supporto browser: si"
        - paragraph [ref=e229]: "Permesso: denied"
        - paragraph [ref=e230]: "Stato: non abilitate"
        - paragraph [ref=e231]: "Dettaglio: Bloccate dal browser/dispositivo."
        - generic [ref=e232]:
          - button "Abilita notifiche" [ref=e233]
          - button "Invia notifica test" [disabled] [ref=e234]
          - button "Verifica promemoria imminenti" [disabled] [ref=e235]
          - button "Aggiorna stato" [ref=e236]
        - paragraph [ref=e237]:
          - strong [ref=e238]: Web Push API (base)
        - paragraph [ref=e239]: "Supporto Push API: no"
        - paragraph [ref=e240]: "VAPID public key: mancante"
        - paragraph [ref=e241]: "Stato sottoscrizione: non attiva"
        - paragraph [ref=e242]: "Dettaglio: Push API non supportata in questo ambiente."
        - generic [ref=e243]:
          - button "Attiva sottoscrizione push" [disabled] [ref=e244]
          - button "Disattiva sottoscrizione push" [disabled] [ref=e245]
          - button "Aggiorna stato push" [ref=e246]
        - paragraph [ref=e247]:
          - strong [ref=e248]: Promemoria prossime 24h (pending)
        - paragraph [ref=e249]: Questa lista supporta il controllo operativo dei reminder candidati alla notifica nelle prossime 24 ore.
        - button "Aggiorna lista 24h" [ref=e250]
        - table [ref=e252]:
          - rowgroup [ref=e253]:
            - row "Orario Ospite Farmaco Stato" [ref=e254]:
              - columnheader "Orario" [ref=e255]
              - columnheader "Ospite" [ref=e256]
              - columnheader "Farmaco" [ref=e257]
              - columnheader "Stato" [ref=e258]
          - rowgroup [ref=e259]:
            - row "Nessun promemoria pending nelle prossime 24 ore." [ref=e260]:
              - cell "Nessun promemoria pending nelle prossime 24 ore." [ref=e261]
      - generic [ref=e262]:
        - paragraph [ref=e263]:
          - strong [ref=e264]: Sicurezza sessione
        - paragraph [ref=e265]: "TTL sessione: 480 minuti"
        - paragraph [ref=e266]: "Scadenza: 2026-06-17T23:29:17.385Z"
        - paragraph [ref=e267]: "Ultima attivita': 2026-06-17T15:29:17.385Z"
        - paragraph [ref=e268]: "Stato: attiva"
        - paragraph [ref=e269]: "Credenziali: Credenziali entro finestra operativa."
        - paragraph [ref=e270]: "Scadenza credenziali: 2026-09-15T15:29:16.357Z"
        - button "Aggiorna stato sicurezza" [ref=e271]
        - generic [ref=e272]:
          - generic [ref=e273]:
            - text: Filtro audit accessi
            - textbox "Filtro audit accessi" [ref=e274]:
              - /placeholder: es. accesso, scadenza, amministratore
          - button "Applica filtro" [ref=e275]
        - table [ref=e277]:
          - rowgroup [ref=e278]:
            - row "Timestamp Azione Operatore" [ref=e279]:
              - columnheader "Timestamp" [ref=e280]
              - columnheader "Azione" [ref=e281]
              - columnheader "Operatore" [ref=e282]
          - rowgroup [ref=e283]:
            - row "2026-06-17T15:29:16.593Z auth_signin_success admin" [ref=e284]:
              - cell "2026-06-17T15:29:16.593Z" [ref=e285]
              - cell "auth_signin_success" [ref=e286]
              - cell "admin" [ref=e287]
      - generic [ref=e288]:
        - paragraph [ref=e289]:
          - strong [ref=e290]: Dispositivo
        - paragraph [ref=e291]: "Device ID: — (non ancora assegnato)"
        - paragraph [ref=e292]: "Versione dataset locale: —"
      - generic [ref=e293]:
        - paragraph [ref=e294]:
          - strong [ref=e295]: Sincronizzazione
        - generic [ref=e296]:
          - generic [ref=e297]:
            - text: Sincronizza automaticamente ogni
            - combobox "Sincronizza automaticamente ogni" [ref=e298]:
              - option "5 minuti"
              - option "10 minuti"
              - option "15 minuti" [selected]
              - option "30 minuti"
              - option "60 minuti"
          - button "Sincronizza ora" [ref=e299]
      - generic [ref=e300]:
        - paragraph [ref=e301]:
          - strong [ref=e302]: Conflitti sincronizzazione
        - paragraph [ref=e303]: "Conflitti aperti: 0"
        - paragraph [ref=e304]: Nessun conflitto aperto.
      - generic [ref=e305]:
        - paragraph [ref=e306]:
          - strong [ref=e307]: Backup locale
        - paragraph [ref=e308]: Scarica tutti i dati come file JSON oppure ripristina un backup per upgrade sicuri.
        - generic [ref=e309]:
          - button "Scarica backup JSON" [ref=e310]
          - button "Choose File" [ref=e311]
          - button "Ripristina backup da file" [disabled] [ref=e312]
        - paragraph [ref=e313]: "Best practice: esegui prima \"Scarica backup JSON\", poi restore, poi \"Sincronizza ora\"."
      - generic [ref=e314]:
        - paragraph [ref=e315]:
          - strong [ref=e316]: Import CSV guidato
        - paragraph [ref=e317]: Supporta simulazione senza scrittura con report righe scartate secondo mapping v1.
        - generic [ref=e318]:
          - generic [ref=e319]:
            - text: Sorgente
            - combobox "Sorgente" [ref=e320]:
              - option "01_CatalogoFarmaci.csv" [selected]
              - option "02_ConfezioniMagazzino.csv"
              - option "03_Ospiti.csv"
              - option "04_TerapieAttive.csv"
              - option "05_Movimenti.csv"
              - option "09_PromemoriaSomministrazioni.csv"
          - generic [ref=e321]:
            - text: File CSV
            - button "File CSV" [ref=e322]
          - generic [ref=e323]:
            - checkbox "Esegui simulazione (nessuna scrittura)" [checked] [ref=e324]
            - text: Esegui simulazione (nessuna scrittura)
          - button "Avvia import CSV" [ref=e325]
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test'
  2   | import { loginOrRegisterSeededUser } from './helpers/login'
  3   | 
  4   | test('operatori management: add, list, reactivate, delete users with audit logging', async ({ page }) => {
  5   |     test.setTimeout(60_000)
  6   | 
  7   |     await page.route('https://api.github.com/user', async route => {
  8   |         await route.fulfill({
  9   |             status: 200,
  10  |             contentType: 'application/json',
  11  |             body: JSON.stringify({
  12  |                 login: 'seeded-gh-user',
  13  |                 name: 'Seeded User',
  14  |                 avatar_url: 'https://avatars.githubusercontent.com/u/1?v=4',
  15  |             }),
  16  |         })
  17  |     })
  18  | 
  19  |     await page.route('https://api.github.com/gists*', async route => {
  20  |         const req = route.request()
  21  |         const method = req.method()
  22  |         const url = req.url()
  23  | 
  24  |         if (method === 'GET' && url.includes('/gists?')) {
  25  |             await route.fulfill({
  26  |                 status: 200,
  27  |                 contentType: 'application/json',
  28  |                 body: JSON.stringify([{ id: 'gist-seeded-id', description: 'MediTrace — dati personali (non modificare manualmente)' }]),
  29  |             })
  30  |             return
  31  |         }
  32  | 
  33  |         if (method === 'POST' && url.endsWith('/gists')) {
  34  |             const payload = JSON.parse(req.postData() || '{}')
  35  |             const files = payload.files || {}
  36  |             await route.fulfill({
  37  |                 status: 201,
  38  |                 contentType: 'application/json',
  39  |                 body: JSON.stringify({
  40  |                     id: 'gist-seeded-id',
  41  |                     updated_at: new Date().toISOString(),
  42  |                     files: Object.fromEntries(
  43  |                         Object.entries(files).map(([name, value]) => [name, { filename: name, content: value.content || '{}' }]),
  44  |                     ),
  45  |                 }),
  46  |             })
  47  |             return
  48  |         }
  49  | 
  50  |         if (method === 'PATCH' && url.includes('/gists/')) {
  51  |             const payload = JSON.parse(req.postData() || '{}')
  52  |             const files = payload.files || {}
  53  |             await route.fulfill({
  54  |                 status: 200,
  55  |                 contentType: 'application/json',
  56  |                 body: JSON.stringify({
  57  |                     id: 'gist-seeded-id',
  58  |                     updated_at: new Date().toISOString(),
  59  |                     files: Object.fromEntries(
  60  |                         Object.entries(files).map(([name, value]) => [name, { filename: name, content: value.content || '{}' }]),
  61  |                     ),
  62  |                 }),
  63  |             })
  64  |             return
  65  |         }
  66  | 
  67  |         await route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ message: 'not found' }) })
  68  |     })
  69  | 
  70  |     await page.goto('/')
  71  |     await loginOrRegisterSeededUser(page)
  72  | 
  73  |     // Access settings
  74  |     await page.getByRole('link', { name: '⚙' }).click()
  75  |     await expect(page.getByRole('heading', { name: 'Impostazioni' })).toBeVisible()
  76  |     await expect(page.locator('strong', { hasText: 'Utenti' })).toBeVisible()
  77  | 
  78  |     // 1. Check current user info is visible
  79  |     const currentUserInfo = page.locator('div.card').filter({ has: page.locator('strong', { hasText: 'Account operatore' }) }).first()
  80  |     await expect(currentUserInfo).toContainText('Username:')
> 81  |     await expect(currentUserInfo).toContainText('Username: prova')
      |                                   ^ Error: expect(locator).toContainText(expected) failed
  82  | 
  83  |     // 2. List current users - verify seeded user is in the list
  84  |     const usersTable = page.locator('table.conflict-table').filter({ hasText: 'Username' }).first()
  85  |     await expect(usersTable.locator('tbody tr').first()).toBeVisible()
  86  | 
  87  |     // 3. Create a new operator directly from admin panel
  88  |     const suffix = Date.now().toString().slice(-6)
  89  |     const managedUsername = `mariorossi${suffix}`
  90  |     const managedEmail = `mario.rossi+${suffix}@example.com`
  91  |     const createUserSection = page.locator('div.import-form').filter({ has: page.locator('p strong', { hasText: 'Crea nuovo utente' }) }).first()
  92  | 
  93  |     await createUserSection.locator('input[autocomplete="given-name"]').fill('Mario')
  94  |     await createUserSection.locator('input[autocomplete="family-name"]').fill('Rossi')
  95  |     await createUserSection.locator('input[autocomplete="username"]').fill(managedUsername)
  96  |     await createUserSection.locator('input[autocomplete="email"]').fill(managedEmail)
  97  |     await createUserSection.locator('input[autocomplete="new-password"]').fill('NuovaPassword123!')
  98  |     await createUserSection.getByRole('button', { name: 'Crea utente' }).click()
  99  | 
  100 |     await expect(page.getByText(`Utente ${managedUsername} creato.`)).toBeVisible()
  101 | 
  102 |     const usersTableNew = page.locator('table.conflict-table').filter({ hasText: 'Username' }).first()
  103 |     const managedRow = usersTableNew.locator('tbody tr').filter({ hasText: managedUsername }).first()
  104 |     await expect(managedRow).toBeVisible()
  105 | 
  106 |     // Disable and re-enable the created user
  107 |     await managedRow.getByRole('button', { name: 'Disattiva' }).click()
  108 |     await expect(page.getByText(`Utente ${managedUsername} disattivato.`)).toBeVisible()
  109 |     await expect(managedRow.getByRole('button', { name: 'Riattiva' })).toBeVisible()
  110 | 
  111 |     await managedRow.getByRole('button', { name: 'Riattiva' }).click()
  112 |     await expect(page.getByText(`Utente ${managedUsername} riattivato.`)).toBeVisible()
  113 |     await expect(managedRow.getByRole('button', { name: 'Disattiva' })).toBeVisible()
  114 | 
  115 |     // Delete user with confirmation
  116 |     await managedRow.getByRole('button', { name: 'Elimina' }).click()
  117 |     await page.getByText('Elimina Utente').first().waitFor({ state: 'visible', timeout: 10000 })
  118 |     await page.getByRole('button', { name: 'Elimina Utente' }).click()
  119 |     await expect(page.getByText(`Utente ${managedUsername} eliminato definitivamente.`)).toBeVisible()
  120 |     await expect(usersTableNew.locator('tbody tr').filter({ hasText: managedUsername })).toHaveCount(0)
  121 | 
  122 |     // 4. Verify audit log section remains available after user management actions
  123 |     await page.getByRole('link', { name: 'Audit' }).click()
  124 |     await expect(page.getByRole('heading', { name: /Audit/ })).toBeVisible()
  125 | 
  126 |     // Filter for invite-related events
  127 |     const auditTable = page.locator('table[aria-label="Registro operazioni"]').first()
  128 |     await expect(auditTable).toBeVisible()
  129 | 
  130 |     // 5. Return to settings and ensure seeded row is still present
  131 |     await page.getByRole('link', { name: '⚙' }).click()
  132 |     await expect(page.getByRole('heading', { name: 'Impostazioni' })).toBeVisible()
  133 | 
  134 |     // Test data management - ensure seeded current user row remains visible
  135 |     const provaRow = usersTableNew.locator('tbody tr').filter({ hasText: 'prova' })
  136 | 
  137 |     // If there's a Disattiva button, that means the user is active/seeded
  138 |     const disableButtons = provaRow.locator('button:has-text("Disattiva")')
  139 |     if (await disableButtons.count() > 0) {
  140 |         // This is expected for seeded users
  141 |         await expect(disableButtons.first()).toBeVisible()
  142 |     }
  143 | 
  144 |     // 6. Verify there's logging for user management operations
  145 |     // Go back to audit log to check for user-related operations
  146 |     await page.getByRole('link', { name: 'Audit' }).click()
  147 |     await expect(page.getByRole('heading', { name: /Audit/ })).toBeVisible()
  148 | 
  149 |     const auditTableNew = page.locator('table[aria-label="Registro operazioni"]').first()
  150 | 
  151 |     // Verify we have user-related audit entries
  152 |     await expect(auditTableNew.locator('tbody tr').first()).toBeVisible()
  153 |     const auditEntries = auditTableNew.locator('tbody tr')
  154 |     const count = await auditEntries.count()
  155 |     expect(count).toBeGreaterThan(0)
  156 | })
  157 | 
  158 | test('operatori view: profile update creates audit entries', async ({ page }) => {
  159 |     test.setTimeout(30_000)
  160 | 
  161 |     await page.route('https://api.github.com/user', async route => {
  162 |         await route.fulfill({
  163 |             status: 200,
  164 |             contentType: 'application/json',
  165 |             body: JSON.stringify({
  166 |                 login: 'seeded-gh-user',
  167 |                 name: 'Seeded User',
  168 |                 avatar_url: 'https://avatars.githubusercontent.com/u/1?v=4',
  169 |             }),
  170 |         })
  171 |     })
  172 | 
  173 |     await page.route('https://api.github.com/gists*', async route => {
  174 |         const req = route.request()
  175 |         const method = req.method()
  176 |         const url = req.url()
  177 | 
  178 |         if (method === 'GET' && url.includes('/gists?')) {
  179 |             await route.fulfill({
  180 |                 status: 200,
  181 |                 contentType: 'application/json',
```