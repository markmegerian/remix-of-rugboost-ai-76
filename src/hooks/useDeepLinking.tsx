/**
 * Deep linking handler for Capacitor native apps.
 * Handles custom scheme URLs (rugboost://) and routes them to the correct page.
 */

import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { App, URLOpenListenerEvent } from '@capacitor/app';
import { isNative, parseDeepLinkPath, APP_SCHEME } from '@/lib/platformUrls';

/**
 * Known deep link routes that the app handles
 */
const KNOWN_ROUTES = [
  '/reset-password',
  '/auth-callback',
  '/auth',
  '/dashboard',
  '/client/auth',
  '/client/dashboard',
  '/client/payment-success',
  '/client/payment-cancelled',
  '/payment/success',
  '/payment/cancel',
];

/**
 * Hook to handle deep links in Capacitor native apps.
 * Must be used within a React Router context.
 */
export function useDeepLinking() {
  const navigate = useNavigate();

  const handleDeepLink = useCallback((url: string) => {
    console.log('[DeepLink] Received:', url);
    
    const path = parseDeepLinkPath(url);
    console.log('[DeepLink] Parsed path:', path);
    
    // Check if this is a known route
    const isKnownRoute = KNOWN_ROUTES.some(route => 
      path === route || path.startsWith(route + '/')
    );
    
    // Handle client portal tokens (e.g., /client/abc123)
    const isClientPortal = path.startsWith('/client/') && !KNOWN_ROUTES.includes(path);
    
    // Handle job detail links (e.g., /jobs/uuid or /job/uuid)
    const isJobRoute = path.startsWith('/jobs/') || path.startsWith('/job/');
    
    if (isKnownRoute || isClientPortal || isJobRoute) {
      // Preserve query params for auth flows
      const queryStart = url.indexOf('?');
      const fullPath = queryStart !== -1 
        ? `${path}${url.slice(queryStart)}`
        : path;
      
      console.log('[DeepLink] Navigating to:', fullPath);
      navigate(fullPath, { replace: true });
    } else {
      // Unknown route - go to dashboard
      console.log('[DeepLink] Unknown route, going to dashboard');
      navigate('/dashboard', { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    if (!isNative()) {
      // Not running in Capacitor, no deep linking needed
      return;
    }

    console.log('[DeepLink] Setting up listener for scheme:', APP_SCHEME);

    // Listen for app URL open events (deep links)
    const listener = App.addListener('appUrlOpen', (event: URLOpenListenerEvent) => {
      console.log('[DeepLink] appUrlOpen event:', event.url);
      handleDeepLink(event.url);
    });

    // Check if app was opened via a deep link (cold start)
    App.getLaunchUrl().then(launchUrl => {
      if (launchUrl?.url) {
        console.log('[DeepLink] App launched with URL:', launchUrl.url);
        handleDeepLink(launchUrl.url);
      }
    });

    return () => {
      listener.then(l => l.remove());
    };
  }, [handleDeepLink]);
}

/**
 * Component wrapper for deep linking functionality.
 * Use this inside BrowserRouter to enable deep link handling.
 */
export function DeepLinkHandler({ children }: { children?: React.ReactNode }) {
  useDeepLinking();
  return <>{children}</>;
}
