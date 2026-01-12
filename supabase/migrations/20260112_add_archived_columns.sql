-- Add is_archived and archived_at columns to messages table
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
