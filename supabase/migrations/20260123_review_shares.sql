-- Review shares tracking table
CREATE TABLE IF NOT EXISTS review_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES business_reviews(id) ON DELETE CASCADE,
  sharer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_review_shares_review ON review_shares(review_id);
CREATE INDEX IF NOT EXISTS idx_review_shares_sharer ON review_shares(sharer_id);

-- RLS
ALTER TABLE review_shares ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'review_shares' 
        AND policyname = 'Users can view own shares'
    ) THEN
        CREATE POLICY "Users can view own shares"
        ON review_shares FOR SELECT
        USING (auth.uid() = sharer_id OR auth.uid() = recipient_id);
    END IF;

    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'review_shares' 
        AND policyname = 'Users can share reviews'
    ) THEN
        CREATE POLICY "Users can share reviews"
        ON review_shares FOR INSERT
        WITH CHECK (auth.uid() = sharer_id);
    END IF;
END $$;

-- Function to get share count
CREATE OR REPLACE FUNCTION get_review_share_count(p_review_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (SELECT COUNT(*) FROM review_shares WHERE review_id = p_review_id);
END;
$$ LANGUAGE plpgsql;
