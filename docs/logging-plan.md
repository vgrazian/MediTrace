# MediTrace — Piano di Logging GDPR-Compliant su Axiom

> **Data**: 2026-07-04
> **Stato**: Pianificazione

---

## Obiettivo

Tracciare le azioni degli operatori per fornire supporto tecnico, nel pieno rispetto
del GDPR sui dati sanitari.

**Cosa serve al supporto**: sapere *chi* ha fatto *cosa*, su *quale entità*, *quando*,
da *quale dispositivo* — non il contenuto dei dati sanitari.

---

## 1. Cosa NON va MAI inviato ad Axiom (in chiaro)

| Categoria | Campi |
|-----------|-------|
| **Dati anagrafici** | `nome`, `cognome`, `dataNascita`, `luogoNascita`, `sesso` |
| **Identificativi univoci** | `codiceFiscale` |
| **Dati sanitari** | `patologie`, `noteCliniche`, `dosePerSomministrazione`, `viaSomministrazione`, `prioritaClinica` |
| **Contatti** | `contattoEmergenza`, `email`, `telefono` (operatori e residenze) |
| **Contenuto entity** | Qualsiasi campo di `hosts`, `therapies`, `reminders` che contenga dati sanitari |

## 2. Cosa va ad Axiom (in chiaro, nessun PII)

| Campo | Esempio | Note |
|-------|---------|------|
| `operatorId` | `"mario.rossi"` | Username dell'operatore |
| `action` | `"host_created"` | Azione standardizzata (già esistente in auditLog) |
| `entityType` | `"hosts"` | Tabella interessata |
| `entityId` | `"host_abc123"` | Solo UUID, nessun dato |
| `ts` | `"2026-07-04T10:30:00Z"` | Timestamp ISO 8601 |
| `view` | `"/farmaci"` | Route corrente |
| `deviceId` | `"device-xxx"` | Identificativo dispositivo |
| `duration` | `150` | Durata operazione in ms (opzionale) |
| `level` | `"info"` | `info` / `warn` / `error` |
| `version` | `"0.3.0"` | Versione app |

## 3. Cosa va criptato (AES-256-GCM)

| Scenario | Contenuto criptato |
|----------|-------------------|
| **Errore con stack trace** | Stack trace (può contenere nomi entità nei messaggi) |
| **Context debugging** | Riepilogo operazione con campi modificati (es. `{"changedFields": ["nome", "cognome"]}`) |
| **Sync conflict** | Dettagli conflitto con entity ID coinvolte |

Il campo `context` nel payload Axiom sarà:

```json
{
  "enc": true,
  "data": "<base64-encoded AES-256-GCM ciphertext>"
}
```

## 4. Architettura

```
┌─────────────────────────────────────────────────────────┐
│                    MediTrace PWA                        │
│                                                         │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ CRUD     │  │ Router       │  │ Error Handling   │  │
│  │ Services │  │ Guard        │  │ Wrapper          │  │
│  └────┬─────┘  └──────┬───────┘  └────────┬─────────┘  │
│       │               │                   │             │
│       ▼               ▼                   ▼             │
│  ┌──────────────────────────────────────────────────┐   │
│  │           axiomLogger.js (NUOVO)                  │   │
│  │  • logAction()  • logPageView()  • logError()    │   │
│  │  • Filtraggio PII  • Crittografia AES-256-GCM    │   │
│  │  • Batch buffer (5s)  • Retry con backoff        │   │
│  │  • Web Crypto API (SubtleCrypto)                  │   │
│  └──────────────────────┬───────────────────────────┘   │
│                         │                               │
└─────────────────────────┼───────────────────────────────┘
                          │ HTTPS POST
                          ▼
┌─────────────────────────────────────────────────────────┐
│              Axiom Edge (eu-central-1)                   │
│         POST /v1/ingest/meditrace                       │
│         Dataset: meditrace                              │
└─────────────────────────────────────────────────────────┘
                          │
                          │ Axiom Query API
                          ▼
┌─────────────────────────────────────────────────────────┐
│           scripts/axiom-decrypt.mjs (NUOVO)             │
│  • Legge i log da Axiom via API query                   │
│  • Decrittografa i campi `context` con AES-256-GCM      │
│  • Output: JSON pulito per analisi                      │
│  • Richiede passphrase (mai inviata in rete)            │
└─────────────────────────────────────────────────────────┘
```

