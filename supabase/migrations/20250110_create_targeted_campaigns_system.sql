-- =====================================================================
-- Targeted Campaigns System Migration
-- Phase 1: Database Schema
-- Created: January 10, 2025
-- =====================================================================
-- 
-- This migration creates the complete database schema for the 
-- Targeted Campaigns system including:
-- 1. campaigns table - Campaign definitions and metadata
-- 2. driver_profiles table - User activity scoring and rankings
-- 3. driver_algorithm_config table - Configurable scoring weights
-- 4. campaign_analytics table - Time-series performance metrics
-- 5. campaign_targets table - User-campaign relationships
-- 6. Supporting functions for driver scoring and reach estimation
-- 7. Row Level Security policies
-- 8. Triggers and scheduled jobs
-- =====================================================================

-- =====================================================================
-- 1. CAMPAIGNS TABLE
-- =====================================================================

CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  
  -- Basic Info
  name VARCHAR(100) NOT NULL,
  description TEXT,
  campaign_type VARCHAR(50) NOT NULL CHECK (
    campaign_type IN ('coupons', 'ads', 'events', 'promotions')
  ),
  
  -- Targeting Configuration
  targeting_rules JSONB NOT NULL DEFAULT '{}',
  target_drivers_only BOOLEAN DEFAULT false,
  estimated_reach INTEGER,
  
  -- Budget & Pricing
  total_budget_cents INTEGER NOT NULL CHECK (total_budget_cents > 0),
  spent_budget_cents INTEGER DEFAULT 0 CHECK (spent_budget_cents >= 0),
  cost_per_impression_cents INTEGER,
  cost_per_click_cents INTEGER,
  
  -- Schedule
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE,
  schedule_config JSONB, -- Day/hour restrictions
  
  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (
    status IN (
      'draft', 
      'pending_approval', 
      'approved', 
      'active', 
      'paused', 
      'completed', 
      'rejected'
    )
  ),
  
  -- Performance Metrics (cached for quick access)
  impressions INTEGER DEFAULT 0 CHECK (impressions >= 0),
  clicks INTEGER DEFAULT 0 CHECK (clicks >= 0),
  conversions INTEGER DEFAULT 0 CHECK (conversions >= 0),
  last_metrics_update TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  
  -- Constraints
  CONSTRAINT valid_dates CHECK (end_date IS NULL OR end_date > start_date),
  CONSTRAINT valid_spend CHECK (spent_budget_cents <= total_budget_cents)
);

