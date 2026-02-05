-- Create price overrides audit table
CREATE TABLE public.price_overrides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inspection_id UUID REFERENCES public.inspections(id) ON DELETE CASCADE,
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
  service_id TEXT NOT NULL,
  service_name TEXT NOT NULL,
  original_price NUMERIC NOT NULL,
  adjusted_price NUMERIC NOT NULL,
  override_reason TEXT NOT NULL,
  override_notes TEXT,
  overridden_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.price_overrides ENABLE ROW LEVEL SECURITY;

-- Staff can view their own overrides
CREATE POLICY "Staff can view their own price overrides"
ON public.price_overrides
FOR SELECT
USING (overridden_by = auth.uid());

-- Staff can create price overrides for their jobs
CREATE POLICY "Staff can create price overrides for their jobs"
ON public.price_overrides
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.jobs 
    WHERE jobs.id = price_overrides.job_id 
    AND jobs.user_id = auth.uid()
  )
);

-- Add index for faster lookups
CREATE INDEX idx_price_overrides_inspection ON public.price_overrides(inspection_id);
CREATE INDEX idx_price_overrides_job ON public.price_overrides(job_id);