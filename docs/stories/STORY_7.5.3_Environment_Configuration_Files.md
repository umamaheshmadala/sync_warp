# Story 7.5.3: Environment Configuration Files ⚪ PLANNED

**Feature:** Mobile App Setup & Deployment  
**Epic:** 7. Cross-Platform Mobile App (iOS & Android)  
**Story ID:** 7.5.3  
**Branch:** `mobile-app-setup`

---

## 📋 Overview

Create and configure environment-specific configuration files for development, staging, and production environments. This includes `.env` files, Capacitor configuration updates, and proper secret management to ensure the app can seamlessly switch between different backend environments and API endpoints.

---

## 🎯 Acceptance Criteria

- [ ] `.env.development`, `.env.staging`, and `.env.production` files created
- [ ] Environment variables properly typed in TypeScript
- [ ] Capacitor config dynamically loads environment-specific settings
- [ ] API endpoints, Supabase URLs, and Firebase configs are environment-specific
- [ ] Secrets are properly excluded from version control
- [ ] `.env.example` file created with placeholder values
- [ ] Environment switching documented and tested
- [ ] Build scripts updated to use correct environment files
- [ ] All team members can easily set up local development environment

---

## 🛠️ Implementation Steps

### **Step 1: Create Environment Files**

#### **File:** `.env.example`

```bash
# API Configuration
VITE_API_URL=https://api.example.com
VITE_APP_ENV=development

# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# Firebase Configuration (for push notifications)
VITE_FIREBASE_API_KEY=your-firebase-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef123456
VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX

# Feature Flags
VITE_ENABLE_ANALYTICS=false
VITE_ENABLE_DEBUG_MODE=false
VITE_ENABLE_CRASH_REPORTING=false

# App Configuration
VITE_APP_NAME=SyncWarp
VITE_APP_VERSION=1.0.0
VITE_MIN_APP_VERSION=1.0.0

# Third-party Services
VITE_GOOGLE_MAPS_API_KEY=your-google-maps-key
VITE_SENTRY_DSN=your-sentry-dsn

# Deep Linking
VITE_DEEP_LINK_SCHEME=syncwarp
VITE_DEEP_LINK_HOST=app.syncwarp.com
```

---

#### **File:** `.env.development`

```bash
# Development Environment Configuration
VITE_API_URL=http://localhost:3000/api
VITE_APP_ENV=development

# Supabase Development
VITE_SUPABASE_URL=https://dev-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dev-key-here

# Firebase Development
VITE_FIREBASE_API_KEY=AIzaSyDev_Key_Here
VITE_FIREBASE_AUTH_DOMAIN=syncwarp-dev.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=syncwarp-dev
VITE_FIREBASE_STORAGE_BUCKET=syncwarp-dev.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:dev123
VITE_FIREBASE_MEASUREMENT_ID=G-DEV123

# Feature Flags (Development)
VITE_ENABLE_ANALYTICS=false
VITE_ENABLE_DEBUG_MODE=true
VITE_ENABLE_CRASH_REPORTING=false

# App Configuration
VITE_APP_NAME=SyncWarp Dev
VITE_APP_VERSION=1.0.0-dev
VITE_MIN_APP_VERSION=1.0.0

# Third-party Services (Dev)
VITE_GOOGLE_MAPS_API_KEY=AIzaSyDev_Maps_Key
VITE_SENTRY_DSN=

# Deep Linking
VITE_DEEP_LINK_SCHEME=syncwarp-dev
VITE_DEEP_LINK_HOST=dev.syncwarp.com
```

---

#### **File:** `.env.staging`

```bash
# Staging Environment Configuration
VITE_API_URL=https://api-staging.syncwarp.com
VITE_APP_ENV=staging

# Supabase Staging
VITE_SUPABASE_URL=https://staging-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.staging-key-here

# Firebase Staging
VITE_FIREBASE_API_KEY=AIzaSyStaging_Key_Here
VITE_FIREBASE_AUTH_DOMAIN=syncwarp-staging.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=syncwarp-staging
VITE_FIREBASE_STORAGE_BUCKET=syncwarp-staging.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=987654321
VITE_FIREBASE_APP_ID=1:987654321:web:staging123
VITE_FIREBASE_MEASUREMENT_ID=G-STAGING123

# Feature Flags (Staging)
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_DEBUG_MODE=true
VITE_ENABLE_CRASH_REPORTING=true

# App Configuration
VITE_APP_NAME=SyncWarp Staging
VITE_APP_VERSION=1.0.0-staging
VITE_MIN_APP_VERSION=1.0.0

# Third-party Services (Staging)
VITE_GOOGLE_MAPS_API_KEY=AIzaSyStaging_Maps_Key
VITE_SENTRY_DSN=https://staging@sentry.io/123456

# Deep Linking
VITE_DEEP_LINK_SCHEME=syncwarp-staging
VITE_DEEP_LINK_HOST=staging.syncwarp.com
```

