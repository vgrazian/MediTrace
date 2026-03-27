# Android Bootstrap (MediTrace)

Struttura iniziale multi-modulo creata:

- `:app` UI e entrypoint Android
- `:data` persistenza Room v1
- `:sync` scheduler WorkManager e worker base

## Requisiti locali

1. Android Studio Ladybug o successivo
2. JDK 17
3. Android SDK Platform 34

## Primo avvio

Il wrapper Gradle e' gia' presente in repository. Dalla cartella `android/`:

```bash
./gradlew :app:assembleStagingDebug
```

## Note importanti

- Sostituire `STAGING_ID` e `PROD_ID` in `app/build.gradle.kts` con gli ID reali Web App.
- Spostare API key in `local.properties`/secret management e non in codice.
- Estendere Room con le entita' MVP (`Operatori`, `Promemoria`, `TerapieAttive`, `AuditEvent`).
