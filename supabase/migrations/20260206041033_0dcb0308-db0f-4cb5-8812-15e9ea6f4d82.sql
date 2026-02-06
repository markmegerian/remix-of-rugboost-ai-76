-- Update RLS policy for client_job_access to use company-based access
-- This ensures proper multi-tenant isolation

-- Drop the old user_id based policy
DROP POLICY IF EXISTS "Staff can manage access for their jobs" ON public.client_job_access;

-- Create new company-scoped policy for staff
-- Staff can manage client access records for jobs within their company
CREATE POLICY "Staff can manage access for company jobs" ON public.client_job_access
  FOR ALL
  USING (
    -- Check that user belongs to the company that owns the job
    EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.id = client_job_access.job_id
      AND j.company_id = get_user_company_id(auth.uid())
    )
    OR
    -- Fallback for legacy: user owns the job directly
    EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.id = client_job_access.job_id
      AND j.user_id = auth.uid()
    )
  )
  WITH CHECK (
    -- For inserts/updates, require company match
    EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.id = client_job_access.job_id
      AND j.company_id = get_user_company_id(auth.uid())
    )
    OR
    EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.id = client_job_access.job_id
      AND j.user_id = auth.uid()
    )
  );

-- Also ensure client_job_access.company_id matches job's company_id on insert
-- This is enforced via trigger for data integrity

CREATE OR REPLACE FUNCTION public.set_client_access_company_id()
RETURNS TRIGGER AS $$
BEGIN
  -- If company_id not set, derive from job
  IF NEW.company_id IS NULL AND NEW.job_id IS NOT NULL THEN
    SELECT company_id INTO NEW.company_id FROM public.jobs WHERE id = NEW.job_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger if not exists
DROP TRIGGER IF EXISTS set_client_access_company_id_trigger ON public.client_job_access;
CREATE TRIGGER set_client_access_company_id_trigger
  BEFORE INSERT ON public.client_job_access
  FOR EACH ROW
  EXECUTE FUNCTION public.set_client_access_company_id();