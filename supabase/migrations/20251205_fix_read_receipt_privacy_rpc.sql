-- Migration: Update read receipt RPCs for privacy support
-- Story: 8.5.1 - Read Receipts

-- Update mark_message_as_read to check privacy settings
CREATE OR REPLACE FUNCTION public.mark_message_as_read(p_message_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_message messages%ROWTYPE;
  v_read_receipts_enabled boolean;
BEGIN
  SELECT * INTO v_message FROM messages WHERE id = p_message_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Message not found';
  END IF;
  
  -- Check if user is in conversation
  IF NOT EXISTS (SELECT 1 FROM conversations c WHERE c.id = v_message.conversation_id AND auth.uid() = ANY(c.participants)) THEN
    RAISE EXCEPTION 'User not in conversation';
  END IF;
  
  -- Don't mark own messages
  IF v_message.sender_id = auth.uid() THEN
    RETURN false;
  END IF;

  -- 1. ALWAYS insert/update read receipt (clears unread count for receiver)
  UPDATE message_read_receipts 
  SET read_at = now() 
  WHERE message_id = p_message_id 
    AND user_id = auth.uid() 
    AND read_at IS NULL;
    
  -- If no row updated (was already read), return false
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- 2. Check privacy setting for current user (reader)
  SELECT COALESCE((privacy_settings->>'read_receipts_enabled')::boolean, true)
  INTO v_read_receipts_enabled
  FROM profiles
  WHERE id = auth.uid();

  -- 3. CONDITIONALLY update message status (Blue ticks for sender)
  -- Only if reader has read receipts enabled
  IF v_read_receipts_enabled THEN
    UPDATE messages m 
    SET status = 'read', updated_at = now() 
    WHERE m.id = p_message_id 
      AND m.status != 'read' 
      AND NOT EXISTS (
        SELECT 1 FROM message_read_receipts mrr 
        WHERE mrr.message_id = m.id 
          AND mrr.read_at IS NULL
      );
  END IF;

  RETURN true;
END;
$function$;

-- Update mark_conversation_as_read to check privacy settings
CREATE OR REPLACE FUNCTION public.mark_conversation_as_read(p_conversation_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
  v_read_receipts_enabled boolean;
BEGIN
  -- 1. Insert receipts for any messages that don't have them yet
  --    (and mark them as read immediately) - Clears unread counts
  INSERT INTO message_read_receipts (message_id, user_id, read_at, delivered_at)
  SELECT 
    m.id, 
    v_user_id, 
    now(), 
    now() -- Assume delivered if we are reading it
  FROM messages m
  WHERE m.conversation_id = p_conversation_id
    AND m.sender_id != v_user_id
    AND m.is_deleted = false
  ON CONFLICT (message_id, user_id) 
  DO UPDATE SET 
    read_at = now(),
    delivered_at = COALESCE(message_read_receipts.delivered_at, now())
  WHERE message_read_receipts.read_at IS NULL;

  -- 2. Check privacy setting for current user (reader)
  SELECT COALESCE((privacy_settings->>'read_receipts_enabled')::boolean, true)
  INTO v_read_receipts_enabled
  FROM profiles
  WHERE id = v_user_id;

  -- 3. CONDITIONALLY update message statuses to 'read' (Blue ticks)
  -- Only if reader has read receipts enabled
  IF v_read_receipts_enabled THEN
    UPDATE messages m
    SET status = 'read', updated_at = now()
    WHERE m.conversation_id = p_conversation_id
      AND m.sender_id != v_user_id
      AND m.status != 'read'
      AND NOT EXISTS (
        SELECT 1 FROM message_read_receipts mrr 
        WHERE mrr.message_id = m.id 
          AND mrr.read_at IS NULL
      );
  END IF;
END;
$function$;
