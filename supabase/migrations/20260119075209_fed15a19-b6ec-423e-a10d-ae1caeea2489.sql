-- Make the rug-photos bucket private
UPDATE storage.buckets SET public = false WHERE id = 'rug-photos';

-- Drop existing public policies
DROP POLICY IF EXISTS "Public read access for rug photos" ON storage.objects;
DROP POLICY IF EXISTS "Public upload access for rug photos" ON storage.objects;

-- Create authenticated policies for rug-photos bucket
CREATE POLICY "Authenticated users can upload to rug-photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'rug-photos'
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Authenticated users can view rug-photos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'rug-photos'
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Authenticated users can update rug-photos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'rug-photos'
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Authenticated users can delete rug-photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'rug-photos'
  AND auth.uid() IS NOT NULL
);