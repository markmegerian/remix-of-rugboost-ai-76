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
    return new Response(null, { headers: corsHeaders });
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

    if (!email || !accessToken) {
      return new Response(
        JSON.stringify({ error: 'Email and access token are required' }),
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

    let userId: string | null = null;
    let isNewUser = false;
    let clientId: string | null = null;

    // Check if user already exists - don't create the user yet
    // The user will set their own password when they access the portal
    const { data: usersData, error: listError } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

    if (listError) {
      console.error(`[${requestId}] Error listing users:`, listError.message);
      throw listError;
    }

    const existingUser = usersData?.users?.find(
      u => u.email?.toLowerCase() === normalizedEmail
    );

    if (existingUser) {
      userId = existingUser.id;
      isNewUser = false;
      console.log(`[${requestId}] Found existing user: ${userId.substring(0, 8)}***`);
    } else {
      // User doesn't exist yet - they will be created when they set their password
      isNewUser = true;
      console.log(`[${requestId}] New user - will be created on portal access`);
    }

    // Only set up client account if user already exists
    if (userId) {
      // Check if client account exists
      const { data: existingClient } = await supabaseAdmin
        .from('client_accounts')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (existingClient) {
        clientId = existingClient.id;
        console.log(`[${requestId}] Using existing client account: ${existingClient.id.substring(0, 8)}***`);
      } else {
        // Create client account
        const { data: newClient, error: clientError } = await supabaseAdmin
          .from('client_accounts')
          .insert({
            user_id: userId,
            email: normalizedEmail,
            full_name: fullName,
          })
          .select('id')
          .single();

        if (clientError) {
          console.error(`[${requestId}] Error creating client account:`, clientError.message);
          throw clientError;
        }
        clientId = newClient.id;
        console.log(`[${requestId}] Created new client account: ${newClient.id.substring(0, 8)}***`);
      }

      // Link client to job access
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

    // Variable to track email status
    let emailSentSuccessfully = false;
    let emailErrorMessage: string | null = null;

    // Get job owner's profile for branding
    const { data: job } = await supabaseAdmin
      .from('jobs')
      .select('user_id')
      .eq('id', jobId)
      .single();

    let businessName = 'Rug Cleaning Service';
    let businessPhone = '';
    let businessEmail = '';
    let customTemplate = null;

    if (job?.user_id) {
      // Get branding
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('business_name, business_phone, business_email')
        .eq('user_id', job.user_id)
        .single();

      if (profile) {
        businessName = profile.business_name || businessName;
        businessPhone = profile.business_phone || '';
        businessEmail = profile.business_email || '';
      }

      // Check for custom email template
      const { data: template } = await supabaseAdmin
        .from('email_templates')
        .select('subject, body')
        .eq('user_id', job.user_id)
        .eq('template_type', 'client_invite')
        .single();

      if (template) {
        customTemplate = template;
      }
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
          // Use custom template
          emailSubject = replaceTemplateVariables(customTemplate.subject, templateVariables);
          emailBody = replaceTemplateVariables(customTemplate.body, templateVariables);
        } else {
          // Use default template
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

        // Convert plain text to HTML
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

    // Update client_job_access with email status
    const { error: updateError } = await supabaseAdmin
      .from('client_job_access')
      .update({
        email_sent_at: emailSentSuccessfully ? new Date().toISOString() : null,
        email_error: emailErrorMessage,
      })
      .eq('access_token', accessToken);

    if (updateError) {
      console.error(`[${requestId}] Error updating email status:`, updateError.message);
    }

    console.log(`[${requestId}] Invite completed - Email sent: ${emailSentSuccessfully}, New user: ${isNewUser}`);
    return new Response(
      JSON.stringify({
        success: true,
        userId,
        clientId,
        isNewUser,
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
