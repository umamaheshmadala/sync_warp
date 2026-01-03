# Story 7.3.2: Zustand Persistence Middleware ✅ COMPLETE

**Epic**: EPIC 7.3 - Enhanced Offline Mode with PWA  
**Story Points**: 3  
**Estimated Time**: 2-3 hours  
**Dependencies**: Story 7.3.1 complete (PWA setup)

---

## 📋 Overview

**What**: Implement Zustand persistence middleware to keep app state (auth, user data) across sessions using localforage for mobile-optimized storage.

**Why**: Users expect to stay logged in when they close and reopen the app. Without persistence, they'd need to log in every time. Zustand's persist middleware with localforage provides reliable, IndexedDB-based storage that works across web and mobile platforms.

**User Value**: Users stay logged in indefinitely. Their preferences, auth state, and session data persist across app restarts, providing a seamless native app experience.

---

## 🎯 Acceptance Criteria

- [ ] zustand/middleware persist installed
- [ ] localforage installed and configured
- [ ] authStore wrapped with persist middleware
- [ ] Only essential data persisted (security-conscious)
- [ ] State restores correctly on app restart
- [ ] Works on web, iOS, and Android
- [ ] Migration strategy for existing users
- [ ] Persistence tested on all platforms
- [ ] Documentation created
- [ ] Changes committed to git

---

## 📝 Implementation Steps

### Step 1: Install Dependencies

**Terminal Commands**:
```powershell
# Install localforage for IndexedDB storage
npm install localforage

# Verify Zustand already includes persist middleware
npm list zustand
```

**Expected Output**:
```
sync-app@0.0.0
├── localforage@1.10.0
└── zustand@4.x.x
```

**Note**: Zustand's persist middleware is built-in, no extra package needed.

**Acceptance**: ✅ Dependencies installed

---

### Step 2: Configure Localforage

**Create new file**: `src/lib/storage.ts`

```typescript
import localforage from 'localforage';
import { Capacitor } from '@capacitor/core';

/**
 * Configure localforage for optimal mobile storage
 * Uses IndexedDB on web, native storage on mobile
 */

const isNative = Capacitor.isNativePlatform();

// Configure localforage
localforage.config({
  name: 'SynCApp',
  storeName: 'app_state',
  description: 'SynC App State Storage',
  driver: isNative 
    ? [localforage.LOCALSTORAGE] // Mobile: Use localStorage (backed by native)
    : [localforage.INDEXEDDB, localforage.LOCALSTORAGE] // Web: Prefer IndexedDB
});

export default localforage;
```

**Save the file.**

**Acceptance**: ✅ Localforage configured

---

### Step 3: Update authStore with Persist Middleware

**File to Edit**: `src/store/authStore.ts`

**Add imports**:
```typescript
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { supabase, Profile, AuthUser } from '../lib/supabase'
import localforage from '../lib/storage'
```

**Wrap store with persist middleware**:
```typescript
interface AuthState {
  user: AuthUser | null
  profile: Profile | null
  loading: boolean
  initialized: boolean
  error: string | null
  
  // Actions (same as before)
  signUp: (email: string, password: string, userData?: any) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  updateProfile: (updates: Partial<Profile>) => Promise<Profile | undefined>
  checkUser: () => Promise<void>
  clearError: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // State
      user: null,
      profile: null,
      loading: true,
      initialized: false,
      error: null,

      // Actions (keep all existing implementation)
      signUp: async (email: string, password: string, userData = {}) => {
        // ... existing signUp implementation
      },

      signIn: async (email: string, password: string) => {
        // ... existing signIn implementation
      },

      signOut: async () => {
        // ... existing signOut implementation
      },

      updateProfile: async (updates: Partial<Profile>) => {
        // ... existing updateProfile implementation
      },

      checkUser: async () => {
        // ... existing checkUser implementation
      },

      clearError: () => set({ error: null })
    }),
    {
      name: 'auth-storage', // Key in storage
      storage: createJSONStorage(() => localforage),
      partialize: (state) => ({
        // Only persist essential data
        user: state.user,
        profile: state.profile,
        initialized: state.initialized
        // Don't persist: loading, error (these are temporary)
      }),
      version: 1, // For future migrations
      migrate: (persistedState: any, version: number) => {
        // Migration logic for future schema changes
        if (version === 0) {
          // Example: migrate from old schema to new
          return persistedState;
        }
        return persistedState;
      }
    }
  )
)
```

**Save the file.**

**Acceptance**: ✅ Persist middleware added

---

### Step 4: Handle Hydration

**File to Edit**: `src/App.tsx`

