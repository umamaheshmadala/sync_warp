# 📋 STORY 9.4.6: Offline Support for Friend Requests

**Epic:** [EPIC 9.4: Friends Service Layer & Business Logic](../epics/EPIC_9.4_Friends_Service_Layer.md)  
**Story Points:** 2  
**Priority:** Medium  
**Status:** 📋 To Do

---

## 📝 **Story Description**

As a **user**, I want to **send friend requests even when offline** so that **my requests are queued and sent automatically when I reconnect**.

---

## 🎯 **Acceptance Criteria**

1. ✅ Queue outgoing friend requests when offline
2. ✅ Retry queued requests on reconnect (Capacitor Network plugin)
3. ✅ Conflict resolution for duplicate requests
4. ✅ Persist queue in local storage
5. ✅ Show pending status for queued requests
6. ✅ 100% delivery rate on reconnect

---

## 🎨 **MCP Integration**

```bash
# Context7 MCP: Analyze offline queue patterns
warp mcp run context7 "show best practices for offline request queuing in React"
```

---

## 📦 **Implementation**

```typescript
// src/services/offlineQueue.ts

import { Network } from '@capacitor/network';

interface QueuedRequest {
  id: string;
  type: 'friend_request' | 'accept' | 'reject' | 'unfriend';
  payload: any;
  timestamp: number;
  retries: number;
}

class OfflineQueue {
  private queue: QueuedRequest[] = [];
  private processing = false;

  constructor() {
    this.loadQueue();
    this.setupNetworkListener();
  }

  private loadQueue() {
    const stored = localStorage.getItem('offline_queue');
    if (stored) {
      this.queue = JSON.parse(stored);
    }
  }

  private saveQueue() {
    localStorage.setItem('offline_queue', JSON.stringify(this.queue));
  }

  private async setupNetworkListener() {
    Network.addListener('networkStatusChange', async (status) => {
      if (status.connected && !this.processing) {
        await this.processQueue();
      }
    });
  }

  async add(type: QueuedRequest['type'], payload: any) {
    const request: QueuedRequest = {
      id: crypto.randomUUID(),
      type,
      payload,
      timestamp: Date.now(),
      retries: 0,
    };

    this.queue.push(request);
    this.saveQueue();

    // Try to process immediately if online
    const status = await Network.getStatus();
    if (status.connected) {
      await this.processQueue();
    }
  }

  private async processQueue() {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;

    while (this.queue.length > 0) {
      const request = this.queue[0];

      try {
        await this.executeRequest(request);
        this.queue.shift(); // Remove on success
      } catch (error) {
        request.retries++;
        if (request.retries >= 3) {
          console.error('Max retries reached, removing request:', request);
          this.queue.shift();
        }
        break; // Stop processing on error
      }

      this.saveQueue();
    }

    this.processing = false;
  }

  private async executeRequest(request: QueuedRequest) {
    const { friendsService } = await import('./friendsService');

    switch (request.type) {
      case 'friend_request':
        return friendsService.sendFriendRequest(request.payload.receiverId, request.payload.message);
      case 'accept':
        return friendsService.acceptFriendRequest(request.payload.requestId);
      case 'reject':
        return friendsService.rejectFriendRequest(request.payload.requestId);
      case 'unfriend':
        return friendsService.unfriend(request.payload.friendId);
    }
  }

  getQueuedCount() {
    return this.queue.length;
  }
}

export const offlineQueue = new OfflineQueue();
```

### **Integration with Service:**
```typescript
// Update friendsService.ts to use offline queue

import { offlineQueue } from './offlineQueue';
import { Network } from '@capacitor/network';

export const friendsService = {
  async sendFriendRequest(receiverId: string, message?: string) {
    const status = await Network.getStatus();
    
    if (!status.connected) {
      // Queue for later
      await offlineQueue.add('friend_request', { receiverId, message });
      return {
        success: true,
        data: null,
        queued: true,
      };
    }

    // Normal online flow...
  },
  // ... rest of service
};
```

---

## 🧪 **Testing**

### **Offline Queue Tests:**
```typescript
describe('OfflineQueue', () => {
  it('should queue requests when offline', async () => {
    // Mock offline
    jest.spyOn(Network, 'getStatus').mockResolvedValue({ connected: false });
    
    await offlineQueue.add('friend_request', { receiverId: 'user-123' });
    
    expect(offlineQueue.getQueuedCount()).toBe(1);
  });

  it('should process queue when back online', async () => {
    // Mock online
    jest.spyOn(Network, 'getStatus').mockResolvedValue({ connected: true });
    
    await offlineQueue.processQueue();
    
    expect(offlineQueue.getQueuedCount()).toBe(0);
  });
});
```

---

## 🚀 **Deployment Checklist**

- [ ] Offline queue implemented
- [ ] Network listener configured
- [ ] Queue persistence working
- [ ] Conflict resolution in place
- [ ] Integration tested
- [ ] Code reviewed

---

**Previous Story:** [STORY 9.4.5: Error Handling & Retry](./STORY_9.4.5_Error_Handling.md)  
**Epic Complete!** All stories for Epic 9.4 are now defined.
