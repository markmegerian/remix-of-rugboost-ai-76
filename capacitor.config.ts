import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.rugboost.app',
  appName: 'Rugboost',
  webDir: 'dist',
  
  // IMPORTANT: For App Store builds, ensure 'server' block is commented out
  // Uncomment ONLY for local development with live reload
  // server: {
  //   url: 'https://fef72b1b-d121-4ff6-bcc3-c957ca919cde.lovableproject.com?forceHideBadge=true',
  //   cleartext: true
  // },
  
  ios: {
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
    // Custom URL scheme for deep linking
    scheme: 'rugboost',
    // Background color while loading
    backgroundColor: '#f7f5f3',
    // Allow WebView scrolling
    scrollEnabled: true,
    // Disable WebView bounce for native feel
    allowsLinkPreview: false,
    // Use WKWebView (required for App Store)
    limitsNavigationsToAppBoundDomains: false,
  },
  
  android: {
    // Disable mixed content in production for security
    allowMixedContent: false,
    captureInput: true,
    // CRITICAL: Disable debugging for production/Play Store
    webContentsDebuggingEnabled: false,
    backgroundColor: '#f7f5f3',
    // Use hardware back button
    hardwareBackButton: true,
  },
  
  plugins: {
    SplashScreen: {
      // Duration to show splash (will be hidden programmatically after app ready)
      launchShowDuration: 0, // We control hiding manually
      launchAutoHide: false, // Don't auto-hide, we'll hide when app is ready
      backgroundColor: '#f7f5f3',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
      splashFullScreen: true,
      splashImmersive: true,
      // iOS spinner styling
      iosSpinnerStyle: 'small',
      spinnerColor: '#2563eb',
      // Fade out animation
      launchFadeOutDuration: 300,
    },
    Keyboard: {
      // Resize the WebView when keyboard appears
      resize: 'body',
      resizeOnFullScreen: true,
      // Dark keyboard style to match app
      style: 'dark',
    },
    PushNotifications: {
      // iOS presentation options when app is in foreground
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    StatusBar: {
      // Don't overlay WebView content
      overlaysWebView: false,
      // Default style (updated programmatically in AppInitializer)
      style: 'DARK',
      backgroundColor: '#f7f5f3',
    },
    Camera: {
      // Permissions handled via Info.plist / AndroidManifest
    },
    // Haptics is configured by default
  },
  
  // Bundle configuration for production
  bundledWebRuntime: false,
};

export default config;
