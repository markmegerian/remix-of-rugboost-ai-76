
-- Allow authenticated users to upload to the training/ folder in rug-photos
CREATE POLICY "Allow training uploads for authenticated users"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'rug-photos'
  AND (storage.foldername(name))[1] = 'training'
  AND auth.role() = 'authenticated'
);

-- Allow authenticated users to read training photos
CREATE POLICY "Allow training reads for authenticated users"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'rug-photos'
  AND (storage.foldername(name))[1] = 'training'
  AND auth.role() = 'authenticated'
);

-- Allow authenticated users to delete training photos
CREATE POLICY "Allow training deletes for authenticated users"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'rug-photos'
  AND (storage.foldername(name))[1] = 'training'
  AND auth.role() = 'authenticated'
);
