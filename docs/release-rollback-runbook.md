# Release Rollback Runbook (E8)

Data: 2026-04-03
Ambito: PWA deploy su GitHub Pages (`.github/workflows/deploy-pwa.yml`)

## Obiettivo

Ripristinare rapidamente una versione stabile della PWA in caso di regressioni dopo deploy (sync, login, installabilita', routing).

## Trigger rollback

- smoke test post-deploy fallito
- bug critico confermato in produzione
- errore bloccante su login/sync rilevato entro 24h dal rilascio

## Procedura rapida (preferita): redeploy di commit stabile

1. Identificare ultimo commit stabile su `main` (SHA).
2. Aprire Actions -> workflow `Deploy PWA su GitHub Pages`.
3. Eseguire `Run workflow` con input `deploy_ref=<SHA_stabile>`.
4. Attendere completamento job `build`, `deploy`, `smoke`.
5. Verificare URL Pages e funzionalita' minima (login, home, impostazioni).
6. Annotare rollback su issue/incidente con SHA vecchia/nuova e timestamp.

## Procedura alternativa: revert su main

Usare quando il commit problematico deve essere rimosso in modo esplicito dalla storia di rilascio.

1. Creare branch di hotfix da `main`.
2. Eseguire `git revert <sha_problematico>`.
3. Aprire PR verso `main` con motivo rollback.
4. Merge PR (trigger deploy automatico).
5. Verificare smoke post-deploy e test manuale rapido.

## Checklist verifica post-rollback

- `index.html` servito correttamente da Pages
- `manifest.webmanifest` raggiungibile
- `sw.js` raggiungibile
- login PAT funzionante
- sincronizzazione manuale senza errori bloccanti

## Ruoli

- Incident commander: decide go/no-go rollback
- Maintainer repo: esegue workflow o merge revert
- QA: verifica smoke e test manuale rapido

## Note operative

- Evitare deploy multipli in parallelo durante rollback.
- Conservare nel ticket incidente: SHA rollback, URL workflow, evidenze smoke.
- Dopo rollback, pianificare fix forward su branch dedicato prima di nuovo rilascio.
