# 🚀 Mobile App Migration Plan
## Converting Your React + Supabase Web App to Cross-Platform Mobile App

---

## 📋 Table of Contents
1. [Overview](#overview)
2. [Phase 1: Setup & Preparation](#phase-1-setup--preparation)
3. [Phase 2: Capacitor Integration](#phase-2-capacitor-integration)
4. [Phase 2.5: Supabase Mobile Coordination](#phase-25-supabase-mobile-coordination)
5. [Phase 3: Offline Mode (Enhanced)](#phase-3-offline-mode-enhanced)
6. [Phase 4: Push Notifications](#phase-4-push-notifications)
7. [Phase 5: App Store Preparation](#phase-5-app-store-preparation)
8. [Phase 5.5: Environment & Build Management](#phase-55-environment--build-management)
9. [Phase 6: Testing & Deployment](#phase-6-testing--deployment)
10. [Phase 7: Future React Native Migration](#phase-7-future-react-native-migration)
11. [Timeline & Effort Estimates](#timeline--effort-estimates)
12. [Troubleshooting Guide](#troubleshooting-guide)

---

## 📱 Overview

### What You Currently Have
- ✅ **React 18** web app with **Vite** build system
- ✅ **Supabase** for backend (auth, database, storage)
- ✅ **Zustand** for state management
- ✅ **TailwindCSS** for styling
- ✅ **React Router** for navigation
- ✅ **Google Maps** integration
- ✅ Business reviews, checkins, offers, campaigns system

### What You'll Get
- 📱 **Native iOS app** (installable from App Store)
- 🤖 **Native Android app** (installable from Play Store)
- 🌐 **Web app** (still works in browsers)
- 📴 **Offline mode** (app works without internet)
- 🔔 **Push notifications** (real-time alerts)
- 🎨 **Native look & feel** (feels like a real app)

### Why Capacitor?
- ✅ **Keeps your existing code** (minimal changes needed)
- ✅ **Fast deployment** (weeks instead of months)
- ✅ **No React Native learning curve**
- ✅ **Web, iOS, Android from one codebase**
- ✅ **Easy to maintain** for no-coders

---

## 🎯 Phase 1: Setup & Preparation
**Time Estimate: 2-3 hours**  
**Difficulty: Easy** ⭐

### Step 1.1: Update Your Environment
**What:** Make sure you have the right tools installed.

**Open PowerShell in Warp and run these commands:**

```powershell
# Check Node.js version (should be 18 or higher)
node --version

# Check npm version (should be 8 or higher)
npm --version

# If versions are too old, update Node.js from https://nodejs.org/
```

**Expected Output:**
```
v18.x.x or higher
8.x.x or higher
```

---

### Step 1.2: Install Capacitor CLI Globally
**What:** Install the tool that converts your web app to mobile.

```powershell
npm install -g @capacitor/cli
```

**What this does:** Installs Capacitor command-line tools so you can run `cap` commands anywhere.

---

### Step 1.3: Backup Your Current Project
**What:** Create a safe copy before making changes.

```powershell
# Go to your project folder
cd C:\Users\umama\Documents\GitHub\sync_warp

# Create a git branch for mobile work
git checkout -b mobile-app-setup

# Commit current state
git add .
git commit -m "Backup before Capacitor setup"
```

**Why:** If something goes wrong, you can always go back to this point.

---

### Step 1.4: Audit Your Current Build
**What:** Make sure your web app builds correctly.

```powershell
# Build your web app
npm run build

# Check the dist folder was created
dir dist
```

**Expected:** You should see a `dist` folder with `index.html`, `assets`, etc.

**If build fails:** Fix any TypeScript or build errors before continuing.

---

## 🔧 Phase 2: Capacitor Integration
**Time Estimate: 4-6 hours**  
**Difficulty: Medium** ⭐⭐

### Step 2.1: Install Capacitor Core Packages
**What:** Add Capacitor to your project.

```powershell
npm install @capacitor/core @capacitor/cli
```

---

### Step 2.2: Initialize Capacitor
**What:** Set up Capacitor configuration.

```powershell
npx cap init
```

**You'll be asked these questions:**
1. **App name:** `Sync App` (or your preferred name)
2. **App ID:** `com.syncapp.mobile` (use reverse domain format)
3. **Web directory:** `dist` (where your build files go)

**What this creates:**
- `capacitor.config.ts` - main config file
- Updates your project structure

---

### Step 2.3: Configure Capacitor Settings
**What:** Edit the config file for your app.

**File to edit:** `capacitor.config.ts`

**Replace the entire file with this:**

```typescript
import { CapacitorConfig } from '@capacitor/core';

const config: CapacitorConfig = {
  appId: 'com.syncapp.mobile',
  appName: 'Sync App',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    iosScheme: 'https',
    hostname: 'app.syncapp.com', // Your domain
    // For development, allow cleartext (remove in production)
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#6366f1', // Indigo color from your theme
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
```

**Save the file.**

---

### Step 2.4: Add iOS Platform
**What:** Create iOS app structure.

**Prerequisites:**
- Mac computer with Xcode installed (for iOS development)
- If on Windows, skip iOS steps for now or use cloud build service

```powershell
# Install iOS platform
npm install @capacitor/ios

# Add iOS to your project
npx cap add ios
```

**What this creates:**
- `ios/` folder with Xcode project
- Native iOS app structure

---

### Step 2.5: Add Android Platform
**What:** Create Android app structure.

**Prerequisites:**
- Android Studio installed
- Java Development Kit (JDK) 11 or higher

```powershell
# Install Android platform
npm install @capacitor/android

# Add Android to your project
npx cap add android
```

**What this creates:**
- `android/` folder with Android Studio project
- Native Android app structure

---

### Step 2.6: Update package.json Scripts
**What:** Add helpful commands for mobile development.

**File to edit:** `package.json`

**Add these scripts to the `"scripts"` section:**

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    
    "mobile:sync": "npm run build && npx cap sync",
    "mobile:ios": "npm run mobile:sync && npx cap open ios",
    "mobile:android": "npm run mobile:sync && npx cap open android",
    "mobile:update": "npm run build && npx cap copy",
    "mobile:live-reload": "npx cap run android --livereload --external"
  }
}
```

**Save the file.**

---

### Step 2.7: Fix Web App for Mobile
**What:** Make your web app work better on mobile devices.

#### 2.7a: Update index.html
**File to edit:** `index.html`

**Add these meta tags inside `<head>` tag:**

```html
<!-- Mobile optimization -->
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="theme-color" content="#6366f1">

<!-- Prevent text size adjustment on mobile -->
<meta name="format-detection" content="telephone=no">
```

---

#### 2.7b: Create Mobile Detection Hook
**What:** Know when app is running as native mobile vs web.

**Create new file:** `src/hooks/usePlatform.ts`

```typescript
import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

export const usePlatform = () => {
  const [platform, setPlatform] = useState({
    isNative: Capacitor.isNativePlatform(),
    isIOS: Capacitor.getPlatform() === 'ios',
    isAndroid: Capacitor.getPlatform() === 'android',
    isWeb: Capacitor.getPlatform() === 'web',
    platform: Capacitor.getPlatform()
  });

  return platform;
};
```

**Save the file.**

---

#### 2.7c: Update Supabase Config for Mobile
**File to edit:** `src/lib/supabase.ts`

**Find the supabase client creation and update it:**

```typescript
import { createClient } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Mobile-optimized configuration
const supabaseConfig = {
  auth: {
    // Use native storage on mobile, localStorage on web
    storage: Capacitor.isNativePlatform() 
      ? undefined // Will use secure native storage
      : window.localStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: !Capacitor.isNativePlatform() // Only on web
  }
};

export const supabase = createClient(supabaseUrl!, supabaseAnonKey!, supabaseConfig);
```

**Save the file.**

---

### Step 2.8: Build and Sync
**What:** Build your web app and copy files to mobile platforms.

```powershell
# Build web app and sync to mobile
npm run mobile:sync
```

**What this does:**
1. Runs `vite build` to create production files
2. Copies files to `ios/` and `android/` folders
3. Updates native projects with latest code

---

### Step 2.9: Test on Android Emulator
**What:** See your app running as Android app.

**Open Android Studio:**
```powershell
npm run mobile:android
```

**This will:**
1. Open Android Studio
2. Show your project
3. Click the green "Run" button (▶️)
4. Select an emulator or connected device
5. Your app will launch!

**First time setup:**
- Android Studio may ask to install SDK components - click "Install"
- May take 10-15 minutes for first build
- Emulator startup takes 2-3 minutes

---

### Step 2.10: Test on iOS Simulator (Mac only)
**What:** See your app running as iOS app.

```powershell
npm run mobile:ios
```

**This will:**
1. Open Xcode
2. Show your project
3. Select a simulator (iPhone 14, etc.)
4. Click the "Run" button (▶️)
5. Your app will launch!

---

### ✅ Phase 2 Checkpoint
**You should now have:**
- ✅ Capacitor installed and configured
- ✅ iOS and Android projects created
- ✅ App running in emulator/simulator
- ✅ Web app still works in browser

**Common Issues:**
- **Build fails:** Run `npm run build` alone first to see errors
- **Android Studio not found:** Install from https://developer.android.com/studio
- **Xcode errors:** Update Xcode to latest version

---

## 🔗 Phase 2.5: Supabase Mobile Coordination Layer
**Time Estimate: 3-4 hours**  
**Difficulty: Medium** ⭐⭐

> **Why this matters:** The basic Supabase config from Phase 2.7c works, but for production mobile apps you need secure token storage, proper session persistence, and coordinated push notification handling.

### Step 2.5.1: Install Capacitor Secure Storage
**What:** Store authentication tokens securely on native devices.

```powershell
npm install @capacitor/preferences
```

**What this does:** Provides encrypted storage on iOS (Keychain) and Android (EncryptedSharedPreferences).

---

### Step 2.5.2: Create Enhanced Supabase Client
**What:** Replace the basic config with production-ready mobile setup.

**File to edit:** `src/lib/supabase.ts`

**Replace entire file with:**

```typescript
import { createClient } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Custom storage adapter for mobile secure storage
const CapacitorStorage = {
  async getItem(key: string): Promise<string | null> {
    if (!Capacitor.isNativePlatform()) {
      return localStorage.getItem(key);
    }
    const { value } = await Preferences.get({ key });
    return value;
  },
  async setItem(key: string, value: string): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      localStorage.setItem(key, value);
      return;
    }
    await Preferences.set({ key, value });
  },
  async removeItem(key: string): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      localStorage.removeItem(key);
      return;
    }
    await Preferences.remove({ key });
  }
};

// Mobile-optimized Supabase configuration
const supabaseConfig = {
  auth: {
    storage: CapacitorStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: !Capacitor.isNativePlatform(),
    // Mobile-specific: Don't use URL fragments for auth
    flowType: Capacitor.isNativePlatform() ? 'pkce' : 'implicit',
    // Longer storage lifetime on mobile
    storageKey: 'sb-auth-token'
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      'x-client-platform': Capacitor.getPlatform()
    }
  }
};

export const supabase = createClient(supabaseUrl!, supabaseAnonKey!, supabaseConfig);

// Export platform detection
export const isNativePlatform = Capacitor.isNativePlatform();
export const platform = Capacitor.getPlatform();
```

**Save the file.**

---

### Step 2.5.3: Create Push Token Registration Hook
**What:** Automatically register device for push notifications when user logs in.

**Create new file:** `src/hooks/usePushNotifications.ts`

```typescript
import { useEffect, useState } from 'react';
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

export const usePushNotifications = () => {
  const [isRegistered, setIsRegistered] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const user = useAuthStore(state => state.user);

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !user?.id) {
      return;
    }

    const registerPushToken = async () => {
      try {
        // Request permission
        const permission = await PushNotifications.requestPermissions();
        
        if (permission.receive === 'granted') {
          // Register with platform (FCM/APNS)
          await PushNotifications.register();
          
          // Listen for token
          PushNotifications.addListener('registration', async (tokenData) => {
            console.log('\u2705 Push token received:', tokenData.value);
            setToken(tokenData.value);
            
            // Save to Supabase
            await supabase
              .from('push_tokens')
              .upsert({
                user_id: user.id,
                token: tokenData.value,
                platform: Capacitor.getPlatform(),
                updated_at: new Date().toISOString()
              }, {
                onConflict: 'user_id,platform'
              });
            
            setIsRegistered(true);
          });

          // Listen for registration errors
          PushNotifications.addListener('registrationError', (error) => {
            console.error('\u274c Push registration error:', error);
          });
        }
      } catch (error) {
        console.error('\u274c Failed to register push notifications:', error);
      }
    };

    registerPushToken();

    // Cleanup
    return () => {
      PushNotifications.removeAllListeners();
    };
  }, [user?.id]);

  return { isRegistered, token };
};
```

**Save the file.**

---

### Step 2.5.4: Integrate Push Hook into Auth Flow
**What:** Automatically call push registration when user logs in.

**File to edit:** `src/components/Layout.tsx`

**Add these imports at top:**

```typescript
import { usePushNotifications } from '../hooks/usePushNotifications';
```

**Add this line inside your component (near the top):**

```typescript
const { isRegistered } = usePushNotifications();
```

**Save the file.**

---

### Step 2.5.5: Test Secure Storage
**What:** Verify tokens are stored securely.

**Steps:**

1. Build and run on device:
```powershell
npm run mobile:sync
npm run mobile:android
```

2. Log in to your app

3. Close app completely (swipe away)

4. Reopen app - you should still be logged in!

5. Check logs for:
```
✅ Push token received: [token]
✅ Token saved to Supabase
```

---

### ✅ Phase 2.5 Checkpoint
**You should now have:**
- ✅ Secure token storage (iOS Keychain / Android Encrypted Preferences)
- ✅ Persistent sessions across app restarts
- ✅ Automatic push token registration
- ✅ Supabase client optimized for mobile
- ✅ Platform detection utilities

**Why this matters:**
- Web localStorage is NOT secure on mobile
- iOS requires Keychain for sensitive data (App Store requirement)
- Automatic token registration = less code to maintain
- PKCE flow is more secure than implicit flow on mobile

---

## 💾 Phase 3: Offline Mode (Enhanced)
**Time Estimate: 8-10 hours**  
**Difficulty: Medium-Hard** ⭐⭐⭐

> **Enhanced:** This phase now includes vite-plugin-pwa for production builds AND Zustand persistence for offline data sync.

### Step 3.1: Install Required Packages
**What:** Add tools for offline functionality.

```powershell
# PWA and service worker tools
npm install vite-plugin-pwa workbox-window -D
npm install localforage
npm install @capacitor/network

# Zustand persistence for offline data
npm install zustand-persist
```

**What each package does:**
- `vite-plugin-pwa`: Automatic service worker generation for production
- `workbox-window`: Google's service worker tools (caching)
- `localforage`: Simple offline storage (better than localStorage)
- `@capacitor/network`: Detect online/offline status
- `zustand-persist`: Persist Zustand store data offline

---

### Step 3.1a: Configure Vite PWA Plugin
**What:** Automatically generate production-ready service worker.

**File to edit:** `vite.config.ts`

**Add import at top:**

```typescript
import { VitePWA } from 'vite-plugin-pwa';
```

**Update plugins array:**

```typescript
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'robots.txt', 'apple-touch-icon.png'],
      manifest: {
        name: 'Sync App',
        short_name: 'Sync',
        description: 'Discover local businesses, reviews, and offers',
        theme_color: '#6366f1',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 // 24 hours
              },
              networkTimeoutSeconds: 10
            }
          },
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'supabase-storage-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              }
            }
          }
        ]
      },
      devOptions: {
        enabled: false // Disable in dev for faster HMR
      }
    })
  ],
  // rest of config...
});
```

**Save the file.**

---

### Step 3.1b: Add Zustand Persistence to Auth Store
**What:** Keep user logged in even when offline.

**File to edit:** `src/store/authStore.ts`

**Add import at top:**

```typescript
import { persist } from 'zustand/middleware';
```

**Wrap your store with persist middleware:**

**Before:**
```typescript
export const useAuthStore = create<AuthState>((set) => ({
  // your state...
}));
```

**After:**
```typescript
export const useAuthStore = create<AuthState>(
  persist(
    (set) => ({
      // your existing state...
    }),
    {
      name: 'auth-storage', // unique name for storage key
      getStorage: () => localStorage, // or localforage for mobile
      partialize: (state) => ({
        user: state.user,
        // Only persist essential data, not functions
      })
    }
  )
);
```

**Save the file.**

---

### Step 3.1c: Create Offline-First Zustand Store
**What:** Example store that automatically syncs with Supabase when online.

**Create new file:** `src/store/offlineBusinessStore.ts`

```typescript
import create from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';
import localforage from 'localforage';

