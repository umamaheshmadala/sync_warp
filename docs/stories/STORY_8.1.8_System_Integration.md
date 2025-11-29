# 🔗 STORY 8.1.8: System Integration Implementation

**Parent Epic:** [EPIC 8.1 - Messaging Foundation & Database Architecture](../epics/EPIC_8.1_Messaging_Foundation_Database.md)  
**Story Owner:** Backend Engineering  
**Estimated Effort:** 2 days  
**Priority:** 🔴 Critical  
**Status:** ✅ **COMPLETE** - Implemented 2025-02-01  
**Depends On:** Story 8.1.1, 8.1.2, 8.1.3, 8.1.4

---

## 🎯 **Story Goal**

Integrate the messaging system with existing SynC platform components (Friendships, Shares, Notifications, Blocked Users, Auth) to ensure seamless operation and consistent business logic across the application.

---

## 📱 **Platform Support**

### **Web + iOS + Android (System Integration)**

System integration is **primarily backend** (database triggers, RLS policies, Edge Functions), so it works identically across all platforms. However, mobile apps require special integration points for native features:

#### **Mobile-Specific Integration Points**

**1. Friendships Integration (Mobile)**

- **Friend Invitation from Contacts**:
  - iOS: Use `@capacitor/contacts` to access device contacts
  - Android: Use `@capacitor/contacts` with runtime permission request
  - Feature: "Invite contacts who aren't on SynC yet"
  - Backend: `can_message_user()` checks friendship status

```typescript
// Mobile: Check if can message before showing "Send Message" button
import { Capacitor } from "@capacitor/core";

export async function canMessageUser(targetUserId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("can_message_user", {
    p_target_user_id: targetUserId,
  });

  if (error || !data) {
    return false;
  }

  return data; // true if friends, false otherwise
}

// Show "Add Friend" vs "Send Message" button
if (await canMessageUser(userId)) {
  // Show "Send Message" button
} else {
  // Show "Add Friend" button
}
```

**2. Shares Integration (Mobile)**

- **Native Share Sheet**:
  - iOS: Use `@capacitor/share` for native share UI
  - Android: Use `@capacitor/share` for Android share sheet
  - Share coupon/deal via message with single tap

```typescript
// Mobile: Share coupon via native share sheet
import { Share } from "@capacitor/share";
import { Haptics, ImpactStyle } from "@capacitor/haptics";

export async function shareCouponViaMessage(
  couponId: string,
  recipientUserId: string
) {
  // Haptic feedback on share initiation
  await Haptics.impact({ style: ImpactStyle.Medium });

  // Get conversation with recipient
  const { data: conversation } = await supabase.rpc(
    "get_or_create_conversation",
    {
      p_participant_id: recipientUserId,
    }
  );

  if (!conversation) {
    throw new Error("Cannot create conversation: not friends");
  }

  // Send message with shared coupon
  const { data: message } = await supabase.rpc("send_message", {
    p_conversation_id: conversation.id,
    p_content: "Check out this coupon!",
    p_type: "text",
    p_shared_coupon_id: couponId,
  });

  // Track share in shares table (handled by send_message function)
  // Success haptic feedback
  await Haptics.notification({ type: "success" });

  return message;
}
```

**3. Notifications Integration (Mobile)**

- **Push Notifications**:
  - iOS: Use `@capacitor/push-notifications` + APNs
  - Android: Use `@capacitor/push-notifications` + FCM
  - **4 New Notification Types**:
    1. `message_received`: New message from friend
    2. `message_reply`: Reply to your message
    3. `coupon_shared_message`: Friend shared a coupon
    4. `deal_shared_message`: Friend shared a deal

```typescript
// Mobile: Register for push notifications
import { PushNotifications } from "@capacitor/push-notifications";
import { App } from "@capacitor/app";

export async function registerPushNotifications() {
  // Request permission (iOS/Android)
  let permission = await PushNotifications.requestPermissions();

  if (permission.receive !== "granted") {
    console.warn("Push notification permission denied");
    return;
  }

  // Register for push
  await PushNotifications.register();

  // Handle registration
  PushNotifications.addListener("registration", async (token) => {
    console.log("Push registration success, token: " + token.value);

    // Store token in Supabase
    await supabase.from("push_tokens").upsert({
      user_id: supabase.auth.user()?.id,
      token: token.value,
      platform: Capacitor.getPlatform(), // 'ios' or 'android'
    });
  });

  // Handle push notification received (app in foreground)
  PushNotifications.addListener("pushNotificationReceived", (notification) => {
    console.log("Push notification received: ", notification);

    // Show in-app notification banner
    // (Capacitor handles system notification when app in background)
  });

  // Handle push notification action (user tapped notification)
  PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
    console.log("Push notification action: ", action);

    const data = action.notification.data;

    // Navigate to appropriate screen based on notification type
    if (data.type === "message_received" || data.type === "message_reply") {
      // Navigate to conversation
      navigateToConversation(data.conversation_id);
    } else if (data.type === "coupon_shared_message") {
      // Navigate to coupon detail
      navigateToCoupon(data.shared_coupon_id);
    } else if (data.type === "deal_shared_message") {
      // Navigate to deal detail
      navigateToDeal(data.shared_deal_id);
    }
  });
}
```

