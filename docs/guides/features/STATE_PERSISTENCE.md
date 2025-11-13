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
- `uploadingAvatar` - Temporary upload state
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
- DevTools → Application → IndexedDB → SyncWarpApp → app_state

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

## Implementation Details

### Hydration Check (App.tsx)
```typescript
useEffect(() => {
  const unsubscribe = useAuthStore.persist.onFinishHydration(() => {
    setIsHydrated(true)
    console.log('[App] State hydrated from storage')
  })

  if (useAuthStore.persist.hasHydrated()) {
    setIsHydrated(true)
  }

  return unsubscribe
}, [])
```

### Persist Configuration (authStore.ts)
```typescript
persist(
  (set, get) => ({
    // ...store implementation
  }),
  {
    name: 'auth-storage',
    storage: createJSONStorage(() => localforage),
    partialize: (state) => ({
      user: state.user ? { id: state.user.id, email: state.user.email } : null,
      profile: state.profile,
      initialized: state.initialized
    }),
    version: 1
  }
)
```

---

## Related

- **Story 7.3.1**: PWA Setup
- **Story 7.3.3**: Offline Data Store
- **Story 7.3.4**: Network Status Hook

---

## Resources

- [Zustand Persist Documentation](https://docs.pmnd.rs/zustand/integrations/persisting-store-data)
- [localforage Documentation](https://localforage.github.io/localForage/)
- [IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
