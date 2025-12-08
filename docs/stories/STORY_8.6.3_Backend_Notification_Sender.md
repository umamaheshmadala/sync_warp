# 🚀 STORY 8.6.3: Backend Notification Sender

**Parent Epic:** [EPIC 8.6 - Push Notifications & Real-time Updates](../epics/EPIC_8.6_Push_Notifications.md)  
**Story Owner:** Backend Engineering  
**Estimated Effort:** 2 days → **0.5 days (Mostly Implemented)**  
**Priority:** P0 - Critical  
**Status:** 🟢 Implemented & Backend Verified - Waiting for Android Build  
**Dependencies:** Story 8.6.2 (Token Management)

> [!NOTE]
> **Existing implementation:**
>
> - `supabase/functions/send-push-notification/` - Edge function with FCM V1 API
>
> **Remaining work:**
>
> - Add database trigger to auto-send notification on new message insert
> - Integrate with messaging system

---

## 🎯 **Story Goal**

Create the backend infrastructure to send push notifications:

- Deploy Supabase Edge Function for sending notifications
- Integrate with FCM API for Android/iOS
- Create database trigger to auto-send on new message
- Handle notification payload construction

---

## 📋 **Acceptance Criteria**

- [ ] Edge function `send-message-notification` deployed
- [ ] FCM API integration working
- [ ] Database trigger fires on new message insert
- [ ] Notification sent to all conversation participants (except sender)
- [ ] Notification latency < 3 seconds from message send

---

## 🧩 **Implementation Details**

### Task 1: Create Edge Function

#### 1.1 Create send-message-notification function

```typescript
// supabase/functions/send-message-notification/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// FCM Server Key from Supabase secrets
const FCM_SERVER_KEY = Deno.env.get("FCM_SERVER_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface NotificationPayload {
  messageId: string;
  conversationId: string;
  senderId: string;
}

serve(async (req) => {
  try {
    const payload: NotificationPayload = await req.json();
    const { messageId, conversationId, senderId } = payload;

    console.log(`📬 Processing notification for message: ${messageId}`);

    // Initialize Supabase admin client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get message details with sender info
    const { data: message, error: messageError } = await supabase
      .from("messages")
      .select(
        `
        id,
        content,
        type,
        sender:profiles!messages_sender_id_fkey(full_name, email)
      `
      )
      .eq("id", messageId)
      .single();

    if (messageError || !message) {
      console.error("❌ Message not found:", messageError);
      return new Response("Message not found", { status: 404 });
    }

    // Get conversation participants (excluding sender)
    const { data: participants } = await supabase
      .from("conversation_participants")
      .select("user_id")
      .eq("conversation_id", conversationId)
      .neq("user_id", senderId);

    if (!participants?.length) {
      console.log("No recipients found");
      return new Response("No recipients", { status: 200 });
    }

    // Get push tokens for all recipients
    const userIds = participants.map((p) => p.user_id);
    const { data: tokens } = await supabase
      .from("user_push_tokens")
      .select("device_token, device_platform, user_id")
      .in("user_id", userIds);

    if (!tokens?.length) {
      console.log("No push tokens found for recipients");
      return new Response("No tokens", { status: 200 });
    }

    // Prepare notification content
    const senderName =
      message.sender?.full_name || message.sender?.email || "Someone";
    const messagePreview =
      message.type === "text"
        ? message.content?.substring(0, 100)
        : `Sent ${message.type === "image" ? "a photo" : "a message"}`;

    // Send via FCM
    const fcmResults = await Promise.allSettled(
      tokens.map(async (token) => {
        const response = await fetch("https://fcm.googleapis.com/fcm/send", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `key=${FCM_SERVER_KEY}`,
          },
          body: JSON.stringify({
            to: token.device_token,
            notification: {
              title: senderName,
              body: messagePreview,
              sound: "default",
              badge: 1,
            },
            data: {
              conversationId,
              messageId,
              type: "new_message",
              senderId,
            },
            priority: "high",
          }),
        });

        if (!response.ok) {
          const error = await response.text();
          console.error(`❌ FCM error for ${token.device_platform}:`, error);

          // Remove invalid tokens
          if (
            error.includes("NotRegistered") ||
            error.includes("InvalidRegistration")
          ) {
            await supabase
              .from("user_push_tokens")
              .delete()
              .eq("device_token", token.device_token);
            console.log("🗑️ Removed invalid token");
          }
        }

        return response.ok;
      })
    );

    const successCount = fcmResults.filter(
      (r) => r.status === "fulfilled" && r.value
    ).length;
    console.log(`✅ Sent ${successCount}/${tokens.length} notifications`);

    return new Response(JSON.stringify({ sent: successCount }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("❌ Edge function error:", error);
    return new Response("Internal error", { status: 500 });
  }
});
```

