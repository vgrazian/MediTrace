# PR #18 Review Checklist - Week 4 E5 Advanced Reporting

## Scope Verification
- [ ] Report includes KPI per host/patient with aggregated weekly consumption.
- [ ] Report includes warning synthesis per host based on related drug criticality.
- [ ] Trend view includes weekly consumption by drug over recent weeks.
- [ ] CSV export includes all required sections: stock, host KPI, trend.

## Functional Validation
- [ ] Scorte page loads base stock report and summary without regressions.
- [ ] Host KPI table shows expected fields (ospite, terapie attive, consumo, priorita').
- [ ] Trend table renders week columns and non-negative consumption totals.
- [ ] CSV export downloads correctly and contains section headers + expected columns.

## Data Mapping and Correctness
- [ ] Host aggregation uses active therapies only.
- [ ] Trend aggregation uses consumption movements only (scarico/somministrazione/consumo).
- [ ] Drug mapping from movement to drugId is stable even when sourced from stock batch.
- [ ] Sorting and priority ordering remain coherent for operational usage.

## Regression and Quality
- [ ] Existing notification/auth/security flows are unaffected.
- [ ] Existing report consumers still work with `operationalReportToCsv` backward compatibility.
- [ ] No runtime errors in Scorte view when host/trend datasets are empty.
- [ ] Required CI check `test` is green on PR head commit.

## Test Coverage
- [ ] Unit tests cover host KPI/trend mapping behavior and helper functions.
- [ ] Unit tests validate multi-section CSV output markers and headers.
- [ ] Build passes with updated Scorte template and report service exports.
- [ ] E2E suite passes with no regressions.

## Merge Readiness
- [ ] Acceptance criteria from issue #14 are satisfied end-to-end.
- [ ] No unresolved review comments remain.
- [ ] Squash merge message is clear and references Week 4 E5.
