# CURRENT STATUS

## Active Task
Fix build critici e miglioramenti UI — 2026-07-10.

## Fix Completati (2026-07-10)

| # | Descrizione |
|---|-------------|
| 1 | **Empty views fix**: TDZ bug in minifier (esbuild/terser). `useKeyboardShortcuts({..., isFormOpen})` chiamato prima della dichiarazione di `const isFormOpen = ref(false)` in 5 viste (Farmaci, Movimenti, Ospiti, Terapie, Residenze). Spostato dopo la dichiarazione. Build config: `minify: 'terser'`. |
| 2 | **AnalisiLogView**: Fix Axiom query URL (`/v1/query/meditrace` → `/v1/datasets/meditrace/query`) per risolvere errore 404. |
| 8 | **AnalisiLogView (2026-07-10)**: Fix definitivo query Axiom. La fix #2 aveva cambiato il path ma usava ancora l'Edge URL (`eu-central-1.aws.edge.axiom.co`) che supporta solo `/v1/ingest` e `/v1/query/_apl`, NON `/v1/datasets/{name}/query` (solo su `api.axiom.co`). Riscritte tutte le query in formato APL usando l'endpoint `/v1/query/_apl?format=tabular`. Aggiunto parsing del formato tabular (column-oriented → row-oriented). Integrato filtro `filterAction` (prima non funzionante). Testata query APL contro l'Edge endpoint: OK. |
| 3 | **AuditLogView**: Rinominato "Stato Supabase" → "Stato Applicazione"; aggiunto box stato Axiom; Operatore text input → dropdown con "TUTTI" + lista operatori; aggiunto pulsante "🔬 Diagnostica" per amministratori. |
| 4 | **ScorteView**: Aggiunta colonna "Farmaco" in "Confezioni Monitorate" per allineamento con tabella scaduti. |
| 5 | **Seed data**: `Anna Bianchi` → `Anna Maria Cigliano` in seedData.js. |
| 6 | **Router**: Rinominato `/analisi` → `/diagnostica` (redirect automatico da vecchio path); AppNav aggiornato. |
| 7 | **AppNav**: Rimosso testo "MediTrace" dalla barra navigazione (mantenuto solo logo). |

## Root Cause: Empty Views (TDZ Bug)
Le viste lazy-loaded (Farmaci, Movimenti, Ospiti, Terapie, Residenze) avevano `useKeyboardShortcuts({..., isFormOpen})` chiamato PRIMA della dichiarazione `const isFormOpen = ref(false)` nel `<script setup>`. I minifier (sia esbuild che terser) riordinano le dichiarazioni causando `ReferenceError: Cannot access 'qa' before initialization` al setup del componente. Vue Router cattura l'errore e rende `<!---->` (componente vuoto).

**Fix**: Spostato `useKeyboardShortcuts()` DOPO `const isFormOpen = ref(false)` in tutte e 5 le viste.

**Test gap**: I test E2E pre-caricano dati tramite CSV import e non verificano lo stato iniziale delle viste. I test unitari testano solo le funzioni di servizio, non il rendering dei componenti. → Nessun test verifica che le viste si carichino correttamente senza dati pre-popolati.

## CI Configuration (Axiom)

| PR | # | Descrizione |
|----|---|-------------|
| PR-LOG-1 | 109 | Axiom logger AES-256-GCM, dashboard analisi, APM |
| PR-UI-2 | 110 | Banner annulla eliminazione standardizzato |
| PR-UI-3 | 111 | Scorciatoie da tastiera condivise |
| PR-UI-4 | 112 | Pannello Attenzione dashboard + conflitti |
| PR-UI-5 | 113 | Azioni batch promemoria (E2E) |
| PR-UI-6 | 114 | Barra azioni fissa mobile/tablet |
| PR-UI-7 | 115 | Validazione inline + smart defaults |
| PR-UI-8 | 116 | QuickAddSelect: aggiungi rapido |
| PR-UI-9 | 117 | Salvataggio bozza e ripristino |
| PR-UI-10 | 118 | UX eliminazione e audit (E2E) |
| PR-UI-11 | 119 | Badge stato sync e conflitti |
| PR-UI-12 | 120 | Tema moderno e coerenza componenti |

## Blockers
Nessuno.

## CI Configuration (Axiom)

