# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ospiti.spec.js >> ospiti seeded from impostazioni keep 5 plus 7 split by residenza
- Location: tests/e2e/ospiti.spec.js:181:1

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.textContent: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('.card').filter({ hasText: 'Dati di test (live)' }).getByRole('button', { name: /Genera dati di test|Rimuovi dati di test/i }).first()

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
            - 'row "admin (sessione attiva) Admin Emergenza — admin@example.com <<<<<<< HEAD <<<<<<< HEAD ✔ ======= ✔ >>>>>>> e43e62c (fix(e2e): robust selectors and admin-only time slot config section; all E2E tests green) ======= ✔ >>>>>>> 2a10e8f (fix(ui): aggiorna label utente di prova/standard e colonna in impostazioni) — 2026-06-17 15:30:24 <<<<<<< HEAD <<<<<<< HEAD prova ======= prova >>>>>>> e43e62c (fix(e2e): robust selectors and admin-only time slot config section; all E2E tests green) ======= prova >>>>>>> 2a10e8f (fix(ui): aggiorna label utente di prova/standard e colonna in impostazioni) attivo —" [ref=e135]':
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
              - cell "2026-06-17 15:30:24" [ref=e146]
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
            - 'row "anna Anna Bianchi — anna@example.com <<<<<<< HEAD <<<<<<< HEAD ✔ ======= ✔ >>>>>>> e43e62c (fix(e2e): robust selectors and admin-only time slot config section; all E2E tests green) ======= ✔ >>>>>>> 2a10e8f (fix(ui): aggiorna label utente di prova/standard e colonna in impostazioni) — 2026-06-17 15:30:24 Reset PW Logout <<<<<<< HEAD <<<<<<< HEAD prova ======= prova >>>>>>> e43e62c (fix(e2e): robust selectors and admin-only time slot config section; all E2E tests green) ======= prova >>>>>>> 2a10e8f (fix(ui): aggiorna label utente di prova/standard e colonna in impostazioni) attivo Disattiva Elimina" [ref=e153]':
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
              - cell "2026-06-17 15:30:24" [ref=e164]
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
            - 'row "prova — — — — <<<<<<< HEAD <<<<<<< HEAD ✔ ======= ✔ >>>>>>> e43e62c (fix(e2e): robust selectors and admin-only time slot config section; all E2E tests green) ======= ✔ >>>>>>> 2a10e8f (fix(ui): aggiorna label utente di prova/standard e colonna in impostazioni) — 2026-06-17 15:30:24 Reset PW Logout <<<<<<< HEAD <<<<<<< HEAD prova ======= prova >>>>>>> e43e62c (fix(e2e): robust selectors and admin-only time slot config section; all E2E tests green) ======= prova >>>>>>> 2a10e8f (fix(ui): aggiorna label utente di prova/standard e colonna in impostazioni) attivo Disattiva Elimina" [ref=e175]':
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
              - cell "2026-06-17 15:30:24" [ref=e186]
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
            - 'row "valerio Valerio Graziani — valerio@example.com <<<<<<< HEAD <<<<<<< HEAD ✔ ======= ✔ >>>>>>> e43e62c (fix(e2e): robust selectors and admin-only time slot config section; all E2E tests green) ======= ✔ >>>>>>> 2a10e8f (fix(ui): aggiorna label utente di prova/standard e colonna in impostazioni) — 2026-06-17 15:30:24 Reset PW Logout <<<<<<< HEAD <<<<<<< HEAD prova ======= prova >>>>>>> e43e62c (fix(e2e): robust selectors and admin-only time slot config section; all E2E tests green) ======= prova >>>>>>> 2a10e8f (fix(ui): aggiorna label utente di prova/standard e colonna in impostazioni) attivo Disattiva Elimina" [ref=e197]':
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
              - cell "2026-06-17 15:30:24" [ref=e208]
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
        - paragraph [ref=e266]: "Scadenza: 2026-06-17T23:30:25.265Z"
        - paragraph [ref=e267]: "Ultima attivita': 2026-06-17T15:30:25.265Z"
        - paragraph [ref=e268]: "Stato: attiva"
        - paragraph [ref=e269]: "Credenziali: Credenziali entro finestra operativa."
        - paragraph [ref=e270]: "Scadenza credenziali: 2026-09-15T15:30:24.465Z"
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
            - row "2026-06-17T15:30:24.640Z auth_signin_success admin" [ref=e284]:
              - cell "2026-06-17T15:30:24.640Z" [ref=e285]
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
> 205 |     const buttonLabel = ((await toggleTestDataButton.textContent()) || '').trim()
      |                                                      ^ Error: locator.textContent: Test timeout of 30000ms exceeded.
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