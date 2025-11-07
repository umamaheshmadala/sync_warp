# Story 7.3.4: Network Status Detection ⚪ PLANNED

**Epic**: EPIC 7.3 - Enhanced Offline Mode with PWA  
**Story Points**: 3  
**Estimated Time**: 2-3 hours  
**Dependencies**: Story 7.3.1 complete (PWA setup)

---

## 📋 Overview

**What**: Install @capacitor/network plugin and create a useNetworkStatus hook that detects online/offline status and network type (wifi/cellular) across all platforms.

**Why**: Apps need to know when they're online or offline to make smart decisions about syncing data, showing appropriate UI, and handling network requests. The browser's navigator.onLine is unreliable; Capacitor's Network plugin provides accurate, real-time network status.

**User Value**: Users see accurate connection status. The app automatically adapts behavior based on network availability (e.g., pausing syncs when offline, showing cached data).

---

## 🎯 Acceptance Criteria

- [ ] @capacitor/network plugin installed
- [ ] useNetworkStatus hook created
- [ ] Detects online/offline status
- [ ] Provides network type (wifi, cellular, none)
- [ ] Updates in real-time when network changes
- [ ] Works on web, iOS, and Android
- [ ] Hook tested on all platforms
- [ ] Documentation created
- [ ] Changes committed to git

---

## 📝 Implementation Steps

### Step 1: Install Capacitor Network Plugin

**Terminal Commands**:
```powershell
# Install @capacitor/network
npm install @capacitor/network

# Sync to native projects
npx cap sync
```

**Expected Output**:
```
added 1 package
✔ Copying web assets
✔ Updating Android plugins
✔ Updating iOS plugins
```

**Verify Installation**:
```powershell
npm list @capacitor/network
```

**Acceptance**: ✅ Plugin installed

---

### Step 2: Create useNetworkStatus Hook

**Create new file**: `src/hooks/useNetworkStatus.ts`

```typescript
import { useState, useEffect } from 'react'
import { Network, ConnectionStatus } from '@capacitor/network'
import { Capacitor } from '@capacitor/core'

export interface NetworkStatus {
  isOnline: boolean
  connectionType: 'wifi' | 'cellular' | 'none' | 'unknown'
  isConnected: boolean
}

export const useNetworkStatus = (): NetworkStatus => {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isOnline: true,
    connectionType: 'unknown',
    isConnected: true
  })

  useEffect(() => {
    // Only run on platforms that support the plugin
    if (!Capacitor.isNativePlatform() && typeof window === 'undefined') {
      return
    }

    // Get initial network status
    const getInitialStatus = async () => {
      try {
        const status = await Network.getStatus()
        updateNetworkStatus(status)
      } catch (error) {
        console.error('[useNetworkStatus] Error getting initial status:', error)
        // Fallback to navigator.onLine on web
        if (typeof navigator !== 'undefined') {
          setNetworkStatus({
            isOnline: navigator.onLine,
            connectionType: navigator.onLine ? 'unknown' : 'none',
            isConnected: navigator.onLine
          })
        }
      }
    }

    // Update network status helper
    const updateNetworkStatus = (status: ConnectionStatus) => {
      const isOnline = status.connected
      const connectionType = getConnectionType(status.connectionType)
      
      setNetworkStatus({
        isOnline,
        connectionType,
        isConnected: status.connected
      })

      console.log(`[useNetworkStatus] ${isOnline ? 'Online' : 'Offline'} (${connectionType})`)
    }

    // Map Capacitor connection types to our simplified types
    const getConnectionType = (type: string): 'wifi' | 'cellular' | 'none' | 'unknown' => {
      switch (type.toLowerCase()) {
        case 'wifi':
          return 'wifi'
        case 'cellular':
        case '3g':
        case '4g':
        case '5g':
          return 'cellular'
        case 'none':
          return 'none'
        default:
          return 'unknown'
      }
    }

    // Set up network status listener
    const setupListener = async () => {
      try {
        const listener = await Network.addListener('networkStatusChange', (status) => {
          updateNetworkStatus(status)
        })

        // Cleanup function
        return () => {
          listener.remove()
        }
      } catch (error) {
        console.error('[useNetworkStatus] Error setting up listener:', error)
        
        // Fallback to browser events on web
        if (typeof window !== 'undefined') {
          const handleOnline = () => {
            setNetworkStatus(prev => ({
              ...prev,
              isOnline: true,
              isConnected: true,
              connectionType: 'unknown'
            }))
          }

          const handleOffline = () => {
            setNetworkStatus(prev => ({
              ...prev,
              isOnline: false,
              isConnected: false,
              connectionType: 'none'
            }))
          }

          window.addEventListener('online', handleOnline)
          window.addEventListener('offline', handleOffline)

          return () => {
            window.removeEventListener('online', handleOnline)
            window.removeEventListener('offline', handleOffline)
          }
        }
      }
    }

    // Initialize
    getInitialStatus()
    const listenerCleanup = setupListener()

    // Cleanup on unmount
    return () => {
      listenerCleanup.then(cleanup => cleanup?.())
    }
  }, [])

  return networkStatus
}
```