| Variabile | Stato |
|-----------|-------|
| VITE_AXIOM_TOKEN (Secret) | ✅ xaat-0ea81953... (ingest+query) |
| VITE_AXIOM_ENCRYPTION_PASSPHRASE (Secret) | ✅ 32 caratteri |
| VITE_AXIOM_EDGE_URL | ✅ eu-central-1.aws.edge.axiom.co |
| VITE_AXIOM_DATASET | ✅ meditrace |
| VITE_AXIOM_ENCRYPTION_SALT | ✅ configurato |

## Live App
- URL: https://vgrazian.github.io/MediTrace/
- Branch: main
- Deploy: git subtree push to gh-pages

## PR STILL TO BE WORKED ON

## Open Pull Requests (GitHub)
1. Nessuna al momento.

## Planned PR Work (Not Open Yet)
1. Pipeline UI/UX completata - nessuna PR attiva.

## TECHNICAL CONTEXT

## Priority Files For Next Slice
- CHANGELOG.md
- progress.md
- pwa/src/views/FarmaciView.vue
- pwa/src/views/OspitiView.vue
- pwa/src/views/TerapieView.vue
- pwa/src/views/MovimentiView.vue
- pwa/src/style.css
- pwa/tests/e2e/

## Current Branch State
- Branch: main
- Working tree: clean after PR #70 merge

## Live App Deployment
- GitHub Pages source: main
- URL: https://vgrazian.github.io/MediTrace/

## PROGRESS TRACKING

