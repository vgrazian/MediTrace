# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: operatori.spec.js >> operatori view: profile update creates audit entries
- Location: tests/e2e/operatori.spec.js:158:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('Profilo aggiornato con successo.')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByText('Profilo aggiornato con successo.')

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
            - textbox "Username accesso" [ref=e66]: prova
          - generic [ref=e67]:
            - text: Nome profilo
            - textbox "Nome profilo" [ref=e68]: Giovanni
          - generic [ref=e69]:
            - text: Cognome profilo
            - textbox "Cognome profilo" [ref=e70]: Bianchi
          - generic [ref=e71]:
            - text: Telefono profilo
            - textbox "Telefono profilo" [ref=e72]:
              - /placeholder: +39 333 1234567
              - text: +39 333 9999999
          - generic [ref=e73]:
            - text: Email profilo
            - textbox "Email profilo" [ref=e74]: giovanni.bianchi+test@example.com
          - button "Aggiorna profilo" [ref=e75]
        - paragraph [ref=e76]: "Errore profilo: Username gia esistente"
      - generic [ref=e77]:
        - paragraph [ref=e78]:
          - strong [ref=e79]: Gestione password
        - generic [ref=e80]:
          - generic [ref=e81]:
            - text: Password corrente
            - textbox "Password corrente" [ref=e82]
          - generic [ref=e83]:
            - text: Nuova password
            - textbox "Nuova password" [ref=e84]
          - paragraph [ref=e85]:
            - text: "Regole: 10+ caratteri, maiuscola, minuscola, numero e simbolo."
            - text: "Verifica: no lunghezza · no maiuscola · no minuscola · no numero · no simbolo"
          - generic [ref=e86]:
            - text: Conferma nuova password
            - textbox "Conferma nuova password" [ref=e87]
          - button "Aggiorna password" [disabled] [ref=e88]
      - generic [ref=e89]:
        - paragraph [ref=e90]:
          - strong [ref=e91]: Utenti
        - paragraph [ref=e92]: Gestione utenti consentita solo ad account amministratore. Gli operatori vengono creati direttamente da questo pannello.
        - generic [ref=e93]:
          - paragraph [ref=e94]:
            - strong [ref=e95]: Crea nuovo utente
          - generic [ref=e96]:
            - text: Nome
            - textbox "Nome" [ref=e97]
          - generic [ref=e98]:
            - text: Cognome
            - textbox "Cognome" [ref=e99]
          - generic [ref=e100]:
            - text: Username suggerito
            - textbox "Username suggerito" [ref=e101]
          - paragraph [ref=e102]: "Suggerimento: prime 8 lettere del nome + prime 7 del cognome, modificabile manualmente."
          - generic [ref=e103]:
            - text: Email
            - textbox "Email" [ref=e104]
          - generic [ref=e105]:
            - text: Telefono
            - textbox "Telefono" [ref=e106]:
              - /placeholder: +39 333 1234567
          - generic [ref=e107]:
            - text: Password iniziale
            - textbox "Password iniziale" [ref=e108]
          - paragraph [ref=e109]: "Regole password: no lunghezza · no maiuscola · no minuscola · no numero · no simbolo"
          - generic [ref=e110]:
            - text: Ruolo
            - combobox "Ruolo" [ref=e111]:
              - option "Operatore" [selected]
              - option "Amministratore"
          - generic [ref=e112]:
            - checkbox "Marca come utente di prova" [ref=e113]
            - text: Marca come utente di prova
          - button "Crea utente" [disabled] [ref=e114]
        - table [ref=e116]:
          - rowgroup [ref=e117]:
            - 'row "Username Nome Cognome Telefono Email Admin <<<<<<< HEAD <<<<<<< HEAD Prova ======= Prova >>>>>>> e43e62c (fix(e2e): robust selectors and admin-only time slot config section; all E2E tests green) ======= Prova >>>>>>> 2a10e8f (fix(ui): aggiorna label utente di prova/standard e colonna in impostazioni) Disabilitato Ultima attività Creato il Azioni Tipo Stato Azione" [ref=e118]':
              - columnheader "Username" [ref=e119]
              - columnheader "Nome" [ref=e120]
              - columnheader "Cognome" [ref=e121]
              - columnheader "Telefono" [ref=e122]
              - columnheader "Email" [ref=e123]
              - columnheader "Admin" [ref=e124]
              - text: <<<<<<< HEAD <<<<<<< HEAD
              - columnheader "Prova" [ref=e125]
              - text: =======
              - columnheader "Prova" [ref=e126]
              - text: ">>>>>>> e43e62c (fix(e2e): robust selectors and admin-only time slot config section; all E2E tests green) ======="
              - columnheader "Prova" [ref=e127]
              - text: ">>>>>>> 2a10e8f (fix(ui): aggiorna label utente di prova/standard e colonna in impostazioni)"
              - columnheader "Disabilitato" [ref=e128]
              - columnheader "Ultima attività" [ref=e129]
              - columnheader "Creato il" [ref=e130]
              - columnheader "Azioni" [ref=e131]
              - columnheader "Tipo" [ref=e132]
              - columnheader "Stato" [ref=e133]
              - columnheader "Azione" [ref=e134]
          - rowgroup [ref=e135]:
            - 'row "admin (sessione attiva) Admin Emergenza — admin@example.com <<<<<<< HEAD <<<<<<< HEAD ✔ ======= ✔ >>>>>>> e43e62c (fix(e2e): robust selectors and admin-only time slot config section; all E2E tests green) ======= ✔ >>>>>>> 2a10e8f (fix(ui): aggiorna label utente di prova/standard e colonna in impostazioni) — 2026-06-17 15:29:24 <<<<<<< HEAD <<<<<<< HEAD prova ======= prova >>>>>>> e43e62c (fix(e2e): robust selectors and admin-only time slot config section; all E2E tests green) ======= prova >>>>>>> 2a10e8f (fix(ui): aggiorna label utente di prova/standard e colonna in impostazioni) attivo —" [ref=e136]':
              - cell "admin (sessione attiva)" [ref=e137]
              - cell "Admin" [ref=e138]
              - cell "Emergenza" [ref=e139]
              - cell "—" [ref=e140]
              - cell "admin@example.com" [ref=e141]
              - cell [ref=e142]:
                - checkbox [checked] [disabled] [ref=e143]
              - 'cell "<<<<<<< HEAD <<<<<<< HEAD ✔ ======= ✔ >>>>>>> e43e62c (fix(e2e): robust selectors and admin-only time slot config section; all E2E tests green) ======= ✔ >>>>>>> 2a10e8f (fix(ui): aggiorna label utente di prova/standard e colonna in impostazioni)" [ref=e144]'
              - cell [ref=e145]
              - cell "—" [ref=e146]
              - cell "2026-06-17 15:29:24" [ref=e147]
              - cell [ref=e148]
              - text: <<<<<<< HEAD <<<<<<< HEAD
              - cell "prova" [ref=e149]
              - text: =======
              - cell "prova" [ref=e150]
              - text: ">>>>>>> e43e62c (fix(e2e): robust selectors and admin-only time slot config section; all E2E tests green) ======="
              - cell "prova" [ref=e151]
              - text: ">>>>>>> 2a10e8f (fix(ui): aggiorna label utente di prova/standard e colonna in impostazioni)"
              - cell "attivo" [ref=e152]
              - cell "—" [ref=e153]
            - 'row "anna Anna Bianchi — anna@example.com <<<<<<< HEAD <<<<<<< HEAD ✔ ======= ✔ >>>>>>> e43e62c (fix(e2e): robust selectors and admin-only time slot config section; all E2E tests green) ======= ✔ >>>>>>> 2a10e8f (fix(ui): aggiorna label utente di prova/standard e colonna in impostazioni) — 2026-06-17 15:29:24 Reset PW Logout <<<<<<< HEAD <<<<<<< HEAD prova ======= prova >>>>>>> e43e62c (fix(e2e): robust selectors and admin-only time slot config section; all E2E tests green) ======= prova >>>>>>> 2a10e8f (fix(ui): aggiorna label utente di prova/standard e colonna in impostazioni) attivo Disattiva Elimina" [ref=e154]':
              - cell "anna" [ref=e155]
              - cell "Anna" [ref=e156]
              - cell "Bianchi" [ref=e157]
              - cell "—" [ref=e158]
              - cell "anna@example.com" [ref=e159]
              - cell [ref=e160]:
                - checkbox [ref=e161]
              - 'cell "<<<<<<< HEAD <<<<<<< HEAD ✔ ======= ✔ >>>>>>> e43e62c (fix(e2e): robust selectors and admin-only time slot config section; all E2E tests green) ======= ✔ >>>>>>> 2a10e8f (fix(ui): aggiorna label utente di prova/standard e colonna in impostazioni)" [ref=e162]'
              - cell [ref=e163]
              - cell "—" [ref=e164]
              - cell "2026-06-17 15:29:24" [ref=e165]
              - cell "Reset PW Logout" [ref=e166]:
                - button "Reset PW" [ref=e167]
                - button "Logout" [ref=e168]
              - text: <<<<<<< HEAD <<<<<<< HEAD
              - cell "prova" [ref=e169]
              - text: =======
              - cell "prova" [ref=e170]
              - text: ">>>>>>> e43e62c (fix(e2e): robust selectors and admin-only time slot config section; all E2E tests green) ======="
              - cell "prova" [ref=e171]
              - text: ">>>>>>> 2a10e8f (fix(ui): aggiorna label utente di prova/standard e colonna in impostazioni)"
              - cell "attivo" [ref=e172]
              - cell "Disattiva Elimina" [ref=e173]:
                - button "Disattiva" [ref=e174]
                - button "Elimina" [ref=e175]
            - 'row "prova — — — — <<<<<<< HEAD <<<<<<< HEAD ✔ ======= ✔ >>>>>>> e43e62c (fix(e2e): robust selectors and admin-only time slot config section; all E2E tests green) ======= ✔ >>>>>>> 2a10e8f (fix(ui): aggiorna label utente di prova/standard e colonna in impostazioni) — 2026-06-17 15:29:24 Reset PW Logout <<<<<<< HEAD <<<<<<< HEAD prova ======= prova >>>>>>> e43e62c (fix(e2e): robust selectors and admin-only time slot config section; all E2E tests green) ======= prova >>>>>>> 2a10e8f (fix(ui): aggiorna label utente di prova/standard e colonna in impostazioni) attivo Disattiva Elimina" [ref=e176]':
              - cell "prova" [ref=e177]
              - cell "—" [ref=e178]
              - cell "—" [ref=e179]
              - cell "—" [ref=e180]
              - cell "—" [ref=e181]
              - cell [ref=e182]:
                - checkbox [checked] [ref=e183]
              - 'cell "<<<<<<< HEAD <<<<<<< HEAD ✔ ======= ✔ >>>>>>> e43e62c (fix(e2e): robust selectors and admin-only time slot config section; all E2E tests green) ======= ✔ >>>>>>> 2a10e8f (fix(ui): aggiorna label utente di prova/standard e colonna in impostazioni)" [ref=e184]'
              - cell [ref=e185]
              - cell "—" [ref=e186]
              - cell "2026-06-17 15:29:24" [ref=e187]
              - cell "Reset PW Logout" [ref=e188]:
                - button "Reset PW" [ref=e189]
                - button "Logout" [ref=e190]
              - text: <<<<<<< HEAD <<<<<<< HEAD
              - cell "prova" [ref=e191]
              - text: =======
              - cell "prova" [ref=e192]
              - text: ">>>>>>> e43e62c (fix(e2e): robust selectors and admin-only time slot config section; all E2E tests green) ======="
              - cell "prova" [ref=e193]
              - text: ">>>>>>> 2a10e8f (fix(ui): aggiorna label utente di prova/standard e colonna in impostazioni)"
              - cell "attivo" [ref=e194]
              - cell "Disattiva Elimina" [ref=e195]:
                - button "Disattiva" [ref=e196]
                - button "Elimina" [ref=e197]
            - 'row "valerio Valerio Graziani — valerio@example.com <<<<<<< HEAD <<<<<<< HEAD ✔ ======= ✔ >>>>>>> e43e62c (fix(e2e): robust selectors and admin-only time slot config section; all E2E tests green) ======= ✔ >>>>>>> 2a10e8f (fix(ui): aggiorna label utente di prova/standard e colonna in impostazioni) — 2026-06-17 15:29:24 Reset PW Logout <<<<<<< HEAD <<<<<<< HEAD prova ======= prova >>>>>>> e43e62c (fix(e2e): robust selectors and admin-only time slot config section; all E2E tests green) ======= prova >>>>>>> 2a10e8f (fix(ui): aggiorna label utente di prova/standard e colonna in impostazioni) attivo Disattiva Elimina" [ref=e198]':
              - cell "valerio" [ref=e199]
              - cell "Valerio" [ref=e200]
              - cell "Graziani" [ref=e201]
              - cell "—" [ref=e202]
              - cell "valerio@example.com" [ref=e203]
              - cell [ref=e204]:
                - checkbox [ref=e205]
              - 'cell "<<<<<<< HEAD <<<<<<< HEAD ✔ ======= ✔ >>>>>>> e43e62c (fix(e2e): robust selectors and admin-only time slot config section; all E2E tests green) ======= ✔ >>>>>>> 2a10e8f (fix(ui): aggiorna label utente di prova/standard e colonna in impostazioni)" [ref=e206]'
              - cell [ref=e207]
              - cell "—" [ref=e208]
              - cell "2026-06-17 15:29:24" [ref=e209]
              - cell "Reset PW Logout" [ref=e210]:
                - button "Reset PW" [ref=e211]
                - button "Logout" [ref=e212]
              - text: <<<<<<< HEAD <<<<<<< HEAD
              - cell "prova" [ref=e213]
              - text: =======
              - cell "prova" [ref=e214]
              - text: ">>>>>>> e43e62c (fix(e2e): robust selectors and admin-only time slot config section; all E2E tests green) ======="
              - cell "prova" [ref=e215]
              - text: ">>>>>>> 2a10e8f (fix(ui): aggiorna label utente di prova/standard e colonna in impostazioni)"
              - cell "attivo" [ref=e216]
              - cell "Disattiva Elimina" [ref=e217]:
                - button "Disattiva" [ref=e218]
                - button "Elimina" [ref=e219]
        - generic [ref=e220]:
          - paragraph [ref=e221]:
            - strong [ref=e222]: Dati demo (live)
          - paragraph [ref=e223]: Usa questo pulsante per importare rapidamente dati dimostrativi o per ripulirli. I dati vengono creati nella residenza "Residenza Demo", lasciando "Il Rifugio" e "Via Bellani" vuote.
          - paragraph [ref=e224]: "Pacchetto: 10 farmaci · 10 ospiti · 11 confezioni · 15 terapie · 15 movimenti · 15 promemoria"
          - button "Genera dati demo" [ref=e225]
      - generic [ref=e226]:
        - paragraph [ref=e227]:
          - strong [ref=e228]: Notifiche promemoria
        - paragraph [ref=e229]: "Supporto browser: si"
        - paragraph [ref=e230]: "Permesso: denied"
        - paragraph [ref=e231]: "Stato: non abilitate"
        - paragraph [ref=e232]: "Dettaglio: Bloccate dal browser/dispositivo."
        - generic [ref=e233]:
          - button "Abilita notifiche" [ref=e234]
          - button "Invia notifica test" [disabled] [ref=e235]
          - button "Verifica promemoria imminenti" [disabled] [ref=e236]
          - button "Aggiorna stato" [ref=e237]
        - paragraph [ref=e238]:
          - strong [ref=e239]: Web Push API (base)
        - paragraph [ref=e240]: "Supporto Push API: no"
        - paragraph [ref=e241]: "VAPID public key: mancante"
        - paragraph [ref=e242]: "Stato sottoscrizione: non attiva"
        - paragraph [ref=e243]: "Dettaglio: Push API non supportata in questo ambiente."
        - generic [ref=e244]:
          - button "Attiva sottoscrizione push" [disabled] [ref=e245]
          - button "Disattiva sottoscrizione push" [disabled] [ref=e246]
          - button "Aggiorna stato push" [ref=e247]
        - paragraph [ref=e248]:
          - strong [ref=e249]: Promemoria prossime 24h (pending)
        - paragraph [ref=e250]: Questa lista supporta il controllo operativo dei reminder candidati alla notifica nelle prossime 24 ore.
        - button "Aggiorna lista 24h" [ref=e251]
        - table [ref=e253]:
          - rowgroup [ref=e254]:
            - row "Orario Ospite Farmaco Stato" [ref=e255]:
              - columnheader "Orario" [ref=e256]
              - columnheader "Ospite" [ref=e257]
              - columnheader "Farmaco" [ref=e258]
              - columnheader "Stato" [ref=e259]
          - rowgroup [ref=e260]:
            - row "Nessun promemoria pending nelle prossime 24 ore." [ref=e261]:
              - cell "Nessun promemoria pending nelle prossime 24 ore." [ref=e262]
      - generic [ref=e263]:
        - paragraph [ref=e264]:
          - strong [ref=e265]: Sicurezza sessione
        - paragraph [ref=e266]: "TTL sessione: 480 minuti"
        - paragraph [ref=e267]: "Scadenza: 2026-06-17T23:29:25.474Z"
        - paragraph [ref=e268]: "Ultima attivita': 2026-06-17T15:29:25.474Z"
        - paragraph [ref=e269]: "Stato: attiva"
        - paragraph [ref=e270]: "Credenziali: Credenziali entro finestra operativa."
        - paragraph [ref=e271]: "Scadenza credenziali: 2026-09-15T15:29:24.542Z"
        - button "Aggiorna stato sicurezza" [ref=e272]
        - generic [ref=e273]:
          - generic [ref=e274]:
            - text: Filtro audit accessi
            - textbox "Filtro audit accessi" [ref=e275]:
              - /placeholder: es. accesso, scadenza, amministratore
          - button "Applica filtro" [ref=e276]
        - table [ref=e278]:
          - rowgroup [ref=e279]:
            - row "Timestamp Azione Operatore" [ref=e280]:
              - columnheader "Timestamp" [ref=e281]
              - columnheader "Azione" [ref=e282]
              - columnheader "Operatore" [ref=e283]
          - rowgroup [ref=e284]:
            - row "2026-06-17T15:29:24.798Z auth_signin_success admin" [ref=e285]:
              - cell "2026-06-17T15:29:24.798Z" [ref=e286]
              - cell "auth_signin_success" [ref=e287]
              - cell "admin" [ref=e288]
      - generic [ref=e289]:
        - paragraph [ref=e290]:
          - strong [ref=e291]: Dispositivo
        - paragraph [ref=e292]: "Device ID: — (non ancora assegnato)"
        - paragraph [ref=e293]: "Versione dataset locale: —"
      - generic [ref=e294]:
        - paragraph [ref=e295]:
          - strong [ref=e296]: Sincronizzazione
        - generic [ref=e297]:
          - generic [ref=e298]:
            - text: Sincronizza automaticamente ogni
            - combobox "Sincronizza automaticamente ogni" [ref=e299]:
              - option "5 minuti"
              - option "10 minuti"
              - option "15 minuti" [selected]
              - option "30 minuti"
              - option "60 minuti"
          - button "Sincronizza ora" [ref=e300]
      - generic [ref=e301]:
        - paragraph [ref=e302]:
          - strong [ref=e303]: Conflitti sincronizzazione
        - paragraph [ref=e304]: "Conflitti aperti: 0"
        - paragraph [ref=e305]: Nessun conflitto aperto.
      - generic [ref=e306]:
        - paragraph [ref=e307]:
          - strong [ref=e308]: Backup locale
        - paragraph [ref=e309]: Scarica tutti i dati come file JSON oppure ripristina un backup per upgrade sicuri.
        - generic [ref=e310]:
          - button "Scarica backup JSON" [ref=e311]
          - button "Choose File" [ref=e312]
          - button "Ripristina backup da file" [disabled] [ref=e313]
        - paragraph [ref=e314]: "Best practice: esegui prima \"Scarica backup JSON\", poi restore, poi \"Sincronizza ora\"."
      - generic [ref=e315]:
        - paragraph [ref=e316]:
          - strong [ref=e317]: Import CSV guidato
        - paragraph [ref=e318]: Supporta simulazione senza scrittura con report righe scartate secondo mapping v1.
        - generic [ref=e319]:
          - generic [ref=e320]:
            - text: Sorgente
            - combobox "Sorgente" [ref=e321]:
              - option "01_CatalogoFarmaci.csv" [selected]
              - option "02_ConfezioniMagazzino.csv"
              - option "03_Ospiti.csv"
              - option "04_TerapieAttive.csv"
              - option "05_Movimenti.csv"
              - option "09_PromemoriaSomministrazioni.csv"
          - generic [ref=e322]:
            - text: File CSV
            - button "File CSV" [ref=e323]
          - generic [ref=e324]:
            - checkbox "Esegui simulazione (nessuna scrittura)" [checked] [ref=e325]
            - text: Esegui simulazione (nessuna scrittura)
          - button "Avvia import CSV" [ref=e326]