---

#### **File:** `.env.production`

```bash
# Production Environment Configuration
VITE_API_URL=https://api.syncwarp.com
VITE_APP_ENV=production

# Supabase Production
VITE_SUPABASE_URL=https://prod-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.prod-key-here

# Firebase Production
VITE_FIREBASE_API_KEY=AIzaSyProd_Key_Here
VITE_FIREBASE_AUTH_DOMAIN=syncwarp.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=syncwarp-prod
VITE_FIREBASE_STORAGE_BUCKET=syncwarp-prod.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=111222333
VITE_FIREBASE_APP_ID=1:111222333:web:prod123
VITE_FIREBASE_MEASUREMENT_ID=G-PROD123

# Feature Flags (Production)
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_DEBUG_MODE=false
VITE_ENABLE_CRASH_REPORTING=true

# App Configuration
VITE_APP_NAME=SyncWarp
VITE_APP_VERSION=1.0.0
VITE_MIN_APP_VERSION=1.0.0

# Third-party Services (Production)
VITE_GOOGLE_MAPS_API_KEY=AIzaSyProd_Maps_Key
VITE_SENTRY_DSN=https://prod@sentry.io/789012

# Deep Linking
VITE_DEEP_LINK_SCHEME=syncwarp
VITE_DEEP_LINK_HOST=app.syncwarp.com
```

---

### **Step 2: Update `.gitignore`**

**File:** `.gitignore`

```gitignore
# Environment files (keep example)
.env
.env.local
.env.development
.env.staging
.env.production
.env.*.local

# Keep example file
!.env.example

# Capacitor
.capacitor/
android/app/google-services.json
ios/App/GoogleService-Info.plist

# Build outputs
dist/
build/
.output/

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db

# Logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*

# Dependencies
node_modules/
```

---

### **Step 3: Create Environment Type Definitions**

**File:** `src/types/env.d.ts`

```typescript
/// <reference types="vite/client" />

interface ImportMetaEnv {
  // API Configuration
  readonly VITE_API_URL: string;
  readonly VITE_APP_ENV: 'development' | 'staging' | 'production';

  // Supabase Configuration
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;

  // Firebase Configuration
  readonly VITE_FIREBASE_API_KEY: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN: string;
  readonly VITE_FIREBASE_PROJECT_ID: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string;
  readonly VITE_FIREBASE_APP_ID: string;
  readonly VITE_FIREBASE_MEASUREMENT_ID: string;

  // Feature Flags
  readonly VITE_ENABLE_ANALYTICS: string;
  readonly VITE_ENABLE_DEBUG_MODE: string;
  readonly VITE_ENABLE_CRASH_REPORTING: string;

  // App Configuration
  readonly VITE_APP_NAME: string;
  readonly VITE_APP_VERSION: string;
  readonly VITE_MIN_APP_VERSION: string;

  // Third-party Services
  readonly VITE_GOOGLE_MAPS_API_KEY: string;
  readonly VITE_SENTRY_DSN: string;

  // Deep Linking
  readonly VITE_DEEP_LINK_SCHEME: string;
  readonly VITE_DEEP_LINK_HOST: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

---

### **Step 4: Create Environment Config Utility**

**File:** `src/config/env.ts`

```typescript
export const config = {
  // API Configuration
  apiUrl: import.meta.env.VITE_API_URL,
  appEnv: import.meta.env.VITE_APP_ENV,

  // Supabase Configuration
  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL,
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
  },

  // Firebase Configuration
  firebase: {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
  },

  // Feature Flags
  features: {
    analytics: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
    debugMode: import.meta.env.VITE_ENABLE_DEBUG_MODE === 'true',
    crashReporting: import.meta.env.VITE_ENABLE_CRASH_REPORTING === 'true',
  },

  // App Configuration
  app: {
    name: import.meta.env.VITE_APP_NAME,
    version: import.meta.env.VITE_APP_VERSION,
    minVersion: import.meta.env.VITE_MIN_APP_VERSION,
  },

  // Third-party Services
  services: {
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    sentryDsn: import.meta.env.VITE_SENTRY_DSN,
  },

  // Deep Linking
  deepLink: {
    scheme: import.meta.env.VITE_DEEP_LINK_SCHEME,
    host: import.meta.env.VITE_DEEP_LINK_HOST,
  },

  // Helper functions
  isDevelopment: () => import.meta.env.VITE_APP_ENV === 'development',
  isStaging: () => import.meta.env.VITE_APP_ENV === 'staging',
  isProduction: () => import.meta.env.VITE_APP_ENV === 'production',
} as const;

