-- Add access_token_hash column for secure token storage
-- The original access_token will be deprecated once migration is complete

-- Add hash column
ALTER TABLE public.client_job_access 
ADD COLUMN IF NOT EXISTS access_token_hash text;

-- Create index for hash lookups
CREATE INDEX IF NOT EXISTS idx_client_job_access_token_hash 
ON public.client_job_access(access_token_hash);

-- Add rate limiting table for token validation attempts
CREATE TABLE IF NOT EXISTS public.token_validation_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL,
  attempt_count integer NOT NULL DEFAULT 1,
  first_attempt_at timestamp with time zone NOT NULL DEFAULT now(),
  last_attempt_at timestamp with time zone NOT NULL DEFAULT now(),
  blocked_until timestamp with time zone
);

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_token_validation_identifier 
ON public.token_validation_attempts(identifier);

-- Enable RLS on rate limiting table
ALTER TABLE public.token_validation_attempts ENABLE ROW LEVEL SECURITY;

-- Only service role can access rate limiting table (via edge functions)
CREATE POLICY "Service role only" ON public.token_validation_attempts
FOR ALL USING (false);

-- Function to check and update rate limit
CREATE OR REPLACE FUNCTION public.check_token_rate_limit(
  _identifier text,
  _max_attempts integer DEFAULT 10,
  _window_seconds integer DEFAULT 300,
  _block_seconds integer DEFAULT 900
)
RETURNS TABLE(allowed boolean, remaining_attempts integer, blocked_until_ts timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _record token_validation_attempts%ROWTYPE;
  _now timestamp with time zone := now();
  _window_start timestamp with time zone := _now - (_window_seconds || ' seconds')::interval;
BEGIN
  -- Get or create the rate limit record
  SELECT * INTO _record FROM token_validation_attempts 
  WHERE identifier = _identifier FOR UPDATE;
  
  IF NOT FOUND THEN
    -- First attempt
    INSERT INTO token_validation_attempts (identifier, attempt_count, first_attempt_at, last_attempt_at)
    VALUES (_identifier, 1, _now, _now);
    RETURN QUERY SELECT true, _max_attempts - 1, NULL::timestamp with time zone;
    RETURN;
  END IF;
  
  -- Check if currently blocked
  IF _record.blocked_until IS NOT NULL AND _record.blocked_until > _now THEN
    RETURN QUERY SELECT false, 0, _record.blocked_until;
    RETURN;
  END IF;
  
  -- Reset if outside window
  IF _record.first_attempt_at < _window_start THEN
    UPDATE token_validation_attempts 
    SET attempt_count = 1, first_attempt_at = _now, last_attempt_at = _now, blocked_until = NULL
    WHERE identifier = _identifier;
    RETURN QUERY SELECT true, _max_attempts - 1, NULL::timestamp with time zone;
    RETURN;
  END IF;
  
  -- Increment attempt
  IF _record.attempt_count >= _max_attempts THEN
    -- Block the identifier
    UPDATE token_validation_attempts 
    SET blocked_until = _now + (_block_seconds || ' seconds')::interval, last_attempt_at = _now
    WHERE identifier = _identifier;
    RETURN QUERY SELECT false, 0, _now + (_block_seconds || ' seconds')::interval;
    RETURN;
  END IF;
  
  -- Allow but increment
  UPDATE token_validation_attempts 
  SET attempt_count = attempt_count + 1, last_attempt_at = _now
  WHERE identifier = _identifier;
  RETURN QUERY SELECT true, _max_attempts - _record.attempt_count - 1, NULL::timestamp with time zone;
END;
$$;

-- Updated validate_access_token function that supports both hash and legacy token
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
  -- Generate SHA-256 hash of the provided token for comparison
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
    -- Try hash first (new tokens)
    cja.access_token_hash = _token_hash
    -- Fallback to plain token (legacy tokens) - will be deprecated
    OR (cja.access_token_hash IS NULL AND cja.access_token = _token)
  )
    AND (cja.expires_at IS NULL OR cja.expires_at > NOW())
    AND cja.consumed_at IS NULL;
END;
$$;

-- Function to reset rate limit (for admin use)
CREATE OR REPLACE FUNCTION public.reset_token_rate_limit(_identifier text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM token_validation_attempts WHERE identifier = _identifier;
$$;

-- Cleanup old rate limit entries (to be called periodically)
CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limits()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM token_validation_attempts 
  WHERE last_attempt_at < now() - interval '1 day'
  AND (blocked_until IS NULL OR blocked_until < now());
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;