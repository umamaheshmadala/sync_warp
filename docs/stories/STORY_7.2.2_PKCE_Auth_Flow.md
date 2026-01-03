# Story 7.2.2: PKCE Auth Flow Implementation ⚪ PLANNED

**Epic**: EPIC 7.2 - Supabase Mobile Security & Coordination  
**Story Points**: 3  
**Estimated Time**: 2 hours  
**Dependencies**: Story 7.2.1 complete (Secure storage)

---

## 📋 Overview

**What**: Enable PKCE (Proof Key for Code Exchange) authentication flow for enhanced mobile security.

**Why**: PKCE protects against authorization code interception attacks. It's recommended by OAuth 2.0 best practices for mobile apps and required by some auth providers. The implicit flow (default) is less secure for native apps.

**User Value**: More secure authentication - even if an attacker intercepts the authorization code, they cannot exchange it for tokens without the code verifier.

---

## 🎯 Acceptance Criteria

- [ ] PKCE flow enabled in Supabase configuration
- [ ] Code verifier and challenge generation implemented
- [ ] Auth flow updated to use PKCE
- [ ] Tested on web, iOS, and Android
- [ ] No regressions in existing auth flows
- [ ] Documentation updated
- [ ] Changes committed to git

---

## 📝 Implementation Steps

### Step 1: Understand PKCE Flow

**PKCE Basics**:
```
1. App generates random "code_verifier"
2. App creates "code_challenge" = base64url(sha256(code_verifier))
3. App sends code_challenge to auth server
4. Server returns authorization code
5. App exchanges code + code_verifier for tokens
6. Server verifies: sha256(code_verifier) == stored code_challenge
```

**Why It's Secure**:
- Even if authorization code is intercepted, attacker can't use it
- Requires both the code AND the original verifier
- Verifier never leaves the app

**Acceptance**: ✅ Understand PKCE flow

---

### Step 2: Update Supabase Client for PKCE

**File to Edit**: `src/lib/supabase.ts`

**Current auth config**:
```typescript path=null start=null
const supabaseConfig = {
  auth: {
    storage: supabaseStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: !Capacitor.isNativePlatform()
  },
  // ...
};
```

**Update to enable PKCE**:
```typescript
import { createClient } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';
import { supabaseStorage } from './supabaseStorage';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabaseConfig = {
  auth: {
    storage: supabaseStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: !Capacitor.isNativePlatform(),
    
    // Enable PKCE flow (more secure for mobile)
    flowType: 'pkce', // ← Enable PKCE
    
    // Storage key for PKCE verifier
    storageKey: 'supabase.auth.token'
  },
  global: {
    headers: {
      'x-client-platform': Capacitor.getPlatform(),
      'x-client-info': `capacitor-${Capacitor.getPlatform()}`,
      'x-auth-flow': 'pkce' // ← Indicate PKCE in headers
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
    console.log(`[${platform}] Auth (PKCE):`, event, {
      hasSession: !!session,
      userId: session?.user?.id,
      storage: 'secure',
      flow: 'pkce' // ← Log flow type
    });
  });
}
```

**Save the file.**

**What changed**:
- ✅ Added `flowType: 'pkce'`
- ✅ Added PKCE indicator to headers
- ✅ Updated logging to show PKCE flow

**Acceptance**: ✅ PKCE enabled in Supabase config

---

### Step 3: Build and Sync Changes

**Terminal Commands**:
```powershell
# Build the app
npm run build

# Sync to native platforms
npx cap sync
```

**Expected Output**:
```
✔ Building...
✔ Copying web assets
✔ Updating iOS plugins
✔ Updating Android plugins
```

**Acceptance**: ✅ Changes synced to mobile

---

### Step 4: Test PKCE on Web

**Terminal Command**:
```powershell
npm run dev
```

**Test Flow**:
1. Open http://localhost:5173
2. Open DevTools → Network tab
3. Log in with test credentials
4. Check network requests for auth endpoint
5. **Look for**: `code_challenge` and `code_challenge_method=S256` in request
6. Should see successful auth response
7. Refresh page - should stay logged in

**Verify PKCE in DevTools**:
```
POST /auth/v1/token
Body should include:
- code_challenge: [base64 string]
- code_challenge_method: S256
```

**Acceptance**: ✅ PKCE works on web

---

### Step 5: Test PKCE on Android

