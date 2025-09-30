/**
 * Environment Configuration
 * Centralized environment variable management with validation
 */

interface EnvironmentConfig {
  // App
  env: 'development' | 'production' | 'staging';
  isProd: boolean;
  isDev: boolean;
  isStaging: boolean;

  // Supabase
  supabase: {
    url: string;
    anonKey: string;
  };

  // Google Maps
  googleMaps: {
    apiKey: string;
  };

  // Features
  features: {
    enableAnalytics: boolean;
    enableErrorTracking: boolean;
    enablePerformanceMonitoring: boolean;
    enableDebugPanel: boolean;
  };

  // API
  api: {
    timeout: number;
    retryAttempts: number;
  };
}

/**
 * Get environment variable with validation
 */
function getEnvVar(key: string, required = true): string {
  const value = import.meta.env[key];

  if (required && !value) {
    throw new Error(
      `Missing required environment variable: ${key}. ` +
      `Please check your .env file.`
    );
  }

  return value || '';
}

/**
 * Validate environment configuration
 */
function validateConfig(config: EnvironmentConfig): void {
  const errors: string[] = [];

  // Validate Supabase URL
  if (!config.supabase.url.startsWith('https://')) {
    errors.push('VITE_SUPABASE_URL must start with https://');
  }

  // Validate Supabase anon key format (should be a JWT)
  if (config.supabase.anonKey && !config.supabase.anonKey.includes('.')) {
    errors.push('VITE_SUPABASE_ANON_KEY appears to be invalid (not a JWT)');
  }

  // Validate Google Maps API key in production
  if (config.isProd && !config.googleMaps.apiKey) {
    errors.push('VITE_GOOGLE_MAPS_API_KEY is required in production');
  }

  if (errors.length > 0) {
    console.error('❌ Environment Configuration Errors:');
    errors.forEach((error) => console.error(`  - ${error}`));
    
    if (config.isProd) {
      throw new Error('Invalid environment configuration. See console for details.');
    }
  }
}

/**
 * Load and validate environment configuration
 */
function loadEnvironmentConfig(): EnvironmentConfig {
  const env = (import.meta.env.VITE_APP_ENV || import.meta.env.MODE || 'development') as
    'development' | 'production' | 'staging';

  const config: EnvironmentConfig = {
    // App environment
    env,
    isProd: env === 'production',
    isDev: env === 'development',
    isStaging: env === 'staging',

    // Supabase configuration
    supabase: {
      url: getEnvVar('VITE_SUPABASE_URL'),
      anonKey: getEnvVar('VITE_SUPABASE_ANON_KEY'),
    },

    // Google Maps configuration
    googleMaps: {
      apiKey: getEnvVar('VITE_GOOGLE_MAPS_API_KEY', false),
    },

    // Feature flags
    features: {
      enableAnalytics: env === 'production' || env === 'staging',
      enableErrorTracking: env === 'production' || env === 'staging',
      enablePerformanceMonitoring: true,
      enableDebugPanel: env === 'development',
    },

    // API configuration
    api: {
      timeout: env === 'production' ? 30000 : 60000,
      retryAttempts: env === 'production' ? 3 : 1,
    },
  };

  // Validate configuration
  validateConfig(config);

  // Log configuration in development
  if (config.isDev) {
    console.log('📦 Environment Configuration:');
    console.log(`  Environment: ${config.env}`);
    console.log(`  Supabase URL: ${config.supabase.url}`);
    console.log(`  Google Maps: ${config.googleMaps.apiKey ? '✓ Configured' : '✗ Not configured'}`);
    console.log(`  Analytics: ${config.features.enableAnalytics ? 'Enabled' : 'Disabled'}`);
    console.log(`  Error Tracking: ${config.features.enableErrorTracking ? 'Enabled' : 'Disabled'}`);
  }

  return config;
}

// Export singleton instance
export const env = loadEnvironmentConfig();

// Export type for use in other files
export type { EnvironmentConfig };