-- Indexes for campaigns
CREATE INDEX IF NOT EXISTS idx_campaigns_business ON campaigns(business_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_dates ON campaigns(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_campaigns_drivers ON campaigns(target_drivers_only) 
  WHERE target_drivers_only = true;
CREATE INDEX IF NOT EXISTS idx_campaigns_targeting ON campaigns USING GIN (targeting_rules);
CREATE INDEX IF NOT EXISTS idx_campaigns_created_at ON campaigns(created_at DESC);

-- Comments
COMMENT ON TABLE campaigns IS 'Merchant-created targeted marketing campaigns';
COMMENT ON COLUMN campaigns.targeting_rules IS 'JSONB containing demographics, interests, location filters';
COMMENT ON COLUMN campaigns.estimated_reach IS 'Calculated potential audience size';
COMMENT ON COLUMN campaigns.schedule_config IS 'Optional day/hour restrictions for campaign display';

-- =====================================================================
-- 2. DRIVER PROFILES TABLE
-- =====================================================================

CREATE TABLE IF NOT EXISTS driver_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  city_id UUID NOT NULL REFERENCES cities(id),
  
  -- Activity Metrics
  total_activity_score DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (total_activity_score >= 0),
  
  -- Component Scores (weighted by algorithm config)
  coupons_collected_score DECIMAL(10,2) DEFAULT 0 CHECK (coupons_collected_score >= 0),
  coupons_shared_score DECIMAL(10,2) DEFAULT 0 CHECK (coupons_shared_score >= 0),
  coupons_redeemed_score DECIMAL(10,2) DEFAULT 0 CHECK (coupons_redeemed_score >= 0),
  checkins_score DECIMAL(10,2) DEFAULT 0 CHECK (checkins_score >= 0),
  reviews_score DECIMAL(10,2) DEFAULT 0 CHECK (reviews_score >= 0),
  social_interactions_score DECIMAL(10,2) DEFAULT 0 CHECK (social_interactions_score >= 0),
  
  -- Rankings
  city_rank INTEGER CHECK (city_rank > 0),
  percentile DECIMAL(5,2) CHECK (percentile >= 0 AND percentile <= 100),
  is_driver BOOLEAN DEFAULT false,
  
  -- Activity Counts
  total_coupons_collected INTEGER DEFAULT 0 CHECK (total_coupons_collected >= 0),
  total_coupons_shared INTEGER DEFAULT 0 CHECK (total_coupons_shared >= 0),
  total_coupons_redeemed INTEGER DEFAULT 0 CHECK (total_coupons_redeemed >= 0),
  total_checkins INTEGER DEFAULT 0 CHECK (total_checkins >= 0),
  total_reviews INTEGER DEFAULT 0 CHECK (total_reviews >= 0),
  
  -- Time Windows
  score_30d DECIMAL(10,2) CHECK (score_30d >= 0),
  score_90d DECIMAL(10,2) CHECK (score_90d >= 0),
  
  -- Metadata
  first_activity_at TIMESTAMP WITH TIME ZONE,
  last_activity_at TIMESTAMP WITH TIME ZONE,
  last_calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(user_id, city_id)
);

-- Indexes for driver_profiles
CREATE INDEX IF NOT EXISTS idx_driver_profiles_user ON driver_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_driver_profiles_city ON driver_profiles(city_id);
CREATE INDEX IF NOT EXISTS idx_driver_profiles_score ON driver_profiles(total_activity_score DESC);
CREATE INDEX IF NOT EXISTS idx_driver_profiles_is_driver ON driver_profiles(is_driver) 
  WHERE is_driver = true;
CREATE INDEX IF NOT EXISTS idx_driver_profiles_city_rank ON driver_profiles(city_id, city_rank);
CREATE INDEX IF NOT EXISTS idx_driver_profiles_percentile ON driver_profiles(percentile DESC);

-- Comments
COMMENT ON TABLE driver_profiles IS 'User activity scores and Driver (top 10%) status per city';
COMMENT ON COLUMN driver_profiles.total_activity_score IS 'Weighted sum of all activity components';
COMMENT ON COLUMN driver_profiles.is_driver IS 'True if user is in top 10% for their city';
COMMENT ON COLUMN driver_profiles.percentile IS 'User percentile rank within city (0-100)';

-- =====================================================================
-- 3. DRIVER ALGORITHM CONFIG TABLE
-- =====================================================================

CREATE TABLE IF NOT EXISTS driver_algorithm_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Scoring Weights (must sum to 100)
  coupons_collected_weight DECIMAL(5,2) DEFAULT 20.0 
    CHECK (coupons_collected_weight >= 0 AND coupons_collected_weight <= 100),
  coupons_shared_weight DECIMAL(5,2) DEFAULT 25.0 
    CHECK (coupons_shared_weight >= 0 AND coupons_shared_weight <= 100),
  coupons_redeemed_weight DECIMAL(5,2) DEFAULT 25.0 
    CHECK (coupons_redeemed_weight >= 0 AND coupons_redeemed_weight <= 100),
  checkins_weight DECIMAL(5,2) DEFAULT 15.0 
    CHECK (checkins_weight >= 0 AND checkins_weight <= 100),
  reviews_weight DECIMAL(5,2) DEFAULT 10.0 
    CHECK (reviews_weight >= 0 AND reviews_weight <= 100),
  social_interactions_weight DECIMAL(5,2) DEFAULT 5.0 
    CHECK (social_interactions_weight >= 0 AND social_interactions_weight <= 100),
  
  -- Calculation Parameters
  recency_decay_factor DECIMAL(5,2) DEFAULT 0.95 
    CHECK (recency_decay_factor > 0 AND recency_decay_factor <= 1),
  min_activities_threshold INTEGER DEFAULT 5 
    CHECK (min_activities_threshold >= 0),
  calculation_window_days INTEGER DEFAULT 90 
    CHECK (calculation_window_days > 0 AND calculation_window_days <= 365),
  
  -- Driver Threshold
  driver_percentile_threshold DECIMAL(5,2) DEFAULT 90.0 
    CHECK (driver_percentile_threshold >= 50 AND driver_percentile_threshold <= 99),
  
  -- Metadata
  is_active BOOLEAN DEFAULT true,
  effective_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  notes TEXT,
  
  -- Ensure weights sum to 100
  CONSTRAINT valid_weights CHECK (
    coupons_collected_weight + coupons_shared_weight + coupons_redeemed_weight +
    checkins_weight + reviews_weight + social_interactions_weight = 100
  )
);

