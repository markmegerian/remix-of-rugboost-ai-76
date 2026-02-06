/**
 * Navigation utilities for Capacitor-safe routing.
 * Avoids popups and window.open for WebView compatibility.
 */

import { isNative } from '@/lib/platformUrls';

/**
 * Check if running in a native Capacitor app
 * @deprecated Use isNative() from platformUrls.ts instead
 */
export const isNativeApp = (): boolean => {
  return isNative();
};

/**
 * Check if running in a mobile browser (not native app)
 */
export const isMobileBrowser = (): boolean => {
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) && !isNativeApp();
};

/**
 * Open an external URL safely.
 * In native apps, this will later use Capacitor Browser plugin.
 * For now, uses location.href for critical flows, window.open for non-critical.
 */
export const openExternalUrl = (url: string, options?: { 
  critical?: boolean; 
  inApp?: boolean;
}) => {
  const { critical = false, inApp = false } = options || {};
  
  if (isNativeApp()) {
    // In native app: use in-app browser or system browser
    // Will be replaced with Capacitor Browser plugin
    if (inApp || critical) {
      // For critical flows (payment, auth), navigate directly
      window.location.href = url;
    } else {
      // For informational links, we'll use Capacitor Browser later
      // For now, just navigate
      window.location.href = url;
    }
  } else if (critical) {
    // Critical flows should never use popups
    window.location.href = url;
  } else {
    // Non-critical: prefer new tab but fallback to same window
    const newWindow = window.open(url, '_blank', 'noopener,noreferrer');
    if (!newWindow) {
      window.location.href = url;
    }
  }
};

/**
 * Copy text to clipboard with fallback for older browsers
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    
    // Fallback for older browsers / WebViews
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    const success = document.execCommand('copy');
    document.body.removeChild(textArea);
    return success;
  } catch {
    return false;
  }
};

/**
 * Build a return URL that works in both web and native contexts.
 * For web/email sharing, always uses the web origin (not custom schemes).
 */
export const buildReturnUrl = (path: string): string => {
  // Always use web origin for shareable URLs (emails, portal links)
  // Custom schemes (rugboost://) are only for deep link handling within the app
  const origin = import.meta.env.VITE_APP_URL || window.location.origin;
  return `${origin}${path.startsWith('/') ? path : `/${path}`}`;
};

/**
 * Check if a URL is internal (same origin) or external
 */
export const isInternalUrl = (url: string): boolean => {
  try {
    const urlObj = new URL(url, window.location.origin);
    return urlObj.origin === window.location.origin;
  } catch {
    // If it's a relative path, it's internal
    return !url.startsWith('http://') && !url.startsWith('https://');
  }
};
