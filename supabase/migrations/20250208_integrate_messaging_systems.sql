-- 🔗 STORY 8.1.8: System Integration Implementation
-- Integrate messaging with friendships, shares, notifications, and blocked users

-- ================================================
-- 1. FRIENDSHIPS INTEGRATION
-- ================================================

-- Function to check if user can message another user (friendship validation)
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

-- Update create_or_get_conversation to validate friendship
CREATE OR REPLACE FUNCTION create_or_get_conversation(p_participant_id UUID)
RETURNS UUID AS $$
DECLARE
  v_conversation_id UUID;
  v_participants UUID[];
BEGIN
  -- Check if blocked
  IF EXISTS (
    SELECT 1 FROM blocked_users
    WHERE (blocker_id = auth.uid() AND blocked_id = p_participant_id)
       OR (blocker_id = p_participant_id AND blocked_id = auth.uid())
  ) THEN
    RAISE EXCEPTION 'Cannot message user: user is blocked';
  END IF;
  
  -- Check friendship for direct messages
  IF NOT can_message_user(p_participant_id) THEN
    RAISE EXCEPTION 'Cannot message user: not friends';
  END IF;
  
  -- Construct participants array (sorted for consistency)
  v_participants := ARRAY[LEAST(auth.uid(), p_participant_id), GREATEST(auth.uid(), p_participant_id)];
  
  -- Check for existing conversation
  SELECT id INTO v_conversation_id
  FROM conversations
  WHERE type = 'direct'
    AND participants = v_participants;
  
  -- Create if doesn't exist
  IF v_conversation_id IS NULL THEN
    INSERT INTO conversations (type, participants)
    VALUES ('direct', v_participants)
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

-- Create trigger for friendship status changes
DROP TRIGGER IF EXISTS trigger_friendship_status_change ON friendships;
CREATE TRIGGER trigger_friendship_status_change
  AFTER UPDATE OF status ON friendships
  FOR EACH ROW
  EXECUTE FUNCTION handle_friendship_status_change();

-- ================================================
-- 2. SHARES INTEGRATION
-- ================================================

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
  v_recipients UUID[];
  v_share_id UUID;
BEGIN
  -- Get conversation participants
  SELECT participants INTO v_recipients
  FROM conversations
  WHERE id = p_conversation_id;
  
  IF v_recipients IS NULL THEN
    RAISE EXCEPTION 'Conversation not found';
  END IF;
  
  -- Verify sender is a participant
  IF NOT (auth.uid() = ANY(v_recipients)) THEN
    RAISE EXCEPTION 'Not a participant in this conversation';
  END IF;
  
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
  
  -- Create read receipts for all participants except sender
  INSERT INTO message_read_receipts (message_id, user_id)
  SELECT v_message_id, unnest(v_recipients)
  WHERE unnest != auth.uid();
  
  -- Track share in shares table if coupon shared
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
  
  -- Track share in shares table if deal shared
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

-- ================================================
-- 3. NOTIFICATIONS INTEGRATION
-- ================================================

-- Add messaging notification types to notification_type enum
DO $$
BEGIN
  -- Check if notification_type enum exists
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type') THEN
    -- Add new values if they don't exist
    BEGIN
      ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'message_received';
    EXCEPTION WHEN duplicate_object THEN
      NULL;
    END;
    
    BEGIN
      ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'message_reply';
    EXCEPTION WHEN duplicate_object THEN
      NULL;
    END;
    
    BEGIN
      ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'coupon_shared_message';
    EXCEPTION WHEN duplicate_object THEN
      NULL;
    END;
    
    BEGIN
      ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'deal_shared_message';
    EXCEPTION WHEN duplicate_object THEN
      NULL;
    END;
  ELSE
    RAISE NOTICE 'notification_type enum does not exist. Notification integration requires notifications table.';
  END IF;
END $$;

-- Trigger function to create notifications for new messages
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
      -- Check if notifications table exists
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
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
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for message notifications
DROP TRIGGER IF EXISTS trigger_notify_message_recipients ON messages;
CREATE TRIGGER trigger_notify_message_recipients
  AFTER INSERT ON messages
  FOR EACH ROW
  WHEN (NEW.is_deleted = false)
  EXECUTE FUNCTION notify_message_recipients();

-- ================================================
-- 4. BLOCKED USERS INTEGRATION
-- ================================================

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
  
  -- Other participant info (for direct messages)
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

-- ================================================
-- 5. FRIEND SERVICE INTEGRATION (OPTIONAL VIEW)
-- ================================================

-- Optional: Add messaging info to friend list view (if needed)
-- This view is for friend service to show messaging CTA and last message preview
CREATE OR REPLACE VIEW friend_list_with_messaging AS
SELECT 
  f.id AS friendship_id,
  f.user_id,
  f.friend_id,
  f.status,
  f.created_at AS friendship_created_at,
  
  -- Friend profile
  p.full_name,
  p.username,
  p.avatar_url,
  p.is_online,
  
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

-- ================================================
-- COMMENTS AND DOCUMENTATION
-- ================================================

COMMENT ON FUNCTION can_message_user IS 'STORY 8.1.8: Check if user can message another user (friendship validation)';
COMMENT ON FUNCTION handle_friendship_status_change IS 'STORY 8.1.8: Archive/restore conversations when friendship status changes';
COMMENT ON FUNCTION send_message IS 'STORY 8.1.8: Send message with shares tracking and blocked user validation (updated)';
COMMENT ON FUNCTION notify_message_recipients IS 'STORY 8.1.8: Create notifications for message recipients';
COMMENT ON VIEW conversation_list IS 'STORY 8.1.8: Conversation list view with blocked users filtered (updated)';
COMMENT ON VIEW friend_list_with_messaging IS 'STORY 8.1.8: Friend list with messaging info for friend service integration';
