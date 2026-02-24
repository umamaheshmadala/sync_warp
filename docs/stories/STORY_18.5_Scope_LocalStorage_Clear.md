# STORY 18.5 — Scope `localStorage.clear()` to Auth Keys Only

**Epic:** [EPIC 18 — Native Mobile Feel & Production Hardening](../epics/EPIC_18_Native_Mobile_Feel_Production_Hardening.md)  
**Status:** 📋 Ready  
**Priority:** 🟠 High  
**Estimate:** 1 story point  
**Dependencies:** None  
**Audit Findings:** 6.5  

---

## 🎯 Goal

Replace all `localStorage.clear()` calls with targeted key removal so that auth errors and sign-outs don't wipe non-auth app data (cached preferences, theme settings, offline queues, etc.). Currently, any auth state change nukes ALL localStorage — including data that should survive a re-login.

---

## 📍 Current State (What Exists)

### 3 production `localStorage.clear()` call sites

| File | Line | Trigger | Severity |
|------|------|---------|----------|
| [supabase.ts](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/src/lib/supabase.ts) | 82 | `TOKEN_REFRESHED` failed (no session) | 🔴 Critical — wipes all data on token refresh failure |
| [supabase.ts](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/src/lib/supabase.ts) | 91 | `SIGNED_OUT` event | 🟠 High — wipes preferences that should persist across sign-outs |
| [secureStorage.ts](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/src/lib/secureStorage.ts) | 80 | `SecureStorage.clear()` method | 🟡 Medium — utility method, risk depends on callers |

#### supabase.ts — Lines 77-93:

```typescript
supabase.auth.onAuthStateChange((event, session) => {
  // Handle refresh token errors
  if (event === 'TOKEN_REFRESHED' && !session) {
    console.error('Token refresh failed - logging out')
    localStorage.clear()      // ← WIPES EVERYTHING
    sessionStorage.clear()
    window.location.href = '/auth/login'
  }

  // Handle signed out event
  if (event === 'SIGNED_OUT') {
    console.log('User signed out')
    localStorage.clear()      // ← WIPES EVERYTHING
    sessionStorage.clear()
  }
})
```

#### secureStorage.ts — Lines 75-86:

```typescript
static async clear(): Promise<void> {
  try {
    if (this.isNative) {
      await Preferences.clear();
    } else {
      localStorage.clear();   // ← WIPES EVERYTHING (web fallback)
    }
  } catch (error) {
    console.error('[SecureStorage] Error clearing storage:', error);
    throw error;
  }
}
```

### What gets destroyed by `localStorage.clear()`:

All keys, including:
- `supabase.auth.token` — auth session (intended to clear ✅)
- `sync-theme` — theme preference (Story 17.4) ❌
- `sync-offline-queue` — offline message queue ❌
- `sync-favorites` — cached favorites ❌
- Any Zustand persisted stores ❌
- Third-party library cached data ❌

### Auth-specific keys follow a `supabase.auth.*` prefix pattern

The Supabase auth library stores session data under keys prefixed with `sb-` or `supabase.auth.`. In `supabase.ts` line 37:

```typescript
storageKey: 'supabase.auth.token'
```

---

## 🔧 Implementation Details

### Step 1: Create a helper function for scoped auth cleanup

**File:** [supabase.ts](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/src/lib/supabase.ts) — Add before line 77:

```typescript
/**
 * Clear only auth-related keys from localStorage.
 * Preserves user preferences, cached data, and Zustand stores.
 * Story 18.5 — scoped localStorage cleanup.
 */
function clearAuthStorage(): void {
  // Auth-specific key patterns
  const authPrefixes = ['supabase.auth', 'sb-'];
  const authExactKeys = ['supabase.auth.token'];

  const keysToRemove: string[] = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && authPrefixes.some(prefix => key.startsWith(prefix))) {
      keysToRemove.push(key);
    }
  }

  // Also add any exact keys that might not match prefixes
  authExactKeys.forEach(key => {
    if (!keysToRemove.includes(key)) {
      keysToRemove.push(key);
    }
  });

  keysToRemove.forEach(key => localStorage.removeItem(key));
  sessionStorage.clear(); // sessionStorage is ephemeral, safe to clear entirely
}
```

### Step 2: Replace `localStorage.clear()` in token refresh handler

