-- Migration: Add message deduplication support
-- Story 8.4.7: Conflict Resolution & Duplicate Prevention
--
-- This migration adds idempotency key support to prevent duplicate messages
-- during offline sync and rapid network transitions.
--
-- Features:
-- - idempotency_key column for client-generated unique keys
-- - Unique constraint to prevent duplicate inserts
-- - Partial index (only for non-null keys) for efficiency
-- - Performance index for conversation queries

-- Add idempotency_key column
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

-- Create unique index on idempotency_key (for deduplication)
-- Using partial index (WHERE idempotency_key IS NOT NULL) for efficiency
-- This prevents duplicate messages with the same idempotency key
CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_idempotency_key
ON messages(idempotency_key)
WHERE idempotency_key IS NOT NULL;

-- Add index for faster conversation queries
-- Optimizes queries that fetch messages by conversation with ordering
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created
ON messages(conversation_id, created_at DESC);

-- Add comment for documentation
COMMENT ON COLUMN messages.idempotency_key IS 
'Client-generated unique key for deduplication. Prevents duplicate message sends during offline sync. Format: UUID from offline queue.';

COMMENT ON INDEX idx_messages_idempotency_key IS 
'Unique constraint for message deduplication. Prevents duplicate inserts with same idempotency key.';
