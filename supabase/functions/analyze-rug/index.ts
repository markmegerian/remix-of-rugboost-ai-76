import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { getCorsHeaders, handleCorsPrelight } from '../_shared/cors.ts';

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

// Sanitize string input - remove potential injection characters
function sanitizeString(input: string): string {
  return input
    .replace(/[<>{}[\]\\]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/data:/gi, '')
    .replace(/on\w+=/gi, '')
    .trim();
}

// Validate photo input - can be a URL or a storage path
function isValidPhotoInput(input: string): boolean {
  if (!input.includes('://')) {
    return input.length > 0 && input.length < 500 && !input.includes('..') && !input.startsWith('/');
  }
  
  try {
    const parsed = new URL(input);
    const allowedHosts = [
      'tviommdnpvfceuprrwzf.supabase.co',
      'supabase.co',
      'supabase.in'
    ];
    return allowedHosts.some(host => parsed.hostname.endsWith(host));
  } catch {
    return false;
  }
}

// Generate signed URL for a storage path
async function getSignedUrlForPath(supabase: any, path: string): Promise<string | null> {
  try {
    const { data, error } = await supabase.storage
      .from('rug-photos')
      .createSignedUrl(path, 3600);
    
    if (error) {
      console.error('Error creating signed URL for path:', path, error);
      return null;
    }
    return data.signedUrl;
  } catch (err) {
    console.error('Exception creating signed URL:', err);
    return null;
  }
}

// Supported AI models for rug analysis
const SUPPORTED_MODELS = ["google/gemini-2.5-flash", "google/gemini-2.5-pro"] as const;
type SupportedModel = typeof SUPPORTED_MODELS[number];

// Input validation schema with stricter constraints
// Now accepts both storage paths and full URLs
const RequestSchema = z.object({
  photos: z.array(z.string().min(1).max(500).refine(isValidPhotoInput, { message: "Invalid photo path or URL" })).min(1).max(20),
  rugInfo: z.object({
    clientName: z.string().min(1).max(200).transform(sanitizeString),
    rugNumber: z.string().min(1).max(100).transform(sanitizeString),
    rugType: z.string().min(1).max(100).transform(sanitizeString),
    length: z.union([z.string().max(20), z.number().min(0).max(1000)]).optional(),
    width: z.union([z.string().max(20), z.number().min(0).max(1000)]).optional(),
    notes: z.string().max(5000).optional().nullable().transform(val => val ? sanitizeString(val) : val)
  }),
  userId: z.string().uuid().optional(),
  // Default to the faster, cheaper Flash model unless explicitly overridden
  model: z.enum(SUPPORTED_MODELS).optional().default("google/gemini-2.5-flash")
});

