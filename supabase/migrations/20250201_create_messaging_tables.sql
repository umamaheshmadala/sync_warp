-- Migration: Create Messaging Tables
-- Epic: 8.1 Messaging Foundation
-- Date: 2025-02-01

-- 1. Conversations Table
CREATE TABLE IF NOT EXISTS public.conversations (
  -- Identity
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Conversation Type
  type TEXT NOT NULL DEFAULT 'direct' CHECK (type IN ('direct', 'group')),
  
  -- Participants (array of user IDs)
  participants UUID[] NOT NULL,
  
  -- Metadata
  name TEXT, -- For future group chats
  avatar_url TEXT, -- For future group chats
  is_archived BOOLEAN DEFAULT false,
  is_muted BOOLEAN DEFAULT false,
  is_pinned BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  last_message_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  -- Constraints
  CONSTRAINT valid_participants CHECK (array_length(participants, 1) >= 2),
  CONSTRAINT valid_metadata CHECK (jsonb_typeof(metadata) = 'object')
);

-- Indexes for conversations
CREATE INDEX IF NOT EXISTS idx_conversations_participants ON conversations USING gin(participants);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at ON conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_type ON conversations(type);

-- Enable Realtime for conversations
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;

-- 2. Messages Table
CREATE TABLE IF NOT EXISTS public.messages (
  -- Identity
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Relationships
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Message Content
  content TEXT, -- Can be NULL for media-only messages
  type TEXT NOT NULL DEFAULT 'text' CHECK (type IN ('text', 'image', 'video', 'link', 'coupon', 'deal')),
  
  -- Media & Attachments
  media_urls TEXT[], -- Array of storage URLs
  thumbnail_url TEXT, -- For video thumbnails
  
  -- Link & Rich Content
  link_preview JSONB, -- {title, description, image, url}
  
  -- Coupon/Deal Sharing (Integration with existing sharing system)
  -- Note: Assuming coupons and offers tables exist. If not, these FKs might fail. 
  -- We will use loose coupling if tables don't exist yet, but per spec they should.
  shared_coupon_id UUID, -- REFERENCES coupons(id) ON DELETE SET NULL,
  shared_deal_id UUID, -- REFERENCES offers(id) ON DELETE SET NULL,
  
  -- Message Status
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sending', 'sent', 'delivered', 'read', 'failed')),
  
  -- Edit/Delete tracking
  is_edited BOOLEAN DEFAULT false,
  edited_at TIMESTAMPTZ,
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Reply/Thread (for future)
  reply_to_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  -- Constraints
  CONSTRAINT valid_content CHECK (
    content IS NOT NULL OR 
    (media_urls IS NOT NULL AND array_length(media_urls, 1) > 0) OR
    shared_coupon_id IS NOT NULL OR
    shared_deal_id IS NOT NULL
  ),
  CONSTRAINT valid_metadata CHECK (jsonb_typeof(metadata) = 'object')
);

-- Indexes for messages
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status) WHERE status != 'read';
CREATE INDEX IF NOT EXISTS idx_messages_type ON messages(type);
CREATE INDEX IF NOT EXISTS idx_messages_shared_coupon ON messages(shared_coupon_id) WHERE shared_coupon_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_messages_shared_deal ON messages(shared_deal_id) WHERE shared_deal_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_messages_reply_to ON messages(reply_to_id) WHERE reply_to_id IS NOT NULL;

-- Enable Realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- 3. Message Read Receipts Table
CREATE TABLE IF NOT EXISTS public.message_read_receipts (
  -- Composite Primary Key
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Status Tracking
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  PRIMARY KEY (message_id, user_id)
);

-- Indexes for read receipts
CREATE INDEX IF NOT EXISTS idx_read_receipts_message_id ON message_read_receipts(message_id);
CREATE INDEX IF NOT EXISTS idx_read_receipts_user_id ON message_read_receipts(user_id);
CREATE INDEX IF NOT EXISTS idx_read_receipts_unread ON message_read_receipts(user_id, read_at) WHERE read_at IS NULL;

-- Enable Realtime for read receipts
ALTER PUBLICATION supabase_realtime ADD TABLE message_read_receipts;

-- 4. Conversation Participants Table
CREATE TABLE IF NOT EXISTS public.conversation_participants (
  -- Relationships
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Participant Metadata
  is_admin BOOLEAN DEFAULT false, -- For future group chats
  joined_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  left_at TIMESTAMPTZ,
  
  -- User-specific settings
  is_muted BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  is_pinned BOOLEAN DEFAULT false,
  last_read_at TIMESTAMPTZ,
  
  -- Notifications
  notification_preference TEXT DEFAULT 'all' CHECK (notification_preference IN ('all', 'mentions', 'none')),
  
  PRIMARY KEY (conversation_id, user_id)
);

-- Indexes for participants
CREATE INDEX IF NOT EXISTS idx_participants_conversation_id ON conversation_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_participants_user_id ON conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_participants_active ON conversation_participants(user_id) WHERE left_at IS NULL;

-- 5. Message Edits History Table
CREATE TABLE IF NOT EXISTS public.message_edits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  old_content TEXT NOT NULL,
  new_content TEXT NOT NULL,
  edited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  edited_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  CONSTRAINT different_content CHECK (old_content != new_content)
);

-- Indexes for message edits
CREATE INDEX IF NOT EXISTS idx_message_edits_message_id ON message_edits(message_id, edited_at DESC);

-- 6. Typing Indicators Table
CREATE TABLE IF NOT EXISTS public.typing_indicators (
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  PRIMARY KEY (conversation_id, user_id)
);

-- Indexes for typing indicators
CREATE INDEX IF NOT EXISTS idx_typing_conversation_id ON typing_indicators(conversation_id);

-- Auto-cleanup old typing indicators (> 10 seconds old)
CREATE OR REPLACE FUNCTION cleanup_old_typing_indicators()
RETURNS trigger AS $$
BEGIN
  DELETE FROM typing_indicators 
  WHERE started_at < now() - INTERVAL '10 seconds';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS cleanup_typing_trigger ON typing_indicators;
CREATE TRIGGER cleanup_typing_trigger
  AFTER INSERT ON typing_indicators
  EXECUTE FUNCTION cleanup_old_typing_indicators();

-- 7. Blocked Users Table
CREATE TABLE IF NOT EXISTS public.blocked_users (
  blocker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  reason TEXT,
  
  PRIMARY KEY (blocker_id, blocked_id),
  
  CONSTRAINT cannot_block_self CHECK (blocker_id != blocked_id)
);

-- Indexes for blocked users
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocker ON blocked_users(blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocked ON blocked_users(blocked_id);
