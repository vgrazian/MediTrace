# CURRENT STATUS

## Active Task
Merge and deploy guided add-panel popup UX release with scrollable dataset frames and full regression validation.

## Current Phase
PR #64 is open from `feat/add-panel-scroll-frames` and is ready for merge once checks are green. Local verification is complete.

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
11. Guided add-panel UX release prepared on PR #64:
   - `Aggiungi` now opens a guided popup panel in Farmaci, Ospiti, Terapie, Movimenti
   - successful create returns the operator to the list automatically
   - large tables now render inside scrollable framed containers
   - full E2E suite passes locally (`49/49`)

## Immediate Next Steps
1. Watch PR #64 checks to completion and merge to `main`.
2. Trigger GitHub Pages deploy from `main`.
3. Run production smoke validation after deploy finishes.

## Blockers
- No blockers currently identified.

## PR STILL TO BE WORKED ON

## Open Pull Requests (GitHub)
1. PR #64 - guided add-panel popup UX + scrollable dataset frames

## Planned PR Work (Not Open Yet)
1. Follow-up UX work from `docs/crud-ux-followup-pr.md` (undo/recovery, richer save-state, stronger list affordances).
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
- Branch: feat/add-panel-scroll-frames
- Working tree: clean after local verification; awaiting PR merge/deploy

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
1. Merge PR #64 and deploy to production
2. Continue follow-up CRUD UX work already documented in `docs/crud-ux-followup-pr.md`
3. Keep docs/changelog aligned for each release slice

## Current Priority
- HIGH: Deploy guided add-panel popup UX release safely to production
- HIGH: Preserve 49/49 E2E reliability after merge/deploy
- MEDIUM: Keep changelog/docs aligned with each rollout increment
