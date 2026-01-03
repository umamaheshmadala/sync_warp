# Story 7.2.1: Secure Storage Implementation ⚪ PLANNED

**Epic**: EPIC 7.2 - Supabase Mobile Security & Coordination  
**Story Points**: 5  
**Estimated Time**: 3-4 hours  
**Dependencies**: Story 7.1.6 complete (Supabase mobile config)

---

## 📋 Overview

**What**: Implement secure storage for sensitive data using iOS Keychain and Android EncryptedSharedPreferences via Capacitor Storage plugin.

**Why**: Storing auth tokens and sensitive data in plain browser storage on mobile is insecure. Native platforms provide secure, encrypted storage (Keychain on iOS, EncryptedSharedPreferences on Android) that is required for App Store approval.

**User Value**: Users' authentication tokens and personal data are protected with device-level encryption, meeting security best practices and platform requirements.

---

## 🎯 Acceptance Criteria

- [ ] @capacitor/preferences plugin installed and configured
- [ ] Secure storage wrapper created (`secureStorage.ts`)
- [ ] Supabase auth updated to use secure storage
- [ ] Encryption enabled on both iOS and Android
- [ ] Auth tokens stored securely (not in plain localStorage)
- [ ] Storage tested on emulators and devices
- [ ] Migration from old storage to secure storage implemented
- [ ] Documentation created
- [ ] All changes committed to git

---

## 📝 Implementation Steps

### Step 1: Install Capacitor Preferences Plugin

**Terminal Commands** (Windows PowerShell):
```powershell
# Install the Preferences plugin (formerly Storage)
npm install @capacitor/preferences

# Sync to native projects
npx cap sync
```

**Expected Output**:
```
added 1 package, and audited 1524 packages in 8s
✔ Copying web assets from dist to android/app/src/main/assets/public
✔ Copying native bridge
✔ Copying capacitor config file
✔ copy android in 542.03ms
✔ Copying web assets from dist to ios/App/public
✔ Creating capacitor.config.json in ios/App
✔ copy ios in 289.66ms
✔ Updating Android plugins
✔ Updating iOS plugins
```

**Verify Installation**:
```powershell
# Check if added to package.json
grep "capacitor/preferences" package.json
```

**Acceptance**: ✅ @capacitor/preferences installed

---

### Step 2: Create Secure Storage Wrapper

**Create new file**: `src/lib/secureStorage.ts`

```typescript
import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';

/**
 * Secure Storage Wrapper
 * Uses iOS Keychain and Android EncryptedSharedPreferences
 * Falls back to localStorage on web
 */

const STORAGE_KEYS = {
  AUTH_SESSION: 'supabase.auth.session',
  USER_PREFERENCES: 'user.preferences',
  PUSH_TOKEN: 'push.token',
} as const;

export class SecureStorage {
  private static isNative = Capacitor.isNativePlatform();

  /**
   * Set a value in secure storage
   */
  static async set(key: string, value: string): Promise<void> {
    try {
      if (this.isNative) {
        // Native: Use iOS Keychain or Android EncryptedSharedPreferences
        await Preferences.set({ key, value });
      } else {
        // Web: Fallback to localStorage
        localStorage.setItem(key, value);
      }
    } catch (error) {
      console.error(`[SecureStorage] Error setting ${key}:`, error);
      throw error;
    }
  }

  /**
   * Get a value from secure storage
   */
  static async get(key: string): Promise<string | null> {
    try {
      if (this.isNative) {
        // Native: Retrieve from secure storage
        const result = await Preferences.get({ key });
        return result.value;
      } else {
        // Web: Fallback to localStorage
        return localStorage.getItem(key);
      }
    } catch (error) {
      console.error(`[SecureStorage] Error getting ${key}:`, error);
      return null;
    }
  }

  /**
   * Remove a value from secure storage
   */
  static async remove(key: string): Promise<void> {
    try {
      if (this.isNative) {
        await Preferences.remove({ key });
      } else {
        localStorage.removeItem(key);
      }
    } catch (error) {
      console.error(`[SecureStorage] Error removing ${key}:`, error);
      throw error;
    }
  }

  /**
   * Clear all secure storage (use with caution!)
   */
  static async clear(): Promise<void> {
    try {
      if (this.isNative) {
        await Preferences.clear();
      } else {
        localStorage.clear();
      }
    } catch (error) {
      console.error('[SecureStorage] Error clearing storage:', error);
      throw error;
    }
  }

  /**
   * Get all keys in secure storage
   */
  static async keys(): Promise<string[]> {
    try {
      if (this.isNative) {
        const result = await Preferences.keys();
        return result.keys;
      } else {
        return Object.keys(localStorage);
      }
    } catch (error) {
      console.error('[SecureStorage] Error getting keys:', error);
      return [];
    }
  }

  /**
   * Check if a key exists
   */
  static async has(key: string): Promise<boolean> {
    const value = await this.get(key);
    return value !== null;
  }

  // Convenience methods for common storage keys
  static async setAuthSession(session: string): Promise<void> {
    return this.set(STORAGE_KEYS.AUTH_SESSION, session);
  }

  static async getAuthSession(): Promise<string | null> {
    return this.get(STORAGE_KEYS.AUTH_SESSION);
  }

  static async removeAuthSession(): Promise<void> {
    return this.remove(STORAGE_KEYS.AUTH_SESSION);
  }

  static async setPushToken(token: string): Promise<void> {
    return this.set(STORAGE_KEYS.PUSH_TOKEN, token);
  }

  static async getPushToken(): Promise<string | null> {
    return this.get(STORAGE_KEYS.PUSH_TOKEN);
  }
}

export default SecureStorage;
export { STORAGE_KEYS };
```

