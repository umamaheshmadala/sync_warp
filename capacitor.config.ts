import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.syncapp.mobile',
  appName: 'Sync App',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    iosScheme: 'https',
    hostname: 'app.syncapp.com',
    // Allow cleartext in development (remove in production)
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#6366f1', // Indigo-600 from your theme
      showSpinner: false,
      androidSpinnerStyle: 'large',
      iosSpinnerStyle: 'small'
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    }
  }
};

export default config;
