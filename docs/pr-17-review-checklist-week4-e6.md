# PR #17 Review Checklist - Week 4 E6 Security Policy Automation

## Scope Verification
- [ ] Password policy requirements are explicit and coherent (length, upper/lower, digit, symbol).
- [ ] Weak passwords are rejected both in user registration and password change flows.
- [ ] Credential expiry warning logic is visible and understandable in settings.
- [ ] Auth event viewer supports text filtering without breaking base listing behavior.

## Functional Validation
- [ ] As admin, creating a user with weak password shows a clear validation error.
- [ ] As operator, changing password to weak value is blocked with policy guidance.
- [ ] With an old credential timestamp, warning status appears correctly in settings.
- [ ] Auth events remain visible and filter returns matching rows only.

## Security and Regression
- [ ] Session handling and existing RBAC behavior remain unchanged.
- [ ] No sensitive values are leaked in audit payloads.
- [ ] Existing login/logout flows still work after policy additions.
- [ ] No notification/reporting features are regressed by settings changes.

## Test Coverage
- [ ] Unit tests cover password policy helper logic and weak password rejection.
- [ ] Unit tests cover credential expiry warnings and auth event filtering.
- [ ] E2E auth tests are aligned with the strengthened password policy.
- [ ] CI required check `test` is green on PR head commit.

## Merge Readiness
- [ ] Acceptance criteria from issue #15 are fully satisfied.
- [ ] Documentation/readability is sufficient for future policy tuning.
- [ ] No unresolved review comments remain.
- [ ] Squash merge message is clear and references Week 4 E6.
