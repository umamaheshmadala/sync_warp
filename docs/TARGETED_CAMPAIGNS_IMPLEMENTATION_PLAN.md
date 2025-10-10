# Targeted Campaigns Implementation Plan (Week 7-8)

**Version:** 1.0  
**Date:** January 10, 2025  
**Status:** Ready for Development  
**Epic:** 4B - Missing Business Owner Features  
**Timeline:** 10-12 working days

---

## 📋 Executive Summary

This plan implements the **Targeted Campaigns system** that enables merchants to:
- Create campaigns targeting specific customer demographics
- Target **Drivers** (top 10% most active users per city)
- Set budgets, schedules, and campaign goals
- Track campaign performance and ROI
- Integrate with existing ad request approval queue

### Key Features:
✅ Driver identification algorithm with configurable scoring  
✅ Multi-dimensional targeting (demographics, location, interests, Driver status)  
✅ Campaign builder wizard with audience estimation  
✅ Real-time performance analytics  
✅ Admin controls for Driver algorithm configuration  
✅ Integration with pricing engine and billing system

---

## 🎯 Success Criteria

### Business Outcomes:
- [ ] Merchants can create and manage targeted campaigns
- [ ] Driver list is reproducible and configurable
- [ ] Campaign reach estimation is ±10% accurate
- [ ] Ad requests flow seamlessly into approval queue
- [ ] Campaign performance metrics are real-time

### Technical Requirements:
- [ ] Database schema supports all targeting dimensions
- [ ] Driver algorithm processes 10k+ users <2s
- [ ] Campaign builder loads <1s
- [ ] RLS policies enforce business ownership
- [ ] Admin can adjust Driver scoring weights

---

## 🗂️ System Architecture

### High-Level Components:

```
┌─────────────────────────────────────────────────────────────┐
│                    MERCHANT INTERFACE                         │
├─────────────────────────────────────────────────────────────┤
│  Campaign Builder │ Campaign Dashboard │ Analytics View      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    CAMPAIGN ENGINE                            │
├─────────────────────────────────────────────────────────────┤
│  • Targeting Logic        • Audience Estimation              │
│  • Budget Management      • Schedule Enforcement             │
│  • Performance Tracking   • Ad Request Generation            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    DRIVER SYSTEM                              │
├─────────────────────────────────────────────────────────────┤
│  • Activity Scoring       • City-wise Ranking                │
│  • Top 10% Calculation    • Real-time Updates                │
│  • Admin Configuration    • Badge Management                 │
└─────────────────────────────────────────────────────────────┘
                              │
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    INTEGRATION LAYER                          │
├─────────────────────────────────────────────────────────────┤
│  Ad Approval Queue │ Pricing Engine │ Billing System │ Ads  │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Database Schema

### 1. **campaigns** table

```sql
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  
  -- Basic Info
  name VARCHAR(100) NOT NULL,
  description TEXT,
  campaign_type VARCHAR(50) NOT NULL, -- 'coupons', 'ads', 'events', 'promotions'
  
  -- Targeting
  targeting_rules JSONB NOT NULL DEFAULT '{}', -- Full targeting config
  target_drivers_only BOOLEAN DEFAULT false,
  estimated_reach INTEGER, -- Calculated audience size
  
  -- Budget & Pricing
  total_budget_cents INTEGER NOT NULL,
  spent_budget_cents INTEGER DEFAULT 0,
  cost_per_impression_cents INTEGER,
  cost_per_click_cents INTEGER,
  
  -- Schedule
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE,
  schedule_config JSONB, -- Day/hour restrictions
  
  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'draft', 
    -- 'draft', 'pending_approval', 'approved', 'active', 'paused', 'completed', 'rejected'
  
  -- Performance Metrics (cached)
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  last_metrics_update TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  
  -- Constraints
  CONSTRAINT valid_budget CHECK (total_budget_cents > 0),
  CONSTRAINT valid_dates CHECK (end_date IS NULL OR end_date > start_date),
  CONSTRAINT valid_status CHECK (status IN (
    'draft', 'pending_approval', 'approved', 'active', 'paused', 'completed', 'rejected'
  ))
);

