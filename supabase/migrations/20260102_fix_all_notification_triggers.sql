-- Migration: Fix All Notification Triggers (Friends, Deals, Messages)
-- Date: 2026-01-02
-- Description: Standardize notification logic for Friend Requests, Friend Acceptance, and Deals.
--              Ensures 'notification_log' is used (for In-App) and preferences are respected.

-- ============================================================================
-- 1. HELPER: Get Preference for Specific Type (Ignoring Global Push)
-- ============================================================================

CREATE OR REPLACE FUNCTION is_notification_type_enabled(
  target_user_id UUID,
  notif_type TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  prefs JSONB;
BEGIN
  SELECT notification_preferences INTO prefs
  FROM profiles
  WHERE id = target_user_id;
  
  -- Default to true if preference is missing
  RETURN COALESCE((prefs->>notif_type)::boolean, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================================
-- 2. TRIGGER: FRIEND REQUESTS
-- ============================================================================

CREATE OR REPLACE FUNCTION notify_friend_request_push()
RETURNS TRIGGER AS $$
DECLARE
  sender_name TEXT;
  sender_avatar TEXT;
  edge_function_url TEXT;
  service_role_key TEXT;
  supabase_url TEXT;
BEGIN
  -- Get sender details
  SELECT full_name, avatar_url INTO sender_name, sender_avatar
  FROM profiles
  WHERE id = NEW.sender_id;

  sender_name := COALESCE(sender_name, 'Someone');

  -- 1. In-App Notification (Log)
  -- Check ONLY 'friend_requests' preference. Ignore global push.
  IF is_notification_type_enabled(NEW.receiver_id, 'friend_requests') THEN
      INSERT INTO notification_log (
        user_id,
        notification_type,
        title,
        body,
        data,
        sent_at,
        opened
      ) VALUES (
        NEW.receiver_id,
        'connection_request', -- Using 'connection_request' to map to 'friend_request' in UI
        'New Friend Request',
        sender_name || ' sent you a friend request',
        jsonb_build_object(
          'sender_id', NEW.sender_id,
          'sender_avatar', sender_avatar,
          'type', 'friend_request',
          'action_url', '/friends'
        ),
        NOW(),
        false
      );
  END IF;

  -- 2. Push Notification
  -- Check GLOBAL Push + 'friend_requests' preference
  IF should_send_notification(NEW.receiver_id, 'friend_requests') THEN
      
      -- Get Env Vars
      supabase_url := COALESCE(
        current_setting('app.settings.supabase_url', true),
        current_setting('supabase.url', true),
        'https://ysxmgbblljoyebvugrfo.supabase.co'
      );
      service_role_key := COALESCE(
        current_setting('app.settings.supabase_service_role_key', true),
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzeG1nYmJsbGpveWVidnVncmZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxMDU2MjksImV4cCI6MjA3MzY4MTYyOX0.m1zCtG-Rvrga_g-YX0QqMLVQ0uLxogUqGLqNVTrQBqI'
      );

      PERFORM net.http_post(
          url := supabase_url || '/functions/v1/send-push-notification',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || service_role_key
          ),
          body := jsonb_build_object(
            'userId', NEW.receiver_id,
            'title', 'New Friend Request',
            'body', sender_name || ' sent you a friend request',
            'data', jsonb_build_object(
              'type', 'friend_request',
              'action_url', '/friends'
            )
          )
      );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop old trigger if exists (check name)
DROP TRIGGER IF EXISTS trigger_notify_friend_request ON friend_requests;
-- Create Trigger
CREATE TRIGGER trigger_notify_friend_request
  AFTER INSERT ON friend_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_friend_request_push();


-- ============================================================================
-- 3. TRIGGER: FRIEND ACCEPTED
-- ============================================================================

CREATE OR REPLACE FUNCTION notify_friend_accepted_push()
RETURNS TRIGGER AS $$
DECLARE
  accepter_name TEXT;
  accepter_avatar TEXT;
  edge_function_url TEXT;
  service_role_key TEXT;
  supabase_url TEXT;
  original_sender_id UUID;
BEGIN
  -- Only run if status changed to 'active'
  IF NEW.status = 'active' AND (OLD.status IS NULL OR OLD.status != 'active') THEN
     
     -- Determine who accepted. In `friendships`, we have `user_id` and `friend_id`.
     -- The app inserts TWO rows for friendship. (A,B) and (B,A).
     -- We need to notify the person who REQUESTED the friendship.
     -- We can look up the original request.
     
     -- Try to find who sent the request between these two
     SELECT sender_id INTO original_sender_id
     FROM friend_requests
     WHERE (sender_id = NEW.user_id AND receiver_id = NEW.friend_id)
        OR (sender_id = NEW.friend_id AND receiver_id = NEW.user_id)
     LIMIT 1;

     -- If we can't find request, fallback or skip?
     -- Strategy: Identify the "Other" person in THIS row (NEW.friend_id) is the friend.
     -- The "User" in THIS row (NEW.user_id) is the one who *might* need notification.
     -- We only want to notify the Original Sender.
     
     IF original_sender_id = NEW.user_id THEN
        -- NEW.user_id sent the request. NEW.friend_id accepted it.
        -- So Notify NEW.user_id.
        
        -- Get Accepter Details (NEW.friend_id)
        SELECT full_name, avatar_url INTO accepter_name, accepter_avatar
        FROM profiles
        WHERE id = NEW.friend_id;
        
        accepter_name := COALESCE(accepter_name, 'Someone');

        -- 1. In-App Log ('friend_accepted' preference)
        IF is_notification_type_enabled(NEW.user_id, 'friend_accepted') THEN
            INSERT INTO notification_log (
              user_id,
              notification_type,
              title,
              body,
              data,
              sent_at,
              opened
            ) VALUES (
              NEW.user_id,
              'connection_accepted',
              'Friend Request Accepted',
              accepter_name || ' accepted your friend request',
              jsonb_build_object(
                'sender_id', NEW.friend_id,
                'sender_avatar', accepter_avatar,
                'type', 'friend_accepted',
                'action_url', '/friends'
              ),
              NOW(),
              false
            );
        END IF;

        -- 2. Push Notification ('friend_accepted' preference + global)
        IF should_send_notification(NEW.user_id, 'friend_accepted') THEN
            -- Get Env Vars (Re-select or copy)
            supabase_url := COALESCE(
              current_setting('app.settings.supabase_url', true),
              current_setting('supabase.url', true),
              'https://ysxmgbblljoyebvugrfo.supabase.co'
            );
            service_role_key := COALESCE(
              current_setting('app.settings.supabase_service_role_key', true),
              'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzeG1nYmJsbGpveWVidnVncmZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxMDU2MjksImV4cCI6MjA3MzY4MTYyOX0.m1zCtG-Rvrga_g-YX0QqMLVQ0uLxogUqGLqNVTrQBqI'
            );

            PERFORM net.http_post(
                url := supabase_url || '/functions/v1/send-push-notification',
                headers := jsonb_build_object(
                  'Content-Type', 'application/json',
                  'Authorization', 'Bearer ' || service_role_key
                ),
                body := jsonb_build_object(
                  'userId', NEW.user_id,
                  'title', 'Friend Request Accepted',
                  'body', accepter_name || ' accepted your friend request',
                  'data', jsonb_build_object(
                    'type', 'friend_accepted',
                    'action_url', '/friends'
                  )
                )
            );
        END IF;

     END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_friend_accepted ON friendships;
DROP TRIGGER IF EXISTS trigger_create_friend_acceptance_notification ON friendships; -- user's old trigger

CREATE TRIGGER trigger_notify_friend_accepted
  AFTER INSERT OR UPDATE ON friendships
  FOR EACH ROW
  EXECUTE FUNCTION notify_friend_accepted_push();


-- ============================================================================
-- 4. UPDATE: MESSAGE TRIGGER (Handle Deals)
-- ============================================================================

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
  pref_key TEXT; -- The preference key to check
BEGIN
  -- Skip notification for deleted or system messages
  IF NEW.is_deleted = true THEN
    RETURN NEW;
  END IF;

  -- Get sender's name
  SELECT COALESCE(full_name, email, 'Someone') INTO sender_name
  FROM profiles
  WHERE id = NEW.sender_id;

  -- Default pref key
  pref_key := 'messages';

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
      pref_key := 'deal_shared'; -- Use specfic pref
    WHEN 'deal' THEN
      message_preview := '💰 Shared a deal';
      pref_key := 'deal_shared'; -- Use specific pref
    ELSE
      message_preview := 'Sent a message';
  END CASE;

  -- Get Supabase URL and service role key
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
      AND NOT is_conversation_muted(cp.user_id, NEW.conversation_id)
  LOOP
      -- 1. ALWAYS INSERT into log (In-App) IF type-specific pref is ON
      IF is_notification_type_enabled(participant.user_id, pref_key) THEN
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
              'type', 'new_message', -- Client handles specific rendering via content? Or should we pass 'deal_shared'?
              -- keeping 'new_message' for consistency with client hook logic
              'subtype', NEW.type, -- Extra data
              'action_url', '/messages/' || NEW.conversation_id
            ),
            NOW()
          );
      END IF;

      -- 2. ONLY Send Push if User Enabled It (Global AND Type)
      IF should_send_notification(participant.user_id, pref_key) THEN
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