interface Business {
  id: string;
  business_name: string;
  // ... other fields
}

interface OfflineBusinessState {
  businesses: Business[];
  lastSync: string | null;
  isOnline: boolean;
  fetchBusinesses: () => Promise<void>;
  syncToServer: () => Promise<void>;
}

export const useOfflineBusinessStore = create<OfflineBusinessState>(
  persist(
    (set, get) => ({
      businesses: [],
      lastSync: null,
      isOnline: navigator.onLine,

      fetchBusinesses: async () => {
        try {
          const { data, error } = await supabase
            .from('businesses')
            .select('*')
            .limit(50);

          if (error) throw error;

          set({
            businesses: data || [],
            lastSync: new Date().toISOString(),
            isOnline: true
          });
        } catch (error) {
          console.log('📦 Using cached businesses (offline)');
          set({ isOnline: false });
        }
      },

      syncToServer: async () => {
        // Implement sync logic here
        console.log('🔄 Syncing local changes to server...');
      }
    }),
    {
      name: 'offline-businesses',
      getStorage: () => localforage // Use localforage for mobile
    }
  )
);
```

**Save the file.**

**How to use in components:**

```typescript
import { useOfflineBusinessStore } from '../store/offlineBusinessStore';

function BusinessList() {
  const { businesses, isOnline, fetchBusinesses } = useOfflineBusinessStore();

  useEffect(() => {
    fetchBusinesses(); // Automatically uses cache if offline
  }, []);

  return (
    <div>
      {!isOnline && <div className="offline-banner">Viewing cached data</div>}
      {businesses.map(business => (
        <div key={business.id}>{business.business_name}</div>
      ))}
    </div>
  );
}
```

---

### Step 3.2: Create Service Worker (Manual Fallback)
**What:** A background script that caches your app for offline use.

**Create new file:** `public/service-worker.js`

```javascript
// Service Worker for Offline Support
const CACHE_NAME = 'sync-app-v1';
const RUNTIME_CACHE = 'runtime-cache';

