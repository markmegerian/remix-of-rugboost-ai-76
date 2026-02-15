
CREATE TABLE public.ai_training_examples (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rug_category TEXT NOT NULL,
  rug_description TEXT,
  example_input TEXT,
  example_output TEXT,
  photo_descriptions TEXT,
  key_learnings TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_training_examples ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read training examples"
  ON public.ai_training_examples FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert training examples"
  ON public.ai_training_examples FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update training examples"
  ON public.ai_training_examples FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete training examples"
  ON public.ai_training_examples FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_ai_training_examples_active_category
  ON public.ai_training_examples (rug_category, is_active) WHERE is_active = true;
