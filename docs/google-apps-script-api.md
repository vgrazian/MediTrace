# Contratto API Iniziale

## Endpoint

Base URL pubblicata da Google Apps Script Web App.

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

## Errori

- `401 Unauthorized`: API key assente o errata
- `400 Bad Request`: payload non valido
- `500 Internal Error`: errore lato Apps Script o Google Sheets

## Politica di sincronizzazione

- push prima del pull
- batch piccoli, massimo 50 record
- retry con backoff esponenziale sul client
- risoluzione conflitti iniziale: vince il record con `updatedAt` piu' recente, ma ogni conflitto va loggato