-- Indexes
CREATE INDEX idx_campaigns_business ON campaigns(business_id);
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_campaigns_dates ON campaigns(start_date, end_date);
CREATE INDEX idx_campaigns_drivers ON campaigns(target_drivers_only) WHERE target_drivers_only = true;
CREATE INDEX idx_campaigns_targeting ON campaigns USING GIN (targeting_rules);
```

### Targeting Rules JSON Schema:

```typescript
{
  // Demographics
  age_ranges?: AgeRange[],          // ['18-24', '25-34']
  gender?: string[],                 // ['male', 'female', 'other']
  income_levels?: IncomeLevel[],    // ['middle', 'upper_middle']
  
  // Location
  cities?: string[],                 // City IDs
  radius_km?: number,                // Radius from business location
  
  // Interests
  interests?: InterestCategory[],    // ['food_dining', 'shopping_retail']
  
  // Behavior
  min_activity_score?: number,       // Minimum user activity level
  drivers_only?: boolean,            // Target only Drivers
  
  // Advanced
  exclude_existing_customers?: boolean,
  exclude_recent_visitors?: boolean,
  include_friends_of_customers?: boolean
}
```

---

### 2. **driver_profiles** table

```sql
CREATE TABLE driver_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  city_id UUID NOT NULL REFERENCES cities(id),
  
  -- Activity Metrics
  total_activity_score DECIMAL(10,2) NOT NULL DEFAULT 0,
  
  -- Component Scores (configurable weights)
  coupons_collected_score DECIMAL(10,2) DEFAULT 0,
  coupons_shared_score DECIMAL(10,2) DEFAULT 0,
  coupons_redeemed_score DECIMAL(10,2) DEFAULT 0,
  checkins_score DECIMAL(10,2) DEFAULT 0,
  reviews_score DECIMAL(10,2) DEFAULT 0,
  social_interactions_score DECIMAL(10,2) DEFAULT 0,
  
  -- Rankings
  city_rank INTEGER,                -- Rank within city
  percentile DECIMAL(5,2),          -- 0-100 percentile
  is_driver BOOLEAN DEFAULT false,  -- Top 10% flag
  
  -- Stats
  total_coupons_collected INTEGER DEFAULT 0,
  total_coupons_shared INTEGER DEFAULT 0,
  total_coupons_redeemed INTEGER DEFAULT 0,
  total_checkins INTEGER DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  
  -- Time Windows
  score_30d DECIMAL(10,2),          -- 30-day rolling score
  score_90d DECIMAL(10,2),          -- 90-day rolling score
  
  -- Metadata
  first_activity_at TIMESTAMP WITH TIME ZONE,
  last_activity_at TIMESTAMP WITH TIME ZONE,
  last_calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(user_id, city_id),
  CONSTRAINT valid_percentile CHECK (percentile >= 0 AND percentile <= 100)
);

-- Indexes
CREATE INDEX idx_driver_profiles_user ON driver_profiles(user_id);
CREATE INDEX idx_driver_profiles_city ON driver_profiles(city_id);
CREATE INDEX idx_driver_profiles_score ON driver_profiles(total_activity_score DESC);
CREATE INDEX idx_driver_profiles_is_driver ON driver_profiles(is_driver) WHERE is_driver = true;
CREATE INDEX idx_driver_profiles_city_rank ON driver_profiles(city_id, city_rank);
```

---

### 3. **driver_algorithm_config** table

```sql
CREATE TABLE driver_algorithm_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Scoring Weights (sum should equal 100)
  coupons_collected_weight DECIMAL(5,2) DEFAULT 20.0,
  coupons_shared_weight DECIMAL(5,2) DEFAULT 25.0,
  coupons_redeemed_weight DECIMAL(5,2) DEFAULT 25.0,
  checkins_weight DECIMAL(5,2) DEFAULT 15.0,
  reviews_weight DECIMAL(5,2) DEFAULT 10.0,
  social_interactions_weight DECIMAL(5,2) DEFAULT 5.0,
  
  -- Calculation Parameters
  recency_decay_factor DECIMAL(5,2) DEFAULT 0.95, -- Exponential decay
  min_activities_threshold INTEGER DEFAULT 5,      -- Minimum to qualify
  calculation_window_days INTEGER DEFAULT 90,      -- Rolling window
  
  -- Top Percentage
  driver_percentile_threshold DECIMAL(5,2) DEFAULT 90.0, -- Top 10%
  
  -- Metadata
  is_active BOOLEAN DEFAULT true,
  effective_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  notes TEXT,
  
  CONSTRAINT valid_weights CHECK (
    coupons_collected_weight + coupons_shared_weight + coupons_redeemed_weight +
    checkins_weight + reviews_weight + social_interactions_weight = 100
  ),
  CONSTRAINT valid_percentile_threshold CHECK (
    driver_percentile_threshold >= 50 AND driver_percentile_threshold <= 99
  )
);