**Save the file.**

**Acceptance**: ✅ Secure storage wrapper created

---

### Step 3: Create Custom Supabase Storage Adapter

**Create new file**: `src/lib/supabaseStorage.ts`

```typescript
import { SupportedStorage } from '@supabase/supabase-js';
import SecureStorage from './secureStorage';

/**
 * Custom Supabase Storage Adapter
 * Integrates SecureStorage with Supabase auth
 */
export class SupabaseStorageAdapter implements SupportedStorage {
  async getItem(key: string): Promise<string | null> {
    return await SecureStorage.get(key);
  }

  async setItem(key: string, value: string): Promise<void> {
    await SecureStorage.set(key, value);
  }

  async removeItem(key: string): Promise<void> {
    await SecureStorage.remove(key);
  }
}

export const supabaseStorage = new SupabaseStorageAdapter();
```

**Save the file.**

**Acceptance**: ✅ Supabase storage adapter created

---

### Step 4: Update Supabase Client to Use Secure Storage

**File to Edit**: `src/lib/supabase.ts`

**Find the current config section**:
```typescript path=null start=null
const supabaseConfig = {
  auth: {
    storage: Capacitor.isNativePlatform() 
      ? undefined 
      : window.localStorage,
    // ...
  }
};
```

**Replace with**:
```typescript
import { createClient } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';
import { supabaseStorage } from './supabaseStorage'; // ← Import secure storage

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabaseConfig = {
  auth: {
    // Use secure storage on all platforms
    storage: supabaseStorage, // ← Now uses iOS Keychain / Android EncryptedPrefs
    
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: !Capacitor.isNativePlatform()
  },
  global: {
    headers: {
      'x-client-platform': Capacitor.getPlatform(),
      'x-client-info': `capacitor-${Capacitor.getPlatform()}`
    }
  }
};

export const supabase = createClient(
  supabaseUrl!,
  supabaseAnonKey!,
  supabaseConfig
);

export const isNativePlatform = Capacitor.isNativePlatform();
export const platform = Capacitor.getPlatform();

// Enhanced logging in development
if (import.meta.env.DEV) {
  supabase.auth.onAuthStateChange((event, session) => {
    console.log(`[${platform}] Auth:`, event, {
      hasSession: !!session,
      userId: session?.user?.id,
      storage: 'secure' // ← Now using secure storage
    });
  });
}
```

**Save the file.**

**What changed**:
- ✅ Replaced undefined/localStorage with `supabaseStorage`
- ✅ Now uses iOS Keychain on iOS
- ✅ Now uses Android EncryptedSharedPreferences on Android
- ✅ Still uses localStorage on web (via secure fallback)

**Acceptance**: ✅ Supabase client updated

---

### Step 5: Build and Sync to Mobile

