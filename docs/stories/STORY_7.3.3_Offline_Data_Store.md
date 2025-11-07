# Story 7.3.3: Offline-First Data Store ⚪ PLANNED

**Epic**: EPIC 7.3 - Enhanced Offline Mode with PWA  
**Story Points**: 5  
**Estimated Time**: 4-5 hours  
**Dependencies**: Story 7.3.2 complete (Zustand persistence), Story 7.3.4 recommended (Network status)

---

## 📋 Overview

**What**: Create an offline-first Zustand store for business data that automatically syncs with Supabase when online, caches data locally, and provides seamless offline access.

**Why**: Users expect apps to work offline. Caching business data locally ensures users can browse businesses, view details, and access their favorites even without internet. Auto-sync keeps data fresh when online.

**User Value**: Users can browse businesses offline using cached data. No loading spinners or "no connection" errors - just instant access to previously loaded content.

---

## 🎯 Acceptance Criteria

- [ ] offlineBusinessStore created with Zustand
- [ ] Auto-sync with Supabase when online
- [ ] Last sync timestamp tracking
- [ ] Businesses load from cache when offline
- [ ] "Viewing cached data" indicator shown
- [ ] Conflict resolution strategy implemented
- [ ] Cache expiration logic (7 days)
- [ ] Tested offline data access
- [ ] Works on web and mobile
- [ ] Documentation created
- [ ] Changes committed to git

---

## 📝 Implementation Steps

### Step 1: Create Offline Business Store

**Create new file**: `src/store/offlineBusinessStore.ts`

```typescript
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { supabase } from '../lib/supabase'
import localforage from '../lib/storage'

interface Business {
  id: string
  business_name: string
  description: string
  logo_url?: string
  cover_image_url?: string
  city: string
  category: string
  is_verified: boolean
  created_at: string
}

interface OfflineBusinessState {
  businesses: Business[]
  lastSyncTimestamp: number | null
  isSyncing: boolean
  isOfflineMode: boolean
  syncError: string | null
  
  // Actions
  fetchBusinesses: (forceRefresh?: boolean) => Promise<void>
  syncWithServer: () => Promise<void>
  getBusinessById: (id: string) => Business | undefined
  clearCache: () => Promise<void>
  setOfflineMode: (isOffline: boolean) => void
}

export const useOfflineBusinessStore = create<OfflineBusinessState>()(
  persist(
    (set, get) => ({
      // State
      businesses: [],
      lastSyncTimestamp: null,
      isSyncing: false,
      isOfflineMode: false,
      syncError: null,

      // Fetch businesses (from cache or server)
      fetchBusinesses: async (forceRefresh = false) => {
        const { lastSyncTimestamp, businesses, isOfflineMode } = get()
        
        // Check if cache is fresh (within 24 hours)
        const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 hours
        const isCacheFresh = lastSyncTimestamp && 
          (Date.now() - lastSyncTimestamp < CACHE_DURATION)

        // Use cache if fresh and not forcing refresh
        if (!forceRefresh && isCacheFresh && businesses.length > 0) {
          console.log('[OfflineStore] Using cached businesses')
          return
        }

        // If offline, use cache regardless of freshness
        if (isOfflineMode) {
          console.log('[OfflineStore] Offline mode - using cache')
          return
        }

        // Fetch from server
        await get().syncWithServer()
      },

      // Sync with Supabase server
      syncWithServer: async () => {
        set({ isSyncing: true, syncError: null })

        try {
          console.log('[OfflineStore] Syncing with server...')

          const { data, error } = await supabase
            .from('businesses')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(100) // Limit to recent businesses

          if (error) throw error

          set({
            businesses: data || [],
            lastSyncTimestamp: Date.now(),
            isSyncing: false,
            syncError: null
          })

          console.log(`[OfflineStore] Synced ${data?.length || 0} businesses`)
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Sync failed'
          console.error('[OfflineStore] Sync error:', errorMsg)
          
          set({
            isSyncing: false,
            syncError: errorMsg,
            isOfflineMode: true // Assume offline if sync fails
          })
        }
      },

      // Get specific business by ID
      getBusinessById: (id: string) => {
        return get().businesses.find(b => b.id === id)
      },

      // Clear all cached data
      clearCache: async () => {
        set({
          businesses: [],
          lastSyncTimestamp: null,
          syncError: null
        })
        console.log('[OfflineStore] Cache cleared')
      },

      // Set offline mode
      setOfflineMode: (isOffline: boolean) => {
        set({ isOfflineMode: isOffline })
        console.log(`[OfflineStore] Offline mode: ${isOffline}`)
      }
    }),
    {
      name: 'offline-business-storage',
      storage: createJSONStorage(() => localforage),
      partialize: (state) => ({
        businesses: state.businesses,
        lastSyncTimestamp: state.lastSyncTimestamp
        // Don't persist: isSyncing, isOfflineMode, syncError (temporary state)
      }),
      version: 1
    }
  )
)
```

