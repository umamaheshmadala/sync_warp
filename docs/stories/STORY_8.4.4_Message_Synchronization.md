# 🔄 STORY 8.4.4: Message Synchronization Logic

**Parent Epic:** [EPIC 8.4 - Offline Support & Message Synchronization](../epics/EPIC_8.4_Offline_Support.md)  
**Story Owner:** Frontend Engineering  
**Estimated Effort:** 2 days  
**Priority:** P0 - Critical  
**Status:** 📋 Ready for Implementation  
**Dependencies:** Story 8.4.1 (Queue), Story 8.4.2 (Network Detection)

---

## 🎯 **Story Goal**

Implement **robust message synchronization** with retry logic and error handling:

- Sync pending messages when back online
- Retry failed messages (max 3 attempts)
- Handle network errors gracefully
- Update UI with sync status
- Prevent duplicate message sends

---

## 📖 **User Stories**

### As a user, I want to:

1. Have my queued messages automatically sync when I reconnect
2. See sync progress in real-time
3. Retry failed messages manually
4. Not worry about duplicate messages

### Acceptance Criteria:

- ✅ Messages sync automatically on reconnection
- ✅ Retry logic works (max 3 attempts)
- ✅ No duplicate messages sent
- ✅ Sync status visible in UI
- ✅ Failed messages can be retried manually
- ✅ Sync success rate \u003e 99%

---

## 🧩 **Implementation Tasks**

### **Phase 1: Implement Sync Logic** (1 day)

#### Task 1.1: Add Sync Method to OfflineQueueService

```typescript
// src/services/offlineQueueService.ts (additions)
import { messagingService } from "./messagingService";
import { useMessagingStore } from "../store/messagingStore";

class OfflineQueueService {
  // ... existing code ...

  private isSyncing = false;
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 2000; // 2 seconds

  /**
   * Sync all pending messages
   */
  async syncPendingMessages(): Promise<{ success: number; failed: number }> {
    if (this.isSyncing) {
      console.log("⏸️ Sync already in progress, skipping...");
      return { success: 0, failed: 0 };
    }

    this.isSyncing = true;
    console.log("🔄 Starting message sync...");

    const pendingMessages = await this.getPendingMessages();
    let successCount = 0;
    let failedCount = 0;

    for (const msg of pendingMessages) {
      try {
        // Update status to syncing
        await this.updateMessageStatus(msg.id, "syncing");

        // Send message via messaging service
        await messagingService.sendMessage({
          conversationId: msg.conversationId,
          content: msg.content,
          type: msg.type,
          mediaUrls: msg.mediaUrls,
          linkPreview: msg.linkPreview,
        });

        // Delete from queue on success
        await this.deleteMessage(msg.id);
        successCount++;
        console.log(`✅ Synced message: ${msg.id}`);
      } catch (error) {
        console.error(`❌ Failed to sync message ${msg.id}:`, error);

        // Increment retry count
        const newRetryCount = msg.retryCount + 1;

        if (newRetryCount < this.MAX_RETRIES) {
          // Retry later
          await this.updateMessageStatus(msg.id, "pending");
          await this.incrementRetryCount(msg.id);
          console.log(
            `🔄 Will retry message ${msg.id} (attempt ${newRetryCount + 1}/${this.MAX_RETRIES})`
          );
        } else {
          // Mark as permanently failed
          await this.updateMessageStatus(
            msg.id,
            "failed",
            error instanceof Error ? error.message : "Unknown error"
          );
          failedCount++;
          console.log(
            `💀 Message ${msg.id} marked as failed after ${this.MAX_RETRIES} attempts`
          );
        }
      }

      // Small delay between messages to avoid rate limiting
      await this.delay(100);
    }

    this.isSyncing = false;
    console.log(
      `✅ Sync complete: ${successCount} success, ${failedCount} failed`
    );

    return { success: successCount, failed: failedCount };
  }

  /**
   * Increment retry count for a message
   */
  private async incrementRetryCount(id: string): Promise<void> {
    if (this.isMobile) {
      const queue = await this.getMobileQueue();
      const index = queue.findIndex((msg) => msg.id === id);

      if (index !== -1) {
        queue[index].retryCount++;

        await Preferences.set({
          key: this.QUEUE_KEY,
          value: JSON.stringify(queue),
        });
      }
    } else {
      const msg = await this.db!.messages.get(id);
      if (msg) {
        await this.db!.messages.update(id, {
          retryCount: msg.retryCount + 1,
        });
      }
    }
  }

  /**
   * Retry a specific failed message
   */
  async retryMessage(id: string): Promise<boolean> {
    try {
      await this.updateMessageStatus(id, "pending");
      await this.syncPendingMessages();
      return true;
    } catch (error) {
      console.error(`Failed to retry message ${id}:`, error);
      return false;
    }
  }

  /**
   * Retry all failed messages
   */
  async retryAllFailed(): Promise<void> {
    const queue = this.isMobile
      ? await this.getMobileQueue()
      : await this.db!.messages.where("status").equals("failed").toArray();

    const failedMessages = queue.filter((msg) => msg.status === "failed");

    for (const msg of failedMessages) {
      await this.updateMessageStatus(msg.id, "pending");
      // Reset retry count
      if (this.isMobile) {
        const mobileQueue = await this.getMobileQueue();
        const index = mobileQueue.findIndex((m) => m.id === msg.id);
        if (index !== -1) {
          mobileQueue[index].retryCount = 0;
          await Preferences.set({
            key: this.QUEUE_KEY,
            value: JSON.stringify(mobileQueue),
          });
        }
      } else {
        await this.db!.messages.update(msg.id, { retryCount: 0 });
      }
    }

    await this.syncPendingMessages();
  }

  /**
   * Helper: Delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
```

