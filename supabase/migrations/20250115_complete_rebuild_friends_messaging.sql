-- ============================================================================
-- COMPLETE REBUILD: FRIENDS + MESSAGING SYSTEM (Facebook-level)
-- Date: 2025-01-15
-- Purpose: Production-ready friends + messaging with proper architecture
-- ============================================================================

-- ============================================================================
-- CLEANUP: Drop existing broken tables
-- ============================================================================

DROP TABLE IF EXISTS public.friend_activities CASCADE;
DROP TABLE IF EXISTS public.friend_requests CASCADE;
DROP TABLE IF EXISTS public.friendships CASCADE;
DROP TABLE IF EXISTS public.message_read_receipts CASCADE;
DROP TABLE IF EXISTS public.conversation_participants CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.conversations CASCADE;
DROP TABLE IF EXISTS public.blocked_users CASCADE;
DROP TABLE IF EXISTS public.typing_indicators CASCADE;

-- ============================================================================
-- 1. PROFILES TABLE (Extend with social fields)
-- ============================================================================

-- Add social/online status fields to existing profiles table
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS friend_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS follower_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS following_count INTEGER DEFAULT 0;

-- Indexes for online status and activity queries
CREATE INDEX IF NOT EXISTS idx_profiles_is_online ON public.profiles(is_online);
CREATE INDEX IF NOT EXISTS idx_profiles_last_active ON public.profiles(last_active DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_friend_count ON public.profiles(friend_count DESC);

-- Update function to auto-set last_active
CREATE OR REPLACE FUNCTION update_last_active()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_active = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_last_active
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  WHEN (OLD.is_online IS DISTINCT FROM NEW.is_online)
  EXECUTE FUNCTION update_last_active();

-- ============================================================================
-- 2. FRIENDSHIPS TABLE (Bidirectional Graph)
-- ============================================================================

CREATE TABLE public.friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'unfriended')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  unfriended_at TIMESTAMP WITH TIME ZONE,
  
  -- Constraints
  CONSTRAINT friendships_different_users CHECK (user_id != friend_id),
  CONSTRAINT friendships_unique_pair UNIQUE (user_id, friend_id)
);

-- Indexes for fast friend lookups
CREATE INDEX idx_friendships_user_id ON public.friendships(user_id) WHERE status = 'active';
CREATE INDEX idx_friendships_friend_id ON public.friendships(friend_id) WHERE status = 'active';
CREATE INDEX idx_friendships_created_at ON public.friendships(created_at DESC);
CREATE INDEX idx_friendships_both_users ON public.friendships(user_id, friend_id);

-- Enable RLS
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their active friendships"
  ON public.friendships FOR SELECT
  USING (status = 'active' AND (auth.uid() = user_id OR auth.uid() = friend_id));

CREATE POLICY "Users can delete their friendships"
  ON public.friendships FOR DELETE
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- ============================================================================
-- 3. FRIEND REQUESTS TABLE
-- ============================================================================

CREATE TABLE public.friend_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled')),
  message TEXT, -- Optional message with request
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days'), -- Auto-expire after 30 days
  
  -- Constraints
  CONSTRAINT friend_requests_different_users CHECK (sender_id != receiver_id),
  CONSTRAINT friend_requests_unique_pending UNIQUE (sender_id, receiver_id, status) WHERE status = 'pending'
);

-- Indexes
CREATE INDEX idx_friend_requests_receiver_pending ON public.friend_requests(receiver_id) WHERE status = 'pending';
CREATE INDEX idx_friend_requests_sender ON public.friend_requests(sender_id);
CREATE INDEX idx_friend_requests_status ON public.friend_requests(status);
CREATE INDEX idx_friend_requests_expires_at ON public.friend_requests(expires_at) WHERE status = 'pending';

