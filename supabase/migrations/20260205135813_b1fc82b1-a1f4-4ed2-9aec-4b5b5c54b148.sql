-- Fix RLS policies for company creation
-- Allow authenticated users to create a new company

CREATE POLICY "Authenticated users can create a company"
  ON public.companies FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Allow users to insert their own company membership when creating a company
-- (they need to be able to add themselves as company_admin)
CREATE POLICY "Users can create their own membership"
  ON public.company_memberships FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Allow users to insert their own company branding
CREATE POLICY "Users can create branding for their company"
  ON public.company_branding FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM company_memberships cm
      WHERE cm.company_id = company_branding.company_id
        AND cm.user_id = auth.uid()
        AND cm.role = 'company_admin'
    )
  );