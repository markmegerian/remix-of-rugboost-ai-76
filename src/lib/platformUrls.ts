/**
 * Platform-aware URL utilities for Capacitor native and web builds.
 * Centralizes all URL handling for auth redirects and deep linking.
 */

import { Capacitor } from '@capacitor/core';

/**
 * Custom URL scheme for native app deep links
 */
export const APP_SCHEME = 'rugboost';

/**
 * Check if running in a Capacitor native app (iOS/Android)
 */
export const isNative = (): boolean => {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    // Capacitor not available (web build without Capacitor)
    return false;
  }
};

/**
 * Get the current platform
 */
export const getPlatform = (): 'ios' | 'android' | 'web' => {
  try {
    return Capacitor.getPlatform() as 'ios' | 'android' | 'web';
  } catch {
    return 'web';
  }
};

/**
 * Normalize a path to ensure it has a leading slash
 */
const normalizePath = (path: string): string => {
  if (!path) return '/';
  return path.startsWith('/') ? path : `/${path}`;
};

/**
 * Get the base URL for the application.
 * - Native: Uses custom scheme (rugboost://)
 * - Web: Uses window.location.origin
 */
export const getAppBaseUrl = (): string => {
  if (isNative()) {
    return `${APP_SCHEME}://`;
  }
  return window.location.origin;
};

/**
 * Get a Capacitor-safe auth redirect URL.
 * - Native: Uses custom scheme (rugboost://auth-callback, rugboost://reset-password)
 * - Web: Uses window.location.origin + path
 * 
 * @param path - The path to redirect to (e.g., '/reset-password', '/auth-callback')
 */
export const getAuthRedirectUrl = (path: string): string => {
  const normalizedPath = normalizePath(path);
  
  if (isNative()) {
    // For native, use custom scheme URL
    // Remove leading slash for scheme URL
    const schemePath = normalizedPath.startsWith('/') 
      ? normalizedPath.slice(1) 
      : normalizedPath;
    return `${APP_SCHEME}://${schemePath}`;
  }
  
  // For web, use origin + path
  return `${window.location.origin}${normalizedPath}`;
};

/**
 * Get the signup email redirect URL (Capacitor-safe).
 * Uses /auth-callback route which handles email verification tokens.
 */
export const getSignupRedirectUrl = (): string => {
  return getAuthRedirectUrl('/auth-callback');
};

/**
 * Get the password reset redirect URL (Capacitor-safe)
 */
export const getPasswordResetRedirectUrl = (): string => {
  return getAuthRedirectUrl('/reset-password');
};

/**
 * Parse a deep link URL and extract the path
 * @param url - The full URL (e.g., 'rugboost://reset-password?token=abc')
 * @returns The path portion of the URL (e.g., '/reset-password')
 */
export const parseDeepLinkPath = (url: string): string => {
  try {
    // Handle custom scheme URLs
    if (url.startsWith(`${APP_SCHEME}://`)) {
      const withoutScheme = url.replace(`${APP_SCHEME}://`, '');
      // Extract path (before query string)
      const pathPart = withoutScheme.split('?')[0];
      return normalizePath(pathPart);
    }
    
    // Handle standard URLs
    const urlObj = new URL(url);
    return urlObj.pathname;
  } catch {
    // If parsing fails, return home
    return '/';
  }
};

/**
 * Parse query parameters from a URL
 */
export const parseUrlParams = (url: string): URLSearchParams => {
  try {
    // Handle custom scheme URLs
    if (url.startsWith(`${APP_SCHEME}://`)) {
      const queryStart = url.indexOf('?');
      if (queryStart === -1) return new URLSearchParams();
      return new URLSearchParams(url.slice(queryStart));
    }
    
    // Handle standard URLs
    const urlObj = new URL(url);
    return urlObj.searchParams;
  } catch {
    return new URLSearchParams();
  }
};