// Dynamic system prompt that includes business name.
// This is a tightened version of the original: same JSON schema + key rules, less fluff.
const getSystemPrompt = (businessName: string, businessPhone: string, businessAddress: string) => `
You are an expert rug restoration specialist at ${businessName}. You analyze rug photos and produce:
1) A professional estimate letter (plain text, no markdown).
2) A structured JSON object describing the rug, damages, recommended services, totals, review flags, and edge suggestions.
3) Image annotations pointing to issues on the rug itself.

### CORE RULES

- Always return valid JSON exactly matching the schema below.
- Never return "TBD", "pending", "to be determined", or similar; always give your best numeric estimates.
- Do NOT use markdown (#, ##, **, -, etc.). Plain text only in the letter.
- The letter should be professional, client-facing, with paragraphs and readable line breaks.
- Use the client name from the details and address the letter to them.

### PHOTO SEQUENCE (for reasoning and references)

Photos are typically captured in this order:
- Photo 1: Overall front (entire rug surface from above).
- Photo 2: Overall back (construction, hidden damage).
- Photo 3: Fringe end A (one end).
- Photo 4: Fringe end B (opposite end).
- Photo 5: Edge/binding side A.
- Photo 6: Edge/binding side B.
- Photos 7+: Client-identified problem areas (stains, damage, wear).

Use this when referring to photos in the letter and when deciding which edges need work.

### RUG IDENTIFICATION (HIGH LEVEL)

From front/back and details, infer:

- Origin: Persian, Turkish, Afghan, Indian, Pakistani, Chinese, Tibetan, Moroccan, Caucasian, Central Asian, European (Aubusson, Savonnerie), Native American (Navajo), etc.
- Construction: hand-knotted, hand-tufted, flatweave (Kilim/Dhurrie/Soumak), machine-made.
- Fiber: wool, silk, cotton, synthetic (polyester/nylon/polypropylene), blends.
- Age indicators: patina, wear patterns, dye characteristics, visible repairs.
- Design family: medallion, all-over, pictorial, geometric, curvilinear, tribal.

### DAMAGE CATEGORIES

Look carefully for:

- Stains: pet (urine/vomit), food/drink (coffee, wine, grease), water, mold/mildew, ink, dye transfer, rust.
- Structural: foundation damage, holes/tears, moth damage, dry rot, delamination.
- Fringe: loss/missing fringe, frayed/unraveling fringe, discolored fringe, fringe pulling into rug body.
- Edges: worn/frayed edges, missing selvedge/overcasting, loose or separating binding, curling edges.
- Surface: pile wear/traffic patterns, crushing/matting, color fading (sun), color run/bleeding, sprouting tufts.
- Previous repairs: patches, reweaving, overcasting, fringe replacements, and their quality.

### IMAGE ANNOTATIONS (CRITICAL)

- Annotate ONLY issues on the rug (never floor/wall/background).
- If the rug occupies part of the photo, x/y coordinates must be within the rug area.
- Use \`photoIndex\` as 0-based (0 for first photo).
- For each issue on the rug, create an annotation:

  - \`label\`: short text like "Fringe damage", "Stain", "Edge wear", "Moth damage".
  - \`location\`: description relative to the rug ("top-left of rug", "center", "along right edge", etc.).
  - \`x\`: percentage from left (0–100), within the rug area.
  - \`y\`: percentage from top (0–100), within the rug area.

If a photo has no specific issues to mark, it can have an empty annotations array.

### EDGE SUGGESTIONS

For linear services (fringe, binding, overcasting, etc.), identify which edges need work:

- Use only these edge IDs:
  - "end1" (top/fringe end A)
  - "end2" (bottom/fringe end B)
  - "side1" (left edge)
  - "side2" (right edge)
- \`serviceType\`: lowercase keyword like "fringe", "binding", "overcasting", "zenjireh", "leather", "cotton", "glue".
- \`rationale\`: short explanation of observed damage on those edges.
- Only include edges that genuinely need work. If all edges need work, list all four.

Photos 3–4 correspond to fringe ends (ends). Photos 5–6 correspond to edges (sides).

### STRUCTURED JSON SCHEMA (YOU MUST FOLLOW THIS)

You must return a JSON object of this form:

{
  "letter": "Full client-facing estimate letter as a single string (plain text).",
  "structuredFindings": {
    "rugProfile": {
      "origin": "e.g. Persian",
      "construction": "e.g. hand-knotted",
      "fiber": "e.g. wool",
      "confidence": 0.84
    },
    "damages": [
      {
        "id": "dmg_1",
        "category": "stain | structural | fringe | edge | pile | color | moisture | odor | previous_repair | other",
        "severity": "minor | moderate | severe | critical",
        "location": "short location description",
        "description": "short explanation of the issue",
        "photoIndices": [0, 6],
        "confidence": 0.86
      }
    ],
    "recommendedServices": [
      {
        "serviceType": "cleaning | overcasting | fringe | binding | repair | stain_removal | padding | etc.",
        "reason": "why this service is needed",
        "pricingModel": "sqft | linear_ft | fixed",
        "quantity": 63.0,
        "unit": "sqft | linear_ft | unit",
        "unitPrice": 4.5,
        "estimatedCost": 283.5,
        "relatedDamageIds": ["dmg_1"],
        "confidence": 0.82
      }
    ],
    "totals": {
      "subtotal": 283.5,
      "estimatedRangeLow": 260,
      "estimatedRangeHigh": 340,
      "currency": "USD"
    },
    "reviewFlags": ["low_photo_clarity", "fiber_uncertain", "manual_measurement_needed"],
    "summary": "Short summary of rug type, condition, and major issues."
  },
  "imageAnnotations": [
    {
      "photoIndex": 0,
      "annotations": [
        {
          "label": "Pet stain - requires deep cleaning",
          "location": "center of rug",
          "x": 50,
          "y": 50
        }
      ]
    }
  ],
  "edgeSuggestions": [
    {
      "serviceType": "fringe",
      "edges": ["end1", "end2"],
      "rationale": "Both fringe ends show significant loss and discoloration."
    }
  ]
}

REQUIREMENTS:

- ALWAYS include a \`structuredFindings\` object; do not omit it.
- All \`confidence\` values must be between 0 and 1.
- \`damages[].severity\` must be one of: minor, moderate, severe, critical.
- \`recommendedServices[].pricingModel\` must be one of: sqft, linear_ft, fixed.
- \`recommendedServices[].estimatedCost\` must be a number (no null/TBD).
- \`totals.subtotal\`, \`totals.estimatedRangeLow\`, and \`totals.estimatedRangeHigh\` must be numeric.
- Keep \`relatedDamageIds\` consistent with \`damages[].id\` values.

### SERVICES AND COSTS

- Use available per-sqft and per-linear-ft pricing from the prompt context when given.
- For square-foot services: multiply price per sqft by total square footage.
- For linear-foot services: calculate based on the edges that need work and their total linear length.
- If a needed service has no explicit price provided, use a reasonable industry-standard estimate but always output real numbers.

### ESTIMATE LETTER FORMAT (letter field)

The letter should:

1) Start with a greeting to the client, e.g. "Dear [Client Name]," and a sentence explaining you are providing a comprehensive estimate for their rug.
2) Clearly describe the rug (origin, construction, fiber, approximate age, overall condition).
3) Explain each recommended service:
   - What it does.
   - Why it is needed for THIS rug (reference photo numbers and locations).
   - How it benefits the rug (longevity, appearance, structural stability).
4) Present a clear itemized breakdown for the rug:
   - Rug # [number]: [Type] ([dimensions])
   - Each service with its calculated cost:
     - For sqft services: "[Service] ([sqft] sq ft × $[rate]/sq ft): $[amount]"
     - For linear ft: "[Service] ([linear ft] ft on [edges]): $[amount]"
   - Subtotal.
5) State the total estimate clearly with an actual dollar amount.
6) Explain next steps and invite the client to discuss priorities or budget.
   - Include contact details: ${businessPhone ? "Please contact us at " + businessPhone : "Please contact us"}${businessAddress ? " or visit us at " + businessAddress : ""}.
7) Close warmly, sign off with "${businessName}" or "The Team at ${businessName}".
`;

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return handleCorsPrelight(req);
  }

  const corsHeaders = getCorsHeaders(req);

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - missing or invalid authorization header' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      console.error("Auth error:", claimsError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized - invalid token' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authenticatedUserId = claimsData.claims.sub as string;

    // Database-backed rate limiting
    const supabaseServiceKeyForRL = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdminRL = createClient(supabaseUrl, supabaseServiceKeyForRL);
    const { data: rlAllowed } = await supabaseAdminRL.rpc('check_rate_limit', {
      p_identifier: authenticatedUserId,
      p_action: 'analyze_rug',
      p_max_requests: 10,
      p_window_minutes: 1,
    });

    if (!rlAllowed) {
      console.warn("Rate limit exceeded for user:", authenticatedUserId);
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse and validate request body
    let body;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const validationResult = RequestSchema.safeParse(body);
    if (!validationResult.success) {
      console.error("Validation error:", validationResult.error.issues);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid request data', 
          details: validationResult.error.issues.map(i => ({ path: i.path.join('.'), message: i.message }))
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { photos, rugInfo, userId, model } = validationResult.data;

    // Ensure the userId matches the authenticated user (if provided)
    const effectiveUserId = userId || authenticatedUserId;
    if (userId && userId !== authenticatedUserId) {
      console.warn("UserId mismatch - using authenticated user:", authenticatedUserId);
    }

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }



    // Fetch user's service prices and business info using service role key
    let servicePricesText = "";
    let businessName = "Rug Restoration Services";
    let businessPhone = "";
    let businessAddress = "";
    
    // AI Learning: feedback context to improve future analyses
    let feedbackContext = "";
    let globalCorrectionsContext = "";
    
    try {
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      // Fetch service prices
      const { data: prices, error } = await supabase
        .from("service_prices")
        .select("service_name, unit_price")
        .eq("user_id", effectiveUserId);

      if (!error && prices && prices.length > 0) {
        servicePricesText = "\n\nSERVICE PRICING (per square foot):\n";
        prices.forEach((price: { service_name: string; unit_price: number }) => {
          if (price.unit_price > 0) {
            servicePricesText += `${price.service_name}: $${price.unit_price.toFixed(2)}/sq ft\n`;
          }
        });
        servicePricesText += "\nUse these prices when calculating cost estimates. If a service is not listed or has a $0 price, use industry standard estimates.";
      }

      // Fetch business info from profiles
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("business_name, business_phone, business_address")
        .eq("user_id", effectiveUserId)
        .single();

      if (!profileError && profile) {
        businessName = profile.business_name || businessName;
        businessPhone = profile.business_phone || "";
        businessAddress = profile.business_address || "";
      }

      // Fetch recent AI feedback corrections for this user (AI Learning System)
      const { data: recentFeedback, error: feedbackError } = await supabase
        .from("ai_analysis_feedback")
        .select("*")
        .eq("user_id", effectiveUserId)
        .order("created_at", { ascending: false })
        .limit(10);

      if (!feedbackError && recentFeedback && recentFeedback.length > 0) {
        feedbackContext = "\n\nLEARNED CORRECTIONS (apply these patterns to improve accuracy):\n";
        for (const fb of recentFeedback) {
          if (fb.feedback_type === "price_correction" && fb.original_service_name && fb.corrected_price) {
            feedbackContext += `- ${fb.original_service_name}: was $${fb.original_price}, should be $${fb.corrected_price}`;
            if (fb.rug_type) feedbackContext += ` (for ${fb.rug_type} rugs)`;
            feedbackContext += "\n";
          } else if (fb.feedback_type === "service_correction" && fb.original_service_name && fb.corrected_service_name) {
            feedbackContext += `- Service "${fb.original_service_name}" should be called "${fb.corrected_service_name}"\n`;
          } else if (fb.feedback_type === "identification_error" && fb.original_rug_identification && fb.corrected_identification) {
            feedbackContext += `- Rug identification: Was "${fb.original_rug_identification}", actually "${fb.corrected_identification}"\n`;
          } else if (fb.feedback_type === "missed_issue" && fb.notes) {
            feedbackContext += `- Previously missed issue: ${fb.notes}\n`;
          } else if (fb.feedback_type === "false_positive" && fb.original_service_name) {
            feedbackContext += `- "${fb.original_service_name}" was incorrectly recommended - be more careful with this\n`;
          }
        }
      }

      // Fetch global AI corrections (apply to ALL analyses, curated by admins)
      const { data: globalCorrections, error: globalError } = await supabase
        .from("ai_global_corrections")
        .select("correction_type, original_value, corrected_value, context, rug_category")
        .eq("is_active", true)
        .order("priority", { ascending: false })
        .limit(25);

      if (!globalError && globalCorrections && globalCorrections.length > 0) {
        globalCorrectionsContext = "\n\nGLOBAL QUALITY STANDARDS (apply to all analyses):\n";
        for (const gc of globalCorrections) {
          if (gc.correction_type === "price_correction" && gc.original_value && gc.corrected_value) {
            globalCorrectionsContext += `- Price: "${gc.original_value}" should be "${gc.corrected_value}"`;
          } else if (gc.correction_type === "service_correction" && gc.original_value && gc.corrected_value) {
            globalCorrectionsContext += `- Service: "${gc.original_value}" should be "${gc.corrected_value}"`;
          } else if (gc.correction_type === "identification_error" && gc.original_value && gc.corrected_value) {
            globalCorrectionsContext += `- Identification: "${gc.original_value}" is actually "${gc.corrected_value}"`;
          } else if (gc.correction_type === "missed_issue" && gc.corrected_value) {
            globalCorrectionsContext += `- Always check for: ${gc.corrected_value}`;
          } else if (gc.correction_type === "false_positive" && gc.original_value) {
            globalCorrectionsContext += `- Avoid incorrectly recommending: "${gc.original_value}"`;
          } else {
            continue;
          }
          if (gc.rug_category) globalCorrectionsContext += ` (for ${gc.rug_category} rugs)`;
          if (gc.context) globalCorrectionsContext += ` — ${gc.context}`;
          globalCorrectionsContext += "\n";
        }
      }
    } catch (priceError) {
      console.error("Error fetching user data:", priceError);
    }

    // Calculate square footage
    const length = typeof rugInfo.length === 'string' ? parseFloat(rugInfo.length) || 0 : rugInfo.length || 0;
    const width = typeof rugInfo.width === 'string' ? parseFloat(rugInfo.width) || 0 : rugInfo.width || 0;
    const squareFootage = length * width;

    // Convert storage paths to signed URLs if needed
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseForStorage = createClient(supabaseUrl, supabaseServiceKey);
    
    const resolvedPhotoUrls: string[] = [];
    for (const photo of photos) {
      if (!photo.includes('://')) {
        // It's a storage path - generate signed URL
        const signedUrl = await getSignedUrlForPath(supabaseForStorage, photo);
        if (signedUrl) {
          resolvedPhotoUrls.push(signedUrl);
        } else {
          console.warn('Failed to generate signed URL for path:', photo);
        }
      } else {
        // It's already a URL
        resolvedPhotoUrls.push(photo);
      }
    }
    
    if (resolvedPhotoUrls.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Failed to resolve photo URLs. Please try again.' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    console.log(`Resolved ${resolvedPhotoUrls.length} photo URLs from ${photos.length} inputs`);

    // Build the image content array for Gemini vision
    // Use "high" detail for Pro model, "low" for Flash to optimize speed/cost
    const imageDetail = model === "google/gemini-2.5-flash" ? "low" : "high";
    const imageContent = resolvedPhotoUrls.map((photoUrl: string) => ({
      type: "image_url",
      image_url: {
        url: photoUrl,
        detail: imageDetail,
      },
    }));

    // Sanitize notes to prevent prompt injection
    const sanitizedNotes = rugInfo.notes 
      ? rugInfo.notes.replace(/[<>{}]/g, '').substring(0, 2000)
      : "None provided";

    // Build the user message with rug details and images
    const userMessage = `RUG DETAILS:
Client Name: ${rugInfo.clientName.substring(0, 200)}
Rug Number: ${rugInfo.rugNumber.substring(0, 100)}
Rug Type: ${rugInfo.rugType.substring(0, 100)}
Dimensions: ${length || "Unknown"}' x ${width || "Unknown"}' (${squareFootage > 0 ? squareFootage + " square feet" : "Unknown"})

Inspector Notes: ${sanitizedNotes}
${servicePricesText}

Please examine the attached ${resolvedPhotoUrls.length} photograph(s) and write a professional estimate letter following the format specified. Address it to the client by name. Calculate all costs based on the rug's square footage (${squareFootage} sq ft) and perimeter for linear services.`;

    // Use Lovable AI Gateway with selected model
    // Reduce max_tokens for Flash model since it's more concise
    const maxTokens = model === "google/gemini-2.5-flash" ? 5000 : 8000;
    const startTime = Date.now();
    
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: model,
        max_tokens: maxTokens,
        messages: [
          {
            role: "system",
            content: getSystemPrompt(businessName, businessPhone, businessAddress) + globalCorrectionsContext + feedbackContext,
          },
          {
            role: "user",
            content: [
              { type: "text", text: userMessage },
              ...imageContent,
            ],
          },
        ],
      }),
    });
    
    const processingTimeMs = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Lovable AI Gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        throw new Error("Rate limit exceeded. Please try again in a moment.");
      }
      if (response.status === 402) {
        throw new Error("AI usage limit reached. Please add credits to your workspace.");
      }
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    // Parse response with better error handling for truncated/empty responses
    let data;
    try {
      const responseText = await response.text();
      if (!responseText || responseText.trim() === '') {
        console.error("Empty response from AI Gateway");
        throw new Error("Empty response from AI - please try again");
      }
      data = JSON.parse(responseText);
    } catch (jsonError) {
      console.error("Failed to parse AI Gateway response:", jsonError);
      throw new Error("Invalid response from AI - please try again");
    }

    // Extract the text content from the response
    const rawContent = data.choices?.[0]?.message?.content;

    if (!rawContent) {
      console.error("Unexpected response structure:", JSON.stringify(data, null, 2));
      throw new Error("No analysis content in response");
    }

    // Try to parse as JSON (new structured format)
    let analysisReport: string;
    let structuredFindings: any = null;
    let imageAnnotations: any[] = [];
    let edgeSuggestions: any[] = [];

    try {
      // Clean up any markdown code blocks that might wrap the JSON
      const cleanedContent = rawContent
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();
      
      const parsed = JSON.parse(cleanedContent);
      analysisReport = parsed.letter || rawContent;
      structuredFindings = parsed.structuredFindings || null;
      imageAnnotations = parsed.imageAnnotations || [];
      edgeSuggestions = parsed.edgeSuggestions || [];
    } catch (parseError) {
      // Check if response was truncated (ends with incomplete JSON)
      const isTruncated = rawContent.includes('"letter"') && 
        (!rawContent.includes('"imageAnnotations"') || !rawContent.trim().endsWith('}'));
      
      if (isTruncated) {
        // Try to extract the letter content from truncated JSON
        const letterMatch = rawContent.match(/"letter"\s*:\s*"([\s\S]*?)(?:"\s*,\s*"imageAnnotations"|"\s*}|$)/);
        if (letterMatch && letterMatch[1]) {
          // Unescape JSON string
          analysisReport = letterMatch[1]
            .replace(/\\n/g, '\n')
            .replace(/\\"/g, '"')
            .replace(/\\\\/g, '\\');
        } else {
          // Clean up any JSON formatting from raw content
          analysisReport = rawContent
            .replace(/^[\s\S]*?"letter"\s*:\s*"/i, '')
            .replace(/"\s*,?\s*"imageAnnotations"[\s\S]*$/i, '')
            .replace(/\\n/g, '\n')
            .replace(/\\"/g, '"')
            .replace(/\\\\/g, '\\');
        }
      } else {
        // If not truncated JSON, use the raw content as the report
        analysisReport = rawContent;
      }
    }

    return new Response(JSON.stringify({ 
      report: analysisReport,
      structuredFindings: structuredFindings,
      imageAnnotations: imageAnnotations,
      edgeSuggestions: edgeSuggestions,
      modelUsed: model,
      processingTimeMs: processingTimeMs
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in analyze-rug function:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});