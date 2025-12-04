# 🎨 STORY 8.4.5: Offline UI Components & Indicators

**Parent Epic:** [EPIC 8.4 - Offline Support & Message Synchronization](../epics/EPIC_8.4_Offline_Support.md)  
**Story Owner:** Frontend Engineering  
**Estimated Effort:** 1.5 days  
**Priority:** P1 - High  
**Status:** 📋 Ready for Implementation  
**Dependencies:** Story 8.4.2 (Network Detection), Story 8.4.3 (Sync Logic)

---

## 🎯 **Story Goal**

Create **user-friendly offline UI components**:

- Offline indicator banner
- Sync status badge
- Pending message count
- Retry button for failed messages
- Loading states during sync

---

## 📖 **Acceptance Criteria**

- ✅ Offline indicator shows when disconnected
- ✅ Sync progress visible in real-time
- ✅ Pending count updates automatically
- ✅ Failed messages can be retried
- ✅ Smooth animations and transitions

---

## 🧩 **Implementation**

### **Phase 1: Offline Indicator Component**

```typescript
// src/components/messaging/OfflineIndicator.tsx
import React, { useEffect } from 'react'
import { WifiOff, RefreshCw, AlertCircle } from 'lucide-react'
import { useMessagingStore } from '../../store/messagingStore'
import { Button } from '../ui/button'

export function OfflineIndicator() {
  const {
    isOffline,
    pendingMessageCount,
    syncStatus,
    syncProgress,
    setOfflineStatus,
    updatePendingCount,
    syncPendingMessages,
    retryFailedMessages
  } = useMessagingStore()

  useEffect(() => {
    // Listen for network status
    const handleOnline = () => {
      setOfflineStatus(false)
      syncPendingMessages()
    }
    const handleOffline = () => setOfflineStatus(true)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Initial status
    setOfflineStatus(!navigator.onLine)
    updatePendingCount()

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Don't show if online and no pending messages
  if (!isOffline && pendingMessageCount === 0 && syncStatus === 'idle') {
    return null
  }

  return (
    <div className={`border-b px-4 py-3 ${
      isOffline ? 'bg-yellow-50 border-yellow-200' :
      syncStatus === 'error' ? 'bg-red-50 border-red-200' :
      'bg-blue-50 border-blue-200'
    }`}>
      <div className=\"flex items-center justify-between\">
        <div className=\"flex items-center gap-3\">
          {/* Icon */}
          {isOffline ? (
            <WifiOff className=\"w-5 h-5 text-yellow-600\" />
          ) : syncStatus === 'syncing' ? (
            <RefreshCw className=\"w-5 h-5 text-blue-600 animate-spin\" />
          ) : syncStatus === 'error' ? (
            <AlertCircle className=\"w-5 h-5 text-red-600\" />
          ) : (
            <RefreshCw className=\"w-5 h-5 text-blue-600\" />
          )}

          {/* Message */}
          <div className=\"flex-1\">
            {isOffline ? (
              <div>
                <p className=\"text-sm font-medium text-yellow-800\">
                  You're offline
                </p>
                <p className=\"text-xs text-yellow-600\">
                  {pendingMessageCount} message{pendingMessageCount !== 1 ? 's' : ''} will be sent when back online
                </p>
              </div>
            ) : syncStatus === 'syncing' ? (
              <div>
                <p className=\"text-sm font-medium text-blue-800\">
                  Syncing messages...
                </p>
                <p className=\"text-xs text-blue-600\">
                  {syncProgress.success} sent, {pendingMessageCount} remaining
                </p>
              </div>
            ) : syncStatus === 'error' ? (
              <div>
                <p className=\"text-sm font-medium text-red-800\">
                  Sync failed
                </p>
                <p className=\"text-xs text-red-600\">
                  {syncProgress.failed} message{syncProgress.failed !== 1 ? 's' : ''} failed to send
                </p>
              </div>
            ) : (
              <p className=\"text-sm font-medium text-blue-800\">
                {pendingMessageCount} pending message{pendingMessageCount !== 1 ? 's' : ''}
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        {!isOffline && (
          <div className=\"flex items-center gap-2\">
            {syncStatus === 'error' && (
              <Button
                size=\"sm\"
                variant=\"outline\"
                onClick={retryFailedMessages}
                className=\"text-xs\"
              >
                Retry Failed
              </Button>
            )}

            {pendingMessageCount > 0 && syncStatus !== 'syncing' && (
              <Button
                size=\"sm\"
                onClick={syncPendingMessages}
                className=\"text-xs\"
              >
                Sync Now
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
```

### **Phase 2: Message Status Badge**

```typescript
// src/components/messaging/MessageStatusBadge.tsx
import React from 'react'
import { Check, CheckCheck, Clock, AlertCircle, RefreshCw } from 'lucide-react'

interface Props {
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed' | 'pending'
  isOptimistic?: boolean
}

export function MessageStatusBadge({ status, isOptimistic }: Props) {
  if (isOptimistic || status === 'sending' || status === 'pending') {
    return (
      <div className=\"flex items-center gap-1 text-xs text-gray-400\">
        <Clock className=\"w-3 h-3\" />
        <span>Sending...</span>
      </div>
    )
  }

  if (status === 'failed') {
    return (
      <div className=\"flex items-center gap-1 text-xs text-red-500\">
        <AlertCircle className=\"w-3 h-3\" />
        <span>Failed</span>
      </div>
    )
  }

  if (status === 'sent') {
    return <Check className=\"w-4 h-4 text-gray-400\" />
  }

  if (status === 'delivered' || status === 'read') {
    return <CheckCheck className=\"w-4 h-4 text-blue-500\" />
  }

  return null
}
```

### **Phase 3: Sync Status in Chat Header**

```typescript
// src/components/messaging/ChatHeader.tsx (additions)
import { useMessagingStore } from '../../store/messagingStore'

export function ChatHeader({ conversation }: Props) {
  const { isOffline, pendingMessageCount } = useMessagingStore()

  return (
    <div className=\"flex items-center justify-between p-4 border-b\">
      {/* ... existing header content ... */}

      {/* Offline/Pending Badge */}
      {(isOffline || pendingMessageCount > 0) && (
        <div className=\"flex items-center gap-2 text-xs\">
          {isOffline && (
            <span className=\"px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full\">
              Offline
            </span>
          )}
          {pendingMessageCount > 0 && (
            <span className=\"px-2 py-1 bg-blue-100 text-blue-800 rounded-full\">
              {pendingMessageCount} pending
            </span>
          )}
        </div>
      )}
    </div>
  )
}
```

---

## 🧪 **Testing**

### **Shadcn MCP Integration**

```bash
# Use Shadcn components
warp mcp run shadcn "add alert"
warp mcp run shadcn "add badge"
warp mcp run shadcn "add button"
```

### **Visual Testing with Chrome DevTools**

```bash
# Test offline indicator
warp mcp run chrome-devtools "set network to Offline, verify offline indicator appears"

# Test sync animation
warp mcp run chrome-devtools "queue messages, go online, verify sync animation"

# Test responsive design
warp mcp run chrome-devtools "open Device Mode, test offline UI on mobile viewport"
```

---

## ✅ **Definition of Done**

- [x] OfflineIndicator component created
- [x] MessageStatusBadge component created
- [x] Integrated into ChatScreen and ChatHeader
- [x] Animations smooth and performant
- [x] Responsive design works on mobile
- [x] Accessibility (ARIA labels, keyboard navigation)
- [x] Visual tests passing

---

**Next Story:** [STORY_8.4.6_Conflict_Resolution.md](./STORY_8.4.6_Conflict_Resolution.md)