-- Only one active config at a time
CREATE UNIQUE INDEX idx_active_driver_config ON driver_algorithm_config(is_active) 
  WHERE is_active = true;
```

---

### 4. **campaign_analytics** table

```sql
CREATE TABLE campaign_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  
  -- Time Bucket
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL,
  time_bucket VARCHAR(20) NOT NULL, -- 'hour', 'day', 'week'
  
  -- Metrics
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  
  -- Costs
  spent_cents INTEGER DEFAULT 0,
  
  -- Engagement
  avg_engagement_seconds DECIMAL(10,2),
  bounce_rate DECIMAL(5,2),
  
  -- Demographics Breakdown
  demographics_breakdown JSONB, -- Age/gender/income breakdown of viewers
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(campaign_id, recorded_at, time_bucket)
);

-- Indexes
CREATE INDEX idx_campaign_analytics_campaign ON campaign_analytics(campaign_id);
CREATE INDEX idx_campaign_analytics_time ON campaign_analytics(recorded_at DESC);
CREATE INDEX idx_campaign_analytics_bucket ON campaign_analytics(time_bucket, recorded_at DESC);
```

---

### 5. **campaign_targets** table (Many-to-many for Driver targeting)

```sql
CREATE TABLE campaign_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Targeting Reason
  matched_criteria JSONB, -- Why this user was targeted
  is_driver BOOLEAN DEFAULT false,
  
  -- Engagement Tracking
  impressions_count INTEGER DEFAULT 0,
  clicks_count INTEGER DEFAULT 0,
  converted BOOLEAN DEFAULT false,
  conversion_value_cents INTEGER,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_interaction_at TIMESTAMP WITH TIME ZONE,
  
  UNIQUE(campaign_id, user_id)
);

-- Indexes
CREATE INDEX idx_campaign_targets_campaign ON campaign_targets(campaign_id);
CREATE INDEX idx_campaign_targets_user ON campaign_targets(user_id);
CREATE INDEX idx_campaign_targets_drivers ON campaign_targets(is_driver) WHERE is_driver = true;
```

---

## 🔐 Row Level Security (RLS) Policies

```sql
-- Campaigns: Businesses can only see their own
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Businesses can view own campaigns"
  ON campaigns FOR SELECT
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Businesses can create campaigns"
  ON campaigns FOR INSERT
  WITH CHECK (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Businesses can update own campaigns"
  ON campaigns FOR UPDATE
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

-- Driver Profiles: Users can view their own, admins see all
ALTER TABLE driver_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own driver profile"
  ON driver_profiles FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Businesses can view driver profiles in their city"
  ON driver_profiles FOR SELECT
  USING (
    city_id IN (
      SELECT city_id FROM businesses WHERE owner_id = auth.uid()
    )
  );

-- Campaign Analytics: Business owners only
ALTER TABLE campaign_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Businesses can view own campaign analytics"
  ON campaign_analytics FOR SELECT
  USING (
    campaign_id IN (
      SELECT id FROM campaigns 
      WHERE business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
      )
    )
  );

-- Admin policies (add is_admin check to profiles)
-- These would need implementation of admin role system
```

---

## 🧮 Driver Algorithm Functions

### Calculate Activity Score

```sql
CREATE OR REPLACE FUNCTION calculate_driver_score(
  p_user_id UUID,
  p_city_id UUID
)
RETURNS DECIMAL(10,2) AS $$
DECLARE
  v_config RECORD;
  v_coupons_collected INT;
  v_coupons_shared INT;
  v_coupons_redeemed INT;
  v_checkins INT;
  v_reviews INT;
  v_social_interactions INT;
  v_total_score DECIMAL(10,2);
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
  DECLARE
    v_window_start TIMESTAMP := NOW() - (v_config.calculation_window_days || ' days')::INTERVAL;
  BEGIN
  
    -- Count activities in window
    SELECT COUNT(*) INTO v_coupons_collected
    FROM user_coupons
    WHERE user_id = p_user_id 
      AND created_at >= v_window_start;
    
    SELECT COUNT(*) INTO v_coupons_shared
    FROM coupon_sharing_log
    WHERE sender_id = p_user_id 
      AND shared_at >= v_window_start;
    
    SELECT COUNT(*) INTO v_coupons_redeemed
    FROM user_coupons
    WHERE user_id = p_user_id 
      AND redeemed_at >= v_window_start
      AND redeemed_at IS NOT NULL;
    
    SELECT COUNT(*) INTO v_checkins
    FROM check_ins
    WHERE user_id = p_user_id 
      AND created_at >= v_window_start;
    
    SELECT COUNT(*) INTO v_reviews
    FROM reviews
    WHERE user_id = p_user_id 
      AND created_at >= v_window_start;
    
    SELECT COUNT(*) INTO v_social_interactions
    FROM (
      SELECT created_at FROM friend_requests WHERE sender_id = p_user_id OR receiver_id = p_user_id
      UNION ALL
      SELECT created_at FROM activity_feed WHERE user_id = p_user_id
    ) social
    WHERE social.created_at >= v_window_start;
    
  END;
  
  -- Calculate weighted score
  v_total_score := 
    (v_coupons_collected * v_config.coupons_collected_weight) +
    (v_coupons_shared * v_config.coupons_shared_weight) +
    (v_coupons_redeemed * v_config.coupons_redeemed_weight) +
    (v_checkins * v_config.checkins_weight) +
    (v_reviews * v_config.reviews_weight) +
    (v_social_interactions * v_config.social_interactions_weight);
  
  -- Apply recency decay (more recent activities weighted higher)
  -- This is a simplified version; production would weight by actual dates
  v_total_score := v_total_score * v_config.recency_decay_factor;
  
  RETURN v_total_score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

