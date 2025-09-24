-- Migration: Create coupon management tables
-- Created: 2024-12-25
-- Description: Creates all tables needed for Epic 4.3: Coupon Management System

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
    max_discount_amount DECIMAL(10,2), -- For percentage discounts
    
    -- Terms and Conditions
    terms_conditions TEXT NOT NULL,
    
    -- Usage Limits
    total_limit INTEGER CHECK (total_limit > 0), -- Total number of coupons available
    per_user_limit INTEGER DEFAULT 1 CHECK (per_user_limit > 0), -- How many times one user can use it
    
    -- Time Validity
    valid_from TIMESTAMP WITH TIME ZONE NOT NULL,
    valid_until TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Targeting and Distribution
    target_audience VARCHAR(30) DEFAULT 'all_users' CHECK (target_audience IN ('all_users', 'new_users', 'returning_users', 'frequent_users', 'drivers', 'location_based', 'friends_of_users')),
    is_public BOOLEAN DEFAULT true,
    
    -- Coupon Code and QR
    coupon_code VARCHAR(20) UNIQUE NOT NULL,
    qr_code_url TEXT, -- Generated QR code image URL
    
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
    redemption_code VARCHAR(20) NOT NULL, -- The specific code used
    redemption_amount DECIMAL(10,2) NOT NULL, -- Actual discount applied
    original_amount DECIMAL(10,2) NOT NULL, -- Original purchase amount
    final_amount DECIMAL(10,2) NOT NULL, -- Amount after discount
    
    -- Location and Verification
    redeemed_at_latitude DECIMAL(10, 8),
    redeemed_at_longitude DECIMAL(11, 8),
    
    -- Status and Tracking
    status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'cancelled', 'failed')),
    redeemed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    redeemed_by UUID REFERENCES auth.users(id), -- Staff member who processed it
    
    -- Optional receipt or transaction reference
    transaction_reference VARCHAR(100),
    notes TEXT,
    
    -- Constraints
    CONSTRAINT valid_amounts CHECK (redemption_amount >= 0 AND original_amount > 0 AND final_amount >= 0),
    CONSTRAINT logical_discount CHECK (final_amount = original_amount - redemption_amount)
);

-- User Coupon Collections Table
CREATE TABLE IF NOT EXISTS user_coupon_collections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    coupon_id UUID REFERENCES business_coupons(id) ON DELETE CASCADE NOT NULL,
    
    -- Collection Details
    collected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    collected_from VARCHAR(30) DEFAULT 'direct_search' CHECK (collected_from IN ('direct_search', 'business_profile', 'social_share', 'push_notification', 'qr_scan', 'admin_push')),
    
    -- Usage Tracking
    times_used INTEGER DEFAULT 0,
    last_used_at TIMESTAMP WITH TIME ZONE,
    
    -- Status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'used', 'expired', 'removed')),
    
    -- Metadata
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL, -- Copy of coupon expiry for quick access
    
    -- Constraints
    UNIQUE(user_id, coupon_id) -- One collection per user per coupon
);

-- Coupon Analytics Table (aggregated data for performance)
CREATE TABLE IF NOT EXISTS coupon_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coupon_id UUID REFERENCES business_coupons(id) ON DELETE CASCADE NOT NULL,
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
    
    -- Collection Stats
    total_collections INTEGER DEFAULT 0,
    unique_collectors INTEGER DEFAULT 0,
    collection_rate DECIMAL(5,2) DEFAULT 0, -- collections / views (when view tracking is added)
    
    -- Redemption Stats
    total_redemptions INTEGER DEFAULT 0,
    unique_redeemers INTEGER DEFAULT 0,
    redemption_rate DECIMAL(5,2) DEFAULT 0, -- redemptions / collections
    
    -- Financial Impact
    total_discount_given DECIMAL(12,2) DEFAULT 0,
    average_discount_per_redemption DECIMAL(10,2) DEFAULT 0,
    estimated_revenue_generated DECIMAL(12,2) DEFAULT 0,
    
    -- Time-based Analytics (JSON for flexibility)
    daily_stats JSONB DEFAULT '[]',
    
    -- Demographics (JSON for flexibility)
    user_segments JSONB DEFAULT '{}',
    collection_sources JSONB DEFAULT '{}',
    
    -- Performance Metrics
    conversion_funnel JSONB DEFAULT '{"views": 0, "collections": 0, "redemptions": 0}',
    
    -- Metadata
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(coupon_id) -- One analytics record per coupon
);

-- Create indexes for performance
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

-- Row Level Security (RLS) Policies

-- Business Coupons table policies
ALTER TABLE business_coupons ENABLE ROW LEVEL SECURITY;

-- Business owners can manage their own coupons
CREATE POLICY "Business owners can manage own coupons" ON business_coupons
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM businesses 
            WHERE businesses.id = business_coupons.business_id 
            AND businesses.user_id = auth.uid()
        )
    );