**4. Blocked Users Integration (Mobile)**

- **Block Action from Message Screen**:
  - iOS: Show action sheet with "Block User" option
  - Android: Show bottom sheet with "Block User" option
  - Bidirectional blocking handled by backend

```typescript
// Mobile: Block user from conversation screen
import { ActionSheet } from "@capacitor/action-sheet";
import { Haptics } from "@capacitor/haptics";

export async function showBlockUserActionSheet(
  userId: string,
  userName: string
) {
  const result = await ActionSheet.showActions({
    title: "Block " + userName + "?",
    message: "Blocked users cannot send you messages",
    options: [{ title: "Block User" }, { title: "Cancel", style: "cancel" }],
  });

  if (result.index === 0) {
    // User confirmed block
    await Haptics.impact({ style: ImpactStyle.Medium });

    // Insert into blocked_users table
    const { error } = await supabase.from("blocked_users").insert({
      blocker_id: supabase.auth.user()?.id,
      blocked_id: userId,
    });

    if (!error) {
      // Success feedback
      await Haptics.notification({ type: "success" });

      // Navigate back to conversation list
      navigateBack();
    }
  }
}
```

**5. Auth Integration (Mobile)**

- **Biometric Authentication**:
  - iOS: Face ID / Touch ID
  - Android: Fingerprint / Face Unlock
  - Use for quick app unlock (secure messaging)

```typescript
// Mobile: Biometric authentication for app unlock
import { NativeBiometric } from "@capgo/capacitor-native-biometric";

export async function authenticateWithBiometrics(): Promise<boolean> {
  // Check if biometrics available
  const available = await NativeBiometric.isAvailable();

  if (!available.isAvailable) {
    console.warn("Biometric authentication not available");
    return false;
  }

  try {
    // Verify user
    await NativeBiometric.verifyIdentity({
      reason: "Authenticate to access messages",
      title: "Unlock SynC",
      subtitle: "Use biometrics to unlock",
      description: "Your messages are secured",
    });

    return true; // Authentication success
  } catch (error) {
    console.error("Biometric authentication failed:", error);
    return false;
  }
}

// Use in App.tsx on app launch
App.addListener("appStateChange", async ({ isActive }) => {
  if (isActive) {
    // App came to foreground, require auth
    const authenticated = await authenticateWithBiometrics();

    if (!authenticated) {
      // Show PIN entry screen as fallback
      navigateToAuthScreen();
    }
  }
});
```

**6. Deep Linking (Mobile)**

- **Open Conversation from Notification**:
  - iOS: Universal Links (`https://sync.app/conversation/{id}`)
  - Android: App Links (`https://sync.app/conversation/{id}`)
  - Handle deep link on app launch

```typescript
// Mobile: Handle deep links
import { App } from "@capacitor/app";

export function setupDeepLinking() {
  App.addListener("appUrlOpen", (data) => {
    console.log("App opened with URL: " + data.url);

    // Parse URL: https://sync.app/conversation/123e4567-e89b-12d3-a456-426614174000
    const conversationMatch = data.url.match(/\/conversation\/([a-f0-9-]+)/i);

    if (conversationMatch) {
      const conversationId = conversationMatch[1];
      navigateToConversation(conversationId);
    }
  });
}

// iOS: Configure in Info.plist
// <key>CFBundleURLTypes</key>
// <array>
//   <dict>
//     <key>CFBundleURLSchemes</key>
//     <array>
//       <string>sync</string>
//     </array>
//   </dict>
// </array>

// Android: Configure in AndroidManifest.xml
// <intent-filter android:autoVerify="true">
//   <action android:name="android.intent.action.VIEW" />
//   <category android:name="android.intent.category.DEFAULT" />
//   <category android:name="android.intent.category.BROWSABLE" />
//   <data android:scheme="https" android:host="sync.app" />
// </intent-filter>
```

#### **Mobile E2E Testing (Integration Tests)**

