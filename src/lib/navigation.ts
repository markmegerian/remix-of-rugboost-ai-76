/**
 * Navigation utilities for Capacitor-safe routing.
 * Uses Capacitor Browser plugin for external URLs in native apps.
 */

import { isNative } from '@/lib/platformUrls';
import { Capacitor } from '@capacitor/core';

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
 * Open an external URL safely using Capacitor Browser plugin on native platforms.
 * In native apps, uses Browser.open() to open URLs in an in-app browser.
 * In web, uses standard browser navigation.
 * 
 * @param url - The URL to open
 * @param options - Configuration options
 * @param options.critical - If true, navigation is critical (payment, auth flows)
 * @param options.inApp - If true, prefer in-app browser on native
 */
export const openExternalUrl = async (url: string, options?: { 
  critical?: boolean; 
  inApp?: boolean;
}): Promise<void> => {
  const { critical = false, inApp = true } = options || {};
  
  if (isNativeApp()) {
    try {
      // Dynamically import Capacitor Browser to avoid bundling issues on web
      const { Browser } = await import('@capacitor/browser');
      
      // Use in-app browser for external URLs on native platforms
      // This provides a better UX and handles redirects back to the app properly
      await Browser.open({ 
        url,
        // Use in-app browser for payment/auth flows to handle return URLs
        presentationStyle: critical ? 'fullscreen' : 'popover',
        // On iOS, use SFSafariViewController for better security with auth flows
        toolbarColor: '#f7f5f3',
        windowName: '_blank',
      });
      
      // For critical flows (Stripe), we may need to listen for the app URL
      // when the user returns from the external browser
      if (critical) {
        console.log('[Navigation] Opened critical flow in browser:', url.substring(0, 50) + '...');
      }
    } catch (error) {
      console.error('[Navigation] Browser.open failed, falling back to location:', error);
      // Fallback to standard navigation if Browser plugin fails
      window.location.href = url;
    }
  } else if (critical) {
    // Critical flows on web should never use popups - use direct navigation
    window.location.href = url;
  } else {
    // Non-critical on web: prefer new tab but fallback to same window
    const newWindow = window.open(url, '_blank', 'noopener,noreferrer');
    if (!newWindow) {
      window.location.href = url;
    }
  }
};

/**
 * Close the in-app browser (for use after completing external flows)
 * Only applicable on native platforms
 */
export const closeExternalBrowser = async (): Promise<void> => {
  if (!isNativeApp()) return;
  
  try {
    const { Browser } = await import('@capacitor/browser');
    await Browser.close();
  } catch (error) {
    console.warn('[Navigation] Failed to close browser:', error);
  }
};

/**
 * Add a listener for browser finished events (when user closes in-app browser)
 * Useful for handling cancelled payment/auth flows
 */
export const addBrowserFinishedListener = async (
  callback: () => void
): Promise<(() => void) | null> => {
  if (!isNativeApp()) return null;
  
  try {
    const { Browser } = await import('@capacitor/browser');
    const listener = await Browser.addListener('browserFinished', callback);
    return () => listener.remove();
  } catch (error) {
    console.warn('[Navigation] Failed to add browser listener:', error);
    return null;
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

/**
 * Navigate to Stripe checkout safely on all platforms
 * Uses Browser.open on native to ensure proper redirect handling
 */
export const navigateToStripeCheckout = async (checkoutUrl: string): Promise<void> => {
  console.log('[Navigation] Initiating Stripe checkout redirect');
  
  await openExternalUrl(checkoutUrl, { 
    critical: true, 
    inApp: true 
  });
};