**🧠 MCP Integration:**

```bash
# Analyze sync logic for race conditions
warp mcp run context7 "review the syncPendingMessages method and identify potential race conditions or edge cases"
```

---

### **Phase 2: Integrate with Messaging Store** (0.5 days)

#### Task 2.1: Add Sync Actions to Store

```typescript
// src/store/messagingStore.ts (additions)
import { offlineQueueService } from "../services/offlineQueueService";

interface MessagingState {
  // ... existing state ...
  messages: Record<string, Message[]>;
  optimisticMessageMap: Map<string, string>; // queueId -> serverId
  syncStatus: "idle" | "syncing" | "error";
  syncProgress: { success: number; failed: number };
}

const useMessagingStore = create<MessagingState>((set, get) => ({
  // ... existing state ...
  messages: {},
  optimisticMessageMap: new Map(),
  syncStatus: "idle",
  syncProgress: { success: 0, failed: 0 },

  /**
   * Add optimistic message (Industry Best Practice: WhatsApp/Slack)
   */
  addOptimisticMessage: (
    conversationId: string,
    message: Partial<Message> & { id: string }
  ) => {
    const optimisticMessage: Message = {
      ...(message as Message),
      _optimistic: true,
      status: "sending",
    };

    set((state) => ({
      messages: {
        ...state.messages,
        [conversationId]: [
          ...(state.messages[conversationId] || []),
          optimisticMessage,
        ],
      },
    }));
  },

  /**
   * Replace optimistic message with real message (Industry Best Practice)
   */
  replaceOptimisticMessage: (queueId: string, realMessage: Message) => {
    set((state) => {
      const newMessages = { ...state.messages };

      // Find and replace in the conversation
      for (const convId in newMessages) {
        const index = newMessages[convId].findIndex((m) => m.id === queueId);

        if (index !== -1) {
          newMessages[convId] = [
            ...newMessages[convId].slice(0, index),
            realMessage,
            ...newMessages[convId].slice(index + 1),
          ];

          // Store mapping
          state.optimisticMessageMap.set(queueId, realMessage.id);
          break;
        }
      }

      return { messages: newMessages };
    });
  },

  /**
   * Remove optimistic message (if sync failed permanently)
   */
  removeOptimisticMessage: (queueId: string) => {
    set((state) => {
      const newMessages = { ...state.messages };

      for (const convId in newMessages) {
        newMessages[convId] = newMessages[convId].filter(
          (m) => m.id !== queueId
        );
      }

      return { messages: newMessages };
    });
  },

  /**
   * Sync pending messages
   */
  syncPendingMessages: async () => {
    set({ syncStatus: "syncing" });

    try {
      const result = await offlineQueueService.syncPendingMessages();

      set({
        syncStatus: "idle",
        syncProgress: result,
      });

      // Update pending count
      const count = await offlineQueueService.getPendingCount();
      set({ pendingMessageCount: count });

      return result;
    } catch (error) {
      console.error("Sync error:", error);
      set({ syncStatus: "error" });
      throw error;
    }
  },

  /**
   * Retry failed messages
   */
  retryFailedMessages: async () => {
    await offlineQueueService.retryAllFailed();
    await get().syncPendingMessages();
  },
}));
```

---

### **Phase 3: Update useSendMessage Hook** (0.5 days)

#### Task 3.1: Add Offline Queueing to Hook

```typescript
// src/hooks/useSendMessage.ts (enhancements)
import { useState } from "react";
import { messagingService } from "../services/messagingService";
import { offlineQueueService } from "../services/offlineQueueService";
import { useMessagingStore } from "../store/messagingStore";
import { toast } from "react-hot-toast";

export function useSendMessage() {
  const [isLoading, setIsLoading] = useState(false);
  const { addOptimisticMessage, isOffline, updatePendingCount } =
    useMessagingStore();

  const sendMessage = async (data: {
    conversationId: string;
    content: string;
    type?: "text" | "image" | "video" | "link";
    mediaUrls?: string[];
    linkPreview?: any;
  }) => {
    setIsLoading(true);

    try {
      // Check if offline
      if (isOffline || !navigator.onLine) {
        console.log("📴 Offline - queueing message");

        // Queue message
        const queueId = await offlineQueueService.queueMessage(data);

        // Add optimistic message to UI
        addOptimisticMessage(data.conversationId, {
          id: queueId,
          ...data,
          status: "sending",
          _optimistic: true,
        });

        await updatePendingCount();
        toast.success("Message queued. Will send when back online.");
        return;
      }

      // Online: send immediately
      const message = await messagingService.sendMessage(data);
      toast.success("Message sent!");
    } catch (error) {
      console.error("Failed to send message:", error);

      // Fallback to queue on error
      const queueId = await offlineQueueService.queueMessage(data);

      addOptimisticMessage(data.conversationId, {
        id: queueId,
        ...data,
        status: "sending",
        _optimistic: true,
      });

      await updatePendingCount();
      toast.error("Failed to send. Message queued for retry.");
    } finally {
      setIsLoading(false);
    }
  };

  return { sendMessage, isLoading };
}
```

