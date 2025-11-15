-- ============================================================================
-- COMPLETE FRIENDS + MESSAGING DATABASE MIGRATION
-- Date: 2025-01-15
-- Purpose: Create all required tables and functions for Friends + Messaging integration
-- ============================================================================

-- ============================================================================
-- 1. PROFILES TABLE (Extend existing with friend fields)
-- ============================================================================

-- Add friend-related fields if they don't exist
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create index for online status queries
CREATE INDEX IF NOT EXISTS idx_profiles_is_online ON public.profiles(is_online);
CREATE INDEX IF NOT EXISTS idx_profiles_last_active ON public.profiles(last_active);

-- ============================================================================
-- 2. FRIENDSHIPS TABLE
-- ============================================================================

-- Drop old version if exists
DROP TABLE IF EXISTS public.friendships CASCADE;

-- Create friendships table (user1_id, user2_id pattern for symmetric relationships)
CREATE TABLE public.friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user2_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT friendships_different_users CHECK (user1_id != user2_id),
  CONSTRAINT friendships_unique_pair UNIQUE (user1_id, user2_id)
);

-- Create indexes
CREATE INDEX idx_friendships_user1 ON public.friendships(user1_id);
CREATE INDEX idx_friendships_user2 ON public.friendships(user2_id);
CREATE INDEX idx_friendships_created_at ON public.friendships(created_at DESC);

-- RLS Policies for friendships
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

-- Users can view their own friendships
CREATE POLICY "Users can view their friendships"
  ON public.friendships
  FOR SELECT
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Users can delete their own friendships
CREATE POLICY "Users can delete their friendships"
  ON public.friendships
  FOR DELETE
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Users can insert friendships (handled by function, but allow direct insert)
CREATE POLICY "Users can create friendships"
  ON public.friendships
  FOR INSERT
  WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

-- ============================================================================
-- 3. FRIEND REQUESTS TABLE
-- ============================================================================

-- Drop old version if exists
DROP TABLE IF EXISTS public.friend_requests CASCADE;

CREATE TABLE public.friend_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT friend_requests_different_users CHECK (requester_id != receiver_id),
  CONSTRAINT friend_requests_unique_pair UNIQUE (requester_id, receiver_id)
);

-- Create indexes
CREATE INDEX idx_friend_requests_receiver ON public.friend_requests(receiver_id) WHERE status = 'pending';
CREATE INDEX idx_friend_requests_requester ON public.friend_requests(requester_id);
CREATE INDEX idx_friend_requests_status ON public.friend_requests(status);

