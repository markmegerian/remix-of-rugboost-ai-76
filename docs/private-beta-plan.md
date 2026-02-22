# Private Beta Launch Path (Execution-Ready)

This document is the operational path to launch a **private beta safely and quickly**.
It is designed for immediate execution with clear gates, ownership, and rollback criteria.

## 1) Beta objective and scope

## Objective
Validate core value and reliability in production-like conditions with a controlled cohort before public rollout.

## In-scope for private beta
- Staff intake flow: create job -> add rug -> upload photos -> analysis -> estimate generation.
- Client flow: token link -> estimate review -> approve/decline -> payment completion.
- Security boundaries: staff/admin vs client role separation and tenant isolation.
- Lifecycle integrity: disallow invalid status transitions unless explicitly overridden.

## Out-of-scope for private beta
- Broad performance optimization and non-critical UX polish.
- Nice-to-have features that do not materially affect intake, conversion, or payment success.

## 2) Cohort strategy

Start with 2-5 trusted companies/tenants and clear communication:
- Beta SLA expectations (response windows + known limitations).
- Feedback channel and turnaround expectations.
- Pilot success criteria and exit conditions.

Rollout progression:
1. **Cohort A (day 0):** 1-2 low-risk tenants.
2. **Cohort B (day 1-2):** expand only if gates stay green and no P0 incidents.
3. **Freeze expansion** immediately on payment/auth/lifecycle P0 incidents.

## 3) Launch gates (private beta)

A beta go decision requires all items below green:

1. Engineering gates
   - `npm run -s lint`
   - `npm run -s test`
   - `npm run -s build`
   - `npm run -s readiness:beta`
2. Critical journey gates
   - Intake happy path works end-to-end.
   - Client estimate + payment happy path works end-to-end.
3. Security gates
   - Staff/admin cannot access client-only identity flows.
   - Client users cannot access staff/admin routes.
4. Data and lifecycle gates
   - Invalid lifecycle transitions are blocked.
   - No tenant cross-access observed.

If any gate is red, run as internal-only test and do not expand cohort.

## 4) 24-hour execution sequence

## T-12h to T-8h: harden + verify
- Run `npm run -s readiness:beta`.
- Triage all failures into P0/P1/P2.
- Fix P0 only.

## T-8h to T-4h: complete manual smoke checks
- Staff intake flow script execution.
- Client approval/payment flow execution.
- Role-isolation and lifecycle-negative tests.

## T-4h to T-1h: launch decision
- Final gate run with evidence capture.
- Confirm on-call ownership and rollback owner.
- Approve Cohort A list.

## T0 to T+4h: controlled rollout
- Enable beta access for Cohort A.
- Monitor every 15 minutes:
  - intake completion,
  - estimate sent/open/approve,
  - payment success,
  - error rates.

## 5) Incident classes and actions

- **P0:** payment failure, auth bypass, tenant leak, data corruption.
  - Action: pause new invites, rollback/degrade immediately.
- **P1:** high friction in conversion path, unstable analysis quality.
  - Action: continue beta with capped cohort + hotfix queue.
- **P2:** cosmetic/non-critical defects.
  - Action: track for weekly patch.

## 6) Rollback/degrade protocol

If P0 occurs:
1. Disable new client invite links.
2. Revert to last known stable frontend release.
3. Keep staff intake active only if safe; otherwise freeze writes.
4. Communicate beta status update to affected tenants within 15 minutes.
5. Resume only after explicit gate re-run and owner signoff.

## 7) Required artifacts

Before launch window, complete:
- `docs/private-beta-checklist.md`
- readiness command output (saved in release notes/internal channel)
- incident owner list and communication template

## 8) Command runbook

```bash
cd /workspace/remix-of-rugboost-ai-76
npm ci
npm run -s lint
npm run -s test
npm run -s build
npm run -s readiness:beta
```
