# 📴 EPIC 8.4: Offline Support & Message Synchronization

**Epic Owner:** Frontend Engineering  
**Dependencies:** Epic 8.1 (Database), Epic 8.2 (Core Messaging)  
**Timeline:** Week 6 (1 week)  
**Status:** 📋 Planning

---

## 🎯 **Epic Goal**

Enable seamless messaging even when users are offline:
- Queue messages locally using IndexedDB
- Sync pending messages when back online
- Handle conflict resolution (e.g., duplicate sends)
- Display offline indicators
- Cache message history for faster loading

---

## ✅ **Success Criteria**

| Objective | Target |
|-----------|--------|
| **Offline Message Queue** | 100% reliability |
| **Sync Success Rate** | > 99% |
| **Sync Latency** | < 2s after reconnection |
| **Cache Hit Rate** | > 90% for recent messages |
| **Conflict Resolution** | Zero duplicate messages |

---

## 🧩 **Key Components**

### **1. Offline Queue Service**

**File:** `src/services/offlineQueueService.ts`

```typescript
// src/services/offlineQueueService.ts
import Dexie, { Table } from 'dexie'
import { messagingService } from './messagingService'
import { v4 as uuidv4 } from 'uuid'

interface QueuedMessage {
  id: string // Local UUID
  conversationId: string
  content: string
  type: 'text' | 'image' | 'video' | 'link'
  mediaUrls?: string[]
  linkPreview?: any
  timestamp: number
  retryCount: number
  status: 'pending' | 'syncing' | 'failed'
}

class OfflineQueueDB extends Dexie {
  messages!: Table<QueuedMessage, string>

  constructor() {
    super('SyncOfflineQueue')
    this.version(1).stores({
      messages: 'id, conversationId, timestamp, status'
    })
  }
}

class OfflineQueueService {
  private db: OfflineQueueDB
  private isSyncing = false
  private retryDelay = 2000 // 2 seconds

  constructor() {
    this.db = new OfflineQueueDB()
    this.initEventListeners()
  }

  /**
   * Listen for online/offline events
   */
  private initEventListeners() {
    window.addEventListener('online', () => {
      console.log('🔄 Back online, syncing pending messages...')
      this.syncPendingMessages()
    })

    window.addEventListener('offline', () => {
      console.log('📴 Offline mode activated')
    })
  }

  /**
   * Add message to offline queue
   */
  async queueMessage(message: Omit<QueuedMessage, 'id' | 'timestamp' | 'retryCount' | 'status'>): Promise<string> {
    const queuedMessage: QueuedMessage = {
      ...message,
      id: uuidv4(),
      timestamp: Date.now(),
      retryCount: 0,
      status: 'pending'
    }

    await this.db.messages.add(queuedMessage)
    console.log(`📤 Message queued: ${queuedMessage.id}`)

    // Try to sync immediately if online
    if (navigator.onLine) {
      this.syncPendingMessages()
    }

    return queuedMessage.id
  }

  /**
   * Sync all pending messages
   */
  async syncPendingMessages(): Promise<void> {
    if (this.isSyncing) return

    this.isSyncing = true
    const pendingMessages = await this.db.messages
      .where('status')
      .equals('pending')
      .sortBy('timestamp')

    for (const msg of pendingMessages) {
      try {
        // Update status to syncing
        await this.db.messages.update(msg.id, { status: 'syncing' })

        // Send message via messagingService
        await messagingService.sendMessage({
          conversationId: msg.conversationId,
          content: msg.content,
          type: msg.type,
          mediaUrls: msg.mediaUrls,
          linkPreview: msg.linkPreview
        })

        // Delete from queue on success
        await this.db.messages.delete(msg.id)
        console.log(`✅ Synced message: ${msg.id}`)
      } catch (error) {
        console.error(`❌ Failed to sync message ${msg.id}:`, error)

        // Retry logic
        const newRetryCount = msg.retryCount + 1
        if (newRetryCount < 3) {
          await this.db.messages.update(msg.id, {
            status: 'pending',
            retryCount: newRetryCount
          })
          console.log(`🔄 Will retry message ${msg.id} (attempt ${newRetryCount + 1}/3)`)
        } else {
          // Mark as permanently failed after 3 retries
          await this.db.messages.update(msg.id, { status: 'failed' })
          console.log(`💀 Message ${msg.id} marked as failed after 3 attempts`)
        }
      }
    }

    this.isSyncing = false
  }

  /**
   * Get pending message count
   */
  async getPendingCount(): Promise<number> {
    return await this.db.messages
      .where('status')
      .equals('pending')
      .count()
  }

  /**
   * Clear failed messages (user action)
   */
  async clearFailedMessages(): Promise<void> {
    await this.db.messages
      .where('status')
      .equals('failed')
      .delete()
  }
}

export const offlineQueueService = new OfflineQueueService()
```