```

# Test source

```ts
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
  182 |                 body: JSON.stringify([{ id: 'gist-seeded-id', description: 'MediTrace — dati personali (non modificare manualmente)' }]),
  183 |             })
  184 |             return
  185 |         }
  186 | 
  187 |         if (method === 'POST' && url.endsWith('/gists')) {
  188 |             const payload = JSON.parse(req.postData() || '{}')
  189 |             const files = payload.files || {}
  190 |             await route.fulfill({
  191 |                 status: 201,
  192 |                 contentType: 'application/json',
  193 |                 body: JSON.stringify({
  194 |                     id: 'gist-seeded-id',
  195 |                     updated_at: new Date().toISOString(),
  196 |                     files: Object.fromEntries(
  197 |                         Object.entries(files).map(([name, value]) => [name, { filename: name, content: value.content || '{}' }]),
  198 |                     ),
  199 |                 }),
  200 |             })
  201 |             return
  202 |         }
  203 | 
  204 |         if (method === 'PATCH' && url.includes('/gists/')) {
  205 |             const payload = JSON.parse(req.postData() || '{}')
  206 |             const files = payload.files || {}
  207 |             await route.fulfill({
  208 |                 status: 200,
  209 |                 contentType: 'application/json',
  210 |                 body: JSON.stringify({
  211 |                     id: 'gist-seeded-id',
  212 |                     updated_at: new Date().toISOString(),
  213 |                     files: Object.fromEntries(
  214 |                         Object.entries(files).map(([name, value]) => [name, { filename: name, content: value.content || '{}' }]),
  215 |                     ),
  216 |                 }),
  217 |             })
  218 |             return
  219 |         }
  220 | 
  221 |         await route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ message: 'not found' }) })
  222 |     })
  223 | 
  224 |     await page.goto('/')
  225 |     await loginOrRegisterSeededUser(page)
  226 | 
  227 |     // Update profile and verify audit logging
  228 |     await page.getByRole('link', { name: '⚙' }).click()
  229 |     await expect(page.getByRole('heading', { name: 'Impostazioni' })).toBeVisible()
  230 | 
  231 |     // Update profile fields
  232 |     await page.getByLabel('Nome profilo', { exact: true }).fill('Giovanni')
  233 |     await page.getByLabel('Cognome profilo', { exact: true }).fill('Bianchi')
  234 |     await page.getByLabel('Username accesso', { exact: true }).fill('prova')
  235 |     await page.getByLabel('Telefono profilo', { exact: true }).fill('+39 333 9999999')
  236 |     await page.getByLabel('Email profilo', { exact: true }).fill('giovanni.bianchi+test@example.com')
  237 | 
  238 |     const updateBtn = page.getByRole('button', { name: 'Aggiorna profilo' })
  239 |     await updateBtn.click()
  240 | 
  241 |     // Verify success message
