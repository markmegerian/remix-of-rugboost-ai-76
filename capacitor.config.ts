import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.rugboost.app',
  appName: 'Rugboost',
  webDir: 'dist',
  ios: {
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
    // Custom URL scheme for deep linking (lowercase for consistency)
    scheme: 'rugboost',
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
