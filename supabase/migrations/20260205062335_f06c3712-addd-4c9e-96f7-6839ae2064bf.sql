-- Create table to track declined services for audit and analytics
CREATE TABLE public.declined_services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  inspection_id UUID NOT NULL REFERENCES public.inspections(id) ON DELETE CASCADE,
  service_id TEXT NOT NULL,
  service_name TEXT NOT NULL,
  service_category TEXT NOT NULL,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  quantity NUMERIC NOT NULL DEFAULT 1,
  declined_amount NUMERIC NOT NULL DEFAULT 0,
  decline_consequence TEXT,
  acknowledged_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  acknowledged_by_client_id UUID REFERENCES public.client_accounts(id),
  restored_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add index for common queries
CREATE INDEX idx_declined_services_job_id ON public.declined_services(job_id);
CREATE INDEX idx_declined_services_inspection_id ON public.declined_services(inspection_id);
CREATE INDEX idx_declined_services_category ON public.declined_services(service_category);

-- Enable RLS
ALTER TABLE public.declined_services ENABLE ROW LEVEL SECURITY;

-- Staff can manage declined services for their jobs
CREATE POLICY "Staff can manage declined services for their jobs"
ON public.declined_services
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM jobs 
    WHERE jobs.id = declined_services.job_id 
    AND jobs.user_id = auth.uid()
  )
);

-- Clients can view declined services for their jobs
CREATE POLICY "Clients can view declined services for their jobs"
ON public.declined_services
FOR SELECT
USING (client_has_job_access(job_id));

-- Clients can insert declined services for unpaid jobs they have access to
CREATE POLICY "Clients can insert declined services for unpaid jobs"
ON public.declined_services
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM jobs j
    WHERE j.id = declined_services.job_id 
    AND client_has_job_access(j.id)
    AND j.payment_status IS DISTINCT FROM 'paid'
  )
);

-- Add inspection condition flags column to inspections table
ALTER TABLE public.inspections 
ADD COLUMN IF NOT EXISTS condition_flags JSONB DEFAULT '{}';

-- Add system_determined_services column to store auto-generated services
ALTER TABLE public.inspections 
ADD COLUMN IF NOT EXISTS system_services JSONB DEFAULT '[]';

-- Comment for clarity
COMMENT ON TABLE public.declined_services IS 'Tracks all services declined by clients with acknowledgement timestamps for audit';
COMMENT ON COLUMN public.inspections.condition_flags IS 'Structured condition data from inspection (material, severity flags)';
COMMENT ON COLUMN public.inspections.system_services IS 'Auto-determined services based on condition flags';