-- Drop and recreate the INSERT policy with explicit settings
DROP POLICY IF EXISTS "Authenticated users can create a company" ON public.companies;

-- Create a new INSERT policy that's more explicit
CREATE POLICY "Anyone authenticated can create company"
  ON public.companies
  FOR INSERT
  TO authenticated
  WITH CHECK (true);