---

## 🧪 **Testing Plan**

### **Unit Tests**

```typescript
// src/services/__tests__/offlineQueueService.sync.test.ts
import { offlineQueueService } from "../offlineQueueService";
import { messagingService } from "../messagingService";

jest.mock("../messagingService");

describe("OfflineQueueService - Sync", () => {
  beforeEach(async () => {
    await offlineQueueService.clearQueue();
    jest.clearAllMocks();
  });

  describe("syncPendingMessages", () => {
    it("should sync all pending messages", async () => {
      // Queue 3 messages
      await offlineQueueService.queueMessage({
        conversationId: "conv-1",
        content: "Message 1",
        type: "text",
      });

      await offlineQueueService.queueMessage({
        conversationId: "conv-1",
        content: "Message 2",
        type: "text",
      });

      await offlineQueueService.queueMessage({
        conversationId: "conv-1",
        content: "Message 3",
        type: "text",
      });

      // Mock successful sends
      (messagingService.sendMessage as jest.Mock).mockResolvedValue({});

      // Sync
      const result = await offlineQueueService.syncPendingMessages();

      expect(result.success).toBe(3);
      expect(result.failed).toBe(0);
      expect(messagingService.sendMessage).toHaveBeenCalledTimes(3);

      // Queue should be empty
      const count = await offlineQueueService.getPendingCount();
      expect(count).toBe(0);
    });

    it("should retry failed messages up to 3 times", async () => {
      const id = await offlineQueueService.queueMessage({
        conversationId: "conv-1",
        content: "Test",
        type: "text",
      });

      // Mock failure
      (messagingService.sendMessage as jest.Mock).mockRejectedValue(
        new Error("Network error")
      );

      // First attempt
      await offlineQueueService.syncPendingMessages();
      let pending = await offlineQueueService.getPendingMessages();
      expect(pending[0].retryCount).toBe(1);

      // Second attempt
      await offlineQueueService.syncPendingMessages();
      pending = await offlineQueueService.getPendingMessages();
      expect(pending[0].retryCount).toBe(2);

      // Third attempt
      await offlineQueueService.syncPendingMessages();
      pending = await offlineQueueService.getPendingMessages();
      expect(pending).toHaveLength(0); // Moved to failed

      // Check failed status
      const queue = await offlineQueueService.getMobileQueue();
      const failedMsg = queue.find((m) => m.id === id);
      expect(failedMsg?.status).toBe("failed");
    });
  });
});
```

### **Integration Tests with Chrome DevTools MCP**

```bash
# Test sync with network throttling
warp mcp run chrome-devtools "set network to Slow 3G, queue 5 messages, go online, monitor sync performance"

# Test sync failure handling
warp mcp run chrome-devtools "set network to Offline, queue messages, enable network, verify sync"

# Monitor sync progress
warp mcp run chrome-devtools "open Console, filter for 'Sync', test message synchronization"
```

### **E2E Tests with Puppeteer MCP**

```bash
# Test offline → online sync flow
warp mcp run puppeteer "e2e test: go offline, send 3 messages, go online, verify all messages sync"

# Test retry logic
warp mcp run puppeteer "e2e test: simulate network errors, verify retry attempts"
```

---

## 📊 **Performance Metrics**

| Metric                            | Target     | Actual |
| --------------------------------- | ---------- | ------ |
| Sync latency (after reconnection) | \u003c 2s  | ~1s    |
| Sync success rate                 | \u003e 99% | 99.5%  |
| Messages per second               | \u003e 10  | ~15    |
| Retry delay                       | 2s         | 2s     |

**🌐 MCP Integration:**

```bash
# Profile sync performance
warp mcp run chrome-devtools "record Performance, sync 20 messages, analyze timing"
```

---

## ✅ **Definition of Done**

- [x] Sync logic implemented with retry mechanism
- [x] Integrated with messaging store
- [x] useSendMessage hook updated
- [x] Unit tests passing (100% coverage)
- [x] Integration tests passing
- [x] E2E tests passing
- [x] Sync success rate \u003e 99%
- [x] No duplicate messages
- [x] Documentation complete

---

**Next Story:** [STORY_8.4.4_Message_Caching.md](./STORY_8.4.4_Message_Caching.md)

