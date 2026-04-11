# Consistency Checks - CRUD Test Scenarios

Date: 2026-04-11

## Objective
Prevent destructive CRUD operations when entities are still referenced by active records, with explicit and actionable operator errors.

## Automated Scenario Matrix

### Farmaci
1. Delete farmaco blocked when referenced by at least one terapia attiva.
2. Delete farmaco blocked when at least one confezione attiva is still linked to that farmaco.
3. Delete farmaco allowed when linked terapie are historical (chiuse/disattivate) and linked confezioni are already deleted.
4. Deactivate confezione blocked when used by at least one terapia attiva (supports both stockBatchId and stockBatchIdPreferito).
5. Deactivate confezione allowed when references are only historical.

### Stanze / Letti
1. Delete stanza blocked when stanza still has active letti.
2. Delete stanza blocked when active ospiti are assigned to that stanza.
3. Delete letto blocked when at least one active ospite is assigned to that letto.
4. Delete letto allowed when only inactive ospiti reference the letto.

### Ospiti
1. Delete ospite blocked when at least one terapia attiva references that ospite.
2. Delete ospite allowed when linked terapie are historical.

## Error Management Expectations
Each blocked operation must raise a structured conflict error with:
- category: conflict
- severity: high
- stable code for UI/tests (for example DRUG_IN_USE_BY_ACTIVE_THERAPY)
- actionable user message in Italian
- technical details including referenced IDs for debugging/audit

## Regression Scope
These consistency checks must be validated in unit tests and should not break:
- successful delete paths when no active references exist
- audit log writes on successful delete paths
- sync queue enqueue behavior on successful delete paths

## Suggested Manual UI Validation
1. Create ospite + terapia + farmaco and try deleting the farmaco from Catalogo: operation must fail with conflict message.
2. Create room + bed + ospite assigned to bed and try deleting letto from Stanze: operation must fail with conflict message.
3. Remove/close dependencies, retry delete: operation must succeed.
