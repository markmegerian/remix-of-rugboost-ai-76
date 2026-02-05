-- Grant INSERT permission on companies table to authenticated users
GRANT INSERT ON public.companies TO authenticated;

-- Also ensure the policy is targeting the correct role
DROP POLICY IF EXISTS "Anyone authenticated can create company" ON public.companies;
CREATE POLICY "Anyone authenticated can create company"
ON public.companies
FOR INSERT
TO authenticated
WITH CHECK (true);