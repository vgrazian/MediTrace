# CURRENT STATUS

## Active Task
Nessuna attiva. PR-UI-3 merge completato e deploy in corso.

## Current Phase
PR-1, PR-2, PR-3, PR-LOG-1, e PR-UI-2 sono tutti mergiati su `main`.

## Done So Far
- [x] PR-UI-5 merged e deploy avviato (PR #113)- [x] PR-UI-4 merged e deploy avviato (PR #112)- [x] PR-UI-3 merged e deploy avviato (PR #111)1. PR-UI-2 merged (#110) e deploy su gh-pages avviato.
2. PR-LOG-1 merged (#109) e deploy su gh-pages avviato.
3. PR-LOG-1 implementation completed and PR #109 opened.
4. PR-3 merged to `main` (PR #96: E2E hardening by mode — local deterministic + online Supabase).
5. Referential integrity and conflict error management completed for core CRUD deletes, with unit tests and consistency test scenarios.
6. Audit panel upgraded (read-only, filterable by operatore/ospite/farmaco/terapia/periodo), with unit + E2E coverage and updated docs.
7. Small-screen UX improved with deep-panel interaction and breadcrumb navigation in Ospiti, Farmaci, Stanze, Terapie, with full test validation.
8. PR50 merged to main (merge commit 8cce302f01ae926b4606dbd4f54d962886fcaec8).
9. PR51 merged to main (emergency admin bootstrap + Supabase reset workflow wiring).
10. PR44 and PR48 conflict resolution completed and both merged to main.
11. Post-merge pipelines on main completed successfully:
- Quality Gate Automated Tests: success
- Deploy PWA su GitHub Pages: success
- Smoke test deployed Pages: success
1. First PR52 rollout slice delivered in Ospiti:
- reusable selection composable
- reusable bulk delete confirmation
- first simplified toolbar/action workflow
1. Account self-management released:
- PR #52 merged to main (profile update nome/cognome/telefono/email + password flow)
- post-merge quality gate and deploy pipelines verified successful
1. CI workflow syntax maintenance released:
- PR #53 merged to main (`chore(ci): normalize workflow secrets access syntax`)
1. Guided add-panel UX release completed (PR #64):
- `Aggiungi` now opens a guided popup panel in Farmaci, Ospiti, Terapie, Movimenti
- successful create returns the operator to the list automatically
- large tables now render inside scrollable framed containers
- full E2E suite passes locally (`49/49`)
1. Production release verification completed:
- `Deploy PWA su GitHub Pages` run `24309878339` success
- GitHub smoke job success
- `bash pwa/scripts/smoke-pages.sh https://vgrazian.github.io/MediTrace/` => PASS
1. Follow-up CRUD UX item 1 implemented on branch `feat/crud-ux-followup-wave2`:
- undo window for soft-deletes across Farmaci/Ospiti/Terapie/Movimenti/Stanze
- restore service methods with audit `*_restored` events
- E2E regression full suite passing (`49/49`)
1. QA feedback fixes applied after manual tests:
- added scrollable framed tables in Stanze and Scorte where missing
- fixed Scorte `Aggiungi` on Confezioni Attive to open the management panel with input fields visible
- added contextual breadcrumbs in Manuale to return to originating page from `Aiuto`
- removed stray source text accidentally rendered in Audit header
1. PR #70 merged to `main`:
- seeded demo operators added (`rosa`, `margherita`, `giglio`) for test-data generation
- demo cleanup now removes seeded operators in both legacy and realistic clear paths, while preserving `admin`
- emergency admin bootstrap switched to username `admin` with compliant password policy
- Android phone emulator smoke test added in Playwright (`android-phone-chromium-smoke`)
1. Validation completed for PR #70 changes:
- `npm --prefix pwa run test:unit` passed (`270/270`)
- `npm --prefix pwa run test:e2e` passed (`54/54`)
- `npm --prefix pwa run build` passed
1. PR-2 merged to `main`:
- merge commit `8591857` (`Merge PR-2: CRUD UX wave-2 persistence`)
- added in-session filter/sort persistence across Ospiti/Farmaci/Terapie/Movimenti
- added cross-view E2E persistence regression coverage
1. Validation completed for PR-2 changes:
- `npm --prefix pwa run test:unit` passed (`304/304`)
- `npm --prefix pwa run test:e2e` passed (`58/58`)
- `npm --prefix pwa run build` passed
- `npm --prefix pwa run test:online-main` passed
- `npm --prefix pwa run test:online-performance` passed
- `npm --prefix pwa run test:online-smoke` passed
- `npm --prefix pwa run test:online-chaos` passed

## Immediate Next Steps
1. Attendere completamento GitHub Pages build (in corso).
2. Verificare `https://vgrazian.github.io/MediTrace/` con il nuovo codice.
3. Prossimo: PR-UI-2 (banner annulla eliminazione standardizzato).

## Blockers
- Nessuno. Tutti i secret CI sono configurati con valori reali:
  - `VITE_AXIOM_TOKEN`: ✅ Token reale `meditrace-ingest-query` (ingest + query)
  - `VITE_AXIOM_ENCRYPTION_PASSPHRASE`: ✅ (Secret, 32 caratteri)
  - `VITE_AXIOM_EDGE_URL`, `VITE_AXIOM_DATASET`, `VITE_AXIOM_ENCRYPTION_SALT`: ✅ (Variables)

## CI Configuration (Axiom)

| Variabile | Tipo | Stato |
|-----------|------|-------|
| `VITE_AXIOM_EDGE_URL` | Variable | ✅ `https://eu-central-1.aws.edge.axiom.co` |
| `VITE_AXIOM_DATASET` | Variable | ✅ `meditrace` |
| `VITE_AXIOM_ENCRYPTION_SALT` | Variable | ✅ `3bb63140...` |
| `VITE_AXIOM_ENCRYPTION_PASSPHRASE` | Secret | ✅ (32 caratteri) |
| `VITE_AXIOM_TOKEN` | Secret | ✅ `xaat-0ea81953...` (meditrace-ingest-query, ingest+query) |

## PR STILL TO BE WORKED ON

## Open Pull Requests (GitHub)
1. Nessuna al momento.

## Planned PR Work (Not Open Yet)
1. PR-UI-6: Barra azioni fissa mobile/tablet (prossimo)

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
- [x] PR-UI-5 merged e deploy avviato (PR #113)- [x] PR-UI-4 merged e deploy avviato (PR #112)- [x] PR-UI-3 merged e deploy avviato (PR #111)- [x] PR-UI-2 merged e deploy avviato (PR #110)
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

- **PR-UI-6: Barra azioni fissa mobile/tablet (prossimo)
  - Prominent “Today’s Reminders” button with batch-complete
  - Enable multi-select and batch actions for repetitive tasks
  - E2E: Batch-complete flow for reminders/medication administration

- **PR-UI-6: Sticky Action Bar (Mobile/Tablet)**
  - Make main actions sticky at the bottom on small screens
  - Responsive layout adjustments
  - E2E: Validate action bar visibility/interaction

- **PR-UI-7: Inline Validation & Smart Defaults**
  - Add real-time validation to all create/edit forms
  - Pre-fill common fields and remember last-used values
  - E2E: Test validation/autofill for all entities

- **PR-UI-8: “Quick Add” in Select Menus**
  - Allow inline creation of related entities (e.g., add new patient from therapy form)
  - “+ Add new” option in dropdowns
  - E2E: Validate quick-add flow

- **PR-UI-9: Draft Save & Resume**
  - Auto-save incomplete forms to IndexedDB
  - Prompt user to resume drafts on return
  - E2E: Validate draft save/restore

- **PR-UI-10: Enhanced Delete/Audit UX**
  - All deletes as soft-delete with audit log
  - Role-based delete permissions (admin vs operator)
  - Improved offline delete messaging/consequence dialogs
  - E2E: Test delete, restore, and audit log for all entities

- **PR-UI-11: Save/Sync State Badges & Conflict UI**
  - Add badges to forms: “Saved locally”, “Pending sync”, “Synced”, “Conflict”
  - Implement conflict resolution dialog
  - E2E: Simulate and resolve sync conflicts

- **PR-UI-12: Modernize Theme & Component Consistency**
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
- PR-UI-6: Barra azioni fissa mobile/tablet (prossimo)
- PR-UI-6: Barra azioni fissa (mobile/tablet)
- PR-UI-7: Validazione in tempo reale e valori predefiniti intelligenti
- PR-UI-8: "Aggiungi rapido" nei menu a tendina
- PR-UI-9: Salvataggio bozza e ripristino
- PR-UI-10: UX eliminazione/audit migliorata
- PR-UI-11: Badge stato salvataggio/sync e UI conflitti
- PR-UI-12: Tema moderno e coerenza componenti

Tutti i nuovi elementi UI devono:
- Usare etichette, messaggi e tooltip in italiano
- Mantenere chiarezza, sintesi e tono calmo
- Essere coerenti con le convenzioni esistenti (es. "Salva", "Elimina", "Annulla", "Sincronizza", "Conferma")
- Essere validati in E2E/unit test anche per la localizzazione
