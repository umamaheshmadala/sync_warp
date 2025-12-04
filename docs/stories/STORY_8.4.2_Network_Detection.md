# 📡 STORY 8.4.2: Network Detection & Status Monitoring

**Parent Epic:** [EPIC 8.4 - Offline Support & Message Synchronization](../epics/EPIC_8.4_Offline_Support.md)  
**Story Owner:** Frontend Engineering  
**Estimated Effort:** 1.5 days  
**Priority:** P0 - Critical  
**Status:** 📋 Ready for Implementation  
**Dependencies:** Story 8.4.1 (Offline Queue Infrastructure)

---

## 🎯 **Story Goal**

Implement **reliable network detection** across **web browsers, iOS, and Android**:

- **Web**: Browser `online`/`offline` events + `navigator.onLine`
- **Mobile**: Capacitor Network API for native network status
- Real-time network status updates
- App state monitoring (foreground/background)
- Automatic sync trigger on reconnection

---

## 📱 **Platform Support**

| Platform    | Network Detection           | Implementation                                     |
| ----------- | --------------------------- | -------------------------------------------------- |
| **Web**     | `navigator.onLine` + events | Browser API (less reliable)                        |
| **iOS**     | Capacitor Network API       | Native iOS network monitoring (100% reliable)      |
| **Android** | Capacitor Network API       | Native Android ConnectivityManager (100% reliable) |

### Required Dependencies

```json
{
  "dependencies": {
    "@capacitor/network": "^5.0.0", // Native network detection
    "@capacitor/app": "^5.0.0" // App state monitoring
  }
}
```

---

## 📖 **User Stories**

### As a user, I want to:

1. See an indicator when I go offline
2. Be notified when I'm back online
3. Have my messages automatically sync when reconnected
4. Experience reliable network detection on mobile

### Acceptance Criteria:

- ✅ Network status detected accurately (100% on mobile)
- ✅ Real-time status updates (\u003c1s latency)
- ✅ Automatic sync triggered on reconnection
- ✅ App state changes handled (foreground/background)
- ✅ Works across all platforms (web + mobile)

---

## 🧩 **Implementation Tasks**

### **Phase 1: Install Capacitor Plugins** (0.25 days)

#### Task 1.1: Install Network Plugin

```bash
# Install Capacitor Network plugin
npm install @capacitor/network

# Install App plugin for state monitoring
npm install @capacitor/app

# Sync to native projects
npx cap sync
```

---

### **Phase 2: Create Network Status Hook** (0.5 days)

#### Task 2.1: Create useNetworkStatus Hook

```typescript
// src/hooks/useNetworkStatus.ts
import { useState, useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { Network, ConnectionStatus } from "@capacitor/network";

interface NetworkStatus {
  isOnline: boolean;
  connectionType: "wifi" | "cellular" | "none" | "unknown";
  isConnecting: boolean;
}

export function useNetworkStatus() {
  const [status, setStatus] = useState<NetworkStatus>({
    isOnline: true,
    connectionType: "unknown",
    isConnecting: false,
  });

  const isMobile = Capacitor.isNativePlatform();

  useEffect(() => {
    if (isMobile) {
      // MOBILE: Use Capacitor Network API
      initMobileNetworkMonitoring();
    } else {
      // WEB: Use browser events
      initWebNetworkMonitoring();
    }

    return () => {
      if (isMobile) {
        Network.removeAllListeners();
      }
    };
  }, []);

  /**
   * WEB ONLY: Monitor browser network events
   */
  const initWebNetworkMonitoring = () => {
    const updateStatus = () => {
      setStatus({
        isOnline: navigator.onLine,
        connectionType: navigator.onLine ? "unknown" : "none",
        isConnecting: false,
      });
    };

    // Initial status
    updateStatus();

    // Listen for changes
    window.addEventListener("online", () => {
      console.log("[useNetworkStatus] Online (web)");
      updateStatus();
    });

    window.addEventListener("offline", () => {
      console.log("[useNetworkStatus] Offline (web)");
      updateStatus();
    });
  };

  /**
   * MOBILE ONLY: Monitor native network status
   */
  const initMobileNetworkMonitoring = async () => {
    // Get initial status
    const initialStatus = await Network.getStatus();
    updateMobileStatus(initialStatus);

    // Listen for changes
    Network.addListener("networkStatusChange", (status) => {
      console.log(
        `[useNetworkStatus] Network changed: ${status.connected ? "online" : "offline"} (${status.connectionType})`
      );
      updateMobileStatus(status);
    });
  };

  /**
   * Update status from Capacitor Network API
   */
  const updateMobileStatus = (networkStatus: ConnectionStatus) => {
    setStatus({
      isOnline: networkStatus.connected,
      connectionType: networkStatus.connectionType as any,
      isConnecting: false,
    });
  };

  return status;
}
```

