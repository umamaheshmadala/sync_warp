-- ============================================================
-- STORY 8.7.1: Bidirectional Message Blocking
-- ============================================================
-- Prevents blocked users from sending messages to each other
-- in BOTH directions (industry standard: WhatsApp/Telegram)
-- ============================================================

-- ============================================================
-- STEP 1: Create helper function to get conversation recipient
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_conversation_recipient(
  p_conversation_id UUID,
  p_current_user_id UUID
) RETURNS UUID AS $$
DECLARE
  v_participant1_id UUID;
  v_participant2_id UUID;
BEGIN
  -- Get both participants from conversation
  SELECT participant1_id, participant2_id 
  INTO v_participant1_id, v_participant2_id
  FROM public.conversations
  WHERE id = p_conversation_id;
  
  -- Return the participant that is NOT the current user
  IF v_participant1_id = p_current_user_id THEN
    RETURN v_participant2_id;
  ELSIF v_participant2_id = p_current_user_id THEN
    RETURN v_participant1_id;
  ELSE
    -- Current user is not in this conversation
    RETURN NULL;
  END IF;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION public.get_conversation_recipient IS 
  'Returns the other participant in a conversation (not the current user)';

-- ============================================================
-- STEP 2: Create bidirectional blocking policy for messages
-- ============================================================

-- Drop existing message blocking policy if it exists
DROP POLICY IF EXISTS "prevent_messaging_blocked_users_bidirectional" ON public.messages;

-- Create comprehensive bidirectional blocking policy
CREATE POLICY "prevent_messaging_blocked_users_bidirectional"
  ON public.messages
  FOR INSERT
  WITH CHECK (
    -- Allow message if NO blocking exists in EITHER direction
    NOT EXISTS (
      SELECT 1 FROM public.blocked_users
      WHERE (
        -- Case 1: Current user blocked the recipient
        (blocker_id = auth.uid() AND blocked_id = public.get_conversation_recipient(NEW.conversation_id, auth.uid()))
        OR
        -- Case 2: Recipient blocked current user
        (blocker_id = public.get_conversation_recipient(NEW.conversation_id, auth.uid()) AND blocked_id = auth.uid())
      )
    )
  );

COMMENT ON POLICY "prevent_messaging_blocked_users_bidirectional" ON public.messages IS 
  'Prevents messaging between blocked users in BOTH directions (blocker and blocked cannot message each other)';

-- ============================================================
-- STEP 3: Validation
-- ============================================================

DO $$
BEGIN
  -- Verify helper function exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'get_conversation_recipient' 
    AND pronamespace = 'public'::regnamespace
  ) THEN
    RAISE EXCEPTION 'Helper function get_conversation_recipient was not created';
  END IF;
  
  RAISE NOTICE '✅ Bidirectional message blocking migration completed successfully';
END $$;
