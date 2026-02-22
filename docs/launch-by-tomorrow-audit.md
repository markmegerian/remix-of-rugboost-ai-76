# RugBoost Full-Codebase Launch Audit + Tomorrow-Morning Plan

## Scope and method ("nothing unchecked" approach)

This review covered the entire repository footprint through:

1. **Repository inventory** (all tracked files and key code domains).
2. **Automated readiness checks** (`./scripts/launch-readiness.sh`).
3. **Type safety check** (`npx tsc --noEmit`).
4. **Architecture/security flow review** of critical launch paths:
   - routing + role guards,
   - auth and role assignment logic,
   - lifecycle transition policy,
   - token security,
   - Supabase edge-function surface area,
   - deployment scripts and launch docs.

### Inventory snapshot
- Total tracked files: **355**.
- Frontend source footprint: **189 TSX + 48 TS files** under `src/`.
- Backend/service footprint: **17 Supabase Edge Function TypeScript files**.
- Database change footprint: **57 SQL migrations**.

## Current launch readiness: factual status

## 1) Build/runtime baseline
- ✅ Install completes (`npm ci`) in this environment.
- ✅ Unit tests pass (currently very low coverage: 1 example test).
- ✅ Production build succeeds.
- ❌ Lint fails with **121 findings (72 errors, 49 warnings)**, mostly `@typescript-eslint/no-explicit-any` and hook dependency warnings.
- ⚠️ Toolchain mismatch: Node is `v20.19.6` while Capacitor CLI 8 recommends Node >=22.

### Practical interpretation
- The app is **deployable as a bundle** now, but **not quality-gated for launch discipline** due to lint debt and minimal automated test coverage.
- The largest immediate risk is **silent regressions** in core flows because tests do not cover business-critical paths.

## 2) Architecture readiness (from code review)

### Routing and role segmentation: generally strong
- Route-level segmentation exists for public, staff, client, and admin areas.
- Client token-based portal and client-authenticated routes are separated from staff/admin protected routes.

### Auth/role separation: explicit safeguards exist
- Auth logic intentionally prevents automatic promotion from client to staff.
- Staff role auto-assignment only occurs for users with zero existing roles.

### Lifecycle discipline: policy exists in shared state machine
- Ordered lifecycle statuses and transition validators are implemented.
- Transition checks include guardrails for analyzed rugs, payment readiness, and service completion states.

### Token security posture: acceptable for launch
- Access tokens are hashed with SHA-256 before storage use patterns.
- Random token generation uses UUID-based cryptographic API.

### Data/backend complexity risk
- 57 migrations + 17 edge functions indicate broad production surface area and require targeted smoke tests before launch.

## 3) Launch blockers by severity

## P0 (must address before tomorrow launch)
1. **Lint error backlog includes many `any` usages in critical pages/components and edge functions**.
2. **No meaningful automated regression suite for key revenue paths** (intake -> estimate -> client approval -> payment).
3. **No explicit pass/fail launch checklist run evidence for role-isolation and lifecycle integrity** tonight.

## P1 (can launch with mitigations, but should be queued immediately)
1. Node/Capacitor version mismatch (Node 20 vs recommended 22).
2. Bundle-size pressure in several chunks (not blocker, but performance-sensitive).
3. Hook dependency warnings that may hide stale-state bugs.

## P2 (post-launch week 1)
1. Reduce lint warnings to improve maintainability.
2. Expand monitoring/analytics instrumentation and alerting.
3. Introduce e2e smoke automation for nightly checks.

## Tomorrow-morning launch plan (high-efficiency execution)

## Phase A — Tonight (T-12h to T-8h): Stabilize the ship

1. **Freeze scope**
   - No new features.
   - Only launch-critical fixes allowed.

2. **Create a focused blocker board** with 4 swimlanes:
   - Intake path,
   - Client portal + payment,
   - Auth/role isolation,
   - Infra/build quality.

3. **Lint debt burn-down (targeted)**
   - Fix `no-explicit-any` in high-risk files first:
     - `src/pages/ClientPortal.tsx`,
     - `src/pages/JobDetail.tsx`,
     - `src/components/EstimateReview.tsx`,
     - `supabase/functions/analyze-rug/index.ts`.
   - Defer low-risk cosmetic warnings until after launch.

4. **Re-run readiness gate** after each batch:
   - `npm run lint`
   - `npm run test`
   - `npm run build`

## Phase B — Late night (T-8h to T-4h): Prove critical journeys

Run and record manual + scripted smoke checks for these **must-pass flows**:

1. **Staff intake flow**
   - Create job -> add rug -> upload photos -> run analysis -> generate estimate -> send client link.

2. **Client conversion flow**
   - Open token link -> review estimate -> approve selections -> complete payment -> verify payment success state.

3. **Role separation flow**
   - Confirm staff/admin users cannot enter client-only authenticated flows as client identity.
   - Confirm client users cannot access staff/admin routes.

4. **Lifecycle integrity flow**
   - Attempt invalid status skips and backward transitions without admin override; verify blocked.

## Phase C — Early morning (T-4h to T-1h): Launch gate decision

A go decision requires all gates below green:

1. `npm run lint` passes for launch-scoped files (or accepted, documented exceptions).
2. `npm run test` passes with added smoke coverage.
3. `npm run build` passes.
4. No open P0 defects.
5. Payment flow validated end-to-end in production-like configuration.
6. Designated rollback path documented and assigned.

If any gate is red at T-1h, launch as **controlled beta cohort only** (not full rollout).

## Phase D — Launch window (T0 to T+4h): Controlled rollout

1. Roll out to a subset of tenants first.
2. Monitor every 15 minutes:
   - intake completion,
   - estimate sent/open/approve rates,
   - payment success rate,
   - error logs (frontend + edge functions).
3. Hotfix only P0/P1 issues that affect conversion or data integrity.

## Ownership matrix (execute fast)

- **Engineer A (Frontend):** lint + type fixes in portal/intake UIs.
- **Engineer B (Backend/Supabase):** edge-function runtime verification + payment/webhook checks.
- **QA/PM:** checklist execution and launch gate tracking.
- **Ops owner:** rollout controls + rollback readiness.

## Minimal rollback plan (must exist before launch)

1. Keep previous stable deployment reference and environment values.
2. If payment or auth breaks:
   - disable new client invites/links temporarily,
   - revert frontend deployment,
   - re-enable after verification.
3. Communicate status to pilot tenants within 15 minutes.

## Immediate command sequence (copy/paste runbook)

```bash
cd /workspace/remix-of-rugboost-ai-76
npm ci
npm run lint
npm run test
npm run build
./scripts/launch-readiness.sh
```

## Bottom line

- The product is **close to launch-capable**, with architecture that already reflects role isolation and lifecycle guardrails.
- The fastest route to a reliable tomorrow-morning launch is **targeted lint debt reduction on critical flows + explicit smoke validation of intake, client conversion, auth isolation, and payment**.
- Launch should be **controlled cohort first** unless all gates are green before the morning cutoff.
