-- Migration: Add Message Push Notification Trigger
-- Story 8.6.3: Backend Notification Sender
-- Date: 2024-12-07
-- Description: Auto-send push notifications when new messages are sent

-- ============================================================================
-- 1. CREATE NOTIFICATION TRIGGER FOR NEW MESSAGES
-- ============================================================================

-- Function: Send push notification when new message is inserted
CREATE OR REPLACE FUNCTION notify_new_message_push()
RETURNS TRIGGER AS $$
DECLARE
  sender_name TEXT;
  message_preview TEXT;
  participant RECORD;
  notification_type TEXT;
  edge_function_url TEXT;
  supabase_url TEXT;
  service_role_key TEXT;
  should_notify BOOLEAN;
BEGIN
  -- Skip notification for deleted or system messages
  IF NEW.is_deleted = true THEN
    RETURN NEW;
  END IF;

  -- Get sender's name
  SELECT COALESCE(full_name, email, 'Someone') INTO sender_name
  FROM profiles
  WHERE id = NEW.sender_id;

  -- Create message preview based on type
  CASE NEW.type
    WHEN 'text' THEN
      message_preview := SUBSTRING(NEW.content, 1, 100);
    WHEN 'image' THEN
      message_preview := '📷 Sent a photo';
    WHEN 'video' THEN
      message_preview := '🎥 Sent a video';
    WHEN 'link' THEN
      message_preview := '🔗 Shared a link';
    WHEN 'coupon' THEN
      message_preview := '🎟️ Shared a coupon';
    WHEN 'deal' THEN
      message_preview := '💰 Shared a deal';
    ELSE
      message_preview := 'Sent a message';
  END CASE;

  -- Get Supabase URL and service role key from app settings
  -- Fallback to hardcoded values if settings are missing (e.g. during migration or different context)
  supabase_url := COALESCE(
    current_setting('app.settings.supabase_url', true),
    current_setting('supabase.url', true),
    'https://ysxmgbblljoyebvugrfo.supabase.co'
  );

  service_role_key := COALESCE(
    current_setting('app.settings.supabase_service_role_key', true),
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzeG1nYmJsbGpveWVidnVncmZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxMDU2MjksImV4cCI6MjA3MzY4MTYyOX0.m1zCtG-Rvrga_g-YX0QqMLVQ0uLxogUqGLqNVTrQBqI'
  );

  -- Loop through all participants except sender
  FOR participant IN
    SELECT cp.user_id
    FROM conversation_participants cp
    WHERE cp.conversation_id = NEW.conversation_id
      AND cp.user_id != NEW.sender_id
      AND cp.left_at IS NULL
      AND (cp.notification_preference IS NULL OR cp.notification_preference != 'none')
      -- Use the helper function to check the new muted_conversations table
      AND NOT is_conversation_muted(cp.user_id, NEW.conversation_id)
  LOOP
    -- Check if user has global notifications enabled
    IF should_send_notification(participant.user_id, 'messages') THEN
      -- Log the notification attempt
      INSERT INTO notification_log (
        user_id,
        notification_type,
        title,
        body,
        data,
        sent_at
      ) VALUES (
        participant.user_id,
        'new_message',
        sender_name,
        message_preview,
        jsonb_build_object(
          'conversation_id', NEW.conversation_id,
          'message_id', NEW.id,
          'sender_id', NEW.sender_id,
          'type', 'new_message',
          'action_url', '/messages/' || NEW.conversation_id
        ),
        NOW()
      );

      -- Note: Actual push notification is sent via Edge Function
      -- The frontend will call the edge function or use pg_net if available
      RAISE NOTICE 'Queued push notification for user % - message from %', 
        participant.user_id, sender_name;

      -- Call Edge Function via pg_net
      -- Uses the URL and Service Role Key resolved earlier
      -- Call Edge Function via pg_net
      -- Uses the URL and Service Role Key resolved earlier (with fallbacks)
      PERFORM net.http_post(
        url := supabase_url || '/functions/v1/send-push-notification',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || service_role_key
        ),
        body := jsonb_build_object(
          'userId', participant.user_id,
          'title', sender_name,
          'body', message_preview,
          'data', jsonb_build_object(
            'conversation_id', NEW.conversation_id,
            'message_id', NEW.id,
            'type', 'new_message',
            'action_url', '/messages/' || NEW.conversation_id
          )
        )
      );
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on messages table
DROP TRIGGER IF EXISTS trigger_notify_new_message_push ON messages;
CREATE TRIGGER trigger_notify_new_message_push
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_message_push();

COMMENT ON FUNCTION notify_new_message_push IS 'Sends push notification when a new message is received';

-- ============================================================================
-- 2. ADD MESSAGES PREFERENCE TO should_send_notification FUNCTION
-- ============================================================================

-- Update the should_send_notification function to include 'messages' type
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
  -- Default to true for message notifications
  type_enabled := COALESCE((prefs->>notif_type)::boolean, true);
  
  RETURN push_enabled AND type_enabled;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 3. ADD MESSAGES PREFERENCE TO DEFAULT NOTIFICATION_PREFERENCES
-- ============================================================================

-- Update default notification preferences to include messages
COMMENT ON COLUMN profiles.notification_preferences IS 'User notification preferences: push_enabled, email_enabled, messages, friend_requests, friend_accepted, deal_shared, birthday_reminders';

-- ============================================================================
-- 4. CREATE HELPER VIEW FOR UNREAD NOTIFICATION COUNT
-- ============================================================================

CREATE OR REPLACE VIEW unread_notifications AS
SELECT 
  user_id,
  COUNT(*) as unread_count,
  MAX(sent_at) as last_notification_at
FROM notification_log
WHERE opened = false
GROUP BY user_id;

GRANT SELECT ON unread_notifications TO authenticated;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE 'Migration completed: Message push notification trigger created';
  RAISE NOTICE 'Trigger notify_new_message_push is now active on messages table';
END
$$;
