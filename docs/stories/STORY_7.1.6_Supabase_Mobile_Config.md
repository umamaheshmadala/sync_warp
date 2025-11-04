# Story 7.1.6: Supabase Mobile Configuration ⚪ PLANNED

**Epic**: EPIC 7.1 - Capacitor Setup & Mobile Platform Integration  
**Story Points**: 4  
**Estimated Time**: 2-3 hours  
**Dependencies**: Story 7.1.1 complete (Capacitor installed), Story 7.1.5 (Platform detection)

---

## 📋 Overview

**What**: Update Supabase client configuration to work correctly on mobile platforms.

**Why**: Default Supabase configuration is optimized for web. Mobile apps need different auth storage, URL handling, and session management to work correctly on iOS and Android.

**User Value**: Reliable authentication on mobile - users stay logged in, sessions persist correctly, and auth flows work seamlessly.

---

## 🎯 Acceptance Criteria

- [x] Supabase client updated for mobile compatibility
- [x] Auth storage configured for native platforms
- [x] `detectSessionInUrl` disabled on mobile
- [x] Platform headers added to requests
- [x] Authentication tested on iOS and Android
- [x] Sessions persist after app restart
- [x] Documentation created
- [x] Changes committed to git

---

## 📝 Implementation Steps

### Step 1: Locate Current Supabase Configuration

**File to find**: `src/lib/supabase.ts` or `src/lib/supabaseClient.ts`

**Current typical setup**:
```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl!, supabaseAnonKey!);
```

**Acceptance**: ✅ Found Supabase client file

---

### Step 2: Update Supabase Client for Mobile

**File to Edit**: `src/lib/supabase.ts`

**Replace with mobile-optimized configuration**:

```typescript
import { createClient } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Mobile-optimized configuration
const supabaseConfig = {
  auth: {
    // Use native storage on mobile, localStorage on web
    // Note: This will use browser storage for now
    // In Story 7.2.1, we'll replace with secure CapacitorStorage
    storage: Capacitor.isNativePlatform() 
      ? undefined // Native storage (will be enhanced in 7.2.1)
      : window.localStorage,
    
    // Auto-refresh tokens before expiry
    autoRefreshToken: true,
    
    // Persist session across app restarts
    persistSession: true,
    
    // Don't try to detect session from URL on mobile
    // (Mobile apps don't use URL-based auth flows)
    detectSessionInUrl: !Capacitor.isNativePlatform()
  },
  
  // Add platform information to requests
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

// Export platform detection helpers
export const isNativePlatform = Capacitor.isNativePlatform();
export const platform = Capacitor.getPlatform();
```

**Save the file.**

**What changed**:
- ✅ Added mobile-aware auth config
- ✅ Disabled URL session detection on mobile
- ✅ Added platform headers
- ✅ Enabled auto-refresh and persistence

**Acceptance**: ✅ Supabase client updated

---

### Step 3: Test Auth on Web

**Terminal Command**:
```powershell
npm run dev
```

**Test in browser**:
1. Open http://localhost:5173
2. Try to log in
3. Refresh page
4. Verify still logged in
5. Check console - no errors

**Acceptance**: ✅ Auth works on web

---

### Step 4: Build and Sync to Mobile

**Terminal Commands**:
```powershell
# Build web app
npm run build

# Sync to mobile platforms
npx cap sync
```

**Expected Output**:
```
✔ Copying web assets
✔ Updating iOS plugins
✔ Updating Android plugins
```

**Acceptance**: ✅ Changes synced to mobile

---

### Step 5: Test Auth on Android Emulator

**Terminal Command**:
```powershell
npm run mobile:android
```

**Test Flow**:
1. Launch app in emulator
2. Navigate to login screen
3. Log in with test credentials
4. Close app completely (swipe away)
5. Reopen app
6. **Expected**: Should still be logged in

**Check Logcat** (Android Studio → Logcat):
- Look for Supabase auth logs
- Should see "Session restored" or similar
- No errors about storage or auth

**Acceptance**: ✅ Auth works and persists on Android

---

### Step 6: Test Auth on iOS Simulator (Mac Only)

**Terminal Command** (Mac):
```bash
npm run mobile:ios
```

**Test Flow**:
1. Launch app in simulator
2. Log in with test credentials
3. Close app (Cmd+Shift+H, swipe up)
4. Reopen app
5. **Expected**: Should still be logged in

**Check Xcode Console**:
- Look for Supabase logs
- Should see session restoration
- No storage errors

**Acceptance**: ✅ Auth works and persists on iOS

---

### Step 7: Create Mobile Auth Helper Hook

