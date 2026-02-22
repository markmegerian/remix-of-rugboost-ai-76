# Private Beta Checklist

Use this as the final gate sheet before enabling any beta cohort.

## Release metadata
- Date/time (UTC): ______________________________
- Release owner: ________________________________
- On-call engineer: ______________________________
- On-call product/ops: ___________________________

## Engineering gates
- [ ] `npm run -s lint` passed
- [ ] `npm run -s test` passed
- [ ] `npm run -s build` passed
- [ ] `npm run -s readiness:beta` passed

## Critical flow validation
- [ ] Staff intake happy path passed
- [ ] Client estimate approval flow passed
- [ ] Client payment success flow passed
- [ ] Client decline + follow-up flow passed

## Security and lifecycle validation
- [ ] Client cannot access staff/admin routes
- [ ] Staff/admin cannot assume client identity in portal flows
- [ ] Invalid lifecycle transitions blocked
- [ ] Tenant cross-access checks clean

## Rollout control
- [ ] Cohort A tenant list approved
- [ ] Expansion criteria documented
- [ ] Rollback owner confirmed
- [ ] Incident communication template prepared

## Go/No-Go
- [ ] GO for Cohort A
- [ ] NO-GO (internal-only testing)

Decision notes:

__________________________________________________
__________________________________________________
__________________________________________________
