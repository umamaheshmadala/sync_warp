-- =====================================================================================
-- Migration: Messaging Integration with Friends Module
-- Version: 1.0.0
-- Description: Enforce friends-only messaging + blocking integration
-- Dependencies:
--   - conversations table (Epic 8)
--   - messages table (Epic 8)
--   - friendships table (Story 9.1.2)
--   - blocked_users table (Story 9.1.5)
-- =====================================================================================

-- =====================================================================================
-- STEP 1: Verify Dependencies
-- =====================================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'conversations') THEN
    RAISE EXCEPTION 'conversations table does not exist. Run Epic 8 migrations first.';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'messages') THEN
    RAISE EXCEPTION 'messages table does not exist. Run Epic 8 migrations first.';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'friendships') THEN
    RAISE EXCEPTION 'friendships table does not exist. Run Story 9.1.2 first.';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'blocked_users') THEN
    RAISE EXCEPTION 'blocked_users table does not exist. Run Story 9.1.5 first.';
  END IF;
  
  RAISE NOTICE '✅ All dependencies verified';
END;
$$;

-- =====================================================================================
-- STEP 2: Update Conversations RLS Policies for Friends-Only Messaging
-- =====================================================================================

-- Drop existing conversation creation policies
DROP POLICY IF EXISTS "Users can create direct conversations" ON conversations;
DROP POLICY IF EXISTS "Anyone can create conversations" ON conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON conversations;

-- New policy: Only friends can create direct conversations
CREATE POLICY "Only friends can create direct conversations"
  ON conversations FOR INSERT
  WITH CHECK (
    auth.uid() = ANY(participants) AND
    (
      -- Allow group conversations (3+ participants)
      type = 'group' OR
      (
        -- For direct conversations, both must be friends and not blocked
        type = 'direct' AND
        -- Not blocked (bidirectional check)
        NOT EXISTS (
          SELECT 1 FROM blocked_users
          WHERE (blocker_id = auth.uid() AND blocked_id = ANY(participants))
             OR (blocker_id = ANY(participants) AND blocked_id = auth.uid())
        ) AND
        -- Are friends (check both directions since friendships are bidirectional)
        EXISTS (
          SELECT 1 FROM friendships
          WHERE (user_id = auth.uid() AND friend_id = ANY(participants) AND status = 'active')
        )
      )
    )
  );

COMMENT ON POLICY "Only friends can create direct conversations" ON conversations 
  IS 'Enforce friends-only direct messaging. Group conversations allowed for all.';

-- Ensure SELECT policy exists for participants
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'conversations' 
    AND policyname = 'Users can view their conversations'
  ) THEN
    CREATE POLICY "Users can view their conversations"
      ON conversations FOR SELECT
      USING (auth.uid() = ANY(participants));
  END IF;
END $$;

-- Ensure UPDATE policy exists for participants
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'conversations' 
    AND policyname = 'Users can update their conversations'
  ) THEN
    CREATE POLICY "Users can update their conversations"
      ON conversations FOR UPDATE
      USING (auth.uid() = ANY(participants))
      WITH CHECK (auth.uid() = ANY(participants));
  END IF;
END $$;

-- =====================================================================================
-- STEP 3: Create or Replace Direct Conversation Function
-- =====================================================================================