**Save the file.**

**Acceptance**: ✅ Offline business store created

---

### Step 2: Add Auto-Sync on Network Status Change

**File to Edit**: `src/store/offlineBusinessStore.ts`

**Add auto-sync logic**:
```typescript
// At the end of the file, add:

// Auto-sync when app comes online
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('[OfflineStore] Network online - auto-syncing')
    useOfflineBusinessStore.getState().setOfflineMode(false)
    useOfflineBusinessStore.getState().syncWithServer()
  })

  window.addEventListener('offline', () => {
    console.log('[OfflineStore] Network offline')
    useOfflineBusinessStore.getState().setOfflineMode(true)
  })
}
```

**Acceptance**: ✅ Auto-sync on network change

---

### Step 3: Create Cache Status Component

**Create new file**: `src/components/CacheStatus.tsx`

```typescript
import React from 'react'
import { useOfflineBusinessStore } from '../store/offlineBusinessStore'

export const CacheStatus: React.FC = () => {
  const { lastSyncTimestamp, isOfflineMode } = useOfflineBusinessStore()

  if (!isOfflineMode && !lastSyncTimestamp) {
    return null // No status if online and never synced
  }

  const getTimeSinceSync = () => {
    if (!lastSyncTimestamp) return 'Never'
    
    const minutes = Math.floor((Date.now() - lastSyncTimestamp) / (1000 * 60))
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
    return 'Just now'
  }

  return (
    <div style={{
      padding: '8px 16px',
      backgroundColor: isOfflineMode ? '#FFF3CD' : '#D1ECF1',
      borderBottom: '1px solid ' + (isOfflineMode ? '#FFC107' : '#0DCAF0'),
      fontSize: '14px',
      color: '#333',
      textAlign: 'center'
    }}>
      {isOfflineMode ? (
        <>📦 Viewing cached data (last updated {getTimeSinceSync()})</>
      ) : (
        <>✅ Online - Data synced {getTimeSinceSync()}</>
      )}
    </div>
  )
}
```

**Save the file.**

**Acceptance**: ✅ Cache status component created

---

### Step 4: Integrate Offline Store in Business Components

**File to Edit**: `src/pages/BusinessListPage.tsx` (or similar)

**Replace Supabase direct calls with offline store**:
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
    // Fetch businesses (uses cache if fresh, syncs if needed)
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

**Acceptance**: ✅ Offline store integrated

---

### Step 5: Implement Conflict Resolution Strategy

**File to Edit**: `src/store/offlineBusinessStore.ts`

