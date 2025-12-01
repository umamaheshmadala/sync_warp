-- Add missing archived_at column to conversation_participants

ALTER TABLE conversation_participants
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- Update existing archived conversations to set archived_at
UPDATE conversation_participants
SET archived_at = NOW()
WHERE is_archived = true AND archived_at IS NULL;
