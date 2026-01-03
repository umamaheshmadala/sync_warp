-- Migration: Fix Notification Trigger to Log Regardless of Push Preference
-- Story: 8.6.x Fix Realtime Toasts
-- Description: Decouple notification logging from push preferences. Always log to DB so in-app toasts work.

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

  -- Get Supabase URL and service role key for Edge Function
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
      -- AND (cp.notification_preference IS NULL OR cp.notification_preference != 'none') -- Keep basic mute check?
      -- Remove rigorous checks here, let client handle mute for toasts if desired, 
      -- BUT we probably still want to respect 'mute conversation' at DB level to avoid spam?
      -- logic: If Muted -> No Toast, No Push. So skipping insert is OK for Muted.
      -- BUT the issue is "Push Disabled globally" -> No Toast.
      
      -- Let's keep the Muted check from the original query:
      AND NOT is_conversation_muted(cp.user_id, NEW.conversation_id)
  LOOP
      -- ALWAYS INSERT into log (for In-App Toasts) specifically for messages
      -- This ensures that even if user disabled "Push", they can get "In-App Toast" (if we want that separation)
      -- OR if the client wants to decide.
      -- Currently: if `should_send_notification` checks `push_enabled`, then `push_enabled=false` prevents Log Insert.
      
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

      -- ONLY Send Push if User Enabled It
      IF should_send_notification(participant.user_id, 'messages') THEN
        
        -- Log attempt (optional, or just rely on the main log)
        RAISE NOTICE 'Queued push notification for user %', participant.user_id;

        -- Call Edge Function via pg_net
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
