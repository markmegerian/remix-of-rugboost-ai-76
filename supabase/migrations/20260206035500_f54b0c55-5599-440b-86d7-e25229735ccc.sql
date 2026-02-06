-- Create plan tier enum
DO $$ BEGIN
  CREATE TYPE public.plan_tier AS ENUM ('starter', 'pro', 'enterprise');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create billing status enum  
DO $$ BEGIN
  CREATE TYPE public.billing_status AS ENUM ('trialing', 'active', 'past_due', 'canceled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add plan_tier and billing_status to companies
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS plan_tier public.plan_tier NOT NULL DEFAULT 'starter',
ADD COLUMN IF NOT EXISTS billing_status public.billing_status NOT NULL DEFAULT 'trialing',
ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz DEFAULT (now() + interval '14 days'),
ADD COLUMN IF NOT EXISTS max_staff_users integer NOT NULL DEFAULT 2;

-- Create company_enabled_services table for service toggles
CREATE TABLE IF NOT EXISTS public.company_enabled_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  service_name text NOT NULL,
  is_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, service_name)
);

-- Enable RLS on company_enabled_services
ALTER TABLE public.company_enabled_services ENABLE ROW LEVEL SECURITY;

-- RLS policies for company_enabled_services
CREATE POLICY "Staff can view their company's enabled services"
  ON public.company_enabled_services FOR SELECT
  USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Company admins can manage enabled services"
  ON public.company_enabled_services FOR ALL
  USING (is_company_admin(auth.uid(), company_id));

-- Create function to check if billing allows writes
CREATE OR REPLACE FUNCTION public.company_can_create_jobs(_company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.companies
    WHERE id = _company_id
    AND billing_status IN ('trialing', 'active')
  )
$$;

-- Create function to check plan feature
CREATE OR REPLACE FUNCTION public.company_has_feature(_company_id uuid, _feature text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _plan plan_tier;
BEGIN
  SELECT plan_tier INTO _plan FROM public.companies WHERE id = _company_id;
  
  IF _plan IS NULL THEN
    RETURN false;
  END IF;
  
  -- Feature access by plan
  CASE _feature
    -- Starter: basic features only
    WHEN 'advanced_pricing_multipliers' THEN
      RETURN _plan IN ('pro', 'enterprise');
    WHEN 'white_label_branding' THEN
      RETURN _plan = 'enterprise';
    WHEN 'analytics_dashboard' THEN
      RETURN _plan IN ('pro', 'enterprise');
    WHEN 'custom_email_templates' THEN
      RETURN _plan IN ('pro', 'enterprise');
    WHEN 'api_access' THEN
      RETURN _plan = 'enterprise';
    WHEN 'priority_support' THEN
      RETURN _plan = 'enterprise';
    ELSE
      -- Unknown features default to allowed (basic features)
      RETURN true;
  END CASE;
END;
$$;

-- Get max staff users by plan
CREATE OR REPLACE FUNCTION public.company_max_staff(_company_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    CASE plan_tier
      WHEN 'starter' THEN 2
      WHEN 'pro' THEN 10
      WHEN 'enterprise' THEN 999
      ELSE 2
    END
  FROM public.companies
  WHERE id = _company_id
$$;

-- Update trigger for company_enabled_services
CREATE OR REPLACE FUNCTION public.update_enabled_services_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path TO 'public';

DROP TRIGGER IF EXISTS update_company_enabled_services_timestamp ON public.company_enabled_services;
CREATE TRIGGER update_company_enabled_services_timestamp
  BEFORE UPDATE ON public.company_enabled_services
  FOR EACH ROW EXECUTE FUNCTION public.update_enabled_services_timestamp();