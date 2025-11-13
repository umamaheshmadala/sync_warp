# Remaining Stories - Epic 7.1 & 7.2 Outlines 📝

## Overview

This document provides detailed outlines for the remaining 6 stories:
- **EPIC 7.1**: Story 7.1.6 (1 remaining)
- **EPIC 7.2**: Stories 7.2.1-7.2.5 (5 remaining)

Each outline includes all implementation steps, code snippets, and acceptance criteria needed to create the full story file.

---

## ✅ Completed Stories (5/11)

- ✅ STORY_7.1.1: Environment & Capacitor Setup (400 lines)
- ✅ STORY_7.1.2: iOS Platform Setup (400 lines)
- ✅ STORY_7.1.3: Android Platform Setup (491 lines)
- ✅ STORY_7.1.4: Mobile Build Scripts (553 lines)
- ✅ STORY_7.1.5: Platform Detection Hooks (666 lines)

---

## 📋 Story 7.1.6: Supabase Mobile Configuration

**File**: `STORY_7.1.6_Supabase_Mobile_Config.md`  
**Time**: 2-3 hours  
**Dependencies**: Story 7.1.1 complete

### Acceptance Criteria
- [ ] Supabase client updated for mobile
- [ ] Auth storage configured for native platforms
- [ ] detectSessionInUrl disabled on mobile
- [ ] Authentication tested on iOS and Android
- [ ] Sessions persist after app restart

### Implementation Steps

**Step 1: Update Supabase Client Configuration**
File: `src/lib/supabase.ts`

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
      ? undefined // Will use secure native storage in Story 7.2.1
      : window.localStorage,
    autoRefreshToken: true,
    persistSession: true,
    // Don't detect session from URL on mobile
    detectSessionInUrl: !Capacitor.isNativePlatform()
  }
};

export const supabase = createClient(supabaseUrl!, supabaseAnonKey!, supabaseConfig);
```

**Step 2: Test Auth on Mobile**
- Build and sync: `npm run mobile:sync`
- Test login on emulator
- Close and reopen app
- Verify user still logged in

**Step 3: Add Platform Headers**
```typescript
const supabaseConfig = {
  auth: { /* ... */ },
  global: {
    headers: {
      'x-client-platform': Capacitor.getPlatform()
    }
  }
};
```

**Step 4: Create Mobile Auth Hook**
File: `src/hooks/useMobileAuth.ts`
- Wrap auth operations
- Handle mobile-specific flows
- Add error handling for mobile

**Step 5: Test Full Auth Flow**
- Sign up on mobile
- Sign in on mobile
- Sign out
- Verify persistence

**Step 6: Document Mobile Auth**
File: `docs/MOBILE_AUTH.md`

**Step 7: Commit Changes**
```powershell
git commit -m "feat: Configure Supabase for mobile - Story 7.1.6"
```

---

## 📋 Story 7.2.1: Capacitor Secure Storage Implementation

**File**: `STORY_7.2.1_Secure_Storage_Setup.md`  
**Time**: 2-3 hours  
**Dependencies**: EPIC 7.1 complete

### Acceptance Criteria
- [ ] @capacitor/preferences installed
- [ ] CapacitorStorage adapter created
- [ ] iOS Keychain integration working
- [ ] Android EncryptedSharedPreferences working
- [ ] Falls back to localStorage on web

### Implementation Steps

**Step 1: Install Preferences Plugin**
```powershell
npm install @capacitor/preferences
npx cap sync
```

**Step 2: Create Secure Storage Adapter**
File: `src/lib/capacitorStorage.ts`

```typescript
import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';