**Terminal Commands**:
```powershell
# Build the app
npm run build

# Sync to native platforms
npx cap sync
```

**Expected Output**:
```
dist/index.html                    0.48 kB │ gzip: 0.31 kB
dist/assets/index-a1b2c3d4.js   543.21 kB │ gzip: 175.43 kB

✔ Copying web assets
✔ Updating iOS plugins
✔ Updating Android plugins
```

**Acceptance**: ✅ Changes synced to mobile

---

### Step 6: Test Secure Storage on Web

**Terminal Command**:
```powershell
npm run dev
```

**Test in Browser**:
1. Open http://localhost:5173
2. Open DevTools → Application → Local Storage
3. Log in to the app
4. Check localStorage - should see Supabase auth keys
5. Refresh page
6. Should still be logged in

**Acceptance**: ✅ Storage works on web (localStorage fallback)

---

### Step 7: Test Secure Storage on Android

**Terminal Command**:
```powershell
npm run mobile:android
```

**Test Flow**:
1. App launches in emulator
2. Log in with test credentials
3. **Verify Storage Location**:
   - Open Android Studio → Device File Explorer
   - Navigate to: `/data/data/com.yourapp.app/shared_prefs/`
   - Look for `CapacitorStorage.xml`
   - Values should be encrypted (not plain text)

4. **Test Persistence**:
   - Close app completely (swipe away)
   - Reopen app
   - Should still be logged in

5. **Test Sign Out**:
   - Sign out
   - Check storage file - should be empty or keys removed

**Check Logcat**:
```
Look for: "EncryptedSharedPreferences"
Should NOT see plain auth tokens in logs
```

**Acceptance**: ✅ Secure storage works on Android

---

### Step 8: Test Secure Storage on iOS (Mac Only)

**Terminal Command** (Mac):
```bash
npm run mobile:ios
```

**Test Flow**:
1. App launches in simulator
2. Log in with test credentials
3. **Verify Storage Location**:
   - Xcode → Debug → Debug Memory Graph (or use Keychain Access)
   - Data stored in iOS Keychain (not accessible directly)
   - This is a security feature - tokens are encrypted

4. **Test Persistence**:
   - Close app (Cmd+Shift+H, swipe up)
   - Reopen app
   - Should still be logged in

5. **Test Sign Out**:
   - Sign out
   - Keychain entry should be removed

**Check Xcode Console**:
```
Look for: "Preferences" or "Keychain"
Should see storage operations
No plain tokens in logs
```

**Acceptance**: ✅ Secure storage works on iOS

---

### Step 9: Implement Storage Migration

**Create new file**: `src/lib/storageMigration.ts`

```typescript
import SecureStorage from './secureStorage';
import { Capacitor } from '@capacitor/core';

/**
 * Migrate from old localStorage to secure storage
 * Run this once on app startup
 */
export async function migrateToSecureStorage(): Promise<void> {
  // Only run on native platforms
  if (!Capacitor.isNativePlatform()) {
    console.log('[Migration] Skipping - running on web');
    return;
  }

  // Check if migration already done
  const migrated = await SecureStorage.get('storage.migrated');
  if (migrated === 'true') {
    console.log('[Migration] Already migrated to secure storage');
    return;
  }

  console.log('[Migration] Starting migration to secure storage...');

  try {
    // Keys to migrate from localStorage
    const keysToMigrate = [
      'supabase.auth.token',
      'supabase.auth.refresh_token',
      'user.preferences'
    ];

    let migratedCount = 0;

    for (const key of keysToMigrate) {
      const value = localStorage.getItem(key);
      if (value) {
        await SecureStorage.set(key, value);
        localStorage.removeItem(key); // Remove from old storage
        migratedCount++;
        console.log(`[Migration] Migrated key: ${key}`);
      }
    }

    // Mark migration as complete
    await SecureStorage.set('storage.migrated', 'true');
    
    console.log(`[Migration] Complete! Migrated ${migratedCount} keys`);
  } catch (error) {
    console.error('[Migration] Failed:', error);
    // Don't throw - app should still work
  }
}
```

**Save the file.**

**Acceptance**: ✅ Migration logic created

---

### Step 10: Add Migration to App Startup

**File to Edit**: `src/main.tsx` or `src/App.tsx`

