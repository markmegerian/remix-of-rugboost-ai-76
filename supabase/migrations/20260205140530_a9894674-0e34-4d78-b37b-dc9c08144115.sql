-- Grant table permissions for authenticated role
GRANT ALL ON public.companies TO authenticated;
GRANT ALL ON public.company_memberships TO authenticated;
GRANT ALL ON public.company_branding TO authenticated;
GRANT ALL ON public.company_service_prices TO authenticated;

-- Also ensure anon role can't access these
REVOKE ALL ON public.companies FROM anon;
REVOKE ALL ON public.company_memberships FROM anon;
REVOKE ALL ON public.company_branding FROM anon;
REVOKE ALL ON public.company_service_prices FROM anon;

-- Add staff role for the current user who signed up via OAuth
INSERT INTO public.user_roles (user_id, role)
VALUES ('88f81bd8-bfed-4d60-81bf-29f3fd6dfd64', 'staff')
ON CONFLICT (user_id, role) DO NOTHING;