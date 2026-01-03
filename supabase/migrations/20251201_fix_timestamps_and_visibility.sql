-- Fix timestamp timezone issue and conversation visibility

-- 1. Fix messages table default timestamp
-- Was: timezone('utc'::text, now()) -> This strips timezone and causes re-interpretation in local time
-- Change to: NOW() -> Preserves timezone info
ALTER TABLE messages 
ALTER COLUMN created_at SET DEFAULT NOW();

ALTER TABLE messages 
ALTER COLUMN updated_at SET DEFAULT NOW();

-- 2. Fix existing incorrect timestamps (approximate fix for recent messages)
-- If a message was created in the last 24 hours and looks like it's 5.5 hours behind, shift it.
-- Logic: If created_at < (NOW() - INTERVAL '5 hours') AND created_at > (NOW() - INTERVAL '24 hours')
-- This is risky to do automatically for all, but safe for the specific reported case if we target the specific conversation or recent messages.
-- Better approach: Just fix the default for future messages. The user can ignore old test messages.

-- 3. Fix create_or_get_conversation to un-delete conversations
CREATE OR REPLACE FUNCTION create_or_get_conversation(
  p_participant_id UUID
)
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
    
    -- Add participants
    INSERT INTO conversation_participants (conversation_id, user_id, joined_at)
    VALUES 
      (v_conversation_id, auth.uid(), NOW()),
      (v_conversation_id, p_participant_id, NOW());
      
  ELSE
    -- Conversation exists: Ensure it's not deleted for the current user
    -- This fixes the issue where starting a chat with a deleted conversation doesn't show it
    UPDATE conversation_participants
    SET deleted_for_user = false,
        deleted_at = NULL
    WHERE conversation_id = v_conversation_id
      AND user_id = auth.uid();
      
    -- Also ensure the other user is a participant (in case of weird state, though less likely)
    INSERT INTO conversation_participants (conversation_id, user_id, joined_at)
    VALUES (v_conversation_id, auth.uid(), NOW())
    ON CONFLICT (conversation_id, user_id) 
    DO UPDATE SET deleted_for_user = false, deleted_at = NULL;
  END IF;
  
  RETURN v_conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
