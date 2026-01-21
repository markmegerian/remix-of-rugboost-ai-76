-- Fix overly permissive payments policies
-- Drop the permissive policies
DROP POLICY IF EXISTS "System can insert payments" ON public.payments;
DROP POLICY IF EXISTS "System can update payments" ON public.payments;

-- Create more restrictive policies - payments are created/updated via edge functions using service role
-- No direct insert/update from client side - this is handled by webhooks
-- Staff can only view, not modify payments directly