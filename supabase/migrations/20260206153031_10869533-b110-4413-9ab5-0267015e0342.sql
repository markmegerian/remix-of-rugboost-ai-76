-- Fix the permissive RLS policy on companies table
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Anyone authenticated can create company" ON public.companies;

-- Create a more restrictive policy that still allows company creation during onboarding
-- Users can only create a company if they don't already belong to one
CREATE POLICY "Authenticated users can create their first company"
ON public.companies
FOR INSERT
TO authenticated
WITH CHECK (
  -- User must not already belong to a company
  NOT EXISTS (
    SELECT 1 FROM public.company_memberships 
    WHERE user_id = auth.uid()
  )
);