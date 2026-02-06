import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RegistrationRequest {
  accessToken: string;
  email: string;
  password: string;
}

// Rate limiting: 5 registration attempts per IP per 5 minutes
const rateLimits = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 5;

function cleanupRateLimits(): void {
  const now = Date.now();
  for (const [key, value] of rateLimits.entries()) {
    if (now > value.resetAt) {
      rateLimits.delete(key);
    }
  }
}

function checkRateLimit(identifier: string): { allowed: boolean; remaining: number; resetIn: number } {
  cleanupRateLimits();
  const now = Date.now();
  const limit = rateLimits.get(identifier);

  if (!limit || now > limit.resetAt) {
    rateLimits.set(identifier, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - 1, resetIn: RATE_LIMIT_WINDOW_MS };
  }

  if (limit.count >= RATE_LIMIT_MAX_REQUESTS) {
    return { allowed: false, remaining: 0, resetIn: limit.resetAt - now };
  }

  limit.count++;
  return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - limit.count, resetIn: limit.resetAt - now };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                     req.headers.get('x-real-ip') || 
                     'unknown';
    
    const rateCheck = checkRateLimit(`registration:${clientIp}`);
    if (!rateCheck.allowed) {
      console.log(`Rate limit exceeded for IP: ${clientIp}`);
      return new Response(
        JSON.stringify({ error: 'Too many registration attempts. Please try again later.' }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'Retry-After': Math.ceil(rateCheck.resetIn / 1000).toString(),
          } 
        }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { accessToken, email, password } = await req.json() as RegistrationRequest;

    if (!accessToken || !email || !password) {
      return new Response(
        JSON.stringify({ error: 'Access token, email, and password are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate password strength
    if (password.length < 8) {
      return new Response(
        JSON.stringify({ error: 'Password must be at least 8 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (!/[A-Z]/.test(password)) {
      return new Response(
        JSON.stringify({ error: 'Password must contain an uppercase letter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (!/[a-z]/.test(password)) {
      return new Response(
        JSON.stringify({ error: 'Password must contain a lowercase letter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (!/[0-9]/.test(password)) {
      return new Response(
        JSON.stringify({ error: 'Password must contain a number' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    const requestId = crypto.randomUUID().slice(0, 8);
    
    console.log(`[${requestId}] Registration request from IP: ${clientIp.substring(0, 10)}*** for: ${normalizedEmail.substring(0, 3)}***`);

    // STEP 1: Atomically claim the token (prevents replay attacks)
    // Must include company_id in the claim to ensure tenant isolation
    const { data: claimedToken, error: claimError } = await supabaseAdmin
      .from('client_job_access')
      .update({ consumed_at: new Date().toISOString() })
      .eq('access_token', accessToken)
      .is('consumed_at', null)
      .select('id, auth_user_id, invited_email, client_id, job_id, company_id')
      .maybeSingle();

    if (claimError) {
      console.error(`[${requestId}] Token claim error:`, claimError.message);
      return new Response(
        JSON.stringify({ error: 'This access link is invalid, expired, or already used. Please request a new link from the business.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!claimedToken) {
      console.log(`[${requestId}] Token claim failed - already consumed, expired, or invalid`);
      return new Response(
        JSON.stringify({ error: 'This access link is invalid, expired, or already used. Please request a new link from the business.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[${requestId}] Token claimed successfully: ${claimedToken.id.substring(0, 8)}***`);

    const authUserId = claimedToken.auth_user_id;
    const companyId = claimedToken.company_id;
    
    // CRITICAL: Require both auth_user_id and company_id for security
    if (!authUserId) {
      console.error(`[${requestId}] Legacy invite without auth_user_id`);
      return new Response(
        JSON.stringify({ error: 'This access link is invalid or expired. Please request a new link from the business.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!companyId) {
      // Try to get company_id from the job as fallback
      const { data: jobData } = await supabaseAdmin
        .from('jobs')
        .select('company_id')
        .eq('id', claimedToken.job_id)
        .single();
      
      if (!jobData?.company_id) {
        console.error(`[${requestId}] No company context for registration`);
        return new Response(
          JSON.stringify({ error: 'Unable to determine company context. Please request a new link.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      // Update the access record with company_id for future reference
      await supabaseAdmin
        .from('client_job_access')
        .update({ company_id: jobData.company_id })
        .eq('id', claimedToken.id);
    }

    const finalCompanyId = companyId || (await supabaseAdmin
      .from('jobs')
      .select('company_id')
      .eq('id', claimedToken.job_id)
      .single()).data?.company_id;

    console.log(`[${requestId}] Company context: ${finalCompanyId?.substring(0, 8)}***`);

    // SECURITY: Verify the email matches the invited email
    const invitedEmail = claimedToken.invited_email?.toLowerCase().trim();
    if (invitedEmail && invitedEmail !== normalizedEmail) {
      console.error(`[${requestId}] Email mismatch`);
      return new Response(
        JSON.stringify({ error: 'Email does not match the invitation. Please request a new link from the business.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[${requestId}] Using auth_user_id: ${authUserId.substring(0, 8)}***`);

    // STEP 2: Update the user's password
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      authUserId,
      {
        password: password,
        user_metadata: {
          needs_password_setup: false,
        },
      }
    );

    if (updateError) {
      console.error(`[${requestId}] Error updating password:`, updateError.message);
      return new Response(
        JSON.stringify({ error: 'Failed to set password. Please request a new access link from the business.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    console.log(`[${requestId}] Password updated successfully`);

    // STEP 3: Ensure client account exists with correct company_id
    const { data: existingClient } = await supabaseAdmin
      .from('client_accounts')
      .select('id, company_id')
      .eq('user_id', authUserId)
      .eq('company_id', finalCompanyId) // CRITICAL: Company-scoped
      .maybeSingle();

    let clientId = existingClient?.id || claimedToken.client_id;

    if (!clientId) {
      const { data: jobInfo } = await supabaseAdmin
        .from('jobs')
        .select('client_name')
        .eq('id', claimedToken.job_id)
        .maybeSingle();

      const { data: newClient, error: clientError } = await supabaseAdmin
        .from('client_accounts')
        .insert({
          user_id: authUserId,
          email: normalizedEmail,
          full_name: jobInfo?.client_name || '',
          company_id: finalCompanyId, // CRITICAL: Tenant isolation
        })
        .select('id')
        .single();

      if (!clientError && newClient) {
        clientId = newClient.id;
        console.log(`[${requestId}] Created client account: ${clientId.substring(0, 8)}***`);
      } else if (clientError && clientError.code !== '23505') {
        console.error(`[${requestId}] Error creating client account:`, clientError.message);
      }
    }

    // Link to job access
    if (clientId) {
      await supabaseAdmin
        .from('client_job_access')
        .update({ client_id: clientId })
        .eq('id', claimedToken.id);
    }

    // STEP 4: Ensure ONLY 'client' role - NEVER 'staff'
    // First check if user already has roles
    const { data: existingRoles } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', authUserId);

    const hasClientRole = existingRoles?.some(r => r.role === 'client');
    
    if (!hasClientRole) {
      const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .insert({ user_id: authUserId, role: 'client' });

      if (roleError && roleError.code !== '23505') {
        console.error(`[${requestId}] Error adding client role:`, roleError.message);
      } else {
        console.log(`[${requestId}] Client role added`);
      }
    }

    // Mark password as set
    await supabaseAdmin
      .from('client_job_access')
      .update({ password_set_at: new Date().toISOString() })
      .eq('id', claimedToken.id);

    console.log(`[${requestId}] Registration completed successfully`);
    return new Response(
      JSON.stringify({ 
        success: true, 
        userId: authUserId, 
        isNewUser: false,
        companyId: finalCompanyId,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Registration error:', error instanceof Error ? error.message : 'Unknown error');
    const errorMessage = error instanceof Error ? error.message : 'Failed to complete registration';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
