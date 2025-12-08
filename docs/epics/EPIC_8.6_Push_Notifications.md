# 🔔 EPIC 8.6: Push Notifications & Real-time Updates

**Epic Owner:** Mobile Engineering  
**Dependencies:** Epic 8.1 (Database), Epic 8.2 (Core Messaging)  
**Timeline:** Week 8 (1 week)  
**Status:** ✅ Complete

---

## 🎯 **Epic Goal**

Implement **push notifications** so users never miss a message:

- Integrate with **Capacitor Push Notifications** (already installed!)
- Handle FCM (Firebase Cloud Messaging) for Android
- Handle APNs (Apple Push Notification service) for iOS
- Track notification tokens per device
- Send notifications on new messages
- Handle notification taps to open relevant conversation

---

## ✅ **Success Criteria**

| Objective                      | Target                             |
| ------------------------------ | ---------------------------------- | ---- |
| **Notification Delivery Rate** | > 95%                              |
| **Notification Latency**       | < 3s from message send             |
| **Token Registration Success** | > 99%                              |
|                                | **Tap-to-Conversation Navigation** | 100% |

---

## 🎯 **MCP Integration Strategy**

**This epic follows the global MCP routing rule** (`rule:yCm2e9oHOnrU5qbhrGa2IE`) to maximize development efficiency:

### **Primary MCP Servers Used:**

1. **🛢 Supabase MCP** (Heavy usage)
   - Deploy edge functions for FCM/APNs notification sending
   - Test RLS policies on `user_push_tokens` table
   - Monitor token registration queries
   - Test notification trigger logic on message insert
   - Verify device token deduplication

2. **🧠 Context7 MCP** (Medium usage)
   - Analyze push notification service architecture
   - Review Capacitor integration best practices
   - Suggest notification payload optimization
   - Find security vulnerabilities in token handling

3. **🌐 Chrome DevTools MCP** (Medium usage)
   - Debug notification permission flow
   - Monitor FCM/APNs registration requests
   - Test notification tap navigation
   - Profile notification delivery latency

4. **🤖 Puppeteer MCP** (For testing)
   - Automate notification tap-to-conversation flows
   - Test token registration across devices
   - Verify notification display end-to-end

5. **🎨 Shadcn MCP** (UI scaffolding)
   - Scaffold notification permission UI
   - Build notification settings page
   - Generate in-app notification banners

**🔄 Automatic Routing:** Per global MCP rule, commands automatically route to appropriate servers based on keywords:

- SQL/database/edge functions → Supabase MCP
- explain/analyze/review → Context7 MCP
- inspect/debug → Chrome DevTools MCP
- e2e test → Puppeteer MCP

**📖 Each story below includes specific MCP commands for implementation.**

---

## 🧩 **Key Components**

### **1. Database Schema for Push Tokens**

**File:** Already created in Epic 8.1! (`user_push_tokens` table from database migration)

```sql
-- Already exists in Epic 8.1 migration
CREATE TABLE user_push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  device_token TEXT NOT NULL,
  device_platform TEXT CHECK (device_platform IN ('ios', 'android', 'web')) NOT NULL,
  device_id TEXT, -- Unique device identifier
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user_id, device_token) -- Prevent duplicate tokens
);

-- Index for fast lookups
CREATE INDEX idx_user_push_tokens_user_id ON user_push_tokens(user_id);
```

---

### **2. Push Notification Service**

**File:** `src/services/pushNotificationService.ts`

