-- Create app_role enum for distinguishing staff vs client users
CREATE TYPE public.app_role AS ENUM ('staff', 'client');

-- Create user_roles table for role-based access control
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check user roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Staff can view all roles"
ON public.user_roles FOR SELECT
USING (public.has_role(auth.uid(), 'staff'));

-- Create approved_estimates table - stores finalized estimates for each rug
CREATE TABLE public.approved_estimates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID REFERENCES public.inspections(id) ON DELETE CASCADE NOT NULL,
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE NOT NULL,
  services JSONB NOT NULL DEFAULT '[]',
  total_amount NUMERIC NOT NULL DEFAULT 0,
  approved_by_staff_at TIMESTAMPTZ,
  approved_by_staff_user_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(inspection_id)
);

ALTER TABLE public.approved_estimates ENABLE ROW LEVEL SECURITY;

-- Create client_accounts table - client portal users
CREATE TABLE public.client_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.client_accounts ENABLE ROW LEVEL SECURITY;

-- Create client_job_access table - links clients to jobs they can view
CREATE TABLE public.client_job_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.client_accounts(id) ON DELETE CASCADE,
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE NOT NULL,
  access_token TEXT UNIQUE NOT NULL,
  invited_email TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  UNIQUE(client_id, job_id)
);

ALTER TABLE public.client_job_access ENABLE ROW LEVEL SECURITY;

-- Create client_service_selections table - services client approved
CREATE TABLE public.client_service_selections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_job_access_id UUID REFERENCES public.client_job_access(id) ON DELETE CASCADE NOT NULL,
  approved_estimate_id UUID REFERENCES public.approved_estimates(id) ON DELETE CASCADE NOT NULL,
  selected_services JSONB NOT NULL DEFAULT '[]',
  total_selected NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(client_job_access_id, approved_estimate_id)
);

ALTER TABLE public.client_service_selections ENABLE ROW LEVEL SECURITY;

-- Create payments table - tracks Stripe payments
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES public.client_accounts(id),
  stripe_payment_intent_id TEXT UNIQUE,
  stripe_checkout_session_id TEXT UNIQUE,
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'usd',
  status TEXT NOT NULL DEFAULT 'pending',
  paid_at TIMESTAMPTZ,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Add new columns to jobs table for client portal
ALTER TABLE public.jobs 
ADD COLUMN IF NOT EXISTS client_portal_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS all_estimates_approved BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS client_approved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending';

-- Add estimate_approved flag to inspections
ALTER TABLE public.inspections
ADD COLUMN IF NOT EXISTS estimate_approved BOOLEAN DEFAULT false;

-- =============================================
-- RLS POLICIES
-- =============================================

-- approved_estimates policies
CREATE POLICY "Staff can manage their own job estimates"
ON public.approved_estimates FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.jobs 
    WHERE jobs.id = approved_estimates.job_id 
    AND jobs.user_id = auth.uid()
  )
);

CREATE POLICY "Clients can view estimates for their jobs"
ON public.approved_estimates FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.client_job_access cja
    JOIN public.client_accounts ca ON ca.id = cja.client_id
    WHERE cja.job_id = approved_estimates.job_id
    AND ca.user_id = auth.uid()
  )
);

-- client_accounts policies
CREATE POLICY "Users can view their own client account"
ON public.client_accounts FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can update their own client account"
ON public.client_accounts FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own client account"
ON public.client_accounts FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Staff can view client accounts for their jobs"
ON public.client_accounts FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.client_job_access cja
    JOIN public.jobs j ON j.id = cja.job_id
    WHERE cja.client_id = client_accounts.id
    AND j.user_id = auth.uid()
  )
);

-- client_job_access policies
CREATE POLICY "Staff can manage access for their jobs"
ON public.client_job_access FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.jobs 
    WHERE jobs.id = client_job_access.job_id 
    AND jobs.user_id = auth.uid()
  )
);

CREATE POLICY "Clients can view their own job access"
ON public.client_job_access FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.client_accounts ca
    WHERE ca.id = client_job_access.client_id
    AND ca.user_id = auth.uid()
  )
);

CREATE POLICY "Anyone can view job access by token for claiming"
ON public.client_job_access FOR SELECT
USING (client_id IS NULL);

CREATE POLICY "Clients can claim access by token"
ON public.client_job_access FOR UPDATE
USING (client_id IS NULL)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.client_accounts ca
    WHERE ca.id = client_job_access.client_id
    AND ca.user_id = auth.uid()
  )
);

-- client_service_selections policies
CREATE POLICY "Staff can view selections for their jobs"
ON public.client_service_selections FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.client_job_access cja
    JOIN public.jobs j ON j.id = cja.job_id
    WHERE cja.id = client_service_selections.client_job_access_id
    AND j.user_id = auth.uid()
  )
);

CREATE POLICY "Clients can manage their own selections"
ON public.client_service_selections FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.client_job_access cja
    JOIN public.client_accounts ca ON ca.id = cja.client_id
    WHERE cja.id = client_service_selections.client_job_access_id
    AND ca.user_id = auth.uid()
  )
);

-- payments policies
CREATE POLICY "Staff can view payments for their jobs"
ON public.payments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.jobs 
    WHERE jobs.id = payments.job_id 
    AND jobs.user_id = auth.uid()
  )
);

CREATE POLICY "Clients can view their own payments"
ON public.payments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.client_accounts ca
    WHERE ca.id = payments.client_id
    AND ca.user_id = auth.uid()
  )
);

CREATE POLICY "System can insert payments"
ON public.payments FOR INSERT
WITH CHECK (true);

CREATE POLICY "System can update payments"
ON public.payments FOR UPDATE
USING (true);

-- Function to auto-assign staff role on signup (for existing users)
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Default new users to staff role (clients are created through portal)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'staff')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Trigger to auto-assign role on new user
CREATE TRIGGER on_auth_user_created_role
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();

-- Add trigger for updated_at on new tables
CREATE TRIGGER update_approved_estimates_updated_at
  BEFORE UPDATE ON public.approved_estimates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_client_accounts_updated_at
  BEFORE UPDATE ON public.client_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_client_service_selections_updated_at
  BEFORE UPDATE ON public.client_service_selections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Grant existing users the staff role
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'staff'::app_role FROM auth.users
ON CONFLICT (user_id, role) DO NOTHING;