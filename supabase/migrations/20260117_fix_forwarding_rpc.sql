-- Fix forwarding RPC to copy link_previews and allow content override
-- Story 10.1.8 AC-12 & AC-13

CREATE OR REPLACE FUNCTION forward_message_to_conversations(
  p_message_id UUID,
  p_conversation_ids UUID[],
  p_forward_content TEXT DEFAULT NULL
)
RETURNS TABLE(forwarded_message_id UUID, conversation_id UUID) AS $$
DECLARE
  v_user_id UUID;
  v_original_message RECORD;
  v_conversation_id UUID;
  v_new_message_id UUID;
  v_content TEXT;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get original message
  SELECT * INTO v_original_message
  FROM messages
  WHERE id = p_message_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Message not found';
  END IF;

  -- Determine content to use (override or original)
  v_content := COALESCE(p_forward_content, v_original_message.content);

  -- Forward to each conversation
  FOREACH v_conversation_id IN ARRAY p_conversation_ids
  LOOP
    -- Insert forwarded message
    INSERT INTO messages (
      conversation_id,
      sender_id,
      content,
      type,
      media_urls,
      link_previews, -- ✅ FIX: Copy link_previews
      is_forwarded,
      original_message_id
    )
    VALUES (
      v_conversation_id,
      v_user_id,
      v_content,
      v_original_message.type,
      v_original_message.media_urls,
      v_original_message.link_previews, -- ✅ FIX: Copy link_previews
      true,
      p_message_id
    )
    RETURNING id INTO v_new_message_id;

    -- Track forward
    INSERT INTO message_forwards (
      original_message_id,
      forwarded_message_id,
      forwarded_by,
      forwarded_to_conversation
    )
    VALUES (
      p_message_id,
      v_new_message_id,
      v_user_id,
      v_conversation_id
    );

    -- Increment forward count
    UPDATE messages
    SET forward_count = forward_count + 1
    WHERE id = p_message_id;

    -- Return result
    RETURN QUERY SELECT v_new_message_id, v_conversation_id;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
