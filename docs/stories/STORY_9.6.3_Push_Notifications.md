# Story 9.6.3: Push Notifications Setup (FCM/APNs)

**Epic:** [EPIC 9.6: Friend Activity Feed & Notifications](../epics/EPIC_9.6_Friend_Activity_Notifications.md)  
**Priority:** 🔴 Critical  
**Estimated Time:** 2 days  
**MCP Usage:** 🛢 Supabase MCP (Heavy)  
**Dependencies:** Story 9.6.1 (Database Schema)

---

## 📋 Story Description

Set up push notification infrastructure using Firebase Cloud Messaging (FCM) for Android and Apple Push Notification Service (APNs) for iOS. Create Supabase Edge Functions to send notifications and database triggers to automatically notify users of friend events.

---

## ✅ Acceptance Criteria

### Infrastructure
- [ ] FCM setup for Android (Firebase project configured)
- [ ] APNs setup for iOS (certificates configured)
- [ ] Device token registration on app launch
- [ ] Token refresh handling
- [ ] Token storage in database

### Edge Functions
- [ ] `send_push_notification` Edge Function deployed
- [ ] Support for FCM and APNs
- [ ] Batch notification support
- [ ] Error handling and logging

### Notification Triggers
- [ ] New friend request received
- [ ] Friend request accepted
- [ ] Friend shared a deal with you
- [ ] Friend's birthday (optional)

### Testing
- [ ] Test FCM on Android device/emulator
- [ ] Test APNs on iOS device/simulator
- [ ] Verify notifications appear correctly
- [ ] Test deep linking from notifications

---

## 🛢 Database Schema

### File: `supabase/migrations/20250124_push_notifications.sql`

```sql
-- Migration: 20250124_push_notifications.sql
-- Push notification infrastructure

-- Note: user_push_tokens table already exists from Epic 8.1
-- We'll add any missing columns and functions

-- Add notification_preferences column to profiles if not exists
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{
  "push_enabled": true,
  "email_enabled": false,
  "friend_requests": true,
  "friend_accepted": true,
  "deal_shared": true,
  "birthday_reminders": false
}'::jsonb;

-- Create notification_log table to track sent notifications
CREATE TABLE IF NOT EXISTS notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB DEFAULT '{}'::jsonb,
  platform TEXT CHECK (platform IN ('android', 'ios', 'web')),
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  delivered BOOLEAN DEFAULT false,
  opened BOOLEAN DEFAULT false,
  error TEXT
);

CREATE INDEX IF NOT EXISTS idx_notification_log_user_id 
ON notification_log(user_id, sent_at DESC);

-- Function: Check if user has notifications enabled for a type
CREATE OR REPLACE FUNCTION should_send_notification(
  target_user_id UUID,
  notif_type TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  prefs JSONB;
  push_enabled BOOLEAN;
  type_enabled BOOLEAN;
BEGIN
  SELECT notification_preferences INTO prefs
  FROM profiles
  WHERE id = target_user_id;
  
  -- Check if push is enabled globally
  push_enabled := COALESCE((prefs->>'push_enabled')::boolean, true);
  
  -- Check if this specific notification type is enabled
  type_enabled := COALESCE((prefs->>notif_type)::boolean, true);
  
  RETURN push_enabled AND type_enabled;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Send notification on friend request
CREATE OR REPLACE FUNCTION notify_friend_request_push()
RETURNS TRIGGER AS $$
DECLARE
  sender_name TEXT;
BEGIN
  IF NEW.status = 'pending' THEN
    -- Get sender's name
    SELECT full_name INTO sender_name
    FROM profiles
    WHERE id = NEW.sender_id;
    
    -- Check if receiver has notifications enabled
    IF should_send_notification(NEW.receiver_id, 'friend_requests') THEN
      -- Call Edge Function via pg_net
      PERFORM net.http_post(
        url := current_setting('app.settings.edge_function_url') || '/send_push_notification',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
        ),
        body := jsonb_build_object(
          'user_id', NEW.receiver_id,
          'notification_type', 'friend_request',
          'title', 'New Friend Request',
          'body', sender_name || ' sent you a friend request',
          'data', jsonb_build_object(
            'type', 'friend_request',
            'request_id', NEW.id,
            'sender_id', NEW.sender_id,
            'action_url', '/friends/requests'
          )
        )
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_friend_request_push ON friend_requests;
CREATE TRIGGER trigger_notify_friend_request_push
  AFTER INSERT ON friend_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_friend_request_push();

-- Trigger: Send notification when friend request is accepted
CREATE OR REPLACE FUNCTION notify_friend_accepted_push()
RETURNS TRIGGER AS $$
DECLARE
  accepter_name TEXT;
BEGIN
  IF NEW.status = 'active' AND (OLD.status IS NULL OR OLD.status != 'active') THEN
    -- Get accepter's name (the person who accepted)
    SELECT full_name INTO accepter_name
    FROM profiles
    WHERE id = NEW.friend_id;
    
    -- Notify the original sender
    IF should_send_notification(NEW.user_id, 'friend_accepted') THEN
      PERFORM net.http_post(
        url := current_setting('app.settings.edge_function_url') || '/send_push_notification',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
        ),
        body := jsonb_build_object(
          'user_id', NEW.user_id,
          'notification_type', 'friend_accepted',
          'title', 'Friend Request Accepted',
          'body', accepter_name || ' accepted your friend request',
          'data', jsonb_build_object(
            'type', 'friend_accepted',
            'friend_id', NEW.friend_id,
            'action_url', '/friends'
          )
        )
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_friend_accepted_push ON friendships;
CREATE TRIGGER trigger_notify_friend_accepted_push
  AFTER UPDATE ON friendships
  FOR EACH ROW
  EXECUTE FUNCTION notify_friend_accepted_push();
```