-- RLS
ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view requests involving them"
  ON public.friend_requests FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can create friend requests"
  ON public.friend_requests FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update requests they received"
  ON public.friend_requests FOR UPDATE
  USING (auth.uid() = receiver_id OR auth.uid() = sender_id);

-- ============================================================================
-- 4. FOLLOWING TABLE (One-way relationships - like Twitter/Instagram)
-- ============================================================================

CREATE TABLE public.following (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT following_different_users CHECK (follower_id != following_id),
  CONSTRAINT following_unique_pair UNIQUE (follower_id, following_id)
);

-- Indexes
CREATE INDEX idx_following_follower_id ON public.following(follower_id);
CREATE INDEX idx_following_following_id ON public.following(following_id);
CREATE INDEX idx_following_created_at ON public.following(created_at DESC);

-- RLS
ALTER TABLE public.following ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view following relationships"
  ON public.following FOR SELECT
  USING (true); -- Public data

CREATE POLICY "Users can follow others"
  ON public.following FOR INSERT
  WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow"
  ON public.following FOR DELETE
  USING (auth.uid() = follower_id);

-- ============================================================================
-- 5. BLOCKED USERS TABLE
-- ============================================================================

CREATE TABLE public.blocked_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT blocked_users_different_users CHECK (blocker_id != blocked_id),
  CONSTRAINT blocked_users_unique_pair UNIQUE (blocker_id, blocked_id)
);

-- Indexes
CREATE INDEX idx_blocked_users_blocker_id ON public.blocked_users(blocker_id);
CREATE INDEX idx_blocked_users_blocked_id ON public.blocked_users(blocked_id);

-- RLS
ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own blocks"
  ON public.blocked_users FOR SELECT
  USING (auth.uid() = blocker_id);

CREATE POLICY "Users can block others"
  ON public.blocked_users FOR INSERT
  WITH CHECK (auth.uid() = blocker_id);

CREATE POLICY "Users can unblock"
  ON public.blocked_users FOR DELETE
  USING (auth.uid() = blocker_id);

-- ============================================================================
-- 6. CONVERSATIONS TABLE (Uses participants ARRAY like Epic 8.1)
-- ============================================================================

CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL DEFAULT 'direct' CHECK (type IN ('direct', 'group')),
  participants UUID[] NOT NULL,
  name TEXT, -- For group chats
  avatar_url TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_archived BOOLEAN DEFAULT false,
  is_muted BOOLEAN DEFAULT false,
  is_pinned BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_participants CHECK (array_length(participants, 1) >= 2),
  CONSTRAINT valid_metadata CHECK (jsonb_typeof(metadata) = 'object')
);

-- Indexes (GIN for array searches)
CREATE INDEX idx_conversations_participants ON public.conversations USING gin(participants);
CREATE INDEX idx_conversations_last_message_at ON public.conversations(last_message_at DESC);
CREATE INDEX idx_conversations_type ON public.conversations(type);

-- RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view conversations they're part of"
  ON public.conversations FOR SELECT
  USING (auth.uid() = ANY(participants));

CREATE POLICY "Users can create conversations"
  ON public.conversations FOR INSERT
  WITH CHECK (auth.uid() = ANY(participants) AND auth.uid() = created_by);

CREATE POLICY "Users can update conversations they're part of"
  ON public.conversations FOR UPDATE
  USING (auth.uid() = ANY(participants));

-- ============================================================================
-- 7. MESSAGES TABLE
-- ============================================================================

CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT,
  type TEXT NOT NULL DEFAULT 'text' CHECK (type IN ('text', 'image', 'video', 'link', 'deal')),
  media_urls TEXT[],
  thumbnail_url TEXT,
  link_preview JSONB,
  shared_deal_id UUID, -- References your deals/offers table
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sending', 'sent', 'delivered', 'read', 'failed')),
  is_edited BOOLEAN DEFAULT false,
  edited_at TIMESTAMP WITH TIME ZONE,
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMP WITH TIME ZONE,
  reply_to_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_content CHECK (
    content IS NOT NULL OR 
    array_length(media_urls, 1) > 0 OR
    shared_deal_id IS NOT NULL
  )
);