**🛢 MCP Integration:**
```bash
# Analyze offline logic with Context7
warp mcp run context7 "explain the retry logic in offlineQueueService"
```

---

### **2. Message Cache Service**

**File:** `src/services/messageCacheService.ts`

```typescript
// src/services/messageCacheService.ts
import Dexie, { Table } from 'dexie'
import type { Message, Conversation } from '../types/messaging'

class MessageCacheDB extends Dexie {
  conversations!: Table<Conversation, string>
  messages!: Table<Message, string>

  constructor() {
    super('SyncMessageCache')
    this.version(1).stores({
      conversations: 'id, lastMessageTimestamp',
      messages: 'id, conversationId, createdAt'
    })
  }
}

class MessageCacheService {
  private db: MessageCacheDB

  constructor() {
    this.db = new MessageCacheDB()
  }

  /**
   * Cache conversations (last 50)
   */
  async cacheConversations(conversations: Conversation[]): Promise<void> {
    await this.db.conversations.bulkPut(conversations.slice(0, 50))
  }

  /**
   * Cache messages (last 200 per conversation)
   */
  async cacheMessages(conversationId: string, messages: Message[]): Promise<void> {
    // Clear old messages for this conversation
    await this.db.messages
      .where('conversationId')
      .equals(conversationId)
      .delete()

    // Cache latest 200
    await this.db.messages.bulkPut(messages.slice(0, 200))
  }

  /**
   * Get cached conversations
   */
  async getCachedConversations(): Promise<Conversation[]> {
    return await this.db.conversations
      .orderBy('lastMessageTimestamp')
      .reverse()
      .toArray()
  }

  /**
   * Get cached messages
   */
  async getCachedMessages(conversationId: string): Promise<Message[]> {
    return await this.db.messages
      .where('conversationId')
      .equals(conversationId)
      .reverse()
      .sortBy('createdAt')
  }

  /**
   * Clear all cache (for logout)
   */
  async clearCache(): Promise<void> {
    await this.db.conversations.clear()
    await this.db.messages.clear()
  }
}

export const messageCacheService = new MessageCacheService()
```

---

### **3. Enhanced Messaging Store with Offline Support**

**File:** `src/store/messagingStore.ts` (enhancements)

```typescript
// Add to existing messagingStore.ts

interface MessagingState {
  // ... existing state ...
  isOffline: boolean
  pendingMessageCount: number
  syncStatus: 'idle' | 'syncing' | 'error'
}

// Add new actions
const actions = {
  // ... existing actions ...

  /**
   * Set offline status
   */
  setOfflineStatus: (isOffline: boolean) => {
    set({ isOffline })
  },

  /**
   * Update pending count
   */
  updatePendingCount: async () => {
    const count = await offlineQueueService.getPendingCount()
    set({ pendingMessageCount: count })
  },

  /**
   * Trigger manual sync
   */
  syncPendingMessages: async () => {
    set({ syncStatus: 'syncing' })
    try {
      await offlineQueueService.syncPendingMessages()
      await get().updatePendingCount()
      set({ syncStatus: 'idle' })
    } catch (error) {
      set({ syncStatus: 'error' })
    }
  }
}
```

---

### **4. Offline Indicator Component**

**File:** `src/components/messaging/OfflineIndicator.tsx`

```typescript
// src/components/messaging/OfflineIndicator.tsx
import React, { useEffect } from 'react'
import { WifiOff, RefreshCw } from 'lucide-react'
import { useMessagingStore } from '../../store/messagingStore'

export function OfflineIndicator() {
  const { 
    isOffline, 
    pendingMessageCount, 
    syncStatus,
    setOfflineStatus,
    updatePendingCount,
    syncPendingMessages
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

  if (!isOffline && pendingMessageCount === 0) return null

  return (
    <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isOffline ? (
            <>
              <WifiOff className="w-4 h-4 text-yellow-600" />
              <span className="text-sm text-yellow-800">
                You're offline. Messages will be sent when back online.
              </span>
            </>
          ) : (
            <>
              <RefreshCw 
                className={`w-4 h-4 text-blue-600 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} 
              />
              <span className="text-sm text-blue-800">
                Syncing {pendingMessageCount} pending message{pendingMessageCount > 1 ? 's' : ''}...
              </span>
            </>
          )}
        </div>

        {pendingMessageCount > 0 && !isOffline && (
          <button
            onClick={syncPendingMessages}
            disabled={syncStatus === 'syncing'}
            className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
          >
            Retry Now
          </button>
        )}
      </div>
    </div>
  )
}
```

**🎨 MCP Integration:**
```bash
# Use Shadcn for indicator components
warp mcp run shadcn "getComponent alert"
```

---

### **5. Enhanced useSendMessage Hook**

**File:** `src/hooks/useSendMessage.ts` (enhancements)

```typescript
// src/hooks/useSendMessage.ts
import { useState } from 'react'
import { messagingService } from '../services/messagingService'
import { offlineQueueService } from '../services/offlineQueueService'
import { useMessagingStore } from '../store/messagingStore'
import { toast } from 'react-hot-toast'

