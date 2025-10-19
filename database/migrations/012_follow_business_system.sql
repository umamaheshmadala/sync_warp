-- ============================================================================
-- Migration 012: Follow Business System (Story 4.11)
-- ============================================================================
-- Purpose: Transform existing favorites system into a comprehensive follow 
--          business system with notifications and update feeds
-- Author: SynC Development Team
-- Date: 2025-01-19
-- Dependencies: Requires favorites table to exist (from previous migrations)
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Rename favorites table to business_followers
-- ============================================================================

DO $$ 
BEGIN
    -- Check if favorites table exists and business_followers doesn't
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'favorites')
       AND NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'business_followers') 
    THEN
        ALTER TABLE favorites RENAME TO business_followers;
        RAISE NOTICE 'Renamed favorites table to business_followers';
    ELSIF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'business_followers') THEN
        RAISE NOTICE 'Table business_followers already exists, skipping rename';
    ELSE
        RAISE EXCEPTION 'Favorites table not found. Please run previous migrations first.';
    END IF;
END $$;

-- ============================================================================
-- STEP 2: Add new columns for following features
-- ============================================================================

-- Add notification preferences column
ALTER TABLE business_followers 
  ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{
    "new_products": true,
    "new_offers": true,
    "new_coupons": true,
    "announcements": true
  }'::jsonb;

-- Add notification channel column
ALTER TABLE business_followers 
  ADD COLUMN IF NOT EXISTS notification_channel VARCHAR(20) DEFAULT 'in_app' 
    CHECK (notification_channel IN ('in_app', 'push', 'email', 'sms', 'all'));

-- Add last notified timestamp
ALTER TABLE business_followers 
  ADD COLUMN IF NOT EXISTS last_notified_at TIMESTAMPTZ;

-- Add is_active flag for soft deletes
ALTER TABLE business_followers 
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Add followed_at timestamp
ALTER TABLE business_followers 
  ADD COLUMN IF NOT EXISTS followed_at TIMESTAMPTZ DEFAULT NOW();

-- ============================================================================
-- STEP 3: Update existing data
-- ============================================================================

-- Set followed_at to created_at for existing records
UPDATE business_followers 
SET followed_at = created_at 
WHERE followed_at IS NULL AND created_at IS NOT NULL;

-- ============================================================================
-- STEP 4: Create indexes for performance
-- ============================================================================

-- Index for active followers by business
CREATE INDEX IF NOT EXISTS idx_business_followers_business_active 
  ON business_followers(business_id, is_active) 
  WHERE is_active = true;

-- Index for notification targeting
CREATE INDEX IF NOT EXISTS idx_business_followers_notifications 
  ON business_followers(business_id) 
  WHERE (notification_preferences->>'new_offers')::boolean = true;

-- Index for notification channel
CREATE INDEX IF NOT EXISTS idx_business_followers_channel 
  ON business_followers(notification_channel);

-- Index for user's active followers
CREATE INDEX IF NOT EXISTS idx_business_followers_user_active 
  ON business_followers(user_id, is_active) 
  WHERE is_active = true;

-- Index for recently followed
CREATE INDEX IF NOT EXISTS idx_business_followers_followed_at
  ON business_followers(followed_at DESC);

-- ============================================================================
-- STEP 5: Update RLS policies
-- ============================================================================

-- Drop old favorites policies if they exist
DROP POLICY IF EXISTS "Users can view own favorites" ON business_followers;
DROP POLICY IF EXISTS "Users can insert own favorites" ON business_followers;
DROP POLICY IF EXISTS "Users can delete own favorites" ON business_followers;
DROP POLICY IF EXISTS "Users can update own favorites" ON business_followers;

-- Enable RLS
ALTER TABLE business_followers ENABLE ROW LEVEL SECURITY;

-- Users can view their own followed businesses
CREATE POLICY "Users can view own followed businesses" 
  ON business_followers FOR SELECT
  USING (auth.uid() = user_id);