**Add hydration check**:
```typescript
import { useEffect, useState } from 'react'
import { useAuthStore } from './store/authStore'

function App() {
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    // Wait for Zustand to hydrate from storage
    const unsubscribe = useAuthStore.persist.onFinishHydration(() => {
      setIsHydrated(true)
      console.log('[App] State hydrated from storage')
    })

    // Check if already hydrated
    if (useAuthStore.persist.hasHydrated()) {
      setIsHydrated(true)
    }

    return unsubscribe
  }, [])

  // Show loading while hydrating
  if (!isHydrated) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh'
      }}>
        <div>Loading...</div>
      </div>
    )
  }

  return (
    <div className="App">
      {/* Your app content */}
    </div>
  )
}

export default App
```

**Save the file.**

**Acceptance**: ✅ Hydration handled

---

### Step 5: Test Persistence on Web

**Terminal Command**:
```powershell
npm run dev
```

**Test Steps**:
1. Open http://localhost:5173
2. Log in with test account
3. Open DevTools → Application → IndexedDB
4. Verify "SynCApp" database exists
5. Check "auth-storage" entry has user data
6. **Refresh page** - should stay logged in
7. **Close and reopen browser** - should stay logged in

**Check in Console**:
```javascript
// Should see hydration log
[App] State hydrated from storage
```

**Acceptance**: ✅ Persistence works on web

---

### Step 6: Test Persistence on Mobile

**Build and deploy**:
```powershell
npm run build
npx cap sync android
```

**Test on Android**:
1. Run app: `npm run mobile:android`
2. Log in with test account
3. Close app completely (swipe away from recents)
4. Reopen app
5. **Should be logged in** without re-entering credentials

**Verify in Chrome DevTools**:
```
chrome://inspect#devices
→ Inspect WebView
→ Application → Local Storage
→ Check for persisted state
```

**Acceptance**: ✅ Persistence works on mobile

---

### Step 7: Implement Selective Persistence

**File to Edit**: `src/store/authStore.ts`

**Update partialize function**:
```typescript
{
  name: 'auth-storage',
  storage: createJSONStorage(() => localforage),
  partialize: (state) => ({
    // Persist only non-sensitive, essential data
    user: {
      id: state.user?.id,
      email: state.user?.email,
      // Don't persist full user object with tokens
    },
    profile: {
      id: state.profile?.id,
      full_name: state.profile?.full_name,
      email: state.profile?.email,
      city: state.profile?.city,
      avatar_url: state.profile?.avatar_url,
      // Only persist display data, not everything
    },
    initialized: state.initialized
  }),
  // ... rest of config
}
```

**Acceptance**: ✅ Selective persistence implemented

---

### Step 8: Add Clear Storage Utility

**File to Edit**: `src/store/authStore.ts`

**Add clearStorage method**:
```typescript
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // ... existing state and methods

      clearStorage: async () => {
        // Clear persisted state
        await useAuthStore.persist.clearStorage()
        // Reset store to initial state
        set({
          user: null,
          profile: null,
          loading: false,
          initialized: false,
          error: null
        })
        console.log('[Auth] Storage cleared')
      }
    }),
    {
      // ... persist config
    }
  )
)
```

**Update signOut to clear storage**:
```typescript
signOut: async () => {
  try {
    // Remove push token
    const pushToken = await SecureStorage.getPushToken()
    if (pushToken) {
      await supabase.from('push_tokens').delete().eq('token', pushToken)
      await SecureStorage.remove('push.token')
    }

    // Sign out from Supabase
    await supabase.auth.signOut()
    
    // Clear persisted state
    await useAuthStore.persist.clearStorage()
    
    set({ user: null, profile: null })
  } catch (error) {
    console.error('[Auth] Sign out error:', error)
    throw error
  }
}
```

**Acceptance**: ✅ Clear storage utility added

---

### Step 9: Create Documentation

**Create new file**: `docs/STATE_PERSISTENCE.md`

```markdown
# State Persistence with Zustand 💾

## Overview

The app uses Zustand's persist middleware with localforage for reliable state persistence across sessions.

---

## Configuration

### Storage Backend
- **Web**: IndexedDB (primary), localStorage (fallback)
- **Mobile**: localStorage (backed by native storage)

### What's Persisted
```typescript
{
  user: { id, email },           // Basic user info
  profile: { id, name, city },   // Display data
  initialized: boolean           // Hydration flag
}
```

### What's NOT Persisted
- `loading` - Temporary UI state
- `error` - Temporary error messages
- Auth tokens - Stored in SecureStorage separately

---

## How It Works

1. **On App Start**: Zustand hydrates state from storage
2. **On State Change**: Changes automatically persisted
3. **On Sign Out**: Storage cleared completely

---

## Usage

### Access Persisted Store
```typescript
import { useAuthStore } from './store/authStore'

