-- Legacy job status migration
-- Converts legacy statuses (active, in-progress, completed) to lifecycle statuses.
-- Run via: SELECT migrate_legacy_job_statuses();
-- See lifecycleStateMachine.ts for mapping documentation.

CREATE OR REPLACE FUNCTION public.migrate_legacy_job_statuses()
RETURNS TABLE(migrated_job_id uuid, old_status text, new_status text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  has_analysis boolean;
  has_portal_link boolean;
  payment_status text;
  mapped_status text;
BEGIN
  FOR r IN
    SELECT j.id, j.status
    FROM public.jobs j
    WHERE j.status IN ('active', 'in-progress', 'completed')
  LOOP
    -- Skip if already a lifecycle status
    IF r.status IN (
      'intake_scheduled', 'picked_up', 'inspected', 'estimate_sent',
      'approved_unpaid', 'paid', 'in_service', 'ready',
      'delivery_scheduled', 'delivered', 'closed'
    ) THEN
      CONTINUE;
    END IF;

    SELECT EXISTS (
      SELECT 1 FROM public.inspections i
      WHERE i.job_id = r.id AND i.analysis_report IS NOT NULL AND i.analysis_report != ''
    ) INTO has_analysis;

    SELECT EXISTS (
      SELECT 1 FROM public.client_job_access cja
      WHERE cja.job_id = r.id
    ) INTO has_portal_link;

    SELECT COALESCE(
      (SELECT p.status FROM public.payments p WHERE p.job_id = r.id ORDER BY p.created_at DESC LIMIT 1),
      'pending'
    ) INTO payment_status;

    mapped_status := r.status;
    IF r.status = 'completed' THEN
      mapped_status := 'closed';
    ELSIF r.status = 'in-progress' THEN
      IF payment_status IN ('paid', 'completed') THEN
        mapped_status := 'in_service';
      ELSIF has_portal_link THEN
        mapped_status := 'approved_unpaid';
      ELSE
        mapped_status := 'inspected';
      END IF;
    ELSIF r.status = 'active' THEN
      IF has_portal_link THEN
        mapped_status := 'estimate_sent';
      ELSIF has_analysis THEN
        mapped_status := 'inspected';
      ELSE
        mapped_status := 'picked_up';
      END IF;
    END IF;

    IF mapped_status != r.status THEN
      UPDATE public.jobs SET status = mapped_status WHERE id = r.id;
      migrated_job_id := r.id;
      old_status := r.status;
      new_status := mapped_status;
      RETURN NEXT;
    END IF;
  END LOOP;
END;
$$;