// Files to cache immediately
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Install event - cache essential files
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== RUNTIME_CACHE)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // Network first for API calls
  if (event.request.url.includes('/rest/') || event.request.url.includes('/auth/')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clonedResponse = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(event.request, clonedResponse);
          });
          return response;
        })
        .catch(() => {
          return caches.match(event.request);
        })
    );
    return;
  }

  // Cache first for static assets
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then((response) => {
          return caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(event.request, response.clone());
            return response;
          });
        });
      })
  );
});
```

**Save the file.**

---

### Step 3.3: Register Service Worker
**What:** Tell your app to use the service worker.

**Create new file:** `src/utils/serviceWorkerRegistration.ts`

```typescript
export const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js');
      console.log('✅ Service Worker registered:', registration);
      
      // Check for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        newWorker?.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('🔄 New version available. Please refresh.');
            // You can show a toast notification here
          }
        });
      });
    } catch (error) {
      console.error('❌ Service Worker registration failed:', error);
    }
  }
};
```

**Save the file.**

---

### Step 3.4: Create Offline Storage Service
**What:** Store data locally when offline.

**Create new file:** `src/services/offlineStorage.ts`

```typescript
import localforage from 'localforage';

// Configure local storage
localforage.config({
  name: 'SyncApp',
  storeName: 'offline_data',
  description: 'Offline data storage for Sync App'
});

export const offlineStorage = {
  // Save data to offline storage
  async save<T>(key: string, data: T): Promise<void> {
    try {
      await localforage.setItem(key, data);
      console.log(`💾 Saved to offline storage: ${key}`);
    } catch (error) {
      console.error(`❌ Failed to save ${key}:`, error);
      throw error;
    }
  },

  // Get data from offline storage
  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await localforage.getItem<T>(key);
      return data;
    } catch (error) {
      console.error(`❌ Failed to get ${key}:`, error);
      return null;
    }
  },

  // Remove data from offline storage
  async remove(key: string): Promise<void> {
    try {
      await localforage.removeItem(key);
      console.log(`🗑️ Removed from offline storage: ${key}`);
    } catch (error) {
      console.error(`❌ Failed to remove ${key}:`, error);
    }
  },

  // Clear all offline data
  async clear(): Promise<void> {
    try {
      await localforage.clear();
      console.log('🗑️ Cleared all offline storage');
    } catch (error) {
      console.error('❌ Failed to clear storage:', error);
    }
  }
};
```

**Save the file.**

---

### Step 3.5: Create Network Status Hook
**What:** Know when user is online or offline.

**Create new file:** `src/hooks/useNetworkStatus.ts`

```typescript
import { useState, useEffect } from 'react';
import { Network } from '@capacitor/network';

export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(true);
  const [networkType, setNetworkType] = useState<string>('unknown');

  useEffect(() => {
    // Check initial status
    const checkStatus = async () => {
      const status = await Network.getStatus();
      setIsOnline(status.connected);
      setNetworkType(status.connectionType);
    };

    checkStatus();

    // Listen for network changes
    const handler = Network.addListener('networkStatusChange', (status) => {
      console.log(`🌐 Network status changed: ${status.connected ? 'Online' : 'Offline'}`);
      setIsOnline(status.connected);
      setNetworkType(status.connectionType);
    });

    return () => {
      handler.remove();
    };
  }, []);

  return { isOnline, networkType };
};
```

**Save the file.**

---

### Step 3.6: Create Offline-Aware Data Hook
**What:** Automatically handle online/offline data fetching.

**Create new file:** `src/hooks/useOfflineData.ts`

```typescript
import { useState, useEffect } from 'react';
import { useNetworkStatus } from './useNetworkStatus';
import { offlineStorage } from '../services/offlineStorage';

export function useOfflineData<T>(
  key: string,
  fetchFunction: () => Promise<T>,
  options = { cacheTime: 5 * 60 * 1000 } // 5 minutes default
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { isOnline } = useNetworkStatus();

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        if (isOnline) {
          // Fetch fresh data from API
          const freshData = await fetchFunction();
          setData(freshData);
          
          // Save to offline storage
          await offlineStorage.save(key, {
            data: freshData,
            timestamp: Date.now()
          });
        } else {
          // Load from offline storage
          const cached = await offlineStorage.get<{ data: T; timestamp: number }>(key);
          
          if (cached) {
            setData(cached.data);
            console.log(`📦 Loaded from cache: ${key}`);
          } else {
            throw new Error('No offline data available');
          }
        }
        
        setError(null);
      } catch (err) {
        setError(err as Error);
        console.error(`❌ Error loading data for ${key}:`, err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [key, isOnline]);

  return { data, loading, error, isOnline };
}
```

**Save the file.**

---

### Step 3.7: Add Offline Indicator to UI
**What:** Show user when they're offline.

**Create new file:** `src/components/OfflineIndicator.tsx`

```typescript
import React from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

export const OfflineIndicator: React.FC = () => {
  const { isOnline } = useNetworkStatus();

  if (isOnline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-500 text-white py-2 px-4 flex items-center justify-center space-x-2 shadow-lg">
      <WifiOff className="w-5 h-5" />
      <span className="font-medium">You're offline. Some features may be limited.</span>
    </div>
  );
};
```

**Save the file.**

---

### Step 3.8: Update Main App to Use Offline Features
**File to edit:** `src/main.tsx`

**Add these imports at the top:**

```typescript
import { registerServiceWorker } from './utils/serviceWorkerRegistration';
```

**Add this before the `ReactDOM.createRoot` line:**

```typescript
// Register service worker for offline support
if (import.meta.env.PROD) {
  registerServiceWorker();
}
```

**Save the file.**

---

### Step 3.9: Update Layout to Show Offline Indicator
**File to edit:** `src/components/Layout.tsx`

**Add import:**

```typescript
import { OfflineIndicator } from './OfflineIndicator';
```

**Add component at the top of the return statement:**

```typescript
return (
  <>
    <OfflineIndicator />
    {/* rest of your layout */}
  </>
);
```

**Save the file.**

---

### Step 3.10: Test Offline Mode
**What:** Make sure offline features work.

**Steps to test:**

1. Build and sync your app:
```powershell
npm run mobile:sync
```

2. Open in Android/iOS emulator

3. Test offline mode:
   - Open the app
   - Turn off Wi-Fi in emulator settings
   - App should show "You're offline" banner
   - Try navigating - previously viewed pages should work
   - Try features - should gracefully handle no connection

**In browser testing:**
1. Open browser DevTools (F12)
2. Go to Network tab
3. Select "Offline" from dropdown
4. Refresh page - app should still load!

---

### ✅ Phase 3 Checkpoint
**You should now have:**
- ✅ Service worker registered
- ✅ Offline storage configured
- ✅ Network status detection
- ✅ Offline indicator in UI
- ✅ App works without internet

---

## 🔔 Phase 4: Push Notifications
**Time Estimate: 8-10 hours**  
**Difficulty: Hard** ⭐⭐⭐⭐

### Step 4.1: Install Push Notification Plugin
**What:** Add Capacitor plugin for notifications.

```powershell
npm install @capacitor/push-notifications
```

---

### Step 4.2: Configure Push Notifications Service
**What:** Set up notification handling.

**Create new file:** `src/services/pushNotifications.ts`

```typescript
import { PushNotifications, Token, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';

export const pushNotificationService = {
  async initialize(userId: string) {
    // Only works on native platforms
    if (!Capacitor.isNativePlatform()) {
      console.log('Push notifications only work on mobile devices');
      return;
    }

    try {
      // Request permission
      const permission = await PushNotifications.requestPermissions();
      
      if (permission.receive === 'granted') {
        // Register for push notifications
        await PushNotifications.register();
        console.log('✅ Push notifications registered');
      } else {
        console.warn('⚠️ Push notification permission denied');
      }

      // Listen for registration success
      await PushNotifications.addListener('registration', async (token: Token) => {
        console.log('📱 Push registration token:', token.value);
        
        // Save token to Supabase
        await this.saveTokenToDatabase(userId, token.value);
      });

      // Listen for registration errors
      await PushNotifications.addListener('registrationError', (error: any) => {
        console.error('❌ Push registration error:', error);
      });

      // Listen for push notifications received
      await PushNotifications.addListener(
        'pushNotificationReceived',
        (notification: PushNotificationSchema) => {
          console.log('📬 Push notification received:', notification);
          
          // Show toast when app is open
          toast.success(notification.title || 'New notification', {
            description: notification.body
          });
        }
      );

      // Listen for notification actions (when user taps notification)
      await PushNotifications.addListener(
        'pushNotificationActionPerformed',
        (action: ActionPerformed) => {
          console.log('👆 Notification action performed:', action);
          
          // Handle notification tap - navigate to relevant screen
          this.handleNotificationAction(action.notification.data);
        }
      );

    } catch (error) {
      console.error('❌ Push notification initialization error:', error);
    }
  },

  async saveTokenToDatabase(userId: string, token: string) {
    try {
      const platform = Capacitor.getPlatform();
      
      await supabase
        .from('push_tokens')
        .upsert({
          user_id: userId,
          token: token,
          platform: platform,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,platform'
        });
      
      console.log('💾 Push token saved to database');
    } catch (error) {
      console.error('❌ Failed to save push token:', error);
    }
  },

  async removeToken(userId: string) {
    try {
      const platform = Capacitor.getPlatform();
      
      await supabase
        .from('push_tokens')
        .delete()
        .eq('user_id', userId)
        .eq('platform', platform);
      
      console.log('🗑️ Push token removed from database');
    } catch (error) {
      console.error('❌ Failed to remove push token:', error);
    }
  },

  handleNotificationAction(data: any) {
    // Navigate based on notification type
    if (data.type === 'new_review') {
      window.location.href = `/business/${data.businessId}?tab=reviews`;
    } else if (data.type === 'new_follower') {
      window.location.href = `/business/${data.businessId}/followers`;
    } else if (data.type === 'new_offer') {
      window.location.href = `/business/${data.businessId}/offers`;
    }
    // Add more notification types as needed
  }
};
```

**Save the file.**

---

### Step 4.3: Create Push Tokens Table in Supabase
**What:** Store device tokens for sending notifications.

**Go to Supabase Dashboard → SQL Editor → New Query**

**Run this SQL:**

```sql
-- Create push tokens table
CREATE TABLE IF NOT EXISTS push_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, platform)
);

