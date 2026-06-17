# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth-and-users.spec.js >> admin promuove operatore e verifica permessi fasce orarie
- Location: tests/e2e/auth-and-users.spec.js:3:1

# Error details

```
TypeError: Cannot read properties of undefined (reading 'toBeChecked')
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
          - paragraph [ref=e114]: Utente operatore1 creato.
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
            - 'row "admin (sessione attiva) Admin Emergenza — admin@example.com <<<<<<< HEAD <<<<<<< HEAD ✔ ======= ✔ >>>>>>> e43e62c (fix(e2e): robust selectors and admin-only time slot config section; all E2E tests green) ======= ✔ >>>>>>> 2a10e8f (fix(ui): aggiorna label utente di prova/standard e colonna in impostazioni) — 2026-06-17 15:28:37 <<<<<<< HEAD <<<<<<< HEAD prova ======= prova >>>>>>> e43e62c (fix(e2e): robust selectors and admin-only time slot config section; all E2E tests green) ======= prova >>>>>>> 2a10e8f (fix(ui): aggiorna label utente di prova/standard e colonna in impostazioni) attivo —" [ref=e136]':
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
              - cell "2026-06-17 15:28:37" [ref=e147]
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
            - 'row "anna Anna Bianchi — anna@example.com <<<<<<< HEAD <<<<<<< HEAD ✔ ======= ✔ >>>>>>> e43e62c (fix(e2e): robust selectors and admin-only time slot config section; all E2E tests green) ======= ✔ >>>>>>> 2a10e8f (fix(ui): aggiorna label utente di prova/standard e colonna in impostazioni) — 2026-06-17 15:28:37 Reset PW Logout <<<<<<< HEAD <<<<<<< HEAD prova ======= prova >>>>>>> e43e62c (fix(e2e): robust selectors and admin-only time slot config section; all E2E tests green) ======= prova >>>>>>> 2a10e8f (fix(ui): aggiorna label utente di prova/standard e colonna in impostazioni) attivo Disattiva Elimina" [ref=e154]':
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
              - cell "2026-06-17 15:28:37" [ref=e165]
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
            - 'row "operatore1 Operatore Test — operatore1@example.com <<<<<<< HEAD <<<<<<< HEAD ======= >>>>>>> e43e62c (fix(e2e): robust selectors and admin-only time slot config section; all E2E tests green) ======= >>>>>>> 2a10e8f (fix(ui): aggiorna label utente di prova/standard e colonna in impostazioni) — 2026-06-17 15:28:38 Reset PW Logout <<<<<<< HEAD <<<<<<< HEAD standard ======= standard >>>>>>> e43e62c (fix(e2e): robust selectors and admin-only time slot config section; all E2E tests green) ======= standard >>>>>>> 2a10e8f (fix(ui): aggiorna label utente di prova/standard e colonna in impostazioni) attivo Disattiva Elimina" [ref=e176]':
              - cell "operatore1" [ref=e177]
              - cell "Operatore" [ref=e178]
              - cell "Test" [ref=e179]
              - cell "—" [ref=e180]
              - cell "operatore1@example.com" [ref=e181]
              - cell [ref=e182]:
                - checkbox [active] [ref=e183]
              - 'cell "<<<<<<< HEAD <<<<<<< HEAD ======= >>>>>>> e43e62c (fix(e2e): robust selectors and admin-only time slot config section; all E2E tests green) ======= >>>>>>> 2a10e8f (fix(ui): aggiorna label utente di prova/standard e colonna in impostazioni)" [ref=e184]'
              - cell [ref=e185]
              - cell "—" [ref=e186]
              - cell "2026-06-17 15:28:38" [ref=e187]
              - cell "Reset PW Logout" [ref=e188]:
                - button "Reset PW" [ref=e189]
                - button "Logout" [ref=e190]
              - text: <<<<<<< HEAD <<<<<<< HEAD
              - cell "standard" [ref=e191]
              - text: =======
              - cell "standard" [ref=e192]
              - text: ">>>>>>> e43e62c (fix(e2e): robust selectors and admin-only time slot config section; all E2E tests green) ======="
              - cell "standard" [ref=e193]
              - text: ">>>>>>> 2a10e8f (fix(ui): aggiorna label utente di prova/standard e colonna in impostazioni)"
              - cell "attivo" [ref=e194]
              - cell "Disattiva Elimina" [ref=e195]:
                - button "Disattiva" [ref=e196]
                - button "Elimina" [ref=e197]
            - 'row "prova — — — — <<<<<<< HEAD <<<<<<< HEAD ✔ ======= ✔ >>>>>>> e43e62c (fix(e2e): robust selectors and admin-only time slot config section; all E2E tests green) ======= ✔ >>>>>>> 2a10e8f (fix(ui): aggiorna label utente di prova/standard e colonna in impostazioni) — 2026-06-17 15:28:37 Reset PW Logout <<<<<<< HEAD <<<<<<< HEAD prova ======= prova >>>>>>> e43e62c (fix(e2e): robust selectors and admin-only time slot config section; all E2E tests green) ======= prova >>>>>>> 2a10e8f (fix(ui): aggiorna label utente di prova/standard e colonna in impostazioni) attivo Disattiva Elimina" [ref=e198]':
              - cell "prova" [ref=e199]
              - cell "—" [ref=e200]
              - cell "—" [ref=e201]
              - cell "—" [ref=e202]
              - cell "—" [ref=e203]
              - cell [ref=e204]:
                - checkbox [checked] [ref=e205]
              - 'cell "<<<<<<< HEAD <<<<<<< HEAD ✔ ======= ✔ >>>>>>> e43e62c (fix(e2e): robust selectors and admin-only time slot config section; all E2E tests green) ======= ✔ >>>>>>> 2a10e8f (fix(ui): aggiorna label utente di prova/standard e colonna in impostazioni)" [ref=e206]'
              - cell [ref=e207]
              - cell "—" [ref=e208]
              - cell "2026-06-17 15:28:37" [ref=e209]
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
            - 'row "valerio Valerio Graziani — valerio@example.com <<<<<<< HEAD <<<<<<< HEAD ✔ ======= ✔ >>>>>>> e43e62c (fix(e2e): robust selectors and admin-only time slot config section; all E2E tests green) ======= ✔ >>>>>>> 2a10e8f (fix(ui): aggiorna label utente di prova/standard e colonna in impostazioni) — 2026-06-17 15:28:37 Reset PW Logout <<<<<<< HEAD <<<<<<< HEAD prova ======= prova >>>>>>> e43e62c (fix(e2e): robust selectors and admin-only time slot config section; all E2E tests green) ======= prova >>>>>>> 2a10e8f (fix(ui): aggiorna label utente di prova/standard e colonna in impostazioni) attivo Disattiva Elimina" [ref=e220]':
              - cell "valerio" [ref=e221]
              - cell "Valerio" [ref=e222]
              - cell "Graziani" [ref=e223]
              - cell "—" [ref=e224]
              - cell "valerio@example.com" [ref=e225]
              - cell [ref=e226]:
                - checkbox [ref=e227]
              - 'cell "<<<<<<< HEAD <<<<<<< HEAD ✔ ======= ✔ >>>>>>> e43e62c (fix(e2e): robust selectors and admin-only time slot config section; all E2E tests green) ======= ✔ >>>>>>> 2a10e8f (fix(ui): aggiorna label utente di prova/standard e colonna in impostazioni)" [ref=e228]'
              - cell [ref=e229]
              - cell "—" [ref=e230]
              - cell "2026-06-17 15:28:37" [ref=e231]
              - cell "Reset PW Logout" [ref=e232]:
                - button "Reset PW" [ref=e233]
                - button "Logout" [ref=e234]
              - text: <<<<<<< HEAD <<<<<<< HEAD
              - cell "prova" [ref=e235]
              - text: =======
              - cell "prova" [ref=e236]
              - text: ">>>>>>> e43e62c (fix(e2e): robust selectors and admin-only time slot config section; all E2E tests green) ======="
              - cell "prova" [ref=e237]
              - text: ">>>>>>> 2a10e8f (fix(ui): aggiorna label utente di prova/standard e colonna in impostazioni)"
              - cell "attivo" [ref=e238]
              - cell "Disattiva Elimina" [ref=e239]:
                - button "Disattiva" [ref=e240]
                - button "Elimina" [ref=e241]
        - generic [ref=e242]:
          - paragraph [ref=e243]:
            - strong [ref=e244]: Dati demo (live)
          - paragraph [ref=e245]: Usa questo pulsante per importare rapidamente dati dimostrativi o per ripulirli. I dati vengono creati nella residenza "Residenza Demo", lasciando "Il Rifugio" e "Via Bellani" vuote.
          - paragraph [ref=e246]: "Pacchetto: 10 farmaci · 10 ospiti · 11 confezioni · 15 terapie · 15 movimenti · 15 promemoria"
          - button "Genera dati demo" [ref=e247]
      - generic [ref=e248]:
        - paragraph [ref=e249]:
          - strong [ref=e250]: Notifiche promemoria
        - paragraph [ref=e251]: "Supporto browser: si"
        - paragraph [ref=e252]: "Permesso: denied"
        - paragraph [ref=e253]: "Stato: non abilitate"
        - paragraph [ref=e254]: "Dettaglio: Bloccate dal browser/dispositivo."
        - generic [ref=e255]:
          - button "Abilita notifiche" [ref=e256]
          - button "Invia notifica test" [disabled] [ref=e257]
          - button "Verifica promemoria imminenti" [disabled] [ref=e258]
          - button "Aggiorna stato" [ref=e259]
        - paragraph [ref=e260]:
          - strong [ref=e261]: Web Push API (base)
        - paragraph [ref=e262]: "Supporto Push API: no"
        - paragraph [ref=e263]: "VAPID public key: mancante"
        - paragraph [ref=e264]: "Stato sottoscrizione: non attiva"
        - paragraph [ref=e265]: "Dettaglio: Push API non supportata in questo ambiente."
        - generic [ref=e266]:
          - button "Attiva sottoscrizione push" [disabled] [ref=e267]
          - button "Disattiva sottoscrizione push" [disabled] [ref=e268]
          - button "Aggiorna stato push" [ref=e269]
        - paragraph [ref=e270]:
          - strong [ref=e271]: Promemoria prossime 24h (pending)
        - paragraph [ref=e272]: Questa lista supporta il controllo operativo dei reminder candidati alla notifica nelle prossime 24 ore.
        - button "Aggiorna lista 24h" [ref=e273]
        - table [ref=e275]:
          - rowgroup [ref=e276]:
            - row "Orario Ospite Farmaco Stato" [ref=e277]:
              - columnheader "Orario" [ref=e278]
              - columnheader "Ospite" [ref=e279]
              - columnheader "Farmaco" [ref=e280]
              - columnheader "Stato" [ref=e281]
          - rowgroup [ref=e282]:
            - row "Nessun promemoria pending nelle prossime 24 ore." [ref=e283]:
              - cell "Nessun promemoria pending nelle prossime 24 ore." [ref=e284]
      - generic [ref=e285]:
        - paragraph [ref=e286]:
          - strong [ref=e287]: Sicurezza sessione
        - paragraph [ref=e288]: "TTL sessione: 480 minuti"
        - paragraph [ref=e289]: "Scadenza: 2026-06-17T23:28:38.580Z"
        - paragraph [ref=e290]: "Ultima attivita': 2026-06-17T15:28:38.580Z"
        - paragraph [ref=e291]: "Stato: attiva"
        - paragraph [ref=e292]: "Credenziali: Credenziali entro finestra operativa."
        - paragraph [ref=e293]: "Scadenza credenziali: 2026-09-15T15:28:37.520Z"
        - button "Aggiorna stato sicurezza" [ref=e294]
        - generic [ref=e295]:
          - generic [ref=e296]:
            - text: Filtro audit accessi
            - textbox "Filtro audit accessi" [ref=e297]:
              - /placeholder: es. accesso, scadenza, amministratore
          - button "Applica filtro" [ref=e298]
        - table [ref=e300]:
          - rowgroup [ref=e301]:
            - row "Timestamp Azione Operatore" [ref=e302]:
              - columnheader "Timestamp" [ref=e303]
              - columnheader "Azione" [ref=e304]
              - columnheader "Operatore" [ref=e305]
          - rowgroup [ref=e306]:
            - row "2026-06-17T15:28:37.852Z auth_signin_success admin" [ref=e307]:
              - cell "2026-06-17T15:28:37.852Z" [ref=e308]
              - cell "auth_signin_success" [ref=e309]
              - cell "admin" [ref=e310]
      - generic [ref=e311]:
        - paragraph [ref=e312]:
          - strong [ref=e313]: Dispositivo
        - paragraph [ref=e314]: "Device ID: — (non ancora assegnato)"
        - paragraph [ref=e315]: "Versione dataset locale: —"
      - generic [ref=e316]:
        - paragraph [ref=e317]:
          - strong [ref=e318]: Sincronizzazione
        - generic [ref=e319]:
          - generic [ref=e320]:
            - text: Sincronizza automaticamente ogni
            - combobox "Sincronizza automaticamente ogni" [ref=e321]:
              - option "5 minuti"
              - option "10 minuti"
              - option "15 minuti" [selected]
              - option "30 minuti"
              - option "60 minuti"
          - button "Sincronizza ora" [ref=e322]
      - generic [ref=e323]:
        - paragraph [ref=e324]:
          - strong [ref=e325]: Conflitti sincronizzazione
        - paragraph [ref=e326]: "Conflitti aperti: 0"
        - paragraph [ref=e327]: Nessun conflitto aperto.
      - generic [ref=e328]:
        - paragraph [ref=e329]:
          - strong [ref=e330]: Backup locale
        - paragraph [ref=e331]: Scarica tutti i dati come file JSON oppure ripristina un backup per upgrade sicuri.
        - generic [ref=e332]:
          - button "Scarica backup JSON" [ref=e333]
          - button "Choose File" [ref=e334]
          - button "Ripristina backup da file" [disabled] [ref=e335]
        - paragraph [ref=e336]: "Best practice: esegui prima \"Scarica backup JSON\", poi restore, poi \"Sincronizza ora\"."
      - generic [ref=e337]:
        - paragraph [ref=e338]:
          - strong [ref=e339]: Import CSV guidato
        - paragraph [ref=e340]: Supporta simulazione senza scrittura con report righe scartate secondo mapping v1.
        - generic [ref=e341]:
          - generic [ref=e342]:
            - text: Sorgente
            - combobox "Sorgente" [ref=e343]:
              - option "01_CatalogoFarmaci.csv" [selected]
              - option "02_ConfezioniMagazzino.csv"
              - option "03_Ospiti.csv"
              - option "04_TerapieAttive.csv"
              - option "05_Movimenti.csv"
              - option "09_PromemoriaSomministrazioni.csv"
          - generic [ref=e344]:
            - text: File CSV
            - button "File CSV" [ref=e345]
          - generic [ref=e346]:
            - checkbox "Esegui simulazione (nessuna scrittura)" [checked] [ref=e347]
            - text: Esegui simulazione (nessuna scrittura)
          - button "Avvia import CSV" [ref=e348]
```

