import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders, handleCorsPrelight, corsJsonResponse } from '../_shared/cors.ts';

interface ValidateTokenRequest {
  token: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCorsPrelight(req);
  }

  const corsHeaders = getCorsHeaders(req);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Get client IP for rate limiting
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                     req.headers.get('x-real-ip') || 
                     'unknown';

    const { token } = await req.json() as ValidateTokenRequest;

    if (!token) {
      return corsJsonResponse({ error: 'Token is required' }, 400, req);
    }

    // Input validation: token format check
    if (typeof token !== 'string' || token.length < 20 || token.length > 100) {
      return corsJsonResponse({ error: 'Invalid token format' }, 400, req);
    }

    const requestId = crypto.randomUUID().slice(0, 8);
    console.log(`[${requestId}] Token validation request from IP: ${clientIp.substring(0, 10)}***`);

    // Check rate limit (10 attempts per 5 minutes, 15 minute block)
    const { data: rateCheck, error: rateError } = await supabaseAdmin
      .rpc('check_token_rate_limit', {
        _identifier: `token_validation:${clientIp}`,
        _max_attempts: 10,
        _window_seconds: 300,
        _block_seconds: 900,
      })
      .single();

    if (rateError) {
      console.error(`[${requestId}] Rate limit check error:`, rateError.message);
      // Continue anyway - don't block on rate limit errors
    } else if (rateCheck && !rateCheck.allowed) {
      console.log(`[${requestId}] Rate limit exceeded for IP: ${clientIp.substring(0, 10)}***`);
      const blockedUntil = rateCheck.blocked_until_ts ? new Date(rateCheck.blocked_until_ts) : null;
      const retryAfter = blockedUntil ? Math.ceil((blockedUntil.getTime() - Date.now()) / 1000) : 900;
      
      return new Response(
        JSON.stringify({ 
          error: 'Too many validation attempts. Please try again later.',
          retryAfter,
        }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'Retry-After': String(retryAfter),
          } 
        }
      );
    }

    // Validate the token using the secure database function
    const { data: tokenData, error: tokenError } = await supabaseAdmin
      .rpc('validate_access_token', { _token: token })
      .single();

    if (tokenError || !tokenData) {
      console.log(`[${requestId}] Token validation failed: ${tokenError?.message || 'Not found'}`);
      return corsJsonResponse({ 
        error: 'Invalid or expired access link',
        valid: false,
      }, 404, req);
    }

    console.log(`[${requestId}] Token validated successfully for job: ${tokenData.job_id?.substring(0, 8)}***`);

    return corsJsonResponse({
      valid: true,
      accessId: tokenData.access_id,
      jobId: tokenData.job_id,
      invitedEmail: tokenData.invited_email,
      clientId: tokenData.client_id,
      staffUserId: tokenData.staff_user_id,
      jobNumber: tokenData.job_number,
      clientName: tokenData.client_name,
      jobStatus: tokenData.job_status,
      authUserId: tokenData.auth_user_id,
      companyId: tokenData.company_id,
      remainingAttempts: rateCheck?.remaining_attempts ?? null,
    }, 200, req);
  } catch (error: unknown) {
    console.error('Token validation error:', error instanceof Error ? error.message : 'Unknown error');
    return corsJsonResponse({ error: 'Validation failed', valid: false }, 500, req);
  }
});
