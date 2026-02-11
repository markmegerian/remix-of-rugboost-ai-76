/**
 * Shared CORS utilities for Supabase Edge Functions.
 * 
 * Provides dynamic origin validation to replace wildcard CORS in production.
 * Falls back to permissive CORS for development environments.
 */

/**
 * Default allowed origins for the RugBoost application.
 * These can be overridden via ALLOWED_ORIGINS environment variable.
 */
const DEFAULT_ALLOWED_ORIGINS = [
  'https://rug-scan-report.lovable.app',
  'https://e6a08bc6-4eed-4ab4-a5fd-174c21644eea.lovableproject.com',
  'https://id-preview--e6a08bc6-4eed-4ab4-a5fd-174c21644eea.lovable.app',
];

/**
 * Development origins that are allowed during local development.
 */
const DEV_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:8100',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:8100',
];

/**
 * Parse the ALLOWED_ORIGINS environment variable.
 * Format: comma-separated list of origins.
 */
function parseAllowedOrigins(): string[] {
  const envOrigins = Deno.env.get('ALLOWED_ORIGINS');
  if (!envOrigins) {
    return [...DEFAULT_ALLOWED_ORIGINS, ...DEV_ORIGINS];
  }
  
  const parsed = envOrigins
    .split(',')
    .map(o => o.trim())
    .filter(o => o.length > 0);
  
  // Always include dev origins for local development
  return [...parsed, ...DEV_ORIGINS];
}

/**
 * Check if the origin is allowed.
 */
function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false;
  
  const allowedOrigins = parseAllowedOrigins();
  
  // Direct match
  if (allowedOrigins.includes(origin)) return true;
  
  // Check for Capacitor/native app (no origin or capacitor origin)
  if (origin === 'capacitor://localhost' || origin === 'ionic://localhost') {
    return true;
  }
  
  // Check for lovable preview/project domains (strict regex matching)
  if (/^https:\/\/[a-z0-9-]+\.lovableproject\.com$/.test(origin) ||
      /^https:\/\/[a-z0-9-]+\.lovable\.app$/.test(origin)) {
    return true;
  }
  
  return false;
}

/**
 * Get CORS headers for a request.
 * Returns dynamic Access-Control-Allow-Origin based on the request origin.
 * 
 * @param req - The incoming request (optional, for origin checking)
 * @returns CORS headers object
 */
export function getCorsHeaders(req?: Request): Record<string, string> {
  const origin = req?.headers.get('Origin');
  
  // Standard CORS headers
  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  };
  
  // Set origin if allowed
  if (origin && isOriginAllowed(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }
  // If no origin header (native app, server-to-server) or origin not allowed:
  // Do NOT set Access-Control-Allow-Origin — let the browser enforce same-origin
  
  return headers;
}

/**
 * Handle CORS preflight OPTIONS request.
 * Returns a Response with proper CORS headers.
 * 
 * @param req - The incoming OPTIONS request
 * @returns Response for preflight request
 */
export function handleCorsPrelight(req: Request): Response {
  const corsHeaders = getCorsHeaders(req);
  
  // Check if origin is allowed
  if (!corsHeaders['Access-Control-Allow-Origin']) {
    return new Response('Forbidden', { status: 403 });
  }
  
  return new Response('ok', { headers: corsHeaders });
}

/**
 * Create a JSON response with CORS headers.
 * 
 * @param data - Response body data
 * @param status - HTTP status code
 * @param req - Original request for origin checking
 */
export function corsJsonResponse(
  data: unknown,
  status: number = 200,
  req?: Request
): Response {
  const corsHeaders = getCorsHeaders(req);
  
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}
