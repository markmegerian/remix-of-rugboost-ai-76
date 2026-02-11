-- Create rate limits table for database-backed rate limiting
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  identifier text NOT NULL,
  action text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_rate_limits_lookup
  ON public.rate_limits (identifier, action, created_at);

-- Enable RLS
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Only service role can access (edge functions use service role)
CREATE POLICY "Service role only" ON public.rate_limits
  FOR ALL USING (false);

-- Create generic rate limit checker function
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_identifier text,
  p_action text,
  p_max_requests integer DEFAULT 10,
  p_window_minutes integer DEFAULT 60
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  request_count integer;
BEGIN
  -- Clean up old entries for this action
  DELETE FROM rate_limits
  WHERE action = p_action
    AND created_at < now() - (p_window_minutes || ' minutes')::interval;

  -- Count recent requests
  SELECT count(*) INTO request_count
  FROM rate_limits
  WHERE identifier = p_identifier
    AND action = p_action
    AND created_at > now() - (p_window_minutes || ' minutes')::interval;

  -- Check if over limit
  IF request_count >= p_max_requests THEN
    RETURN false;
  END IF;

  -- Record this request
  INSERT INTO rate_limits (identifier, action)
  VALUES (p_identifier, p_action);

  RETURN true;
END;
$$;