**Terminal Command**:
```powershell
npm run mobile:android
```

**Test Flow**:
1. App launches in emulator
2. Navigate to login screen
3. Log in with test credentials
4. **Check Logcat** for PKCE indicators:
   ```
   Look for: "PKCE", "code_challenge", "code_verifier"
   ```
5. Auth should succeed
6. Close and reopen app
7. Should stay logged in (session persisted)

**Verify in Android Studio Logcat**:
```
Filter: "Auth|PKCE|Supabase"
Should see: "Auth (PKCE)" log messages
Should NOT see: plain code_verifier (it's in secure storage)
```

**Acceptance**: ✅ PKCE works on Android

---

### Step 6: Test PKCE on iOS (Mac Only)

**Terminal Command** (Mac):
```bash
npm run mobile:ios
```

**Test Flow**:
1. App launches in simulator
2. Log in with test credentials
3. **Check Xcode Console** for PKCE logs
4. Auth should succeed
5. Close and reopen app
6. Should stay logged in

**Verify in Xcode Console**:
```
Look for: "[ios] Auth (PKCE)"
Should see successful auth event
```

**Acceptance**: ✅ PKCE works on iOS

---

### Step 7: Test Sign Out with PKCE

**Test on All Platforms**:

**Web**:
1. Log in (PKCE flow)
2. Verify logged in
3. Sign out
4. Verify logged out
5. Refresh - should stay logged out

**Android**:
1. Log in (PKCE flow)
2. Sign out
3. Close app
4. Reopen - should be logged out

**iOS** (Mac):
1. Log in (PKCE flow)
2. Sign out
3. Close app
4. Reopen - should be logged out

**Acceptance**: ✅ Sign out works with PKCE

---

### Step 8: Test PKCE Edge Cases

**Test Scenarios**:

**Scenario 1: Multiple Sign-ins**
- Log in
- Sign out
- Log in again (different user if available)
- Should work without issues

**Scenario 2: Offline Auth Attempt**
- Turn off network
- Try to log in
- Should show appropriate error
- Turn on network
- Try again - should succeed

**Scenario 3: Token Refresh with PKCE**
- Log in
- Wait for token expiry (or force by manipulating time)
- App should auto-refresh token using PKCE
- User stays logged in

**Scenario 4: Concurrent Sessions**
- Log in on web
- Log in on mobile with same account
- Both should maintain separate sessions
- Sign out on one - other stays logged in

**Acceptance**: ✅ All edge cases pass

---

### Step 9: Create PKCE Helper Utilities (Optional)

**Create new file**: `src/lib/pkceUtils.ts`

```typescript
/**
 * PKCE Utilities
 * Helper functions for PKCE flow (for reference/testing)
 */

/**
 * Generate a random code verifier
 * @returns Base64url-encoded random string
 */
export function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64UrlEncode(array);
}

/**
 * Generate code challenge from verifier
 * @param verifier - Code verifier
 * @returns Base64url-encoded SHA-256 hash
 */
export async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return base64UrlEncode(new Uint8Array(hash));
}

/**
 * Base64url encode
 */
function base64UrlEncode(array: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...array));
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Verify PKCE flow is working
 */
export async function verifyPkceFlow(): Promise<boolean> {
  try {
    const verifier = generateCodeVerifier();
    const challenge = await generateCodeChallenge(verifier);
    
    // Basic validation
    if (!verifier || !challenge) return false;
    if (verifier === challenge) return false; // Should be hashed
    
    console.log('✅ PKCE verification passed', {
      verifierLength: verifier.length,
      challengeLength: challenge.length
    });
    
    return true;
  } catch (error) {
    console.error('❌ PKCE verification failed:', error);
    return false;
  }
}
```

**Save the file.**

**Test PKCE utilities**:
```typescript
// In browser console or test file
import { verifyPkceFlow } from './lib/pkceUtils';
await verifyPkceFlow(); // Should return true
```

**Acceptance**: ✅ PKCE utilities created

---

### Step 10: Update Auth Documentation

**File to Edit**: `docs/MOBILE_AUTH.md`