**Add conflict resolution types and logic**:
```typescript
// Add interface for pending changes (for offline edits)
interface PendingChange {
  id: string
  action: 'create' | 'update' | 'delete'
  data: Partial<Business>
  timestamp: number
}

// Update state interface
interface OfflineBusinessState {
  businesses: Business[]
  pendingChanges: PendingChange[]  // NEW: Track offline changes
  lastSyncTimestamp: number | null
  isSyncing: boolean
  isOfflineMode: boolean
  syncError: string | null
  conflictResolutionStrategy: 'server-wins' | 'client-wins' | 'last-write-wins'
  
  // Actions
  fetchBusinesses: (forceRefresh?: boolean) => Promise<void>
  syncWithServer: () => Promise<void>
  getBusinessById: (id: string) => Business | undefined
  addPendingChange: (change: PendingChange) => void  // NEW
  clearCache: () => Promise<void>
  setOfflineMode: (isOffline: boolean) => void
}

// Add to store initial state
pendingChanges: [],
conflictResolutionStrategy: 'last-write-wins', // Default strategy

// Add conflict resolution method
addPendingChange: (change: PendingChange) => {
  const { pendingChanges } = get()
  set({ pendingChanges: [...pendingChanges, change] })
  console.log('[OfflineStore] Pending change added:', change.action)
},

// Update syncWithServer to handle conflicts
syncWithServer: async () => {
  set({ isSyncing: true, syncError: null })

  try {
    console.log('[OfflineStore] Syncing with server...')
    
    // Step 1: Process pending changes first
    const { pendingChanges, conflictResolutionStrategy } = get()
    
    if (pendingChanges.length > 0) {
      console.log(`[OfflineStore] Processing ${pendingChanges.length} pending changes`)
      
      for (const change of pendingChanges) {
        try {
          switch (change.action) {
            case 'create':
              await supabase.from('businesses').insert(change.data)
              break
              
            case 'update':
              // Check for conflicts
              const { data: serverData } = await supabase
                .from('businesses')
                .select('*')
                .eq('id', change.id)
                .single()
              
              if (serverData) {
                // Conflict resolution logic
                if (conflictResolutionStrategy === 'last-write-wins') {
                  // Compare timestamps
                  const serverTimestamp = new Date(serverData.updated_at || serverData.created_at).getTime()
                  const clientTimestamp = change.timestamp
                  
                  if (clientTimestamp > serverTimestamp) {
                    // Client change is newer - apply it
                    await supabase
                      .from('businesses')
                      .update(change.data)
                      .eq('id', change.id)
                    console.log(`[OfflineStore] Applied client update (newer)`)
                  } else {
                    // Server data is newer - discard client change
                    console.log(`[OfflineStore] Discarded client update (server newer)`)
                  }
                } else if (conflictResolutionStrategy === 'client-wins') {
                  await supabase
                    .from('businesses')
                    .update(change.data)
                    .eq('id', change.id)
                } else if (conflictResolutionStrategy === 'server-wins') {
                  // Do nothing - server data takes precedence
                  console.log(`[OfflineStore] Server wins - discarding client change`)
                }
              }
              break
              
            case 'delete':
              await supabase.from('businesses').delete().eq('id', change.id)
              break
          }
        } catch (error) {
          console.error(`[OfflineStore] Error processing change:`, error)
        }
      }
      
      // Clear pending changes after processing
      set({ pendingChanges: [] })
    }

    // Step 2: Fetch latest data from server
    const { data, error } = await supabase
      .from('businesses')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) throw error

    set({
      businesses: data || [],
      lastSyncTimestamp: Date.now(),
      isSyncing: false,
      syncError: null
    })

    console.log(`[OfflineStore] Synced ${data?.length || 0} businesses`)
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Sync failed'
    console.error('[OfflineStore] Sync error:', errorMsg)
    
    set({
      isSyncing: false,
      syncError: errorMsg,
      isOfflineMode: true
    })
  }
},
```

**Conflict Resolution Strategies Explained**:

1. **`last-write-wins`** (Default): Compares timestamps. Most recent change wins.
   - ✅ Simple and predictable
   - ✅ Works for most use cases
   - ⚠️ May lose some edits if timing is close

2. **`client-wins`**: Client changes always override server.
   - ✅ User's local changes never lost
   - ⚠️ May overwrite newer server data
   - Use when: User data is authoritative

3. **`server-wins`**: Server data always takes precedence.
   - ✅ Ensures data consistency
   - ⚠️ Discards offline edits
   - Use when: Server is source of truth

**Acceptance**: ✅ Conflict resolution implemented

---

### Step 6: Implement Cache Expiration

**File to Edit**: `src/store/offlineBusinessStore.ts`

**Add cache validation**:
```typescript
// Add helper function
const isCacheExpired = (lastSync: number | null): boolean => {
  if (!lastSync) return true
  
  const CACHE_MAX_AGE = 7 * 24 * 60 * 60 * 1000 // 7 days
  return (Date.now() - lastSync) > CACHE_MAX_AGE
}

// Update fetchBusinesses method
fetchBusinesses: async (forceRefresh = false) => {
  const { lastSyncTimestamp, businesses, isOfflineMode } = get()
  
  // Check cache expiration
  if (isCacheExpired(lastSyncTimestamp)) {
    console.log('[OfflineStore] Cache expired')
    if (!isOfflineMode) {
      await get().syncWithServer()
      return
    }
  }

  // Rest of existing logic...
}
```

