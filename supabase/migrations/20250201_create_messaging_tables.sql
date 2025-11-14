-- STORY 8.1.1: Core Messaging Tables Schema
-- This migration creates the foundational messaging schema for SynC.

-- Ensure UUID extension is available for uuid_generate_v4()
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

--
-- Task 1: Create Conversations Table
--
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL DEFAULT 'direct' CHECK (type IN ('direct', 'group')),
  participants UUID[] NOT NULL,
  name TEXT,
  avatar_url TEXT,
  is_archived BOOLEAN DEFAULT false,
  is_muted BOOLEAN DEFAULT false,
  is_pinned BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  last_message_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT valid_participants CHECK (array_length(participants, 1) >= 2),
  CONSTRAINT valid_metadata CHECK (jsonb_typeof(metadata) = 'object')
);

CREATE INDEX idx_conversations_participants ON conversations USING gin(participants);
CREATE INDEX idx_conversations_last_message_at ON conversations(last_message_at DESC);
CREATE INDEX idx_conversations_type ON conversations(type);


--
-- Task 2: Create Messages Table
--
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT,
  type TEXT NOT NULL DEFAULT 'text' CHECK (type IN ('text', 'image', 'video', 'link', 'coupon', 'deal')),
  media_urls TEXT[],
  thumbnail_url TEXT,
  link_preview JSONB,
  shared_coupon_id UUID REFERENCES coupons(id) ON DELETE SET NULL,
  shared_deal_id UUID REFERENCES offers(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sending', 'sent', 'delivered', 'read', 'failed')),
  is_edited BOOLEAN DEFAULT false,
  edited_at TIMESTAMPTZ,
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reply_to_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT valid_content CHECK (
    content IS NOT NULL OR 
    array_length(media_urls, 1) > 0 OR
    shared_coupon_id IS NOT NULL OR
    shared_deal_id IS NOT NULL
  ),
  CONSTRAINT valid_metadata CHECK (jsonb_typeof(metadata) = 'object')
);

CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_created_at ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_status ON messages(status) WHERE status != 'read';
CREATE INDEX idx_messages_type ON messages(type);
CREATE INDEX idx_messages_shared_coupon ON messages(shared_coupon_id) WHERE shared_coupon_id IS NOT NULL;
CREATE INDEX idx_messages_shared_deal ON messages(shared_deal_id) WHERE shared_deal_id IS NOT NULL;
CREATE INDEX idx_messages_reply_to ON messages(reply_to_id) WHERE reply_to_id IS NOT NULL;


--
-- Task 3: Create Message Read Receipts Table
--
CREATE TABLE public.message_read_receipts (
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (message_id, user_id)
);

CREATE INDEX idx_read_receipts_message_id ON message_read_receipts(message_id);
CREATE INDEX idx_read_receipts_user_id ON message_read_receipts(user_id);
CREATE INDEX idx_read_receipts_unread ON message_read_receipts(user_id, read_at) WHERE read_at IS NULL;


--
-- Task 4: Create Conversation Participants Table
--
CREATE TABLE public.conversation_participants (
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_admin BOOLEAN DEFAULT false,
  joined_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  left_at TIMESTAMPTZ,
  is_muted BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  is_pinned BOOLEAN DEFAULT false,
  last_read_at TIMESTAMPTZ,
  notification_preference TEXT DEFAULT 'all' CHECK (notification_preference IN ('all', 'mentions', 'none')),
  PRIMARY KEY (conversation_id, user_id)
);

CREATE INDEX idx_participants_conversation_id ON conversation_participants(conversation_id);
CREATE INDEX idx_participants_user_id ON conversation_participants(user_id);
CREATE INDEX idx_participants_active ON conversation_participants(user_id) WHERE left_at IS NULL;


--
-- Task 5: Create Message Edits Table
--
CREATE TABLE public.message_edits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  old_content TEXT NOT NULL,
  new_content TEXT NOT NULL,
  edited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  edited_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT different_content CHECK (old_content != new_content)
);

CREATE INDEX idx_message_edits_message_id ON message_edits(message_id, edited_at DESC);


--
-- Task 6: Create Typing Indicators Table with Auto-Cleanup
--
CREATE TABLE public.typing_indicators (
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (conversation_id, user_id)
);

CREATE INDEX idx_typing_conversation_id ON typing_indicators(conversation_id);

-- Auto-cleanup trigger
CREATE OR REPLACE FUNCTION cleanup_old_typing_indicators()
RETURNS trigger AS $$
BEGIN
  DELETE FROM typing_indicators 
  WHERE started_at < now() - INTERVAL '10 seconds';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cleanup_typing_trigger
  AFTER INSERT ON typing_indicators
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_old_typing_indicators();


--
-- Task 7: Create Blocked Users Table
--
CREATE TABLE public.blocked_users (
  blocker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  reason TEXT,
  PRIMARY KEY (blocker_id, blocked_id),
  CONSTRAINT cannot_block_self CHECK (blocker_id != blocked_id)
);

CREATE INDEX idx_blocked_users_blocker ON blocked_users(blocker_id);
CREATE INDEX idx_blocked_users_blocked ON blocked_users(blocked_id);


--
-- Task 8: Enable Realtime on Critical Tables
--
ALTER PUBLICATION supabase_realtime ADD TABLE
  conversations,
  messages,
  message_read_receipts;
