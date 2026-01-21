-- Fix 1: Update storage policy to allow clients to view photos for their jobs
-- First drop existing restrictive SELECT policy
DROP POLICY IF EXISTS "Users can view their own rug photos" ON storage.objects;

-- Create new policy that allows:
-- 1. Owners to view their own files
-- 2. Clients to view photos for jobs they have access to
CREATE POLICY "Users and authorized clients can view photos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'rug-photos'
  AND (
    -- Owner access (staff user who uploaded)
    (storage.foldername(name))[1] = auth.uid()::text
    OR
    -- Client access through job - check if user has client_job_access to a job that has inspections with these photos
    EXISTS (
      SELECT 1 FROM public.inspections i
      JOIN public.client_job_access cja ON cja.job_id = i.job_id
      JOIN public.client_accounts ca ON ca.id = cja.client_id
      WHERE ca.user_id = auth.uid()
      AND (storage.foldername(name))[1] = i.user_id::text
      AND i.job_id = cja.job_id
    )
  )
);

-- Fix 2: Make audit logs immutable with explicit deny policies and trigger
-- Add explicit deny policy for updates
CREATE POLICY "Deny audit log updates"
ON public.admin_audit_logs
FOR UPDATE
TO authenticated
USING (false);

-- Add explicit deny policy for deletes
CREATE POLICY "Deny audit log deletions"
ON public.admin_audit_logs
FOR DELETE
TO authenticated
USING (false);

-- Create function to prevent modifications at database level (defense in depth)
CREATE OR REPLACE FUNCTION public.prevent_audit_log_changes()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Audit logs are immutable and cannot be modified or deleted';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to enforce immutability
CREATE TRIGGER prevent_audit_log_modifications
  BEFORE UPDATE OR DELETE ON public.admin_audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_audit_log_changes();