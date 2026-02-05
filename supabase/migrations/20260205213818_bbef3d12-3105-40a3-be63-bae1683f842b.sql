-- Fix: Allow authenticated users to SELECT a company they just inserted
-- This handles the case where .insert().select().single() needs SELECT access
-- on the newly created company before the membership record is created

CREATE POLICY "Users can view company they are creating"
ON public.companies
FOR SELECT
TO authenticated
USING (
  -- Allow SELECT if there's no membership for this company yet (new company being created)
  -- This allows the INSERT...RETURNING to work during company setup
  NOT EXISTS (
    SELECT 1 FROM public.company_memberships 
    WHERE company_id = companies.id
  )
  AND
  -- Only within 5 seconds of creation (prevents abuse)
  created_at > (now() - interval '5 seconds')
);