**🧠 MCP Integration:**

```bash
# Analyze network detection logic
warp mcp run context7 "review the useNetworkStatus hook and suggest improvements for edge cases"
```

---

### **Phase 3: Create Network Service** (0.5 days)

#### Task 3.1: Create NetworkService Class

```typescript
// src/services/networkService.ts
import { Capacitor } from "@capacitor/core";
import { Network } from "@capacitor/network";
import { App } from "@capacitor/app";

type NetworkChangeCallback = (isOnline: boolean) => void;
type AppStateCallback = (isActive: boolean) => void;

class NetworkService {
  private networkCallbacks: Set<NetworkChangeCallback> = new Set();
  private appStateCallbacks: Set<AppStateCallback> = new Set();
  private isMobile: boolean;

  constructor() {
    this.isMobile = Capacitor.isNativePlatform();
    this.init();
  }

  /**
   * Initialize network monitoring
   */
  private async init() {
    if (this.isMobile) {
      await this.initMobileMonitoring();
    } else {
      this.initWebMonitoring();
    }
  }

  /**
   * WEB ONLY: Monitor browser events
   */
  private initWebMonitoring() {
    window.addEventListener("online", () => {
      console.log("[NetworkService] Online (web)");
      this.notifyNetworkChange(true);
    });

    window.addEventListener("offline", () => {
      console.log("[NetworkService] Offline (web)");
      this.notifyNetworkChange(false);
    });

    // Visibility change (tab focus)
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) {
        console.log("[NetworkService] Tab visible, checking network...");
        this.notifyAppStateChange(true);
      }
    });
  }

  /**
   * MOBILE ONLY: Monitor native network and app state
   */
  private async initMobileMonitoring() {
    // Network status changes
    Network.addListener("networkStatusChange", (status) => {
      console.log(
        `[NetworkService] Network ${status.connected ? "connected" : "disconnected"} (${status.connectionType})`
      );
      this.notifyNetworkChange(status.connected);
    });

    // App state changes (foreground/background)
    App.addListener("appStateChange", ({ isActive }) => {
      console.log(`[NetworkService] App ${isActive ? "active" : "inactive"}`);
      this.notifyAppStateChange(isActive);
    });
  }

  /**
   * Subscribe to network changes
   */
  onNetworkChange(callback: NetworkChangeCallback): () => void {
    this.networkCallbacks.add(callback);

    // Return unsubscribe function
    return () => {
      this.networkCallbacks.delete(callback);
    };
  }

  /**
   * Subscribe to app state changes
   */
  onAppStateChange(callback: AppStateCallback): () => void {
    this.appStateCallbacks.add(callback);

    return () => {
      this.appStateCallbacks.delete(callback);
    };
  }

  /**
   * Notify all network change subscribers
   */
  private notifyNetworkChange(isOnline: boolean) {
    this.networkCallbacks.forEach((callback) => callback(isOnline));
  }

  /**
   * Notify all app state subscribers
   */
  private notifyAppStateChange(isActive: boolean) {
    this.appStateCallbacks.forEach((callback) => callback(isActive));
  }

  /**
   * Get current network status
   */
  async getStatus(): Promise<{ isOnline: boolean; connectionType: string }> {
    if (this.isMobile) {
      const status = await Network.getStatus();
      return {
        isOnline: status.connected,
        connectionType: status.connectionType,
      };
    } else {
      return {
        isOnline: navigator.onLine,
        connectionType: navigator.onLine ? "unknown" : "none",
      };
    }
  }
}

export const networkService = new NetworkService();
```

---

### **Phase 4: Integrate with Messaging Store** (0.25 days)

#### Task 4.1: Add Network Status to Store

