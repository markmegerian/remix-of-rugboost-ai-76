-- Add consumed_at column for atomic token claiming
ALTER TABLE public.client_job_access 
ADD COLUMN IF NOT EXISTS consumed_at timestamptz;