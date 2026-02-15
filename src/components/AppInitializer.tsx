import { useEffect, useRef } from 'react';
import { useCapacitor, StatusBarStyle } from '@/hooks/useCapacitor';
import { usePushToken } from '@/hooks/usePushToken';
import { useAuth } from '@/hooks/useAuth';
import { Capacitor } from '@capacitor/core';

interface AppInitializerProps {
  children: React.ReactNode;
}

/**
 * AppInitializer handles native app setup for Capacitor iOS/Android builds:
 * - Splash screen hiding (after app is ready)
 * - Status bar styling
 * - Keyboard handling
 * - Push notification registration
 * - Deep link handling (via DeepLinkHandler component)
 */
export function AppInitializer({ children }: AppInitializerProps) {
  const { isNative, platform, setStatusBarStyle, setStatusBarColor } = useCapacitor();
  const { registerAndSaveToken } = usePushToken();
  const { user, loading } = useAuth();
  const splashHiddenRef = useRef(false);

  // Hide splash screen when app is ready (auth check complete)
  useEffect(() => {
    if (!isNative || splashHiddenRef.current) return;
    
    // Wait until auth loading is complete
    if (!loading) {
      hideSplashScreen();
      splashHiddenRef.current = true;
    }
  }, [isNative, loading]);

  // Set up status bar on mount
  useEffect(() => {
    if (!isNative) return;

    // Use dark content for the status bar (dark text on light background)
    setStatusBarStyle(StatusBarStyle.Dark);
    
    // Set Android status bar color to match app background
    if (platform === 'android') {
      setStatusBarColor('#f7f5f3');
    }
  }, [isNative, platform, setStatusBarStyle, setStatusBarColor]);

  // Set up keyboard listeners for iOS
  useEffect(() => {
    if (!isNative) return;

    let keyboardPlugin: any = null;
    
    const setupKeyboard = async () => {
      try {
        const { Keyboard } = await import('@capacitor/keyboard');
        keyboardPlugin = Keyboard;
        
        // Add keyboard listeners for smooth scrolling
        await Keyboard.addListener('keyboardWillShow', (info) => {
          // Dispatch custom event for components that need keyboard awareness
          window.dispatchEvent(new CustomEvent('keyboardWillShow', { 
            detail: { keyboardHeight: info.keyboardHeight } 
          }));
        });
        
        await Keyboard.addListener('keyboardWillHide', () => {
          window.dispatchEvent(new CustomEvent('keyboardWillHide'));
        });
      } catch (error) {
        console.warn('Keyboard plugin not available:', error);
      }
    };
    
    setupKeyboard();
    
    return () => {
      if (keyboardPlugin) {
        keyboardPlugin.removeAllListeners?.();
      }
    };
  }, [isNative]);

  // Register for push notifications when user logs in
  useEffect(() => {
    if (user && isNative) {
      // Small delay to ensure app is fully initialized
      const timer = setTimeout(() => {
        registerAndSaveToken();
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [user, isNative, registerAndSaveToken]);

  return <>{children}</>;
}

/**
 * Hide the splash screen with a smooth fade animation.
 * Uses dynamic import to avoid bundling SplashScreen for web builds.
 */
async function hideSplashScreen() {
  if (!Capacitor.isNativePlatform()) return;
  
  try {
    const { SplashScreen } = await import('@capacitor/splash-screen');
    await SplashScreen.hide({
      fadeOutDuration: 300,
    });
    console.debug('[AppInitializer] Splash screen hidden');
  } catch (error) {
    console.warn('[AppInitializer] Failed to hide splash screen:', error);
  }
}