-- Indexes
CREATE INDEX idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX idx_messages_created_at ON public.messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_status ON public.messages(status) WHERE status != 'read';

-- RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages in their conversations"
  ON public.messages FOR SELECT
  USING (
    conversation_id IN (
      SELECT id FROM conversations WHERE auth.uid() = ANY(participants)
    )
  );

CREATE POLICY "Users can send messages to their conversations"
  ON public.messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND
    conversation_id IN (
      SELECT id FROM conversations WHERE auth.uid() = ANY(participants)
    )
  );

-- ============================================================================
-- 8. TYPING INDICATORS TABLE
-- ============================================================================

CREATE TABLE public.typing_indicators (
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (conversation_id, user_id)
);

-- Auto-cleanup old typing indicators (> 10 seconds)
CREATE INDEX idx_typing_indicators_started_at ON public.typing_indicators(started_at);

-- RLS
ALTER TABLE public.typing_indicators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view typing in their conversations"
  ON public.typing_indicators FOR SELECT
  USING (
    conversation_id IN (
      SELECT id FROM conversations WHERE auth.uid() = ANY(participants)
    )
  );

CREATE POLICY "Users can indicate typing"
  ON public.typing_indicators FOR ALL
  USING (auth.uid() = user_id);

-- ============================================================================
-- 9. NOTIFICATIONS TABLE
-- ============================================================================

CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'friend_request', 
    'friend_accepted', 
    'message', 
    'mention',
    'deal_shared'
  )),
  title TEXT NOT NULL,
  message TEXT,
  data JSONB,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_unread ON public.notifications(user_id, read) WHERE read = FALSE;
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);

-- RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================================================
-- 10. HELPER FUNCTIONS
-- ============================================================================

-- Function: Accept friend request (Facebook-style)
CREATE OR REPLACE FUNCTION accept_friend_request(request_id UUID)
RETURNS JSONB AS $$
DECLARE
  req RECORD;
  result JSONB;
