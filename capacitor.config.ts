import type { CapacitorConfig } from '@capacitor/cli';

// Load environment-specific configuration
const isDevelopment = process.env.VITE_APP_ENV === 'development';
const isStaging = process.env.VITE_APP_ENV === 'staging';
const isProduction = process.env.VITE_APP_ENV === 'production';

// App ID changes per environment for side-by-side installation
const getAppId = () => {
  if (isDevelopment) return 'com.syncapp.mobile.dev';
  if (isStaging) return 'com.syncapp.mobile.staging';
  return 'com.syncapp.mobile';
};

// App name changes per environment
const getAppName = () => {
  if (isDevelopment) return 'Sync Dev';
  if (isStaging) return 'Sync Staging';
  return 'Sync App';
};

// Server configuration per environment
const getServerConfig = () => {
  const baseConfig = {
    androidScheme: 'https' as const,
    iosScheme: 'https' as const,
  };

  if (isDevelopment) {
    return {
      ...baseConfig,
      hostname: 'localhost',
      cleartext: true, // Allow HTTP in development
    };
  }

  if (isStaging) {
    return {
      ...baseConfig,
      hostname: 'staging.syncapp.com',
      cleartext: false,
    };
  }

  if (isProduction) {
    return {
      ...baseConfig,
      hostname: 'app.syncapp.com',
      cleartext: false,
    };
  }

  // Default to local bundle (no server config)
  return undefined;
};

const config: CapacitorConfig = {
  appId: getAppId(),
  appName: getAppName(),
  webDir: 'dist',
  server: getServerConfig(),
  plugins: {
    Keyboard: {
      resize: 'native',
      resizeOnFullScreen: true,
    },
    SplashScreen: {
      launchShowDuration: 10000,
      showSpinner: false,
      launchAutoHide: false,
      backgroundColor: "#ffffffff",
      androidScaleType: "CENTER_CROP",
      splashFullScreen: true,
      splashImmersive: true
    }
  }
};

export default config;