const user = useAuthStore(state => state.user)
const profile = useAuthStore(state => state.profile)
```

### Clear Storage
```typescript
await useAuthStore.persist.clearStorage()
```

### Check Hydration Status
```typescript
const isHydrated = useAuthStore.persist.hasHydrated()
```

---

## Storage Location

### Web (Development)
- DevTools → Application → IndexedDB → SynCApp → app_state

### Web (Production)
- Same as development

### Mobile (Android/iOS)
- Native storage via Capacitor
- Accessible through Chrome DevTools when debugging

---

## Migrations

Version-based migrations for schema changes:

```typescript
migrate: (persistedState: any, version: number) => {
  if (version === 0) {
    // Migrate old schema to new
    return { ...persistedState, newField: 'default' }
  }
  return persistedState
}
```

Current version: 1

---

## Troubleshooting

### User not staying logged in
- Check IndexedDB for "auth-storage" entry
- Verify persist middleware configured
- Check console for hydration logs

### Storage too large
- Review partialize function
- Remove unnecessary fields
- Clear old data

### State not updating
- Check storage backend is accessible
- Verify no errors in console
- Try clearing storage and re-login

---

## Security

### What We Store
- Non-sensitive display data only
- No passwords or tokens
- Selective persistence via partialize

### What We Don't Store
- Auth tokens (in SecureStorage instead)
- Sensitive user data
- Temporary state

---

## Related

- **Story 7.3.1**: PWA Setup
- **Story 7.3.3**: Offline Data Store
```

**Save as**: `docs/STATE_PERSISTENCE.md`

**Acceptance**: ✅ Documentation created

---

### Step 10: Commit Zustand Persistence

**Terminal Commands**:
```powershell
git add .

git commit -m "feat: Add Zustand persistence middleware - Story 7.3.2

- Installed localforage for IndexedDB storage
- Configured localforage for web and mobile
- Wrapped authStore with persist middleware
- Implemented selective persistence (only essential data)
- Added hydration check in App.tsx
- Created clearStorage utility for sign out
- Tested persistence on web and mobile
- State persists across app restarts
- Created state persistence documentation

Changes:
- src/lib/storage.ts: Localforage configuration
- src/store/authStore.ts: Added persist middleware
- src/App.tsx: Added hydration check
- docs/STATE_PERSISTENCE.md: Persistence documentation
- package.json: Added localforage dependency

Epic: 7.3 - Enhanced Offline Mode with PWA
Story: 7.3.2 - Zustand Persistence Middleware

Features:
- User stays logged in across sessions
- IndexedDB storage on web
- Native storage on mobile
- Selective persistence for security
- Automatic hydration on startup"

git push origin mobile-app-setup
```

**Acceptance**: ✅ All changes committed

---

## ✅ Verification Checklist

- [ ] localforage installed
- [ ] storage.ts created and configured
- [ ] authStore wrapped with persist middleware
- [ ] partialize function limits stored data
- [ ] Hydration check in App.tsx
- [ ] clearStorage utility created
- [ ] Tested on web - stays logged in
- [ ] Tested on mobile - stays logged in
- [ ] State restores after app close
- [ ] Documentation created
- [ ] All changes committed to git

**All items checked?** ✅ Story 7.3.2 is COMPLETE

---

## 🚨 Troubleshooting

### Issue: State not persisting
**Solution**:
- Check persist middleware is wrapping store correctly
- Verify localforage is installed
- Check browser supports IndexedDB
- Look for errors in console

### Issue: Old state showing after update
**Solution**:
- Clear storage: `useAuthStore.persist.clearStorage()`
- Increment version number in persist config
- Implement migration function

### Issue: App stuck on "Loading..."
**Solution**:
- Check hydration is completing
- Add timeout fallback in App.tsx
- Verify storage is accessible
- Check console for errors

### Issue: Mobile not persisting
**Solution**:
- Verify Capacitor sync ran
- Check localStorage is available on device
- Test in Chrome DevTools (inspect device)
- Clear app data and retry

---

## 📚 Additional Notes

### What We Built
- ✅ Zustand persist middleware integration
- ✅ Localforage for cross-platform storage
- ✅ Selective persistence
- ✅ Hydration handling
- ✅ Storage cleanup utilities

### Storage Size
- Persisted data: ~10-20KB (user + profile)
- IndexedDB limit: 50MB+ (plenty of room)
- localforage handles quota automatically

### What's Next
- **Story 7.3.3**: Offline-First Data Store (businesses cache)
- **Story 7.3.4**: Network Status Detection
- **Story 7.3.5**: Offline Indicator UI

---

## 🔗 Related Documentation

- [Zustand Persist](https://docs.pmnd.rs/zustand/integrations/persisting-store-data)
- [localforage](https://localforage.github.io/localForage/)
- [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [EPIC 7.3 Overview](../epics/EPIC_7.3_Offline_Mode_PWA.md)

---

**Story Status**: ✅ COMPLETE  
**Previous Story**: [STORY_7.3.1_VitePWA_Setup.md](./STORY_7.3.1_VitePWA_Setup.md)  
**Next Story**: [STORY_7.3.3_Offline_Data_Store.md](./STORY_7.3.3_Offline_Data_Store.md)  
**Epic Progress**: Story 2/6 complete (33%)
