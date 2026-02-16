-- Fix: client portal links were becoming invalid after password setup
-- Root cause: validate_access_token filtered out records where consumed_at is set.
-- complete-client-registration sets consumed_at during one-time password claim,
-- which unintentionally broke ongoing portal access for valid links.

CREATE OR REPLACE FUNCTION public.validate_access_token(_token text)
RETURNS TABLE(
  access_id uuid,
  job_id uuid,
  invited_email text,
  client_id uuid,
  staff_user_id uuid,
  job_number text,
  client_name text,
  job_status text,
  auth_user_id uuid,
  company_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _token_hash text;
BEGIN
  _token_hash := encode(sha256(_token::bytea), 'hex');

  RETURN QUERY
  SELECT
    cja.id as access_id,
    cja.job_id,
    cja.invited_email,
    cja.client_id,
    j.user_id as staff_user_id,
    j.job_number,
    j.client_name,
    j.status as job_status,
    cja.auth_user_id,
    COALESCE(cja.company_id, j.company_id) as company_id
  FROM client_job_access cja
  JOIN jobs j ON j.id = cja.job_id
  WHERE (
    cja.access_token_hash = _token_hash
    OR (cja.access_token_hash IS NULL AND cja.access_token = _token)
  )
    AND (cja.expires_at IS NULL OR cja.expires_at > NOW());
END;
$$;