BEGIN
  -- Get request
  SELECT * INTO req FROM friend_requests WHERE id = request_id AND status = 'pending';
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Request not found or already processed');
  END IF;
  
  -- Check if already friends
  IF EXISTS (
    SELECT 1 FROM friendships 
    WHERE ((user_id = req.sender_id AND friend_id = req.receiver_id) 
        OR (user_id = req.receiver_id AND friend_id = req.sender_id))
      AND status = 'active'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already friends');
  END IF;
  
  -- Create bidirectional friendship
  INSERT INTO friendships (user_id, friend_id)
  VALUES 
    (req.sender_id, req.receiver_id),
    (req.receiver_id, req.sender_id)
  ON CONFLICT (user_id, friend_id) DO UPDATE SET status = 'active', unfriended_at = NULL;
  
  -- Update request status
  UPDATE friend_requests 
  SET status = 'accepted', updated_at = NOW()
  WHERE id = request_id;
  
  -- Update friend counts
  UPDATE profiles SET friend_count = friend_count + 1 WHERE id = req.sender_id;
  UPDATE profiles SET friend_count = friend_count + 1 WHERE id = req.receiver_id;
  
  -- Create notifications
  INSERT INTO notifications (user_id, type, title, message, data)
  VALUES (
    req.sender_id,
    'friend_accepted',
    'Friend request accepted',
    (SELECT full_name FROM profiles WHERE id = req.receiver_id) || ' accepted your friend request',
    jsonb_build_object('user_id', req.receiver_id)
  );
  
  RETURN jsonb_build_object('success', true, 'friendship_created', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION accept_friend_request TO authenticated;

-- Function: Unfriend (Facebook-style soft delete)
CREATE OR REPLACE FUNCTION unfriend(friend_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  current_user_id UUID := auth.uid();
BEGIN
  IF current_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  
  -- Mark friendships as unfriended (bidirectional)
  UPDATE friendships 
  SET status = 'unfriended', unfriended_at = NOW()
  WHERE ((user_id = current_user_id AND friend_id = friend_user_id)
      OR (user_id = friend_user_id AND friend_id = current_user_id))
    AND status = 'active';
  
  -- Update friend counts
  UPDATE profiles SET friend_count = friend_count - 1 WHERE id = current_user_id AND friend_count > 0;
  UPDATE profiles SET friend_count = friend_count - 1 WHERE id = friend_user_id AND friend_count > 0;
  
  -- Auto-unfollow (Facebook behavior)
  DELETE FROM following WHERE follower_id = current_user_id AND following_id = friend_user_id;
  DELETE FROM following WHERE follower_id = friend_user_id AND following_id = current_user_id;
  
  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION unfriend TO authenticated;

-- Function: Create or get 1:1 conversation
CREATE OR REPLACE FUNCTION create_or_get_direct_conversation(other_user_id UUID)
RETURNS UUID AS $$
DECLARE
  conv_id UUID;
  current_user_id UUID := auth.uid();
  participant_array UUID[];
BEGIN
  IF current_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF current_user_id = other_user_id THEN RAISE EXCEPTION 'Cannot create conversation with yourself'; END IF;
  
  -- Create sorted array for consistency
  participant_array := ARRAY[LEAST(current_user_id, other_user_id), GREATEST(current_user_id, other_user_id)];
  
  -- Try to find existing conversation
  SELECT id INTO conv_id
  FROM conversations
  WHERE type = 'direct' 
    AND participants = participant_array
  LIMIT 1;
  
  -- Create if doesn't exist
  IF conv_id IS NULL THEN
    INSERT INTO conversations (type, participants, created_by, last_message_at)
    VALUES ('direct', participant_array, current_user_id, NOW())
    RETURNING id INTO conv_id;
  END IF;
  
  RETURN conv_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION create_or_get_direct_conversation TO authenticated;

-- ============================================================================
-- 11. TRIGGERS
-- ============================================================================

-- Auto-cleanup old typing indicators
CREATE OR REPLACE FUNCTION cleanup_old_typing_indicators()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM typing_indicators WHERE started_at < NOW() - INTERVAL '10 seconds';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_cleanup_typing
  AFTER INSERT ON typing_indicators
  EXECUTE FUNCTION cleanup_old_typing_indicators();

-- Update conversation last_message_at on new message
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations 
  SET last_message_at = NEW.created_at, updated_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_conversation_last_message
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_last_message();

-- ============================================================================
-- 12. ENABLE REALTIME
-- ============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE friendships;
ALTER PUBLICATION supabase_realtime ADD TABLE friend_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE typing_indicators;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- ============================================================================
-- MIGRATION COMPLETE - Facebook-level Friends + Messaging System
-- ============================================================================

COMMENT ON TABLE friendships IS 'Bidirectional friend relationships (Facebook-style)';
COMMENT ON TABLE friend_requests IS 'Pending/accepted/rejected friend requests with auto-expiry';
COMMENT ON TABLE following IS 'One-way follow relationships (Instagram/Twitter-style)';
COMMENT ON TABLE blocked_users IS 'User blocking for privacy and safety';
COMMENT ON TABLE conversations IS 'Conversations with participants array (supports 1:1 and group)';
COMMENT ON TABLE messages IS 'Messages with rich content support';
COMMENT ON FUNCTION accept_friend_request IS 'Accepts friend request + creates bidirectional friendship + sends notification';
COMMENT ON FUNCTION unfriend IS 'Removes friendship + auto-unfollows (Facebook behavior)';
COMMENT ON FUNCTION create_or_get_direct_conversation IS 'Creates or returns existing 1:1 conversation';
