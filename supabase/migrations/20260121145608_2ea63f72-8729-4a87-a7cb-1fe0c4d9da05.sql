-- Add service completion tracking
-- Store which services have been completed for each approved estimate

-- Service completion tracking table
CREATE TABLE public.service_completions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  approved_estimate_id UUID NOT NULL REFERENCES public.approved_estimates(id) ON DELETE CASCADE,
  service_id TEXT NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Unique constraint to prevent duplicate completions
ALTER TABLE public.service_completions
ADD CONSTRAINT service_completions_unique_service
UNIQUE (approved_estimate_id, service_id);

-- Enable RLS
ALTER TABLE public.service_completions ENABLE ROW LEVEL SECURITY;

-- Staff can manage completions for their own jobs
CREATE POLICY "Staff can manage their service completions"
ON public.service_completions
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM approved_estimates ae
    JOIN jobs j ON j.id = ae.job_id
    WHERE ae.id = service_completions.approved_estimate_id
    AND j.user_id = auth.uid()
  )
);

-- Add follow-up tracking to jobs
ALTER TABLE public.jobs
ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
ADD COLUMN IF NOT EXISTS next_follow_up_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS follow_up_notes TEXT;

-- Create trigger to update last_activity_at
CREATE OR REPLACE FUNCTION public.update_job_last_activity()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.jobs 
  SET last_activity_at = now()
  WHERE id = (
    SELECT ae.job_id FROM approved_estimates ae 
    WHERE ae.id = NEW.approved_estimate_id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_job_activity_on_completion
AFTER INSERT ON public.service_completions
FOR EACH ROW
EXECUTE FUNCTION public.update_job_last_activity();