**Save the file.**

**Acceptance**: ✅ Hook created

---

### Step 3: Test Hook on Web

**Terminal Command**:
```powershell
npm run dev
```

**Test Steps**:
1. Open http://localhost:5173
2. Open DevTools Console
3. Check initial log: `[useNetworkStatus] Online (unknown)`
4. Open DevTools → Network tab
5. Check "Offline" checkbox
6. Should see log: `[useNetworkStatus] Offline (none)`
7. Uncheck "Offline"
8. Should see log: `[useNetworkStatus] Online (unknown)`

**Acceptance**: ✅ Works on web

---

### Step 4: Create Network Status Display Component

**Create new file**: `src/components/NetworkStatusBadge.tsx`

```typescript
import React from 'react'
import { useNetworkStatus } from '../hooks/useNetworkStatus'

export const NetworkStatusBadge: React.FC = () => {
  const { isOnline, connectionType } = useNetworkStatus()

  const getStatusIcon = () => {
    if (!isOnline) return '🔴'
    if (connectionType === 'wifi') return '📶'
    if (connectionType === 'cellular') return '📱'
    return '🌐'
  }

  const getStatusText = () => {
    if (!isOnline) return 'Offline'
    if (connectionType === 'wifi') return 'Wi-Fi'
    if (connectionType === 'cellular') return 'Cellular'
    return 'Online'
  }

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '4px 12px',
      borderRadius: '12px',
      backgroundColor: isOnline ? '#D4EDDA' : '#F8D7DA',
      color: isOnline ? '#155724' : '#721C24',
      fontSize: '12px',
      fontWeight: '500',
      gap: '6px'
    }}>
      <span>{getStatusIcon()}</span>
      <span>{getStatusText()}</span>
    </div>
  )
}
```

**Save the file.**

**Acceptance**: ✅ Display component created

---

### Step 5: Integrate Hook with Offline Store

**File to Edit**: `src/store/offlineBusinessStore.ts`

**Replace browser events with hook**:
```typescript
import { useNetworkStatus } from '../hooks/useNetworkStatus'

// Remove window.addEventListener code
// Instead, use the hook in components that need network status

// Or create a hook bridge:
export const useOfflineStoreWithNetwork = () => {
  const { isOnline } = useNetworkStatus()
  const store = useOfflineBusinessStore()

  useEffect(() => {
    store.setOfflineMode(!isOnline)
    
    // Auto-sync when coming online
    if (isOnline && !store.isSyncing) {
      store.syncWithServer()
    }
  }, [isOnline, store])

  return store
}
```

**Acceptance**: ✅ Integrated with offline store

---

### Step 6: Test on Android

**Build and deploy**:
```powershell
npm run build
npx cap sync android
npm run mobile:android
```

**Test Steps**:
1. Open app in Android Studio
2. Check Logcat for: `[useNetworkStatus] Online (wifi)` or `(cellular)`
3. Enable airplane mode on device/emulator
4. Check log: `[useNetworkStatus] Offline (none)`
5. Disable airplane mode
6. Check log: `[useNetworkStatus] Online (wifi)`
7. Switch between Wi-Fi and mobile data
8. Verify connection type updates

**Acceptance**: ✅ Works on Android

---

### Step 7: Test on iOS (Mac only)

**Build and deploy**:
```bash
npm run build
npx cap sync ios
npm run mobile:ios
```

**Test Steps** (same as Android):
1. Open app on real device or simulator
2. Check console for network status logs
3. Toggle airplane mode
4. Verify status changes
5. Switch network types

**Acceptance**: ✅ Works on iOS

---

### Step 8: Add Network Status to Layout

**File to Edit**: `src/components/layout/AppLayout.tsx`

**Add network badge**:
```typescript
import { NetworkStatusBadge } from '../NetworkStatusBadge'

function AppLayout({ children }) {
  return (
    <div className="app-layout">
      <header>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1>SynC</h1>
          <NetworkStatusBadge />
        </div>
      </header>
      
      <main>{children}</main>
    </div>
  )
}
```

**Acceptance**: ✅ Integrated in layout

---

### Step 9: Create Documentation

**Create new file**: `docs/NETWORK_STATUS.md`

```markdown
# Network Status Detection 📶

## Overview

Real-time network status detection using @capacitor/network plugin.

---

## Hook: useNetworkStatus

```typescript
import { useNetworkStatus } from './hooks/useNetworkStatus'

const { isOnline, connectionType, isConnected } = useNetworkStatus()
```

### Returns

```typescript
{
  isOnline: boolean           // true if connected
  connectionType: string      // 'wifi', 'cellular', 'none', 'unknown'
  isConnected: boolean        // Connection status
}
```

---

## Usage Examples

### Conditional Data Fetching
```typescript
const { isOnline } = useNetworkStatus()

if (isOnline) {
  await fetchDataFromServer()
} else {
  loadFromCache()
}
```

### Show Network Badge
```typescript
import { NetworkStatusBadge } from './components/NetworkStatusBadge'

