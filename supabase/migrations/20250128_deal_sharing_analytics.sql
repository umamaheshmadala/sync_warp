-- Migration: Deal Sharing Analytics
-- Story 9.7.6: Add analytics tracking for deal sharing
-- Date: 2025-11-28

-- ============================================================================
-- 1. Add analytics fields to existing deal_shares table
-- ============================================================================

ALTER TABLE deal_shares 
ADD COLUMN IF NOT EXISTS clicked BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS clicked_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS converted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS converted_at TIMESTAMPTZ;

-- Add index for analytics queries
CREATE INDEX IF NOT EXISTS idx_deal_shares_analytics 
ON deal_shares(sender_id, clicked, converted);

COMMENT ON COLUMN deal_shares.clicked IS 'Whether the shared deal link was clicked by recipient';
COMMENT ON COLUMN deal_shares.clicked_at IS 'Timestamp when the shared deal was first clicked';
COMMENT ON COLUMN deal_shares.converted IS 'Whether the recipient favorited/saved the shared deal';
COMMENT ON COLUMN deal_shares.converted_at IS 'Timestamp when the recipient converted';

-- ============================================================================
-- 2. Create share_clicks table
-- ============================================================================

CREATE TABLE IF NOT EXISTS share_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  share_id UUID REFERENCES deal_shares(id) ON DELETE CASCADE,
  deal_id UUID NOT NULL,  -- Denormalized for easier queries
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ip_address INET,
  user_agent TEXT,
  referrer TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_share_clicks_share_id ON share_clicks(share_id);
CREATE INDEX IF NOT EXISTS idx_share_clicks_deal_id ON share_clicks(deal_id);
CREATE INDEX IF NOT EXISTS idx_share_clicks_created_at ON share_clicks(created_at DESC);

-- Enable RLS
ALTER TABLE share_clicks ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view clicks on their shares
CREATE POLICY "Users can view their own share clicks"
  ON share_clicks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM deal_shares ds
      WHERE ds.id = share_clicks.share_id
      AND (ds.sender_id = auth.uid() OR ds.recipient_id = auth.uid())
    )
  );

-- RLS Policy: Anyone can insert clicks (for tracking)
CREATE POLICY "Anyone can insert share clicks"
  ON share_clicks FOR INSERT
  WITH CHECK (true);

COMMENT ON TABLE share_clicks IS 'Tracks when shared deal links are clicked';

-- ============================================================================
-- 3. Create share_conversions table
-- ============================================================================

CREATE TABLE IF NOT EXISTS share_conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  share_id UUID REFERENCES deal_shares(id) ON DELETE CASCADE,
  deal_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  conversion_type TEXT NOT NULL CHECK (conversion_type IN ('favorite', 'save', 'purchase')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_share_conversions_share_id ON share_conversions(share_id);
CREATE INDEX IF NOT EXISTS idx_share_conversions_user_id ON share_conversions(user_id);
CREATE INDEX IF NOT EXISTS idx_share_conversions_deal_id ON share_conversions(deal_id);

-- Enable RLS
ALTER TABLE share_conversions ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own conversions
CREATE POLICY "Users can view their own conversions"
  ON share_conversions FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Users can insert their own conversions
CREATE POLICY "Users can insert their own conversions"
  ON share_conversions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE share_conversions IS 'Tracks when recipients favorite/save shared deals';

-- ============================================================================
-- 4. Create triggers to auto-update clicked/converted status
-- ============================================================================

-- Trigger function: Update clicked status
CREATE OR REPLACE FUNCTION update_share_clicked()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE deal_shares
  SET clicked = true, clicked_at = NEW.created_at
  WHERE id = NEW.share_id AND clicked = false;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_share_clicked ON share_clicks;
CREATE TRIGGER trigger_update_share_clicked
  AFTER INSERT ON share_clicks
  FOR EACH ROW
  EXECUTE FUNCTION update_share_clicked();

-- Trigger function: Update converted status
CREATE OR REPLACE FUNCTION update_share_converted()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE deal_shares
  SET converted = true, converted_at = NEW.created_at
  WHERE id = NEW.share_id AND converted = false;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_share_converted ON share_conversions;
CREATE TRIGGER trigger_update_share_converted
  AFTER INSERT ON share_conversions
  FOR EACH ROW
  EXECUTE FUNCTION update_share_converted();

-- ============================================================================
-- 5. Create RPC function for analytics
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_sharing_analytics()
RETURNS JSON AS $$
DECLARE
  result JSON;
  current_user_id UUID;
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RETURN json_build_object(
      'total_shares', 0,
      'shares_by_method', '{}'::json,
      'click_through_rate', 0,
      'conversion_rate', 0,
      'most_shared_offers', '[]'::json,
      'most_engaged_friends', '[]'::json
    );
  END IF;
  
  SELECT json_build_object(
    'total_shares', (
      SELECT COUNT(*) FROM deal_shares WHERE sender_id = current_user_id
    ),
    'shares_by_method', (
      SELECT COALESCE(json_object_agg(share_method, count), '{}'::json)
      FROM (
        SELECT share_method, COUNT(*) as count
        FROM deal_shares
        WHERE sender_id = current_user_id
        GROUP BY share_method
      ) t
    ),
    'click_through_rate', (
      SELECT COALESCE(
        ROUND(
          (COUNT(*) FILTER (WHERE clicked = true)::DECIMAL / NULLIF(COUNT(*), 0)) * 100,
          2
        ),
        0
      )
      FROM deal_shares
      WHERE sender_id = current_user_id
    ),
    'conversion_rate', (
      SELECT COALESCE(
        ROUND(
          (COUNT(*) FILTER (WHERE converted = true)::DECIMAL / NULLIF(COUNT(*), 0)) * 100,
          2
        ),
        0
      )
      FROM deal_shares
      WHERE sender_id = current_user_id
    ),
    'most_shared_offers', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
      FROM (
        SELECT o.id, o.title, o.image_url, COUNT(*) as share_count
        FROM deal_shares ds
        JOIN offers o ON o.id = ds.deal_id
        WHERE ds.sender_id = current_user_id
        GROUP BY o.id, o.title, o.image_url
        ORDER BY share_count DESC
        LIMIT 5
      ) t
    ),
    'most_engaged_friends', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
      FROM (
        SELECT 
          p.user_id as id,
          p.full_name,
          p.avatar_url,
          COUNT(*) as shares_received,
          COUNT(*) FILTER (WHERE ds.clicked = true) as clicks,
          COUNT(*) FILTER (WHERE ds.converted = true) as conversions
        FROM deal_shares ds
        JOIN profiles p ON p.user_id = ds.recipient_id
        WHERE ds.sender_id = current_user_id
        GROUP BY p.user_id, p.full_name, p.avatar_url
        ORDER BY conversions DESC, clicks DESC
        LIMIT 5
      ) t
    )
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_user_sharing_analytics() TO authenticated;

COMMENT ON FUNCTION get_user_sharing_analytics() IS 'Returns comprehensive sharing analytics for the current user';

-- ============================================================================
-- Migration complete
-- ============================================================================
