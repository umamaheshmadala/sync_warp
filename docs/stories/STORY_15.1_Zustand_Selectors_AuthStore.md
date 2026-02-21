# STORY 15.1 — Add Zustand Selectors to All 89+ `useAuthStore()` Call Sites

**EPIC:** [EPIC 15 — Rendering Performance & State Management](../epics/EPIC_15_Rendering_Performance_State_Management.md)  
**Status:** 📋 Ready  
**Priority:** 🔴 Critical  
**Estimate:** 5 points  
**Dependencies:** None (first story, no blockers)  
**Audit Finding:** 1.1 — Zustand over-subscription — `useAuthStore()` in 89+ files

---

## 🎯 User Story

> As a user, I want the app to be snappy and responsive so that navigating between pages and performing actions feels instant.

---

## 📍 Problem

When a component calls `useAuthStore()` without a selector (destructuring pattern), it subscribes to **the entire store**. Any state change in the auth store — even unrelated fields like `error` or `loading` — triggers a re-render in that component. With 89+ files doing this, a single auth event causes an avalanche of re-renders.

**Example of the problem:**
```typescript
// ❌ BAD — subscribes to ALL state fields
const { user } = useAuthStore();  // re-renders on loading, error, profile, etc.

// ✅ GOOD — subscribes only to `user`
const user = useAuthStore(state => state.user);  // re-renders only when `user` changes
```

---

## 🔍 Codebase Research — Current State

### `authStore.ts` State Fields (8 total)
```typescript
interface AuthState {
  user: AuthUser | null;          // Used in 80+ files
  profile: Profile | null;        // Used in ~20 files
  loading: boolean;               // Changes frequently during auth ops
  initialized: boolean;           // Changes once on startup
  error: string | null;           // Changes on errors
  uploadingAvatar: boolean;       // Changes during avatar upload
  signUp: (...) => Promise<void>; // Action — stable reference
  signIn: (...) => Promise<void>; // Action — stable reference
  signOut: () => Promise<void>;   // Action — stable reference
  updateProfile: (...) => Promise<void>;
  uploadAvatar: (...) => Promise<void>;
  checkUser: () => Promise<void>;
  clearError: () => void;
  forgotPassword: (...) => Promise<void>;
  resetPassword: (...) => Promise<void>;
}
```

### Already Fixed (3 files)
`Header.tsx` lines 29-31 already use proper selectors:
```typescript
const user = useAuthStore((state) => state.user);
const profile = useAuthStore((state) => state.profile);
const signOut = useAuthStore((state) => state.signOut);
```

### Pattern Categories Found in 50+ Grep Results (capped at 50, audit claims 89+)

**Category A — `const { user } = useAuthStore()` (most common, ~50+ files)**
Files: Nearly all hooks (`useBusiness.ts`, `useConversations.ts`, `useCoupons.ts`, `useFavorites.ts`, `useFriends.ts`, etc.) and many components.

**Category B — `const { user, profile } = useAuthStore()` (~10 files)**
Files: Some components needing both user auth and profile data.

**Category C — `const { profile } = useAuthStore()` (~5 files)**  
Files: `useAdSlots.ts`, `useDrivers.ts`, `useDashboardContent.ts`, `AdminAuditLogPage.tsx`.

**Category D — `const { user, loading, error } = useAuthStore()` (~5 files)**
Files: Auth-related pages (login, signup, forgot password).

**Category E — `const { signOut } = useAuthStore()` (~3 files)**
Files: Components with logout buttons.

**Category F — Multi-field destructuring (~5 files)**
Files: `ProtectedRoute.tsx` uses `{ user, profile, initialized, loading, checkUser }`.

---

## ✅ Implementation Plan

### Transformation Rule

For each file, apply this mechanical transformation:

| Before (BAD) | After (GOOD) |
|---|---|
| `const { user } = useAuthStore()` | `const user = useAuthStore(s => s.user)` |
| `const { user, profile } = useAuthStore()` | Two separate lines: `const user = useAuthStore(s => s.user)` + `const profile = useAuthStore(s => s.profile)` |
| `const { signOut } = useAuthStore()` | `const signOut = useAuthStore(s => s.signOut)` |
| `const { user, loading, error } = useAuthStore()` | Three separate lines, one per field |

### Important: Actions can share a single selector
Actions (functions) are stable references — they don't change between renders. Multiple actions can be safely combined:
```typescript
// This is fine — actions are stable references
const { signIn, signOut, clearError } = useAuthStore();
// But data fields MUST be individual selectors:
const user = useAuthStore(s => s.user);
const loading = useAuthStore(s => s.loading);
```

### Execution Approach

1. **Start with hooks** (`src/hooks/`) — these are reused across many components
2. **Then components** (`src/components/`) — direct UI impact
3. **Then pages** (`src/pages/`) — fewer files
4. **Then router** (`src/router/`) — critical paths
5. **Skip test files** (`src/__tests__/`) — test mocks may need different treatment

### How to Find All Files
```bash
grep -rn "useAuthStore()" src/ --include="*.ts" --include="*.tsx" | grep -v "__tests__" | grep -v "authStore.ts"
```

---

## ⚠️ Edge Case: `ProtectedRoute.tsx`

`ProtectedRoute.tsx` uses 5 fields: `{ user, profile, initialized, loading, checkUser }`. This is a critical route guard — it genuinely needs all these fields. The fix still applies (separate selectors per data field), but be aware that this component will re-render on auth changes by design.

---

## 🧪 Verification

| Check | Expected |
|-------|----------|
| `grep -rn "useAuthStore()" src/ --include="*.ts" --include="*.tsx" \| grep -v "__tests__" \| grep -v "authStore.ts"` | 0 results with bare `useAuthStore()` |
| React DevTools Profiler → trigger auth loading state | Only auth-aware components re-render |
| `npm run build` | Build succeeds with 0 errors |
| Login/logout flow | Still works correctly |
| Profile updates | Still reflected in UI |

---

## ✅ Acceptance Criteria

- [ ] All `useAuthStore()` calls (except `authStore.ts` itself) use granular selectors
- [ ] Each data field (`user`, `profile`, `loading`, etc.) has its own selector
- [ ] Actions may share destructuring (stable references)
- [ ] Build passes with zero errors
- [ ] Auth flows (login, logout, profile update) still function correctly
- [ ] React DevTools Profiler shows reduced re-renders on auth state change

---

## ✅ Definition of Done

- [ ] Zero bare `useAuthStore()` calls in application code
- [ ] Build passes
- [ ] Auth flows tested
