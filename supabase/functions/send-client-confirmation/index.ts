import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SelectedService {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

interface RugDetail {
  rugNumber: string;
  rugType: string;
  dimensions: string;
  services: SelectedService[];
  total: number;
}

interface ConfirmationRequest {
  clientEmail: string;
  clientName: string;
  jobId: string;
  jobNumber: string;
  amount: number;
  rugs: RugDetail[];
  businessName?: string;
  businessEmail?: string;
  businessPhone?: string;
  pdfBase64?: string;
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const resend = new Resend(resendApiKey);
    const fromEmail = Deno.env.get("FROM_EMAIL") || "noreply@app.rugboost.com";

    const {
      clientEmail,
      clientName,
      jobId,
      jobNumber,
      amount,
      rugs,
      businessName,
      businessEmail,
      businessPhone,
      pdfBase64,
    }: ConfirmationRequest = await req.json();

    if (!clientEmail || !jobNumber) {
      throw new Error("Missing required fields: clientEmail and jobNumber");
    }

    console.log(`Sending payment confirmation to ${clientEmail} for job ${jobNumber}`);

    const formattedAmount = (amount / 100).toFixed(2);
    const fromName = businessName || "Rug Cleaning Service";

    // Build rug services summary
    const rugsSummaryHtml = rugs.map(rug => `
      <div style="background: #f9fafb; border-radius: 8px; padding: 15px; margin-bottom: 15px;">
        <h3 style="margin: 0 0 10px; color: #1f2937; font-size: 16px;">
          ${escapeHtml(rug.rugNumber)} - ${escapeHtml(rug.rugType)}
        </h3>
        <p style="margin: 0 0 10px; color: #6b7280; font-size: 14px;">
          ${escapeHtml(rug.dimensions)}
        </p>
        <table style="width: 100%; font-size: 14px;">
          ${rug.services.map(s => `
            <tr>
              <td style="padding: 5px 0; color: #374151;">${escapeHtml(s.name)}</td>
              <td style="padding: 5px 0; text-align: right; color: #374151;">
                ${s.quantity} × $${s.unitPrice.toFixed(2)} = <strong>$${(s.quantity * s.unitPrice).toFixed(2)}</strong>
              </td>
            </tr>
          `).join('')}
        </table>
        <div style="border-top: 1px solid #e5e7eb; margin-top: 10px; padding-top: 10px; text-align: right;">
          <strong style="color: #1f2937;">Subtotal: $${rug.total.toFixed(2)}</strong>
        </div>
      </div>
    `).join('');

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f3f4f6; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #059669, #10b981); color: white; padding: 40px 30px; text-align: center; border-radius: 16px 16px 0 0; }
          .content { background: white; padding: 40px 30px; border-radius: 0 0 16px 16px; }
          .success-badge { background: #d1fae5; color: #065f46; padding: 15px 25px; border-radius: 50px; display: inline-block; font-weight: bold; font-size: 18px; }
          .amount-box { background: #ecfdf5; border: 2px solid #10b981; border-radius: 12px; padding: 25px; text-align: center; margin: 25px 0; }
          .amount { font-size: 36px; color: #059669; font-weight: bold; margin: 0; }
          .details { margin: 30px 0; }
          .detail-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #e5e7eb; }
          .footer { text-align: center; padding: 30px 20px; color: #6b7280; font-size: 14px; }
          .next-steps { background: #f0f9ff; border-left: 4px solid #3b82f6; padding: 20px; margin: 25px 0; border-radius: 0 8px 8px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="success-badge">✓ Payment Confirmed</div>
            <h1 style="margin: 20px 0 0; font-size: 28px;">Thank You for Your Order!</h1>
          </div>
          <div class="content">
            <p style="font-size: 16px; margin: 0 0 20px;">Dear <strong>${escapeHtml(clientName)}</strong>,</p>
            
            <p style="font-size: 16px; margin: 0 0 25px;">
              We've received your payment and are excited to begin work on your rugs. 
              This email confirms your order and approved services.
            </p>
            
            <div class="amount-box">
              <p style="margin: 0 0 5px; color: #065f46; font-size: 14px;">Total Paid</p>
              <p class="amount">$${formattedAmount}</p>
            </div>

            <div class="details">
              <div class="detail-row">
                <span><strong>Job Number:</strong></span>
                <span>#${escapeHtml(jobNumber)}</span>
              </div>
              <div class="detail-row">
                <span><strong>Status:</strong></span>
                <span style="color: #059669;">✓ In Progress</span>
              </div>
            </div>

            <h2 style="color: #1f2937; font-size: 20px; margin: 30px 0 20px; border-bottom: 2px solid #10b981; padding-bottom: 10px;">
              Your Approved Services
            </h2>
            
            ${rugsSummaryHtml}

            <div class="next-steps">
              <h3 style="margin: 0 0 10px; color: #1e40af; font-size: 16px;">📋 What Happens Next?</h3>
              <ul style="margin: 0; padding-left: 20px; color: #374151;">
                <li>Our team will begin working on your rugs immediately</li>
                <li>You'll receive updates as we make progress</li>
                <li>We'll contact you when your rugs are ready for pickup or delivery</li>
              </ul>
            </div>

            ${pdfBase64 ? `
              <div style="background: #eff6ff; border-radius: 12px; padding: 20px; text-align: center; margin: 25px 0;">
                <p style="color: #1e40af; margin: 0;">
                  📎 <strong>Your detailed inspection report is attached to this email</strong>
                </p>
              </div>
            ` : ''}

            <p style="margin: 30px 0 0; font-size: 16px;">
              If you have any questions, please don't hesitate to reach out.
            </p>
            
            <p style="margin: 20px 0 0; font-size: 16px;">
              Thank you for trusting us with your rugs!<br>
              <strong>${escapeHtml(fromName)}</strong>
            </p>
          </div>
          <div class="footer">
            ${businessPhone ? `<p style="margin: 0;">📞 ${escapeHtml(businessPhone)}</p>` : ''}
            ${businessEmail ? `<p style="margin: 5px 0 0;">✉️ ${escapeHtml(businessEmail)}</p>` : ''}
          </div>
        </div>
      </body>
      </html>
    `;

    // Prepare attachments
    const attachments = pdfBase64 ? [{
      filename: `Invoice_Job_${jobNumber.replace(/[^a-zA-Z0-9-_]/g, '_')}.pdf`,
      content: pdfBase64,
    }] : [];

    const { data: emailData, error: emailError } = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: [clientEmail],
      replyTo: businessEmail || "support@rugboost.com",
      subject: `✓ Payment Confirmed - Job #${jobNumber}`,
      html: emailHtml,
      attachments,
    });

    if (emailError) {
      console.error("Resend error:", emailError);
      throw new Error(`Failed to send email: ${emailError.message}`);
    }

    console.log("Client confirmation email sent successfully! ID:", emailData?.id);

    return new Response(
      JSON.stringify({ success: true, emailId: emailData?.id }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error sending client confirmation:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
