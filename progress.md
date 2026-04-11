# CURRENT STATUS

## Active Task
Deliver simplified CRUD rollout slice 2 on FarmaciView (selection toolbar + bulk actions) with E2E validation.

## Current Phase
PR #53 has been merged to main. New feature work is in progress on `feat/simplified-crud-farmaci-slice2`.

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

## Immediate Next Steps
1. Finalize FarmaciView slice 2 implementation (multi-select farmaci + confezioni).
2. Run targeted E2E (`tests/e2e/farmaci.spec.js`) and validate no regressions.
3. Open PR and merge to main after CI pass.

## Blockers
- No blockers currently identified.

## PR STILL TO BE WORKED ON

## Open Pull Requests (GitHub)
1. None

## Planned PR Work (Not Open Yet)
1. New PR - simplified CRUD rollout slice 2: FarmaciView multi-table selection/actions.
2. Subsequent slices for remaining scoped views (as defined in docs/ISSUE-4.7-SIMPLIFIED-CRUD.md).

## TECHNICAL CONTEXT

## Priority Files For Next Slice
- docs/ISSUE-4.7-SIMPLIFIED-CRUD.md
- pwa/src/views/FarmaciView.vue
- pwa/src/composables/useSelection.js
- pwa/src/services/confirmations.js
- pwa/tests/e2e/
- pwa/tests/unit/

## Current Branch State
- Branch: feat/simplified-crud-farmaci-slice2
- Working tree: in progress (FarmaciView + E2E farmaci)

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
1. Complete and merge FarmaciView slice 2 PR
2. Continue simplified CRUD rollout to Terapie/Movimenti/Promemoria/Scorte/Stanze
3. Keep docs/changelog aligned for each slice

## Current Priority
- HIGH: FarmaciView PR52 rollout (slice 2)
- HIGH: Preserve E2E reliability while extending selection flows
- MEDIUM: Keep changelog/docs aligned with each rollout increment