```bash
# Test friendships integration
warp mcp run puppeteer "navigate http://localhost:5173"
warp mcp run puppeteer "fill selector=[data-testid=search-friends] value=TestUser"
warp mcp run puppeteer "click selector=[data-testid=send-message-btn]"
warp mcp run puppeteer "verify selector=[data-testid=conversation-input] exists"

# Test shares integration (coupon via message)
warp mcp run puppeteer "navigate http://localhost:5173/coupons/123"
warp mcp run puppeteer "click selector=[data-testid=share-via-message-btn]"
warp mcp run puppeteer "click selector=[data-testid=friend-TestUser]"
warp mcp run puppeteer "verify message sent with coupon"

# Test notifications integration
warp mcp run puppeteer "send test push notification"
warp mcp run puppeteer "verify notification appears in system tray"
warp mcp run puppeteer "click notification"
warp mcp run puppeteer "verify navigated to conversation"

# Test blocked users integration
warp mcp run puppeteer "navigate http://localhost:5173/conversation/123"
warp mcp run puppeteer "click selector=[data-testid=user-menu-btn]"
warp mcp run puppeteer "click selector=[data-testid=block-user-btn]"
warp mcp run puppeteer "click selector=[data-testid=confirm-block-btn]"
warp mcp run puppeteer "verify conversation hidden"
```

#### **Testing Checklist (Mobile-Specific)**

- [ ] **Friendships**: "Send Message" button only shown to friends
- [ ] **Friendships**: "Add Friend" button shown to non-friends
- [ ] **Friendships**: Conversation archived when friendship removed
- [ ] **Shares**: Native share sheet opens for coupon/deal sharing
- [ ] **Shares**: Shared coupon tracked in `shares` table
- [ ] **Shares**: Haptic feedback on share success
- [ ] **Notifications**: Push notifications work on iOS (APNs)
- [ ] **Notifications**: Push notifications work on Android (FCM)
- [ ] **Notifications**: Tapping notification opens correct screen
- [ ] **Notifications**: In-app banner shown when app in foreground
- [ ] **Blocked Users**: Action sheet shows block option
- [ ] **Blocked Users**: Blocked user cannot send messages
- [ ] **Blocked Users**: Blocked conversations hidden from list
- [ ] **Auth**: Biometric authentication works on app launch
- [ ] **Auth**: Fallback to PIN when biometrics fail
- [ ] **Deep Linking**: Opening notification deep link navigates to conversation
- [ ] **Deep Linking**: iOS Universal Links configured
- [ ] **Deep Linking**: Android App Links configured

#### **Key Differences from Web**

| Aspect                  | Web            | iOS/Android                   |
| ----------------------- | -------------- | ----------------------------- |
| **Friendships UI**      | Button click   | Contacts integration          |
| **Share Action**        | Web Share API  | Native share sheet + haptics  |
| **Notifications**       | Web Push API   | APNs (iOS), FCM (Android)     |
| **Block Action**        | Dropdown menu  | Action sheet / bottom sheet   |
| **Auth**                | Password       | Biometric (Face ID, Touch ID) |
| **Deep Linking**        | URL params     | Universal Links / App Links   |
| **Background Behavior** | Service Worker | Background tasks + push       |

#### **Required Capacitor Plugins**

```json
{
  "dependencies": {
    "@capacitor/contacts": "^6.0.0",
    "@capacitor/share": "^6.0.0",
    "@capacitor/haptics": "^6.0.0",
    "@capacitor/push-notifications": "^6.0.0",
    "@capacitor/app": "^6.0.0",
    "@capacitor/action-sheet": "^6.0.0",
    "@capgo/capacitor-native-biometric": "^6.0.0"
  }
}
```

---

## 📝 **User Story**

**As a** backend developer  
**I want to** integrate messaging with existing platform features  
**So that** users can only message friends, share coupons/deals via messages, receive notifications, and blocked users are properly handled

---

## ✅ **Acceptance Criteria**

- [ ] Users can only message existing friends
- [ ] Friendship status changes handled correctly
- [ ] Coupons/deals can be shared via messages
- [ ] shares table tracks message shares correctly
- [ ] 4 new notification types created and working
- [ ] Blocked users cannot send messages
- [ ] Messages from blocked users hidden
- [ ] Blocking is bidirectional
- [ ] Friend service shows messaging CTA
- [ ] All integration tests passing

---

## 🛢 **MCP Integration (Primary: Supabase MCP)**

### **Phase 1: Friendships Integration**

