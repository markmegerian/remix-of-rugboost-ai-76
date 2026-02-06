import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  to: string;
  businessName: string;
  jobNumber: string;
  clientName: string;
  amount: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

    const { to, businessName, jobNumber, clientName, amount }: NotificationRequest = await req.json();

    if (!to || !jobNumber || !clientName) {
      throw new Error("Missing required fields");
    }

    const formattedAmount = (amount / 100).toFixed(2);

    const fromEmail = Deno.env.get("FROM_EMAIL") || "noreply@app.rugboost.com";
    
    const emailResponse = await resend.emails.send({
      from: `${businessName || "RugBoost"} <${fromEmail}>`,
      to: [to],
      replyTo: "support@rugboost.com",
      subject: `🎉 Payment Received - Job #${jobNumber}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #1a3d5c, #2c5f7c); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .highlight { background: #e8f5e9; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4caf50; }
            .amount { font-size: 28px; color: #2e7d32; font-weight: bold; }
            .details { margin: 20px 0; }
            .details-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>💰 Payment Received!</h1>
            </div>
            <div class="content">
              <div class="highlight">
                <p style="margin: 0;">Amount Received</p>
                <p class="amount">$${formattedAmount}</p>
              </div>
              
              <div class="details">
                <div class="details-row">
                  <span><strong>Job Number:</strong></span>
                  <span>#${jobNumber}</span>
                </div>
                <div class="details-row">
                  <span><strong>Client:</strong></span>
                  <span>${clientName}</span>
                </div>
                <div class="details-row">
                  <span><strong>Status:</strong></span>
                  <span style="color: #4caf50;">✓ Paid - Ready to Begin</span>
                </div>
              </div>
              
              <p>The client has approved services and completed payment. You can now begin work on this job.</p>
              
              <p><strong>Next Steps:</strong></p>
              <ul>
                <li>Review the approved services in your dashboard</li>
                <li>Begin work on the rugs</li>
                <li>Update job status as you progress</li>
              </ul>
              
              <div class="footer">
                <p>This notification was sent automatically by RugBoost.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Payment notification sent:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, emailId: emailResponse.data?.id || null }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error sending notification:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
