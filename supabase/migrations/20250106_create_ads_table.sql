-- Migration: Create ads table for carousel and ad management
-- Created: 2025-01-06
-- Description: Adds support for paid advertising system with tracking and organic fallbacks

-- =====================================================
-- 1. CREATE ADS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS ads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('banner', 'carousel', 'search', 'trending')),
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  cta_text TEXT,
  cta_url TEXT,
  priority INTEGER DEFAULT 0,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  daily_budget DECIMAL(10, 2) DEFAULT 500.00,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'paused', 'ended')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 2. CREATE INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_ads_business_id ON ads(business_id);
CREATE INDEX IF NOT EXISTS idx_ads_type ON ads(type);
CREATE INDEX IF NOT EXISTS idx_ads_status ON ads(status);
CREATE INDEX IF NOT EXISTS idx_ads_dates ON ads(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_ads_priority ON ads(priority DESC);

-- =====================================================
-- 3. CREATE TRACKING FUNCTIONS
-- =====================================================

-- Function to track ad impressions
CREATE OR REPLACE FUNCTION track_ad_impression(ad_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE ads
  SET impressions = impressions + 1
  WHERE id = ad_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to track ad clicks
CREATE OR REPLACE FUNCTION track_ad_click(ad_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE ads
  SET clicks = clicks + 1
  WHERE id = ad_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 4. ENABLE ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE ads ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 5. CREATE RLS POLICIES
-- =====================================================

-- Policy: Anyone can view active ads
CREATE POLICY "Anyone can view active ads" ON ads
  FOR SELECT USING (status = 'active');

-- Policy: Business owners can view their own ads (all statuses)
CREATE POLICY "Business owners can view own ads" ON ads
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM businesses WHERE id = ads.business_id
    )
  );

-- Policy: Business owners can insert their own ads
CREATE POLICY "Business owners can create ads" ON ads
  FOR INSERT WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM businesses WHERE id = ads.business_id
    )
  );

-- Policy: Business owners can update their own ads
CREATE POLICY "Business owners can update own ads" ON ads
  FOR UPDATE USING (
    auth.uid() IN (
      SELECT user_id FROM businesses WHERE id = ads.business_id
    )
  );

-- Policy: Business owners can delete their own ads
CREATE POLICY "Business owners can delete own ads" ON ads
  FOR DELETE USING (
    auth.uid() IN (
      SELECT user_id FROM businesses WHERE id = ads.business_id
    )
  );

-- =====================================================
-- 6. CREATE UPDATED_AT TRIGGER
-- =====================================================

CREATE OR REPLACE FUNCTION update_ads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ads_updated_at
  BEFORE UPDATE ON ads
  FOR EACH ROW
  EXECUTE FUNCTION update_ads_updated_at();

-- =====================================================
-- 7. INSERT SAMPLE DATA (Optional - for testing)
-- =====================================================

-- Uncomment to insert sample ads for testing
/*
INSERT INTO ads (
  business_id,
  business_name,
  type,
  title,
  description,
  cta_text,
  cta_url,
  priority,
  start_date,
  end_date,
  status
) VALUES
(
  (SELECT id FROM businesses LIMIT 1), -- Uses first business
  'Sample Business',
  'carousel',
  'Special Offer: 50% Off This Weekend!',
  'Don''t miss our exclusive weekend promotion. Limited time only.',
  'Claim Offer',
  '/business/sample',
  10,
  NOW(),
  NOW() + INTERVAL '30 days',
  'active'
);
*/

-- =====================================================
-- 8. GRANT PERMISSIONS
-- =====================================================

-- Grant execute permissions on tracking functions to authenticated users
GRANT EXECUTE ON FUNCTION track_ad_impression(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION track_ad_click(UUID) TO authenticated;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- Notes:
-- 1. Ads are filtered by type, status, and date range in the application
-- 2. Priority determines ordering (higher = shown first)
-- 3. Daily budget is ₹500/day for banner ads
-- 4. Impressions and clicks are tracked via RPC functions
-- 5. Organic fallbacks are handled in the application layer
-- 6. RLS ensures business owners can only manage their own ads