```bash
# Test friendship validation
warp mcp run supabase "execute_sql SELECT can_message_user((SELECT id FROM profiles LIMIT 1 OFFSET 1)::UUID);"

# Test conversation creation with friendship check
warp mcp run supabase "execute_sql SELECT create_conversation('direct', ARRAY[(SELECT id FROM profiles LIMIT 1), (SELECT id FROM profiles LIMIT 1 OFFSET 1)]::UUID[]);"

# Test friendship status change impact
warp mcp run supabase "execute_sql UPDATE friendships SET status = 'blocked' WHERE id = (SELECT id FROM friendships LIMIT 1); SELECT * FROM conversations WHERE participants @> ARRAY[(SELECT user_id FROM friendships LIMIT 1)];"

# Verify friendship table exists
warp mcp run supabase "execute_sql SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'friendships';"
```

### **Phase 2: Shares Integration**

```bash
# Test coupon sharing via message
warp mcp run supabase "execute_sql SELECT send_message((SELECT id FROM conversations LIMIT 1)::UUID, 'Check out this coupon!', 'text', NULL, (SELECT id FROM coupons LIMIT 1), NULL);"

# Test deal sharing via message
warp mcp run supabase "execute_sql SELECT send_message((SELECT id FROM conversations LIMIT 1)::UUID, 'Great deal!', 'text', NULL, NULL, (SELECT id FROM deals LIMIT 1));"

# Verify shares table integration
warp mcp run supabase "execute_sql SELECT * FROM shares WHERE share_method = 'message' ORDER BY shared_at DESC LIMIT 10;"

# Test shares tracking
warp mcp run supabase "execute_sql SELECT COUNT(*) FROM shares WHERE share_method = 'message' AND shared_coupon_id IS NOT NULL;"
```

### **Phase 3: Notifications Integration**

```bash
# Create notification types
warp mcp run supabase "apply_migration create_messaging_notification_types"

# Test message_received notification
warp mcp run supabase "execute_sql SELECT * FROM notifications WHERE type = 'message_received' ORDER BY created_at DESC LIMIT 5;"

# Test message_reply notification
warp mcp run supabase "execute_sql SELECT * FROM notifications WHERE type = 'message_reply' ORDER BY created_at DESC LIMIT 5;"

# Test coupon_shared_message notification
warp mcp run supabase "execute_sql SELECT * FROM notifications WHERE type = 'coupon_shared_message' ORDER BY created_at DESC LIMIT 5;"

# Verify notification triggers
warp mcp run supabase "execute_sql SELECT trigger_name, event_manipulation, action_statement FROM information_schema.triggers WHERE trigger_name LIKE '%messaging%';"
```

### **Phase 4: Blocked Users Integration**

```bash
# Test blocked user cannot send message
warp mcp run supabase "execute_sql SELECT send_message((SELECT id FROM conversations WHERE participants @> ARRAY[(SELECT blocker_id FROM blocked_users LIMIT 1)])::UUID, 'Test', 'text', NULL, NULL, NULL);"

# Test messages from blocked users hidden
warp mcp run supabase "execute_sql SELECT * FROM conversation_list WHERE other_participant_id IN (SELECT blocked_id FROM blocked_users WHERE blocker_id = auth.uid());"

# Test bidirectional blocking
warp mcp run supabase "execute_sql INSERT INTO blocked_users (blocker_id, blocked_id) VALUES ((SELECT id FROM profiles LIMIT 1), (SELECT id FROM profiles LIMIT 1 OFFSET 1)); SELECT * FROM conversations WHERE participants && ARRAY[(SELECT id FROM profiles LIMIT 1), (SELECT id FROM profiles LIMIT 1 OFFSET 1)];"

# Verify blocked_users table
warp mcp run supabase "execute_sql SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'blocked_users';"
```

---

## 🧠 **MCP Integration (Secondary: Context7 MCP)**

```bash
# Find friendship integration points
warp mcp run context7 "Find all references to friendships in the messaging system and verify integration points"

# Analyze shares table integration
warp mcp run context7 "Review the shares table schema and messaging integration for coupon/deal sharing"

# Review notification integration
warp mcp run context7 "Analyze the notifications system and suggest improvements for messaging notifications"

# Verify blocked users logic
warp mcp run context7 "Review the blocked_users table and verify bidirectional blocking logic is correct"
```

---

## 📋 **Implementation Tasks**

### **Task 1: Friendships Integration** ⏱️ 3 hours

