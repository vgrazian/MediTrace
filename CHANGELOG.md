# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.4.0] - 2026-04-09
### Changed
- Standardized CRUD UX labels to `Aggiungi`, `Modifica`, `Elimina` across [`OspitiView.vue`](pwa/src/views/OspitiView.vue), [`StanzeView.vue`](pwa/src/views/StanzeView.vue), [`FarmaciView.vue`](pwa/src/views/FarmaciView.vue), [`ScorteView.vue`](pwa/src/views/ScorteView.vue), and [`TerapieView.vue`](pwa/src/views/TerapieView.vue).
- Added dedicated edit flows for rooms and beds in [`stanze.js`](pwa/src/services/stanze.js) and [`StanzeView.vue`](pwa/src/views/StanzeView.vue) to complete row-level `Modifica` + `Elimina` consistency.
- Updated related E2E specs in [`pwa/tests/e2e/farmaci.spec.js`](pwa/tests/e2e/farmaci.spec.js), [`pwa/tests/e2e/scorte.spec.js`](pwa/tests/e2e/scorte.spec.js), [`pwa/tests/e2e/stanze.spec.js`](pwa/tests/e2e/stanze.spec.js), and [`pwa/tests/e2e/terapie.spec.js`](pwa/tests/e2e/terapie.spec.js).

### Documentation
- Archived completed PR review/status documents under [`docs/archive/`](docs/archive) and removed stale copies from active documentation folders.

## [0.3.0] - 2026-04-09
### Added
- Added reusable selection support in [`useSelection.js`](pwa/src/composables/useSelection.js) for selection-driven CRUD tables.
- Added bulk-delete confirmation support in [`confirmDeleteMultiple()`](pwa/src/services/confirmations.js:74).
- Added targeted unit coverage in [`useSelection.spec.js`](pwa/tests/unit/useSelection.spec.js) for reusable selection state.
- Added first PR52 simplified CRUD rollout in [`OspitiView.vue`](pwa/src/views/OspitiView.vue) with toolbar actions, row selection, and selection-aware edit/delete flows.

### Changed
- Updated [`ospiti.spec.js`](pwa/tests/e2e/ospiti.spec.js) to cover selection-based create, edit, and delete behavior.
- Updated [`OspitiView.vue`](pwa/src/views/OspitiView.vue) so the management form opens from simplified CRUD actions and room validation matches actual room availability.
- Verified targeted PR52 unit tests, targeted Ospiti E2E flow, and production build for the first simplified CRUD slice.

## [0.2.0] - 2026-04-09
### Added
- Created [`progress.md`](progress.md) to track PR50 completion work and preserve session continuity.
- Extended reusable form validation integration to [`OspitiView.vue`](pwa/src/views/OspitiView.vue) with validated guest fields and required room selection.
- Extended reusable form validation integration to [`TerapieView.vue`](pwa/src/views/TerapieView.vue) with validated therapy fields and submit gating based on validation state.
- Extended reusable form validation integration to [`PromemoriaView.vue`](pwa/src/views/PromemoriaView.vue) with validated reminder edit fields.
- Extended reusable form validation integration to [`MovimentiView.vue`](pwa/src/views/MovimentiView.vue) with validated movement registration fields.

### Changed
- Updated [`pwa/tests/e2e/ospiti.spec.js`](pwa/tests/e2e/ospiti.spec.js) to select a room before saving a guest.
- Updated [`pwa/tests/e2e/terapie.spec.js`](pwa/tests/e2e/terapie.spec.js) to provide a required start date before saving a therapy.
- Updated [`pwa/tests/e2e/promemoria.spec.js`](pwa/tests/e2e/promemoria.spec.js) for validation-aware reminder editing coverage.
- Updated [`pwa/tests/e2e/movimenti.spec.js`](pwa/tests/e2e/movimenti.spec.js) for validation-aware movement registration coverage.
- Updated [`docs/archive/PR50-STATUS.md`](docs/archive/PR50-STATUS.md) and [`docs/SESSION-SUMMARY-2026-04-06.md`](docs/SESSION-SUMMARY-2026-04-06.md) to mark PR50 implementation complete and align final scope.
- Verified targeted validation tests, targeted E2E flows, and production build after the PR50 changes.