**Acceptance**: ✅ Cache expiration implemented

---

### Step 7: Add Pull-to-Refresh

**File to Edit**: `src/pages/BusinessListPage.tsx`

**Add refresh functionality**:
```typescript
import { useState } from 'react'

function BusinessListPage() {
  const [refreshing, setRefreshing] = useState(false)
  const { fetchBusinesses } = useOfflineBusinessStore()

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchBusinesses(true) // Force refresh
    setRefreshing(false)
  }

  return (
    <div>
      <button 
        onClick={handleRefresh}
        disabled={refreshing}
        style={{ padding: '10px', margin: '10px' }}
      >
        {refreshing ? '🔄 Refreshing...' : '🔄 Refresh'}
      </button>
      
      {/* Rest of component */}
    </div>
  )
}
```

**Acceptance**: ✅ Pull-to-refresh added

---

### Step 8: Test Offline Functionality

**Test on Web**:
```powershell
npm run dev
```

**Test Steps**:
1. Open app and log in
2. Browse businesses (loads from server)
3. Open DevTools → Network → Enable "Offline"
4. Refresh page
5. **Businesses should load from cache**
6. Check "📦 Viewing cached data" banner appears
7. Go back online
8. Click refresh - should sync with server

**Check IndexedDB**:
1. DevTools → Application → IndexedDB → SynCApp
2. Verify "offline-business-storage" has businesses array
3. Check lastSyncTimestamp is set

**Acceptance**: ✅ Offline functionality works

---

### Step 9: Test on Mobile

**Build and test**:
```powershell
npm run build
npx cap sync android
npm run mobile:android
```

**Test Steps**:
1. Open app and browse businesses
2. Enable airplane mode
3. Close and reopen app
4. **Businesses should load from cache**
5. Disable airplane mode
6. Pull to refresh - should sync

**Acceptance**: ✅ Works on mobile

---

### Step 10: Create Documentation

**Create new file**: `docs/OFFLINE_DATA_STORE.md`

```markdown
# Offline-First Data Store 💾

## Overview

Businesses are cached locally and synced automatically when online.

---

## Features

- **Offline Access**: Businesses load from cache when offline
- **Auto-Sync**: Syncs with server when online
- **Conflict Resolution**: Three strategies for handling edit conflicts
- **Cache Expiration**: Data refreshes after 7 days
- **Smart Loading**: Uses cache if fresh, syncs if stale
- **Status Indicator**: Shows when viewing cached data
- **Pending Changes Queue**: Tracks offline edits for sync

---

## Usage

### Fetch Businesses
```typescript
import { useOfflineBusinessStore } from './store/offlineBusinessStore'

const { businesses, fetchBusinesses } = useOfflineBusinessStore()

// Fetch (uses cache if fresh)
await fetchBusinesses()

// Force refresh
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

### Handle Offline Edits
```typescript
const { addPendingChange } = useOfflineBusinessStore()

// Queue a change for later sync
addPendingChange({
  id: 'business-123',
  action: 'update',
  data: { business_name: 'New Name' },
  timestamp: Date.now()
})
```

---

## Conflict Resolution

Three strategies for handling edit conflicts:

### 1. Last-Write-Wins (Default)
- Compares timestamps between client and server
- Most recent change wins
- Best for: General use cases

### 2. Client-Wins
- Client changes always override server
- Best for: User-authoritative data

### 3. Server-Wins
- Server data takes precedence
- Best for: Server as source of truth

**Set Strategy**:
```typescript
// In store configuration
conflictResolutionStrategy: 'last-write-wins' // or 'client-wins' or 'server-wins'
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

- **Location**: IndexedDB (web), native (mobile)
- **Key**: `offline-business-storage`
- **Size**: ~100 businesses (~500KB)
- **Expiration**: 7 days

---

## Components

### CacheStatus
Shows sync status banner:
- 📦 Yellow: Viewing cached data (offline)
- ✅ Blue: Online, data synced

### Usage
```typescript
import { CacheStatus } from './components/CacheStatus'