# Test source

```ts
  1   | 
  2   | 
  3   | test('admin promuove operatore e verifica permessi fasce orarie', async ({ page }) => {
  4   |     // Aumenta timeout per diagnostica
  5   |     test.setTimeout(60000)
  6   |     console.log('INIZIO TEST: admin promuove operatore')
  7   |     // Login come admin
  8   |     await page.goto('/')
  9   |     console.log('Navigato alla pagina principale...')
  10  |     await loginOrRegisterSeededUser(page)
  11  |     await page.getByRole('link', { name: '⚙' }).click()
  12  |     await expect(page.getByRole('heading', { name: 'Impostazioni' })).toBeVisible()
  13  | 
  14  |     // Crea nuovo operatore (seleziona solo nel form di creazione utente)
  15  |     const creaUtenteForm = page.getByText('Crea nuovo utente').locator('..').locator('..')
  16  |     await creaUtenteForm.getByLabel('Nome').first().fill('Operatore')
  17  |     await creaUtenteForm.getByLabel('Cognome').first().fill('Test')
  18  |     await creaUtenteForm.getByLabel('Username suggerito').fill('operatore1')
  19  |     await creaUtenteForm.getByLabel('Email').fill('operatore1@example.com')
  20  |     await creaUtenteForm.getByLabel('Password iniziale').fill('Test12345!')
  21  |     await creaUtenteForm.getByLabel('Ruolo').selectOption('operator')
  22  |     await creaUtenteForm.getByRole('button', { name: 'Crea utente' }).click()
  23  |     await expect(page.getByText('Utente operatore1 creato.')).toBeVisible()
  24  | 
  25  |     // Promuovi a admin
  26  |     const opRow = page.locator('table.conflict-table tbody tr').filter({ hasText: 'operatore1' }).first()
  27  |     await opRow.locator('input[type="checkbox"]').check()
  28  |     console.log('Promosso a admin, attendo update...')
  29  |     await expect(opRow.locator('input[type="checkbox"]')).toBeChecked()
  30  | 
  31  |     // Degrada a operatore
  32  |     await opRow.locator('input[type="checkbox"]').uncheck()
  33  |     console.log('Degradato a operatore, attendo update...')
> 34  |     await expect(opRow.locator('input[type="checkbox"]').not.toBeChecked())
      |                                                             ^ TypeError: Cannot read properties of undefined (reading 'toBeChecked')
  35  | 
  36  |     // Logout admin
  37  |     await page.getByRole('button', { name: 'Esci' }).click()
  38  |     console.log('Logout admin, clear storage e goto / ...')
  39  |     await page.context().clearCookies()
  40  |     await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); })
  41  |     await page.goto('/')
  42  |     await expect(page.getByRole('textbox', { name: 'Username accesso' })).toBeVisible()
  43  |     // Login come operatore
  44  |     await page.getByRole('textbox', { name: 'Username accesso' }).fill('operatore1')
  45  |     await page.getByLabel('Password').fill('Test12345!')
  46  |     await page.getByRole('button', { name: /Accedi/i }).click()
  47  |     await page.getByRole('link', { name: '⚙' }).click()
  48  |     await expect(page.getByRole('heading', { name: 'Impostazioni' })).toBeVisible()
  49  | 
  50  |     // Verifica che NON possa modificare fasce orarie
  51  |     await expect(page.getByText(/Fasce orarie/)).toHaveCount(0)
  52  |     console.log('Verifica permessi operatore OK')
  53  | 
  54  |     // Logout operatore
  55  |     await page.getByRole('button', { name: 'Esci' }).click()
  56  |     console.log('Logout operatore, login admin...')
  57  | 
  58  |     // Login come admin
  59  |     await loginOrRegisterSeededUser(page)
  60  |     console.log('Login admin riuscito, controllo permessi...')
  61  |     await page.getByRole('link', { name: '⚙' }).click()
  62  |     await expect(page.getByRole('heading', { name: /Impostazioni/ })).toBeVisible()
  63  |     await expect(page.getByText('Fasce orarie configurabili')).toBeVisible()
  64  |     console.log('Verifica permessi admin OK, FINE TEST')
  65  | })
  66  | import { test, expect } from '@playwright/test'
  67  | import { loginOrRegisterSeededUser } from './helpers/login'
  68  | 
  69  | test.beforeEach(async ({ page }) => {
  70  |     let gistCreated = false
  71  | 
  72  |     await page.route('https://api.github.com/user', async route => {
  73  |         await route.fulfill({
  74  |             status: 200,
  75  |             contentType: 'application/json',
  76  |             body: JSON.stringify({
  77  |                 login: 'seeded-gh-user',
  78  |                 name: 'Seeded User',
  79  |                 avatar_url: 'https://avatars.githubusercontent.com/u/1?v=4',
  80  |             }),
  81  |         })
  82  |     })
  83  | 
  84  |     await page.route('https://api.github.com/gists*', async route => {
  85  |         const req = route.request()
  86  |         const method = req.method()
  87  |         const url = req.url()
  88  | 
  89  |         if (method === 'GET' && url.includes('/gists?')) {
  90  |             await route.fulfill({
  91  |                 status: 200,
  92  |                 contentType: 'application/json',
  93  |                 body: JSON.stringify(gistCreated ? [{ id: 'gist-seeded-id', description: 'MediTrace — dati personali (non modificare manualmente)' }] : []),
  94  |             })
  95  |             return
  96  |         }
  97  | 
  98  |         if (method === 'POST' && url.endsWith('/gists')) {
  99  |             gistCreated = true
  100 |             const payload = JSON.parse(req.postData() || '{}')
  101 |             const files = payload.files || {}
  102 | 
  103 |             await route.fulfill({
  104 |                 status: 201,
  105 |                 contentType: 'application/json',
  106 |                 body: JSON.stringify({
  107 |                     id: 'gist-seeded-id',
  108 |                     updated_at: new Date().toISOString(),
  109 |                     files: Object.fromEntries(
  110 |                         Object.entries(files).map(([name, value]) => [name, { filename: name, content: value.content || '{}' }]),
  111 |                     ),
  112 |                 }),
  113 |             })
  114 |             return
  115 |         }
  116 | 
  117 |         await route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ message: 'not found' }) })
  118 |     })
  119 | })
  120 | 
  121 | test('seeded account login, sync, profile update, password change and users section are exercisable automatically', async ({ page }) => {
  122 |     await page.goto('/')
  123 |     await loginOrRegisterSeededUser(page)
  124 | 
  125 |     await page.getByRole('link', { name: '⚙' }).click()
  126 |     await expect(page.getByRole('heading', { name: 'Impostazioni' })).toBeVisible()
  127 |     await expect(page.locator('strong', { hasText: 'Utenti' })).toBeVisible()
  128 | 
  129 |     await page.getByRole('button', { name: 'Sincronizza ora' }).click()
  130 |     await expect(page.getByText(/sincronizzazione inizializzata con successo/i)).toBeVisible()
  131 | 
  132 |     await page.getByLabel('Sorgente').selectOption('01_CatalogoFarmaci.csv')
  133 |     await page.locator('input[type="file"][accept=".csv,text/csv"]').setInputFiles({
  134 |         name: '01_CatalogoFarmaci.csv',
```