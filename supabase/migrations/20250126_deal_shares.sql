-- Migration: Create deal_shares table
-- Story: 9.7.1 - Share Deal with Friends
-- Description: Track deal sharing between users with support for both message and notification methods

-- Table: deal_shares
CREATE TABLE IF NOT EXISTS deal_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message TEXT,
  share_method TEXT NOT NULL CHECK (share_method IN ('message', 'notification')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent duplicate shares within the same day
  UNIQUE(deal_id, sender_id, recipient_id, created_at::date)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_deal_shares_deal_id ON deal_shares(deal_id);
CREATE INDEX IF NOT EXISTS idx_deal_shares_sender_id ON deal_shares(sender_id);
CREATE INDEX IF NOT EXISTS idx_deal_shares_recipient_id ON deal_shares(recipient_id);
CREATE INDEX IF NOT EXISTS idx_deal_shares_created_at ON deal_shares(created_at DESC);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_deal_shares_deal_sender ON deal_shares(deal_id, sender_id);

-- RLS Policies
ALTER TABLE deal_shares ENABLE ROW LEVEL SECURITY;

-- Users can view shares they sent or received
CREATE POLICY "Users can view shares they sent or received"
  ON deal_shares FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

-- Users can create shares (only as sender)
CREATE POLICY "Users can create shares"
  ON deal_shares FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

-- Users can delete their own sent shares
CREATE POLICY "Users can delete their own shares"
  ON deal_shares FOR DELETE
  USING (auth.uid() = sender_id);

-- Add comment for documentation
COMMENT ON TABLE deal_shares IS 'Tracks deal sharing between users with support for message and notification methods';
COMMENT ON COLUMN deal_shares.share_method IS 'Method used to share: message (via chat) or notification (instant)';
COMMENT ON COLUMN deal_shares.message IS 'Optional custom message from sender';
