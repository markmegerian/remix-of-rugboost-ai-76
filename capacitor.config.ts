import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.fef72b1bd1214ff6bcc3c957ca919cde',
  appName: 'Rugboost',
  webDir: 'dist',
  // COMMENTED OUT for production/App Store builds - uncomment for live reload development
  // server: {
  //   url: 'https://fef72b1b-d121-4ff6-bcc3-c957ca919cde.lovableproject.com?forceHideBadge=true',
  //   cleartext: true
  // },
  ios: {
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
    scheme: 'Rugboost',
    // Allows proper handling of background/foreground states
    backgroundColor: '#f7f5f3',
    // Prevent WebView from scrolling behind nav bar
    scrollEnabled: true,
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: false,
    backgroundColor: '#f7f5f3',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#f7f5f3',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
      splashFullScreen: true,
      splashImmersive: true,
      // iOS specific
      iosSpinnerStyle: 'small',
      spinnerColor: '#2563eb',
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
      // Smooth keyboard transitions
      style: 'dark',
    },
    PushNotifications: {
      // Required for iOS push notifications
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    Camera: {
      // Camera permissions are handled via Info.plist
    },
    StatusBar: {
      // Style configured via AppInitializer
      overlaysWebView: false,
    },
  },
};

export default config;