-- Business owners can view their followers
CREATE POLICY "Business owners can view followers"
  ON business_followers FOR SELECT
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

-- Users can follow businesses
CREATE POLICY "Users can follow businesses" 
  ON business_followers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can unfollow businesses (soft delete by setting is_active=false)
CREATE POLICY "Users can unfollow businesses" 
  ON business_followers FOR DELETE
  USING (auth.uid() = user_id);

-- Users can update their notification preferences
CREATE POLICY "Users can update notification preferences" 
  ON business_followers FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- STEP 6: Add table comment
-- ============================================================================

COMMENT ON TABLE business_followers IS 'Tracks which users follow which businesses with notification preferences (formerly favorites table, migrated to support following features)';

-- ============================================================================
-- STEP 7: Create follower_updates table
-- ============================================================================

CREATE TABLE IF NOT EXISTS follower_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  update_type VARCHAR(50) NOT NULL CHECK (update_type IN (
    'new_product', 
    'new_offer', 
    'new_coupon', 
    'announcement', 
    'price_drop', 
    'back_in_stock'
  )),
  entity_id UUID, -- ID of the product/offer/coupon
  title VARCHAR(255) NOT NULL,
  description TEXT,
  metadata JSONB, -- Additional data (price, discount, image_url, etc.)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ, -- For time-sensitive updates
  is_active BOOLEAN DEFAULT true
);

-- Indexes for follower_updates
CREATE INDEX IF NOT EXISTS idx_follower_updates_business 
  ON follower_updates(business_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_follower_updates_type 
  ON follower_updates(update_type);

CREATE INDEX IF NOT EXISTS idx_follower_updates_active 
  ON follower_updates(is_active) 
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_follower_updates_business_active
  ON follower_updates(business_id, is_active, created_at DESC)
  WHERE is_active = true;

-- RLS Policies for follower_updates
ALTER TABLE follower_updates ENABLE ROW LEVEL SECURITY;

-- Anyone can view active updates
CREATE POLICY "Anyone can view active updates" 
  ON follower_updates FOR SELECT
  USING (is_active = true);

-- Business owners can create updates for their business
CREATE POLICY "Business owners can create updates for their business" 
  ON follower_updates FOR INSERT
  WITH CHECK (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

-- Business owners can manage their updates
CREATE POLICY "Business owners can manage their updates" 
  ON follower_updates FOR UPDATE
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

-- Business owners can delete their updates
CREATE POLICY "Business owners can delete updates"
  ON follower_updates FOR DELETE
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

COMMENT ON TABLE follower_updates IS 'Tracks all content updates from businesses to show in follower feeds';

-- ============================================================================
-- STEP 8: Create follower_notifications table
-- ============================================================================

CREATE TABLE IF NOT EXISTS follower_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  update_id UUID REFERENCES follower_updates(id) ON DELETE CASCADE,
  notification_type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  is_sent BOOLEAN DEFAULT false, -- For push/email tracking
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, update_id) -- Prevent duplicate notifications
);

-- Indexes for follower_notifications
CREATE INDEX IF NOT EXISTS idx_follower_notifications_user_unread 
  ON follower_notifications(user_id, is_read) 
  WHERE is_read = false;