**Add at the top of the file**:
```typescript
import { migrateToSecureStorage } from './lib/storageMigration';

// Run migration on app startup
migrateToSecureStorage().catch(console.error);
```

**Full example** (`src/main.tsx`):
```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { migrateToSecureStorage } from './lib/storageMigration';
import './index.css';

// Migrate to secure storage on app startup
migrateToSecureStorage().catch(console.error);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

**Save the file.**

**Acceptance**: ✅ Migration runs on app startup

---

### Step 11: Test Migration Flow

**Test on Android**:
1. **Setup Old Data**:
   - Open app in browser (not mobile)
   - Log in (stores in localStorage)
   - Note: localStorage data exists

2. **Test Migration**:
   - Build and sync: `npm run build && npx cap sync`
   - Open in Android emulator: `npm run mobile:android`
   - App should migrate data to secure storage
   - Check Logcat for "[Migration] Complete!" message

3. **Verify**:
   - Still logged in
   - Data now in EncryptedSharedPreferences
   - localStorage keys removed

**Acceptance**: ✅ Migration works correctly

---

### Step 12: Create Secure Storage Documentation

**Create new file**: `docs/SECURE_STORAGE.md`

```markdown
# Secure Storage Implementation 🔒

## Overview

Sensitive data (auth tokens, user preferences) is stored securely using:
- **iOS**: Keychain (encrypted, device-locked)
- **Android**: EncryptedSharedPreferences (AES-256)
- **Web**: localStorage (fallback for browser)

---

## Usage

### Basic Operations

```typescript
import SecureStorage from './lib/secureStorage';

// Set a value
await SecureStorage.set('myKey', 'myValue');

// Get a value
const value = await SecureStorage.get('myKey');

// Remove a value
await SecureStorage.remove('myKey');

// Check if key exists
const exists = await SecureStorage.has('myKey');

// Get all keys
const keys = await SecureStorage.keys();

// Clear all storage (use with caution!)
await SecureStorage.clear();
```

### Auth Session Management

```typescript
// Save auth session
await SecureStorage.setAuthSession(sessionToken);

// Retrieve auth session
const session = await SecureStorage.getAuthSession();

// Remove auth session (sign out)
await SecureStorage.removeAuthSession();
```

---

## How It Works

### iOS (Keychain)
- Data stored in iOS Keychain
- Encrypted with device-specific key
- Survives app uninstall (unless explicitly cleared)
- Inaccessible to other apps
- Requires device unlock to access

### Android (EncryptedSharedPreferences)
- Uses AES-256-GCM encryption
- Keys stored in Android KeyStore
- Encrypted at rest
- Survives app restart
- Cleared on app uninstall

### Web (localStorage)
- Fallback for browser environment
- Not encrypted (browser limitation)
- Cleared on browser data clear

---

## Migration

Old data is automatically migrated from localStorage to secure storage on first app launch.

**Migration Flow**:
1. Check if migration already done (`storage.migrated` flag)
2. Copy keys from localStorage to SecureStorage
3. Remove keys from localStorage
4. Set `storage.migrated = true`

**To manually trigger migration**:
```typescript
import { migrateToSecureStorage } from './lib/storageMigration';
await migrateToSecureStorage();
```

---

## Security Best Practices

✅ **DO**:
- Use SecureStorage for all sensitive data
- Always use `async/await` (storage is asynchronous)
- Handle errors gracefully
- Clear sessions on sign out

❌ **DON'T**:
- Store sensitive data in plain localStorage on mobile
- Assume storage is synchronous
- Store unencrypted passwords
- Use SecureStorage for large data (use database instead)

---

## Storage Keys

Predefined keys are available in `STORAGE_KEYS`:

```typescript
import { STORAGE_KEYS } from './lib/secureStorage';

STORAGE_KEYS.AUTH_SESSION    // 'supabase.auth.session'
STORAGE_KEYS.USER_PREFERENCES // 'user.preferences'
STORAGE_KEYS.PUSH_TOKEN       // 'push.token'
```

---

## Troubleshooting

### Issue: "Storage not persisting on iOS"
**Solution**: Verify app has Keychain entitlements
- Open Xcode → Target → Signing & Capabilities
- Should see "Keychain Sharing" capability