// Validate required environment variables
export function validateEnv(): void {
  const required: (keyof ImportMetaEnv)[] = [
    'VITE_API_URL',
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY',
  ];

  const missing = required.filter(key => !import.meta.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      'Please copy .env.example to .env and fill in the values.'
    );
  }
}
```

---

### **Step 5: Update Capacitor Config for Multi-Environment**

**File:** `capacitor.config.ts`

```typescript
import { CapacitorConfig } from '@capacitor/cli';

const getAppId = (): string => {
  const env = process.env.VITE_APP_ENV || 'development';
  
  switch (env) {
    case 'production':
      return 'com.syncwarp.app';
    case 'staging':
      return 'com.syncwarp.app.staging';
    case 'development':
    default:
      return 'com.syncwarp.app.dev';
  }
};

const getAppName = (): string => {
  const env = process.env.VITE_APP_ENV || 'development';
  
  switch (env) {
    case 'production':
      return 'SyncWarp';
    case 'staging':
      return 'SyncWarp Staging';
    case 'development':
    default:
      return 'SyncWarp Dev';
  }
};

const config: CapacitorConfig = {
  appId: getAppId(),
  appName: getAppName(),
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    // Allow loading from localhost in development
    ...(process.env.VITE_APP_ENV === 'development' && {
      cleartext: true,
    }),
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#ffffff',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#488AFF',
    },
  },
};

export default config;
```

---

### **Step 6: Update Package.json Scripts**

**File:** `package.json`

```json
{
  "scripts": {
    "dev": "vite --mode development",
    "build:dev": "vite build --mode development",
    "build:staging": "vite build --mode staging",
    "build:prod": "vite build --mode production",
    
    "cap:sync:dev": "npm run build:dev && cross-env VITE_APP_ENV=development npx cap sync",
    "cap:sync:staging": "npm run build:staging && cross-env VITE_APP_ENV=staging npx cap sync",
    "cap:sync:prod": "npm run build:prod && cross-env VITE_APP_ENV=production npx cap sync",
    
    "cap:run:ios:dev": "npm run cap:sync:dev && npx cap run ios",
    "cap:run:ios:staging": "npm run cap:sync:staging && npx cap run ios",
    "cap:run:ios:prod": "npm run cap:sync:prod && npx cap run ios",
    
    "cap:run:android:dev": "npm run cap:sync:dev && npx cap run android",
    "cap:run:android:staging": "npm run cap:sync:staging && npx cap run android",
    "cap:run:android:prod": "npm run cap:sync:prod && npx cap run android",
    
    "cap:open:ios": "npx cap open ios",
    "cap:open:android": "npx cap open android",
    
    "preview": "vite preview",
    "test": "vitest",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "type-check": "tsc --noEmit"
  },
  "devDependencies": {
    "cross-env": "^7.0.3"
  }
}
```

---

### **Step 7: Create Setup Script**

**File:** `scripts/setup-env.sh`

```bash
#!/bin/bash

echo "🔧 SyncWarp Environment Setup"
echo "=============================="

# Check if .env.example exists
if [ ! -f ".env.example" ]; then
  echo "❌ Error: .env.example not found"
  exit 1
fi

