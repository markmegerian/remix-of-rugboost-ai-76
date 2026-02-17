import { getCorsHeaders, handleCorsPrelight, corsJsonResponse } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handleCorsPrelight(req);
  }

  const corsHeaders = getCorsHeaders(req);

  try {
    const body = await req.json();

    // TODO: Add your enrichment logic here

    return corsJsonResponse({ success: true, data: body }, 200, req);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('enrich-letter error:', message);
    return corsJsonResponse({ error: message }, 500, req);
  }
});