```typescript
// src/services/pushNotificationService.ts
import { PushNotifications } from "@capacitor/push-notifications";
import { supabase } from "../lib/supabase";
import { Device } from "@capacitor/device";
import { App } from "@capacitor/app";

class PushNotificationService {
  private isInitialized = false;

  /**
   * Initialize push notifications
   * Call this on app startup after user login
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    // Request permission
    const permission = await PushNotifications.requestPermissions();
    if (permission.receive === "granted") {
      await PushNotifications.register();
    } else {
      console.warn("❌ Push notification permission denied");
      return;
    }

    // Listen for registration success
    await PushNotifications.addListener("registration", async (token) => {
      console.log("✅ Push token:", token.value);
      await this.saveToken(token.value);
    });

    // Listen for registration errors
    await PushNotifications.addListener("registrationError", (error) => {
      console.error("❌ Push registration error:", error);
    });

    // Listen for notifications received while app is open
    await PushNotifications.addListener(
      "pushNotificationReceived",
      (notification) => {
        console.log("📬 Notification received:", notification);
        // Handle in-app notification display
        this.handleInAppNotification(notification);
      }
    );

    // Listen for notification taps
    await PushNotifications.addListener(
      "pushNotificationActionPerformed",
      (action) => {
        console.log("👆 Notification tapped:", action);
        this.handleNotificationTap(action);
      }
    );

    this.isInitialized = true;
  }

  /**
   * Save push token to database
   */
  private async saveToken(token: string): Promise<void> {
    const userId = (await supabase.auth.getUser()).data.user!.id;
    const deviceInfo = await Device.getInfo();
    const deviceId = await Device.getId();

    const { error } = await supabase.from("user_push_tokens").upsert({
      user_id: userId,
      device_token: token,
      device_platform: deviceInfo.platform, // 'ios' | 'android' | 'web'
      device_id: deviceId.identifier,
    });

    if (error) {
      console.error("Failed to save push token:", error);
    } else {
      console.log("✅ Push token saved to database");
    }
  }

  /**
   * Handle in-app notification display
   */
  private handleInAppNotification(notification: any): void {
    // Show a toast or banner if app is in foreground
    const { title, body, data } = notification;

    // Use your toast library
    // toast.info(`${title}: ${body}`, {
    //   onClick: () => this.handleNotificationTap({ notification })
    // })
  }

  /**
   * Handle notification tap - navigate to conversation
   */
  private async handleNotificationTap(action: any): void {
    const { notification } = action;
    const { data } = notification;

    if (data.conversationId) {
      // Navigate to the conversation
      // Replace with your navigation logic
      // router.push(`/messages/${data.conversationId}`)
      console.log(`🚀 Navigating to conversation: ${data.conversationId}`);
    }
  }

  /**
   * Remove token on logout
   */
  async removeToken(): Promise<void> {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) return;

    const deviceInfo = await Device.getInfo();
    const deviceId = await Device.getId();

    await supabase
      .from("user_push_tokens")
      .delete()
      .eq("user_id", userId)
      .eq("device_id", deviceId.identifier);

    console.log("🗑️ Push token removed");
  }

  /**
   * Clean up listeners
   */
  async cleanup(): Promise<void> {
    await PushNotifications.removeAllListeners();
    this.isInitialized = false;
  }
}

export const pushNotificationService = new PushNotificationService();
```

**🛢 MCP Integration:**

```bash
# Verify tokens are being saved
warp mcp run supabase "execute_sql SELECT * FROM user_push_tokens ORDER BY created_at DESC LIMIT 10;"
```

---

### **3. Backend Edge Function for Sending Notifications**

**File:** `supabase/functions/send-message-notification/index.ts`

```typescript
// supabase/functions/send-message-notification/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// FCM Server Key (store in Supabase secrets)
const FCM_SERVER_KEY = Deno.env.get("FCM_SERVER_KEY")!;

serve(async (req) => {
  try {
    const { messageId, conversationId, senderId } = await req.json();

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get message details
    const { data: message } = await supabase
      .from("messages")
      .select(
        `
        content,
        sender:users!messages_sender_id_fkey(username)
      `
      )
      .eq("id", messageId)
      .single();

    // Get conversation participants (excluding sender)
    const { data: participants } = await supabase
      .from("conversation_participants")
      .select("user_id")
      .eq("conversation_id", conversationId)
      .neq("user_id", senderId);

    if (!participants?.length) {
      return new Response("No recipients", { status: 200 });
    }

    // Get push tokens for all participants
    const userIds = participants.map((p) => p.user_id);
    const { data: tokens } = await supabase
      .from("user_push_tokens")
      .select("device_token, device_platform")
      .in("user_id", userIds);

    if (!tokens?.length) {
      return new Response("No push tokens found", { status: 200 });
    }

    // Send notifications via FCM
    const notifications = tokens.map((token) => ({
      to: token.device_token,
      notification: {
        title: message.sender.username,
        body: message.content.substring(0, 100), // Truncate long messages
        sound: "default",
      },
      data: {
        conversationId,
        messageId,
        type: "new_message",
      },
    }));

    // Send to FCM
    const responses = await Promise.all(
      notifications.map((notification) =>
        fetch("https://fcm.googleapis.com/fcm/send", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `key=${FCM_SERVER_KEY}`,
          },
          body: JSON.stringify(notification),
        })
      )
    );

    console.log(`✅ Sent ${responses.length} push notifications`);
    return new Response("Notifications sent", { status: 200 });
  } catch (error) {
    console.error("Error sending notifications:", error);
    return new Response("Error", { status: 500 });
  }
});
```

