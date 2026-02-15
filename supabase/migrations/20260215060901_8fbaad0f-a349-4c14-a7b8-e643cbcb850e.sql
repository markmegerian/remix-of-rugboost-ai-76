
-- Table for batch training photo analysis items
CREATE TABLE public.ai_batch_training_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_label TEXT NOT NULL DEFAULT 'Batch ' || to_char(now(), 'YYYY-MM-DD HH24:MI'),
  photo_path TEXT NOT NULL,
  rug_type TEXT NOT NULL DEFAULT 'Unknown',
  analysis_result TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'analyzing', 'analyzed', 'reviewed', 'error')),
  error_message TEXT,
  corrections_applied BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_batch_training_items ENABLE ROW LEVEL SECURITY;

-- Only admins can manage batch training items
CREATE POLICY "Admins can manage batch training items"
  ON public.ai_batch_training_items
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