-- Enable RLS
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only manage their own tokens
CREATE POLICY "Users can manage own push tokens"
  ON push_tokens
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Index for faster lookups
CREATE INDEX idx_push_tokens_user_id ON push_tokens(user_id);
CREATE INDEX idx_push_tokens_platform ON push_tokens(platform);
```

**Click "Run" button.**

---

### Step 4.4: Create Supabase Edge Function for Sending Notifications
**What:** Server-side function to send push notifications.

**In Supabase Dashboard:**
1. Go to **Edge Functions**
2. Click **New Function**
3. Name it: `send-push-notification`

**Function code:**

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const EXPO_API_URL = 'https://exp.host/--/api/v2/push/send';
const FCM_API_URL = 'https://fcm.googleapis.com/fcm/send';

serve(async (req) => {
  try {
    const { userId, title, body, data } = await req.json();

    // Get Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user's push tokens
    const { data: tokens, error: tokenError } = await supabaseClient
      .from('push_tokens')
      .select('token, platform')
      .eq('user_id', userId);

    if (tokenError) throw tokenError;
    if (!tokens || tokens.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No push tokens found for user' }),
        { status: 404 }
      );
    }

    // Send notifications to all user's devices
    const results = await Promise.all(
      tokens.map(async ({ token, platform }) => {
        if (platform === 'ios' || platform === 'android') {
          // Use Firebase Cloud Messaging
          const response = await fetch(FCM_API_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `key=${Deno.env.get('FCM_SERVER_KEY')}`
            },
            body: JSON.stringify({
              to: token,
              notification: {
                title,
                body,
                sound: 'default'
              },
              data
            })
          });
          return { platform, status: response.status };
        }
      })
    );

    return new Response(
      JSON.stringify({ success: true, results }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
```

**Deploy the function.**

---

### Step 4.5: Set Up Firebase Cloud Messaging (for Android)
**What:** Required for Android push notifications.

**Steps:**

1. **Go to Firebase Console:** https://console.firebase.google.com/
2. **Create new project** or use existing
3. **Add Android app:**
   - Click "Add app" → Android icon
   - Package name: `com.syncapp.mobile` (same as your app ID)
   - Download `google-services.json`
4. **Get Server Key:**
   - Go to Project Settings → Cloud Messaging
   - Copy "Server Key"
   - Save this for Supabase Edge Function

**Place google-services.json:**
```powershell
# Copy downloaded file to Android project
Copy-Item google-services.json android/app/
```

---

### Step 4.6: Set Up Apple Push Notification Service (for iOS)
**What:** Required for iOS push notifications.

**Prerequisites:** Apple Developer Account ($99/year)

**Steps:**

1. **Log in to Apple Developer:** https://developer.apple.com/account
2. **Create App Identifier:**
   - Go to Certificates, IDs & Profiles
   - Click Identifiers → (+) button
   - Select "App IDs"
   - Bundle ID: `com.syncapp.mobile`
   - Enable "Push Notifications" capability
3. **Create APNs Key:**
   - Go to Keys → (+) button
   - Enable "Apple Push Notifications service (APNs)"
   - Download `.p8` key file
   - Note the Key ID and Team ID
4. **Configure in Xcode:**
   - Open iOS project: `npm run mobile:ios`
   - Select project in navigator
   - Go to Signing & Capabilities
   - Add "Push Notifications" capability

---

### Step 4.7: Update Android Configuration
**File to edit:** `android/app/build.gradle`

**Add at the bottom of the file:**

```gradle
apply plugin: 'com.google.gms.google-services'
```

**File to edit:** `android/build.gradle`

**Add to dependencies block:**

```gradle
dependencies {
    classpath 'com.google.gms:google-services:4.3.15'
}
```

**Save both files.**

---

### Step 4.8: Update iOS Configuration
**File to edit:** `ios/App/App/AppDelegate.swift`

**Add this import at top:**

```swift
import UserNotifications
```

**Add this inside `application(_:didFinishLaunchingWithOptions:)` method:**

```swift
UNUserNotificationCenter.current().delegate = self
```

**Save the file.**

---

### Step 4.9: Initialize Push Notifications in App
**File to edit:** `src/store/authStore.ts`

**Add import:**

```typescript
import { pushNotificationService } from '../services/pushNotifications';
```

**Update the `setUser` method to initialize push notifications:**

```typescript
setUser: (user) => {
  set({ user });
  
  // Initialize push notifications when user logs in
  if (user?.id) {
    pushNotificationService.initialize(user.id);
  }
},
```

**Save the file.**

---

### Step 4.10: Test Push Notifications
**What:** Send a test notification.

**Testing on Android:**

1. Build and install app:
```powershell
npm run mobile:android
```

2. Accept notification permission when prompted

3. Check console logs for token

4. Use this test function in Supabase SQL:
```sql
SELECT extensions.http_post(
  url := 'https://your-project.supabase.co/functions/v1/send-push-notification',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer YOUR_ANON_KEY'
  ),
  body := jsonb_build_object(
    'userId', 'YOUR_USER_ID',
    'title', 'Test Notification',
    'body', 'This is a test push notification!',
    'data', jsonb_build_object('type', 'test')
  )
);
```

**You should receive a notification!**

---

### ✅ Phase 4 Checkpoint
**You should now have:**
- ✅ Push notifications plugin installed
- ✅ Firebase/APNS configured
- ✅ Database table for tokens
- ✅ Edge function for sending notifications
- ✅ App receives and displays notifications

---

## 🎨 Phase 5: App Store Preparation
**Time Estimate: 6-8 hours**  
**Difficulty: Medium** ⭐⭐

### Step 5.1: Create App Icons
**What:** Different sized icons for various devices.

**Required sizes:**
- **Android:** 48x48, 72x72, 96x96, 144x144, 192x192, 512x512 px
- **iOS:** 20x20, 29x29, 40x40, 60x60, 76x76, 83.5x83.5, 1024x1024 px

**Easy way - Use online generator:**

1. Create a **1024x1024 px** PNG icon
2. Go to https://icon.kitchen/
3. Upload your icon
4. Download generated icons
5. Place in correct folders:

**Android icons:**
```powershell
# Replace default icons in these folders:
android/app/src/main/res/mipmap-hdpi/
android/app/src/main/res/mipmap-mdpi/
android/app/src/main/res/mipmap-xhdpi/
android/app/src/main/res/mipmap-xxhdpi/
android/app/src/main/res/mipmap-xxxhdpi/
```

**iOS icons:**
```powershell
# Replace in Xcode:
# Open: npm run mobile:ios
# Assets.xcassets → AppIcon
# Drag and drop icon sizes
```

---

### Step 5.2: Create Splash Screen
**What:** Loading screen shown when app starts.

**Create splash screen image:**
- Size: 2732x2732 px (iOS max size)
- Format: PNG with transparency
- Keep important content in center 1200x1200 px area

**Install splash screen plugin:**
```powershell
npm install @capacitor/splash-screen
```

**Configure splash screen:**

**File to edit:** `capacitor.config.ts`

**Already configured in Phase 2.3, but verify it looks like this:**

```typescript
plugins: {
  SplashScreen: {
    launchShowDuration: 2000,
    backgroundColor: '#6366f1',
    showSpinner: false,
    androidSpinnerStyle: 'large',
    iosSpinnerStyle: 'small'
  }
}
```

**Place splash screen files:**

**Android:**
```powershell
# Create drawable folders if they don't exist
# Place splash.png in:
android/app/src/main/res/drawable/splash.png
android/app/src/main/res/drawable-hdpi/splash.png
android/app/src/main/res/drawable-xhdpi/splash.png
android/app/src/main/res/drawable-xxhdpi/splash.png
android/app/src/main/res/drawable-xxxhdpi/splash.png
```

**iOS:**
```powershell
# Open Xcode
npm run mobile:ios

# In Xcode:
# 1. Select Assets.xcassets
# 2. Add new Image Set named "Splash"
# 3. Drag splash images into 1x, 2x, 3x slots
```

---

### Step 5.3: Configure App Permissions
**What:** Declare what device features your app uses.

#### Android Permissions

**File to edit:** `android/app/src/main/AndroidManifest.xml`

**Add these permissions before `<application>` tag:**

```xml
<!-- Required permissions -->
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
<uses-permission android:name="android.permission.ACCESS_WIFI_STATE" />

<!-- Camera for QR code scanning and photo upload -->
<uses-permission android:name="android.permission.CAMERA" />

<!-- Location for nearby businesses -->
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />

<!-- Storage for offline data and photos -->
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />

<!-- Notifications -->
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
```

**Save the file.**

---

#### iOS Permissions

**File to edit:** `ios/App/App/Info.plist`

**Add these entries:**

