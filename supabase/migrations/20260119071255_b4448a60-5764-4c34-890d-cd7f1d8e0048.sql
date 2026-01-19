-- Add column to store image annotations from AI analysis
ALTER TABLE public.inspections 
ADD COLUMN image_annotations jsonb DEFAULT NULL;