**File:** [supabase.ts](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/src/lib/supabase.ts) — Line 82:

```diff
 if (event === 'TOKEN_REFRESHED' && !session) {
   console.error('Token refresh failed - logging out')
-  localStorage.clear()
-  sessionStorage.clear()
+  clearAuthStorage()
   window.location.href = '/auth/login'
 }
```

### Step 3: Replace `localStorage.clear()` in sign-out handler

**File:** [supabase.ts](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/src/lib/supabase.ts) — Line 91:

```diff
 if (event === 'SIGNED_OUT') {
   console.log('User signed out')
-  localStorage.clear()
-  sessionStorage.clear()
+  clearAuthStorage()
 }
```

### Step 4: Update `SecureStorage.clear()` to scope to auth keys

**File:** [secureStorage.ts](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/src/lib/secureStorage.ts) — Lines 75-86:

```diff
-  static async clear(): Promise<void> {
+  /**
+   * Clear auth-related storage only (not all app data).
+   * For a full wipe, use clearAll() instead.
+   */
+  static async clearAuth(): Promise<void> {
     try {
       if (this.isNative) {
-        await Preferences.clear();
+        // Remove auth-specific keys only
+        await Preferences.remove({ key: STORAGE_KEYS.AUTH_SESSION });
       } else {
-        localStorage.clear();
+        // Remove auth-specific keys from localStorage
+        const authPrefixes = ['supabase.auth', 'sb-'];
+        const keysToRemove: string[] = [];
+        for (let i = 0; i < localStorage.length; i++) {
+          const key = localStorage.key(i);
+          if (key && authPrefixes.some(prefix => key.startsWith(prefix))) {
+            keysToRemove.push(key);
+          }
+        }
+        keysToRemove.forEach(key => localStorage.removeItem(key));
       }
     } catch (error) {
-      console.error('[SecureStorage] Error clearing storage:', error);
+      console.error('[SecureStorage] Error clearing auth storage:', error);
       throw error;
     }
   }
```

Optionally keep a `clearAll()` method for factory reset scenarios, but rename the existing `clear()` to `clearAuth()` to prevent accidental full wipes.

---

## 🧪 Verification

### Auth Error Test
1. Open the app (logged in) and add a custom localStorage key:
   ```javascript
   localStorage.setItem('test-preference', 'should-survive')
   localStorage.setItem('sync-theme', '{"mode":"dark"}')
   ```
2. Trigger a sign-out (Settings → Logout)
3. Check localStorage:
   ```javascript
   localStorage.getItem('test-preference')  // → 'should-survive' ✅
   localStorage.getItem('sync-theme')       // → '{"mode":"dark"}' ✅
   localStorage.getItem('supabase.auth.token')  // → null ✅
   ```
4. **Before fix:** All keys are null (wiped)
5. **After fix:** Only auth keys removed; preferences preserved

### Token Refresh Failure Test
1. Manually corrupt the auth token in localStorage
2. Wait for the token refresh cycle (or trigger manually)
3. **Expected:** Auth keys cleared, redirect to login, non-auth keys preserved

### Re-Login Test
1. Log out → log back in
2. **Expected:** Theme preference, favorites, offline queue all preserved from previous session

---

## ✅ Acceptance Criteria

- [ ] `localStorage.clear()` replaced with `clearAuthStorage()` in `supabase.ts` (both call sites)
- [ ] `SecureStorage.clear()` renamed to `clearAuth()` with scoped key removal
- [ ] Auth keys (`supabase.auth.*`, `sb-*`) are properly cleared on sign-out
- [ ] Non-auth keys (theme, favorites, offline queue) survive sign-out
- [ ] Non-auth keys survive token refresh failures
- [ ] `sessionStorage.clear()` still called (ephemeral data, safe to clear)
- [ ] Test keys set before logout persist after re-login

---

## 📁 Files to Modify

| File | Action |
|------|--------|
| [supabase.ts](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/src/lib/supabase.ts) | MODIFY — add `clearAuthStorage()` helper; replace both `localStorage.clear()` calls |
| [secureStorage.ts](file:///c:/Users/umama/OneDrive/Documents/GitHub/sync_warp/src/lib/secureStorage.ts) | MODIFY — rename `clear()` → `clearAuth()`; scope to auth keys only |