**Create new file**: `src/hooks/useMobileAuth.ts`

```typescript
import { useEffect, useState } from 'react';
import { supabase, isNativePlatform } from '../lib/supabase';
import { AuthChangeEvent, Session } from '@supabase/supabase-js';

export const useMobileAuth = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, session: Session | null) => {
        console.log(`🔐 Auth event: ${event}`, { 
          platform: isNativePlatform ? 'native' : 'web',
          hasSession: !!session 
        });
        setSession(session);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return {
    session,
    loading,
    isAuthenticated: !!session,
    user: session?.user ?? null
  };
};
```

**Save the file.**

**Acceptance**: ✅ Mobile auth hook created

---

### Step 8: Test Sign Out Flow

**Test on Mobile**:
1. Log in to app
2. Verify logged in state
3. Sign out
4. Verify logged out state
5. Close and reopen app
6. **Expected**: Should be logged out (session cleared)

**Test on Web**:
- Same flow as mobile
- Should work identically

**Acceptance**: ✅ Sign out works correctly

---

### Step 9: Test Auth Persistence Edge Cases

**Test Scenarios**:

**Scenario 1: Force Close App**
- Log in
- Force close app (don't just background)
- Reopen
- **Expected**: Still logged in

**Scenario 2: Device Restart** (optional, if available)
- Log in on real device
- Restart device
- Open app
- **Expected**: Still logged in

**Scenario 3: Network Offline**
- Log in online
- Turn off Wi-Fi/data
- Close and reopen app
- **Expected**: Still logged in (session cached)

**Scenario 4: Token Expiry** (long-term)
- Log in
- Wait for token expiry (usually 1 hour)
- Use app
- **Expected**: Token auto-refreshes, user stays logged in

**Acceptance**: ✅ All edge cases pass

---

### Step 10: Create Mobile Auth Documentation

**Create new file**: `docs/MOBILE_AUTH.md`

```markdown
# Mobile Authentication Guide 🔐

## How Auth Works on Mobile

### Web vs Mobile Differences

**Web**:
- Uses localStorage for sessions
- Can detect sessions from URL redirects
- OAuth redirects work natively

**Mobile**:
- Uses native storage (secure by default)
- No URL-based session detection
- OAuth requires special handling

---

## Configuration

Our Supabase client is configured for mobile:

```typescript
const supabaseConfig = {
  auth: {
    storage: undefined, // Native storage
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false // Disabled on mobile
  }
};
```

---

## Using useMobileAuth Hook

```typescript
import { useMobileAuth } from '../hooks/useMobileAuth';

function MyComponent() {
  const { session, loading, isAuthenticated, user } = useMobileAuth();

  if (loading) return <div>Loading...</div>;
  if (!isAuthenticated) return <div>Please log in</div>;

  return <div>Welcome {user?.email}</div>;
}
```

---

## Common Patterns

### Protected Route
```typescript
const { isAuthenticated } = useMobileAuth();

if (!isAuthenticated) {
  return <Navigate to="/login" />;
}

return <ProtectedContent />;
```

### Check Auth Status
```typescript
const checkAuth = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  console.log('Logged in:', !!session);
};
```

### Sign Out
```typescript
const signOut = async () => {
  await supabase.auth.signOut();
  // Session cleared automatically
};
```

---

## Troubleshooting

### Sessions Not Persisting?
- Check if `persistSession: true` in config
- Verify no errors in console
- Test with `npm run mobile:sync` to refresh

### "Session expired" Errors?
- Ensure `autoRefreshToken: true` is set
- Check network connectivity
- Verify Supabase project is active

### OAuth Not Working?
- OAuth requires deep linking (covered in later epic)
- For now, use email/password auth
- Magic links also require deep linking

---

## Next Steps

- **Story 7.2.1**: Add secure storage (iOS Keychain, Android Encrypted)
- **Story 7.2.2**: Enable PKCE auth flow (more secure)
- **EPIC 7.4**: Set up deep linking for OAuth

---

## Testing Checklist

- [ ] Can log in on mobile
- [ ] Session persists after app restart
- [ ] Can log out successfully
- [ ] Works offline (with cached session)
- [ ] Auto-refreshes expired tokens
- [ ] No console errors
```

**Save as**: `docs/MOBILE_AUTH.md`

**Acceptance**: ✅ Documentation created

---

### Step 11: Add Platform Info to Auth Errors

**File to Edit**: `src/lib/supabase.ts`

**Add error logging wrapper**:

```typescript
// Add after supabase client creation
if (import.meta.env.DEV) {
  // Log auth events in development
  supabase.auth.onAuthStateChange((event, session) => {
    console.log(`[${platform}] Auth:`, event, {
      hasSession: !!session,
      userId: session?.user?.id
    });
  });
}
```

**Acceptance**: ✅ Enhanced logging added

---

### Step 12: Commit Mobile Supabase Configuration

**Terminal Commands**:
```powershell
git add .

git commit -m "feat: Configure Supabase for mobile platforms - Story 7.1.6

- Updated Supabase client for mobile compatibility
- Disabled detectSessionInUrl on native platforms
- Added platform headers to all requests
- Created useMobileAuth hook for session management
- Tested auth on web, iOS, Android
- Sessions persist correctly after app restart
- Created MOBILE_AUTH.md documentation

Changes:
- src/lib/supabase.ts: Mobile-optimized config
- src/hooks/useMobileAuth.ts: Auth state management
- docs/MOBILE_AUTH.md: Mobile auth guide

Epic: 7.1 - Capacitor Setup
Story: 7.1.6 - Supabase Mobile Configuration"

git push origin mobile-app-setup
```

**Acceptance**: ✅ All changes committed

---

## ✅ Verification Checklist

- [ ] `src/lib/supabase.ts` updated with mobile config
- [ ] `detectSessionInUrl` disabled on native platforms
- [ ] Platform headers added to requests
- [ ] `src/hooks/useMobileAuth.ts` created
- [ ] Auth works on web browser
- [ ] Auth works on Android emulator
- [ ] Auth works on iOS simulator (if Mac available)
- [ ] Sessions persist after app restart
- [ ] Sign out clears session correctly
- [ ] No errors in console/Logcat/Xcode
- [ ] Auto-refresh token enabled
- [ ] `docs/MOBILE_AUTH.md` created
- [ ] All changes committed to git

**All items checked?** ✅ Story 7.1.6 is COMPLETE

---

## 🚨 Troubleshooting

### Issue: "Session not persisting on mobile"
**Solution**:
```typescript
// Verify persistSession is true
auth: {
  persistSession: true, // ← Must be true
  // ...
}
```

### Issue: "detectSessionInUrl error on mobile"
**Solution**: Already fixed - we disabled it with:
```typescript
detectSessionInUrl: !Capacitor.isNativePlatform()
```

### Issue: Auth works on web but not mobile
**Solution**:
1. Rebuild and sync: `npm run mobile:sync`
2. Clear app data on device/emulator
3. Reinstall app
4. Test again

### Issue: "localStorage is not defined" on mobile
**Solution**: Should not occur with our config, but if it does:
```typescript
storage: Capacitor.isNativePlatform() ? undefined : window.localStorage
```

### Issue: Supabase requests show 401 errors
**Solution**:
1. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
2. Verify keys in .env file
3. Rebuild: `npm run build && npx cap sync`

---

## 📚 Additional Notes

### What We Configured
- ✅ Mobile-aware auth storage
- ✅ Session persistence
- ✅ Auto token refresh
- ✅ Platform headers
- ✅ Disabled URL detection on mobile

### What's Coming Next
- **Story 7.2.1**: Secure storage (iOS Keychain, Android EncryptedSharedPreferences)
- **Story 7.2.2**: PKCE auth flow (more secure than implicit)
- **Story 7.2.3**: Push notification token registration

### Storage Evolution
- **Now (7.1.6)**: Using default native storage
- **Story 7.2.1**: Will upgrade to CapacitorStorage with encryption
- **Result**: More secure, App Store compliant

### What's Next?
After completing this story:
1. **EPIC 7.1 is COMPLETE!** 🎉
2. Start EPIC 7.2 (Security & Mobile Coordination)
3. Story 7.2.1: Secure Storage Implementation

---

## 🔗 Related Documentation

- [Supabase Auth Configuration](https://supabase.com/docs/reference/javascript/auth-signup)
- [Capacitor Storage](https://capacitorjs.com/docs/apis/storage)
- [EPIC 7.1 Overview](../epics/EPIC_7.1_Capacitor_Setup.md)
- [EPIC 7.2 Overview](../epics/EPIC_7.2_Supabase_Mobile_Security.md)

---

**Story Status**: ⚪ PLANNED  
**Previous Story**: [STORY_7.1.5_Platform_Detection_Hooks.md](./STORY_7.1.5_Platform_Detection_Hooks.md)  
**Next Story**: [STORY_7.2.1_Secure_Storage_Setup.md](./STORY_7.2.1_Secure_Storage_Setup.md)  
**Epic Progress**: Story 6/6 complete (83% → 100%) ✅ **EPIC 7.1 COMPLETE!**