```xml
<key>NSCameraUsageDescription</key>
<string>We need camera access to scan QR codes and upload photos</string>

<key>NSPhotoLibraryUsageDescription</key>
<string>We need photo library access to select photos for upload</string>

<key>NSLocationWhenInUseUsageDescription</key>
<string>We need your location to show nearby businesses</string>

<key>NSLocationAlwaysUsageDescription</key>
<string>We need your location to show nearby businesses even when the app is in background</string>
```

**Save the file.**

---

### Step 5.4: Configure App Metadata
**What:** Set app name, version, description.

#### Android Metadata

**File to edit:** `android/app/build.gradle`

**Update these values:**

```gradle
android {
    defaultConfig {
        applicationId "com.syncapp.mobile"
        minSdkVersion 22
        targetSdkVersion 33
        versionCode 1
        versionName "1.0.0"
    }
}
```

**File to edit:** `android/app/src/main/res/values/strings.xml`

```xml
<resources>
    <string name="app_name">Sync App</string>
    <string name="title_activity_main">Sync App</string>
    <string name="package_name">com.syncapp.mobile</string>
    <string name="custom_url_scheme">syncapp</string>
</resources>
```

**Save both files.**

---

#### iOS Metadata

**Open Xcode:**
```powershell
npm run mobile:ios
```

**In Xcode:**
1. Select project in navigator
2. Go to General tab
3. Update:
   - Display Name: `Sync App`
   - Bundle Identifier: `com.syncapp.mobile`
   - Version: `1.0.0`
   - Build: `1`

---

### Step 5.5: Create Privacy Policy
**What:** Required for app stores.

**Create new file:** `public/privacy-policy.html`

```html
<!DOCTYPE html>
<html>
<head>
    <title>Privacy Policy - Sync App</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: Arial, sans-serif; padding: 20px; line-height: 1.6; }
        h1 { color: #6366f1; }
        h2 { color: #333; margin-top: 20px; }
    </style>
</head>
<body>
    <h1>Privacy Policy</h1>
    <p><strong>Last Updated:</strong> January 2025</p>
    
    <h2>1. Information We Collect</h2>
    <p>We collect information you provide when creating an account including email, name, and profile information.</p>
    
    <h2>2. How We Use Your Information</h2>
    <p>We use your information to provide and improve our services, including:</p>
    <ul>
        <li>Account management</li>
        <li>Business discovery and reviews</li>
        <li>Push notifications</li>
        <li>Customer support</li>
    </ul>
    
    <h2>3. Location Data</h2>
    <p>We collect location data to show nearby businesses. You can disable this in your device settings.</p>
    
    <h2>4. Data Security</h2>
    <p>We use industry-standard security measures to protect your data.</p>
    
    <h2>5. Third-Party Services</h2>
    <p>We use Supabase for data storage and authentication, and Google Maps for location services.</p>
    
    <h2>6. Contact Us</h2>
    <p>For privacy questions, contact us at: privacy@syncapp.com</p>
</body>
</html>
```

**Host this file and note the URL (you'll need it for app store submissions).**

---

### Step 5.6: Create Terms of Service
**What:** Legal agreement for app use.

**Create new file:** `public/terms-of-service.html`

```html
<!DOCTYPE html>
<html>
<head>
    <title>Terms of Service - Sync App</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: Arial, sans-serif; padding: 20px; line-height: 1.6; }
        h1 { color: #6366f1; }
        h2 { color: #333; margin-top: 20px; }
    </style>
</head>
<body>
    <h1>Terms of Service</h1>
    <p><strong>Last Updated:</strong> January 2025</p>
    
    <h2>1. Acceptance of Terms</h2>
    <p>By using Sync App, you agree to these terms.</p>
    
    <h2>2. Use License</h2>
    <p>We grant you a non-exclusive license to use the app for personal use.</p>
    
    <h2>3. User Accounts</h2>
    <p>You are responsible for maintaining account security and all activities under your account.</p>
    
    <h2>4. Prohibited Uses</h2>
    <p>You may not use the app for any illegal or unauthorized purpose.</p>
    
    <h2>5. Content</h2>
    <p>You retain ownership of content you post but grant us license to use it.</p>
    
    <h2>6. Termination</h2>
    <p>We may terminate accounts that violate these terms.</p>
    
    <h2>7. Contact</h2>
    <p>Questions about these terms: legal@syncapp.com</p>
</body>
</html>
```

**Save and host this file.**

---

### ✅ Phase 5 Checkpoint
**You should now have:**
- ✅ App icons created (all sizes)
- ✅ Splash screen configured
- ✅ Permissions declared
- ✅ App metadata set
- ✅ Privacy policy and terms created

---

## ⚙️ Phase 5.5: Environment & Build Management
**Time Estimate: 2-3 hours**  
**Difficulty: Medium** ⭐⭐

> **Why this matters:** Professional apps need different configurations for development, staging, and production. This phase sets up environment management and automated build scripts.

### Step 5.5.1: Create Environment Configuration Files
**What:** Separate config for dev, staging, and production builds.

**Create these files:**

**File 1:** `.env.development`
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-dev-anon-key
VITE_APP_ENV=development
VITE_API_BASE_URL=http://localhost:5173
VITE_ENABLE_ANALYTICS=false
VITE_ENABLE_ERROR_TRACKING=false
```

**File 2:** `.env.staging`
```bash
VITE_SUPABASE_URL=https://your-staging-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-staging-anon-key
VITE_APP_ENV=staging
VITE_API_BASE_URL=https://staging.syncapp.com
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_ERROR_TRACKING=true
```

**File 3:** `.env.production`
```bash
VITE_SUPABASE_URL=https://your-prod-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-prod-anon-key
VITE_APP_ENV=production
VITE_API_BASE_URL=https://app.syncapp.com
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_ERROR_TRACKING=true
```

**⚠️ Important: Add to .gitignore!**

**File to edit:** `.gitignore`
```
# Environment files
.env.local
.env.*.local
.env.development.local
.env.staging.local
.env.production.local
```

**Keep .env.development, .env.staging, .env.production in git** (without sensitive keys).
**Use .local versions for actual secrets** (never commit these).

---

### Step 5.5.2: Update Capacitor Config for Multiple Environments
**What:** Dynamic config based on environment.

**File to edit:** `capacitor.config.ts`

**Replace with:**

```typescript
import { CapacitorConfig } from '@capacitor/core';

const getConfig = (): CapacitorConfig => {
  const env = process.env.VITE_APP_ENV || 'development';
  
  const baseConfig: CapacitorConfig = {
    appId: 'com.syncapp.mobile',
    appName: 'Sync App',
    webDir: 'dist',
    server: {
      androidScheme: 'https',
      iosScheme: 'https'
    },
    plugins: {
      SplashScreen: {
        launchShowDuration: 2000,
        backgroundColor: '#6366f1',
        showSpinner: false,
        androidSpinnerStyle: 'large',
        iosSpinnerStyle: 'small'
      },
      PushNotifications: {
        presentationOptions: ['badge', 'sound', 'alert']
      }
    }
  };

  // Environment-specific overrides
  if (env === 'development') {
    baseConfig.server!.hostname = 'localhost';
    baseConfig.server!.cleartext = true; // Allow HTTP in dev
  } else if (env === 'staging') {
    baseConfig.appName = 'Sync App (Staging)';
    baseConfig.server!.hostname = 'staging.syncapp.com';
  } else {
    baseConfig.server!.hostname = 'app.syncapp.com';
  }

  return baseConfig;
};

export default getConfig();
```

**Save the file.**

---

### Step 5.5.3: Create Build Scripts for Different Environments
**What:** One-command builds for each environment.

**File to edit:** `package.json`

**Add these scripts:**

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    
    "build:dev": "vite build --mode development",
    "build:staging": "vite build --mode staging",
    "build:prod": "vite build --mode production",
    
    "mobile:sync": "npm run build && npx cap sync",
    "mobile:sync:dev": "npm run build:dev && npx cap sync",
    "mobile:sync:staging": "npm run build:staging && npx cap sync",
    "mobile:sync:prod": "npm run build:prod && npx cap sync",
    
    "mobile:android:dev": "npm run mobile:sync:dev && npx cap open android",
    "mobile:android:staging": "npm run mobile:sync:staging && npx cap open android",
    "mobile:android:prod": "npm run mobile:sync:prod && npx cap open android",
    
    "mobile:ios:dev": "npm run mobile:sync:dev && npx cap open ios",
    "mobile:ios:staging": "npm run mobile:sync:staging && npx cap open ios",
    "mobile:ios:prod": "npm run mobile:sync:prod && npx cap open ios",
    
    "test:mobile": "npm run test && npm run mobile:sync:dev"
  }
}
```

**Save the file.**

---

### Step 5.5.4: Configure iOS Bundle Identifiers for Environments
**What:** Use different bundle IDs for dev/staging/prod.

**In Xcode:**

1. Open project: `npm run mobile:ios`
2. Select project in navigator
3. Go to **Build Settings** tab
4. Search for "Bundle Identifier"
5. Set up configurations:

**Debug:** `com.syncapp.mobile.dev`  
**Staging:** `com.syncapp.mobile.staging`  
**Release:** `com.syncapp.mobile`

**Why:** This allows you to install dev, staging, and production versions on the same device!

---

### Step 5.5.5: Configure Android Build Variants
**What:** Create build flavors for different environments.

**File to edit:** `android/app/build.gradle`

**Add inside `android {` block:**

```gradle
flavorDimensions "version"
productFlavors {
    dev {
        dimension "version"
        applicationIdSuffix ".dev"
        versionNameSuffix "-dev"
        resValue "string", "app_name", "Sync Dev"
    }
    staging {
        dimension "version"
        applicationIdSuffix ".staging"
        versionNameSuffix "-staging"
        resValue "string", "app_name", "Sync Staging"
    }
    prod {
        dimension "version"
        resValue "string", "app_name", "Sync App"
    }
}
```

**Save the file.**

**Now you can build:**
```powershell
# Development build
cd android
./gradlew assembleDevDebug

# Staging build
./gradlew assembleStagingRelease

# Production build
./gradlew assembleProdRelease
```

---

### Step 5.5.6: Create CI/CD Preparation Script
**What:** Script for automated deployments (future use).

**Create new file:** `scripts/build-mobile.sh` (for Mac/Linux)

```bash
#!/bin/bash

# Mobile build script for CI/CD
# Usage: ./scripts/build-mobile.sh [dev|staging|prod] [ios|android]

set -e # Exit on error

ENV=${1:-dev}
PLATFORM=${2:-android}

echo "🏗️ Building for environment: $ENV, platform: $PLATFORM"

# Build web app
echo "📦 Building web app..."
npm run build:$ENV

# Sync with Capacitor
echo "🔄 Syncing with Capacitor..."
npx cap sync $PLATFORM

if [ "$PLATFORM" = "android" ]; then
  echo "🤖 Building Android app..."
  cd android
  if [ "$ENV" = "prod" ]; then
    ./gradlew assembleProdRelease
  elif [ "$ENV" = "staging" ]; then
    ./gradlew assembleStagingRelease
  else
    ./gradlew assembleDevDebug
  fi
  cd ..
fi

if [ "$PLATFORM" = "ios" ]; then
  echo "🍎 iOS build requires Xcode - opening project..."
  npx cap open ios
fi

echo "✅ Build complete!"
```

**Make executable:**
```powershell
chmod +x scripts/build-mobile.sh
```

---

### Step 5.5.7: Create PowerShell Build Script (for Windows)
**What:** Windows-friendly build automation.

**Create new file:** `scripts/Build-Mobile.ps1`

```powershell
# Mobile build script for Windows
# Usage: .\scripts\Build-Mobile.ps1 -Env dev -Platform android

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet('dev','staging','prod')]
    [string]$Env = 'dev',
    
    [Parameter(Mandatory=$false)]
    [ValidateSet('android','ios')]
    [string]$Platform = 'android'
)

Write-Host "🏗️ Building for environment: $Env, platform: $Platform" -ForegroundColor Cyan

# Build web app
Write-Host "📦 Building web app..." -ForegroundColor Yellow
npm run "build:$Env"

if ($LASTEXITCODE -ne 0) {
    Write-Error "Build failed!"
    exit 1
}

# Sync with Capacitor
Write-Host "🔄 Syncing with Capacitor..." -ForegroundColor Yellow
npx cap sync $Platform

if ($Platform -eq 'android') {
    Write-Host "🤖 Opening Android Studio..." -ForegroundColor Green
    npx cap open android
} elseif ($Platform -eq 'ios') {
    Write-Host "🍎 Opening Xcode..." -ForegroundColor Green
    npx cap open ios
}

Write-Host "✅ Build complete!" -ForegroundColor Green
```

**Usage:**
```powershell
# Build development for Android
.\scripts\Build-Mobile.ps1 -Env dev -Platform android

# Build staging for iOS
.\scripts\Build-Mobile.ps1 -Env staging -Platform ios

# Build production for Android
.\scripts\Build-Mobile.ps1 -Env prod -Platform android
```

---

### ✅ Phase 5.5 Checkpoint
**You should now have:**
- ✅ Environment configuration files (dev, staging, prod)
- ✅ Dynamic Capacitor config
- ✅ Build scripts for each environment
- ✅ iOS build configurations
- ✅ Android build flavors
- ✅ Automated build scripts

**Why this matters:**
- Install dev, staging, and prod on same device
- Easy testing without affecting production
- Automated builds for CI/CD
- Professional development workflow

**Test it:**
```powershell
# Build and open dev version
npm run mobile:android:dev

# Build staging version
npm run mobile:android:staging
```

You should see different app names in your device's app drawer!

---

## 🧪 Phase 6: Testing & Deployment (Enhanced)
**Time Estimate: 12-15 hours**  
**Difficulty: Medium-Hard** ⭐⭐⭐

> **Enhanced:** Now includes Vitest mobile simulation and Playwright cross-platform testing.

### Step 6.0a: Run Vitest in Mobile Simulation Mode
**What:** Test your components before building mobile apps.

**Why this matters:** Catch bugs early! Running tests before `npx cap copy` saves hours of debugging in Android Studio/Xcode.

**File to edit:** `vitest.config.ts`

**Add mobile-specific test environment:**

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    // Mobile-specific settings
    environmentOptions: {
      jsdom: {
        resources: 'usable'
      }
    }
  }
});
```

**Create test setup file:** `src/test/setup.ts`

```typescript
import { vi } from 'vitest';