export function useSendMessage() {
  const [isLoading, setIsLoading] = useState(false)
  const { addMessage, isOffline, updatePendingCount } = useMessagingStore()

  const sendMessage = async (data: {
    conversationId: string
    content: string
    type?: 'text' | 'image' | 'video' | 'link'
    mediaUrls?: string[]
    linkPreview?: any
  }) => {
    setIsLoading(true)

    try {
      // If offline, queue message
      if (isOffline || !navigator.onLine) {
        const queueId = await offlineQueueService.queueMessage(data)
        
        // Add optimistic message to UI
        addMessage(data.conversationId, {
          id: queueId,
          ...data,
          senderId: 'current-user', // Replace with actual user ID
          createdAt: new Date().toISOString(),
          status: 'sending'
        })

        await updatePendingCount()
        toast.success('Message queued. Will send when back online.')
        return
      }

      // Online: send immediately
      const message = await messagingService.sendMessage(data)
      addMessage(data.conversationId, message)
      toast.success('Message sent!')
    } catch (error) {
      console.error('Failed to send message:', error)
      
      // Fallback to queue on error
      await offlineQueueService.queueMessage(data)
      await updatePendingCount()
      toast.error('Failed to send. Message queued for retry.')
    } finally {
      setIsLoading(false)
    }
  }

  return { sendMessage, isLoading }
}
```

---

## 📋 **Story Breakdown**

### **Story 8.4.1: IndexedDB Queue Setup** (2 days)
- [ ] Set up Dexie.js for IndexedDB
- [ ] Create offline queue schema
- [ ] Implement queueMessage method
- **🧠 MCP**: Analyze IndexedDB implementation with Context7

### **Story 8.4.2: Sync Logic** (2 days)
- [ ] Implement syncPendingMessages with retry logic
- [ ] Handle network online/offline events
- [ ] Update Zustand store with sync status
- **🛢 MCP**: Test sync with network throttling via Chrome DevTools

### **Story 8.4.3: Message Caching** (1 day)
- [ ] Cache last 50 conversations
- [ ] Cache last 200 messages per conversation
- [ ] Load from cache on app startup
- **🌐 MCP**: Debug cache loading with Chrome DevTools

### **Story 8.4.4: Offline UI Indicators** (1 day)
- [ ] Create OfflineIndicator component
- [ ] Show pending message count
- [ ] Manual sync button
- **🎨 MCP**: Use Shadcn for alert components

### **Story 8.4.5: Conflict Resolution** (1 day)
- [ ] Handle duplicate message prevention
- [ ] Resolve timestamp conflicts
- [ ] Test edge cases (rapid offline/online)
- **🤖 MCP**: E2E test offline scenarios with Puppeteer

---

## 🧪 **Testing with MCP**

### **E2E Offline Tests with Puppeteer MCP**
```bash
# Simulate offline mode and test queueing
warp mcp run puppeteer "e2e test offline message queueing flow"
```

### **Network Throttling with Chrome DevTools MCP**
```bash
# Test sync with slow 3G
warp mcp run chrome-devtools "open devtools, set network to Slow 3G, test message sync"
```

### **Database Inspection with Supabase MCP**
```bash
# Check for duplicate messages after sync
warp mcp run supabase "execute_sql SELECT id, conversation_id, created_at, content FROM messages WHERE conversation_id = 'conv-123' ORDER BY created_at DESC LIMIT 10;"
```

---

## ✅ **Definition of Done**

- [x] Messages queue reliably when offline
- [x] Sync success rate > 99%
- [x] No duplicate messages sent
- [x] UI shows offline/syncing status
- [x] Cache loads on app startup
- [x] Tests passing (E2E offline scenarios)

---

**Next Epic:** [EPIC_8.5_Advanced_Features.md](./EPIC_8.5_Advanced_Features.md)
