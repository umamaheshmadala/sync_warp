-- Create pinned_messages table for Story 8.5.7
-- Allows users to pin important messages in conversations

CREATE TABLE IF NOT EXISTS pinned_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  pinned_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pinned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(message_id, conversation_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_pinned_messages_conversation 
  ON pinned_messages(conversation_id, expires_at DESC);
  
CREATE INDEX IF NOT EXISTS idx_pinned_messages_message 
  ON pinned_messages(message_id);

-- RLS Policies
ALTER TABLE pinned_messages ENABLE ROW LEVEL SECURITY;

-- Users can view pinned messages in conversations they're part of
CREATE POLICY "Users can view pinned messages in their conversations"
  ON pinned_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_participants.conversation_id = pinned_messages.conversation_id
        AND conversation_participants.user_id = auth.uid()
    )
  );

-- Users can pin messages in conversations they're part of
CREATE POLICY "Users can pin messages in their conversations"
  ON pinned_messages
  FOR INSERT
  WITH CHECK (
    pinned_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_participants.conversation_id = pinned_messages.conversation_id
        AND conversation_participants.user_id = auth.uid()
    )
  );

-- Users can unpin messages they pinned or any message in their conversations
CREATE POLICY "Users can unpin messages in their conversations"
  ON pinned_messages
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_participants.conversation_id = pinned_messages.conversation_id
        AND conversation_participants.user_id = auth.uid()
    )
  );

-- Comment
COMMENT ON TABLE pinned_messages IS 'Stores pinned messages for conversations (Story 8.5.7)';
