-- Drop the old storage policy that doesn't support company access
DROP POLICY IF EXISTS "Users and authorized clients can view photos" ON storage.objects;

-- Create new policy that allows company members to view photos from their company's jobs
CREATE POLICY "Company members and clients can view photos"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'rug-photos'
  AND (
    -- Owner can always view their own photos
    (storage.foldername(name))[1] = auth.uid()::text
    OR
    -- Company members can view photos from jobs in their company
    EXISTS (
      SELECT 1 FROM inspections i
      JOIN jobs j ON j.id = i.job_id
      WHERE (storage.foldername(objects.name))[1] = i.user_id::text
      AND j.company_id = get_user_company_id(auth.uid())
    )
    OR
    -- Clients can view photos for jobs they have access to
    EXISTS (
      SELECT 1
      FROM inspections i
      JOIN client_job_access cja ON cja.job_id = i.job_id
      JOIN client_accounts ca ON ca.id = cja.client_id
      WHERE ca.user_id = auth.uid()
      AND (storage.foldername(objects.name))[1] = i.user_id::text
    )
  )
);