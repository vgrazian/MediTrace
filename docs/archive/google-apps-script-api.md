> ⚠️ **DOCUMENTO STORICO — SUPERATO**
> Questo documento descrive il contratto API dell'architettura precedente basata su Google Apps Script + Google Sheets.
> Non è più la baseline di implementazione. Riferirsi a [architecture.md](architecture.md) per l'architettura corrente (PWA + IndexedDB + Google Drive).

# Contratto API Iniziale

## Endpoint

Base URL pubblicata da Google Apps Script Web App.

## Convenzioni Generali

- metodo `GET` per letture
- metodo `POST` per scritture
- autenticazione con header `X-API-KEY`
- payload JSON UTF-8
- timestamp in UTC formato ISO-8601
- idempotenza raccomandata con `requestId` sul body per endpoint di scrittura

### `GET /exec?action=pull&since=<timestamp>`

Restituisce i record aggiornati dopo il timestamp richiesto.

Risposta esempio:

```json
{
  "serverTime": "2026-03-27T18:00:00Z",
  "items": [
    {
      "entity": "inventory",
      "id": "a1b2",
      "updatedAt": "2026-03-27T17:59:00Z",
      "payload": {
        "drugId": "drug-1",
        "quantitaDisponibile": 42,
        "sogliaRiordino": 20
      }
    }
  ]
}
```

### `POST /exec?action=push`

Invia uno o piu' record locali non ancora sincronizzati.

Header richiesti:

- `Content-Type: application/json`
- `X-API-KEY: <secret>`

Payload esempio:

```json
{
  "deviceId": "android-clinic-01",
  "items": [
    {
      "entity": "movement",
      "id": "mov-123",
      "updatedAt": "2026-03-27T18:05:00Z",
      "payload": {
        "drugId": "drug-1",
        "patientId": "pat-1",
        "tipoMovimento": "SCARICO",
        "quantita": 2,
        "causale": "somministrazione"
      }
    }
  ]
}
```

Risposta esempio:

```json
{
  "accepted": ["mov-123"],
  "rejected": [],
  "serverTime": "2026-03-27T18:05:01Z"
}
```

## Endpoint Minimi Aggiuntivi (Promemoria, Terapie, Audit)

### `GET /exec?action=operators_list&active=true`

Restituisce elenco operatori attivi per selezione su tablet.

Risposta esempio:

```json
{
  "serverTime": "2026-03-27T06:55:00Z",
  "items": [
    {
      "operatorId": "op-001",
      "operatorCode": "VG",
      "displayName": "Valerio Graziani",
      "active": true
    }
  ]
}
```

### `POST /exec?action=operator_upsert`

Crea o aggiorna operatore, per consentire selezione o aggiunta diretta dal tablet.

Payload esempio:

```json
{
  "requestId": "req-20260327-0000",
  "operator": {
    "operatorId": "op-001",
    "operatorCode": "VG",
    "displayName": "Valerio Graziani",
    "active": true,
    "role": "volontario"
  }
}
```

Risposta esempio:

```json
{
  "ok": true,
  "operatorId": "op-001",
  "serverTime": "2026-03-27T06:56:00Z"
}
```

### `GET /exec?action=reminders_due&from=<ts>&to=<ts>&status=DA_ESEGUIRE,POSTICIPATO`

Legge i promemoria da mostrare nel turno corrente.

Risposta esempio:

```json
{
  "serverTime": "2026-03-27T06:55:00Z",
  "items": [
    {
      "reminderId": "rem-001",
      "guestId": "guest-01",
      "therapyId": "th-13",
      "drugId": "drug-metformina",
      "scheduledAt": "2026-03-27T07:00:00Z",
      "status": "DA_ESEGUIRE"
    }
  ]
}
```

### `POST /exec?action=reminder_update`

Aggiorna esito promemoria (`SOMMINISTRATO`, `POSTICIPATO`, `SALTATO`) e scrive audit operativo.

Payload esempio:

```json
{
  "requestId": "req-20260327-0001",
  "operator": "VG",
  "operatorId": "op-001",
  "reminder": {
    "reminderId": "rem-001",
    "status": "SOMMINISTRATO",
    "executedAt": "2026-03-27T07:04:00Z",
    "note": "ok"
  }
}
```

Risposta esempio:

```json
{
  "ok": true,
  "updatedId": "rem-001",
  "auditId": "audit-8731",
  "serverTime": "2026-03-27T07:04:01Z"
}
```

### `POST /exec?action=therapy_upsert`

Crea o aggiorna una terapia attiva, inclusa variazione posologia, e registra audit.

Payload esempio:

```json
{
  "requestId": "req-20260327-0002",
  "operator": "VG",
  "operatorId": "op-001",
  "therapy": {
    "therapyId": "th-13",
    "guestId": "guest-01",
    "drugId": "drug-metformina",
    "dosePerAdministration": "1",
    "unitDose": "compressa",
    "administrationsPerDay": 2,
    "weeklyAverage": 14,
    "startDate": "2026-03-01",
    "endDate": null,
    "active": true,
    "notes": "posologia aggiornata"
  }
}
```

Risposta esempio:

```json
{
  "ok": true,
  "therapyId": "th-13",
  "auditId": "audit-8732",
  "serverTime": "2026-03-27T07:10:01Z"
}
```

### `POST /exec?action=drug_upsert`

Crea o aggiorna farmaco nel catalogo centrale e scrive audit (`ADD_FARMACO` o `UPDATE_FARMACO`).

Payload esempio:

```json
{
  "requestId": "req-20260327-0003",
  "operator": "VG",
  "operatorId": "op-001",
  "drug": {
    "drugId": "drug-nuovo-001",
    "principioAttivo": "Nuovo Principio",
    "classeTerapeutica": "Cardiologia",
    "defaultMinStock": 20,
    "supplier": "Deposito",
    "notes": "inserimento manuale"
  }
}
```

Risposta esempio:

```json
{
  "ok": true,
  "drugId": "drug-nuovo-001",
  "auditId": "audit-8733",
  "serverTime": "2026-03-27T07:11:10Z"
}
```

### `POST /exec?action=audit_log`

Endpoint minimale per scrittura diretta audit operativo quando l'evento non e' legato a un endpoint specifico.

Payload esempio:

```json
{
  "requestId": "req-20260327-0004",
  "event": {
    "operator": "VG",
    "operatorId": "op-001",
    "action": "PROMEMORIA_ESCALATION",
    "entityType": "Promemoria",
    "entityId": "rem-001",
    "patientId": "guest-01",
    "beforeJson": "{\"status\":\"DA_ESEGUIRE\"}",
    "afterJson": "{\"status\":\"POSTICIPATO\"}",
    "outcome": "WARN",
    "source": "APP"
  }
}
```

## Regole Minime Middleware Apps Script

1. Validare API key su tutti gli endpoint.
2. Verificare presenza di `requestId` su tutte le scritture.
3. Implementare deduplica per `requestId` (idempotenza base).
4. Scrivere audit in `AuditLogCentrale` per:
   - reminder update
   - therapy upsert
   - drug upsert
   - audit_log esplicito
5. Restituire sempre `serverTime` e id record aggiornato.
6. In caso di errore, restituire codice HTTP coerente e messaggio leggibile.
7. Rifiutare variazioni posologia, esiti promemoria e movimenti clinici senza `operatorId` valido.

## Errori

- `401 Unauthorized`: API key assente o errata
- `400 Bad Request`: payload non valido
- `409 Conflict`: record gia' aggiornato da un'altra modifica concorrente
- `422 Unprocessable Entity`: stato promemoria o posologia non validi
- `403 Forbidden`: operatore non autorizzato o non attivo
- `500 Internal Error`: errore lato Apps Script o Google Sheets

## Politica di sincronizzazione

- push prima del pull
- batch piccoli, massimo 50 record
- retry con backoff esponenziale sul client
- risoluzione conflitti iniziale: vince il record con `updatedAt` piu' recente, ma ogni conflitto va loggato
