
-- Create table for global AI training corrections
CREATE TABLE public.ai_global_corrections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  correction_type TEXT NOT NULL CHECK (correction_type IN ('service_correction', 'price_correction', 'missed_issue', 'false_positive', 'identification_error')),
  original_value TEXT,
  corrected_value TEXT,
  context TEXT,
  rug_category TEXT,
  priority INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_global_corrections ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read active corrections
CREATE POLICY "Authenticated users can read global corrections"
  ON public.ai_global_corrections
  FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can insert
CREATE POLICY "Admins can insert global corrections"
  ON public.ai_global_corrections
  FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can update
CREATE POLICY "Admins can update global corrections"
  ON public.ai_global_corrections
  FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can delete
CREATE POLICY "Admins can delete global corrections"
  ON public.ai_global_corrections
  FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Index for efficient querying in the edge function
CREATE INDEX idx_ai_global_corrections_active ON public.ai_global_corrections (is_active, priority DESC) WHERE is_active = true;