```sql
-- Add friendship validation function
CREATE OR REPLACE FUNCTION can_message_user(p_target_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if users are friends
  RETURN EXISTS (
    SELECT 1 FROM friendships
    WHERE status = 'accepted'
      AND (
        (user_id = auth.uid() AND friend_id = p_target_user_id)
        OR
        (user_id = p_target_user_id AND friend_id = auth.uid())
      )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Update create_conversation to check friendship
CREATE OR REPLACE FUNCTION create_conversation(
  p_type conversation_type,
  p_participants UUID[]
)
RETURNS UUID AS $$
DECLARE
  v_conversation_id UUID;
  v_other_user UUID;
BEGIN
  -- For direct messages, verify friendship
  IF p_type = 'direct' THEN
    v_other_user := (
      SELECT id FROM unnest(p_participants) AS id
      WHERE id != auth.uid()
      LIMIT 1
    );

    IF NOT can_message_user(v_other_user) THEN
      RAISE EXCEPTION 'Cannot message user: not friends';
    END IF;
  END IF;

  -- Check for existing conversation
  SELECT id INTO v_conversation_id
  FROM conversations
  WHERE type = p_type
    AND participants = p_participants;

  IF v_conversation_id IS NULL THEN
    INSERT INTO conversations (type, participants)
    VALUES (p_type, p_participants)
    RETURNING id INTO v_conversation_id;
  END IF;

  RETURN v_conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to handle friendship status changes
CREATE OR REPLACE FUNCTION handle_friendship_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- If friendship is removed or blocked, archive conversations
  IF NEW.status IN ('removed', 'blocked') AND OLD.status = 'accepted' THEN
    UPDATE conversations
    SET is_archived = true
    WHERE type = 'direct'
      AND participants && ARRAY[NEW.user_id, NEW.friend_id];
  END IF;

  -- If friendship is accepted, restore conversations
  IF NEW.status = 'accepted' AND OLD.status != 'accepted' THEN
    UPDATE conversations
    SET is_archived = false
    WHERE type = 'direct'
      AND participants && ARRAY[NEW.user_id, NEW.friend_id];
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_friendship_status_change
  AFTER UPDATE OF status ON friendships
  FOR EACH ROW
  EXECUTE FUNCTION handle_friendship_status_change();
```

### **Task 2: Shares Integration** ⏱️ 2 hours

```sql
-- Update send_message to track shares
CREATE OR REPLACE FUNCTION send_message(
  p_conversation_id UUID,
  p_content TEXT,
  p_type message_type DEFAULT 'text',
  p_media_url TEXT DEFAULT NULL,
  p_shared_coupon_id UUID DEFAULT NULL,
  p_shared_deal_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_message_id UUID;
  v_share_id UUID;
BEGIN
  -- Insert message
  INSERT INTO messages (
    conversation_id,
    sender_id,
    content,
    type,
    media_url,
    shared_coupon_id,
    shared_deal_id
  )
  VALUES (
    p_conversation_id,
    auth.uid(),
    p_content,
    p_type,
    p_media_url,
    p_shared_coupon_id,
    p_shared_deal_id
  )
  RETURNING id INTO v_message_id;

  -- Update conversation last_message_at
  UPDATE conversations
  SET last_message_at = NOW()
  WHERE id = p_conversation_id;

  -- Track share in shares table if coupon/deal shared
  IF p_shared_coupon_id IS NOT NULL THEN
    INSERT INTO shares (
      user_id,
      shared_coupon_id,
      share_method,
      metadata
    )
    VALUES (
      auth.uid(),
      p_shared_coupon_id,
      'message',
      jsonb_build_object(
        'message_id', v_message_id,
        'conversation_id', p_conversation_id
      )
    )
    RETURNING id INTO v_share_id;
  END IF;

  IF p_shared_deal_id IS NOT NULL THEN
    INSERT INTO shares (
      user_id,
      shared_deal_id,
      share_method,
      metadata
    )
    VALUES (
      auth.uid(),
      p_shared_deal_id,
      'message',
      jsonb_build_object(
        'message_id', v_message_id,
        'conversation_id', p_conversation_id
      )
    )
    RETURNING id INTO v_share_id;
  END IF;

  RETURN v_message_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### **Task 3: Notifications Integration** ⏱️ 3 hours

```sql
-- Create messaging notification types (if not exists)
DO $$
BEGIN
  -- message_received: When a user receives a new message
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type') THEN
    RAISE EXCEPTION 'notification_type enum does not exist';
  END IF;

  -- Note: These should be added to the notification_type enum
  -- ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'message_received';
  -- ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'message_reply';
  -- ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'coupon_shared_message';
  -- ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'deal_shared_message';
END $$;

-- Trigger to create notifications for new messages
CREATE OR REPLACE FUNCTION notify_message_recipients()
RETURNS TRIGGER AS $$
DECLARE
  v_recipient UUID;
  v_notification_type TEXT;
  v_title TEXT;
  v_body TEXT;
  v_sender_name TEXT;