## Completed Milestones
- [x] Pipeline UI/UX completata - nessuna PR attiva.
- [x] PR-UI-1 merged (sync state indicator)
- [x] PR-LOG-1 merged e deploy avviato (PR #109)
- [x] PR-3 E2E hardening merged and deployed (PR #96)
- [x] CRUD integrity guards + tests + scenarios documentation
- [x] Audit panel enhancement + tests + docs updates
- [x] Mobile deep-panel UX rollout + tests
- [x] PR50 merged and main pipelines verified green
- [x] PR51 merged and Node 24 workflow upgrade completed
- [x] PR44 and PR48 merged after conflict resolution
- [x] PR52 reusable infrastructure (selection + confirmDeleteMultiple)
- [x] PR52 first scoped rollout in Ospiti
- [x] Account self-management merged and deployed (PR #52)
- [x] Workflow maintenance merged (PR #53)

## Remaining Work Items
1. Merge/deploy PR-3 so online reset-password E2E can run against production Pages URL with new token handling.

## Technical Debt (CI/CD)
1. Update GitHub Actions usage of `actions/upload-artifact@v4` (Node 20 deprecation annotation) to a Node 24-compatible path/version before platform enforcement windows.

## Auth/Sync Mode Reality Check (2026-04-17)
1. Current implementation uses Supabase table-auth + Supabase sync backend when `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` are configured.
2. Default Playwright smoke suite runs in deterministic local mode by design (`playwright.config.js` forces empty Supabase env vars), so local E2E must keep guard-path assertions.
3. Planning and PR clustering must therefore split: local deterministic regression coverage vs dedicated online Supabase flows.

## E2E Coverage Follow-up (2026-04-16)
1. [P1] Keep and harden local guard-path E2E for password recovery route (`/#/auth/reset-password`) in deterministic local mode.
2. [P1] Implement full online reset-password E2E on Supabase table-auth flow (request email, consume token, login with new password) as a dedicated online suite.
3. [P1] Stabilize and automate online two-user sync scenario in Playwright (seed remote users + deterministic cooldown/rate-limit handling).
4. [P2] Add cross-browser parity flow (Chromium + Firefox + WebKit) for one critical workflow in local deterministic suite first, then mirror in online suite where stable.
5. [P2] Add Playwright-driven JS coverage instrumentation for E2E line/branch metrics.

## Current Priority
- HIGH: Execute PR-3 E2E hardening tasks without regressing current green baseline.
- HIGH: Stabilize online-mode auth/sync scenarios with deterministic preconditions.
- MEDIUM: Keep changelog/docs aligned with each rollout increment.

## 3-PR Execution Checklist (Concrete)

### PR-1: Baseline Reliability + Governance

Scope (in-scope)
1. Resolve CI/CD technical debt on artifact action version compatibility (Node 24 alignment).
2. Align operational docs and release notes (`CHANGELOG.md`, `progress.md`, affected docs pages).
3. Keep behavior unchanged in app features (no product UX refactor in this PR).

Out of scope
1. CRUD UX behavior changes.
2. Online Supabase flow additions.

Acceptance criteria
1. Workflows complete green on `main` for test/build/deploy/smoke.
2. No regressions in local deterministic E2E baseline.
3. Documentation reflects merged technical debt action and current auth/sync mode reality.

Validation commands
1. Local deterministic mode:
1. `npm --prefix pwa run test:unit`
1. `npm --prefix pwa run test:e2e`
1. `npm --prefix pwa run build`
1. Online mode (if credentials/site configured):
1. `npm --prefix pwa run test:online-smoke`

Checklist
1. [x] CI action/version updates applied.
2. [x] Changelog/progress/docs updated in same PR.
3. [x] Local deterministic validation passed.
4. [x] Deployed smoke check passed.

PR-1 completion notes (2026-04-17)
1. Local deterministic gate completed successfully: `test:unit`, `test:e2e`, `build` all green.
2. Prior flaky date mismatch (UTC `toISOString()` vs local day filters) triaged and fixed in test fixtures for form validation and promemoria/audit E2E setup.
3. Online validation bundle completed successfully: `test:online-main`, `test:online-performance`, `test:online-smoke`, `test:online-chaos` all PASS.

### PR-2: CRUD UX Wave 2 Consolidation

Scope (in-scope)
1. Complete wave-2 UX consistency for undo/recovery/save-state/sorting/filter persistence.
2. Apply shared behavior consistently across:
3. `pwa/src/views/OspitiView.vue`
4. `pwa/src/views/FarmaciView.vue`
5. `pwa/src/views/TerapieView.vue`
6. `pwa/src/views/MovimentiView.vue`
7. Add/adjust matching unit + E2E coverage for recovery and save-state paths.

Out of scope
1. Online Supabase scenario orchestration.
2. CI architecture changes unrelated to UX wave-2.

Acceptance criteria
1. UX actions and persistence behavior are consistent across target views.
2. Undo/recovery flows are deterministic and covered by tests.
3. No cross-view regressions in desktop and small-form-factor smoke tests.

Validation commands
1. Local deterministic mode:
1. `npm --prefix pwa run test:unit`
1. `npm --prefix pwa run test:e2e`
1. Focused smoke reruns (fast gate):
1. `npm --prefix pwa run test:e2e -- tests/e2e/android-phone-smoke.spec.js`
1. `npm --prefix pwa run test:e2e -- tests/e2e/ospiti.spec.js`
1. `npm --prefix pwa run test:e2e -- tests/e2e/farmaci.spec.js`
1. `npm --prefix pwa run build`

Checklist
1. [x] Undo/recovery coverage complete for wave-2 targets.
2. [x] Save-state and sort/filter persistence validated.
3. [x] Small-form-factor checks green.
4. [x] Docs/changelog updated for UX behavior changes.

PR-2 completion notes (2026-04-17)
1. Added reusable session view-state persistence composable and enabled it across Ospiti/Farmaci/Terapie/Movimenti for filter/sort (and `showAll` on Ospiti) continuity during in-session navigation.
2. Added explicit sort controls on target CRUD views and kept existing default ordering as baseline values.
3. Added E2E coverage for in-session filter/sort persistence across all target views in `pwa/tests/e2e/crud-ux-first-pass.spec.js`.
4. Validation completed successfully: `test:unit`, `test:e2e`, `build` all green on local deterministic mode.

### PR-3: E2E Hardening by Mode (Local + Online)

Scope (in-scope)
1. Local deterministic suite hardening:
1. keep guard-path assertions for auth reset route in local mode.
1. stabilize critical deterministic workflows.
1. Online Supabase suite additions:
1. full reset-password flow (request email, consume token, login with new password).
1. two-user sync scenario stabilization with deterministic setup/cooldown handling.
1. Cross-browser parity (Chromium + Firefox + WebKit) for one critical workflow.
1. Playwright-driven JS coverage instrumentation for E2E metrics.

Out of scope
1. Core CRUD feature redesign.
2. Non-test product refactors.

Acceptance criteria
1. Local deterministic suite remains stable and green.
2. Online Supabase scenarios are runnable and documented with environment preconditions.
3. Cross-browser parity flow passes on selected critical path.
4. E2E coverage artifact generated and inspectable in CI.

Validation commands
1. Local deterministic mode:
1. `npm --prefix pwa run test:e2e`
1. `npm --prefix pwa run test:e2e -- tests/e2e/reset-password-route.spec.js`
1. Online Supabase mode (requires configured env/site):
1. `npm --prefix pwa run test:online-main`
1. `npm --prefix pwa run test:online-performance`
1. `npm --prefix pwa run test:online-smoke`
1. `npm --prefix pwa run test:online-chaos`

Checklist
1. [x] Local guard-path and deterministic regression suite green.
2. [x] Online reset-password E2E implemented and stable (validated against local app + Supabase backend; production Pages pending deploy).
3. [x] Online two-user sync E2E stabilized.
4. [x] Cross-browser parity flow enabled and passing.
5. [x] E2E coverage instrumentation integrated and published.

PR-3 execution notes (2026-04-17)
1. Added reset-token extraction in `ResetPasswordView` so `/#/auth/reset-password?token=...` completes Supabase table-auth recovery flow.
2. Added online reset-password validator script `pwa/scripts/online-reset-password.mjs` with synthetic-user provisioning, token request, reset submit, login verification, and JSON reporting.
3. Added migration `supabase/migrations/007_table_auth_password_recovery.sql` introducing `app_request_password_reset` + `app_complete_password_recovery` RPCs and password recovery token storage; migration applied successfully on Supabase project.
4. Added cross-browser parity spec `pwa/tests/e2e/cross-browser-parity.spec.js` and dedicated Playwright projects for Chromium/Firefox/WebKit critical-path verification.
5. Added Playwright-driven E2E JS coverage instrumentation `pwa/tests/e2e/e2e-js-coverage.spec.js` with `coverage/e2e-js` artifacts (`raw-v8-coverage.json`, `coverage-summary.json`, `lcov.info`).
6. Updated CI workflows:
- `quality-gate.yml` installs Chromium + Firefox + WebKit.
- `online-main-validation.yml` now executes `test:online-reset-password` and uploads `online-reset-password.json` artifact.
1. Validation evidence:
- `npm --prefix pwa run test:e2e -- tests/e2e/reset-password-route.spec.js` => PASS
- `npm --prefix pwa run test:e2e:parity` => PASS (3/3)
- `npm --prefix pwa run test:e2e:coverage` => PASS (Lines 50.7%, Branches 55.78%)
- `npm --prefix pwa run test:e2e` => PASS (62/62)
- `SITE_URL=https://vgrazian.github.io/MediTrace/ ... npm --prefix pwa run test:online-main` => PASS
- `SITE_URL=http://127.0.0.1:4173/ ... npm --prefix pwa run test:online-reset-password` => PASS
- `SITE_URL=https://vgrazian.github.io/MediTrace/ ... npm --prefix pwa run test:online-reset-password` currently fails until PR-3 UI changes are deployed to Pages.

# MediTrace UX/UI Improvement Recommendations (2026-04-21)

## High-Impact / Low-Effort Improvements
- Persistent sync state indicator in app bar
- Standardized undo delete banner for all destructive actions
- Keyboard shortcuts for frequent actions

## 1. Daily Workflows Optimization
- Dashboard “Attention” panel for overdue reminders, low stock, pending sync/conflicts
- One-click “Today’s Tasks” with batch-completion
- Sticky action bar on mobile/tablet
- Batch actions for repetitive tasks

## 2. Create Flows
- Inline, contextual validation
- Smart defaults & autofill
- “Quick Add” for frequent entities
- Draft save & resume

## 3. Delete / Destructive Actions
- Soft delete with audit trail
- Role-based delete permissions
- Offline-aware delete UX
- Clear consequence dialogs

## 4. Error Prevention & Feedback
- Save/sync state badges
- Conflict resolution UI
- Background sync feedback

## 5. Visual and Interaction Design
- Modern, calm theme
- Consistent component library
- Progressive disclosure for advanced options
- Table enhancements (sticky headers, inline actions)
- Accessible feedback (ARIA-live, keyboard)

## Example User Flows
- Quick medication administration (mobile)
- Safe delete (desktop)

## Next Steps
- Prioritize high-impact/low-effort items
- Refactor for component consistency and accessibility
- Schedule user testing sessions

# Planned PRs for MediTrace UI/UX Improvements (2026-04-21)

Each PR is focused, reviewable, and can be delivered independently:

- **PR-UI-1: Persistent Sync State Indicator**
  - Add always-visible sync status icon to app bar
  - Tooltip/modal for sync details (pending, error, conflict)
  - E2E: Verify indicator state for offline, pending, synced

- **PR-UI-2: Standardized Undo Delete Banner**
  - Refactor all CRUD views to use a shared undo delete banner
  - Ensure undo is available for all soft-deletes, with consistent timing/messaging
  - E2E: Test undo for each entity type

- **PR-UI-3: Keyboard Shortcuts for Frequent Actions**
  - Add shortcuts: “n” (new), “s” (save), “d” (delete), “/” (search/filter)
  - Show shortcut hints in tooltips/action menus
  - Unit/E2E: Validate shortcut triggers

- **PR-UI-4: Dashboard “Attention” Panel**
  - Add summary panel to home/dashboard for overdue reminders, low stock, pending sync/conflicts
  - Each item links to filtered detail view
  - E2E: Validate attention panel population/navigation

- **Pipeline UI/UX completata - nessuna PR attiva.
  - Prominent “Today’s Reminders” button with batch-complete
  - Enable multi-select and batch actions for repetitive tasks
  - E2E: Batch-complete flow for reminders/medication administration

- **Pipeline UI/UX completata - nessuna PR attiva.
  - Make main actions sticky at the bottom on small screens
  - Responsive layout adjustments
  - E2E: Validate action bar visibility/interaction

- **Pipeline UI/UX completata - nessuna PR attiva.
  - Add real-time validation to all create/edit forms
  - Pre-fill common fields and remember last-used values
  - E2E: Test validation/autofill for all entities

- **Pipeline UI/UX completata - nessuna PR attiva.
  - Allow inline creation of related entities (e.g., add new patient from therapy form)
  - “+ Add new” option in dropdowns
  - E2E: Validate quick-add flow

- **Pipeline UI/UX completata - nessuna PR attiva.
  - Auto-save incomplete forms to IndexedDB
  - Prompt user to resume drafts on return
  - E2E: Validate draft save/restore

- **Pipeline UI/UX completata - nessuna PR attiva.
  - All deletes as soft-delete with audit log
  - Role-based delete permissions (admin vs operator)
  - Improved offline delete messaging/consequence dialogs
  - E2E: Test delete, restore, and audit log for all entities

- **Pipeline UI/UX completata - nessuna PR attiva.
  - Add badges to forms: “Saved locally”, “Pending sync”, “Synced”, “Conflict”
  - Implement conflict resolution dialog
  - E2E: Simulate and resolve sync conflicts

- **Pipeline UI/UX completata - nessuna PR attiva.
  - Adopt a calm, modern theme (spacing, color, shadows)
  - Standardize on a component library or refactor for consistency
  - Table enhancements: sticky headers, inline row actions
  - Accessibility: ARIA-live, keyboard navigation for all feedback

Delivery Guidance:
- Each PR should include updated unit/E2E tests and documentation where relevant.
- Start with high-impact/low-effort PRs (UI-1, UI-2, UI-3) for immediate value.
- Larger refactors (UI-12) can be split further if needed.

# Nota di localizzazione (UI/UX)

Tutti i nomi delle PR, le etichette UI, i tooltip, i messaggi di stato e le nuove funzionalità utente devono essere in lingua italiana, coerenti con il tono professionale e chiaro già presente nell’app MediTrace. Esempi:
- PR-UI-1: Indicatore stato sincronizzazione persistente
- PR-UI-2: Banner annulla eliminazione standardizzato
- PR-UI-3: Scorciatoie da tastiera per azioni frequenti
- PR-UI-4: Pannello "Attenzione" in dashboard
- Pipeline UI/UX completata - nessuna PR attiva.
- Pipeline UI/UX completata - nessuna PR attiva.
- Pipeline UI/UX completata - nessuna PR attiva.
- Pipeline UI/UX completata - nessuna PR attiva.
- Pipeline UI/UX completata - nessuna PR attiva.
- Pipeline UI/UX completata - nessuna PR attiva.
- Pipeline UI/UX completata - nessuna PR attiva.
- Pipeline UI/UX completata - nessuna PR attiva.

Tutti i nuovi elementi UI devono:
- Usare etichette, messaggi e tooltip in italiano
- Mantenere chiarezza, sintesi e tono calmo
- Essere coerenti con le convenzioni esistenti (es. "Salva", "Elimina", "Annulla", "Sincronizza", "Conferma")
- Essere validati in E2E/unit test anche per la localizzazione