### Update Driver Rankings

```sql
CREATE OR REPLACE FUNCTION update_driver_rankings(p_city_id UUID DEFAULT NULL)
RETURNS void AS $$
DECLARE
  v_config RECORD;
  v_city_id UUID;
  v_total_users INT;
  v_driver_threshold_rank INT;
BEGIN
  -- Get active config
  SELECT * INTO v_config 
  FROM driver_algorithm_config 
  WHERE is_active = true 
  LIMIT 1;
  
  -- Loop through cities (or single city if specified)
  FOR v_city_id IN 
    SELECT DISTINCT city_id 
    FROM profiles 
    WHERE (p_city_id IS NULL OR city_id = p_city_id)
  LOOP
    -- Upsert driver profiles with scores
    INSERT INTO driver_profiles (
      user_id, city_id, total_activity_score,
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
    
    -- Calculate rankings
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
      percentile = ru.percentile,
      is_driver = (ru.percentile >= v_config.driver_percentile_threshold),
      updated_at = NOW()
    FROM ranked_users ru
    WHERE dp.user_id = ru.user_id 
      AND dp.city_id = v_city_id;
    
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

### Estimate Campaign Reach

```sql
CREATE OR REPLACE FUNCTION estimate_campaign_reach(
  p_targeting_rules JSONB,
  p_city_id UUID DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
  v_query TEXT;
BEGIN
  -- Build dynamic query based on targeting rules
  v_query := 'SELECT COUNT(DISTINCT p.id) FROM profiles p WHERE 1=1';
  
  -- City filter
  IF p_city_id IS NOT NULL THEN
    v_query := v_query || ' AND p.city_id = ' || quote_literal(p_city_id);
  END IF;
  
  -- Age ranges
  IF p_targeting_rules ? 'age_ranges' THEN
    v_query := v_query || ' AND p.age_range = ANY(' || 
      quote_literal(p_targeting_rules->>'age_ranges') || '::text[])';
  END IF;
  
  -- Gender
  IF p_targeting_rules ? 'gender' THEN
    v_query := v_query || ' AND p.gender = ANY(' || 
      quote_literal(p_targeting_rules->>'gender') || '::text[])';
  END IF;
  
  -- Drivers only
  IF (p_targeting_rules->>'drivers_only')::BOOLEAN THEN
    v_query := v_query || ' AND EXISTS (
      SELECT 1 FROM driver_profiles dp 
      WHERE dp.user_id = p.id AND dp.is_driver = true
    )';
  END IF;
  
  -- Interests overlap
  IF p_targeting_rules ? 'interests' THEN
    v_query := v_query || ' AND p.interests && ' || 
      quote_literal(p_targeting_rules->>'interests') || '::text[]';
  END IF;
  
  -- Execute query
  EXECUTE v_query INTO v_count;
  
  RETURN COALESCE(v_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 📦 TypeScript Types

Create `src/types/campaigns.ts`:

```typescript
/**
 * Targeted Campaigns Type Definitions
 * Week 7-8 Implementation
 */

// ============================================================================
// ENUMS & CONSTANTS
// ============================================================================

export const CAMPAIGN_TYPES = [
  'coupons',
  'ads', 
  'events',
  'promotions'
] as const;

export type CampaignType = typeof CAMPAIGN_TYPES[number];

export const CAMPAIGN_STATUSES = [
  'draft',
  'pending_approval',
  'approved',
  'active',
  'paused',
  'completed',
  'rejected'
] as const;

export type CampaignStatus = typeof CAMPAIGN_STATUSES[number];

export const TIME_BUCKETS = ['hour', 'day', 'week', 'month'] as const;
export type TimeBucket = typeof TIME_BUCKETS[number];

// ============================================================================
// CORE INTERFACES
// ============================================================================

export interface Campaign {
  id: string;
  business_id: string;
  
  // Basic Info
  name: string;
  description?: string;
  campaign_type: CampaignType;
  
  // Targeting
  targeting_rules: TargetingRules;
  target_drivers_only: boolean;
  estimated_reach?: number;
  
  // Budget & Pricing
  total_budget_cents: number;
  spent_budget_cents: number;
  cost_per_impression_cents?: number;
  cost_per_click_cents?: number;
  
  // Schedule
  start_date: string;
  end_date?: string;
  schedule_config?: ScheduleConfig;
  
  // Status
  status: CampaignStatus;
  
  // Performance
  impressions: number;
  clicks: number;
  conversions: number;
  last_metrics_update?: string;
  
  // Metadata
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface TargetingRules {
  // Demographics
  age_ranges?: string[];
  gender?: string[];
  income_levels?: string[];
  
  // Location
  cities?: string[];
  radius_km?: number;
  
  // Interests
  interests?: string[];
  
  // Behavior
  min_activity_score?: number;
  drivers_only?: boolean;
  
  // Advanced
  exclude_existing_customers?: boolean;
  exclude_recent_visitors?: boolean;
  include_friends_of_customers?: boolean;
}

export interface ScheduleConfig {
  days_of_week?: string[]; // ['monday', 'tuesday']
  hours_of_day?: number[]; // [9, 10, 11, 12, 13, 14, 15, 16, 17]
  timezone?: string;
}

export interface DriverProfile {
  id: string;
  user_id: string;
  city_id: string;
  
  // Scores
  total_activity_score: number;
  coupons_collected_score: number;
  coupons_shared_score: number;
  coupons_redeemed_score: number;
  checkins_score: number;
  reviews_score: number;
  social_interactions_score: number;
  
  // Rankings
  city_rank?: number;
  percentile?: number;
  is_driver: boolean;
  
  // Stats
  total_coupons_collected: number;
  total_coupons_shared: number;
  total_coupons_redeemed: number;
  total_checkins: number;
  total_reviews: number;
  
  // Time Windows
  score_30d?: number;
  score_90d?: number;
  
  // Metadata
  first_activity_at?: string;
  last_activity_at?: string;
  last_calculated_at: string;
  created_at: string;
  updated_at: string;
}

export interface DriverAlgorithmConfig {
  id: string;
  
  // Weights (must sum to 100)
  coupons_collected_weight: number;
  coupons_shared_weight: number;
  coupons_redeemed_weight: number;
  checkins_weight: number;
  reviews_weight: number;
  social_interactions_weight: number;
  
  // Parameters
  recency_decay_factor: number;
  min_activities_threshold: number;
  calculation_window_days: number;
  driver_percentile_threshold: number;
  
  // Metadata
  is_active: boolean;
  effective_from: string;
  created_at: string;
  created_by?: string;
  notes?: string;
}

export interface CampaignAnalytics {
  id: string;
  campaign_id: string;
  
  // Time
  recorded_at: string;
  time_bucket: TimeBucket;
  
  // Metrics
  impressions: number;
  clicks: number;
  conversions: number;
  spent_cents: number;
  
  // Engagement
  avg_engagement_seconds?: number;
  bounce_rate?: number;
  
  // Breakdown
  demographics_breakdown?: DemographicsBreakdown;
  
  created_at: string;
}

export interface DemographicsBreakdown {
  age_ranges: Record<string, number>;
  gender: Record<string, number>;
  income_levels: Record<string, number>;
}

export interface CampaignTarget {
  id: string;
  campaign_id: string;
  user_id: string;
  
  matched_criteria: Record<string, any>;
  is_driver: boolean;
  
  impressions_count: number;
  clicks_count: number;
  converted: boolean;
  conversion_value_cents?: number;
  
  created_at: string;
  last_interaction_at?: string;
}

// ============================================================================
// COMPUTED TYPES
// ============================================================================

export interface CampaignPerformance {
  campaign_id: string;
  campaign_name: string;
  
  // Totals
  total_impressions: number;
  total_clicks: number;
  total_conversions: number;
  total_spent_cents: number;
  
  // Rates
  ctr: number; // Click-through rate
  cvr: number; // Conversion rate
  cpc_cents: number; // Cost per click
  cpa_cents: number; // Cost per acquisition
  roi: number; // Return on investment
  
  // Budget
  budget_utilization: number; // Percentage
  budget_remaining_cents: number;
  
  // Time
  days_active: number;
  days_remaining?: number;
}

export interface AudienceEstimate {
  total_reach: number;
  drivers_count?: number;
  breakdown_by_age?: Record<string, number>;
  breakdown_by_city?: Record<string, number>;
  confidence_level: 'low' | 'medium' | 'high';
}

// ============================================================================
// REQUEST/RESPONSE TYPES
// ============================================================================

export interface CreateCampaignRequest {
  business_id: string;
  name: string;
  description?: string;
  campaign_type: CampaignType;
  targeting_rules: TargetingRules;
  total_budget_cents: number;
  start_date: string;
  end_date?: string;
  schedule_config?: ScheduleConfig;
}

export interface UpdateCampaignRequest {
  name?: string;
  description?: string;
  targeting_rules?: TargetingRules;
  total_budget_cents?: number;
  start_date?: string;
  end_date?: string;
  schedule_config?: ScheduleConfig;
  status?: CampaignStatus;
}

export interface EstimateAudienceRequest {
  targeting_rules: TargetingRules;
  city_id?: string;
}

export interface DriverListRequest {
  city_id?: string;
  min_percentile?: number;
  limit?: number;
  offset?: number;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export const formatBudget = (cents: number): string => {
  return `₹${(cents / 100).toFixed(2)}`;
};

export const calculateCTR = (clicks: number, impressions: number): number => {
  return impressions > 0 ? (clicks / impressions) * 100 : 0;
};

export const calculateCVR = (conversions: number, clicks: number): number => {
  return clicks > 0 ? (conversions / clicks) * 100 : 0;
};

export const calculateCPC = (spent_cents: number, clicks: number): number => {
  return clicks > 0 ? spent_cents / clicks : 0;
};

export const calculateROI = (
  revenue_cents: number,
  spent_cents: number
): number => {
  return spent_cents > 0 
    ? ((revenue_cents - spent_cents) / spent_cents) * 100 
    : 0;
};

export const getCampaignStatusColor = (status: CampaignStatus): string => {
  const colors: Record<CampaignStatus, string> = {
    draft: 'gray',
    pending_approval: 'yellow',
    approved: 'blue',
    active: 'green',
    paused: 'orange',
    completed: 'purple',
    rejected: 'red'
  };
  return colors[status];
};

export const isCampaignEditable = (status: CampaignStatus): boolean => {
  return ['draft', 'paused'].includes(status);
};

export const canPauseCampaign = (status: CampaignStatus): boolean => {
  return status === 'active';
};

export const canResumeCampaign = (status: CampaignStatus): boolean => {
  return status === 'paused';
};

// ============================================================================
// TYPE GUARDS
// ============================================================================

export const isCampaign = (obj: any): obj is Campaign => {
  return (
    obj &&
    typeof obj.id === 'string' &&
    typeof obj.business_id === 'string' &&
    typeof obj.name === 'string' &&
    CAMPAIGN_TYPES.includes(obj.campaign_type) &&
    CAMPAIGN_STATUSES.includes(obj.status)
  );
};

export const isDriverProfile = (obj: any): obj is DriverProfile => {
  return (
    obj &&
    typeof obj.id === 'string' &&
    typeof obj.user_id === 'string' &&
    typeof obj.total_activity_score === 'number' &&
    typeof obj.is_driver === 'boolean'
  );
};
```

---

## 🎨 UI/UX Components Structure

### Component Tree:

```
src/components/campaigns/
├── CampaignBuilder/
│   ├── index.tsx                    # Main wizard wrapper
│   ├── steps/
│   │   ├── BasicInfoStep.tsx        # Name, type, description
│   │   ├── TargetingStep.tsx        # Demographics, drivers, interests
│   │   ├── BudgetScheduleStep.tsx   # Budget, dates, schedule
│   │   └── ReviewStep.tsx           # Preview & submit
│   ├── components/
│   │   ├── TargetingRulesForm.tsx   # Targeting configuration UI
│   │   ├── AudienceEstimator.tsx    # Real-time reach estimation
│   │   ├── DriverSelector.tsx       # Driver-only toggle with info
│   │   ├── BudgetCalculator.tsx     # Budget input with projections
│   │   └── SchedulePicker.tsx       # Date range + day/hour picker
│   └── hooks/
│       └── useCampaignBuilder.ts    # Wizard state management
├── CampaignsList/
│   ├── index.tsx                    # Main list view
│   ├── CampaignCard.tsx             # Individual campaign card
│   ├── CampaignFilters.tsx          # Status, type, date filters
│   └── CampaignActions.tsx          # Pause/resume/edit/delete
├── CampaignDetails/
│   ├── index.tsx                    # Full campaign view
│   ├── PerformanceMetrics.tsx       # KPI cards
│   ├── AnalyticsChart.tsx           # Time-series chart
│   ├── AudienceBreakdown.tsx        # Demographics pie charts
│   └── TargetingInfo.tsx            # Display targeting rules
├── DriverDashboard/
│   ├── index.tsx                    # Driver analytics dashboard
│   ├── DriverList.tsx               # Top drivers table
│   ├── DriverProfile.tsx            # Individual driver card
│   └── ActivityBreakdown.tsx        # Score components chart
└── index.ts                         # Component exports
```

---

## 🔨 Implementation Phases

### **Phase 1: Foundation (Days 1-3)**

#### Day 1: Database Schema
- [ ] Create campaigns table with indexes and constraints
- [ ] Create driver_profiles table
- [ ] Create driver_algorithm_config table (with default config)
- [ ] Create campaign_analytics table
- [ ] Create campaign_targets table
- [ ] Set up all RLS policies
- [ ] **Deliverable:** Migration file applied to Supabase

#### Day 2: Database Functions
- [ ] Implement `calculate_driver_score()` function
- [ ] Implement `update_driver_rankings()` function
- [ ] Implement `estimate_campaign_reach()` function
- [ ] Create triggers for automatic score updates
- [ ] Add scheduled job for daily driver ranking updates
- [ ] **Deliverable:** All functions tested with sample data

#### Day 3: TypeScript Types
- [ ] Create `src/types/campaigns.ts` with all interfaces
- [ ] Add utility functions (formatBudget, calculate metrics)
- [ ] Create type guards and validators
- [ ] Export all types from main index
- [ ] **Deliverable:** Type definitions complete and linted

---

### **Phase 2: Driver System (Days 4-5)**

#### Day 4: Driver Algorithm Implementation
- [ ] Create `src/services/driverService.ts`
- [ ] Implement driver score calculation wrapper
- [ ] Add driver ranking update scheduler
- [ ] Create driver list fetching with filters
- [ ] Add driver badge assignment logic
- [ ] **Deliverable:** Driver service fully functional

#### Day 5: Driver UI Components
- [ ] Create `DriverDashboard` component
- [ ] Build `DriverList` table with sorting/filtering
- [ ] Create `DriverProfile` card component
- [ ] Add `ActivityBreakdown` visualization
- [ ] Integrate with useDrivers hook
- [ ] **Deliverable:** Driver dashboard viewable

---

### **Phase 3: Campaign Builder (Days 6-8)**

#### Day 6: Campaign Builder Structure
- [ ] Create wizard wrapper component
- [ ] Implement step navigation logic
- [ ] Build `BasicInfoStep` component
- [ ] Add form validation for each step
- [ ] Create progress indicator
- [ ] **Deliverable:** Wizard shell navigable

#### Day 7: Targeting Step
- [ ] Build `TargetingStep` component
- [ ] Create `TargetingRulesForm` with all filters
- [ ] Implement `AudienceEstimator` with real-time updates
- [ ] Add `DriverSelector` toggle with explanation
- [ ] Show estimated reach dynamically
- [ ] **Deliverable:** Targeting configuration works

#### Day 8: Budget & Review Steps
- [ ] Build `BudgetScheduleStep` component
- [ ] Create `BudgetCalculator` with projections
- [ ] Implement `SchedulePicker` for dates/hours
- [ ] Build `ReviewStep` with all details
- [ ] Add campaign submission logic
- [ ] **Deliverable:** Full campaign creation flow works

---

### **Phase 4: Campaign Management (Days 9-10)**

#### Day 9: Campaign List & Details
- [ ] Create `CampaignsList` component
- [ ] Build `CampaignCard` with key metrics
- [ ] Add `CampaignFilters` for status/type
- [ ] Implement `CampaignActions` dropdown
- [ ] Create `CampaignDetails` full view
- [ ] **Deliverable:** Campaign list and details viewable

#### Day 10: Analytics & Performance
- [ ] Build `PerformanceMetrics` KPI cards
- [ ] Create `AnalyticsChart` for time-series data
- [ ] Implement `AudienceBreakdown` pie charts
- [ ] Add campaign pause/resume functionality
- [ ] Show real-time budget utilization
- [ ] **Deliverable:** Full analytics dashboard

---

### **Phase 5: Integration & Polish (Days 11-12)**

#### Day 11: Ad Request Integration
- [ ] Connect campaign creation to ad request queue
- [ ] Link campaigns to pricing engine
- [ ] Integrate with billing system
- [ ] Add campaign status sync with approvals
- [ ] Test full flow: create → approve → active
- [ ] **Deliverable:** End-to-end flow working

#### Day 12: Admin Controls & Testing
- [ ] Create admin driver config page
- [ ] Add driver algorithm weight adjustment UI
- [ ] Implement campaign approval queue
- [ ] Build admin monitoring dashboard
- [ ] Comprehensive testing of all flows
- [ ] **Deliverable:** Production-ready system

---

## 🧪 Testing Checklist

### Unit Tests:
- [ ] Driver score calculation accuracy
- [ ] Campaign reach estimation precision
- [ ] Budget calculations (CPC, CPA, ROI)
- [ ] Targeting rules validation
- [ ] Schedule config parsing

### Integration Tests:
- [ ] Campaign creation flow
- [ ] Driver ranking updates
- [ ] Analytics aggregation
- [ ] RLS policy enforcement
- [ ] Ad request queue integration

### E2E Tests:
- [ ] Merchant creates targeted campaign
- [ ] Driver receives targeted ad
- [ ] Campaign metrics update in real-time
- [ ] Admin adjusts driver algorithm
- [ ] Campaign pause/resume functionality

### Performance Tests:
- [ ] Driver ranking for 10k+ users <2s
- [ ] Campaign list loads <1s
- [ ] Audience estimation real-time
- [ ] Analytics charts render <500ms

---

## 📈 Success Metrics

### Technical KPIs:
- Campaign builder completion rate: >80%
- Driver algorithm accuracy: ±5% of manual calculation
- Audience estimation accuracy: ±10%
- System response time: <2s for all operations
- Zero RLS policy violations

### Business KPIs:
- Merchants create campaigns: >50% of active businesses
- Driver engagement: 3x higher click rates than non-drivers
- Campaign ROI: Average >200%
- Budget utilization: >85% of allocated budgets

---

## 🚀 Deployment Plan

### Prerequisites:
- [ ] Database migrations tested on staging
- [ ] All environment variables set
- [ ] Supabase functions deployed
- [ ] Admin role system in place

### Deployment Steps:
1. Apply database migrations (use transaction rollback on error)
2. Deploy updated types and services
3. Deploy React components incrementally
4. Enable feature flag for beta merchants
5. Monitor error logs and performance
6. Roll out to 100% after 48h observation

### Rollback Plan:
- Revert migrations using down scripts
- Disable feature flag immediately
- Restore previous UI components
- Investigate issues in staging environment

---

## 📚 Documentation Deliverables

- [ ] **Merchant Guide:** "Creating Your First Targeted Campaign"
- [ ] **Driver System Explainer:** "How We Identify Top Users"
- [ ] **API Reference:** All campaign endpoints documented
- [ ] **Admin Guide:** "Configuring the Driver Algorithm"
- [ ] **Troubleshooting Guide:** Common issues and solutions

---

## 🎯 Next Steps After Completion

Once this system is live, the following enhancements are recommended:

1. **Advanced Targeting:**
   - Lookalike audiences based on existing customers
   - Retargeting users who viewed but didn't convert
   - Sequential targeting (nurture campaigns)

2. **Machine Learning:**
   - Predictive driver scoring
   - Optimal budget allocation suggestions
   - Dynamic bid adjustments based on performance

3. **Enhanced Analytics:**
   - A/B testing framework for campaigns
   - Attribution modeling (multi-touch)
   - Cohort analysis for campaign effectiveness

4. **Automation:**
   - Auto-pause underperforming campaigns
   - Budget reallocation to top performers
   - Scheduled campaign templates

---

## 📞 Support & Questions

For implementation support:
- Technical Lead: [Your Name]
- Database Issues: Check Supabase logs
- UI/UX Questions: Refer to Figma designs
- Business Logic: Review project brief v2.0

---

**Ready to start implementation? Let's build this! 🚀**

---

*This document will be updated as implementation progresses.*