// Mock Capacitor for tests
vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => false,
    getPlatform: () => 'web',
    isPluginAvailable: () => false
  }
}));

// Mock Capacitor plugins
vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: vi.fn(),
    set: vi.fn(),
    remove: vi.fn()
  }
}));

vi.mock('@capacitor/push-notifications', () => ({
  PushNotifications: {
    requestPermissions: vi.fn(),
    register: vi.fn(),
    addListener: vi.fn(),
    removeAllListeners: vi.fn()
  }
}));

// Set mobile viewport for tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: query === '(max-width: 768px)', // Mobile breakpoint
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn()
  }))
});
```

**Add test command to package.json:**

```json
{
  "scripts": {
    "test:mobile:unit": "vitest run",
    "test:mobile:watch": "vitest watch",
    "test:mobile:pre-build": "vitest run && npm run build:dev"
  }
}
```

**Run tests before mobile build:**

```powershell
# Run unit tests
npm run test:mobile:unit

# If tests pass, build mobile app
npm run mobile:sync:dev
```

---

### Step 6.0b: Configure Playwright for Mobile WebView Testing
**What:** Test actual mobile functionality using Playwright.

**File to edit:** `playwright.config.ts`

**Add mobile device configurations:**

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry'
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    },
    // Mobile device testing
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] }
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] }
    },
    // Tablet testing
    {
      name: 'iPad',
      use: { ...devices['iPad Pro'] }
    }
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI
  }
});
```

**Create mobile-specific E2E test:** `e2e/mobile-flow.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Mobile App Flow', () => {
  test('should work on mobile viewport', async ({ page }) => {
    await page.goto('/');
    
    // Check mobile menu is visible
    await expect(page.locator('[aria-label="Mobile menu"]')).toBeVisible();
    
    // Test touch interactions
    await page.tap('[aria-label="Login"]');
    
    // Check offline indicator (simulate offline)
    await page.context().setOffline(true);
    await expect(page.locator('.offline-banner')).toBeVisible();
    
    // Restore connection
    await page.context().setOffline(false);
  });

  test('should handle business profile on mobile', async ({ page }) => {
    await page.goto('/business/your-test-business-id');
    
    // Check mobile-optimized layout
    const isMobileLayout = await page.evaluate(() => {
      return window.innerWidth <= 768;
    });
    
    expect(isMobileLayout).toBeTruthy();
    
    // Test swipe gestures (if implemented)
    await page.touchscreen.swipe({ x: 100, y: 100 }, { x: 300, y: 100 });
  });
});
```

**Run mobile tests:**

```powershell
# Test on mobile devices
npm run test:e2e -- --project="Mobile Chrome"

# Test on all mobile devices
npm run test:e2e -- --grep mobile
```

---

### Step 6.0c: Pre-Flight Check Script
**What:** Automated checks before app store submission.

**Create new file:** `scripts/preflight-check.sh`

```bash
#!/bin/bash

echo "🚀 Running pre-flight checks for mobile app..."

# Color codes
GREEN='\033[0.32m'
RED='\033[0.31m'
NC='\033[0m' # No Color

FAILED=0

# Check 1: Run unit tests
echo "\n📝 Running unit tests..."
if npm run test:mobile:unit; then
  echo "${GREEN}✅ Unit tests passed${NC}"
else
  echo "${RED}❌ Unit tests failed${NC}"
  FAILED=1
fi

# Check 2: Run TypeScript check
echo "\n🔍 Checking TypeScript..."
if npm run type-check; then
  echo "${GREEN}✅ TypeScript check passed${NC}"
else
  echo "${RED}❌ TypeScript errors found${NC}"
  FAILED=1
fi

# Check 3: Run linter
echo "\n🧹 Running linter..."
if npm run lint; then
  echo "${GREEN}✅ Linting passed${NC}"
else
  echo "${RED}❌ Linting failed${NC}"
  FAILED=1
fi

# Check 4: Build app
echo "\n📦 Building production app..."
if npm run build:prod; then
  echo "${GREEN}✅ Build successful${NC}"
else
  echo "${RED}❌ Build failed${NC}"
  FAILED=1
fi

# Check 5: Verify required files
echo "\n📂 Checking required files..."
REQUIRED_FILES=("dist/index.html" "public/privacy-policy.html" "public/terms-of-service.html")
for file in "${REQUIRED_FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "${GREEN}✅ $file exists${NC}"
  else
    echo "${RED}❌ $file missing${NC}"
    FAILED=1
  fi
done

# Final report
echo "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ $FAILED -eq 0 ]; then
  echo "${GREEN}🎉 All pre-flight checks passed!${NC}"
  echo "You're ready to submit to app stores."
  exit 0
else
  echo "${RED}⚠️  Some checks failed!${NC}"
  echo "Please fix errors before submission."
  exit 1
fi
```