## 5. Crittografia — Dettaglio Tecnico

### Key Derivation

```
passphrase (input utente, min 16 chars)
    │
    ▼
PBKDF2-SHA256 (iterations: 600_000, salt: fisso nel codice)
    │
    ▼
AES-256-GCM key (32 bytes)
```

### Encrypt (nel browser, Web Crypto API)

```js
const iv = crypto.getRandomValues(new Uint8Array(12))
const encrypted = await crypto.subtle.encrypt(
  { name: 'AES-GCM', iv },
  key,
  new TextEncoder().encode(JSON.stringify(sensitiveData))
)
// Output: base64(iv || ciphertext)  — 12 byte IV + ciphertext + 16 byte auth tag
```

### Decrypt (locale, Node.js)

```js
const combined = Buffer.from(encryptedBase64, 'base64')
const iv = combined.subarray(0, 12)
const ciphertext = combined.subarray(12)
const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext)
```

### Gestione chiave
- La passphrase è **condivisa tra il team di supporto** (gestita fuori banda)
- Il salt PBKDF2 è **hardcodato** nell'app (non è un segreto, serve solo a prevenire rainbow tables)
- La chiave derivata non viene MAI inviata in rete
- La passphrase non è mai presente nel codice sorgente, solo in variabili d'ambiente locali

## 6. Schema Evento Log

```json
{
  "_time": "2026-07-04T10:30:00.000Z",
  "level": "info",
  "operatorId": "mario.rossi",
  "action": "therapy_created",
  "entityType": "therapies",
  "entityId": "therapy_abc123",
  "view": "/terapie",
  "deviceId": "device-abc",
  "version": "0.3.0",
  "duration": 150,
  "errorHash": null,
  "context": {
    "enc": true,
    "data": "AZy8v3K9...base64..."
  }
}
```

### Tipi di evento

| Tipo | Trigger | Campi |
|------|---------|-------|
| `action` | Ogni CRUD (creato/modificato/eliminato) | `action`, `entityType`, `entityId`, `context` (criptato: campi modificati) |
| `page_view` | Navigazione tra route | `view`, `referrer` |
| `error` | `AppError` o eccezione non gestita | `errorHash`, `context` (criptato: stack + messaggio) |
| `auth` | Login, logout, password change | `action`, `operatorId` (no password!) |
| `sync` | Sync completato/conflitto | `action`, `context` (criptato: conteggio entità) |

## 7. Piano di Implementazione

### Fase 1 — Infrastruttura (1-2 ore)
- [ ] **`src/services/axiomLogger.js`** — Servizio core
  - Config endpoint e token da env (`VITE_AXIOM_TOKEN`, `VITE_AXIOM_EDGE_URL`)
  - Batch buffer: accumula eventi per 5 secondi, poi invia in blocco
  - Retry con exponential backoff (max 3 tentativi)
  - Circuit breaker: se Axiom non risponde, disabilita logging per 60s
  - Fallback: scrive su `console.warn` se il logging fallisce
- [ ] **`src/services/axiomCrypto.js`** — Modulo crittografia
  - `deriveKey(passphrase, salt)` → PBKDF2
  - `encrypt(data, key)` → `{ enc: true, data: base64 }`
  - `decrypt(encrypted, key)` → plain object
  - Usa Web Crypto API (`crypto.subtle`)
- [ ] **Vite env vars** in `.env.example`:

  ```
  VITE_AXIOM_TOKEN=xaat-xxx
  VITE_AXIOM_EDGE_URL=https://eu-central-1.aws.edge.axiom.co
  VITE_AXIOM_DATASET=meditrace
  VITE_AXIOM_ENCRYPTION_SALT=<salt-hex>
  ```

### Fase 2 — Integrazione CRUD (1-2 ore)
- [ ] Modificare `src/services/auditLog.js`:
  - Aggiungere hook: dopo `db.activityLog.add()`, chiamare `axiomLogger.logAction()`
  - Il context criptato include: `{ changedFields: [...], operation: 'create'|'update'|'delete' }`
