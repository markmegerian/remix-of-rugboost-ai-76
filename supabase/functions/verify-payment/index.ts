import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sessionId } = await req.json();

    if (!sessionId) {
      throw new Error("Session ID is required");
    }

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Retrieve the checkout session
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["payment_intent"],
    });

    console.log("Verifying session:", sessionId, "Status:", session.payment_status);

    // Create admin client for database updates
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    if (session.payment_status === "paid") {
      const paymentIntent = session.payment_intent as Stripe.PaymentIntent;
      const jobId = session.metadata?.jobId;

      // Update payment record
      const { error: paymentError } = await supabaseAdmin
        .from("payments")
        .update({
          status: "completed",
          stripe_payment_intent_id: paymentIntent?.id,
          paid_at: new Date().toISOString(),
        })
        .eq("stripe_checkout_session_id", sessionId);

      if (paymentError) {
        console.error("Error updating payment:", paymentError);
      }

      // Update job status
      if (jobId) {
        const { error: jobError } = await supabaseAdmin
          .from("jobs")
          .update({
            payment_status: "paid",
            client_approved_at: new Date().toISOString(),
            status: "in-progress",
          })
          .eq("id", jobId);

        if (jobError) {
          console.error("Error updating job:", jobError);
        }

        // Get job details for response
        const { data: job } = await supabaseAdmin
          .from("jobs")
          .select("job_number, client_name, user_id")
          .eq("id", jobId)
          .single();

        // Send notification to business owner
        if (job?.user_id) {
          // Get business email
          const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("business_email, business_name")
            .eq("user_id", job.user_id)
            .single();

          if (profile?.business_email) {
            // Invoke notification function (if exists)
            try {
              await supabaseAdmin.functions.invoke("notify-payment-received", {
                body: {
                  to: profile.business_email,
                  businessName: profile.business_name,
                  jobNumber: job.job_number,
                  clientName: job.client_name,
                  amount: session.amount_total,
                },
              });
            } catch (notifyError) {
              console.log("Notification function not available:", notifyError);
            }
          }
        }

        return new Response(
          JSON.stringify({
            success: true,
            amount: session.amount_total,
            jobNumber: job?.job_number || "",
            clientName: job?.client_name || "",
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          }
        );
      }
    }

    return new Response(
      JSON.stringify({
        success: session.payment_status === "paid",
        amount: session.amount_total,
        status: session.payment_status,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error verifying payment:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage, success: false }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