---

### Task 2: Add FCM Server Key to Secrets

```bash
# Set FCM Server Key in Supabase secrets
supabase secrets set FCM_SERVER_KEY=your-fcm-server-key

# Get FCM Server Key from:
# Firebase Console > Project Settings > Cloud Messaging > Server Key
```

---

### Task 3: Create Database Trigger

#### 3.1 Apply migration for trigger

```sql
-- supabase/migrations/YYYYMMDD_add_message_notification_trigger.sql

-- Enable pg_net extension for HTTP calls
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Function to send push notification via edge function
CREATE OR REPLACE FUNCTION notify_new_message()
RETURNS TRIGGER AS $$
BEGIN
  -- Only notify for non-system messages
  IF NEW.type != 'system' THEN
    -- Call edge function asynchronously
    PERFORM net.http_post(
      url := 'https://' || current_setting('app.supabase_project_ref') || '.supabase.co/functions/v1/send-message-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
      ),
      body := jsonb_build_object(
        'messageId', NEW.id,
        'conversationId', NEW.conversation_id,
        'senderId', NEW.sender_id
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on messages table
DROP TRIGGER IF EXISTS on_message_insert_notify ON messages;
CREATE TRIGGER on_message_insert_notify
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_message();
```

---

### Task 4: Deploy Edge Function

```bash
# Deploy via Supabase CLI
cd supabase
supabase functions deploy send-message-notification

# Or via Supabase MCP
warp mcp run supabase "deploy_edge_function send-message-notification"
```

---

## 🔗 **MCP Integration**

### Supabase MCP - Deploy Function

```bash
warp mcp run supabase "deploy_edge_function send-message-notification files=[{name:'index.ts',content:'...'}]"
```

### Supabase MCP - Test Trigger

```sql
-- Insert test message and check notification
INSERT INTO messages (conversation_id, sender_id, content, type)
VALUES ('conv-id', 'sender-id', 'Test notification', 'text');
```

### Supabase MCP - Monitor Logs

```bash
warp mcp run supabase "get_logs service=edge-function project_id=your-project"
```

---

## 🧪 **Testing**

### Manual Testing

- [ ] Send message from Device A
- [ ] Verify notification received on Device B within 3 seconds
- [ ] Verify notification shows correct sender name and preview
- [ ] Verify tapping notification opens correct conversation

### Edge Function Test

```bash
# Test edge function directly
curl -X POST https://your-project.supabase.co/functions/v1/send-message-notification \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"messageId":"msg-123","conversationId":"conv-456","senderId":"user-789"}'
```

---

## ✅ **Definition of Done**

- [ ] Edge function deployed and responding
- [ ] FCM API integration complete
- [ ] Database trigger created and active
- [ ] Notifications sent within 3 seconds
- [ ] Invalid tokens auto-removed
- [ ] Edge function logs show successful sends

---

**Next Story:** [STORY_8.6.4_Notification_Handling.md](./STORY_8.6.4_Notification_Handling.md)