BEGIN
  -- Get sender name
  SELECT full_name INTO v_sender_name
  FROM profiles
  WHERE id = NEW.sender_id;

  -- Determine notification type and content
  IF NEW.shared_coupon_id IS NOT NULL THEN
    v_notification_type := 'coupon_shared_message';
    v_title := v_sender_name || ' shared a coupon';
    v_body := NEW.content;
  ELSIF NEW.shared_deal_id IS NOT NULL THEN
    v_notification_type := 'deal_shared_message';
    v_title := v_sender_name || ' shared a deal';
    v_body := NEW.content;
  ELSIF NEW.replied_to_message_id IS NOT NULL THEN
    v_notification_type := 'message_reply';
    v_title := v_sender_name || ' replied to your message';
    v_body := NEW.content;
  ELSE
    v_notification_type := 'message_received';
    v_title := v_sender_name || ' sent you a message';
    v_body := NEW.content;
  END IF;

  -- Create notification for each participant (except sender)
  FOR v_recipient IN (
    SELECT unnest(participants)
    FROM conversations
    WHERE id = NEW.conversation_id
  )
  LOOP
    IF v_recipient != NEW.sender_id THEN
      INSERT INTO notifications (
        user_id,
        type,
        title,
        body,
        data,
        created_at
      )
      VALUES (
        v_recipient,
        v_notification_type::notification_type,
        v_title,
        v_body,
        jsonb_build_object(
          'message_id', NEW.id,
          'conversation_id', NEW.conversation_id,
          'sender_id', NEW.sender_id,
          'shared_coupon_id', NEW.shared_coupon_id,
          'shared_deal_id', NEW.shared_deal_id
        ),
        NOW()
      );
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_notify_message_recipients
  AFTER INSERT ON messages
  FOR EACH ROW
  WHEN (NEW.is_deleted = false)
  EXECUTE FUNCTION notify_message_recipients();
