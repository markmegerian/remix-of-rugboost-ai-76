import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from 'https://esm.sh/resend@2.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface InviteRequest {
  email: string;
  fullName: string;
  jobId: string;
  accessToken: string;
  jobNumber: string;
  portalUrl: string;
}

// Helper function to escape HTML
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Replace template variables
function replaceTemplateVariables(template: string, variables: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
  }
  return result;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create admin client for user creation
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { email, fullName, jobId, accessToken, jobNumber, portalUrl } = await req.json() as InviteRequest;

    if (!email || !accessToken || !jobId) {
      return new Response(
        JSON.stringify({ error: 'Email, access token, and job ID are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    const requestId = crypto.randomUUID().slice(0, 8);
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                     req.headers.get('x-real-ip') || 
                     'unknown';
    
    console.log(`[${requestId}] Invite client request from IP: ${clientIp.substring(0, 10)}***`);
    console.log(`[${requestId}] Inviting: ${normalizedEmail.substring(0, 3)}*** for job ${jobId.substring(0, 8)}***`);

    // CRITICAL: Get the job's company_id for tenant isolation
    const { data: jobData, error: jobError } = await supabaseAdmin
      .from('jobs')
      .select('company_id, user_id')
      .eq('id', jobId)
      .single();

    if (jobError || !jobData) {
      console.error(`[${requestId}] Job not found:`, jobError?.message);
      return new Response(
        JSON.stringify({ error: 'Job not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const companyId = jobData.company_id;
    if (!companyId) {
      console.error(`[${requestId}] Job has no company_id - tenant isolation required`);
      return new Response(
        JSON.stringify({ error: 'Job must belong to a company' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[${requestId}] Company context: ${companyId.substring(0, 8)}***`);

    let authUserId: string | null = null;
    let isNewUser = false;
    let clientId: string | null = null;

    // Create the auth user at invite time with a random password
    // The client will set their own password when they access the portal
    const tempPassword = crypto.randomUUID() + crypto.randomUUID();
    
    // Try to create the user - if they already exist, we'll get an error
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: normalizedEmail,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        needs_password_setup: true,
      },
    });

    if (createError) {
      if (createError.message?.includes('already been registered') || 
          createError.message?.includes('already exists') ||
          createError.message?.includes('duplicate')) {
        // User exists - get their ID by email
        const { data: existingUserData, error: getUserError } = await supabaseAdmin.auth.admin.getUserByEmail(normalizedEmail);
        
        if (getUserError || !existingUserData?.user) {
          console.error(`[${requestId}] Error getting existing user:`, getUserError?.message);
          throw new Error('Failed to find existing user');
        }
        
        authUserId = existingUserData.user.id;
        isNewUser = false;
        console.log(`[${requestId}] Found existing user: ${authUserId.substring(0, 8)}***`);
      } else {
        console.error(`[${requestId}] Error creating user:`, createError.message);
        throw createError;
      }
    } else if (newUser?.user) {
      authUserId = newUser.user.id;
      isNewUser = true;
      console.log(`[${requestId}] Created new user: ${authUserId.substring(0, 8)}***`);
    }

    if (!authUserId) {
      throw new Error('Failed to create or find auth user');
    }

    // Store auth_user_id AND company_id on the access token record
    const { error: updateAccessError } = await supabaseAdmin
      .from('client_job_access')
      .update({ 
        auth_user_id: authUserId,
        company_id: companyId, // CRITICAL: Store company context
      })
      .eq('access_token', accessToken);

    if (updateAccessError) {
      console.error(`[${requestId}] Error updating access token:`, updateAccessError.message);
    } else {
      console.log(`[${requestId}] Stored auth_user_id and company_id on access token`);
    }

    // Check if client account exists for this company
    const { data: existingClient } = await supabaseAdmin
      .from('client_accounts')
      .select('id')
      .eq('user_id', authUserId)
      .eq('company_id', companyId) // CRITICAL: Company-scoped lookup
      .maybeSingle();

    if (existingClient) {
      clientId = existingClient.id;
      console.log(`[${requestId}] Using existing client account: ${existingClient.id.substring(0, 8)}***`);
    } else {
      // Create client account with company_id
      const { data: newClient, error: clientError } = await supabaseAdmin
        .from('client_accounts')
        .insert({
          user_id: authUserId,
          email: normalizedEmail,
          full_name: fullName,
          company_id: companyId, // CRITICAL: Tenant isolation
        })
        .select('id')
        .single();

      if (clientError) {
        // May fail if client exists for different company - that's OK
        if (clientError.code !== '23505') {
          console.error(`[${requestId}] Error creating client account:`, clientError.message);
        }
      } else {
        clientId = newClient.id;
        console.log(`[${requestId}] Created new client account: ${newClient.id.substring(0, 8)}***`);
      }
    }

    // Link client to job access
    if (clientId) {
      const { error: linkError } = await supabaseAdmin
        .from('client_job_access')
        .update({ client_id: clientId })
        .eq('access_token', accessToken);

      if (linkError) {
        console.error(`[${requestId}] Error linking client to job:`, linkError.message);
      } else {
        console.log(`[${requestId}] Linked client to job access`);
      }
    }

    // Ensure client role exists (ONLY 'client', never 'staff')
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({ user_id: authUserId, role: 'client' });

    if (roleError && roleError.code !== '23505') {
      console.error(`[${requestId}] Error adding client role:`, roleError.message);
    } else {
      console.log(`[${requestId}] Client role ensured`);
    }

    // Email sending logic
    let emailSentSuccessfully = false;
    let emailErrorMessage: string | null = null;

    let businessName = 'Rug Cleaning Service';
    let businessPhone = '';
    let businessEmail = '';
    let customTemplate = null;

    // Get branding from company_branding or profiles
    const { data: brandingData } = await supabaseAdmin
      .from('company_branding')
      .select('business_name, business_phone, business_email')
      .eq('company_id', companyId)
      .maybeSingle();

    if (brandingData) {
      businessName = brandingData.business_name || businessName;
      businessPhone = brandingData.business_phone || '';
      businessEmail = brandingData.business_email || '';
    } else {
      // Fallback to profiles
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('business_name, business_phone, business_email')
        .eq('user_id', jobData.user_id)
        .single();

      if (profile) {
        businessName = profile.business_name || businessName;
        businessPhone = profile.business_phone || '';
        businessEmail = profile.business_email || '';
      }
    }

    // Check for custom email template (company-scoped)
    const { data: template } = await supabaseAdmin
      .from('email_templates')
      .select('subject, body')
      .eq('company_id', companyId)
      .eq('template_type', 'client_invite')
      .maybeSingle();

    if (template) {
      customTemplate = template;
    }

    // Send invite email
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (resendApiKey && portalUrl) {
      try {
        const resend = new Resend(resendApiKey);
        const fromEmail = Deno.env.get('FROM_EMAIL') || 'onboarding@resend.dev';

        const templateVariables: Record<string, string> = {
          client_name: fullName || 'Valued Customer',
          business_name: businessName,
          business_phone: businessPhone,
          business_email: businessEmail,
          job_number: jobNumber || '',
          portal_link: portalUrl,
        };

        let emailSubject: string;
        let emailBody: string;

        if (customTemplate) {
          emailSubject = replaceTemplateVariables(customTemplate.subject, templateVariables);
          emailBody = replaceTemplateVariables(customTemplate.body, templateVariables);
        } else {
          emailSubject = `Your Rug Inspection Estimate is Ready - ${businessName}`;
          emailBody = `Dear ${fullName || 'Valued Customer'},

Thank you for choosing ${businessName} for your rug care needs.

We have completed the inspection of your rugs and prepared a detailed estimate for the recommended services. Please click the link below to review your estimate and approve the services you'd like us to proceed with:

${portalUrl}

Your Job Number: #${jobNumber || 'N/A'}

If you have any questions, please don't hesitate to contact us${businessPhone ? ` at ${businessPhone}` : ''}.

Best regards,
${businessName}`;
        }

        const emailHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f3f4f6; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #1e40af, #3b82f6); color: white; padding: 40px 30px; text-align: center; border-radius: 16px 16px 0 0; }
              .content { background: white; padding: 40px 30px; border-radius: 0 0 16px 16px; }
              .cta-button { display: inline-block; background: #3b82f6; color: white; padding: 15px 30px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 25px 0; }
              .footer { text-align: center; padding: 30px 20px; color: #6b7280; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin: 0; font-size: 28px;">${escapeHtml(businessName)}</h1>
                <p style="margin: 10px 0 0; opacity: 0.9;">Your Estimate is Ready</p>
              </div>
              <div class="content">
                ${emailBody.split('\n').map(line => 
                  line.startsWith('http') 
                    ? `<p style="text-align: center;"><a href="${escapeHtml(line)}" class="cta-button">View Your Estimate</a></p>`
                    : `<p style="margin: 15px 0;">${escapeHtml(line) || '&nbsp;'}</p>`
                ).join('')}
              </div>
              <div class="footer">
                ${businessPhone ? `<p style="margin: 0;">📞 ${escapeHtml(businessPhone)}</p>` : ''}
                ${businessEmail ? `<p style="margin: 5px 0 0;">✉️ ${escapeHtml(businessEmail)}</p>` : ''}
              </div>
            </div>
          </body>
          </html>
        `;

        const { error: emailError } = await resend.emails.send({
          from: `${businessName} <${fromEmail}>`,
          to: [normalizedEmail],
          subject: emailSubject,
          html: emailHtml,
        });

        if (emailError) {
          console.error(`[${requestId}] Error sending invite email:`, emailError);
          emailErrorMessage = typeof emailError === 'object' ? JSON.stringify(emailError) : String(emailError);
        } else {
          console.log(`[${requestId}] Invite email sent successfully`);
          emailSentSuccessfully = true;
        }
      } catch (emailErr) {
        console.error(`[${requestId}] Failed to send invite email:`, emailErr);
        emailErrorMessage = emailErr instanceof Error ? emailErr.message : String(emailErr);
      }
    } else {
      console.log(`[${requestId}] Skipping email - no RESEND_API_KEY or portalUrl`);
      emailErrorMessage = 'Email not configured (missing RESEND_API_KEY or portalUrl)';
    }

    // Update email status
    await supabaseAdmin
      .from('client_job_access')
      .update({
        email_sent_at: emailSentSuccessfully ? new Date().toISOString() : null,
        email_error: emailErrorMessage,
      })
      .eq('access_token', accessToken);

    console.log(`[${requestId}] Invite completed - Email sent: ${emailSentSuccessfully}, New user: ${isNewUser}`);
    return new Response(
      JSON.stringify({
        success: true,
        userId: authUserId,
        clientId,
        isNewUser,
        companyId, // Return for verification
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Invite client error:', error instanceof Error ? error.message : 'Unknown error');
    const errorMessage = error instanceof Error ? error.message : 'Failed to invite client';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
