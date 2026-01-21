/**
 * Client-side brute-force protection with exponential backoff
 * Tracks failed login attempts and enforces increasing delays
 */

interface LoginAttempt {
  failedAttempts: number;
  lastAttemptAt: number;
  lockedUntil: number | null;
}

const STORAGE_KEY = 'auth_attempts';
const MAX_ATTEMPTS_BEFORE_DELAY = 3;
const BASE_DELAY_SECONDS = 5;
const MAX_DELAY_SECONDS = 300; // 5 minutes max

// Get attempts from localStorage
function getAttempts(email: string): LoginAttempt {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return { failedAttempts: 0, lastAttemptAt: 0, lockedUntil: null };
    
    const allAttempts = JSON.parse(stored) as Record<string, LoginAttempt>;
    const attempt = allAttempts[email.toLowerCase()];
    
    if (!attempt) return { failedAttempts: 0, lastAttemptAt: 0, lockedUntil: null };
    
    // Clean up old attempts (reset after 1 hour of inactivity)
    if (Date.now() - attempt.lastAttemptAt > 60 * 60 * 1000) {
      return { failedAttempts: 0, lastAttemptAt: 0, lockedUntil: null };
    }
    
    return attempt;
  } catch {
    return { failedAttempts: 0, lastAttemptAt: 0, lockedUntil: null };
  }
}

// Save attempts to localStorage
function saveAttempts(email: string, attempt: LoginAttempt): void {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const allAttempts = stored ? JSON.parse(stored) : {};
    allAttempts[email.toLowerCase()] = attempt;
    
    // Clean up old entries (keep last 20)
    const entries = Object.entries(allAttempts);
    if (entries.length > 20) {
      const sorted = entries.sort((a, b) => 
        (b[1] as LoginAttempt).lastAttemptAt - (a[1] as LoginAttempt).lastAttemptAt
      );
      const cleaned = Object.fromEntries(sorted.slice(0, 20));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(allAttempts));
    }
  } catch {
    // Ignore storage errors
  }
}

/**
 * Calculate delay based on failed attempts using exponential backoff
 */
function calculateDelay(failedAttempts: number): number {
  if (failedAttempts < MAX_ATTEMPTS_BEFORE_DELAY) return 0;
  
  const exponent = failedAttempts - MAX_ATTEMPTS_BEFORE_DELAY;
  const delay = Math.min(BASE_DELAY_SECONDS * Math.pow(2, exponent), MAX_DELAY_SECONDS);
  return delay;
}

/**
 * Check if a login attempt is allowed for the given email
 * Returns remaining lockout time in seconds, or 0 if allowed
 */
export function checkLoginAllowed(email: string): { 
  allowed: boolean; 
  remainingSeconds: number;
  failedAttempts: number;
} {
  const attempt = getAttempts(email);
  const now = Date.now();
  
  // Check if currently locked
  if (attempt.lockedUntil && now < attempt.lockedUntil) {
    const remainingSeconds = Math.ceil((attempt.lockedUntil - now) / 1000);
    return { 
      allowed: false, 
      remainingSeconds, 
      failedAttempts: attempt.failedAttempts 
    };
  }
  
  return { 
    allowed: true, 
    remainingSeconds: 0, 
    failedAttempts: attempt.failedAttempts 
  };
}

/**
 * Record a failed login attempt and apply exponential backoff
 */
export function recordFailedAttempt(email: string): { 
  lockoutSeconds: number; 
  failedAttempts: number;
} {
  const attempt = getAttempts(email);
  const now = Date.now();
  
  const newFailedAttempts = attempt.failedAttempts + 1;
  const delaySeconds = calculateDelay(newFailedAttempts);
  const lockedUntil = delaySeconds > 0 ? now + (delaySeconds * 1000) : null;
  
  const newAttempt: LoginAttempt = {
    failedAttempts: newFailedAttempts,
    lastAttemptAt: now,
    lockedUntil,
  };
  
  saveAttempts(email, newAttempt);
  
  // Log suspicious activity after multiple failures
  if (newFailedAttempts >= 5) {
    console.warn(`[Security] Multiple failed login attempts for: ${email.substring(0, 3)}***@*** (${newFailedAttempts} attempts)`);
  }
  
  return { 
    lockoutSeconds: delaySeconds, 
    failedAttempts: newFailedAttempts 
  };
}

/**
 * Clear login attempts after successful login
 */
export function clearAttempts(email: string): void {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return;
    
    const allAttempts = JSON.parse(stored);
    delete allAttempts[email.toLowerCase()];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allAttempts));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Format remaining time for display
 */
export function formatRemainingTime(seconds: number): string {
  if (seconds < 60) return `${seconds} second${seconds !== 1 ? 's' : ''}`;
  const minutes = Math.ceil(seconds / 60);
  return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
}