-- Anyone can read active public coupons
CREATE POLICY "Anyone can read active public coupons" ON business_coupons
    FOR SELECT USING (
        status = 'active' 
        AND is_public = true 
        AND valid_from <= NOW() 
        AND valid_until > NOW()
    );

-- Coupon Redemptions policies
ALTER TABLE coupon_redemptions ENABLE ROW LEVEL SECURITY;

-- Business owners can view redemptions for their coupons
CREATE POLICY "Business owners can view redemptions" ON coupon_redemptions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM businesses 
            WHERE businesses.id = coupon_redemptions.business_id 
            AND businesses.user_id = auth.uid()
        )
    );

-- Users can view their own redemptions
CREATE POLICY "Users can view own redemptions" ON coupon_redemptions
    FOR SELECT USING (auth.uid() = user_id);

-- Business owners can insert redemptions for their coupons
CREATE POLICY "Business owners can create redemptions" ON coupon_redemptions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM businesses 
            WHERE businesses.id = coupon_redemptions.business_id 
            AND businesses.user_id = auth.uid()
        )
    );

-- User Coupon Collections policies
ALTER TABLE user_coupon_collections ENABLE ROW LEVEL SECURITY;

-- Users can manage their own collections
CREATE POLICY "Users can manage own collections" ON user_coupon_collections
    FOR ALL USING (auth.uid() = user_id);

-- Business owners can view collections for their coupons
CREATE POLICY "Business owners can view collections" ON user_coupon_collections
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM business_coupons bc
            JOIN businesses b ON b.id = bc.business_id
            WHERE bc.id = user_coupon_collections.coupon_id 
            AND b.user_id = auth.uid()
        )
    );

-- Coupon Analytics policies
ALTER TABLE coupon_analytics ENABLE ROW LEVEL SECURITY;

-- Business owners can view analytics for their coupons
CREATE POLICY "Business owners can view analytics" ON coupon_analytics
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM businesses 
            WHERE businesses.id = coupon_analytics.business_id 
            AND businesses.user_id = auth.uid()
        )
    );

-- Functions for coupon operations

-- Function to generate unique coupon code
CREATE OR REPLACE FUNCTION generate_coupon_code(coupon_type VARCHAR DEFAULT 'FIX')
RETURNS TEXT AS $$
DECLARE
    code TEXT;
    exists_count INTEGER;
BEGIN
    LOOP
        code := coupon_type || LPAD(FLOOR(RANDOM() * 100000000)::TEXT, 8, '0');
        
        SELECT COUNT(*) INTO exists_count 
        FROM business_coupons 
        WHERE coupon_code = code;
        
        IF exists_count = 0 THEN
            RETURN code;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to update coupon updated_at timestamp
CREATE OR REPLACE FUNCTION update_coupon_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for business_coupons
CREATE TRIGGER update_business_coupons_updated_at
    BEFORE UPDATE ON business_coupons
    FOR EACH ROW
    EXECUTE FUNCTION update_coupon_updated_at();

-- Function to update analytics on redemption
CREATE OR REPLACE FUNCTION update_coupon_analytics_on_redemption()
RETURNS TRIGGER AS $$
BEGIN
    -- Update analytics when a redemption is inserted
    INSERT INTO coupon_analytics (coupon_id, business_id, total_redemptions, unique_redeemers, total_discount_given)
    VALUES (NEW.coupon_id, NEW.business_id, 1, 1, NEW.redemption_amount)
    ON CONFLICT (coupon_id) 
    DO UPDATE SET
        total_redemptions = coupon_analytics.total_redemptions + 1,
        unique_redeemers = (
            SELECT COUNT(DISTINCT user_id) 
            FROM coupon_redemptions 
            WHERE coupon_id = NEW.coupon_id 
            AND status = 'completed'
        ),
        total_discount_given = coupon_analytics.total_discount_given + NEW.redemption_amount,
        average_discount_per_redemption = (coupon_analytics.total_discount_given + NEW.redemption_amount) / (coupon_analytics.total_redemptions + 1),
        updated_at = NOW();
    
    -- Update usage count in main coupons table
    UPDATE business_coupons 
    SET usage_count = usage_count + 1 
    WHERE id = NEW.coupon_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updating analytics
CREATE TRIGGER update_analytics_on_redemption
    AFTER INSERT ON coupon_redemptions
    FOR EACH ROW
    EXECUTE FUNCTION update_coupon_analytics_on_redemption();