### Issue: "EncryptedSharedPreferences not found" on Android
**Solution**: Ensure minSdkVersion >= 23 (Android 6.0+)
- Check `android/app/build.gradle`
- `minSdkVersion` should be 23 or higher

### Issue: Migration runs multiple times
**Solution**: Migration checks `storage.migrated` flag
- If still occurring, check if flag is being cleared
- Debug with: `await SecureStorage.get('storage.migrated')`

---

## Testing

### Test Secure Storage
```powershell
# Web
npm run dev

# Android
npm run mobile:android

# iOS
npm run mobile:ios
```

### Verify Encryption (Android)
1. Open Android Studio → Device File Explorer
2. Navigate to `/data/data/com.yourapp.app/shared_prefs/`
3. Open `CapacitorStorage.xml`
4. Values should be encrypted (not plain text)

### Verify Keychain (iOS)
1. Data stored in iOS Keychain (not directly accessible)
2. Can check logs in Xcode Console
3. Should see "Preferences" operations

---

## Related

- **Story 7.1.6**: Supabase Mobile Configuration
- **Story 7.2.2**: PKCE Auth Flow
- **EPIC 7.2**: Supabase Mobile Security

---

## Platform-Specific Details

### iOS Keychain
- **Location**: iOS Keychain (system-level)
- **Encryption**: Hardware-backed encryption
- **Access**: Requires device unlock
- **Persistence**: Survives app reinstall (unless device restored)

### Android EncryptedSharedPreferences
- **Location**: `/data/data/<package>/shared_prefs/`
- **Encryption**: AES-256-GCM
- **Access**: App-specific (sandboxed)
- **Persistence**: Cleared on app uninstall

### Web localStorage
- **Location**: Browser localStorage
- **Encryption**: None (browser limitation)
- **Access**: Same-origin policy
- **Persistence**: Cleared on browser data clear
```

**Save as**: `docs/SECURE_STORAGE.md`

**Acceptance**: ✅ Documentation created

---

### Step 13: Add SecureStorage Tests (Optional)

**Create new file**: `src/lib/__tests__/secureStorage.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import SecureStorage from '../secureStorage';

describe('SecureStorage', () => {
  beforeEach(async () => {
    // Clear storage before each test
    await SecureStorage.clear();
  });

  it('should set and get a value', async () => {
    await SecureStorage.set('testKey', 'testValue');
    const value = await SecureStorage.get('testKey');
    expect(value).toBe('testValue');
  });

  it('should return null for non-existent key', async () => {
    const value = await SecureStorage.get('nonExistent');
    expect(value).toBeNull();
  });

  it('should remove a value', async () => {
    await SecureStorage.set('testKey', 'testValue');
    await SecureStorage.remove('testKey');
    const value = await SecureStorage.get('testKey');
    expect(value).toBeNull();
  });

  it('should check if key exists', async () => {
    await SecureStorage.set('testKey', 'testValue');
    const exists = await SecureStorage.has('testKey');
    expect(exists).toBe(true);

    await SecureStorage.remove('testKey');
    const existsAfterRemove = await SecureStorage.has('testKey');
    expect(existsAfterRemove).toBe(false);
  });

  it('should get all keys', async () => {
    await SecureStorage.set('key1', 'value1');
    await SecureStorage.set('key2', 'value2');
    const keys = await SecureStorage.keys();
    expect(keys).toContain('key1');
    expect(keys).toContain('key2');
  });

  it('should clear all storage', async () => {
    await SecureStorage.set('key1', 'value1');
    await SecureStorage.set('key2', 'value2');
    await SecureStorage.clear();
    const keys = await SecureStorage.keys();
    expect(keys.length).toBe(0);
  });
});
```

**Run tests**:
```powershell
npm test
```

**Acceptance**: ✅ Tests pass

---

### Step 14: Commit Secure Storage Implementation

**Terminal Commands**:
```powershell
git add .

git commit -m "feat: Implement secure storage for mobile - Story 7.2.1

- Installed @capacitor/preferences plugin
- Created SecureStorage wrapper with iOS Keychain and Android EncryptedSharedPreferences
- Created custom Supabase storage adapter
- Updated Supabase client to use secure storage
- Implemented storage migration from localStorage
- Auth tokens now encrypted on native platforms
- Created comprehensive documentation
- Added unit tests for SecureStorage

