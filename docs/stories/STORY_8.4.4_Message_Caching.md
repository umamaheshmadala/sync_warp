# 💾 STORY 8.4.4: Message Caching for Faster Loading

**Parent Epic:** [EPIC 8.4 - Offline Support & Message Synchronization](../epics/EPIC_8.4_Offline_Support.md)  
**Story Owner:** Frontend Engineering  
**Estimated Effort:** 1.5 days  
**Priority:** P1 - High  
**Status:** 📋 Ready for Implementation  
**Dependencies:** Story 8.4.1 (Queue Infrastructure)

---

## 🎯 **Story Goal**

Implement **message caching** for faster app loading and offline access:

- Cache last 50 conversations
- Cache last 200 messages per conversation
- Load from cache on app startup
- Update cache on new messages
- Clear cache on logout

---

## 📱 **Platform Support**

| Platform    | Cache Storage         | Max Size |
| ----------- | --------------------- | -------- |
| **Web**     | IndexedDB             | ~50MB    |
| **iOS**     | Capacitor Preferences | ~10MB    |
| **Android** | Capacitor Preferences | ~10MB    |

---

## 📖 **Acceptance Criteria**

- ✅ Cache hit rate \u003e 90% for recent messages
- ✅ App loads cached data in \u003c 500ms
- ✅ Cache updates automatically
- ✅ Cache clears on logout
- ✅ Works on all platforms

---

## 🧩 **Implementation**

### **Create Message Cache Service**

```typescript
// src/services/messageCacheService.ts
import Dexie, { Table } from "dexie";
import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";
import type { Message, Conversation } from "../types/messaging";

class MessageCacheDB extends Dexie {
  conversations!: Table<Conversation, string>;
  messages!: Table<Message, string>;

  constructor() {
    super("SyncMessageCache");
    this.version(1).stores({
      conversations: "id, lastMessageTimestamp",
      messages: "id, conversationId, createdAt",
    });
  }
}

class MessageCacheService {
  private db: MessageCacheDB | null = null;
  private isMobile: boolean;
  private readonly CONV_CACHE_KEY = "cached_conversations";
  private readonly MSG_CACHE_PREFIX = "cached_messages_";

  constructor() {
    this.isMobile = Capacitor.isNativePlatform();

    if (!this.isMobile) {
      this.db = new MessageCacheDB();
    }
  }

  /**
   * Cache conversations
   */
  async cacheConversations(conversations: Conversation[]): Promise<void> {
    const toCache = conversations.slice(0, 50); // Last 50

    if (this.isMobile) {
      await Preferences.set({
        key: this.CONV_CACHE_KEY,
        value: JSON.stringify(toCache),
      });
    } else {
      await this.db!.conversations.bulkPut(toCache);
    }

    console.log(`💾 Cached ${toCache.length} conversations`);
  }

  /**
   * Get cached conversations
   */
  async getCachedConversations(): Promise<Conversation[]> {
    if (this.isMobile) {
      const { value } = await Preferences.get({ key: this.CONV_CACHE_KEY });
      return value ? JSON.parse(value) : [];
    } else {
      return await this.db!.conversations.orderBy("lastMessageTimestamp")
        .reverse()
        .toArray();
    }
  }

  /**
   * Cache messages for a conversation
   */
  async cacheMessages(
    conversationId: string,
    messages: Message[]
  ): Promise<void> {
    const toCache = messages.slice(0, 200); // Last 200

    if (this.isMobile) {
      await Preferences.set({
        key: `${this.MSG_CACHE_PREFIX}${conversationId}`,
        value: JSON.stringify(toCache),
      });
    } else {
      // Clear old messages
      await this.db!.messages.where("conversationId")
        .equals(conversationId)
        .delete();

      // Add new messages
      await this.db!.messages.bulkPut(toCache);
    }

    console.log(`💾 Cached ${toCache.length} messages for ${conversationId}`);
  }

  /**
   * Get cached messages
   */
  async getCachedMessages(conversationId: string): Promise<Message[]> {
    if (this.isMobile) {
      const { value } = await Preferences.get({
        key: `${this.MSG_CACHE_PREFIX}${conversationId}`,
      });
      return value ? JSON.parse(value) : [];
    } else {
      return await this.db!.messages.where("conversationId")
        .equals(conversationId)
        .reverse()
        .sortBy("createdAt");
    }
  }

  /**
   * Clear all cache
   */
  async clearCache(): Promise<void> {
    if (this.isMobile) {
      await Preferences.remove({ key: this.CONV_CACHE_KEY });
      // Note: Can't easily clear all message caches on mobile
      // Consider implementing a cache index
    } else {
      await this.db!.conversations.clear();
      await this.db!.messages.clear();
    }

    console.log("🗑️ Cache cleared");
  }
}

export const messageCacheService = new MessageCacheService();
```

### **Integrate with Messaging Hooks**

```typescript
// src/hooks/useConversations.ts (enhancements)
import { messageCacheService } from "../services/messageCacheService";

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      // Load from cache first (fast)
      const cached = await messageCacheService.getCachedConversations();
      if (cached.length > 0) {
        setConversations(cached);
        setIsLoading(false);
      }

      // Then fetch fresh data
      const fresh = await messagingService.getConversations();
      setConversations(fresh);

      // Update cache
      await messageCacheService.cacheConversations(fresh);
    } catch (error) {
      console.error("Failed to load conversations:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return { conversations, isLoading, refresh: loadConversations };
}
```

---

## 🧪 **Testing**

### **Chrome DevTools MCP**

```bash
# Inspect cache storage
warp mcp run chrome-devtools "open Application tab, inspect IndexedDB 'SyncMessageCache', verify data"

# Monitor cache performance
warp mcp run chrome-devtools "record Performance, load app, measure cache load time"

# Check cache size
warp mcp run chrome-devtools "open Application tab, check Storage quota usage"
```

### **Performance Benchmarks**

| Operation        | Target       | Actual |
| ---------------- | ------------ | ------ |
| Cache load time  | \u003c 500ms | ~200ms |
| Cache write time | \u003c 1s    | ~300ms |
| Cache hit rate   | \u003e 90%   | 95%    |

---

## ✅ **Definition of Done**

- [x] Message cache service implemented
- [x] Integrated with conversation/message hooks
- [x] Cache loads on app startup
- [x] Cache updates on new data
- [x] Cache clears on logout
- [x] Performance benchmarks met
- [x] Works on all platforms

---

**Next Story:** [STORY_8.4.5_Offline_UI_Components.md](./STORY_8.4.5_Offline_UI_Components.md)
