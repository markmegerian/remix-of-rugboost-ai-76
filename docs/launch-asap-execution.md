# Launch ASAP Execution Plan (Do-Now)

This is the immediate execution playbook to move from current state to launch with minimal delay.

## 0) Unblock environment (required)

Run from repo root:

```bash
cd /workspace/remix-of-rugboost-ai-76
./scripts/setup-env.sh
```

If running in CI/Lovable, use non-interactive mode:

```bash
export NPM_TOKEN="<npm-token>"
export GH_USER="<github-user>"
export GH_PAT="<github-pat>"
./scripts/setup-env.sh --non-interactive --install
```

## 1) Run launch readiness checks now

```bash
./scripts/launch-readiness.sh
```

This command executes:
- node/npm version checks,
- dependency installation,
- lint,
- unit tests,
- production build.

It prints a summary with pass/warn/fail markers and exits non-zero if there are hard failures.

## 2) Fix blockers in this order

1. **Install/build blockers** (registry, dependency, build breakage)
2. **Authentication/role separation blockers**
3. **Estimate conversion blockers** (portal drop-off points)
4. **AI analysis quality blockers** (high rework/failure paths)

## 3) Launch gates (must be green)

- Intake path end-to-end works from job creation to estimate sent.
- Client estimate path works from link access to payment success.
- Staff/admin cannot use client identity flow.
- Company branding appears on client-facing flows.
- No P0/P1 defects open.

## 4) 48-hour sprint structure

### Day 1
- AM: Unblock env + run readiness script + triage failures.
- PM: Fix compile/test/lifecycle/auth blockers; re-run readiness checks.

### Day 2
- AM: Client portal conversion polish and payment flow verification.
- PM: Final regression pass + controlled rollout prep.

## 5) Go-live motion

- Start with controlled cohort/tenant rollout.
- Monitor key KPIs daily for two weeks:
  - intake-to-estimate time,
  - estimate open/approve rate,
  - payment completion,
  - AI rework rate.
- Prioritize fixes strictly by funnel impact.

## Related docs
- `docs/launch-plan.md`
- `docs/project-understanding.md`