CREATE INDEX IF NOT EXISTS idx_follower_notifications_created 
  ON follower_notifications(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_follower_notifications_user_created
  ON follower_notifications(user_id, created_at DESC);

-- RLS Policies for follower_notifications
ALTER TABLE follower_notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications" 
  ON follower_notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Users can mark notifications as read
CREATE POLICY "Users can mark notifications as read" 
  ON follower_notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE follower_notifications IS 'Queue of notifications to send to users about updates from followed businesses';

-- ============================================================================
-- STEP 9: Create functions and triggers
-- ============================================================================

-- Function to automatically create update when business posts content
CREATE OR REPLACE FUNCTION create_follower_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create update for active/approved content
  IF NEW.status = 'active' OR NEW.status = 'approved' THEN
    INSERT INTO follower_updates (
      business_id, 
      update_type, 
      entity_id, 
      title, 
      description,
      metadata
    ) VALUES (
      NEW.business_id,
      CASE 
        WHEN TG_TABLE_NAME = 'business_products' THEN 'new_product'
        WHEN TG_TABLE_NAME = 'business_offers' THEN 'new_offer'
        WHEN TG_TABLE_NAME = 'business_coupons' THEN 'new_coupon'
        ELSE 'announcement'
      END,
      NEW.id,
      COALESCE(NEW.name, NEW.title),
      NEW.description,
      jsonb_build_object(
        'price', NEW.price,
        'discount_value', NEW.discount_value,
        'image_url', NEW.image_url
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create notifications for all followers
CREATE OR REPLACE FUNCTION notify_followers_of_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert notifications for all active followers who want this type of update
  INSERT INTO follower_notifications (
    user_id, 
    business_id, 
    update_id, 
    notification_type, 
    title, 
    body
  )
  SELECT 
    bf.user_id,
    NEW.business_id,
    NEW.id,
    NEW.update_type,
    NEW.title,
    COALESCE(NEW.description, 'Check out the latest update!')
  FROM business_followers bf
  WHERE bf.business_id = NEW.business_id
    AND bf.is_active = true
    AND (
      (NEW.update_type = 'new_product' AND (bf.notification_preferences->>'new_products')::boolean = true) OR
      (NEW.update_type = 'new_offer' AND (bf.notification_preferences->>'new_offers')::boolean = true) OR
      (NEW.update_type = 'new_coupon' AND (bf.notification_preferences->>'new_coupons')::boolean = true) OR
      (NEW.update_type = 'announcement' AND (bf.notification_preferences->>'announcements')::boolean = true)
    )
  ON CONFLICT (user_id, update_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 10: Create triggers (only if tables exist)
-- ============================================================================

-- Trigger for business_products
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'business_products') THEN
    DROP TRIGGER IF EXISTS product_added_create_update ON business_products;
    CREATE TRIGGER product_added_create_update
    AFTER INSERT ON business_products
    FOR EACH ROW
    EXECUTE FUNCTION create_follower_update();
    RAISE NOTICE 'Created trigger for business_products';
  END IF;
END $$;

-- Trigger for business_offers
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'business_offers') THEN
    DROP TRIGGER IF EXISTS offer_added_create_update ON business_offers;
    CREATE TRIGGER offer_added_create_update
    AFTER INSERT ON business_offers
    FOR EACH ROW
    EXECUTE FUNCTION create_follower_update();
    RAISE NOTICE 'Created trigger for business_offers';
  END IF;
END $$;

-- Trigger for business_coupons
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'business_coupons') THEN
    DROP TRIGGER IF EXISTS coupon_added_create_update ON business_coupons;
    CREATE TRIGGER coupon_added_create_update
    AFTER INSERT ON business_coupons
    FOR EACH ROW
    EXECUTE FUNCTION create_follower_update();
    RAISE NOTICE 'Created trigger for business_coupons';
  END IF;
END $$;

-- Trigger to auto-notify followers when updates are created
DROP TRIGGER IF EXISTS update_created_notify_followers ON follower_updates;
CREATE TRIGGER update_created_notify_followers
AFTER INSERT ON follower_updates
FOR EACH ROW
EXECUTE FUNCTION notify_followers_of_update();

-- ============================================================================
-- STEP 11: Update campaign_targets table for follower targeting
-- ============================================================================

-- Add follower targeting columns if campaign_targets exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'campaign_targets') THEN
    ALTER TABLE campaign_targets
      ADD COLUMN IF NOT EXISTS follower_only BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS follower_filter JSONB;
    
    CREATE INDEX IF NOT EXISTS idx_campaign_targets_follower_only 
      ON campaign_targets(campaign_id, follower_only) 
      WHERE follower_only = true;
    
    RAISE NOTICE 'Updated campaign_targets table for follower targeting';
  ELSE
    RAISE NOTICE 'campaign_targets table does not exist, skipping this step';
  END IF;
