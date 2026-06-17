# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: expanded-workflow.spec.js >> therapy dosage adjustments and host-specific drug monitoring
- Location: tests/e2e/expanded-workflow.spec.js:281:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('Terapia aggiornata.')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByText('Terapia aggiornata.')

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
          - paragraph [ref=e44]: 14 risultati su 14
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
            - row "Seleziona terapia [OSP-01] - Rossi Mario Paracetamolo [OSP-01] - Rossi Mario Paracetamolo 1 2 1/10/2026 — Modifica Elimina" [ref=e66]:
              - cell "Seleziona terapia [OSP-01] - Rossi Mario Paracetamolo" [ref=e67]:
                - checkbox "Seleziona terapia [OSP-01] - Rossi Mario Paracetamolo" [ref=e68]
              - cell "[OSP-01] - Rossi Mario" [ref=e69]
              - cell "Paracetamolo" [ref=e70]
              - cell "1" [ref=e71]
              - cell "2" [ref=e72]
              - cell "1/10/2026" [ref=e73]
              - cell "—" [ref=e74]
              - cell "Modifica Elimina" [ref=e75]:
                - button "Modifica" [ref=e76]
                - button "Elimina" [ref=e77]
            - row "Seleziona terapia [OSP-07] - Danti Vito Metformina [OSP-07] - Danti Vito Metformina 1 2 8/20/2025 — Modifica Elimina" [ref=e78]:
              - cell "Seleziona terapia [OSP-07] - Danti Vito Metformina" [ref=e79]:
                - checkbox "Seleziona terapia [OSP-07] - Danti Vito Metformina" [ref=e80]
              - cell "[OSP-07] - Danti Vito" [ref=e81]
              - cell "Metformina" [ref=e82]
              - cell "1" [ref=e83]
              - cell "2" [ref=e84]
              - cell "8/20/2025" [ref=e85]
              - cell "—" [ref=e86]
              - cell "Modifica Elimina" [ref=e87]:
                - button "Modifica" [ref=e88]
                - button "Elimina" [ref=e89]
            - row "Seleziona terapia [OSP-07] - Danti Vito Levotiroxina [OSP-07] - Danti Vito Levotiroxina 1 1 10/10/2025 — Modifica Elimina" [ref=e90]:
              - cell "Seleziona terapia [OSP-07] - Danti Vito Levotiroxina" [ref=e91]:
                - checkbox "Seleziona terapia [OSP-07] - Danti Vito Levotiroxina" [ref=e92]
              - cell "[OSP-07] - Danti Vito" [ref=e93]
              - cell "Levotiroxina" [ref=e94]
              - cell "1" [ref=e95]
              - cell "1" [ref=e96]
              - cell "10/10/2025" [ref=e97]
              - cell "—" [ref=e98]
              - cell "Modifica Elimina" [ref=e99]:
                - button "Modifica" [ref=e100]
                - button "Elimina" [ref=e101]
            - row "Seleziona terapia [OSP-08] - Mansouri Fatima Atenololo [OSP-08] - Mansouri Fatima Atenololo 1 1 1/20/2026 — Modifica Elimina" [ref=e102]:
              - cell "Seleziona terapia [OSP-08] - Mansouri Fatima Atenololo" [ref=e103]:
                - checkbox "Seleziona terapia [OSP-08] - Mansouri Fatima Atenololo" [ref=e104]
              - cell "[OSP-08] - Mansouri Fatima" [ref=e105]
              - cell "Atenololo" [ref=e106]
              - cell "1" [ref=e107]
              - cell "1" [ref=e108]
              - cell "1/20/2026" [ref=e109]
              - cell "—" [ref=e110]
              - cell "Modifica Elimina" [ref=e111]:
                - button "Modifica" [ref=e112]
                - button "Elimina" [ref=e113]
            - row "Seleziona terapia [OSP-08] - Mansouri Fatima Ramipril [OSP-08] - Mansouri Fatima Ramipril 1 1 7/1/2025 — Modifica Elimina" [ref=e114]:
              - cell "Seleziona terapia [OSP-08] - Mansouri Fatima Ramipril" [ref=e115]:
                - checkbox "Seleziona terapia [OSP-08] - Mansouri Fatima Ramipril" [ref=e116]
              - cell "[OSP-08] - Mansouri Fatima" [ref=e117]
              - cell "Ramipril" [ref=e118]
              - cell "1" [ref=e119]
              - cell "1" [ref=e120]
              - cell "7/1/2025" [ref=e121]
              - cell "—" [ref=e122]
              - cell "Modifica Elimina" [ref=e123]:
                - button "Modifica" [ref=e124]
                - button "Elimina" [ref=e125]
            - row "Seleziona terapia [OSP-09] - Hassan Ahmed Paracetamolo [OSP-09] - Hassan Ahmed Paracetamolo 1 2 2/10/2026 — Modifica Elimina" [ref=e126]:
              - cell "Seleziona terapia [OSP-09] - Hassan Ahmed Paracetamolo" [ref=e127]:
                - checkbox "Seleziona terapia [OSP-09] - Hassan Ahmed Paracetamolo" [ref=e128]
              - cell "[OSP-09] - Hassan Ahmed" [ref=e129]
              - cell "Paracetamolo" [ref=e130]
              - cell "1" [ref=e131]
              - cell "2" [ref=e132]
              - cell "2/10/2026" [ref=e133]
              - cell "—" [ref=e134]
              - cell "Modifica Elimina" [ref=e135]:
                - button "Modifica" [ref=e136]
                - button "Elimina" [ref=e137]
            - row "Seleziona terapia [OSP-09] - Hassan Ahmed Ibuprofene [OSP-09] - Hassan Ahmed Ibuprofene 1 1 3/5/2026 — Modifica Elimina" [ref=e138]:
              - cell "Seleziona terapia [OSP-09] - Hassan Ahmed Ibuprofene" [ref=e139]:
                - checkbox "Seleziona terapia [OSP-09] - Hassan Ahmed Ibuprofene" [ref=e140]
              - cell "[OSP-09] - Hassan Ahmed" [ref=e141]
              - cell "Ibuprofene" [ref=e142]
              - cell "1" [ref=e143]
              - cell "1" [ref=e144]
              - cell "3/5/2026" [ref=e145]
              - cell "—" [ref=e146]
              - cell "Modifica Elimina" [ref=e147]:
                - button "Modifica" [ref=e148]
                - button "Elimina" [ref=e149]
            - row "Seleziona terapia [OSP-01] - Rossi Mario Ramipril [OSP-01] - Rossi Mario Ramipril 1 1 11/15/2025 — Modifica Elimina" [ref=e150]:
              - cell "Seleziona terapia [OSP-01] - Rossi Mario Ramipril" [ref=e151]:
                - checkbox "Seleziona terapia [OSP-01] - Rossi Mario Ramipril" [ref=e152]
              - cell "[OSP-01] - Rossi Mario" [ref=e153]
              - cell "Ramipril" [ref=e154]
              - cell "1" [ref=e155]
              - cell "1" [ref=e156]
              - cell "11/15/2025" [ref=e157]
              - cell "—" [ref=e158]
              - cell "Modifica Elimina" [ref=e159]:
                - button "Modifica" [ref=e160]
                - button "Elimina" [ref=e161]
            - row "Seleziona terapia [OSP-02] - Bianchi Anna Ibuprofene [OSP-02] - Bianchi Anna Ibuprofene 1 3 2/1/2026 — Modifica Elimina" [ref=e162]:
              - cell "Seleziona terapia [OSP-02] - Bianchi Anna Ibuprofene" [ref=e163]:
                - checkbox "Seleziona terapia [OSP-02] - Bianchi Anna Ibuprofene" [ref=e164]
              - cell "[OSP-02] - Bianchi Anna" [ref=e165]
              - cell "Ibuprofene" [ref=e166]
              - cell "1" [ref=e167]
              - cell "3" [ref=e168]
              - cell "2/1/2026" [ref=e169]
              - cell "—" [ref=e170]
              - cell "Modifica Elimina" [ref=e171]:
                - button "Modifica" [ref=e172]
                - button "Elimina" [ref=e173]
            - row "Seleziona terapia [OSP-03] - Pini Giuseppe Metformina [OSP-03] - Pini Giuseppe Metformina 2 2 9/1/2025 — Modifica Elimina" [ref=e174]:
              - cell "Seleziona terapia [OSP-03] - Pini Giuseppe Metformina" [ref=e175]:
                - checkbox "Seleziona terapia [OSP-03] - Pini Giuseppe Metformina" [ref=e176]
              - cell "[OSP-03] - Pini Giuseppe" [ref=e177]
              - cell "Metformina" [ref=e178]
              - cell "2" [ref=e179]
              - cell "2" [ref=e180]
              - cell "9/1/2025" [ref=e181]
              - cell "—" [ref=e182]
              - cell "Modifica Elimina" [ref=e183]:
                - button "Modifica" [ref=e184]
                - button "Elimina" [ref=e185]
            - row "Seleziona terapia [OSP-03] - Pini Giuseppe Lorazepam [OSP-03] - Pini Giuseppe Lorazepam 1 1 3/1/2026 — Modifica Elimina" [ref=e186]:
              - cell "Seleziona terapia [OSP-03] - Pini Giuseppe Lorazepam" [ref=e187]:
                - checkbox "Seleziona terapia [OSP-03] - Pini Giuseppe Lorazepam" [ref=e188]
              - cell "[OSP-03] - Pini Giuseppe" [ref=e189]
              - cell "Lorazepam" [ref=e190]
              - cell "1" [ref=e191]
              - cell "1" [ref=e192]
              - cell "3/1/2026" [ref=e193]
              - cell "—" [ref=e194]
              - cell "Modifica Elimina" [ref=e195]:
                - button "Modifica" [ref=e196]
                - button "Elimina" [ref=e197]
            - row "Seleziona terapia [OSP-05] - Seri Elena Amlodipina [OSP-05] - Seri Elena Amlodipina 1 1 12/1/2025 — Modifica Elimina" [ref=e198]:
              - cell "Seleziona terapia [OSP-05] - Seri Elena Amlodipina" [ref=e199]:
                - checkbox "Seleziona terapia [OSP-05] - Seri Elena Amlodipina" [ref=e200]
              - cell "[OSP-05] - Seri Elena" [ref=e201]
              - cell "Amlodipina" [ref=e202]
              - cell "1" [ref=e203]
              - cell "1" [ref=e204]
              - cell "12/1/2025" [ref=e205]
              - cell "—" [ref=e206]
              - cell "Modifica Elimina" [ref=e207]:
                - button "Modifica" [ref=e208]
                - button "Elimina" [ref=e209]
            - row "Seleziona terapia [OSP-05] - Seri Elena Furosemide [OSP-05] - Seri Elena Furosemide 1 1 1/15/2026 — Modifica Elimina" [ref=e210]:
              - cell "Seleziona terapia [OSP-05] - Seri Elena Furosemide" [ref=e211]:
                - checkbox "Seleziona terapia [OSP-05] - Seri Elena Furosemide" [ref=e212]
              - cell "[OSP-05] - Seri Elena" [ref=e213]
              - cell "Furosemide" [ref=e214]
              - cell "1" [ref=e215]
              - cell "1" [ref=e216]
              - cell "1/15/2026" [ref=e217]
              - cell "—" [ref=e218]
              - cell "Modifica Elimina" [ref=e219]:
                - button "Modifica" [ref=e220]
                - button "Elimina" [ref=e221]
            - row "Seleziona terapia [OSP-06] - Cerri Paolo Omeprazolo [OSP-06] - Cerri Paolo Omeprazolo 1 1 2/15/2026 — Modifica Elimina" [ref=e222]:
              - cell "Seleziona terapia [OSP-06] - Cerri Paolo Omeprazolo" [ref=e223]:
                - checkbox "Seleziona terapia [OSP-06] - Cerri Paolo Omeprazolo" [ref=e224]
              - cell "[OSP-06] - Cerri Paolo" [ref=e225]
              - cell "Omeprazolo" [ref=e226]
              - cell "1" [ref=e227]
              - cell "1" [ref=e228]
              - cell "2/15/2026" [ref=e229]
              - cell "—" [ref=e230]
              - cell "Modifica Elimina" [ref=e231]:
                - button "Modifica" [ref=e232]
                - button "Elimina" [ref=e233]
      - group [ref=e235]:
        - generic "Gestione Terapie" [ref=e236] [cursor=pointer]:
          - strong [ref=e237]: Gestione Terapie
        - generic [ref=e238]:
          - generic [ref=e239]:
            - button "Terapie" [ref=e240] [cursor=pointer]
            - generic [ref=e241]: /
            - generic [ref=e242]: Modifica
            - button "Chiudi" [ref=e243] [cursor=pointer]
          - paragraph [ref=e244]:
            - strong [ref=e245]: Modifica terapia
          - paragraph [ref=e246]: Compila i campi minimi per registrare una terapia attiva per ospite.
          - paragraph [ref=e247]: Dopo il salvataggio di una nuova terapia torni automaticamente alla lista.
          - generic [ref=e248]:
            - generic [ref=e249]:
              - text: Ospite
              - combobox "Ospite" [disabled] [ref=e250]:
                - option "Seleziona ospite"
                - option "[OSP-01] - Rossi Mario" [selected]
                - option "[OSP-02] - Bianchi Anna"
                - option "[OSP-03] - Pini Giuseppe"
                - option "[OSP-04] - Tesi Laura"
                - option "[OSP-05] - Seri Elena"
                - option "[OSP-06] - Cerri Paolo"
                - option "[OSP-07] - Danti Vito"
                - option "[OSP-08] - Mansouri Fatima"
                - option "[OSP-09] - Hassan Ahmed"
            - generic [ref=e251]:
              - text: Farmaco
              - combobox "Farmaco" [disabled] [ref=e252]:
                - option "Seleziona farmaco"
                - option "Amlodipina"
                - option "Atenololo"
                - option "Furosemide"
                - option "Ibuprofene"
                - option "Levotiroxina"
                - option "Lorazepam"
                - option "Metformina"
                - option "Omeprazolo"
                - option "Paracetamolo" [selected]
                - option "Ramipril"
            - generic [ref=e253]:
              - generic [ref=e254]: Dose per somministrazione *
              - spinbutton "Dose per somministrazione obbligatorio" [ref=e255]: "1"
            - generic [ref=e256]:
              - generic [ref=e257]: Somministrazioni giornaliere *
              - spinbutton "Somministrazioni giornaliere obbligatorio" [ref=e258]: "2"
            - generic [ref=e259]:
              - strong [ref=e261]: Orari somministrazione
              - generic [ref=e262]:
                - textbox [ref=e263]:
                  - /placeholder: Orario 1
                - textbox [ref=e264]:
                  - /placeholder: Orario 2
                - textbox [disabled] [ref=e265]:
                  - /placeholder: Orario 3
                - textbox [disabled] [ref=e266]:
                  - /placeholder: Orario 4
                - textbox [disabled] [ref=e267]:
                  - /placeholder: Orario 5
                - textbox [disabled] [ref=e268]:
                  - /placeholder: Orario 6
              - text: Compila almeno un orario. Solo i primi N orari sono attivi, dove N = somministrazioni giornaliere.
            - generic [ref=e269]:
              - generic [ref=e270]: Data inizio *
              - textbox "Data inizio obbligatorio" [ref=e271]:
                - /placeholder: ""
                - text: 2026-06-17
            - generic [ref=e272]:
              - generic [ref=e273]: Data fine (opzionale)
              - textbox "Data fine (opzionale)" [ref=e274]:
                - /placeholder: ""
            - generic [ref=e275]:
              - generic [ref=e276]: Note terapia (dettagli somministrazione)
              - textbox "Note terapia (dettagli somministrazione)" [ref=e277]:
                - /placeholder: "Es: a stomaco vuoto prima del pasto"
                - text: "Aggiustamento dosaggio #1: dose 1x2 giornalieri"
            - button "Salvataggio..." [disabled] [ref=e278]
            - button "Annulla" [disabled] [ref=e279]
      - generic [ref=e280]:
        - paragraph [ref=e281]:
          - strong [ref=e282]: Somministrazioni attive per ospite
        - paragraph [ref=e283]: Vista operativa per ospite con dettaglio terapia attiva.
        - table [ref=e285]:
          - rowgroup [ref=e286]:
            - row "Ospite Farmaco Dose Freq./giorno Dettagli somministrazione" [ref=e287]:
              - columnheader "Ospite" [ref=e288]
              - columnheader "Farmaco" [ref=e289]
              - columnheader "Dose" [ref=e290]
              - columnheader "Freq./giorno" [ref=e291]
              - columnheader "Dettagli somministrazione" [ref=e292]
          - rowgroup [ref=e293]:
            - row "[OSP-01] - Rossi Mario Paracetamolo 1 2 —" [ref=e294]:
              - cell "[OSP-01] - Rossi Mario" [ref=e295]
              - cell "Paracetamolo" [ref=e296]
              - cell "1" [ref=e297]
              - cell "2" [ref=e298]
              - cell "—" [ref=e299]
            - row "↳ Ramipril 1 1 —" [ref=e300]:
              - cell "↳" [ref=e301]
              - cell "Ramipril" [ref=e302]
              - cell "1" [ref=e303]
              - cell "1" [ref=e304]
              - cell "—" [ref=e305]
            - row "[OSP-02] - Bianchi Anna Ibuprofene 1 3 —" [ref=e306]:
              - cell "[OSP-02] - Bianchi Anna" [ref=e307]
              - cell "Ibuprofene" [ref=e308]
              - cell "1" [ref=e309]
              - cell "3" [ref=e310]
              - cell "—" [ref=e311]
            - row "[OSP-03] - Pini Giuseppe Metformina 2 2 Controllare glicemia settimanalmente" [ref=e312]:
              - cell "[OSP-03] - Pini Giuseppe" [ref=e313]
              - cell "Metformina" [ref=e314]
              - cell "2" [ref=e315]
              - cell "2" [ref=e316]
              - cell "Controllare glicemia settimanalmente" [ref=e317]
            - row "↳ Lorazepam 1 1 —" [ref=e318]:
              - cell "↳" [ref=e319]
              - cell "Lorazepam" [ref=e320]
              - cell "1" [ref=e321]
              - cell "1" [ref=e322]
              - cell "—" [ref=e323]
            - row "[OSP-05] - Seri Elena Amlodipina 1 1 —" [ref=e324]:
              - cell "[OSP-05] - Seri Elena" [ref=e325]
              - cell "Amlodipina" [ref=e326]
              - cell "1" [ref=e327]
              - cell "1" [ref=e328]
              - cell "—" [ref=e329]
            - row "↳ Furosemide 1 1 Cardiopatia ischemica" [ref=e330]:
              - cell "↳" [ref=e331]
              - cell "Furosemide" [ref=e332]
              - cell "1" [ref=e333]
              - cell "1" [ref=e334]
              - cell "Cardiopatia ischemica" [ref=e335]
            - row "[OSP-06] - Cerri Paolo Omeprazolo 1 1 —" [ref=e336]:
              - cell "[OSP-06] - Cerri Paolo" [ref=e337]
              - cell "Omeprazolo" [ref=e338]
              - cell "1" [ref=e339]
              - cell "1" [ref=e340]
              - cell "—" [ref=e341]
            - row "[OSP-07] - Danti Vito Metformina 1 2 Diabete t2" [ref=e342]:
              - cell "[OSP-07] - Danti Vito" [ref=e343]
              - cell "Metformina" [ref=e344]
              - cell "1" [ref=e345]
              - cell "2" [ref=e346]
              - cell "Diabete t2" [ref=e347]
            - row "↳ Levotiroxina 1 1 Ipotiroidismo" [ref=e348]:
              - cell "↳" [ref=e349]
              - cell "Levotiroxina" [ref=e350]
              - cell "1" [ref=e351]
              - cell "1" [ref=e352]
              - cell "Ipotiroidismo" [ref=e353]
            - row "[OSP-08] - Mansouri Fatima Atenololo 1 1 —" [ref=e354]:
              - cell "[OSP-08] - Mansouri Fatima" [ref=e355]
              - cell "Atenololo" [ref=e356]
              - cell "1" [ref=e357]
              - cell "1" [ref=e358]
              - cell "—" [ref=e359]
            - row "↳ Ramipril 1 1 Ipertensione" [ref=e360]:
              - cell "↳" [ref=e361]
              - cell "Ramipril" [ref=e362]
              - cell "1" [ref=e363]
              - cell "1" [ref=e364]
              - cell "Ipertensione" [ref=e365]
            - row "[OSP-09] - Hassan Ahmed Paracetamolo 1 2 —" [ref=e366]:
              - cell "[OSP-09] - Hassan Ahmed" [ref=e367]
              - cell "Paracetamolo" [ref=e368]
              - cell "1" [ref=e369]
              - cell "2" [ref=e370]
              - cell "—" [ref=e371]
            - row "↳ Ibuprofene 1 1 —" [ref=e372]:
              - cell "↳" [ref=e373]
              - cell "Ibuprofene" [ref=e374]
              - cell "1" [ref=e375]
              - cell "1" [ref=e376]
              - cell "—" [ref=e377]
