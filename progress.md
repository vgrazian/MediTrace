# CURRENT STATUS

## Active Task
Post-merge stabilization after PR #70 and documentation alignment for seed/auth/mobile smoke updates.

## Current Phase
PR #70 (`feat(seed): demo operators + android phone smoke`) merged to `main`; repository is in green CI state.

## Done So Far
1. Referential integrity and conflict error management completed for core CRUD deletes, with unit tests and consistency test scenarios.
2. Audit panel upgraded (read-only, filterable by operatore/ospite/farmaco/terapia/periodo), with unit + E2E coverage and updated docs.
3. Small-screen UX improved with deep-panel interaction and breadcrumb navigation in Ospiti, Farmaci, Stanze, Terapie, with full test validation.
4. PR50 merged to main (merge commit 8cce302f01ae926b4606dbd4f54d962886fcaec8).
5. PR51 merged to main (emergency admin bootstrap + Supabase reset workflow wiring).
6. PR44 and PR48 conflict resolution completed and both merged to main.
7. Post-merge pipelines on main completed successfully:
   - Quality Gate Automated Tests: success
   - Deploy PWA su GitHub Pages: success
   - Smoke test deployed Pages: success
8. First PR52 rollout slice delivered in Ospiti:
   - reusable selection composable
   - reusable bulk delete confirmation
   - first simplified toolbar/action workflow
9. Account self-management released:
   - PR #52 merged to main (profile update nome/cognome/telefono/email + password flow)
   - post-merge quality gate and deploy pipelines verified successful
10. CI workflow syntax maintenance released:
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

## Immediate Next Steps
1. Monitor next post-merge CI/deploy runs on `main` and confirm Pages smoke remains green.
2. Start the next planned CRUD UX follow-up slice from updated `main` baseline.
3. Keep changelog/progress in sync for each merged PR slice.

## Blockers
- No blockers currently identified.

## PR STILL TO BE WORKED ON

## Open Pull Requests (GitHub)
1. None currently open.

## Planned PR Work (Not Open Yet)
1. New PR from `feat/crud-ux-followup-wave2` for follow-up UX work in `docs/crud-ux-followup-pr.md`.
2. Subsequent CRUD refinements where guided flows still need consistency.

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
1. Deliver follow-up CRUD UX wave 2 (undo, save-state, sorting/filters persistence)
2. Add matching E2E and unit coverage for recovery and save-state paths
3. Keep docs/changelog aligned for each release slice

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
- HIGH: Preserve green CI/deploy baseline after PR #70 merge
- HIGH: Continue CRUD UX follow-up wave 2 from refreshed main baseline
- MEDIUM: Keep changelog/docs aligned with each rollout increment

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
3. [ ] Local deterministic validation passed.
4. [ ] Deployed smoke check passed.

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
1. [ ] Undo/recovery coverage complete for wave-2 targets.
2. [ ] Save-state and sort/filter persistence validated.
3. [ ] Small-form-factor checks green.
4. [ ] Docs/changelog updated for UX behavior changes.

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
1. [ ] Local guard-path and deterministic regression suite green.
2. [ ] Online reset-password E2E implemented and stable.
3. [ ] Online two-user sync E2E stabilized.
4. [ ] Cross-browser parity flow enabled and passing.
5. [ ] E2E coverage instrumentation integrated and published.