# Function to copy environment file
setup_env_file() {
  local env_file=$1
  
  if [ -f "$env_file" ]; then
    echo "⚠️  $env_file already exists. Do you want to overwrite it? (y/n)"
    read -r response
    if [[ "$response" != "y" ]]; then
      echo "⏭️  Skipping $env_file"
      return
    fi
  fi
  
  cp .env.example "$env_file"
  echo "✅ Created $env_file"
}

# Ask which environments to set up
echo ""
echo "Which environment files do you want to set up?"
echo "1) Development only"
echo "2) All environments (dev, staging, prod)"
echo ""
read -p "Enter your choice (1 or 2): " choice

case $choice in
  1)
    setup_env_file ".env.development"
    ;;
  2)
    setup_env_file ".env.development"
    setup_env_file ".env.staging"
    setup_env_file ".env.production"
    ;;
  *)
    echo "❌ Invalid choice"
    exit 1
    ;;
esac

echo ""
echo "✅ Environment setup complete!"
echo ""
echo "⚠️  IMPORTANT: Update the following in your .env files:"
echo "   - VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY"
echo "   - VITE_FIREBASE_* configuration values"
echo "   - VITE_GOOGLE_MAPS_API_KEY (if using maps)"
echo "   - VITE_SENTRY_DSN (if using error tracking)"
echo ""
echo "📚 See docs/environment-setup.md for detailed instructions"
```

Make it executable:
```bash
chmod +x scripts/setup-env.sh
```

---

### **Step 8: Initialize Environment in App Entry Point**

**File:** `src/main.tsx`

Update the app entry point to validate environment:

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { validateEnv } from './config/env';
import './index.css';

// Validate environment variables on startup
try {
  validateEnv();
} catch (error) {
  console.error('Environment validation failed:', error);
  // In development, show error overlay
  if (import.meta.env.DEV) {
    document.body.innerHTML = `
      <div style="padding: 20px; background: #fee; color: #c00; font-family: monospace;">
        <h1>⚠️ Environment Configuration Error</h1>
        <pre>${error}</pre>
      </div>
    `;
    throw error;
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

---

## 🧪 Testing Steps

### **Manual Testing**

1. **Test development environment:**
   ```bash
   npm run dev
   # Verify app uses development API URL
   # Check browser console for environment: "development"
   ```

2. **Test staging build:**
   ```bash
   npm run build:staging
   npm run preview
   # Verify app uses staging API URL
   # Check analytics and crash reporting are enabled
   ```

3. **Test production build:**
   ```bash
   npm run build:prod
   npm run preview
   # Verify app uses production API URL
   # Check debug mode is disabled
   ```

4. **Test mobile builds:**
   ```bash
   # Development iOS
   npm run cap:run:ios:dev
   
   # Staging Android
   npm run cap:run:android:staging
   
   # Production iOS
   npm run cap:run:ios:prod
   ```

5. **Verify environment-specific app IDs:**
   - Check iOS Xcode project for correct bundle identifier
   - Check Android `build.gradle` for correct `applicationId`

---

### **Automated Testing**

**File:** `src/config/__tests__/env.test.ts`

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { config, validateEnv } from '../env';

describe('Environment Config', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('should load environment variables', () => {
    expect(config.apiUrl).toBeDefined();
    expect(config.supabase.url).toBeDefined();
    expect(config.supabase.anonKey).toBeDefined();
  });

  it('should parse feature flags correctly', () => {
    expect(typeof config.features.analytics).toBe('boolean');
    expect(typeof config.features.debugMode).toBe('boolean');
    expect(typeof config.features.crashReporting).toBe('boolean');
  });

  it('should have environment helper functions', () => {
    expect(typeof config.isDevelopment).toBe('function');
    expect(typeof config.isStaging).toBe('function');
    expect(typeof config.isProduction).toBe('function');
  });

  it('should validate required environment variables', () => {
    expect(() => validateEnv()).not.toThrow();
  });
});
```

Run tests:
```bash
npm run test
```

---

## 📚 Documentation

### **File:** `docs/environment-setup.md`