Changes:
- src/lib/secureStorage.ts: Secure storage wrapper
- src/lib/supabaseStorage.ts: Supabase adapter
- src/lib/supabase.ts: Updated to use secure storage
- src/lib/storageMigration.ts: Auto-migration logic
- src/main.tsx: Added migration on startup
- docs/SECURE_STORAGE.md: Complete guide
- src/lib/__tests__/secureStorage.test.ts: Unit tests

Epic: 7.2 - Supabase Mobile Security
Story: 7.2.1 - Secure Storage Implementation

Security improvements:
- iOS: Data stored in Keychain (hardware-encrypted)
- Android: EncryptedSharedPreferences (AES-256)
- Web: Falls back to localStorage
- Automatic migration from old storage"

git push origin mobile-app-setup
```

**Acceptance**: ✅ All changes committed

---

## ✅ Verification Checklist

- [ ] @capacitor/preferences installed
- [ ] `src/lib/secureStorage.ts` created
- [ ] `src/lib/supabaseStorage.ts` created
- [ ] `src/lib/supabase.ts` updated to use secure storage
- [ ] `src/lib/storageMigration.ts` created
- [ ] Migration runs on app startup
- [ ] Secure storage works on web (localStorage fallback)
- [ ] Secure storage works on Android (EncryptedSharedPreferences)
- [ ] Secure storage works on iOS (Keychain)
- [ ] Auth sessions persist after app restart
- [ ] Migration from localStorage works correctly
- [ ] No plain tokens visible in storage files
- [ ] `docs/SECURE_STORAGE.md` created
- [ ] Unit tests added and passing
- [ ] All changes committed to git

**All items checked?** ✅ Story 7.2.1 is COMPLETE

---

## 🚨 Troubleshooting

### Issue: "Module not found: @capacitor/preferences"
**Solution**:
```powershell
npm install @capacitor/preferences
npx cap sync
```

### Issue: Android - "EncryptedSharedPreferences not available"
**Solution**: Check `android/app/build.gradle`:
```gradle
android {
    defaultConfig {
        minSdkVersion 23 // ← Must be 23 or higher
    }
}
```

### Issue: iOS - "Keychain access denied"
**Solution**: 
1. Open `ios/App/App.xcodeproj` in Xcode
2. Go to Target → Signing & Capabilities
3. Add "Keychain Sharing" capability

### Issue: Storage values not encrypted
**Solution**:
- Verify using `SecureStorage`, not direct localStorage
- Check platform: `Capacitor.isNativePlatform()` should be true
- Rebuild and sync: `npm run build && npx cap sync`

---

## 📚 Additional Notes

### What We Implemented
- ✅ iOS Keychain integration
- ✅ Android EncryptedSharedPreferences
- ✅ Custom Supabase storage adapter
- ✅ Automatic migration from localStorage
- ✅ Web fallback (localStorage)

### Security Improvements
- **Before**: Tokens in plain localStorage
- **After**: Tokens encrypted with device hardware keys
- **iOS**: Keychain (hardware-backed)
- **Android**: AES-256-GCM encryption

### What's Next?
- **Story 7.2.2**: PKCE Auth Flow (more secure auth)
- **Story 7.2.3**: Push Notification Token Registration
- **Story 7.2.4**: Network Connectivity Detection

---

## 🔗 Related Documentation

- [@capacitor/preferences Docs](https://capacitorjs.com/docs/apis/preferences)
- [iOS Keychain](https://developer.apple.com/documentation/security/keychain_services)
- [Android EncryptedSharedPreferences](https://developer.android.com/reference/androidx/security/crypto/EncryptedSharedPreferences)
- [EPIC 7.2 Overview](../epics/EPIC_7.2_Supabase_Mobile_Security.md)

---

**Story Status**: ⚪ PLANNED  
**Previous Story**: [STORY_7.1.6_Supabase_Mobile_Config.md](./STORY_7.1.6_Supabase_Mobile_Config.md)  
**Next Story**: [STORY_7.2.2_PKCE_Auth_Flow.md](./STORY_7.2.2_PKCE_Auth_Flow.md)  
**Epic Progress**: Story 1/5 complete (0% → 20%)
