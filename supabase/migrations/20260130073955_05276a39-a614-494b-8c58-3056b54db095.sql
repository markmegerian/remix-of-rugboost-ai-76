-- Fix: Restrict staff from viewing ALL user roles
-- The current policy "Staff can view all roles" allows any staff to see all role assignments
-- This should be restricted so staff can only see roles for users associated with their jobs

-- Drop the overly permissive staff policy
DROP POLICY IF EXISTS "Staff can view all roles" ON public.user_roles;

-- Create a more restrictive policy: Staff can only view their own roles
-- (They don't need to see other users' roles for normal operations)
CREATE POLICY "Staff can view their own roles only"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

-- Admins should still be able to view all roles for administration purposes
CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));