-- RLS Policies
ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view friend requests involving them"
  ON public.friend_requests
  FOR SELECT
  USING (auth.uid() = requester_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can create friend requests"
  ON public.friend_requests
  FOR INSERT
  WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Users can update friend requests they received"
  ON public.friend_requests
  FOR UPDATE
  USING (auth.uid() = receiver_id);

-- ============================================================================
-- 4. FRIEND ACTIVITIES TABLE
-- ============================================================================

-- Drop old version if exists
DROP TABLE IF EXISTS public.friend_activities CASCADE;

CREATE TABLE public.friend_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL CHECK (type IN (
    'deal_save', 'deal_share', 'deal_purchase', 'deal_view', 
    'friend_add', 'profile_update'
  )),
  deal_id UUID, -- References deals table (if exists)
  deal_title VARCHAR(255),
  message TEXT,
  activity_data JSONB, -- Flexible data field for any activity type
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_friend_activities_user ON public.friend_activities(user_id);
CREATE INDEX idx_friend_activities_created_at ON public.friend_activities(created_at DESC);
CREATE INDEX idx_friend_activities_type ON public.friend_activities(type);

-- RLS Policies
ALTER TABLE public.friend_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view activities of their friends"
  ON public.friend_activities
  FOR SELECT
  USING (
    user_id IN (
      SELECT user2_id FROM public.friendships WHERE user1_id = auth.uid()
      UNION
      SELECT user1_id FROM public.friendships WHERE user2_id = auth.uid()
    )
    OR user_id = auth.uid()
  );

CREATE POLICY "Users can create their own activities"
  ON public.friend_activities
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 5. HELPER FUNCTIONS
-- ============================================================================

-- Function to accept friend request and create friendship
CREATE OR REPLACE FUNCTION accept_friend_request_safe(request_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  req RECORD;
  friendship_exists BOOLEAN;
BEGIN
  -- Get request details
  SELECT * INTO req 
  FROM friend_requests 
  WHERE id = request_id AND status = 'pending';
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Check if friendship already exists (either direction)
  SELECT EXISTS (
    SELECT 1 FROM friendships 
    WHERE (user1_id = req.requester_id AND user2_id = req.receiver_id)
       OR (user1_id = req.receiver_id AND user2_id = req.requester_id)
  ) INTO friendship_exists;
  
  IF friendship_exists THEN
    -- Just update request status
    UPDATE friend_requests 
    SET status = 'accepted', updated_at = NOW()
    WHERE id = request_id;
    RETURN TRUE;
  END IF;
  
  -- Create friendship (always use requester as user1 for consistency)
  INSERT INTO friendships (user1_id, user2_id)
  VALUES (req.requester_id, req.receiver_id)
  ON CONFLICT (user1_id, user2_id) DO NOTHING;
  
  -- Update request status
  UPDATE friend_requests 
  SET status = 'accepted', updated_at = NOW()
  WHERE id = request_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION accept_friend_request_safe TO authenticated;

-- ============================================================================
-- 6. CONVERSATIONS TABLE (for messaging)
-- ============================================================================

-- Conversations table already created in Epic 8.1, but verify structure
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  participant1_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  participant2_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT conversations_different_participants CHECK (participant1_id != participant2_id),
  CONSTRAINT conversations_unique_pair UNIQUE (participant1_id, participant2_id)
);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_conversations_participant1 ON public.conversations(participant1_id);
CREATE INDEX IF NOT EXISTS idx_conversations_participant2 ON public.conversations(participant2_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON public.conversations(last_message_at DESC);

-- RLS Policies for conversations (if not already exist)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'conversations' AND policyname = 'Users can view their conversations'
  ) THEN
    CREATE POLICY "Users can view their conversations"
      ON public.conversations
      FOR SELECT
      USING (auth.uid() = participant1_id OR auth.uid() = participant2_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'conversations' AND policyname = 'Users can create conversations'
  ) THEN
    CREATE POLICY "Users can create conversations"
      ON public.conversations
      FOR INSERT
      WITH CHECK (auth.uid() = created_by);
  END IF;
END $$;

-- Enable RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 7. CREATE OR GET CONVERSATION FUNCTION
-- ============================================================================

-- Function to create conversation or get existing one
CREATE OR REPLACE FUNCTION create_or_get_conversation(p_participant_id UUID)
RETURNS UUID AS $$
DECLARE
  v_conversation_id UUID;
  v_current_user_id UUID;
BEGIN
  v_current_user_id := auth.uid();
  
  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  IF v_current_user_id = p_participant_id THEN
    RAISE EXCEPTION 'Cannot create conversation with yourself';
  END IF;
  
  -- Check if conversation already exists (either direction)
  SELECT id INTO v_conversation_id
  FROM conversations
  WHERE (participant1_id = v_current_user_id AND participant2_id = p_participant_id)
     OR (participant1_id = p_participant_id AND participant2_id = v_current_user_id)
  LIMIT 1;
  
  -- If conversation doesn't exist, create it
  IF v_conversation_id IS NULL THEN
    INSERT INTO conversations (
      created_by,
      participant1_id,
      participant2_id,
      last_message_at
    ) VALUES (
      v_current_user_id,
      v_current_user_id,
      p_participant_id,
      NOW()
    )
    RETURNING id INTO v_conversation_id;
  END IF;
  
  RETURN v_conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION create_or_get_conversation TO authenticated;

-- ============================================================================
-- 8. NOTIFICATIONS TABLE (for friend requests, etc.)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT,
  data JSONB,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read) WHERE read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- RLS Policies
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'Users can view their notifications'
  ) THEN
    CREATE POLICY "Users can view their notifications"
      ON public.notifications
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'Users can update their notifications'
  ) THEN
    CREATE POLICY "Users can update their notifications"
      ON public.notifications
      FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================================================
-- 9. VERIFICATION QUERIES
-- ============================================================================

-- View to verify setup
CREATE OR REPLACE VIEW public.friend_system_status AS
SELECT 
  'friendships' AS table_name,
  COUNT(*) AS row_count,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'friendships') AS policy_count
FROM public.friendships
UNION ALL
SELECT 
  'friend_requests',
  COUNT(*),
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'friend_requests')
FROM public.friend_requests
UNION ALL
SELECT 
  'friend_activities',
  COUNT(*),
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'friend_activities')
FROM public.friend_activities
UNION ALL
SELECT 
  'conversations',
  COUNT(*),
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'conversations')
FROM public.conversations;

-- Grant view access
GRANT SELECT ON public.friend_system_status TO authenticated;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Summary comment
COMMENT ON TABLE public.friendships IS 'Symmetric friendship relationships using user1_id/user2_id pattern';
COMMENT ON TABLE public.friend_requests IS 'Friend request tracking with pending/accepted/rejected states';
COMMENT ON TABLE public.friend_activities IS 'Activity feed for friend actions';
COMMENT ON FUNCTION create_or_get_conversation IS 'Creates conversation or returns existing one between two users';
COMMENT ON FUNCTION accept_friend_request_safe IS 'Safely accepts friend request and creates friendship';