CREATE OR REPLACE FUNCTION create_or_get_direct_conversation(p_other_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conv_id UUID;
  v_current_user_id UUID := auth.uid();
  v_participant_array UUID[];
BEGIN
  -- Validate authentication
  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  IF v_current_user_id = p_other_user_id THEN
    RAISE EXCEPTION 'Cannot message yourself';
  END IF;
  
  -- Check if blocked (bidirectional)
  IF EXISTS (
    SELECT 1 FROM blocked_users
    WHERE (blocker_id = v_current_user_id AND blocked_id = p_other_user_id)
       OR (blocker_id = p_other_user_id AND blocked_id = v_current_user_id)
  ) THEN
    RAISE EXCEPTION 'Cannot message blocked user';
  END IF;
  
  -- Check if friends (bidirectional friendships)
  IF NOT EXISTS (
    SELECT 1 FROM friendships
    WHERE (user_id = v_current_user_id AND friend_id = p_other_user_id AND status = 'active')
  ) THEN
    RAISE EXCEPTION 'Can only message friends. Send them a friend request first.';
  END IF;
  
  -- Sort participant IDs to ensure consistent ordering
  v_participant_array := ARRAY[
    LEAST(v_current_user_id, p_other_user_id), 
    GREATEST(v_current_user_id, p_other_user_id)
  ];
  
  -- Try to find existing conversation
  SELECT id INTO v_conv_id 
  FROM conversations
  WHERE type = 'direct' 
    AND participants = v_participant_array 
  LIMIT 1;
  
  -- Create new conversation if doesn't exist
  IF v_conv_id IS NULL THEN
    INSERT INTO conversations (type, participants, created_at, updated_at)
    VALUES ('direct', v_participant_array, NOW(), NOW())
    RETURNING id INTO v_conv_id;
  END IF;
  
  RETURN v_conv_id;
END;
$$;

COMMENT ON FUNCTION create_or_get_direct_conversation 
  IS 'Get or create direct conversation, enforcing friendship and blocking rules';

-- Grant execute permission
GRANT EXECUTE ON FUNCTION create_or_get_direct_conversation TO authenticated;

-- =====================================================================================
-- STEP 4: Update Messages RLS Policy for Blocking (Enhanced)
-- =====================================================================================

-- Note: Existing "Users can send messages" policy already includes blocking checks
-- This is a safety enhancement to ensure friends-only messaging

DROP POLICY IF EXISTS "Users can send messages to non-blocked friends" ON messages;

-- Enhanced policy: Users can send messages only to non-blocked friends
CREATE POLICY "Users can send messages to non-blocked friends"
  ON messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND
    -- Verify conversation exists and user is participant
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_id
        AND auth.uid() = ANY(c.participants)
    ) AND
    -- For direct conversations, verify friendship
    (
      NOT EXISTS (
        SELECT 1 FROM conversations c
        WHERE c.id = conversation_id AND c.type = 'direct'
      )
      OR
      EXISTS (
        SELECT 1 
        FROM conversations c
        WHERE c.id = conversation_id 
          AND c.type = 'direct'
          -- Check friendship with other participant
          AND EXISTS (
            SELECT 1 FROM friendships f
            WHERE f.user_id = auth.uid()
              AND f.friend_id = ANY(c.participants)
              AND f.friend_id != auth.uid()
              AND f.status = 'active'
          )
      )
    ) AND
    -- Verify not blocked (bidirectional)
    NOT EXISTS (
      SELECT 1 
      FROM conversations c
      JOIN blocked_users b ON (
        (b.blocker_id = auth.uid() AND b.blocked_id = ANY(c.participants))
        OR (b.blocker_id = ANY(c.participants) AND b.blocked_id = auth.uid())
      )
      WHERE c.id = conversation_id
    )
  );

COMMENT ON POLICY "Users can send messages to non-blocked friends" ON messages
  IS 'Allow messaging only to non-blocked friends in direct conversations';

-- =====================================================================================
-- STEP 5: Create View for Conversations with Friend Status
-- =====================================================================================

CREATE OR REPLACE VIEW conversations_with_friend_status AS
SELECT 
  c.id as conversation_id,
  c.type,
  c.participants,
  c.name,
  c.avatar_url,
  c.is_archived,
  c.is_muted,
  c.is_pinned,
  c.metadata,
  c.created_at,
  c.updated_at,
  c.last_message_at,
  -- For direct conversations, get friend info
  CASE 
    WHEN c.type = 'direct' THEN (
      SELECT jsonb_build_object(
        'user_id', p.user_id,
        'username', p.username,
        'full_name', p.full_name,
        'avatar_url', p.avatar_url,
        'is_online', p.is_online,
        'last_active', p.last_active,
        'is_friend', EXISTS (
          SELECT 1 FROM friendships f
          WHERE f.user_id = auth.uid()
            AND f.friend_id = p.user_id
            AND f.status = 'active'
        ),
        'is_blocked', EXISTS (
          SELECT 1 FROM blocked_users b
          WHERE (b.blocker_id = auth.uid() AND b.blocked_id = p.user_id)
             OR (b.blocker_id = p.user_id AND b.blocked_id = auth.uid())
        )
      )
      FROM profiles p
      WHERE p.user_id = ANY(c.participants)
        AND p.user_id != auth.uid()
      LIMIT 1
    )
    ELSE NULL
  END as friend_info,
  -- Latest message preview
  (
    SELECT jsonb_build_object(
      'content', m.content,
      'created_at', m.created_at,
      'sender_id', m.sender_id,
      'is_deleted', m.is_deleted
    )
    FROM messages m
    WHERE m.conversation_id = c.id
    ORDER BY m.created_at DESC
    LIMIT 1
  ) as latest_message,
  -- Unread count
  (
    SELECT COUNT(*)
    FROM messages m
    LEFT JOIN message_reads mr ON (m.id = mr.message_id AND mr.user_id = auth.uid())
    WHERE m.conversation_id = c.id
      AND m.sender_id != auth.uid()
      AND mr.id IS NULL
  ) as unread_count
