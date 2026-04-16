# E2E Route Coverage Matrix

Date: 2026-04-16

## Scope

Coverage target: routes declared in `pwa/src/router/index.js`.

Priority legend:
- P1: critical user journeys (auth, care operations, sync/audit, settings)
- P2: supporting journeys (docs/help/navigation redirects)

## Matrix (route -> spec)

| Route | Priority | Primary spec(s) | Status |
| --- | --- | --- | --- |
| `/` | P1 | `menu-navigation.spec.js`, `auth-and-users.spec.js` | Covered |
| `/auth/reset-password` | P1 | `reset-password-route.spec.js` | Covered |
| `/farmaci` | P1 | `farmaci.spec.js`, `crud-ux-first-pass.spec.js` | Covered |
| `/ospiti` | P1 | `ospiti.spec.js`, `mobile-deep-panel.spec.js` | Covered |
| `/residenze` | P2 | `stanze.spec.js`, `menu-navigation.spec.js` | Covered |
| `/stanze` (redirect) | P2 | `router-redirects.spec.js` | Covered |
| `/scorte` | P1 | `scorte.spec.js` | Covered |
| `/movimenti` | P1 | `movimenti.spec.js`, `daily-operations-scenario.spec.js` | Covered |
| `/terapie` | P1 | `terapie.spec.js`, `expanded-workflow.spec.js` | Covered |
| `/promemoria` | P1 | `promemoria.spec.js`, `daily-operations-scenario.spec.js` | Covered |
| `/audit` | P1 | `audit-panel.spec.js`, `audit-smoke.spec.js` | Covered |
| `/impostazioni` | P1 | `auth-and-users.spec.js`, `operatori.spec.js` | Covered |
| `/manuale` | P2 | `manuale.spec.js` | Covered |
| `/informazioni` (redirect) | P2 | `router-redirects.spec.js` | Covered |

## Current Snapshot

- Component routes covered: 12/12 (100%)
- Router redirects covered: 2/2 (100%)
- Total router entries covered: 14/14 (100%)

## Next Improvements To Track

- P1: add full online reset-password E2E (email request + token link + login with new password) using Supabase-enabled test profile.
- P1: stabilize and automate online two-user sync scenario in Playwright with deterministic seeded remote users.
- P2: add multi-browser critical-flow parity (Chromium + WebKit + Firefox) for one end-to-end care workflow.
- P2: add E2E JS coverage instrumentation to report line/branch coverage from Playwright runs.
