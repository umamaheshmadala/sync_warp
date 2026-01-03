# 🔑 STORY 8.6.2: Push Token Management

**Parent Epic:** [EPIC 8.6 - Push Notifications & Real-time Updates](../epics/EPIC_8.6_Push_Notifications.md)  
**Story Owner:** Mobile Engineering  
**Estimated Effort:** 1 day → **0 days (Already Implemented)**  
**Priority:** P0 - Critical  
**Status:** ✅ Already Implemented  
**Dependencies:** Story 8.6.1 (Capacitor Push Setup)

> [!NOTE]
> **This story is already implemented.** The following features exist:
>
> - Token saved to `user_push_tokens` table via `usePushNotifications.ts`
> - Token upsert with conflict handling
> - Token removal via `removeTokenFromDatabase()`

---

## 🎯 **Story Goal**

Manage push notification tokens in the database:

- Save tokens to `user_push_tokens` table on registration
- Update tokens when app reopens (token refresh)
- Remove tokens on user logout
- Handle multiple devices per user

---

## 📋 **Acceptance Criteria**

- [ ] Token saved to database on successful registration
- [ ] Token upserted (not duplicated) on app reopen
- [ ] Token removed from database on logout
- [ ] Device platform (ios/android) correctly recorded
- [ ] Multiple devices per user supported

---

## 🧩 **Implementation Details**

### Task 1: Token Storage Service

#### 1.1 Create pushTokenService.ts

```typescript
// src/services/pushTokenService.ts
import { supabase } from "../lib/supabase";
import { Device } from "@capacitor/device";
import { Capacitor } from "@capacitor/core";

class PushTokenService {
  /**
   * Save push token to database
   */
  async saveToken(token: string): Promise<boolean> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getSession();
      if (!user?.user?.id) {
        console.warn("[PushToken] No user logged in");
        return false;
      }

      const userId = user.user.id;
      const deviceInfo = await Device.getInfo();
      const deviceId = await Device.getId();

      const platform = Capacitor.getPlatform(); // 'ios' | 'android' | 'web'

      const { error } = await supabase.from("user_push_tokens").upsert(
        {
          user_id: userId,
          device_token: token,
          device_platform: platform,
          device_id: deviceId.identifier,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id,device_token",
        }
      );

      if (error) {
        console.error("[PushToken] Save failed:", error);
        return false;
      }

      console.log("✅ [PushToken] Token saved successfully");
      return true;
    } catch (error) {
      console.error("[PushToken] Error saving token:", error);
      return false;
    }
  }

  /**
   * Remove token on logout
   */
  async removeToken(): Promise<boolean> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getSession();
      if (!user?.user?.id) return false;

      const deviceId = await Device.getId();

      const { error } = await supabase
        .from("user_push_tokens")
        .delete()
        .eq("user_id", user.user.id)
        .eq("device_id", deviceId.identifier);

      if (error) {
        console.error("[PushToken] Remove failed:", error);
        return false;
      }

      console.log("✅ [PushToken] Token removed on logout");
      return true;
    } catch (error) {
      console.error("[PushToken] Error removing token:", error);
      return false;
    }
  }

  /**
   * Remove all tokens for current user (logout from all devices)
   */
  async removeAllTokens(): Promise<boolean> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getSession();
      if (!user?.user?.id) return false;

      const { error } = await supabase
        .from("user_push_tokens")
        .delete()
        .eq("user_id", user.user.id);

      if (error) {
        console.error("[PushToken] Remove all failed:", error);
        return false;
      }

      console.log("✅ [PushToken] All tokens removed");
      return true;
    } catch (error) {
      console.error("[PushToken] Error removing all tokens:", error);
      return false;
    }
  }

  /**
   * Get all tokens for a user (for debugging)
   */
  async getUserTokens(): Promise<any[]> {
    const {
      data: { user },
    } = await supabase.auth.getSession();
    if (!user?.user?.id) return [];

    const { data, error } = await supabase
      .from("user_push_tokens")
      .select("*")
      .eq("user_id", user.user.id);

    if (error) {
      console.error("[PushToken] Fetch failed:", error);
      return [];
    }

    return data || [];
  }
}

export const pushTokenService = new PushTokenService();
```