**Add PKCE section**:
```markdown
## PKCE Flow (Enhanced Security) 🔐

### What is PKCE?

PKCE (Proof Key for Code Exchange) is an OAuth 2.0 extension that adds an extra layer of security for mobile apps.

**How it works**:
1. App generates random `code_verifier`
2. App creates `code_challenge` = SHA-256(code_verifier)
3. Server stores challenge
4. Server returns authorization code
5. App exchanges code + verifier for tokens
6. Server verifies challenge matches verifier

**Why it's secure**:
- Even if authorization code is intercepted, attacker can't use it
- Requires both code AND original verifier
- Verifier never transmitted during initial auth

---

### PKCE Configuration

Our app uses PKCE by default:

```typescript
const supabaseConfig = {
  auth: {
    flowType: 'pkce', // ← PKCE enabled
    storage: supabaseStorage,
    autoRefreshToken: true,
    persistSession: true
  }
};
```

---

### PKCE vs Implicit Flow

**Implicit Flow** (old, less secure):
- Server returns tokens directly in URL
- Tokens visible in browser history
- More vulnerable to interception

**PKCE Flow** (modern, more secure):
- Server returns authorization code
- Code exchanged for tokens with verifier
- Tokens not exposed in URL
- Protected against interception

---

### Testing PKCE

**Verify PKCE is Active**:
1. Open DevTools → Network
2. Log in
3. Look for `code_challenge` in auth requests
4. Should see `code_challenge_method: S256`

**Check Logs**:
```typescript
// Development mode shows PKCE logs
[web] Auth (PKCE): SIGNED_IN { hasSession: true, flow: 'pkce' }
```

---

### Troubleshooting PKCE

**Issue: "Invalid PKCE parameters"**
- Check Supabase project settings
- Ensure PKCE is enabled in auth configuration
- Verify `flowType: 'pkce'` in client config

**Issue: "Code challenge required"**
- PKCE is enabled but verifier not generated
- Check browser/app supports crypto.subtle
- Fallback: Use implicit flow (less secure)

**Issue: Auth works on web but not mobile**
- Rebuild and sync: `npm run build && npx cap sync`
- Clear app data on device
- Check mobile logs for PKCE errors
```

**Save the file.**

**Acceptance**: ✅ Documentation updated

---

### Step 11: Create PKCE Tests (Optional)

**Create new file**: `src/lib/__tests__/pkceUtils.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { generateCodeVerifier, generateCodeChallenge, verifyPkceFlow } from '../pkceUtils';

describe('PKCE Utils', () => {
  it('should generate code verifier', () => {
    const verifier = generateCodeVerifier();
    expect(verifier).toBeTruthy();
    expect(verifier.length).toBeGreaterThan(32);
  });

  it('should generate code challenge from verifier', async () => {
    const verifier = generateCodeVerifier();
    const challenge = await generateCodeChallenge(verifier);
    
    expect(challenge).toBeTruthy();
    expect(challenge).not.toBe(verifier); // Should be hashed
    expect(challenge.length).toBeGreaterThan(0);
  });

  it('should generate different verifiers each time', () => {
    const verifier1 = generateCodeVerifier();
    const verifier2 = generateCodeVerifier();
    
    expect(verifier1).not.toBe(verifier2);
  });

  it('should verify PKCE flow', async () => {
    const result = await verifyPkceFlow();
    expect(result).toBe(true);
  });

  it('should generate consistent challenge for same verifier', async () => {
    const verifier = generateCodeVerifier();
    const challenge1 = await generateCodeChallenge(verifier);
    const challenge2 = await generateCodeChallenge(verifier);
    
    expect(challenge1).toBe(challenge2);
  });
});
```

**Run tests**:
```powershell
npm test
```

**Acceptance**: ✅ Tests pass

---

### Step 12: Verify PKCE in Production (Checklist)

**Pre-Deployment Checklist**:
- [ ] PKCE enabled in Supabase client config
- [ ] `flowType: 'pkce'` present in auth config
- [ ] Tested on web, Android, iOS
- [ ] Sign in works with PKCE
- [ ] Sign out clears PKCE verifier
- [ ] Token refresh works
- [ ] No console errors
- [ ] Secure storage contains PKCE verifier (encrypted)
- [ ] Network requests show `code_challenge`

**Supabase Dashboard Check**:
1. Go to Supabase Dashboard → Authentication → Settings
2. Verify PKCE is enabled (should be default)
3. Check allowed redirect URIs include your app URIs

**Acceptance**: ✅ Production readiness verified

---

### Step 13: Commit PKCE Implementation

