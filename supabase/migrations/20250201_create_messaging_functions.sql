-- Migration: Create Messaging Functions
-- Epic: 8.1 Messaging Foundation
-- Date: 2025-02-01

-- 1. Send Message Function
CREATE OR REPLACE FUNCTION send_message(
  p_conversation_id UUID,
  p_content TEXT,
  p_type TEXT DEFAULT 'text',
  p_media_urls TEXT[] DEFAULT NULL,
  p_thumbnail_url TEXT DEFAULT NULL,
  p_link_preview JSONB DEFAULT NULL,
  p_shared_coupon_id UUID DEFAULT NULL,
  p_shared_deal_id UUID DEFAULT NULL,
  p_reply_to_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_message_id UUID;
  v_conversation conversations%ROWTYPE;
  v_participant UUID;
BEGIN
  -- Get conversation details
  SELECT * INTO v_conversation 
  FROM conversations 
  WHERE id = p_conversation_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Conversation not found';
  END IF;
  
  -- Verify sender is participant
  IF NOT (auth.uid() = ANY(v_conversation.participants)) THEN
    RAISE EXCEPTION 'User is not a conversation participant';
  END IF;
  
  -- Create message
  INSERT INTO messages (
    conversation_id,
    sender_id,
    content,
    type,
    media_urls,
    thumbnail_url,
    link_preview,
    shared_coupon_id,
    shared_deal_id,
    reply_to_id,
    status
  ) VALUES (
    p_conversation_id,
    auth.uid(),
    p_content,
    p_type,
    p_media_urls,
    p_thumbnail_url,
    p_link_preview,
    p_shared_coupon_id,
    p_shared_deal_id,
    p_reply_to_id,
    'sent'
  )
  RETURNING id INTO v_message_id;
  
  -- Create read receipt entries for all participants except sender
  FOREACH v_participant IN ARRAY v_conversation.participants LOOP
    IF v_participant != auth.uid() THEN
      INSERT INTO message_read_receipts (message_id, user_id, delivered_at)
      VALUES (v_message_id, v_participant, now())
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
  
  -- Update conversation last_message_at
  UPDATE conversations
  SET last_message_at = now(), updated_at = now()
  WHERE id = p_conversation_id;
  
  -- If sharing coupon/deal, record in shares table (integration!)
  -- Note: We check if the shares table exists to avoid errors if not yet created
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'shares') THEN
      IF p_shared_coupon_id IS NOT NULL THEN
        EXECUTE 'INSERT INTO shares (sharer_id, coupon_id, share_method, shared_at) VALUES ($1, $2, ''message'', now()) ON CONFLICT DO NOTHING'
        USING auth.uid(), p_shared_coupon_id;
      END IF;
  END IF;
  
  RETURN v_message_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Mark Message as Read Function
CREATE OR REPLACE FUNCTION mark_message_as_read(p_message_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_message messages%ROWTYPE;
BEGIN
  -- Get message details
  SELECT * INTO v_message FROM messages WHERE id = p_message_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Message not found';
  END IF;
  
  -- Verify user is in conversation
  IF NOT EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = v_message.conversation_id 
      AND auth.uid() = ANY(c.participants)
  ) THEN
    RAISE EXCEPTION 'User not in conversation';
  END IF;
  
  -- Don't mark own messages as read
  IF v_message.sender_id = auth.uid() THEN
    RETURN false;
  END IF;
  
  -- Update read receipt
  UPDATE message_read_receipts
  SET read_at = now()
  WHERE message_id = p_message_id 
    AND user_id = auth.uid() 
    AND read_at IS NULL;
  
  -- Update message status if all recipients have read
  -- (Simplified logic: if I read it, check if everyone else read it)
  UPDATE messages m
  SET status = 'read', updated_at = now()
  WHERE m.id = p_message_id
    AND m.status != 'read'
    AND NOT EXISTS (
      SELECT 1 FROM message_read_receipts mrr
      WHERE mrr.message_id = m.id AND mrr.read_at IS NULL
    );
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Get Unread Message Count Function
CREATE OR REPLACE FUNCTION get_unread_message_count()
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(DISTINCT m.id)
    FROM messages m
    JOIN conversations c ON c.id = m.conversation_id
    LEFT JOIN message_read_receipts mrr ON mrr.message_id = m.id AND mrr.user_id = auth.uid()
    WHERE auth.uid() = ANY(c.participants)
      AND m.sender_id != auth.uid()
      AND mrr.read_at IS NULL
      AND m.is_deleted = false
  )::INTEGER;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 4. Create or Get Conversation Function
CREATE OR REPLACE FUNCTION create_or_get_conversation(p_participant_id UUID)
RETURNS UUID AS $$
DECLARE
  v_conversation_id UUID;
  v_participants UUID[];
BEGIN
  -- Check if conversation already exists
  SELECT id INTO v_conversation_id
  FROM conversations
  WHERE type = 'direct'
    AND participants @> ARRAY[auth.uid(), p_participant_id]
    AND array_length(participants, 1) = 2
  LIMIT 1;
  
  IF FOUND THEN
    RETURN v_conversation_id;
  END IF;
  
  -- Verify users are friends (assuming friendships table exists)
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'friendships') THEN
      IF NOT EXISTS (
        SELECT 1 FROM friendships f
        WHERE (
          (f.user1_id = auth.uid() AND f.user2_id = p_participant_id) OR
          (f.user2_id = auth.uid() AND f.user1_id = p_participant_id)
        )
      ) THEN
        RAISE EXCEPTION 'Users must be friends to create conversation';
      END IF;
  END IF;
  
  -- Verify no blocking
  IF EXISTS (
    SELECT 1 FROM blocked_users b
    WHERE (
      (b.blocker_id = auth.uid() AND b.blocked_id = p_participant_id) OR
      (b.blocker_id = p_participant_id AND b.blocked_id = auth.uid())
    )
  ) THEN
    RAISE EXCEPTION 'Cannot create conversation with blocked user';
  END IF;
  
  -- Create conversation
  v_participants := ARRAY[auth.uid(), p_participant_id];
  
  INSERT INTO conversations (type, participants)
  VALUES ('direct', v_participants)
  RETURNING id INTO v_conversation_id;
  
  -- Create participant entries
  INSERT INTO conversation_participants (conversation_id, user_id)
  VALUES 
    (v_conversation_id, auth.uid()),
    (v_conversation_id, p_participant_id);
  
  RETURN v_conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Auto-Update Conversation Timestamp Trigger
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET 
    last_message_at = NEW.created_at,
    updated_at = now()
  WHERE id = NEW.conversation_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS messages_update_conversation_trigger ON messages;
CREATE TRIGGER messages_update_conversation_trigger
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_timestamp();

-- 6. Extend Notification Types
-- We use a DO block to safely add enum values
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type') THEN
      -- Create type if it doesn't exist (fallback)
      CREATE TYPE notification_type AS ENUM ('message_received', 'message_reply', 'coupon_shared_message', 'deal_shared_message');
  ELSE
      -- Add values if they don't exist
      ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'message_received';
      ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'message_reply';
      ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'coupon_shared_message';
      ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'deal_shared_message';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not update notification_type enum: %', SQLERRM;
END $$;