> 242 |     await expect(page.getByText('Profilo aggiornato con successo.')).toBeVisible()
      |                                                                      ^ Error: expect(locator).toBeVisible() failed
  243 | 
  244 |     // Navigate to audit log to verify profile update was logged
  245 |     await page.getByRole('link', { name: 'Audit' }).click()
  246 |     await expect(page.getByRole('heading', { name: /Audit/ })).toBeVisible()
  247 | 
  248 |     const auditTable = page.locator('table[aria-label="Registro operazioni"]').first()
  249 |     const auditRows = auditTable.locator('tbody tr')
  250 | 
  251 |     // Audit table should be available after profile update
  252 |     await expect(auditRows.first()).toBeVisible()
  253 | })
  254 | 
  255 | test('operatori view: password change and session invalidation', async ({ page }) => {
  256 |     test.setTimeout(30_000)
  257 | 
  258 |     await page.route('https://api.github.com/user', async route => {
  259 |         await route.fulfill({
  260 |             status: 200,
  261 |             contentType: 'application/json',
  262 |             body: JSON.stringify({
  263 |                 login: 'seeded-gh-user',
  264 |                 name: 'Seeded User',
  265 |                 avatar_url: 'https://avatars.githubusercontent.com/u/1?v=4',
  266 |             }),
  267 |         })
  268 |     })
  269 | 
  270 |     await page.route('https://api.github.com/gists*', async route => {
  271 |         const req = route.request()
  272 |         const method = req.method()
  273 |         const url = req.url()
  274 | 
  275 |         if (method === 'GET' && url.includes('/gists?')) {
  276 |             await route.fulfill({
  277 |                 status: 200,
  278 |                 contentType: 'application/json',
  279 |                 body: JSON.stringify([{ id: 'gist-seeded-id', description: 'MediTrace — dati personali (non modificare manualmente)' }]),
  280 |             })
  281 |             return
  282 |         }
  283 | 
  284 |         if (method === 'POST' && url.endsWith('/gists')) {
  285 |             const payload = JSON.parse(req.postData() || '{}')
  286 |             const files = payload.files || {}
  287 |             await route.fulfill({
  288 |                 status: 201,
  289 |                 contentType: 'application/json',
  290 |                 body: JSON.stringify({
  291 |                     id: 'gist-seeded-id',
  292 |                     updated_at: new Date().toISOString(),
  293 |                     files: Object.fromEntries(
  294 |                         Object.entries(files).map(([name, value]) => [name, { filename: name, content: value.content || '{}' }]),
  295 |                     ),
  296 |                 }),
  297 |             })
  298 |             return
  299 |         }
  300 | 
  301 |         if (method === 'PATCH' && url.includes('/gists/')) {
  302 |             const payload = JSON.parse(req.postData() || '{}')
  303 |             const files = payload.files || {}
  304 |             await route.fulfill({
  305 |                 status: 200,
  306 |                 contentType: 'application/json',
  307 |                 body: JSON.stringify({
  308 |                     id: 'gist-seeded-id',
  309 |                     updated_at: new Date().toISOString(),
  310 |                     files: Object.fromEntries(
  311 |                         Object.entries(files).map(([name, value]) => [name, { filename: name, content: value.content || '{}' }]),
  312 |                     ),
  313 |                 }),
  314 |             })
  315 |             return
  316 |         }
  317 | 
  318 |         await route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ message: 'not found' }) })
  319 |     })
  320 | 
  321 |     await page.goto('/')
  322 |     await loginOrRegisterSeededUser(page)
  323 | 
  324 |     // Change password
  325 |     await page.getByRole('link', { name: '⚙' }).click()
  326 |     await expect(page.getByRole('heading', { name: 'Impostazioni' })).toBeVisible()
  327 | 
  328 |     await page.locator('input[autocomplete="current-password"]').fill('Prova1234!')
  329 |     await page.locator('input[autocomplete="new-password"]').first().fill('NuovaPassword123!')
  330 |     await page.locator('input[autocomplete="new-password"]').nth(1).fill('NuovaPassword123!')
  331 | 
  332 |     const changeBtn = page.getByRole('button', { name: 'Aggiorna password' })
  333 |     await changeBtn.click()
  334 | 
  335 |     // Should be redirected to login
  336 |     await expect(page.locator('.login-screen')).toBeVisible({ timeout: 5000 })
  337 | 
  338 |     // Log back in with new password
  339 |     await loginOrRegisterSeededUser(page, { password: 'NuovaPassword123!' })
  340 | 
  341 |     // Verify we're back in the authenticated UI
  342 |     const homeLink = page.getByRole('link', { name: 'Cruscotto' })
```