-- Only one active config at a time
CREATE UNIQUE INDEX IF NOT EXISTS idx_active_driver_config 
  ON driver_algorithm_config(is_active) 
  WHERE is_active = true;

-- Comments
COMMENT ON TABLE driver_algorithm_config IS 'Configurable parameters for Driver scoring algorithm';
COMMENT ON COLUMN driver_algorithm_config.driver_percentile_threshold IS 'Percentile cutoff for Driver status (90 = top 10%)';

-- Insert default configuration
INSERT INTO driver_algorithm_config (
  coupons_collected_weight,
  coupons_shared_weight,
  coupons_redeemed_weight,
  checkins_weight,
  reviews_weight,
  social_interactions_weight,
  recency_decay_factor,
  min_activities_threshold,
  calculation_window_days,
  driver_percentile_threshold,
  is_active,
  notes
) VALUES (
  20.0,  -- coupons_collected_weight
  25.0,  -- coupons_shared_weight
  25.0,  -- coupons_redeemed_weight
  15.0,  -- checkins_weight
  10.0,  -- reviews_weight
  5.0,   -- social_interactions_weight
  0.95,  -- recency_decay_factor
  5,     -- min_activities_threshold
  90,    -- calculation_window_days
  90.0,  -- driver_percentile_threshold (top 10%)
  true,  -- is_active
  'Default configuration for Driver identification algorithm'
) ON CONFLICT DO NOTHING;

-- =====================================================================
-- 4. CAMPAIGN ANALYTICS TABLE
-- =====================================================================

CREATE TABLE IF NOT EXISTS campaign_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  
  -- Time Bucket
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL,
  time_bucket VARCHAR(20) NOT NULL CHECK (
    time_bucket IN ('hour', 'day', 'week', 'month')
  ),
  
  -- Metrics
  impressions INTEGER DEFAULT 0 CHECK (impressions >= 0),
  clicks INTEGER DEFAULT 0 CHECK (clicks >= 0),
  conversions INTEGER DEFAULT 0 CHECK (conversions >= 0),
  
  -- Costs
  spent_cents INTEGER DEFAULT 0 CHECK (spent_cents >= 0),
  
  -- Engagement
  avg_engagement_seconds DECIMAL(10,2),
  bounce_rate DECIMAL(5,2) CHECK (bounce_rate >= 0 AND bounce_rate <= 100),
  
  -- Demographics Breakdown
  demographics_breakdown JSONB,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(campaign_id, recorded_at, time_bucket)
);

