import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders, handleCorsPrelight } from '../_shared/cors.ts';

// Allowed redirect domains for Stripe checkout
const ALLOWED_REDIRECT_DOMAINS = [
  'localhost',
  'rugboost.com',
  'www.rugboost.com',
  'rug-scan-report.lovable.app',
];

const ALLOWED_REDIRECT_PATTERNS = [
  /^[a-z0-9-]+\.lovableproject\.com$/,
  /^[a-z0-9-]+\.lovable\.app$/,
];

function isAllowedRedirectUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (ALLOWED_REDIRECT_DOMAINS.includes(parsed.hostname)) return true;
    return ALLOWED_REDIRECT_PATTERNS.some(pattern => pattern.test(parsed.hostname));
  } catch {
    return false;
  }
}

interface CheckoutRequest {
  jobId: string;
  clientJobAccessId: string;
  selectedServices: {
    rugNumber: string;
    services: {
      id: string;
      name: string;
      quantity: number;
      unitPrice: number;
    }[];
  }[];
  totalAmount: number;
  customerEmail?: string;
  successUrl: string;
  cancelUrl: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return handleCorsPrelight(req);
  }

  const corsHeaders = getCorsHeaders(req);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

    // Get authenticated user - REQUIRED for authorization
    const authHeader = req.headers.get("Authorization");
    let userEmail: string | undefined;
    let userId: string | undefined;

    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabaseClient.auth.getUser(token);
      if (user) {
        userEmail = user.email;
        userId = user.id;
      }
    }

    // Require authentication
    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Database-backed rate limiting
    const supabaseAdmin = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: allowed } = await supabaseAdmin.rpc('check_rate_limit', {
      p_identifier: userId,
      p_action: 'create_checkout',
      p_max_requests: 5,
      p_window_minutes: 1,
    });

    if (!allowed) {
      return new Response(
        JSON.stringify({ error: "Too many checkout attempts. Please try again later." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: CheckoutRequest = await req.json();
    const { jobId, clientJobAccessId, selectedServices, totalAmount, customerEmail, successUrl, cancelUrl } = body;

    // Validate redirect URLs
    if (!isAllowedRedirectUrl(successUrl) || !isAllowedRedirectUrl(cancelUrl)) {
      return new Response(
        JSON.stringify({ error: "Invalid redirect URL" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate request ID for logging
    const requestId = crypto.randomUUID().slice(0, 8);
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                     req.headers.get('x-real-ip') || 
                     'unknown';
    
    console.log(`[${requestId}] Checkout request from IP: ${clientIp.substring(0, 10)}*** User: ${userId.substring(0, 8)}***`);
    console.log(`[${requestId}] Job: ${jobId?.substring(0, 8)}*** Amount: $${totalAmount} Services: ${selectedServices?.length || 0} rugs`);

    // Validate required fields
    if (!jobId || !clientJobAccessId || !selectedServices || selectedServices.length === 0 || !totalAmount) {
      console.warn(`[${requestId}] Missing required fields`);
      throw new Error("Missing required fields: jobId, clientJobAccessId, selectedServices, totalAmount");
    }

    // SECURITY: Verify the authenticated user has access to this job
    const { data: clientAccount, error: clientError } = await supabaseAdmin
      .from('client_accounts')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (clientError || !clientAccount) {
      console.error("Client account not found for user:", userId, "Error:", clientError);
      return new Response(
        JSON.stringify({ error: "Client account not found" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the client has access to this specific job via client_job_access
    const { data: accessRecord, error: accessError } = await supabaseAdmin
      .from('client_job_access')
      .select('id, job_id')
      .eq('id', clientJobAccessId)
      .eq('job_id', jobId)
      .eq('client_id', clientAccount.id)
      .single();

    if (accessError || !accessRecord) {
      console.error("Unauthorized job access attempt:", { userId, jobId, clientJobAccessId });
      return new Response(
        JSON.stringify({ error: "Unauthorized access to job" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const email = userEmail || customerEmail;
    if (!email) {
      throw new Error("Customer email is required");
    }

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Check if customer exists
    const customers = await stripe.customers.list({ email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    // Build line items from selected services
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
    
    for (const rug of selectedServices) {
      for (const service of rug.services) {
        lineItems.push({
          price_data: {
            currency: "usd",
            product_data: {
              name: `${service.name}`,
              description: `${rug.rugNumber} - ${service.name}`,
            },
            unit_amount: Math.round(service.unitPrice * 100),
          },
          quantity: service.quantity,
        });
      }
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : email,
      line_items: lineItems,
      mode: "payment",
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        jobId,
        clientJobAccessId,
        userId: userId || "",
      },
      payment_intent_data: {
        metadata: {
          jobId,
          clientJobAccessId,
        },
      },
    });

    const clientId = clientAccount?.id || null;

    // Check for existing pending payment for this job and delete it
    await supabaseAdmin
      .from("payments")
      .delete()
      .eq("job_id", jobId)
      .eq("status", "pending");

    // Store new pending payment
    await supabaseAdmin.from("payments").insert({
      job_id: jobId,
      client_id: clientId,
      stripe_checkout_session_id: session.id,
      amount: totalAmount,
      status: "pending",
      metadata: {
        selectedServices,
        clientJobAccessId,
      },
    });

    console.log("Checkout session created:", session.id);

    return new Response(
      JSON.stringify({ 
        checkoutUrl: session.url,
        sessionId: session.id,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error creating checkout session:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
