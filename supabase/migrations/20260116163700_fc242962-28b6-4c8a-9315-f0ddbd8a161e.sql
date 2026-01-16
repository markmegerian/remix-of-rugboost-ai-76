-- Create storage bucket for rug inspection photos
INSERT INTO storage.buckets (id, name, public) VALUES ('rug-photos', 'rug-photos', true);

-- Allow anyone to view photos (public bucket)
CREATE POLICY "Public read access for rug photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'rug-photos');

-- Allow anyone to upload photos (for inspections)
CREATE POLICY "Public upload access for rug photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'rug-photos');

-- Create inspections table to store inspection records
CREATE TABLE public.inspections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_name TEXT NOT NULL,
  client_email TEXT,
  client_phone TEXT,
  rug_number TEXT NOT NULL,
  rug_type TEXT NOT NULL,
  length NUMERIC,
  width NUMERIC,
  notes TEXT,
  photo_urls TEXT[] DEFAULT '{}',
  analysis_report TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS (allow public access for now - can be restricted later with auth)
ALTER TABLE public.inspections ENABLE ROW LEVEL SECURITY;

-- Allow public insert for inspections
CREATE POLICY "Allow public insert"
ON public.inspections FOR INSERT
WITH CHECK (true);

-- Allow public read for inspections
CREATE POLICY "Allow public read"
ON public.inspections FOR SELECT
USING (true);