<NetworkStatusBadge />
```

### Disable Sync When Offline
```typescript
const { isOnline } = useNetworkStatus()

<button disabled={!isOnline}>
  Sync Now
</button>
```

---

## Platform Support

- ✅ **Web**: Uses navigator.onLine + Network Events API
- ✅ **Android**: Native network state monitoring
- ✅ **iOS**: Native Reachability

---

## Connection Types

- **wifi**: Connected via Wi-Fi
- **cellular**: Mobile data (3G/4G/5G)
- **none**: No connection
- **unknown**: Connected but type unknown

---

## Auto-Updates

The hook automatically updates when:
- Device goes online/offline
- User switches from Wi-Fi to cellular
- Network type changes

Updates are real-time with no polling.

---

## Troubleshooting

### Hook not updating
- Verify @capacitor/network installed
- Check plugin synced: `npx cap sync`
- Look for listener errors in console

### Wrong status showing
- Check device settings
- Verify network actually changed
- Test with airplane mode toggle

### Badge not showing
- Check NetworkStatusBadge imported
- Verify hook is called
- Check CSS/styling

---

## Related

- **Story 7.3.3**: Offline Data Store (uses this)
- **Story 7.3.5**: Offline Indicator UI
```

**Save as**: `docs/NETWORK_STATUS.md`

**Acceptance**: ✅ Documentation created

---

### Step 10: Commit Network Status Hook

**Terminal Commands**:
```powershell
git add .

git commit -m "feat: Add network status detection hook - Story 7.3.4

- Installed @capacitor/network plugin
- Created useNetworkStatus hook with real-time updates
- Detects online/offline status accurately
- Provides network type (wifi/cellular/none)
- Created NetworkStatusBadge component
- Integrated with offline business store
- Tested on web, Android, and iOS
- Auto-updates on network changes
- Created documentation

Changes:
- src/hooks/useNetworkStatus.ts: Network status hook
- src/components/NetworkStatusBadge.tsx: Status display
- src/components/layout/AppLayout.tsx: Added badge to layout
- src/store/offlineBusinessStore.ts: Integration
- docs/NETWORK_STATUS.md: Documentation
- package.json: Added @capacitor/network

Epic: 7.3 - Enhanced Offline Mode with PWA
Story: 7.3.4 - Network Status Detection

Features:
- Real-time network detection
- Connection type detection
- Cross-platform support
- Auto-sync trigger"

git push origin mobile-app-setup
```

**Acceptance**: ✅ All changes committed

---

## ✅ Verification Checklist

- [ ] @capacitor/network installed
- [ ] useNetworkStatus hook created
- [ ] Detects online/offline correctly
- [ ] Shows network type (wifi/cellular)
- [ ] Updates in real-time
- [ ] NetworkStatusBadge component created
- [ ] Integrated in app layout
- [ ] Tested on web
- [ ] Tested on Android
- [ ] Tested on iOS (if available)
- [ ] Documentation created
- [ ] All changes committed to git

**All items checked?** ✅ Story 7.3.4 is COMPLETE

---

## 🚨 Troubleshooting

### Issue: Plugin not found
**Solution**:
- Run `npm install @capacitor/network`
- Run `npx cap sync`
- Rebuild native app

### Issue: Status not updating
**Solution**:
- Check listener is set up
- Verify no errors in console
- Test with airplane mode toggle
- Check Capacitor version compatibility

### Issue: Wrong connection type
**Solution**:
- Connection type detection varies by device
- 'unknown' is normal on web
- Check device network settings
- Use isOnline as primary indicator

### Issue: Hook causing re-renders
**Solution**:
- Status updates are intentional
- Use React.memo on components if needed
- Status only updates on actual network changes
- No polling, only event-driven

---

## 📚 Additional Notes

### What We Built
- ✅ Real-time network detection
- ✅ Cross-platform hook
- ✅ Connection type detection
- ✅ Visual status badge
- ✅ Auto-sync integration

### Performance
- No polling (event-driven only)
- Minimal battery impact
- Updates only on real changes
- Lightweight hook (~50 lines)

### What's Next
- **Story 7.3.5**: Offline Indicator UI (uses this hook)
- **Story 7.3.6**: Service Worker Testing

---

## 🔗 Related Documentation

- [@capacitor/network](https://capacitorjs.com/docs/apis/network)
- [Network Information API](https://developer.mozilla.org/en-US/docs/Web/API/Network_Information_API)
- [EPIC 7.3 Overview](../epics/EPIC_7.3_Offline_Mode_PWA.md)

---

**Story Status**: ⚪ PLANNED  
**Previous Story**: [STORY_7.3.3_Offline_Data_Store.md](./STORY_7.3.3_Offline_Data_Store.md)  
**Next Story**: [STORY_7.3.5_Offline_Indicator_UI.md](./STORY_7.3.5_Offline_Indicator_UI.md)  
**Epic Progress**: Story 4/6 complete (50% → 67%)