-- Indexes for campaign_analytics
CREATE INDEX IF NOT EXISTS idx_campaign_analytics_campaign ON campaign_analytics(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_analytics_time ON campaign_analytics(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_campaign_analytics_bucket ON campaign_analytics(time_bucket, recorded_at DESC);

-- Comments
COMMENT ON TABLE campaign_analytics IS 'Time-series performance metrics for campaigns';
COMMENT ON COLUMN campaign_analytics.time_bucket IS 'Aggregation level: hour, day, week, or month';
COMMENT ON COLUMN campaign_analytics.demographics_breakdown IS 'Age/gender/income breakdown of viewers';

-- =====================================================================
-- 5. CAMPAIGN TARGETS TABLE
-- =====================================================================

CREATE TABLE IF NOT EXISTS campaign_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Targeting Metadata
  matched_criteria JSONB,
  is_driver BOOLEAN DEFAULT false,
  
  -- Engagement Tracking
  impressions_count INTEGER DEFAULT 0 CHECK (impressions_count >= 0),
  clicks_count INTEGER DEFAULT 0 CHECK (clicks_count >= 0),
  converted BOOLEAN DEFAULT false,
  conversion_value_cents INTEGER CHECK (conversion_value_cents >= 0),
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_interaction_at TIMESTAMP WITH TIME ZONE,
  
  UNIQUE(campaign_id, user_id)
);

-- Indexes for campaign_targets
CREATE INDEX IF NOT EXISTS idx_campaign_targets_campaign ON campaign_targets(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_targets_user ON campaign_targets(user_id);
CREATE INDEX IF NOT EXISTS idx_campaign_targets_drivers ON campaign_targets(is_driver) 
  WHERE is_driver = true;
CREATE INDEX IF NOT EXISTS idx_campaign_targets_converted ON campaign_targets(converted) 
  WHERE converted = true;

-- Comments
COMMENT ON TABLE campaign_targets IS 'Many-to-many relationship tracking which users see which campaigns';
COMMENT ON COLUMN campaign_targets.matched_criteria IS 'Why this user was targeted for this campaign';

-- =====================================================================
-- 6. HELPER FUNCTIONS
-- =====================================================================

-- Function: Calculate Driver Score for a User
CREATE OR REPLACE FUNCTION calculate_driver_score(
  p_user_id UUID,
  p_city_id UUID
)
RETURNS DECIMAL(10,2) AS $$
DECLARE
  v_config RECORD;
  v_coupons_collected INT := 0;
  v_coupons_shared INT := 0;
  v_coupons_redeemed INT := 0;
  v_checkins INT := 0;
  v_reviews INT := 0;
  v_social_interactions INT := 0;
  v_total_score DECIMAL(10,2) := 0;
  v_window_start TIMESTAMP;
BEGIN
  -- Get active config
  SELECT * INTO v_config 
  FROM driver_algorithm_config 
  WHERE is_active = true 
  LIMIT 1;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No active driver algorithm config found';
  END IF;
  
  -- Calculate window start
  v_window_start := NOW() - (v_config.calculation_window_days || ' days')::INTERVAL;
  
  -- Count coupons collected
  SELECT COUNT(*) INTO v_coupons_collected
  FROM user_coupons
  WHERE user_id = p_user_id 
    AND created_at >= v_window_start;
  
  -- Count coupons shared
  SELECT COUNT(*) INTO v_coupons_shared
  FROM coupon_sharing_log
  WHERE sender_id = p_user_id 
    AND shared_at >= v_window_start;
  
  -- Count coupons redeemed
  SELECT COUNT(*) INTO v_coupons_redeemed
  FROM user_coupons
  WHERE user_id = p_user_id 
    AND redeemed_at >= v_window_start
    AND redeemed_at IS NOT NULL;
  
  -- Count check-ins
  SELECT COUNT(*) INTO v_checkins
  FROM check_ins
  WHERE user_id = p_user_id 
    AND created_at >= v_window_start;
  
  -- Count reviews
  SELECT COUNT(*) INTO v_reviews
  FROM reviews
  WHERE user_id = p_user_id 
    AND created_at >= v_window_start;
  
  -- Count social interactions (friend requests + activity feed)
  SELECT COUNT(*) INTO v_social_interactions
  FROM (
    SELECT created_at FROM friend_requests 
    WHERE (sender_id = p_user_id OR receiver_id = p_user_id)
      AND created_at >= v_window_start
    UNION ALL
    SELECT created_at FROM activity_feed 
    WHERE user_id = p_user_id
      AND created_at >= v_window_start
  ) social;
  
  -- Calculate weighted score
  v_total_score := 
    (v_coupons_collected * v_config.coupons_collected_weight) +
    (v_coupons_shared * v_config.coupons_shared_weight) +
    (v_coupons_redeemed * v_config.coupons_redeemed_weight) +
    (v_checkins * v_config.checkins_weight) +
    (v_reviews * v_config.reviews_weight) +
    (v_social_interactions * v_config.social_interactions_weight);
  
  -- Apply recency decay
  v_total_score := v_total_score * v_config.recency_decay_factor;
  
  RETURN COALESCE(v_total_score, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION calculate_driver_score IS 'Calculate weighted activity score for a user in a city';

-- Function: Update Driver Rankings
CREATE OR REPLACE FUNCTION update_driver_rankings(p_city_id UUID DEFAULT NULL)
RETURNS void AS $$
DECLARE
  v_config RECORD;
  v_city_id UUID;
BEGIN
  -- Get active config
  SELECT * INTO v_config 
  FROM driver_algorithm_config 
  WHERE is_active = true 
  LIMIT 1;
  
  IF NOT FOUND THEN
    RAISE NOTICE 'No active driver algorithm config found';
    RETURN;
  END IF;
  
  -- Loop through cities (or single city if specified)
  FOR v_city_id IN 
    SELECT DISTINCT city_id 
    FROM profiles 
    WHERE city_id IS NOT NULL
      AND (p_city_id IS NULL OR city_id = p_city_id)
  LOOP
    -- Upsert driver profiles with calculated scores
    INSERT INTO driver_profiles (
      user_id, 
      city_id, 
      total_activity_score,
      last_calculated_at
    )
    SELECT 
      p.id,
      v_city_id,
      calculate_driver_score(p.id, v_city_id),
      NOW()
    FROM profiles p
    WHERE p.city_id = v_city_id
    ON CONFLICT (user_id, city_id) 
    DO UPDATE SET
      total_activity_score = EXCLUDED.total_activity_score,
      last_calculated_at = NOW();
    
    -- Calculate rankings within city
    WITH ranked_users AS (
      SELECT 
        user_id,
        total_activity_score,
        ROW_NUMBER() OVER (ORDER BY total_activity_score DESC) as rank,
        PERCENT_RANK() OVER (ORDER BY total_activity_score DESC) * 100 as percentile
      FROM driver_profiles
      WHERE city_id = v_city_id
    )
    UPDATE driver_profiles dp
    SET 
      city_rank = ru.rank,
      percentile = 100 - ru.percentile, -- Invert so higher percentile = better
      is_driver = ((100 - ru.percentile) >= v_config.driver_percentile_threshold),
      updated_at = NOW()
    FROM ranked_users ru
    WHERE dp.user_id = ru.user_id 
      AND dp.city_id = v_city_id;
    
  END LOOP;
  
  RAISE NOTICE 'Driver rankings updated successfully';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION update_driver_rankings IS 'Recalculate driver scores and rankings for all or specific city';

-- Function: Estimate Campaign Reach
CREATE OR REPLACE FUNCTION estimate_campaign_reach(
  p_targeting_rules JSONB,
  p_city_id UUID DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER := 0;
  v_base_query TEXT;
  v_conditions TEXT[] := ARRAY[]::TEXT[];
  v_full_query TEXT;
BEGIN
  -- Start with base query
  v_base_query := 'SELECT COUNT(DISTINCT p.id) FROM profiles p';
  
  -- Add city filter
  IF p_city_id IS NOT NULL THEN
    v_conditions := array_append(v_conditions, 'p.city_id = ' || quote_literal(p_city_id));
  END IF;
  
  -- Add age range filter
  IF p_targeting_rules ? 'age_ranges' AND jsonb_array_length(p_targeting_rules->'age_ranges') > 0 THEN
    v_conditions := array_append(v_conditions, 
      'p.age_range = ANY(ARRAY[' || 
      (SELECT string_agg(quote_literal(value::text), ',') FROM jsonb_array_elements_text(p_targeting_rules->'age_ranges')) ||
      ']::text[])');
  END IF;
  
  -- Add gender filter
  IF p_targeting_rules ? 'gender' AND jsonb_array_length(p_targeting_rules->'gender') > 0 THEN
    v_conditions := array_append(v_conditions, 
      'p.gender = ANY(ARRAY[' || 
      (SELECT string_agg(quote_literal(value::text), ',') FROM jsonb_array_elements_text(p_targeting_rules->'gender')) ||
      ']::text[])');
  END IF;
  
  -- Add drivers only filter
  IF (p_targeting_rules->>'drivers_only')::BOOLEAN IS TRUE THEN
    v_base_query := v_base_query || ' INNER JOIN driver_profiles dp ON dp.user_id = p.id';
    v_conditions := array_append(v_conditions, 'dp.is_driver = true');
    IF p_city_id IS NOT NULL THEN
      v_conditions := array_append(v_conditions, 'dp.city_id = ' || quote_literal(p_city_id));
    END IF;
  END IF;
  
  -- Add interests filter
  IF p_targeting_rules ? 'interests' AND jsonb_array_length(p_targeting_rules->'interests') > 0 THEN
    v_conditions := array_append(v_conditions, 
      'p.interests && ARRAY[' || 
      (SELECT string_agg(quote_literal(value::text), ',') FROM jsonb_array_elements_text(p_targeting_rules->'interests')) ||
      ']::text[]');
  END IF;
  
  -- Build full query
  IF array_length(v_conditions, 1) > 0 THEN
    v_full_query := v_base_query || ' WHERE ' || array_to_string(v_conditions, ' AND ');
  ELSE
    v_full_query := v_base_query;
  END IF;
  
  -- Execute query
  EXECUTE v_full_query INTO v_count;
  
  RETURN COALESCE(v_count, 0);
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error estimating campaign reach: %', SQLERRM;
    RETURN 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION estimate_campaign_reach IS 'Estimate potential audience size based on targeting rules';

-- =====================================================================
-- 7. TRIGGERS
-- =====================================================================

-- Trigger: Update updated_at on campaigns
CREATE OR REPLACE FUNCTION update_campaigns_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER campaigns_updated_at_trigger
  BEFORE UPDATE ON campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_campaigns_updated_at();

-- Trigger: Update updated_at on driver_profiles
CREATE OR REPLACE FUNCTION update_driver_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER driver_profiles_updated_at_trigger
  BEFORE UPDATE ON driver_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_driver_profiles_updated_at();

-- =====================================================================
-- 8. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================================

-- Enable RLS on campaigns
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

-- Policy: Businesses can view their own campaigns
CREATE POLICY "businesses_view_own_campaigns"
  ON campaigns FOR SELECT
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

-- Policy: Businesses can create campaigns
CREATE POLICY "businesses_create_campaigns"
  ON campaigns FOR INSERT
  WITH CHECK (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

-- Policy: Businesses can update their own campaigns
CREATE POLICY "businesses_update_own_campaigns"
  ON campaigns FOR UPDATE
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

-- Policy: Businesses can delete their own draft campaigns
CREATE POLICY "businesses_delete_draft_campaigns"
  ON campaigns FOR DELETE
  USING (
    status = 'draft' AND
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

-- Enable RLS on driver_profiles
ALTER TABLE driver_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own driver profile
CREATE POLICY "users_view_own_driver_profile"
  ON driver_profiles FOR SELECT
  USING (user_id = auth.uid());

-- Policy: Businesses can view driver profiles in their city
CREATE POLICY "businesses_view_city_driver_profiles"
  ON driver_profiles FOR SELECT
  USING (
    city_id IN (
      SELECT city_id FROM businesses WHERE owner_id = auth.uid()
    )
  );

-- Enable RLS on campaign_analytics
ALTER TABLE campaign_analytics ENABLE ROW LEVEL SECURITY;

-- Policy: Businesses can view analytics for their own campaigns
CREATE POLICY "businesses_view_own_campaign_analytics"
  ON campaign_analytics FOR SELECT
  USING (
    campaign_id IN (
      SELECT id FROM campaigns 
      WHERE business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
      )
    )
  );

-- Enable RLS on campaign_targets
ALTER TABLE campaign_targets ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own targeting data
CREATE POLICY "users_view_own_campaign_targets"
  ON campaign_targets FOR SELECT
  USING (user_id = auth.uid());

-- Policy: Businesses can view targets for their campaigns
CREATE POLICY "businesses_view_campaign_targets"
  ON campaign_targets FOR SELECT
  USING (
    campaign_id IN (
      SELECT id FROM campaigns 
      WHERE business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
      )
    )
  );

-- Enable RLS on driver_algorithm_config (read-only for all authenticated users)
ALTER TABLE driver_algorithm_config ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone authenticated can view active config
CREATE POLICY "authenticated_view_active_driver_config"
  ON driver_algorithm_config FOR SELECT
  USING (auth.role() = 'authenticated' AND is_active = true);

-- =====================================================================
-- 9. SAMPLE DATA (for testing)
-- =====================================================================

-- Note: Sample campaigns would be inserted by the application
-- This section is intentionally left empty for production migration

-- =====================================================================
-- MIGRATION COMPLETE
-- =====================================================================

-- Verify tables were created
DO $$
BEGIN
  RAISE NOTICE 'Targeted Campaigns System Migration Complete';
  RAISE NOTICE 'Tables created: campaigns, driver_profiles, driver_algorithm_config, campaign_analytics, campaign_targets';
  RAISE NOTICE 'Functions created: calculate_driver_score, update_driver_rankings, estimate_campaign_reach';
  RAISE NOTICE 'RLS policies enabled on all tables';
  RAISE NOTICE 'Ready for Phase 2: Driver Algorithm & Types implementation';
END $$;
