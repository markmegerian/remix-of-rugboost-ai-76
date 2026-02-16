import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY") || "";
  const stripeWebhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") || "";
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

  if (!stripeSecretKey || !stripeWebhookSecret || !supabaseUrl || !supabaseServiceRoleKey) {
    return new Response("Webhook not configured", { status: 500 });
  }

  const stripe = new Stripe(stripeSecretKey, { apiVersion: "2025-08-27.basil" });
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new Response("Missing stripe-signature", { status: 400 });
  }

  let event: Stripe.Event;
  const body = await req.text();

  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, stripeWebhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return new Response("Invalid signature", { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const sessionId = session.id;

        const { data: payment } = await supabaseAdmin
          .from("payments")
          .select("id, job_id, status")
          .eq("stripe_checkout_session_id", sessionId)
          .maybeSingle();

        if (!payment) {
          console.warn("No payment record found for session:", sessionId);
          break;
        }

        if (payment.status === "completed") {
          break; // idempotent
        }

        const paymentIntentId = typeof session.payment_intent === "string"
          ? session.payment_intent
          : (session.payment_intent as any)?.id;

        await supabaseAdmin
          .from("payments")
          .update({
            status: "completed",
            paid_at: new Date().toISOString(),
            stripe_payment_intent_id: paymentIntentId || null,
          })
          .eq("id", payment.id);

        await supabaseAdmin
          .from("jobs")
          .update({
            payment_status: "paid",
            client_approved_at: new Date().toISOString(),
            status: "in-progress",
          })
          .eq("id", payment.job_id);

        break;
      }

      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;

        await supabaseAdmin
          .from("payments")
          .update({ status: "failed" })
          .eq("stripe_checkout_session_id", session.id)
          .eq("status", "pending");

        break;
      }

      case "payment_intent.payment_failed": {
        const intent = event.data.object as Stripe.PaymentIntent;

        await supabaseAdmin
          .from("payments")
          .update({ status: "failed" })
          .eq("stripe_payment_intent_id", intent.id)
          .eq("status", "pending");

        break;
      }

      default:
        // ignore other events
        break;
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Webhook processing error:", err);
    return new Response("Webhook handler error", { status: 500 });
  }
});
