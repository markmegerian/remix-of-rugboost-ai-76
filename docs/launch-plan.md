# RugBoost Launch Plan (Phased)

This plan is optimized for the confirmed top priorities:
1) intake speed,
2) estimate conversion,
3) analysis quality.

It assumes strict role separation, company-first branding, and mandatory staff review of AI recommendations.

## Launch success criteria (what "ready" means)
- Intake workflow can move from new job to estimate-ready with minimal clicks and no blocking errors.
- Client portal estimate view + pay flow has high completion and low drop-off.
- AI analysis output is consistently usable after staff review (low manual rework, low error rate).
- No staff/admin account can act as a client account in portal flows.
- Branding is company-first across key client-visible surfaces.

---

## Phase 0 — Baseline & instrumentation (3–5 days)

### Goals
- Establish objective baseline so improvements are measurable.
- Remove uncertainty around where failures happen.

### Work breakdown
- Define target metrics and dashboards:
  - time from job creation → estimate sent,
  - estimate open rate,
  - estimate acceptance rate,
  - payment completion rate,
  - AI rework rate (how often staff edits/replaces recommendations).
- Add event tracking on critical funnel points:
  - intake start/complete,
  - analysis start/success/fail,
  - estimate sent/opened,
  - pay started/completed.
- Build a small operational QA checklist for each release (happy path + failure path).

### Exit criteria
- Metrics visible in one place.
- Team can answer "where are we losing users/time?" using data.

---

## Phase 1 — Intake speed hardening (1–2 weeks)

### Goals
- Reduce staff effort and latency from intake to estimate-ready.

### Work breakdown
- Intake UX simplification:
  - reduce unnecessary fields in first step,
  - defer non-critical data capture,
  - keep progress visible.
- Reliability and throughput:
  - improve upload queue resilience,
  - tighten retry behavior + user feedback,
  - ensure offline/poor-network flows recover cleanly.
- "Fast path" operations:
  - batch actions for multiple rugs,
  - one-click transitions to next required task.
- Performance:
  - prefetch next-route data,
  - reduce blocking spinners with skeletons/optimistic UI where safe.

### Exit criteria
- Median intake-to-estimate-ready time decreases by agreed target.
- Top intake blockers (errors/timeouts) reduced materially.

---

## Phase 2 — Estimate conversion optimization (1–2 weeks)

### Goals
- Increase percent of estimates that get approved and paid.

### Work breakdown
- Client portal clarity:
  - cleaner service explanations and value framing,
  - clear totals/line-item confidence,
  - transparent consequences for declined services.
- Friction reduction:
  - simplify auth/link flow,
  - ensure mobile-first readability and CTA prominence,
  - reduce redirect confusion and dead ends.
- Follow-up loop:
  - reminders for unopened estimates,
  - reminder cadence for opened-but-unpaid estimates.
- Trust signals:
  - complete company branding on client touchpoints,
  - consistent contact details and business identity.

### Exit criteria
- Acceptance and payment conversion improve from baseline.
- Portal abandonment points are known and reduced.

---

## Phase 3 — Analysis quality + guardrails (1–2 weeks)

### Goals
- Improve quality/usefulness of AI output while keeping human review mandatory.

### Work breakdown
- Review workflow improvements:
  - structured staff review checklist,
  - fast edit controls on recommendations,
  - visible confidence/uncertainty hints.
- Quality controls:
  - reject/flag low-confidence outputs,
  - standardize recommended services taxonomy,
  - enforce required fields before estimate generation.
- Feedback loop:
  - capture staff corrections,
  - categorize failure modes (false positives, missed issues, pricing mismatches),
  - use this dataset for future model/prompt improvements.

### Exit criteria
- AI rework rate declines.
- Staff reports higher trust/usefulness of AI suggestions.

---

## Phase 4 — Launch-readiness hardening (1 week)

### Goals
- Ensure secure, stable, supportable production launch.

### Work breakdown
- Security and role isolation audit:
  - verify strict staff/client separation end-to-end,
  - verify tokenized portal access rules and expirations,
  - verify tenant isolation by company.
- Lifecycle integrity:
  - backend-enforced transition checks for all critical states,
  - frontend state machine matches backend constraints.
- Billing/payment readiness:
  - success/cancel/retry handling,
  - reconciliation checks and support playbook.
- Runbooks:
  - incident response,
  - known issue matrix,
  - rollback/degrade strategy.

### Exit criteria
- No critical/high launch blockers open.
- Dry-run sign-off complete.

---

## Phase 5 — Controlled rollout + post-launch optimization (ongoing)

### Goals
- Launch safely, measure real behavior, iterate quickly.

### Work breakdown
- Controlled rollout (cohort or tenant-based).
- Daily KPI review for first 2 weeks.
- Prioritized bug + UX fixes based on funnel impact.
- Weekly improvement cycle for intake/conversion/analysis metrics.

### Exit criteria
- KPIs stable at/above launch targets.
- No unresolved P0/P1 issues from launch cohort.

---

## Cross-cutting technical decisions to implement throughout
- **Source of truth for lifecycle**: backend constraints + frontend guard UX.
- **Branding**: company branding first; legacy fallback only where needed.
- **Roles**: strict non-overlapping client vs staff/admin behavior in client portal.
- **AI policy**: mandatory staff review/edit before client-facing actions.

## Suggested sequencing
1. Phase 0 (measure)
2. Phase 1 (intake speed)
3. Phase 2 (conversion)
4. Phase 3 (analysis quality)
5. Phase 4 (hardening)
6. Phase 5 (rollout + iteration)

## Suggested owners by stream
- Product/UX: intake and portal funnel simplification.
- Frontend: flow polish, state handling, client portal UX.
- Backend/Supabase: lifecycle enforcement, role/tenant security, data integrity.
- AI/Ops: review workflow, quality feedback loop, training set curation.
- QA: release checklists, regression + launch readiness sign-off.
