# CRUD UX Follow-up PR Scope

## Goal
Deliver the second wave of CRUD UX improvements after the first-pass guard/modal/filter rollout.

## Why this PR exists
The first pass addressed:
- unsaved-changes guard
- custom confirmation modal
- reusable search/filter bar on core CRUD pages

Remaining gaps to close:
- recoverability (undo for accidental deletes)
- richer save-state feedback
- stronger list ergonomics on high-volume tables

## Planned features

### 1. Undo for soft-deletes
- Add undo snackbar/inline banner after delete actions on:
  - Farmaci
  - Ospiti
  - Terapie
  - Movimenti
  - Stanze
- Keep undo window short (e.g. 8-15 seconds).
- Implement restore operations for entities that already use soft-delete (`deletedAt`).
- Log restore actions in audit trail.

### 2. Save-state indicators
- Show explicit save states on edit panels:
  - Salvataggio in corso...
  - Ultimo salvataggio: <timestamp>
  - Errore salvataggio + retry action
- Ensure user can distinguish between local UI update and persisted state.

### 3. List controls expansion
- Add optional sorting controls in CRUD lists with highest volume:
  - Ospiti
  - Terapie
  - Movimenti
- Add lightweight quick filters (status/type) where meaningful.
- Preserve current filter query + sort selection per view session.

### 4. Confirmation UX polish
- Keyboard-first support in modal (Esc cancel, Enter confirm when safe).
- Focus trap and focus restore on close.
- Improve accessibility labels and destructive-action copy consistency.

## Acceptance criteria
- Delete actions are recoverable via undo where soft-delete is available.
- Save status is visible and understandable on each edit flow.
- Lists with high record counts support query + quick filter + sort.
- Modal confirmation passes accessibility checks for keyboard users.

## Suggested test additions
- E2E: delete + undo restores row and preserves references.
- E2E: failed save shows error + retry path.
- E2E: sort/filter combinations persist during navigation within session.
- Unit: restore services emit expected audit events.

## Out of scope
- Full pagination rollout on all CRUD tables.
- Cross-device draft synchronization.
- Audit report redesign.