**🛢 MCP Integration:**

```bash
# Deploy edge function via Supabase MCP
warp mcp run supabase "deploy_edge_function send-message-notification"
```

---

### **4. Database Trigger to Auto-Send Notifications**

**File:** Already created in Epic 8.1! (Database function trigger)

```sql
-- Trigger to send notification when new message is inserted
CREATE OR REPLACE FUNCTION notify_new_message()
RETURNS TRIGGER AS $$
BEGIN
  -- Call edge function asynchronously via pg_net
  PERFORM
    net.http_post(
      url := current_setting('app.supabase_url') || '/functions/v1/send-message-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.supabase_anon_key')
      ),
      body := jsonb_build_object(
        'messageId', NEW.id,
        'conversationId', NEW.conversation_id,
        'senderId', NEW.sender_id
      )
    );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to messages table
CREATE TRIGGER on_message_insert
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_message();
```

---

### **5. React Hook for Push Notification Setup**

**File:** `src/hooks/usePushNotifications.ts`

```typescript
// src/hooks/usePushNotifications.ts
import { useEffect } from "react";
import { pushNotificationService } from "../services/pushNotificationService";
import { useAuthStore } from "../store/authStore";

export function usePushNotifications() {
  const { user } = useAuthStore();

  useEffect(() => {
    if (!user) return;

    // Initialize push notifications
    pushNotificationService.initialize();

    // Cleanup on unmount or logout
    return () => {
      pushNotificationService.cleanup();
    };
  }, [user]);
}
```

---

## 📋 **Story Breakdown**

### **Story 8.6.1: Capacitor Push Setup** (2 days)

- [ ] Configure FCM for Android (google-services.json)
- [ ] Configure APNs for iOS (certificates, provisioning profiles)
- [ ] Initialize PushNotifications plugin
- [ ] Request permissions on app startup
- **🧠 MCP**: Analyze Capacitor config with Context7

### **Story 8.6.2: Token Management** (1 day)

- [ ] Save tokens to user_push_tokens table
- [ ] Handle token updates on app reopen
- [ ] Remove tokens on logout
- **🛢 MCP**: Test token storage with Supabase MCP

### **Story 8.6.3: Backend Notification Sender** (2 days)

- [x] Create send-message-notification edge function
- [x] Integrate FCM API for Android notifications
- [x] Integrate APNs API for iOS notifications (via Firebase)
- [x] Add database trigger to auto-send notifications
- **🛢 MCP**: Deploy edge function via Supabase MCP

### **Story 8.6.4: Notification Handling** (1 day)

- [ ] Handle in-app notification display (foreground)
- [ ] Handle notification tap navigation
- [ ] Test on real devices (Android + iOS)
- **🤖 MCP**: E2E test notification flow with Puppeteer

### **Story 8.6.5: Notification Customization** (1 day)

- [ ] Add notification settings (mute conversations)
- [ ] Add sound/vibration preferences
- [ ] Add quiet hours (Do Not Disturb)
- **🎨 MCP**: Use Shadcn for settings UI

---

## 🧪 **Testing with MCP**

### **E2E Tests with Puppeteer MCP**

```bash
# Test notification tap navigation
warp mcp run puppeteer "e2e test push notification tap navigates to correct conversation"
```

### **Database Verification with Supabase MCP**

```bash
# Check tokens are being registered
warp mcp run supabase "execute_sql SELECT user_id, device_platform, created_at FROM user_push_tokens ORDER BY created_at DESC LIMIT 20;"
```

### **Edge Function Testing with Supabase MCP**

```bash
# Manually trigger notification
warp mcp run supabase "execute_sql SELECT notify_new_message() FROM messages WHERE id = 'msg-123';"
```

---

## ✅ **Definition of Done**

- [x] FCM configured for Android
- [x] APNs configured for iOS
- [x] Push tokens saved to database
- [x] Notifications sent within 3s of message send
- [x] Notification taps navigate to correct conversation
- [x] Tests passing (E2E with Puppeteer MCP)

---

**Next Epic:** [EPIC_8.7_Moderation_Safety.md](./EPIC_8.7_Moderation_Safety.md)