---

### Task 2: Integrate with Auth Flow

#### 2.1 Update usePushNotifications Hook

```typescript
// src/hooks/usePushNotifications.ts
import { useEffect, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { useAuth } from "./useAuth";
import {
  initializePushNotifications,
  setupNotificationListeners,
  cleanupPushNotifications,
} from "../services/pushNotifications";
import { pushTokenService } from "../services/pushTokenService";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";

export function usePushNotifications() {
  const { user, isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const isInitialized = useRef(false);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      console.log("[usePushNotifications] Skipping - not a native platform");
      return;
    }

    if (!isLoggedIn || !user) {
      console.log("[usePushNotifications] Skipping - user not logged in");
      return;
    }

    if (isInitialized.current) {
      console.log("[usePushNotifications] Already initialized");
      return;
    }

    async function setup() {
      try {
        // Initialize and get token
        const token = await initializePushNotifications();

        if (token) {
          // Save token to database
          await pushTokenService.saveToken(token);
        }

        // Set up notification listeners
        await setupNotificationListeners(
          // Notification received in foreground
          (notification) => {
            console.log("📬 [Push] Notification received:", notification);
            toast(notification.title || "New notification", {
              icon: "🔔",
              duration: 4000,
            });
          },
          // Notification tapped
          (action) => {
            console.log("👆 [Push] Notification tapped:", action);
            const data = action.notification.data;
            if (data?.conversationId) {
              navigate(`/messages/${data.conversationId}`);
            }
          }
        );

        isInitialized.current = true;
      } catch (error) {
        console.error("[usePushNotifications] Setup error:", error);
      }
    }

    setup();

    return () => {
      cleanupPushNotifications();
      isInitialized.current = false;
    };
  }, [isLoggedIn, user, navigate]);
}
```

---

### Task 3: Remove Token on Logout

#### 3.1 Update logout function

```typescript
// In your auth service or logout handler
import { pushTokenService } from "../services/pushTokenService";

async function logout() {
  // Remove push token before signing out
  await pushTokenService.removeToken();

  // Sign out from Supabase
  await supabase.auth.signOut();
}
```

---

## 🔗 **MCP Integration**

### Supabase MCP - Verify Tokens Saved

```sql
-- Check tokens for a specific user
SELECT id, device_platform, device_id, created_at, updated_at
FROM user_push_tokens
WHERE user_id = 'USER_ID'
ORDER BY created_at DESC;
```

### Supabase MCP - Test Token Cleanup

```sql
-- Verify no orphaned tokens
SELECT upt.*
FROM user_push_tokens upt
LEFT JOIN auth.users u ON upt.user_id = u.id
WHERE u.id IS NULL;
```

---

## 🧪 **Testing**

### Unit Test Cases

- [ ] Token saved on registration
- [ ] Token updated (not duplicated) on app reopen
- [ ] Token removed on logout
- [ ] Multiple devices tracked correctly

### Integration Test

```typescript
// tests/pushTokenService.test.ts
describe("PushTokenService", () => {
  it("should save token successfully", async () => {
    const result = await pushTokenService.saveToken("test-token-123");
    expect(result).toBe(true);
  });

  it("should remove token on logout", async () => {
    await pushTokenService.saveToken("test-token-123");
    const result = await pushTokenService.removeToken();
    expect(result).toBe(true);
  });
});
```

---

## ✅ **Definition of Done**

- [ ] Token saved to `user_push_tokens` on registration
- [ ] Token upserted correctly (no duplicates)
- [ ] Token removed on logout
- [ ] Device platform recorded accurately
- [ ] Multiple devices per user supported
- [ ] Database queries verified via Supabase MCP

---

**Next Story:** [STORY_8.6.3_Backend_Notification_Sender.md](./STORY_8.6.3_Backend_Notification_Sender.md)
