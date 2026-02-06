// Token security utilities for access token hashing

/**
 * Generate SHA-256 hash of a token (browser-compatible)
 * This hash is stored in the database; the original token is only in URLs
 */
export async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate a secure random token
 */
export function generateSecureToken(): string {
  return crypto.randomUUID();
}
