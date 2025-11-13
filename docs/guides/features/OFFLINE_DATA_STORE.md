# Offline-First Data Store 💾

## Overview

Businesses are cached locally and synced automatically when online for seamless offline access.

---

## Features

- **Offline Access**: Businesses load from cache when offline
- **Auto-Sync**: Automatically syncs with server when online
- **Cache Expiration**: Data refreshes after 7 days
- **Smart Loading**: Uses cache if fresh (<24h), syncs if stale
- **Status Indicator**: Visual banner shows cached/online status
- **Network Detection**: Automatic sync when network returns

---

## Usage

### Basic Usage

```typescript
import { useOfflineBusinessStore } from './store/offlineBusinessStore'

const { businesses, fetchBusinesses, isSyncing } = useOfflineBusinessStore()

// Fetch businesses (uses cache if fresh)
await fetchBusinesses()

// Force refresh from server
await fetchBusinesses(true)
```

### Check Cache Status

```typescript
const { lastSyncTimestamp, isOfflineMode } = useOfflineBusinessStore()

if (isOfflineMode) {
  console.log('Viewing cached data')
}
```

### Manual Sync

```typescript
await useOfflineBusinessStore.getState().syncWithServer()
```

### Get Business by ID

```typescript
const business = useOfflineBusinessStore.getState().getBusinessById('123')
```

### Clear Cache

```typescript
await useOfflineBusinessStore.getState().clearCache()
```

---

## Cache Strategy

1. **First Load**: Fetch from server, cache locally
2. **Subsequent Loads**: Use cache if < 24 hours old
3. **Offline**: Always use cache
4. **Online Return**: Auto-sync in background
5. **Expired (7+ days)**: Force sync when online

---

## Cache Storage

- **Location**: IndexedDB (web), native storage (mobile)
- **Key**: `offline-business-storage`
- **Size**: ~100 businesses (~500KB)
- **Expiration**: 7 days

---

## Components

### CacheStatus Component

Shows sync status banner at top of page:
- 📦 **Yellow**: Viewing cached data (offline)
- ✅ **Blue**: Online, data synced

**Usage**:
```typescript
import { CacheStatus } from './components/CacheStatus'

<CacheStatus />
```

---

## Example: Business List Page

```typescript
import { useEffect } from 'react'
import { useOfflineBusinessStore } from '../store/offlineBusinessStore'
import { CacheStatus } from '../components/CacheStatus'

function BusinessListPage() {
  const { 
    businesses, 
    fetchBusinesses, 
    isSyncing 
  } = useOfflineBusinessStore()

  useEffect(() => {
    fetchBusinesses()
  }, [fetchBusinesses])

  if (isSyncing && businesses.length === 0) {
    return <div>Loading businesses...</div>
  }

  return (
    <div>
      <CacheStatus />
      
      <div className="business-list">
        {businesses.map(business => (
          <BusinessCard key={business.id} business={business} />
        ))}
      </div>
      
      {businesses.length === 0 && (
        <div>No businesses cached. Connect to internet to load.</div>
      )}
    </div>
  )
}
```

---

## Auto-Sync Behavior

The store automatically listens for network events:

- **Network comes online**: Auto-sync with server
- **Network goes offline**: Switch to offline mode

```typescript
window.addEventListener('online', () => {
  syncWithServer()
})

window.addEventListener('offline', () => {
  setOfflineMode(true)
})
```

---

## Troubleshooting

### Businesses not loading offline
- Check IndexedDB has cached data: DevTools → Application → IndexedDB → SyncWarpApp
- Verify `lastSyncTimestamp` exists
- Try loading once while online first

### Cache not updating
- Force refresh: `fetchBusinesses(true)`
- Clear cache: `clearCache()`
- Check network status in console

### Old data showing
- Cache expires after 7 days
- Force refresh to sync immediately
- Check `lastSyncTimestamp` value

### Sync errors
- Check console for error messages
- Verify Supabase connection
- Check network connectivity
- Try manual sync: `syncWithServer()`

---

## Performance Considerations

- **Initial Sync**: ~2-3s for 100 businesses
- **Cache Load**: <100ms (instant)
- **Storage Size**: ~5KB per business × 100 = ~500KB
- **IndexedDB Limit**: 50MB+ (plenty of room)

---

## Related

- **Story 7.3.1**: PWA Setup (Service Worker)
- **Story 7.3.2**: Zustand Persistence (Auth state)
- **Story 7.3.4**: Network Status Hook (Enhanced detection)

---

## Resources

- [Zustand Persist Documentation](https://docs.pmnd.rs/zustand/integrations/persisting-store-data)
- [Offline-First Architecture](https://offlinefirst.org/)
- [localforage Documentation](https://localforage.github.io/localForage/)