**Make executable:**
```powershell
chmod +x scripts/preflight-check.sh
```

**Run before submission:**
```powershell
# Linux/Mac
./scripts/preflight-check.sh

# Windows (Git Bash)
bash scripts/preflight-check.sh
```

---

### ✅ Phase 6.0 Testing Checkpoint
**You should now have:**
- ✅ Vitest configured for mobile simulation
- ✅ Playwright mobile device testing
- ✅ Pre-flight check script
- ✅ Automated test pipeline

**Best practice workflow:**
```powershell
# 1. Run tests
npm run test:mobile:unit

# 2. Run E2E tests
npm run test:e2e -- --project="Mobile Chrome"

# 3. Pre-flight check
./scripts/preflight-check.sh

# 4. If all pass, build mobile app
npm run mobile:sync:prod
```

---

### Step 6.1: Build Signed Android App (Release)
**What:** Create production-ready Android app file (.apk or .aab).

#### Generate Signing Key

```powershell
# Navigate to android folder
cd android

# Generate keystore (one-time setup)
keytool -genkey -v -keystore sync-app-release.keystore -alias sync-app -keyalg RSA -keysize 2048 -validity 10000

# Answer the questions:
# - Password: (create strong password, save it!)
# - Name: Your name
# - Organization: Your company
# - etc.
```

**Save the keystore file and password securely!**

---

#### Configure Signing

**Create new file:** `android/key.properties`

```properties
storePassword=YOUR_KEYSTORE_PASSWORD
keyPassword=YOUR_KEY_PASSWORD
keyAlias=sync-app
storeFile=sync-app-release.keystore
```

**⚠️ Important: Add to .gitignore!**

**File to edit:** `.gitignore`

```
# Add these lines
android/key.properties
android/sync-app-release.keystore
```

---

**File to edit:** `android/app/build.gradle`

**Add before `android {` block:**

```gradle
def keystoreProperties = new Properties()
def keystorePropertiesFile = rootProject.file('key.properties')
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}
```

**Add inside `android {` block:**

```gradle
signingConfigs {
    release {
        keyAlias keystoreProperties['keyAlias']
        keyPassword keystoreProperties['keyPassword']
        storeFile keystoreProperties['storeFile'] ? file(keystoreProperties['storeFile']) : null
        storePassword keystoreProperties['storePassword']
    }
}

buildTypes {
    release {
        signingConfig signingConfigs.release
        minifyEnabled true
        proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
    }
}
```

**Save the file.**

---

#### Build Release APK

```powershell
# From project root
npm run build
npx cap sync android

# Navigate to android folder
cd android

# Build release APK
./gradlew assembleRelease

# Or build AAB (for Play Store)
./gradlew bundleRelease
```

**Output files:**
- APK: `android/app/build/outputs/apk/release/app-release.apk`
- AAB: `android/app/build/outputs/bundle/release/app-release.aab`

---

### Step 6.2: Build Signed iOS App (Release)
**What:** Create production iOS app for App Store.

**Prerequisites:**
- Mac with Xcode
- Apple Developer Account ($99/year)
- App Store Connect account set up

---

#### Configure Signing in Xcode

```powershell
# Open iOS project
npm run mobile:ios
```

**In Xcode:**

1. **Select project** in navigator
2. **Go to Signing & Capabilities** tab
3. **Enable "Automatically manage signing"**
4. **Select your Team** from dropdown
5. **Bundle Identifier:** `com.syncapp.mobile`
6. **Add capabilities:**
   - Push Notifications
   - Background Modes (check "Remote notifications")

---

#### Create Archive

**In Xcode:**

1. **Select device:** Generic iOS Device (or Any iOS Device)
2. **Menu:** Product → Archive
3. **Wait** for archive to complete (5-10 minutes)
4. **Organizer** window opens automatically
5. **Select** your archive
6. **Click "Distribute App"**
7. **Choose "App Store Connect"**
8. **Follow wizard:**
   - Upload (for TestFlight and App Store)
   - Choose automatic signing
   - Click "Upload"

**Wait 10-30 minutes for processing.**

---

### Step 6.3: Create Google Play Store Listing
**What:** Publish your Android app.

**Go to:** https://play.google.com/console

**Steps:**

1. **Create Application:**
   - Click "Create app"
   - App name: Sync App
   - Language: English (US)
   - App or game: App
   - Free or paid: Free
   - Accept declarations

2. **Store Listing:**
   - **App name:** Sync App
   - **Short description:** (80 chars max)
     "Discover local businesses, read reviews, collect offers, and connect with your community."
   - **Full description:** (4000 chars max)
     ```
     Sync App is your local business discovery companion.
     
     Features:
     • Discover nearby businesses
     • Read and write reviews
     • Collect exclusive offers
     • Check in at locations
     • Follow your favorite businesses
     • Get push notifications for new deals
     • Works offline
     
     Whether you're looking for a new restaurant, retail store, or service provider,
     Sync App helps you find the best local options with verified reviews from real customers.
     ```
   - **App icon:** Upload 512x512 PNG
   - **Screenshots:** Upload at least 2 screenshots per device type
   - **Privacy policy URL:** Your privacy policy link

3. **Content Rating:**
   - Complete questionnaire
   - Typical rating: Everyone or Teen

4. **App Content:**
   - Ads: Select if you show ads
   - In-app purchases: Select if applicable

5. **Select Countries:**
   - Choose all countries or specific ones

6. **Create Release:**
   - Go to Production → Create new release
   - Upload AAB file
   - Release name: 1.0.0
   - Release notes: "Initial release"
   - Click "Review release"
   - Click "Start rollout to Production"

**Review time: 1-7 days**

---

### Step 6.4: Create Apple App Store Listing
**What:** Publish your iOS app.

**Go to:** https://appstoreconnect.apple.com/

**Steps:**

1. **Create App:**
   - Click (+) → New App
   - Platform: iOS
   - Name: Sync App
   - Primary Language: English (US)
   - Bundle ID: Select `com.syncapp.mobile`
   - SKU: `sync-app-001`
   - User Access: Full Access

2. **App Information:**
   - **Subtitle:** "Discover Local Businesses"
   - **Privacy Policy URL:** Your policy URL
   - **Category:** Primary: Lifestyle, Secondary: Travel
   - **Content Rights:** Check if applicable

3. **Pricing and Availability:**
   - Price: Free
   - Availability: All countries

4. **Prepare for Submission:**
   - **Version:** 1.0.0
   - **Copyright:** 2025 Your Company
   - **Age Rating:** Complete questionnaire
   - **Description:** (Same as Google Play)
   - **Keywords:** business, local, reviews, offers, checkin, discover
   - **Support URL:** Your website
   - **Marketing URL:** Your website

5. **Screenshots:**
   - 6.5" iPhone: At least 3 screenshots
   - 5.5" iPhone: At least 3 screenshots
   - 12.9" iPad Pro: At least 3 screenshots (if supporting iPad)

6. **Build:**
   - Click (+) next to Build
   - Select your uploaded build
   - Export Compliance: Answer questions

7. **Submit for Review:**
   - Click "Add for Review"
   - Click "Submit to App Review"

**Review time: 1-3 days (typically faster than Android)**

---

### Step 6.5: TestFlight Distribution (iOS Beta Testing)
**What:** Let testers try your app before public release.

**In App Store Connect:**

1. **Go to TestFlight tab**
2. **Internal Testing:**
   - Add testers (up to 100)
   - Send invite
   - They install TestFlight app
   - They test your app

3. **External Testing:**
   - Create group
   - Add testers (up to 10,000)
   - Submit for review
   - Share public link

**Testers can now install and test your app!**

---

### Step 6.6: Google Play Internal Testing
**What:** Let testers try Android app before public release.

**In Play Console:**

1. **Go to Testing → Internal testing**
2. **Create release:**
   - Upload AAB
   - Release notes
3. **Add testers:**
   - Email addresses or Google Groups
4. **Copy testing link**
5. **Send to testers**

**Testers can install via link (no review needed).**

---

### ✅ Phase 6 Checkpoint
**You should now have:**
- ✅ Signed Android APK/AAB
- ✅ Signed iOS Archive
- ✅ Play Store listing created
- ✅ App Store listing created
- ✅ Beta testing set up
- ✅ Apps submitted for review

---

## 🔮 Phase 7: Future React Native Migration
**Time Estimate: 40-80 hours (when ready)**  
**Difficulty: Hard** ⭐⭐⭐⭐

### Why Consider React Native Later?

**Current (Capacitor) Pros:**
- ✅ Fast to deploy
- ✅ Reuses existing code
- ✅ Easy to maintain

**Current Cons:**
- ❌ Not "truly native" UI
- ❌ Some performance limitations
- ❌ Limited access to latest native APIs

**React Native Pros:**
- ✅ Truly native UI components
- ✅ Better performance
- ✅ More native APIs
- ✅ Larger ecosystem

**React Native Cons:**
- ❌ More code changes needed
- ❌ Steeper learning curve
- ❌ More maintenance

---

### Migration Strategy (High-Level)

#### What Can Be Reused (90%+)
- ✅ All Supabase logic
- ✅ All Zustand stores
- ✅ All business logic
- ✅ All API calls
- ✅ Most hooks
- ✅ Type definitions

