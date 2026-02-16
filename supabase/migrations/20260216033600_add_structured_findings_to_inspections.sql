-- Phase 1: persist deterministic AI output alongside narrative analysis
alter table public.inspections
  add column if not exists structured_findings jsonb;

comment on column public.inspections.structured_findings is
  'Structured AI output for rug profile, damages, recommended services, totals, and review flags.';
