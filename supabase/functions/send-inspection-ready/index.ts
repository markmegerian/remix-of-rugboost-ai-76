import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from 'https://esm.sh/resend@2.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InspectionReadyRequest {
  jobId: string;
  clientEmail: string;
  clientName: string;
  jobNumber: string;
  portalUrl: string;
  rugCount: number;
  totalAmount: number;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Auth validation
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Validate user
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      console.error("Auth error:", claimsError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = claimsData.claims.sub as string;
    console.log(`User ${userId.substring(0, 8)}*** sending inspection ready email`);

    const request: InspectionReadyRequest = await req.json();
    const { jobId, clientEmail, clientName, jobNumber, portalUrl, rugCount, totalAmount } = request;

    if (!jobId || !clientEmail || !portalUrl) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Admin client for fetching branding
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Get job and company info
    const { data: jobData, error: jobError } = await supabaseAdmin
      .from('jobs')
      .select('company_id, user_id')
      .eq('id', jobId)
      .single();

    if (jobError || !jobData) {
      console.error('Job not found:', jobError?.message);
      return new Response(
        JSON.stringify({ error: 'Job not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get branding
    let businessName = 'Rug Cleaning Service';
    let businessPhone = '';
    let businessEmail = '';

    if (jobData.company_id) {
      const { data: brandingData } = await supabaseAdmin
        .from('company_branding')
        .select('business_name, business_phone, business_email')
        .eq('company_id', jobData.company_id)
        .maybeSingle();

      if (brandingData) {
        businessName = brandingData.business_name || businessName;
        businessPhone = brandingData.business_phone || '';
        businessEmail = brandingData.business_email || '';
      }
    }

    // Fallback to profile
    if (businessName === 'Rug Cleaning Service') {
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

    // Send email
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      console.error('RESEND_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const resend = new Resend(resendApiKey);
    const fromEmail = Deno.env.get('FROM_EMAIL') || 'noreply@app.rugboost.com';

    const subject = `Your Inspection Report is Ready - Job #${jobNumber}`;
    
    const emailHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;background:#f3f4f6;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
    <div style="background:#1a3d5c;padding:30px;text-align:center;border-radius:8px 8px 0 0;">
      <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:600;">${escapeHtml(businessName)}</h1>
    </div>
    
    <div style="background:#ffffff;padding:40px 30px;border-radius:0 0 8px 8px;">
      <p style="color:#1f2937;font-size:16px;margin:0 0 20px;">Dear ${escapeHtml(clientName || 'Valued Customer')},</p>
      
      <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 20px;">
        We have completed the inspection of your ${rugCount === 1 ? 'rug' : `${rugCount} rugs`} and prepared a detailed report with our recommendations.
      </p>
      
      <div style="background:#f9fafb;border-left:4px solid #2c5f7c;padding:15px 20px;margin:25px 0;">
        <p style="color:#1f2937;font-size:14px;margin:0;"><strong>Job Number:</strong> #${escapeHtml(jobNumber)}</p>
        ${totalAmount > 0 ? `<p style="color:#1f2937;font-size:14px;margin:10px 0 0;"><strong>Estimated Total:</strong> $${totalAmount.toFixed(2)}</p>` : ''}
      </div>
      
      <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 25px;">
        Please click the button below to review your inspection report and approve the recommended services.
      </p>
      
      <div style="text-align:center;margin:30px 0;">
        <a href="${escapeHtml(portalUrl)}" 
           style="display:inline-block;background:#2c5f7c;color:#ffffff;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:600;font-size:15px;">
          View Your Report
        </a>
      </div>
      
      <p style="color:#6b7280;font-size:13px;line-height:1.5;margin:30px 0 0;">
        If you have any questions about the inspection findings or our recommendations, please don't hesitate to contact us.
      </p>
      
      <p style="color:#374151;font-size:15px;margin:25px 0 0;">
        Best regards,<br>
        <strong>${escapeHtml(businessName)}</strong>
      </p>
    </div>
    
    <div style="text-align:center;padding:20px;color:#6b7280;font-size:12px;">
      ${businessPhone ? `<p style="margin:0;">${escapeHtml(businessPhone)}</p>` : ''}
      ${businessEmail ? `<p style="margin:5px 0 0;">${escapeHtml(businessEmail)}</p>` : ''}
    </div>
  </div>
</body>
</html>`;

    const { error: emailError } = await resend.emails.send({
      from: `${businessName} <${fromEmail}>`,
      to: [clientEmail],
      replyTo: businessEmail || 'support@rugboost.com',
      subject,
      html: emailHtml,
    });

    if (emailError) {
      console.error('Error sending inspection ready email:', emailError);
      return new Response(
        JSON.stringify({ error: `Failed to send email: ${JSON.stringify(emailError)}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Inspection ready email sent to ${clientEmail} for job ${jobNumber}`);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in send-inspection-ready:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
