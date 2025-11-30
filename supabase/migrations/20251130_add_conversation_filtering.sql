-- Migration: Add conversation filtering enhancements
-- Story: 8.10.1 - Conversation Filtering & Tabs
-- Date: 2025-11-30
-- Note: is_archived, is_muted, is_pinned already exist from 20250115 migration

-- Add timestamp columns for archive and pin (if they don't exist)
ALTER TABLE conversations
ADD COLUMN IF NOT EXISTS pinned_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- Add indexes for filtering performance
CREATE INDEX IF NOT EXISTS idx_conversations_archived
  ON conversations(is_archived) WHERE is_archived = true;

CREATE INDEX IF NOT EXISTS idx_conversations_pinned
  ON conversations(is_pinned, pinned_at DESC) WHERE is_pinned = true;

-- Composite index for efficient sorting (pinned first, then by last message)
CREATE INDEX IF NOT EXISTS idx_conversations_list_sorting
  ON conversations(is_pinned DESC, last_message_at DESC)
  WHERE is_archived = false;

-- Note: No index on unread_count since it doesn't exist in conversations table
-- Unread count is calculated from conversation_participants or messages

COMMENT ON COLUMN conversations.pinned_at IS 'Timestamp when conversation was pinned';
COMMENT ON COLUMN conversations.archived_at IS 'Timestamp when conversation was archived';