- [ ] Modificare ogni service CRUD che chiama auditLog per includere i campi modificati:
  - `ospiti.js`: `createHost`, `updateHost`, `deactivateHost`, `restoreHost`, `deleteHost`
  - `farmaci.js`: `upsertDrug`, `deleteDrug`, etc.
  - `terapie.js`: `upsertTherapy`, `deactivateTherapyRecord`
  - `movimenti.js`: `upsertMovement`, `softDeleteMovement`
  - `promemoria.js`: operazioni promemoria
  - `residenze.js`: CRUD residenze
  - `operatori.js` (se esiste): CRUD operatori

### Fase 3 — Router & Errori (30 min)
- [ ] **Router guard** in `src/router/index.js`:
  - `router.afterEach((to) => axiomLogger.logPageView(to.path))`
- [ ] **Error boundary** in `src/App.vue`:
  - `app.config.errorHandler` → `axiomLogger.logError()`
- [ ] **Modifica `errorHandling.js`**:
  - `handleAsync()` chiama `axiomLogger.logError()` su eccezione
  - `formatErrorForLogging()` → l'output va nel context criptato

### Fase 4 — Auth & Sync (30 min)
- [ ] **`auth.js`**: log eventi login/logout/password change
  - Rimuovere i `console.info` che loggano password in chiaro! ⚠️
- [ ] **`supabaseSync.js`**: log eventi sync (inizio, completato, conflitti)

### Fase 5 — Tool di decrittazione locale (1 ora)
- [ ] **`scripts/axiom-decrypt.mjs`**:

  ```
  Uso: node scripts/axiom-decrypt.mjs [opzioni]

  Opzioni:
    --from <ISO>       Data inizio (default: -24h)
    --to <ISO>         Data fine (default: now)
    --operator <user>  Filtra per operatore
    --action <action>  Filtra per azione
    --passphrase <p>   Passphrase decrypt (o variabile AXIOM_PASSPHRASE)
    --format json|table  Output format (default: table)

  Esempio:
    AXIOM_PASSPHRASE="..." node scripts/axiom-decrypt.mjs \
      --from 2026-07-01 --operator mario.rossi --format table
  ```

  - Usa `fetch` per query Axiom
  - Decrittografa campi `context` con AES-256-GCM
  - Output tabellare con colonne: `ts`, `operator`, `action`, `entityType`, `entityId`, `decryptedContext`

### Fase 6 — Test (30 min)
- [ ] Test unitari per `axiomCrypto.js` (encrypt/decrypt roundtrip)
- [ ] Test unitari per `axiomLogger.js` (batch, retry, circuit breaker)
- [ ] Verifica end-to-end: azione nell'app → query Axiom → decrypt con tool

### Fase 7 — Build, commit, push

## 8. Riepilogo Sicurezza

| Minaccia | Mitigazione |
|----------|-------------|
| Dati sanitari in chiaro su Axiom | ✅ Filtraggio PII lato client — solo UUID e username vanno in chiaro |
| Intercettazione in transito | ✅ HTTPS (Axiom edge endpoint) |
| Accesso non autorizzato ai log Axiom | ✅ Token API con permessi minimi (ingest + query su dataset specifico) |
| Compromissione Axiom | ✅ I dati sensibili sono criptati con AES-256-GCM, chiave mai su Axiom |
| Chiave di crittografia compromessa | ✅ Passphrase fuori banda, rotazione supportata (cambio passphrase = cambio chiave) |
| Logging accidentale di password | ✅ Filtraggio esplicito, le password non vengono mai incluse nei payload |
| Session hijack | ✅ Token Axiom in variabile d'ambiente, mai in localStorage |

## 9. Note GDPR

- **Base giuridica**: Legittimo interesse (supporto tecnico) — art. 6(1)(f) GDPR
- **Dati particolari (salute)**: MAI trattati dal sistema di logging, solo UUID anonimizzati
- **Conservazione**: I log su Axiom hanno retention configurabile (consigliato: 90 giorni)
- **Diritto di accesso**: I log contengono solo username operatore e UUID entità — nessun dato
  personale dell'ospite è recuperabile dai log senza la chiave di crittografia locale
- **DPIA**: Non necessaria per il sistema di logging in quanto non tratta dati personali
  degli ospiti (solo UUID + metadati operatore)
