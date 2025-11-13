# Network Status Detection 📶

## Overview

Real-time network status detection using @capacitor/network plugin with React hook.

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

### Basic Usage

```typescript
import { useNetworkStatus } from '../hooks/useNetworkStatus'

function MyComponent() {
  const { isOnline, connectionType } = useNetworkStatus()
  
  return (
    <div>
      Status: {isOnline ? 'Online' : 'Offline'}
      Type: {connectionType}
    </div>
  )
}
```

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

### Disable Actions When Offline

```typescript
const { isOnline } = useNetworkStatus()

<button disabled={!isOnline}>
  Sync Now
</button>
```

### Integration with Offline Store

```typescript
import { useNetworkStatus } from '../hooks/useNetworkStatus'
import { useOfflineBusinessStore } from '../store/offlineBusinessStore'

function BusinessList() {
  const { isOnline } = useNetworkStatus()
  const { setOfflineMode, syncWithServer } = useOfflineBusinessStore()
  
  useEffect(() => {
    setOfflineMode(!isOnline)
    
    if (isOnline) {
      syncWithServer()
    }
  }, [isOnline])
  
  // ...
}
```

---

## Platform Support

- ✅ **Web**: Uses navigator.onLine + Network Events API
- ✅ **Android**: Native network state monitoring
- ✅ **iOS**: Native Reachability API

---

## Connection Types

- **wifi**: Connected via Wi-Fi
- **cellular**: Mobile data (3G/4G/5G)
- **none**: No connection
- **unknown**: Connected but type unknown (common on web)

---

## Components

### NetworkStatusBadge

Visual indicator showing current network status:

- 🔴 **Red**: Offline
- 📶 **Green**: Wi-Fi
- 📱 **Green**: Cellular
- 🌐 **Green**: Online (unknown type)

**Usage**:
```typescript
import { NetworkStatusBadge } from './components/NetworkStatusBadge'

<NetworkStatusBadge />
```

---

## Auto-Updates

The hook automatically updates when:
- Device goes online/offline
- User switches from Wi-Fi to cellular
- Network type changes

Updates are **real-time** with no polling - they're event-driven.

---

## How It Works

1. **Initial Load**: Gets current network status from Capacitor plugin
2. **Event Listener**: Listens for `networkStatusChange` events
3. **Fallback**: Uses browser `online`/`offline` events on web if plugin fails
4. **Cleanup**: Removes listeners on component unmount

---

## Troubleshooting

### Hook not updating
- Verify @capacitor/network is installed: `npm list @capacitor/network`
- Sync plugin: `npx cap sync`
- Check console for listener errors
- Test with airplane mode toggle

### Wrong status showing
- Connection type may be 'unknown' on web (normal)
- Check device/emulator settings
- Verify network actually changed
- Look for plugin errors in console

### Badge not showing
- Check NetworkStatusBadge is imported correctly
- Verify hook is called within component
- Check CSS/styling isn't hiding it
- Look for React errors in console

### Plugin not found error
- Run: `npm install @capacitor/network`
- Run: `npx cap sync`
- Rebuild native app
- Clean and rebuild: `npx cap sync --clean`

---

## Performance

- **No polling**: Event-driven only
- **Minimal battery impact**: Native listeners are efficient
- **Updates only on changes**: No unnecessary re-renders
- **Lightweight**: ~50 lines of code

---

## Example: Auto-Sync on Network Return

```typescript
function BusinessListPage() {
  const { isOnline } = useNetworkStatus()
  const { syncWithServer, lastSyncTimestamp } = useOfflineBusinessStore()
  
  useEffect(() => {
    if (isOnline && lastSyncTimestamp) {
      const timeSinceSync = Date.now() - lastSyncTimestamp
      const SYNC_THRESHOLD = 5 * 60 * 1000 // 5 minutes
      
      if (timeSinceSync > SYNC_THRESHOLD) {
        syncWithServer()
      }
    }
  }, [isOnline])
  
  return (
    <div>
      <NetworkStatusBadge />
      {/* ... */}
    </div>
  )
}
```

---

## Related

- **Story 7.3.3**: Offline Data Store (uses this hook)
- **Story 7.3.5**: Offline Indicator UI
- **@capacitor/network**: [Official Documentation](https://capacitorjs.com/docs/apis/network)

---

## Resources

- [Capacitor Network Plugin](https://capacitorjs.com/docs/apis/network)
- [Network Information API](https://developer.mozilla.org/en-US/docs/Web/API/Network_Information_API)
- [Online and offline events](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/onLine)