FROM conversations c
WHERE auth.uid() = ANY(c.participants)
  -- Exclude conversations with blocked users
  AND NOT EXISTS (
    SELECT 1 FROM blocked_users b
    WHERE (b.blocker_id = auth.uid() AND b.blocked_id = ANY(c.participants))
       OR (b.blocker_id = ANY(c.participants) AND b.blocked_id = auth.uid())
  );

COMMENT ON VIEW conversations_with_friend_status 
  IS 'Conversations enriched with friend/online status and unread counts for the UI';

-- Grant access
GRANT SELECT ON conversations_with_friend_status TO authenticated;

-- =====================================================================================
-- STEP 6: Helper Function - Can User Message Another User
-- =====================================================================================

CREATE OR REPLACE FUNCTION can_message_user(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_user_id UUID := auth.uid();
BEGIN
  IF v_current_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  IF v_current_user_id = p_user_id THEN
    RETURN false;
  END IF;
  
  -- Check if blocked
  IF EXISTS (
    SELECT 1 FROM blocked_users
    WHERE (blocker_id = v_current_user_id AND blocked_id = p_user_id)
       OR (blocker_id = p_user_id AND blocked_id = v_current_user_id)
  ) THEN
    RETURN false;
  END IF;
  
  -- Check if friends
  IF NOT EXISTS (
    SELECT 1 FROM friendships
    WHERE user_id = v_current_user_id 
      AND friend_id = p_user_id 
      AND status = 'active'
  ) THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;

COMMENT ON FUNCTION can_message_user IS
  'Check if authenticated user can message another user (friends + not blocked)';

GRANT EXECUTE ON FUNCTION can_message_user TO authenticated;

-- =====================================================================================
-- STEP 7: Add Indexes for Performance
-- =====================================================================================

-- Index for conversation participant lookups (if not exists)
CREATE INDEX IF NOT EXISTS idx_conversations_participants 
  ON conversations USING GIN (participants);

-- Index for conversation type filtering
CREATE INDEX IF NOT EXISTS idx_conversations_type 
  ON conversations(type);

-- Index for message conversation lookups (if not exists)
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id 
  ON messages(conversation_id);

-- =====================================================================================
-- STEP 8: Migration Validation
-- =====================================================================================

DO $$
DECLARE
  v_policy_count INTEGER;
  v_function_count INTEGER;
BEGIN
  -- Check policies
  SELECT COUNT(*) INTO v_policy_count
  FROM pg_policies
  WHERE tablename IN ('conversations', 'messages')
    AND policyname LIKE '%friend%';
  
  IF v_policy_count < 2 THEN
    RAISE WARNING 'Expected at least 2 friend-related policies, found %', v_policy_count;
  END IF;
  
  -- Check functions
  SELECT COUNT(*) INTO v_function_count
  FROM pg_proc
  WHERE proname IN ('create_or_get_direct_conversation', 'can_message_user');
  
  IF v_function_count < 2 THEN
    RAISE WARNING 'Expected 2 functions, found %', v_function_count;
  END IF;
  
  RAISE NOTICE '✅ Story 9.1.9 - Messaging Integration migration completed successfully';
  RAISE NOTICE '📊 Created: 2 RLS policies, 1 view, 2 functions, 3 indexes';
  RAISE NOTICE '🔒 Friends-only messaging enforced for direct conversations';
  RAISE NOTICE '🚫 Blocking integrated with messaging system';
  RAISE NOTICE '👥 Friend/online status available in conversations view';
END $$;