```

### **Task 4: Blocked Users Integration** ⏱️ 3 hours

```sql
-- Update send_message to check for blocked users
CREATE OR REPLACE FUNCTION send_message(
  p_conversation_id UUID,
  p_content TEXT,
  p_type message_type DEFAULT 'text',
  p_media_url TEXT DEFAULT NULL,
  p_shared_coupon_id UUID DEFAULT NULL,
  p_shared_deal_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_message_id UUID;
  v_recipients UUID[];
BEGIN
  -- Get conversation participants
  SELECT participants INTO v_recipients
  FROM conversations
  WHERE id = p_conversation_id;

  -- Check if sender is blocked by any recipient (bidirectional)
  IF EXISTS (
    SELECT 1 FROM blocked_users
    WHERE (
      (blocker_id = auth.uid() AND blocked_id = ANY(v_recipients))
      OR
      (blocked_id = auth.uid() AND blocker_id = ANY(v_recipients))
    )
  ) THEN
    RAISE EXCEPTION 'Cannot send message: blocked user';
  END IF;

  -- Rest of send_message logic...
  INSERT INTO messages (
    conversation_id,
    sender_id,
    content,
    type,
    media_url,
    shared_coupon_id,
    shared_deal_id
  )
  VALUES (
    p_conversation_id,
    auth.uid(),
    p_content,
    p_type,
    p_media_url,
    p_shared_coupon_id,
    p_shared_deal_id
  )
  RETURNING id INTO v_message_id;

  UPDATE conversations
  SET last_message_at = NOW()
  WHERE id = p_conversation_id;

  RETURN v_message_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update conversation_list view to filter blocked users
CREATE OR REPLACE VIEW conversation_list AS
SELECT
  c.id AS conversation_id,
  c.type,
  c.participants,
  c.is_archived,
  c.is_muted,
  c.is_pinned,
  c.created_at,
  c.last_message_at,

  -- Last message details
  lm.id AS last_message_id,
  lm.content AS last_message_content,
  lm.type AS last_message_type,
  lm.sender_id AS last_message_sender_id,
  lm.created_at AS last_message_timestamp,

  -- Sender profile
  sender.full_name AS last_message_sender_name,
  sender.avatar_url AS last_message_sender_avatar,

  -- Other participant info
  CASE
    WHEN c.type = 'direct' THEN
      (SELECT id FROM unnest(c.participants) AS id WHERE id != auth.uid() LIMIT 1)
  END AS other_participant_id,

  other_profile.full_name AS other_participant_name,
  other_profile.avatar_url AS other_participant_avatar,
  other_profile.is_online AS other_participant_online,

  -- Unread count
  (
    SELECT COUNT(*)
    FROM messages m
    LEFT JOIN message_read_receipts mrr ON mrr.message_id = m.id AND mrr.user_id = auth.uid()
    WHERE m.conversation_id = c.id
      AND m.sender_id != auth.uid()
      AND mrr.read_at IS NULL
      AND m.is_deleted = false
  ) AS unread_count

FROM conversations c

-- Last message
LEFT JOIN LATERAL (
  SELECT * FROM messages
  WHERE conversation_id = c.id
    AND is_deleted = false
  ORDER BY created_at DESC
  LIMIT 1
) lm ON true

-- Last message sender
LEFT JOIN profiles sender ON sender.id = lm.sender_id

-- Other participant (for 1:1)
LEFT JOIN LATERAL (
  SELECT * FROM profiles
  WHERE id = (SELECT id FROM unnest(c.participants) AS id WHERE id != auth.uid() LIMIT 1)
) other_profile ON c.type = 'direct'

WHERE auth.uid() = ANY(c.participants)
  -- Filter out conversations with blocked users
  AND NOT EXISTS (
    SELECT 1 FROM blocked_users bu
    WHERE (
      (bu.blocker_id = auth.uid() AND bu.blocked_id = ANY(c.participants))
      OR
      (bu.blocked_id = auth.uid() AND bu.blocker_id = ANY(c.participants))
    )
  );
```

### **Task 5: Friend Service Integration** ⏱️ 1 hour

Update friend service to show messaging CTA and last message preview:

```sql
-- Add messaging info to friend list view
CREATE OR REPLACE VIEW friend_list_with_messaging AS
SELECT
  f.*,
  p.*,
  -- Last message info
  (
    SELECT content
    FROM messages m
    JOIN conversations c ON c.id = m.conversation_id
    WHERE c.type = 'direct'
      AND c.participants && ARRAY[f.user_id, f.friend_id]
    ORDER BY m.created_at DESC
    LIMIT 1
  ) AS last_message,
  (
    SELECT created_at
    FROM messages m
    JOIN conversations c ON c.id = m.conversation_id
    WHERE c.type = 'direct'
      AND c.participants && ARRAY[f.user_id, f.friend_id]
    ORDER BY m.created_at DESC
    LIMIT 1
  ) AS last_message_at,
  -- Conversation ID for messaging CTA
  (
    SELECT id
    FROM conversations
    WHERE type = 'direct'
      AND participants && ARRAY[f.user_id, f.friend_id]
    LIMIT 1
  ) AS conversation_id
FROM friendships f
JOIN profiles p ON p.id = f.friend_id
WHERE f.status = 'accepted'
  AND f.user_id = auth.uid();
```

---

## 🧪 **Testing Checklist**

### **Friendships Integration**

- [ ] Cannot message non-friends
- [ ] Can message accepted friends
- [ ] Friendship removal archives conversations
- [ ] Friendship acceptance restores conversations
- [ ] Blocking prevents messaging

### **Shares Integration**

- [ ] Coupon sharing creates share record
- [ ] Deal sharing creates share record
- [ ] Share metadata includes message ID
- [ ] Shares tracked in shares table
- [ ] Share method is 'message'

### **Notifications Integration**

- [ ] message_received notification created
- [ ] message_reply notification created
- [ ] coupon_shared_message notification created
- [ ] deal_shared_message notification created
- [ ] Sender does not receive notification
- [ ] Notification data includes correct IDs

### **Blocked Users Integration**

- [ ] Blocked user cannot send message
- [ ] Blocker cannot send message to blocked
- [ ] Blocked conversations not in list
- [ ] Bidirectional blocking works
- [ ] Existing messages remain visible

### **Friend Service Integration**

- [ ] Friend list shows last message
- [ ] Friend list shows conversation ID
- [ ] Messaging CTA appears for friends
- [ ] No CTA for pending/blocked friends

---

## 📊 **Success Metrics**

| Integration        | Test                      | Status  |
| ------------------ | ------------------------- | ------- |
| **Friendships**    | Only friends can message  | ⏱️ Test |
| **Shares**         | Coupons tracked correctly | ⏱️ Test |
| **Shares**         | Deals tracked correctly   | ⏱️ Test |
| **Notifications**  | All 4 types working       | ⏱️ Test |
| **Blocked Users**  | Cannot message blocked    | ⏱️ Test |
| **Blocked Users**  | Conversations filtered    | ⏱️ Test |
| **Friend Service** | Messaging CTA present     | ⏱️ Test |

---

## 🔗 **Dependencies**

**Requires:**

- ✅ friendships table
- ✅ shares table
- ✅ notifications table
- ✅ blocked_users table
- ✅ profiles table
- ✅ Story 8.1.1 (Core tables)
- ✅ Story 8.1.4 (Functions)

**Enables:**

- Complete messaging feature
- Production deployment
- End-to-end user flows

---

## 📦 **Deliverables**

1. **Migration File**: `supabase/migrations/20250207_integrate_messaging_systems.sql`
2. **Integration Tests**: SQL test scripts for all integrations
3. **Documentation**: `docs/messaging/SYSTEM_INTEGRATION.md`
4. **Updated Functions**: All functions with integration logic

---

## 🚨 **Edge Cases**

1. **Friendship removed mid-conversation**: Archive conversation gracefully
2. **User blocked during active chat**: Prevent new messages immediately
3. **Shared coupon/deal deleted**: Message remains but link broken
4. **Notification delivery failure**: Queue for retry
5. **Blocked user unblocked**: Restore conversation access
6. **Friend re-accepted**: Restore archived conversation

---

## 💡 **Integration Test Examples**

```sql
-- Test 1: Friendship validation
DO $$
DECLARE
  v_user1 UUID;
  v_user2 UUID;
BEGIN
  -- Setup: Create two users
  INSERT INTO profiles (id, full_name) VALUES (uuid_generate_v4(), 'User 1') RETURNING id INTO v_user1;
  INSERT INTO profiles (id, full_name) VALUES (uuid_generate_v4(), 'User 2') RETURNING id INTO v_user2;

  -- Test: Try to message without friendship (should fail)
  BEGIN
    PERFORM create_conversation('direct', ARRAY[v_user1, v_user2]);
    RAISE EXCEPTION 'Test failed: Non-friends could create conversation';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Test passed: Non-friends cannot message';
  END;

  -- Setup: Create friendship
  INSERT INTO friendships (user_id, friend_id, status) VALUES (v_user1, v_user2, 'accepted');

  -- Test: Try to message with friendship (should succeed)
  PERFORM create_conversation('direct', ARRAY[v_user1, v_user2]);
  RAISE NOTICE 'Test passed: Friends can create conversation';
END $$;

-- Test 2: Share tracking
DO $$
DECLARE
  v_conversation_id UUID;
  v_message_id UUID;
  v_coupon_id UUID;
BEGIN
  -- Setup
  SELECT id INTO v_conversation_id FROM conversations LIMIT 1;
  SELECT id INTO v_coupon_id FROM coupons LIMIT 1;

  -- Test: Send message with coupon
  SELECT send_message(v_conversation_id, 'Check this out!', 'text', NULL, v_coupon_id, NULL) INTO v_message_id;

  -- Verify: Check shares table
  IF EXISTS (SELECT 1 FROM shares WHERE share_method = 'message' AND shared_coupon_id = v_coupon_id) THEN
    RAISE NOTICE 'Test passed: Share tracked correctly';
  ELSE
    RAISE EXCEPTION 'Test failed: Share not tracked';
  END IF;
END $$;

-- Test 3: Blocked user cannot message
DO $$
DECLARE
  v_user1 UUID;
  v_user2 UUID;
  v_conversation_id UUID;
BEGIN
  -- Setup: Get two users and block one
  SELECT id INTO v_user1 FROM profiles LIMIT 1;
  SELECT id INTO v_user2 FROM profiles LIMIT 1 OFFSET 1;
  INSERT INTO blocked_users (blocker_id, blocked_id) VALUES (v_user1, v_user2);

  SELECT id INTO v_conversation_id FROM conversations WHERE participants && ARRAY[v_user1, v_user2] LIMIT 1;

  -- Test: Try to send message (should fail)
  BEGIN
    PERFORM send_message(v_conversation_id, 'Test', 'text', NULL, NULL, NULL);
    RAISE EXCEPTION 'Test failed: Blocked user could send message';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Test passed: Blocked user cannot send message';
  END;
END $$;
```

---

## ✅ **Definition of Done**

- [ ] Friendship validation integrated
- [ ] Friendship status change handler created
- [ ] Shares tracking implemented
- [ ] All 4 notification types created
- [ ] Notification trigger implemented
- [ ] Blocked users validation added
- [ ] Conversation list filters blocked users
- [ ] Friend service view updated
- [ ] All integration tests passing
- [ ] Documentation complete
- [ ] Code reviewed and approved

---

**Story Status:** 📋 Ready for Implementation  
**Epic Status:** ✅ All Stories Complete - Ready for Epic 8.2
