# RugBoost Project Understanding (Initial Codebase Review)

## What this product appears to be
RugBoost is a multi-tenant SaaS workflow platform for rug-cleaning businesses. It helps staff intake jobs, record rugs, run AI-assisted inspection analysis, build estimates, share those estimates with clients through a tokenized client portal, collect approvals/payment, and track fulfillment through a lifecycle.

## Core user roles and experiences

### 1) Staff users
- Sign in and manage operational workflows (dashboard, jobs, analytics, settings).
- Create jobs and add rug inspections with photos.
- Trigger AI analysis on each rug (or batch), producing:
  - narrative inspection reports,
  - image annotations,
  - structured findings,
  - system service suggestions.
- Convert findings into estimates, send client-facing links, and monitor status transitions.

### 2) Client users
- Authenticate through access links and/or a client auth flow.
- View their job details and inspection recommendations.
- Approve/decline service selections.
- Continue to payment flows and view job history.

### 3) Platform admins
- Access separate `/admin/*` routes for system-level oversight:
  - users,
  - payouts,
  - settings,
  - AI training,
  - audit logs.

## Architecture & stack
- Frontend: React + TypeScript + Vite.
- UI: Tailwind + shadcn/ui components.
- Data/auth/backend integration: Supabase (auth, tables, RPCs, edge functions).
- Data-fetching/state: TanStack React Query + React context providers.
- Routing: React Router with role-based guards.
- Native readiness: Capacitor hooks/deep-link handling.
- Offline support: offline banners, sync service, and upload/offline queue helpers.

## Key technical patterns observed
- App-level providers (`AuthProvider`, `CompanyProvider`, `QueryClientProvider`) set global context.
- Role-based route segmentation:
  - public,
  - staff-protected,
  - client-protected,
  - admin-protected.
- Multi-tenant scoping via `company_id` and membership lookups.
- Plan/billing feature gating controls write access and premium capabilities.
- Heavy use of lazy-loading and skeletons to optimize route-level performance.
- Job detail screen acts as the main orchestration surface for lifecycle operations.

## Main domain workflow (inferred)
1. Staff creates a job.
2. Staff adds one or more rug inspections and uploads photos.
3. AI analysis runs (`analyze-rug` edge function) and stores reports/findings.
4. Estimate is built/approved and shared via client portal access token.
5. Client reviews recommendations, approves selections, and pays.
6. Staff tracks service completion and payment status through lifecycle states.

## Important constraints and safeguards already in code
- Role-separation logic explicitly tries to prevent clients from being auto-promoted to staff.
- Tenant isolation checks are present in job detail reads.
- Lifecycle gate helpers limit actions when status is locked or not yet eligible.
- Billing-state checks can block write/create actions when account status is not active/trialing.

## Open product/implementation questions to align on next
1. What is the single most important user journey to optimize right now?
   - intake speed,
   - estimate conversion rate,
   - analysis accuracy,
   - payment collection,
   - admin operations?
2. Should company branding live fully in `company_branding` going forward, or is mixed `profiles` fallback intentional long-term?
3. What is the intended source of truth for lifecycle status transitions (frontend state machine vs backend constraints)?
4. How strict should role isolation be when one person could be both client and staff for different contexts?
5. Should AI-generated service recommendations be auto-applied, or always reviewed/edited by staff?
6. What are your current pain points: bugs, UX friction, data consistency, performance, or deployment/dev workflow?
7. Which part of the app should I deep-dive next: auth/roles, job lifecycle, AI analysis pipeline, client portal, billing/plan gates, or admin tooling?

## Confirmed priorities and decisions (stakeholder feedback)

### Highest-priority outcomes
- Intake speed
- Estimate conversion
- Analysis quality

### Branding direction
- Company branding should be the default and primary source of truth for user-facing experiences.
- Limited RugBoost mentions are acceptable where explicitly intended (e.g., platform identity/legal pages).

### Lifecycle transition authority
- Recommended approach: **both** backend and frontend.
  - Backend enforces allowed transitions and data integrity.
  - Frontend state machine guides UX and prevents invalid action affordances.

### Role separation policy
- Extremely strict separation between staff/admin identities and client identities.
- Avoid mixed-role account drift and duplicate account confusion.

### AI recommendation policy
- AI-generated service recommendations require mandatory staff review/edit before approval or client-facing execution.

## Launch roadmap
- See detailed phased plan: `docs/launch-plan.md`.