<CacheStatus />
```

---

## Troubleshooting

### Businesses not loading offline
- Check IndexedDB has cached data
- Verify lastSyncTimestamp exists
- Try loading once while online

### Cache not updating
- Force refresh: `fetchBusinesses(true)`
- Clear cache: `clearCache()`
- Check network status

### Old data showing
- Cache expires after 7 days
- Force refresh to sync immediately
- Check lastSyncTimestamp

---

## Related

- **Story 7.3.2**: Zustand Persistence
- **Story 7.3.4**: Network Status Detection
```

**Save as**: `docs/OFFLINE_DATA_STORE.md`

**Acceptance**: ✅ Documentation created

---

### Step 10: Commit Offline Data Store

**Terminal Commands**:
```powershell
git add .

git commit -m "feat: Create offline-first data store - Story 7.3.3

- Created offlineBusinessStore with Zustand persist
- Implemented auto-sync with Supabase when online
- Added last sync timestamp tracking
- Businesses load from cache when offline
- Implemented conflict resolution (last-write-wins, client-wins, server-wins)
- Added pending changes queue for offline edits
- Created CacheStatus component for visual indicator
- Implemented cache expiration (7 days)
- Added pull-to-refresh functionality
- Tested offline access on web and mobile
- Created comprehensive documentation

Changes:
- src/store/offlineBusinessStore.ts: Offline business store with conflict resolution
- src/components/CacheStatus.tsx: Cache status indicator
- src/pages/BusinessListPage.tsx: Integrated offline store
- docs/OFFLINE_DATA_STORE.md: Documentation

Epic: 7.3 - Enhanced Offline Mode with PWA
Story: 7.3.3 - Offline-First Data Store

Features:
- Offline business browsing
- Automatic sync when online
- Smart conflict resolution
- Pending changes queue
- Smart cache management
- 7-day cache expiration
- Pull-to-refresh support"

git push origin mobile-app-setup
```

**Acceptance**: ✅ All changes committed

---

## ✅ Verification Checklist

- [ ] offlineBusinessStore created
- [ ] Auto-sync on network change
- [ ] Last sync timestamp tracking
- [ ] Conflict resolution strategy implemented
- [ ] Pending changes queue working
- [ ] Cache expiration logic (7 days)
- [ ] CacheStatus component created
- [ ] Integrated in business pages
- [ ] Pull-to-refresh implemented
- [ ] Tested offline on web
- [ ] Tested offline on mobile
- [ ] Documentation created
- [ ] All changes committed to git

**All items checked?** ✅ Story 7.3.3 is COMPLETE

---

## 🚨 Troubleshooting

### Issue: Businesses not caching
**Solution**:
- Check localforage is configured
- Verify persist middleware working
- Check IndexedDB in DevTools
- Look for sync errors in console

### Issue: Auto-sync not working
**Solution**:
- Check network event listeners registered
- Verify online/offline events firing
- Test manual sync: `syncWithServer()`
- Check for errors in sync logic

### Issue: Stale data showing
**Solution**:
- Force refresh: `fetchBusinesses(true)`
- Check cache expiration logic
- Verify lastSyncTimestamp updates
- Clear cache and re-sync

### Issue: Cache too large
**Solution**:
- Reduce limit in query (currently 100)
- Implement pagination
- Clear old cached items
- Add selective caching

---

## 📚 Additional Notes

### What We Built
- ✅ Offline-first business store
- ✅ Auto-sync mechanism
- ✅ Cache expiration
- ✅ Status indicators
- ✅ Pull-to-refresh

### Cache Size Management
- Limit: 100 businesses
- Average size: 5KB per business
- Total: ~500KB cached
- Well within storage limits

### What's Next
- **Story 7.3.4**: Network Status Detection (enhances this)
- **Story 7.3.5**: Offline Indicator UI
- **Story 7.3.6**: Service Worker Testing

---

## 🔗 Related Documentation

- [Zustand Persist](https://docs.pmnd.rs/zustand/integrations/persisting-store-data)
- [Offline-First Architecture](https://offlinefirst.org/)
- [EPIC 7.3 Overview](../epics/EPIC_7.3_Offline_Mode_PWA.md)

---

**Story Status**: ⚪ PLANNED  
**Previous Story**: [STORY_7.3.2_Zustand_Persistence.md](./STORY_7.3.2_Zustand_Persistence.md)  
**Next Story**: [STORY_7.3.4_Network_Status_Hook.md](./STORY_7.3.4_Network_Status_Hook.md)  
**Epic Progress**: Story 3/6 complete (33% → 50%)