---

## 🚀 Supabase Edge Function

### File: `supabase/functions/send_push_notification/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Initialize Firebase Admin (for FCM)
import admin from 'npm:firebase-admin@11.5.0';

// Initialize Firebase Admin
const serviceAccount = JSON.parse(Deno.env.get('FIREBASE_SERVICE_ACCOUNT') || '{}');
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

interface NotificationRequest {
  user_id: string;
  notification_type: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

serve(async (req) => {
  try {
    const {
      user_id,
      notification_type,
      title,
      body,
      data = {},
    }: NotificationRequest = await req.json();

    // Get user's device tokens
    const { data: tokens, error: tokensError } = await supabase
      .from('user_push_tokens')
      .select('token, platform')
      .eq('user_id', user_id)
      .eq('is_active', true);

    if (tokensError) throw tokensError;
    if (!tokens || tokens.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No active tokens found for user' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Send notifications to all devices
    const results = await Promise.allSettled(
      tokens.map(async ({ token, platform }) => {
        try {
          if (platform === 'android' || platform === 'ios') {
            // Send via FCM (works for both Android and iOS)
            const message: admin.messaging.Message = {
              token,
              notification: {
                title,
                body,
              },
              data: {
                ...data,
                notification_type,
              },
              apns: platform === 'ios' ? {
                payload: {
                  aps: {
                    sound: 'default',
                    badge: 1,
                  },
                },
              } : undefined,
              android: platform === 'android' ? {
                priority: 'high',
                notification: {
                  sound: 'default',
                  channelId: 'friend_notifications',
                },
              } : undefined,
            };

            const response = await admin.messaging().send(message);
            
            // Log successful send
            await supabase.from('notification_log').insert({
              user_id,
              notification_type,
              title,
              body,
              data,
              platform,
              delivered: true,
            });

            return { success: true, messageId: response };
          }
        } catch (error) {
          // Log failed send
          await supabase.from('notification_log').insert({
            user_id,
            notification_type,
            title,
            body,
            data,
            platform,
            delivered: false,
            error: error.message,
          });

          // If token is invalid, mark it as inactive
          if (error.code === 'messaging/invalid-registration-token' ||
              error.code === 'messaging/registration-token-not-registered') {
            await supabase
              .from('user_push_tokens')
              .update({ is_active: false })
              .eq('token', token);
          }

          throw error;
        }
      })
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    return new Response(
      JSON.stringify({
        sent: successful,
        failed,
        total: tokens.length,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error sending push notification:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});
```

---

## 🔧 MCP Integration

### Deploy Edge Function via Supabase MCP

```typescript
// Use Supabase MCP to deploy the edge function
mcp4_deploy_edge_function({
  project_id: "ysxmgbblljoyebvugrfo",
  name: "send_push_notification",
  files: [
    {
      name: "index.ts",
      content: <edge_function_code>
    }
  ],
  entrypoint_path: "index.ts"
});
```

### Apply Migration

```typescript
// Apply the push notifications migration
mcp4_apply_migration({
  project_id: "ysxmgbblljoyebvugrfo",
  name: "push_notifications",
  query: <migration_sql>
});
```

---

## 📱 Frontend Integration

### Update Push Token Registration

File: `src/hooks/usePushNotifications.ts` (already exists, enhance it):

```typescript
// Add notification permission request
export function usePushNotifications(userId: string | null) {
  // ... existing code ...

  useEffect(() => {
    if (!userId || !Capacitor.isNativePlatform()) return;

    const requestPermission = async () => {
      const result = await PushNotifications.requestPermissions();
      if (result.receive === 'granted') {
        await PushNotifications.register();
      }
    };

    requestPermission();
  }, [userId]);

  // Handle notification taps
  useEffect(() => {
    const listener = PushNotifications.addListener(
      'pushNotificationActionPerformed',
      (notification) => {
        const data = notification.notification.data;
        
        // Navigate based on notification type
        if (data.action_url) {
          window.location.href = data.action_url;
        }
      }
    );

    return () => {
      listener.remove();
    };
  }, []);
}
```

---

## 🧪 Testing

### Manual Testing Checklist
- [ ] Register device token on app launch
- [ ] Send test notification via Supabase dashboard
- [ ] Verify notification appears on device
- [ ] Tap notification → verify deep linking works
- [ ] Test on Android device
- [ ] Test on iOS device
- [ ] Test token refresh
- [ ] Test with multiple devices for same user

### Test Notification via SQL

```sql
-- Manually trigger a test notification
SELECT net.http_post(
  url := '<your-edge-function-url>/send_push_notification',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer <service-role-key>'
  ),
  body := jsonb_build_object(
    'user_id', '<test-user-id>',
    'notification_type', 'test',
    'title', 'Test Notification',
    'body', 'This is a test notification',
    'data', jsonb_build_object('action_url', '/dashboard')
  )
);
```

---

## ✅ Definition of Done

- [ ] FCM and APNs configured
- [ ] Edge Function deployed and tested
- [ ] Database migration applied
- [ ] Triggers working for friend events
- [ ] Device token registration working
- [ ] Notifications delivered successfully
- [ ] Deep linking from notifications works
- [ ] Error handling and logging implemented
- [ ] Tested on both Android and iOS
- [ ] Documentation updated

---

**Next Story:** [STORY 9.6.4: In-App Notification Center](./STORY_9.6.4_Notification_Center.md)