-- Function to update analytics on collection
CREATE OR REPLACE FUNCTION update_coupon_analytics_on_collection()
RETURNS TRIGGER AS $$
BEGIN
    -- Update analytics when a coupon is collected
    INSERT INTO coupon_analytics (coupon_id, business_id, total_collections, unique_collectors)
    SELECT NEW.coupon_id, bc.business_id, 1, 1
    FROM business_coupons bc
    WHERE bc.id = NEW.coupon_id
    ON CONFLICT (coupon_id) 
    DO UPDATE SET
        total_collections = coupon_analytics.total_collections + 1,
        unique_collectors = (
            SELECT COUNT(DISTINCT user_id) 
            FROM user_coupon_collections 
            WHERE coupon_id = NEW.coupon_id
        ),
        collection_rate = CASE 
            WHEN (coupon_analytics.conversion_funnel->>'views')::INTEGER > 0 
            THEN ((coupon_analytics.total_collections + 1)::DECIMAL / (coupon_analytics.conversion_funnel->>'views')::INTEGER * 100)
            ELSE 0 
        END,
        redemption_rate = CASE 
            WHEN coupon_analytics.total_collections + 1 > 0 
            THEN (coupon_analytics.total_redemptions::DECIMAL / (coupon_analytics.total_collections + 1) * 100)
            ELSE 0 
        END,
        updated_at = NOW();
    
    -- Update collection count in main coupons table
    UPDATE business_coupons 
    SET collection_count = collection_count + 1 
    WHERE id = NEW.coupon_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updating analytics on collection
CREATE TRIGGER update_analytics_on_collection
    AFTER INSERT ON user_coupon_collections
    FOR EACH ROW
    EXECUTE FUNCTION update_coupon_analytics_on_collection();

-- Function to automatically expire coupons
CREATE OR REPLACE FUNCTION expire_old_coupons()
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE business_coupons 
    SET status = 'expired' 
    WHERE status = 'active' 
    AND valid_until < NOW();
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    
    -- Also update user collections
    UPDATE user_coupon_collections 
    SET status = 'expired' 
    WHERE status = 'active' 
    AND expires_at < NOW();
    
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Function to validate coupon redemption
CREATE OR REPLACE FUNCTION validate_coupon_redemption(
    code VARCHAR,
    user_id_param UUID,
    original_amount_param DECIMAL
) RETURNS JSONB AS $$
DECLARE
    coupon_record business_coupons%ROWTYPE;
    user_usage_count INTEGER;
    result JSONB;
    discount_amount DECIMAL;
BEGIN
    -- Get coupon details
    SELECT * INTO coupon_record 
    FROM business_coupons 
    WHERE coupon_code = code;
    
    -- Check if coupon exists
    IF coupon_record.id IS NULL THEN
        RETURN '{"valid": false, "error": "Coupon not found"}'::JSONB;
    END IF;
    
    -- Check if coupon is active
    IF coupon_record.status != 'active' THEN
        RETURN '{"valid": false, "error": "Coupon is not active"}'::JSONB;
    END IF;
    
    -- Check validity dates
    IF NOW() < coupon_record.valid_from OR NOW() > coupon_record.valid_until THEN
        RETURN '{"valid": false, "error": "Coupon has expired"}'::JSONB;
    END IF;
    
    -- Check total usage limit
    IF coupon_record.total_limit IS NOT NULL AND coupon_record.usage_count >= coupon_record.total_limit THEN
        RETURN '{"valid": false, "error": "Coupon usage limit reached"}'::JSONB;
    END IF;
    
    -- Check user usage limit
    SELECT COUNT(*) INTO user_usage_count
    FROM coupon_redemptions
    WHERE coupon_id = coupon_record.id 
    AND user_id = user_id_param 
    AND status = 'completed';
    
    IF user_usage_count >= coupon_record.per_user_limit THEN
        RETURN '{"valid": false, "error": "User has reached usage limit for this coupon"}'::JSONB;
    END IF;
    
    -- Check minimum purchase amount
    IF coupon_record.min_purchase_amount IS NOT NULL AND original_amount_param < coupon_record.min_purchase_amount THEN
        RETURN jsonb_build_object(
            'valid', false, 
            'error', 'Minimum purchase amount is ₹' || coupon_record.min_purchase_amount
        );
    END IF;
    
    -- Calculate discount
    IF coupon_record.discount_type = 'percentage' THEN
        discount_amount := (original_amount_param * coupon_record.discount_value / 100);
        IF coupon_record.max_discount_amount IS NOT NULL AND discount_amount > coupon_record.max_discount_amount THEN
            discount_amount := coupon_record.max_discount_amount;
        END IF;
    ELSIF coupon_record.discount_type = 'fixed_amount' THEN
        discount_amount := LEAST(coupon_record.discount_value, original_amount_param);
    ELSE
        -- For other types, return fixed value for now
        discount_amount := coupon_record.discount_value;
    END IF;
    
    result := jsonb_build_object(
        'valid', true,
        'coupon_id', coupon_record.id,
        'business_id', coupon_record.business_id,
        'discount_amount', discount_amount,
        'final_amount', original_amount_param - discount_amount,
        'coupon_title', coupon_record.title,
        'discount_type', coupon_record.discount_type
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;