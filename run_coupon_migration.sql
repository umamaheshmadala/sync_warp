-- Run this in your Supabase SQL Editor
-- Migration: Create coupon management tables for Story 4.3

-- Business Coupons Table
CREATE TABLE IF NOT EXISTS business_coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
    
    -- Basic Coupon Information
    title VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    
    -- Coupon Type and Value
    type VARCHAR(20) NOT NULL CHECK (type IN ('percentage', 'fixed_amount', 'buy_x_get_y', 'free_item', 'free_shipping', 'bundle_deal')),
    discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount', 'free_item', 'buy_x_get_y')),
    discount_value DECIMAL(10,2) NOT NULL CHECK (discount_value > 0),
    min_purchase_amount DECIMAL(10,2),
    max_discount_amount DECIMAL(10,2),
    
    -- Terms and Conditions
    terms_conditions TEXT NOT NULL,
    
    -- Usage Limits
    total_limit INTEGER CHECK (total_limit > 0),
    per_user_limit INTEGER DEFAULT 1 CHECK (per_user_limit > 0),
    
    -- Time Validity
    valid_from TIMESTAMP WITH TIME ZONE NOT NULL,
    valid_until TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Targeting and Distribution
    target_audience VARCHAR(30) DEFAULT 'all_users' CHECK (target_audience IN ('all_users', 'new_users', 'returning_users', 'frequent_users', 'drivers', 'location_based', 'friends_of_users')),
    is_public BOOLEAN DEFAULT true,
    
    -- Coupon Code and QR
    coupon_code VARCHAR(20) UNIQUE NOT NULL,
    qr_code_url TEXT,
    
    -- Status and Tracking
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'expired', 'exhausted', 'cancelled')),
    usage_count INTEGER DEFAULT 0,
    collection_count INTEGER DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) NOT NULL,
    
    -- Constraints
    CONSTRAINT valid_dates CHECK (valid_from < valid_until),
    CONSTRAINT valid_discount_percentage CHECK (
        discount_type != 'percentage' OR (discount_value > 0 AND discount_value <= 100)
    )
);

-- Coupon Redemptions Table
CREATE TABLE IF NOT EXISTS coupon_redemptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coupon_id UUID REFERENCES business_coupons(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
    
    -- Redemption Details
    redemption_code VARCHAR(20) NOT NULL,
    redemption_amount DECIMAL(10,2) NOT NULL,
    original_amount DECIMAL(10,2) NOT NULL,
    final_amount DECIMAL(10,2) NOT NULL,
    
    -- Location and Verification
    redeemed_at_latitude DECIMAL(10, 8),
    redeemed_at_longitude DECIMAL(11, 8),
    
    -- Status and Tracking
    status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'cancelled', 'failed')),
    redeemed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    redeemed_by UUID REFERENCES auth.users(id),
    
    transaction_reference VARCHAR(100),
    notes TEXT,
    
    CONSTRAINT valid_amounts CHECK (redemption_amount >= 0 AND original_amount > 0 AND final_amount >= 0),
    CONSTRAINT logical_discount CHECK (final_amount = original_amount - redemption_amount)
);

-- User Coupon Collections Table
CREATE TABLE IF NOT EXISTS user_coupon_collections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    coupon_id UUID REFERENCES business_coupons(id) ON DELETE CASCADE NOT NULL,
    
    collected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    collected_from VARCHAR(30) DEFAULT 'direct_search' CHECK (collected_from IN ('direct_search', 'business_profile', 'social_share', 'push_notification', 'qr_scan', 'admin_push')),
    
    times_used INTEGER DEFAULT 0,
    last_used_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'used', 'expired', 'removed')),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    
    UNIQUE(user_id, coupon_id)
);

-- Coupon Analytics Table
CREATE TABLE IF NOT EXISTS coupon_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coupon_id UUID REFERENCES business_coupons(id) ON DELETE CASCADE NOT NULL,
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
    
    total_collections INTEGER DEFAULT 0,
    unique_collectors INTEGER DEFAULT 0,
    collection_rate DECIMAL(5,2) DEFAULT 0,
    
    total_redemptions INTEGER DEFAULT 0,
    unique_redeemers INTEGER DEFAULT 0,
    redemption_rate DECIMAL(5,2) DEFAULT 0,
    
    total_discount_given DECIMAL(12,2) DEFAULT 0,
    average_discount_per_redemption DECIMAL(10,2) DEFAULT 0,
    estimated_revenue_generated DECIMAL(12,2) DEFAULT 0,
    
    daily_stats JSONB DEFAULT '[]',
    user_segments JSONB DEFAULT '{}',
    collection_sources JSONB DEFAULT '{}',
    conversion_funnel JSONB DEFAULT '{"views": 0, "collections": 0, "redemptions": 0}',
    
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(coupon_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_business_coupons_business_id ON business_coupons(business_id);
CREATE INDEX IF NOT EXISTS idx_business_coupons_status ON business_coupons(status);
CREATE INDEX IF NOT EXISTS idx_business_coupons_valid_dates ON business_coupons(valid_from, valid_until);
CREATE INDEX IF NOT EXISTS idx_business_coupons_code ON business_coupons(coupon_code);
CREATE INDEX IF NOT EXISTS idx_business_coupons_public ON business_coupons(is_public) WHERE is_public = true;

CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_coupon_id ON coupon_redemptions(coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_user_id ON coupon_redemptions(user_id);
CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_business_id ON coupon_redemptions(business_id);
CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_date ON coupon_redemptions(redeemed_at);

CREATE INDEX IF NOT EXISTS idx_user_coupon_collections_user_id ON user_coupon_collections(user_id);
CREATE INDEX IF NOT EXISTS idx_user_coupon_collections_coupon_id ON user_coupon_collections(coupon_id);
CREATE INDEX IF NOT EXISTS idx_user_coupon_collections_status ON user_coupon_collections(status);
CREATE INDEX IF NOT EXISTS idx_user_coupon_collections_expires ON user_coupon_collections(expires_at);

CREATE INDEX IF NOT EXISTS idx_coupon_analytics_business_id ON coupon_analytics(business_id);

-- Enable RLS
ALTER TABLE business_coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_coupon_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Business owners can manage own coupons" ON business_coupons
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM businesses 
            WHERE businesses.id = business_coupons.business_id 
            AND businesses.user_id = auth.uid()
        )
    );

CREATE POLICY "Anyone can read active public coupons" ON business_coupons
    FOR SELECT USING (
        status = 'active' 
        AND is_public = true 
        AND valid_from <= NOW() 
        AND valid_until > NOW()
    );

CREATE POLICY "Business owners can view redemptions" ON coupon_redemptions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM businesses 
            WHERE businesses.id = coupon_redemptions.business_id 
            AND businesses.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage own collections" ON user_coupon_collections
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Business owners can view analytics" ON coupon_analytics
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM businesses 
            WHERE businesses.id = coupon_analytics.business_id 
            AND businesses.user_id = auth.uid()
        )
    );

-- Success message
SELECT 'Coupon system database migration completed successfully!' as status;