**Terminal Commands**:
```powershell
git add .

git commit -m "feat: Enable PKCE auth flow for mobile security - Story 7.2.2

- Enabled PKCE (Proof Key for Code Exchange) in Supabase config
- Updated auth flow to use code_challenge and code_verifier
- Added PKCE indicator to request headers
- Created PKCE utilities for testing and verification
- Tested PKCE on web, iOS, and Android
- Updated MOBILE_AUTH.md with PKCE documentation
- Added unit tests for PKCE utilities

Changes:
- src/lib/supabase.ts: Enabled flowType: 'pkce'
- src/lib/pkceUtils.ts: PKCE helper utilities
- docs/MOBILE_AUTH.md: PKCE documentation
- src/lib/__tests__/pkceUtils.test.ts: PKCE tests

Epic: 7.2 - Supabase Mobile Security
Story: 7.2.2 - PKCE Auth Flow

Security improvements:
- Protection against authorization code interception
- Follows OAuth 2.0 best practices for mobile apps
- More secure than implicit flow
- Code verifier stored in encrypted storage"

git push origin mobile-app-setup
```

**Acceptance**: ✅ All changes committed

---

## ✅ Verification Checklist

- [ ] `flowType: 'pkce'` added to Supabase config
- [ ] PKCE works on web browser
- [ ] PKCE works on Android emulator
- [ ] PKCE works on iOS simulator (if Mac available)
- [ ] Network requests show `code_challenge` parameter
- [ ] Auth flow completes successfully
- [ ] Token refresh works with PKCE
- [ ] Sign out clears PKCE verifier
- [ ] `src/lib/pkceUtils.ts` created (optional)
- [ ] `docs/MOBILE_AUTH.md` updated
- [ ] Unit tests added and passing (optional)
- [ ] All changes committed to git

**All items checked?** ✅ Story 7.2.2 is COMPLETE

---

## 🚨 Troubleshooting

### Issue: "PKCE is not enabled"
**Solution**: Update Supabase client:
```typescript
auth: {
  flowType: 'pkce', // ← Must be 'pkce'
  // ...
}
```

### Issue: "Invalid code_challenge_method"
**Solution**: 
- Verify using S256 (SHA-256)
- Older Supabase versions might need upgrade
- Check: `npm update @supabase/supabase-js`

### Issue: PKCE works on web but not mobile
**Solution**:
```powershell
npm run build
npx cap sync
# Completely uninstall and reinstall app
```

### Issue: "crypto.subtle is not available"
**Solution**: 
- Ensure running over HTTPS or localhost
- Check browser/WebView supports Web Crypto API
- Mobile: Should be supported on modern devices

---

## 📚 Additional Notes

### What We Implemented
- ✅ PKCE flow in Supabase config
- ✅ Code challenge/verifier generation (handled by Supabase SDK)
- ✅ PKCE indicator in headers
- ✅ PKCE utilities for testing

### Security Improvements
- **Before**: Implicit flow (tokens in URL)
- **After**: PKCE flow (authorization code + verifier)
- **Benefit**: Protected against code interception attacks

### PKCE Flow Diagram
```
1. App → Server: Login request + code_challenge
2. Server → App: Authorization code
3. App → Server: Code + code_verifier
4. Server: Verifies challenge matches verifier
5. Server → App: Access token + refresh token
```

### What's Next?
- **Story 7.2.3**: Push Notification Token Registration
- **Story 7.2.4**: Network Connectivity Detection
- **Story 7.2.5**: Offline Queue for Supabase Operations

---

## 🔗 Related Documentation

- [OAuth 2.0 PKCE Spec (RFC 7636)](https://datatracker.ietf.org/doc/html/rfc7636)
- [Supabase Auth Configuration](https://supabase.com/docs/reference/javascript/auth-signup)
- [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
- [EPIC 7.2 Overview](../epics/EPIC_7.2_Supabase_Mobile_Security.md)

---

**Story Status**: ⚪ PLANNED  
**Previous Story**: [STORY_7.2.1_Secure_Storage_Setup.md](./STORY_7.2.1_Secure_Storage_Setup.md)  
**Next Story**: [STORY_7.2.3_Push_Token_Registration.md](./STORY_7.2.3_Push_Token_Registration.md)  
**Epic Progress**: Story 2/5 complete (20% → 40%)