export const CapacitorStorage = {
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
```

**Step 3: Update Supabase Client**
File: `src/lib/supabase.ts`

```typescript
import { CapacitorStorage } from './capacitorStorage';

const supabaseConfig = {
  auth: {
    storage: CapacitorStorage, // ← Use secure storage
    // ... rest of config
  }
};
```

**Step 4: Test Secure Storage**
- Log in on mobile
- Close app completely
- Reopen app
- Verify still logged in

**Step 5: Verify iOS Keychain**
(Mac only) - Check Xcode console for Keychain access logs

**Step 6: Verify Android Encryption**
Check Logcat for EncryptedSharedPreferences usage

**Step 7: Commit Changes**

---

## 📋 Story 7.2.2: Enhanced Supabase Client Configuration

**File**: `STORY_7.2.2_Enhanced_Supabase_Client.md`  
**Time**: 2-3 hours  
**Dependencies**: Story 7.2.1 complete

### Acceptance Criteria
- [ ] PKCE auth flow enabled for mobile
- [ ] Platform headers added to requests
- [ ] Storage key configured
- [ ] Flow type conditional on platform
- [ ] Enhanced security verified

### Implementation Steps

**Step 1: Enable PKCE Flow**
File: `src/lib/supabase.ts`

```typescript
const supabaseConfig = {
  auth: {
    storage: CapacitorStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: !Capacitor.isNativePlatform(),
    // PKCE is more secure on mobile
    flowType: Capacitor.isNativePlatform() ? 'pkce' : 'implicit',
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
```

**Step 2: Export Platform Info**
```typescript
export const isNativePlatform = Capacitor.isNativePlatform();
export const platform = Capacitor.getPlatform();
```

**Step 3: Test PKCE Flow**
- Sign up with new account
- Verify PKCE used (check network tab)
- Verify more secure than implicit

**Step 4: Verify Platform Headers**
Check Supabase logs for platform information

**Step 5: Document Security Improvements**

**Step 6: Commit**

---

## 📋 Story 7.2.3: Push Token Registration Hook

**File**: `STORY_7.2.3_Push_Token_Hook.md`  
**Time**: 3-4 hours  
**Dependencies**: Story 7.2.4 (push_tokens table)

### Acceptance Criteria
- [ ] usePushNotifications hook created
- [ ] Automatic permission request
- [ ] Token registration on login
- [ ] Token saved to Supabase
- [ ] Error handling implemented

### Implementation Steps

**Step 1: Install Push Notifications Plugin**
```powershell
npm install @capacitor/push-notifications
npx cap sync
```

**Step 2: Create usePushNotifications Hook**
File: `src/hooks/usePushNotifications.ts`

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
            console.log('✅ Push token received:', tokenData.value);
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

          // Listen for errors
          PushNotifications.addListener('registrationError', (error) => {
            console.error('❌ Push registration error:', error);
          });
        }
      } catch (error) {
        console.error('❌ Failed to register push notifications:', error);
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

**Step 3: Test Permission Request**
**Step 4: Verify Token Registration**
**Step 5: Check Supabase Table**
**Step 6: Commit**

---

## 📋 Story 7.2.4: Push Tokens Database Table

**File**: `STORY_7.2.4_Push_Tokens_Database.md`  
**Time**: 1-2 hours  
**Dependencies**: None (can do before 7.2.3)

### Acceptance Criteria
- [ ] push_tokens table created
- [ ] RLS policies configured
- [ ] Indexes added
- [ ] Unique constraints set
- [ ] Tested with sample data

### Implementation Steps

**Step 1: Create Table in Supabase**
Go to Supabase Dashboard → SQL Editor

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

-- Indexes for performance
CREATE INDEX idx_push_tokens_user_id ON push_tokens(user_id);
CREATE INDEX idx_push_tokens_platform ON push_tokens(platform);
CREATE INDEX idx_push_tokens_updated_at ON push_tokens(updated_at DESC);
```

**Step 2: Test Table**
- Insert sample token
- Query by user_id
- Update token
- Delete token

**Step 3: Verify RLS**
- Try accessing other user's tokens (should fail)
- Verify own tokens accessible

**Step 4: Document Schema**

**Step 5: Commit**

---

## 📋 Story 7.2.5: Integrated Auth Flow with Push Registration

**File**: `STORY_7.2.5_Integrated_Auth_Push.md`  
**Time**: 2-3 hours  
**Dependencies**: Stories 7.2.3 and 7.2.4 complete

### Acceptance Criteria
- [ ] Layout component updated with push hook
- [ ] Auto-registration on login
- [ ] No manual setup required
- [ ] Error handling in place
- [ ] User feedback on registration

### Implementation Steps

**Step 1: Add Hook to Layout**
File: `src/components/Layout.tsx`

```typescript
import { usePushNotifications } from '../hooks/usePushNotifications';

export const Layout = ({ children }) => {
  const { isRegistered } = usePushNotifications();
  
  // Hook automatically runs when user logs in
  
  return (
    <div>
      {/* Your layout */}
      {children}
    </div>
  );
};
```

**Step 2: Add Registration Feedback**
```typescript
{isRegistered && (
  <div className="toast">
    ✅ Push notifications enabled
  </div>
)}
```

**Step 3: Test Complete Flow**
- Fresh install app
- Sign up new user
- See permission prompt
- Accept permissions
- Verify token in Supabase

**Step 4: Test Rejection Flow**
- Decline permissions
- App still works
- No errors

**Step 5: Document Integration**

**Step 6: Commit**

---

## 📊 Implementation Summary

### Story Sizes
- 7.1.6: ~400 lines
- 7.2.1: ~380 lines
- 7.2.2: ~350 lines
- 7.2.3: ~420 lines
- 7.2.4: ~280 lines
- 7.2.5: ~330 lines

**Total**: ~2,160 lines to create

### Time Estimates
- 7.1.6: 2-3 hours
- 7.2.1: 2-3 hours
- 7.2.2: 2-3 hours
- 7.2.3: 3-4 hours
- 7.2.4: 1-2 hours
- 7.2.5: 2-3 hours

**Total**: 12-18 hours implementation time

---

## ✅ Next Actions

### Option 1: AI Creates Full Stories
I can expand each outline into complete 300-500 line story files following the pattern of Stories 7.1.1-7.1.5.

### Option 2: You Create from Outlines
Use these outlines as templates to create the full story files yourself, following the format of existing stories.

### Option 3: Hybrid Approach
I create the most complex stories (7.2.3, 7.2.4) in full, you create simpler ones from outlines.

---

**Recommendation**: Let me complete all 6 remaining stories in full detail to match the quality of Stories 7.1.1-7.1.5.

---

**Last Updated**: January 4, 2025  
**Progress**: 5/11 stories complete (45%)  
**Status**: Ready to complete remaining 6 stories
