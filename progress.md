# CURRENT STATUS

## Active Task
Complete review-cycle fixes for CRUD UX wave 2 and keep PR #66 aligned with UX feedback.

## Current Phase
PR #66 is open from `feat/crud-ux-followup-wave2` with undo soft-delete implementation; QA feedback fixes are being applied on top.

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

## Immediate Next Steps
1. Validate QA feedback fixes with targeted E2E (Scorte/Stanze/Manuale/Audit paths) and push updates to PR #66.
2. Merge PR #66 after CI green.
3. Start follow-up item 2 (save-state indicators) on same branch after merge decision.

## Blockers
- No blockers currently identified.

## PR STILL TO BE WORKED ON

## Open Pull Requests (GitHub)
1. PR #66 - `feat(crud-ux): undo for soft-deletes across core sections`

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
- Branch: feat/crud-ux-followup-wave2
- Working tree: includes QA feedback fixes (Scorte/Stanze/Manuale/Audit) pending push to PR #66

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

## Current Priority
- HIGH: Implement follow-up CRUD UX wave 2 without regressing guided add flow
- HIGH: Preserve 49/49 E2E reliability while extending undo/save-state behavior
- MEDIUM: Keep changelog/docs aligned with each rollout increment
