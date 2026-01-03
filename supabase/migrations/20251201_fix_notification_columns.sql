-- Fix notify_message_recipients to use correct column names for notifications table

CREATE OR REPLACE FUNCTION notify_message_recipients()
RETURNS TRIGGER AS $$
DECLARE
  v_recipient UUID;
  v_notification_type TEXT;
  v_title TEXT;
  v_message TEXT;
  v_sender_name TEXT;
  v_is_muted BOOLEAN;
BEGIN
  -- Get sender name
  SELECT full_name INTO v_sender_name
  FROM profiles
  WHERE id = NEW.sender_id;
  
  -- Determine notification type and content
  IF NEW.shared_coupon_id IS NOT NULL THEN
    v_notification_type := 'coupon_shared_message';
    v_title := v_sender_name || ' shared a coupon';
    v_message := NEW.content;
  ELSIF NEW.shared_deal_id IS NOT NULL THEN
    v_notification_type := 'deal_shared_message';
    v_title := v_sender_name || ' shared a deal';
    v_message := NEW.content;
  ELSE
    v_notification_type := 'message_received';
    v_title := v_sender_name || ' sent you a message';
    v_message := NEW.content;
  END IF;
  
  -- Create notification for each participant (except sender)
  FOR v_recipient IN (
    SELECT unnest(participants)
    FROM conversations
    WHERE id = NEW.conversation_id
  )
  LOOP
    IF v_recipient != NEW.sender_id THEN
      -- Check if conversation is muted for this recipient
      SELECT EXISTS(
        SELECT 1 FROM conversation_mutes cm
        WHERE cm.conversation_id = NEW.conversation_id
          AND cm.user_id = v_recipient
          AND (cm.muted_until IS NULL OR cm.muted_until > NOW())
      ) INTO v_is_muted;
      
      -- Only create notification if conversation is NOT muted
      IF NOT v_is_muted THEN
        -- Insert notification with correct column names
        INSERT INTO notifications (
          user_id,
          notification_type,
          title,
          message,
          data,
          sender_id,
          created_at
        )
        VALUES (
          v_recipient,
          v_notification_type::notification_type,
          v_title,
          v_message,
          jsonb_build_object(
            'message_id', NEW.id,
            'conversation_id', NEW.conversation_id,
            'sender_id', NEW.sender_id,
            'shared_coupon_id', NEW.shared_coupon_id,
            'shared_deal_id', NEW.shared_deal_id
          ),
          NEW.sender_id,
          NOW()
        );
      END IF;
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
DROP TRIGGER IF EXISTS trigger_notify_message_recipients ON messages;
CREATE TRIGGER trigger_notify_message_recipients
  AFTER INSERT ON messages
  FOR EACH ROW
  WHEN (NEW.is_deleted = false)
  EXECUTE FUNCTION notify_message_recipients();

COMMENT ON FUNCTION notify_message_recipients IS 'STORY 8.10.4: Create notifications for message recipients (respects mute status)';
