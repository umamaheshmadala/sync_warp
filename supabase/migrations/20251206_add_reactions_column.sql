-- Add reactions JSONB column if not exists
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS reactions JSONB DEFAULT '{}';

-- Add index for reaction queries
CREATE INDEX IF NOT EXISTS idx_messages_reactions
ON messages USING GIN (reactions);

-- Comment
COMMENT ON COLUMN messages.reactions IS 'JSON object storing reactions: {"emoji": ["user_id_1", ...]}';