```

# Test source

```ts
  289 | 
  290 |     let gistCreated = false
  291 | 
  292 |     await page.route('https://api.github.com/user', async route => {
  293 |         await route.fulfill({
  294 |             status: 200,
  295 |             contentType: 'application/json',
  296 |             body: JSON.stringify(mockGithubUser),
  297 |         })
  298 |     })
  299 | 
  300 |     await page.route('https://api.github.com/gists*', async route => {
  301 |         const req = route.request()
  302 |         const method = req.method()
  303 |         const url = req.url()
  304 | 
  305 |         if (method === 'GET' && url.includes('/gists?')) {
  306 |             await route.fulfill({
  307 |                 status: 200,
  308 |                 contentType: 'application/json',
  309 |                 body: JSON.stringify(gistCreated ? [{ id: 'gist-seeded-id', description: 'MediTrace — dati personali (non modificare manualmente)' }] : []),
  310 |             })
  311 |             return
  312 |         }
  313 | 
  314 |         if (method === 'POST' && url.endsWith('/gists')) {
  315 |             gistCreated = true
  316 |             const payload = JSON.parse(req.postData() || '{}')
  317 |             const files = payload.files || {}
  318 |             await route.fulfill({
  319 |                 status: 201,
  320 |                 contentType: 'application/json',
  321 |                 body: JSON.stringify({
  322 |                     id: 'gist-seeded-id',
  323 |                     updated_at: new Date().toISOString(),
  324 |                     files: Object.fromEntries(
  325 |                         Object.entries(files).map(([name, value]) => [name, { filename: name, content: value.content || '{}' }]),
  326 |                     ),
  327 |                 }),
  328 |             })
  329 |             return
  330 |         }
  331 | 
  332 |         if (method === 'PATCH' && url.includes('/gists/')) {
  333 |             const payload = JSON.parse(req.postData() || '{}')
  334 |             const files = payload.files || {}
  335 |             await route.fulfill({
  336 |                 status: 200,
  337 |                 contentType: 'application/json',
  338 |                 body: JSON.stringify({
  339 |                     id: 'gist-seeded-id',
  340 |                     updated_at: new Date().toISOString(),
  341 |                     files: Object.fromEntries(
  342 |                         Object.entries(files).map(([name, value]) => [name, { filename: name, content: value.content || '{}' }]),
  343 |                     ),
  344 |                 }),
  345 |             })
  346 |             return
  347 |         }
  348 | 
  349 |         await route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ message: 'not found' }) })
  350 |     })
  351 | 
  352 |     await page.goto('/')
  353 |     await loginOrRegisterSeededUser(page)
  354 | 
  355 |     // Load seed data
  356 |     await page.evaluate(async () => {
  357 |         const seed = await import('/src/services/seedData.js')
  358 |         await seed.clearSeedData()
  359 |         await seed.loadSeedData()
  360 |     })
  361 | 
  362 |     // Navigate to therapies
  363 |     await page.getByRole('link', { name: 'Terapie' }).click()
  364 |     await expect(page.getByRole('heading', { name: 'Terapie Attive' })).toBeVisible()
  365 | 
  366 |     const today = new Date().toISOString().slice(0, 10)
  367 |     const therapyRows = page.locator('tbody tr').filter({
  368 |         has: page.getByRole('button', { name: 'Modifica' }),
  369 |     })
  370 | 
  371 |     const therapyCount = await therapyRows.count()
  372 |     expect(therapyCount).toBeGreaterThanOrEqual(2)
  373 | 
  374 |     // Perform multiple dosage adjustments
  375 |     for (let i = 0; i < Math.min(therapyCount, 3); i += 1) {
  376 |         const therapy = therapyRows.nth(i)
  377 |         await therapy.getByRole('button', { name: 'Modifica' }).click()
  378 | 
  379 |         // Adjust doses progressively
  380 |         const newDose = 1 + (i * 0.5)
  381 |         const newFrequency = 2 + i
  382 | 
  383 |         await page.getByLabel('Dose per somministrazione').fill(String(newDose))
  384 |         await page.getByLabel('Somministrazioni giornaliere').fill(String(newFrequency))
  385 |         await page.getByLabel('Data inizio').fill(today)
  386 |         await page.getByLabel('Note').fill(`Aggiustamento dosaggio #${i + 1}: dose ${newDose}x${newFrequency} giornalieri`)
  387 | 
  388 |         await page.getByRole('button', { name: 'Salva modifica' }).click()
> 389 |         await expect(page.getByText('Terapia aggiornata.')).toBeVisible({ timeout: 5000 })
      |                                                             ^ Error: expect(locator).toBeVisible() failed
  390 | 
  391 |         // Close the form if still open.
  392 |         await closePanelIfVisible(page)
  393 |         await page.waitForTimeout(200)
  394 |     }
  395 | 
  396 |     // Verify adjustments persisted by checking reminders
  397 |     await page.getByRole('link', { name: 'Promemoria' }).click()
  398 |     await expect(page.getByRole('heading', { name: 'Promemoria' })).toBeVisible()
  399 | 
  400 |     // Verify we have updated reminders
  401 |     const reminderTable = page.locator('table').first()
  402 |     await expect(reminderTable).toBeVisible()
  403 | })
  404 | 
```