```markdown
# Environment Configuration Guide

## Overview
SyncWarp uses environment-specific configuration files to manage different deployment environments (development, staging, production).

## Quick Setup

1. **Copy the example file:**
   ```bash
   ./scripts/setup-env.sh
   ```

2. **Update your `.env.development` file** with your actual credentials.

3. **Start development:**
   ```bash
   npm run dev
   ```

## Environment Files

- `.env.development` - Local development
- `.env.staging` - Staging/QA environment
- `.env.production` - Production environment
- `.env.example` - Template file (committed to git)

## Required Variables

### Supabase
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to Settings → API
4. Copy `URL` and `anon/public` key

### Firebase (Push Notifications)
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Go to Project Settings → General
4. Copy your web app configuration

### Google Maps (Optional)
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Enable Maps SDK for iOS and Android
3. Create an API key
4. Add restrictions for your app's bundle ID

## Building for Different Environments

```bash
# Development
npm run build:dev

# Staging
npm run build:staging

# Production
npm run build:prod
```

## Running on Mobile Devices

```bash
# iOS Development
npm run cap:run:ios:dev

# Android Staging
npm run cap:run:android:staging

# iOS Production
npm run cap:run:ios:prod
```

## App IDs by Environment

- **Development:** `com.syncwarp.app.dev`
- **Staging:** `com.syncwarp.app.staging`
- **Production:** `com.syncwarp.app`

## Feature Flags

Toggle features per environment:
- `VITE_ENABLE_ANALYTICS` - Google Analytics / Firebase Analytics
- `VITE_ENABLE_DEBUG_MODE` - Show debug logs and tools
- `VITE_ENABLE_CRASH_REPORTING` - Sentry error tracking

## Security Best Practices

1. ✅ Never commit `.env.*` files (except `.env.example`)
2. ✅ Use different Firebase projects for each environment
3. ✅ Rotate API keys regularly
4. ✅ Use restricted API keys for production
5. ✅ Keep staging credentials separate from production

## Troubleshooting

### Environment variables not loading
- Restart the dev server after changing `.env` files
- Check file names match exactly (`.env.development` not `.env.dev`)
- Ensure variables start with `VITE_`

### Wrong environment being used
- Check which build command you're running
- Verify `VITE_APP_ENV` in your `.env` file
- Clear build cache: `rm -rf dist node_modules/.vite`

### App crashes on startup
- Run `npm run type-check` to find missing variables
- Check browser/device console for environment errors
- Verify all required variables are set
```

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| Environment variables not loading | Restart dev server, ensure variables start with `VITE_` |
| Wrong API being called | Check `VITE_APP_ENV` in active `.env` file |
| Build fails with missing vars | Run `npm run type-check`, verify all required vars are set |
| Capacitor uses wrong app ID | Clear build cache, run `npm run cap:sync:<env>` |
| Firebase config error | Verify all `VITE_FIREBASE_*` variables are set correctly |
| Type errors for env variables | Check `src/types/env.d.ts` includes all variables |

---

## 📝 Git Commit

```bash
# Ensure you're on the mobile-app-setup branch
git checkout mobile-app-setup

# Stage environment configuration files
git add .env.example
git add .gitignore
git add src/types/env.d.ts
git add src/config/env.ts
git add capacitor.config.ts
git add package.json
git add scripts/setup-env.sh
git add docs/environment-setup.md

# Commit with descriptive message
git commit -m "feat: configure environment-specific settings

- Create .env.example with all required variables
- Add .env.development, .env.staging, .env.production templates
- Create TypeScript type definitions for environment variables
- Add environment config utility with validation
- Update Capacitor config for multi-environment support
- Add npm scripts for environment-specific builds
- Create setup script for easy environment initialization
- Document environment setup and best practices

Story: 7.5.3
Status: Completed"

# Push to remote
git push origin mobile-app-setup
```

---

## ✅ Definition of Done

- [x] All environment files created (development, staging, production)
- [x] `.env.example` created with placeholder values
- [x] `.gitignore` updated to exclude secret files
- [x] TypeScript type definitions created
- [x] Environment config utility implemented with validation
- [x] Capacitor config supports multi-environment
- [x] Package.json scripts updated for all environments
- [x] Setup script created and tested
- [x] Environment validation runs on app startup
- [x] Documentation created and reviewed
- [x] All team members can set up local environment
- [x] Code committed to `mobile-app-setup` branch
- [x] Story marked as completed in project tracker

---

**Story Status:** ✅ Ready for Implementation  
**Estimated Time:** 3-5 hours  
**Dependencies:** None  
**Next Story:** 7.5.4 (Multi-Environment Build System)