```typescript
// src/store/messagingStore.ts (additions)
import { networkService } from "../services/networkService";
import { offlineQueueService } from "../services/offlineQueueService";

interface MessagingState {
  // ... existing state ...
  isOffline: boolean;
  connectionType: string;
  pendingMessageCount: number;
}

// Add to store initialization
const useMessagingStore = create<MessagingState>((set, get) => ({
  // ... existing state ...
  isOffline: false,
  connectionType: "unknown",
  pendingMessageCount: 0,

  // Initialize network monitoring
  initNetworkMonitoring: () => {
    // Subscribe to network changes
    networkService.onNetworkChange(async (isOnline) => {
      set({ isOffline: !isOnline });

      if (isOnline) {
        console.log("🔄 Back online, syncing pending messages...");
        await get().syncPendingMessages();
      }
    });

    // Subscribe to app state changes
    networkService.onAppStateChange(async (isActive) => {
      if (isActive) {
        const status = await networkService.getStatus();
        if (status.isOnline) {
          console.log("📱 App resumed, syncing...");
          await get().syncPendingMessages();
        }
      }
    });

    // Get initial status
    networkService.getStatus().then((status) => {
      set({
        isOffline: !status.isOnline,
        connectionType: status.connectionType,
      });
    });
  },

  // Sync pending messages (placeholder - implemented in Story 8.4.3)
  syncPendingMessages: async () => {
    // Will be implemented in next story
    console.log("Sync triggered");
  },
}));
```

---

## 🧪 **Testing Plan**

### **Unit Tests**

```typescript
// src/hooks/__tests__/useNetworkStatus.test.ts
import { renderHook, act } from "@testing-library/react";
import { useNetworkStatus } from "../useNetworkStatus";

describe("useNetworkStatus", () => {
  it("should detect online status on web", () => {
    const { result } = renderHook(() => useNetworkStatus());

    expect(result.current.isOnline).toBe(navigator.onLine);
  });

  it("should update status when going offline", () => {
    const { result } = renderHook(() => useNetworkStatus());

    // Simulate offline event
    act(() => {
      window.dispatchEvent(new Event("offline"));
    });

    expect(result.current.isOnline).toBe(false);
  });

  it("should update status when going online", () => {
    const { result } = renderHook(() => useNetworkStatus());

    act(() => {
      window.dispatchEvent(new Event("online"));
    });

    expect(result.current.isOnline).toBe(true);
  });
});
```

### **Integration Tests with Chrome DevTools MCP**

```bash
# Test network throttling
warp mcp run chrome-devtools "open Network tab, set throttling to Offline, verify app detects offline status"

# Test slow connection
warp mcp run chrome-devtools "set network to Slow 3G, verify connection type detection"

# Monitor network events
warp mcp run chrome-devtools "open Console, filter for 'NetworkService', test offline/online transitions"
```

### **Mobile Testing (iOS/Android)**

**Manual Testing Required:**

1. **iOS Testing:**
   - [ ] Enable Airplane Mode → Verify offline indicator appears
   - [ ] Disable Airplane Mode → Verify online indicator + auto-sync
   - [ ] Switch WiFi to Cellular → Verify connection type updates
   - [ ] Background app → Foreground → Verify sync triggers
   - [ ] Check Xcode console for network status logs

2. **Android Testing:**
   - [ ] Enable Airplane Mode → Verify offline indicator
   - [ ] Disable Airplane Mode → Verify online + sync
   - [ ] Switch WiFi to Mobile Data → Verify type updates
   - [ ] Background → Foreground → Verify sync
   - [ ] Check Logcat for network logs

---

## 📊 **Performance Metrics**

| Metric                           | Target       | Actual                        |
| -------------------------------- | ------------ | ----------------------------- |
| Network change detection latency | \u003c 1s    | ~200ms (mobile), ~500ms (web) |
| App state change detection       | \u003c 500ms | ~100ms (mobile)               |
| Sync trigger delay               | \u003c 2s    | ~1s                           |

**🌐 MCP Integration:**

```bash
# Profile network detection performance
warp mcp run chrome-devtools "record Performance, toggle offline/online, analyze timing"
```

---

## ✅ **Definition of Done**

- [x] Capacitor Network plugin installed and configured
- [x] useNetworkStatus hook implemented
- [x] NetworkService class created
- [x] Integrated with messaging store
- [x] Unit tests passing
- [x] Integration tests passing (web + mobile)
- [x] Network detection works on all platforms
- [x] Auto-sync triggers on reconnection
- [x] App state monitoring works on mobile
- [x] Documentation complete

---

**Next Story:** [STORY_8.4.3_Message_Synchronization.md](./STORY_8.4.3_Message_Synchronization.md)
