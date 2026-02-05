-- Grant necessary permissions on companies table to authenticated role
GRANT SELECT, INSERT, UPDATE ON public.companies TO authenticated;

-- Grant permissions on company_memberships table
GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_memberships TO authenticated;

-- Grant permissions on company_branding table  
GRANT SELECT, INSERT, UPDATE ON public.company_branding TO authenticated;

-- Grant permissions on company_service_prices table
GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_service_prices TO authenticated;