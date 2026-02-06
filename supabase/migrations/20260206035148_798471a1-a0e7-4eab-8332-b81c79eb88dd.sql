-- Add company_id to client_job_access for strict tenant isolation
ALTER TABLE public.client_job_access 
ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);

-- Add auth_user_id column if not exists (from previous migration)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'client_job_access' AND column_name = 'auth_user_id'
  ) THEN
    ALTER TABLE public.client_job_access ADD COLUMN auth_user_id uuid;
  END IF;
END $$;

-- Backfill company_id from jobs table for existing records
UPDATE public.client_job_access cja
SET company_id = j.company_id
FROM public.jobs j
WHERE cja.job_id = j.id
AND cja.company_id IS NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_client_job_access_company_id 
ON public.client_job_access(company_id);

-- Drop and recreate validate_access_token to include company_id
DROP FUNCTION IF EXISTS public.validate_access_token(text);

CREATE FUNCTION public.validate_access_token(_token text)
RETURNS TABLE(
  access_id uuid, 
  job_id uuid, 
  invited_email text, 
  client_id uuid, 
  staff_user_id uuid, 
  job_number text, 
  client_name text, 
  job_status text,
  auth_user_id uuid,
  company_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cja.id as access_id,
    cja.job_id,
    cja.invited_email,
    cja.client_id,
    j.user_id as staff_user_id,
    j.job_number,
    j.client_name,
    j.status as job_status,
    cja.auth_user_id,
    COALESCE(cja.company_id, j.company_id) as company_id
  FROM client_job_access cja
  JOIN jobs j ON j.id = cja.job_id
  WHERE cja.access_token = _token
    AND (cja.expires_at IS NULL OR cja.expires_at > NOW())
    AND cja.consumed_at IS NULL;
END;
$$;