#### What Needs Rewriting
- ❌ UI components (React DOM → React Native)
- ❌ Styling (TailwindCSS → NativeWind or StyleSheet)
- ❌ Navigation (React Router → React Navigation)
- ❌ Some platform-specific code

---

### Step-by-Step Migration Plan

#### Phase 7.1: Set Up React Native Project

```powershell
# Create new React Native project
npx react-native init SyncAppNative --template react-native-template-typescript

# Install NativeWind for Tailwind-like styling
npm install nativewind
npm install --dev tailwindcss
```

---

#### Phase 7.2: Copy Business Logic

```powershell
# Copy these folders (unchanged):
cp -r src/services SyncAppNative/src/
cp -r src/store SyncAppNative/src/
cp -r src/hooks SyncAppNative/src/
cp -r src/types SyncAppNative/src/
cp -r src/utils SyncAppNative/src/
cp -r src/lib SyncAppNative/src/
```

**These should work with minimal changes!**

---

#### Phase 7.3: Recreate Components

**Example conversion:**

**Before (React DOM):**
```typescript
import React from 'react';

export const Button = ({ children, onClick }) => (
  <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg" onClick={onClick}>
    {children}
  </button>
);
```

**After (React Native):**
```typescript
import React from 'react';
import { TouchableOpacity, Text } from 'react-native';

export const Button = ({ children, onPress }) => (
  <TouchableOpacity 
    className="px-4 py-2 bg-indigo-600 rounded-lg"
    onPress={onPress}
  >
    <Text className="text-white">{children}</Text>
  </TouchableOpacity>
);
```

**Key changes:**
- `div` → `View`
- `button` → `TouchableOpacity`
- `span/p` → `Text`
- `onClick` → `onPress`
- `img` → `Image`

---

#### Phase 7.4: Update Navigation

**Install React Navigation:**
```powershell
npm install @react-navigation/native @react-navigation/native-stack
npm install react-native-screens react-native-safe-area-context
```

**Convert routes:**

**Before (React Router):**
```typescript
<Route path="/business/:businessId" element={<BusinessProfile />} />
```

**After (React Navigation):**
```typescript
<Stack.Screen name="BusinessProfile" component={BusinessProfile} />
```

---

#### Phase 7.5: Test Incrementally

**Strategy:**
1. Start with one simple screen
2. Make it work perfectly
3. Move to next screen
4. Reuse patterns
5. Build component library

**Timeline:**
- Simple screens: 2-4 hours each
- Complex screens: 4-8 hours each
- ~30 screens × 3 hours avg = 90 hours

---

### When to Migrate?

**Stay with Capacitor if:**
- ✅ Current performance is acceptable
- ✅ UI is good enough
- ✅ Team is small
- ✅ Updates are frequent

**Migrate to React Native if:**
- ✅ Need better performance
- ✅ Need truly native feel
- ✅ Have development bandwidth
- ✅ App is stable and feature-complete
- ✅ Have React Native expertise

**Recommendation:** Start with Capacitor (this plan), migrate to React Native after 6-12 months if needed.

---

## ⏱️ Timeline & Effort Estimates

### For a No-Coder Working Part-Time

| Phase | Tasks | Estimated Time | Difficulty |
|-------|-------|----------------|------------|
| **Phase 1** | Setup & Preparation | 2-3 hours | ⭐ Easy |
| **Phase 2** | Capacitor Integration | 4-6 hours | ⭐⭐ Medium |
| **Phase 2.5** | Supabase Mobile Coordination | 3-4 hours | ⭐⭐ Medium |
| **Phase 3** | Offline Mode (Enhanced) | 8-10 hours | ⭐⭐⭐ Medium-Hard |
| **Phase 4** | Push Notifications | 8-10 hours | ⭐⭐⭐⭐ Hard |
| **Phase 5** | App Store Prep | 6-8 hours | ⭐⭐ Medium |
| **Phase 5.5** | Environment & Build Mgmt | 2-3 hours | ⭐⭐ Medium |
| **Phase 6** | Testing & Deployment (Enhanced) | 12-15 hours | ⭐⭐⭐ Medium-Hard |
| **Total** | **Production-Ready Mobile App** | **45-59 hours** | |
| **Phase 7** | React Native (Optional) | 40-80 hours | ⭐⭐⭐⭐ Hard |

---

### Realistic Schedule

**Working 2 hours/day:**
- Week 1-2: Phases 1-2 (Setup + Capacitor)
- Week 3: Phase 2.5 (Supabase Mobile Coordination)
- Week 4: Phase 3 (Enhanced Offline Mode with PWA)
- Week 5-6: Phase 4 (Push Notifications)
- Week 7: Phase 5 (App Store Prep)
- Week 8: Phase 5.5 (Environment & Build Management)
- Week 9-10: Phase 6 (Enhanced Testing + Deployment)

**Total: 8-10 weeks to production launch**

**Key Enhancements Over Basic Plan:**
- ✅ Secure token storage (iOS Keychain/Android Encrypted Storage)
- ✅ vite-plugin-pwa for automatic service workers
- ✅ Zustand persistence for offline data
- ✅ Multi-environment builds (dev/staging/prod)
- ✅ Vitest + Playwright mobile testing
- ✅ Automated pre-flight checks

---

## 🚨 Troubleshooting Guide

### Common Issues & Solutions

#### Issue: "Capacitor command not found"
**Solution:**
```powershell
npm install -g @capacitor/cli
# Then run: npx cap --version
```

---

#### Issue: Build fails with TypeScript errors
**Solution:**
```powershell
# Fix TypeScript errors first
npm run type-check

# Then rebuild
npm run build
```

---

#### Issue: Android build fails
**Solution:**
```powershell
# Clean build
cd android
./gradlew clean

# Rebuild
./gradlew assembleDebug
```

---

#### Issue: iOS build fails
**Solution:**
1. Open Xcode
2. Product → Clean Build Folder
3. Close Xcode
4. Delete derived data:
```powershell
rm -rf ~/Library/Developer/Xcode/DerivedData
```
5. Reopen and rebuild

---

#### Issue: Push notifications not working
**Solution:**
1. Check permissions granted
2. Verify Firebase/APNS setup
3. Check device token in logs
4. Test with manual notification
5. Verify Edge Function works

---

#### Issue: Offline mode not working
**Solution:**
1. Check service worker registered:
```javascript
navigator.serviceWorker.getRegistrations().then(console.log)
```
2. Verify cache storage:
```javascript
caches.keys().then(console.log)
```
3. Check network status detection works

---

#### Issue: App crashes on launch
**Solution:**
1. Check console logs in Xcode/Android Studio
2. Verify all native dependencies installed
3. Run `npx cap sync` again
4. Check capacitor.config.ts is correct

---

## 📚 Additional Resources

### Documentation
- **Capacitor:** https://capacitorjs.com/docs
- **Supabase:** https://supabase.com/docs
- **React Native:** https://reactnative.dev/docs/getting-started
- **NativeWind:** https://www.nativewind.dev/

### Video Tutorials
- Capacitor Crash Course: YouTube search "Capacitor tutorial 2024"
- Push Notifications: "Capacitor push notifications tutorial"
- App Store Submission: "Submit iOS app to App Store 2024"

### Communities
- Capacitor Discord: https://ionic.link/discord
- Supabase Discord: https://discord.supabase.com/
- React Native Discord: https://www.reactiflux.com/

### Tools
- **Icon Generator:** https://icon.kitchen/
- **Screenshot Tool:** https://shotbot.io/
- **App Store Assets:** https://www.figma.com/templates/app-store-assets/

---

## ✅ Final Checklist

Before submitting to app stores:

### Functionality
- [ ] All features work on mobile
- [ ] Offline mode works
- [ ] Push notifications work
- [ ] No console errors
- [ ] Smooth scrolling
- [ ] Fast load times

### UI/UX
- [ ] Responsive on all screen sizes
- [ ] Touch targets large enough (44x44 px min)
- [ ] Forms work with mobile keyboard
- [ ] Back button works correctly
- [ ] Loading states shown
- [ ] Error messages clear

### Content
- [ ] All images optimized
- [ ] Text readable on mobile
- [ ] Privacy policy accessible
- [ ] Terms of service accessible
- [ ] Contact information provided

### Store Listing
- [ ] App icons all sizes
- [ ] Screenshots (3+ per device)
- [ ] Compelling description
- [ ] Keywords added
- [ ] Support URL works
- [ ] Privacy policy URL works

### Testing
- [ ] Tested on real Android device
- [ ] Tested on real iOS device
- [ ] Tested offline mode
- [ ] Tested push notifications
- [ ] Beta testers gave feedback
- [ ] No critical bugs

### Legal
- [ ] Privacy policy reviewed
- [ ] Terms of service reviewed
- [ ] All permissions justified
- [ ] Content ratings correct
- [ ] Export compliance answered (iOS)

---

## 🎉 Congratulations!

You now have a comprehensive roadmap to convert your React + Supabase web app into a cross-platform mobile app!

**Next Steps:**
1. Start with Phase 1 today
2. Work through phases systematically
3. Test frequently
4. Ask for help in communities when stuck
5. Celebrate small wins

**Remember:**
- Take breaks
- Don't rush
- Learn as you go
- It's okay to ask for help
- You've got this! 💪

---

**Questions?**
- Re-read the relevant phase
- Check troubleshooting section
- Search documentation
- Ask in Discord communities
- Hire a developer for specific hard parts

**Good luck with your mobile app launch! 🚀**