END $$;

-- ============================================================================
-- STEP 12: Create helper functions
-- ============================================================================

-- Function to get followers matching campaign criteria
CREATE OR REPLACE FUNCTION get_followers_for_campaign(
  p_business_id UUID,
  p_targeting_rules JSONB DEFAULT NULL
)
RETURNS TABLE (
  user_id UUID,
  followed_at TIMESTAMPTZ,
  notification_preferences JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    bf.user_id,
    bf.followed_at,
    bf.notification_preferences
  FROM business_followers bf
  JOIN profiles p ON p.id = bf.user_id
  WHERE bf.business_id = p_business_id
    AND bf.is_active = true
    -- Apply demographic filters if specified
    AND (
      p_targeting_rules IS NULL 
      OR (
        -- Age filter
        (p_targeting_rules->>'age_min' IS NULL OR p.age >= (p_targeting_rules->>'age_min')::int)
        AND (p_targeting_rules->>'age_max' IS NULL OR p.age <= (p_targeting_rules->>'age_max')::int)
        -- Gender filter
        AND (p_targeting_rules->>'gender' IS NULL OR p.gender = p_targeting_rules->>'gender')
        -- City filter
        AND (p_targeting_rules->>'city' IS NULL OR p.city = p_targeting_rules->>'city')
      )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_followers_for_campaign IS 'Returns all followers of a business, optionally filtered by demographic targeting rules';

-- Function to get follower count for a business
CREATE OR REPLACE FUNCTION get_follower_count(p_business_id UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM business_followers
  WHERE business_id = p_business_id
    AND is_active = true;
$$ LANGUAGE sql STABLE;

COMMENT ON FUNCTION get_follower_count IS 'Returns the count of active followers for a business';

-- ============================================================================
-- STEP 13: Create views for analytics
-- ============================================================================

-- View for business follower analytics
CREATE OR REPLACE VIEW business_follower_analytics AS
SELECT 
  bf.business_id,
  COUNT(*) as total_followers,
  COUNT(*) FILTER (WHERE bf.followed_at >= NOW() - INTERVAL '7 days') as new_this_week,
  COUNT(*) FILTER (WHERE bf.followed_at >= NOW() - INTERVAL '30 days') as new_this_month,
  COUNT(*) FILTER (
    WHERE (bf.notification_preferences->>'new_products')::boolean = true
       OR (bf.notification_preferences->>'new_offers')::boolean = true
       OR (bf.notification_preferences->>'new_coupons')::boolean = true
       OR (bf.notification_preferences->>'announcements')::boolean = true
  ) as active_followers,
  AVG(CASE 
    WHEN p.age < 25 THEN 20
    WHEN p.age < 35 THEN 30
    WHEN p.age < 45 THEN 40
    ELSE 50
  END) as avg_age_bracket
FROM business_followers bf
LEFT JOIN profiles p ON p.id = bf.user_id
WHERE bf.is_active = true
GROUP BY bf.business_id;

COMMENT ON VIEW business_follower_analytics IS 'Aggregated follower statistics for businesses';

COMMIT;

-- ============================================================================
-- Migration Complete
-- ============================================================================
-- Summary:
-- ✅ Renamed favorites → business_followers
-- ✅ Added notification preferences and channels
-- ✅ Created follower_updates table
-- ✅ Created follower_notifications table
-- ✅ Set up RLS policies for privacy
-- ✅ Created triggers for auto-update creation
-- ✅ Added campaign targeting support
-- ✅ Created helper functions and views
-- ============================================================================
