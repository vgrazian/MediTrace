# MediTrace Usability Test Sheet (One-Page)

Data sessione: [____/____/______]
Facilitatore: [____________________]
Osservatore: [_____________________]
Versione app/build: [_____________________]
Dispositivo: [_____________________]

## 1) Profilo partecipante

- Ruolo: [ ] Volontario  [ ] Operatore senior  [ ] Coordinatore/Admin
- Eta' (fascia): [ ] <40  [ ] 40-59  [ ] 60+
- Confidenza digitale (1-5): __
- Note accessibilita' (vista/motricita'): __________________________________

## 2) Script standard facilitatore (2-3 min)

Leggere testualmente:

"Grazie per la partecipazione. Oggi testiamo l'app, non te. Non ci sono risposte giuste o sbagliate.
Durante le attivita', parla ad alta voce: cosa stai cercando, cosa ti aspetti, cosa ti confonde.
Se rimani bloccato, prova comunque a spiegare cosa faresti. Ti aiutero' solo se necessario.
Il test dura circa 20-30 minuti e annoteremo tempi, errori e punti di esitazione."

## 3) Task script (casi piu' frequenti)

Istruzioni: segnare tempo, errori, aiuti richiesti, esitazioni. Usare 1 riga per task.

| Task ID | Scenario da leggere al partecipante | Start | End | Tempo (min) | Errori (#) | Aiuti (#) | Esitazioni (breve nota) | Esito |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| T1 | Inizia il turno e apri la dashboard. | __:__ | __:__ | __ | __ | __ | ____________________ | [ ] OK [ ] KO |
| T2 | Trova un ospite e verifica terapia/promemoria del giorno. | __:__ | __:__ | __ | __ | __ | ____________________ | [ ] OK [ ] KO |
| T3 | Registra un esito di somministrazione. | __:__ | __:__ | __ | __ | __ | ____________________ | [ ] OK [ ] KO |
| T4 | Aggiorna una scorta e verifica allarme sotto soglia. | __:__ | __:__ | __ | __ | __ | ____________________ | [ ] OK [ ] KO |
| T5 | Esegui sync in condizione online/offline simulata. | __:__ | __:__ | __ | __ | __ | ____________________ | [ ] OK [ ] KO |
| T6 | Correggi un errore di inserimento (undo/retry). | __:__ | __:__ | __ | __ | __ | ____________________ | [ ] OK [ ] KO |

## 4) Scoring priorita' ergonomica

Scala 1-5:
- Frequency: frequenza reale del task
- Criticality: impatto su sicurezza/processo in caso di errore
- Difficulty: attrito osservato nel test

Formula: `Priority = Frequency * Criticality * Difficulty`

| Task ID | Frequency (1-5) | Criticality (1-5) | Difficulty (1-5) | Priority (F x C x D) | Priorita' |
| --- | --- | --- | --- | --- | --- |
| T1 | __ | __ | __ | __ | [ ] Bassa [ ] Media [ ] Alta |
| T2 | __ | __ | __ | __ | [ ] Bassa [ ] Media [ ] Alta |
| T3 | __ | __ | __ | __ | [ ] Bassa [ ] Media [ ] Alta |
| T4 | __ | __ | __ | __ | [ ] Bassa [ ] Media [ ] Alta |
| T5 | __ | __ | __ | __ | [ ] Bassa [ ] Media [ ] Alta |
| T6 | __ | __ | __ | __ | [ ] Bassa [ ] Media [ ] Alta |

Soglie consigliate:
- Alta: score >= 60 (azione immediata)
- Media: score 30-59 (prossimo ciclo)
- Bassa: score < 30 (monitoraggio)

## 5) Top miglioramenti proposti (max 3)

| Priorita' | Problema osservato | Proposta ergonomica | Owner | ETA |
| --- | --- | --- | --- | --- |
| 1 | ____________________ | ____________________ | ____________________ | ____ |
| 2 | ____________________ | ____________________ | ____________________ | ____ |
| 3 | ____________________ | ____________________ | ____________________ | ____ |

## 6) Chiusura sessione

- Frase finale utente (1 insight): __________________________________
- Fiducia percepita (1-5): __
- Raccomanderebbe il flusso a un collega volontario? [ ] Si [ ] No
- Decisione: [ ] Nessuna azione [ ] Backlog [ ] Hotfix UX immediato
