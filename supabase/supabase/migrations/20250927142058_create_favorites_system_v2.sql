-- Migration: Create Favorites System V2
-- Description: User favorites for businesses and coupons with analytics
-- Date: 2025-09-27

-- Drop existing tables if they exist (for clean recreation)
DROP TABLE IF EXISTS user_favorites_businesses CASCADE;
DROP TABLE IF EXISTS user_favorites_coupons CASCADE;
DROP TABLE IF EXISTS user_wishlist_items CASCADE;
DROP TABLE IF EXISTS search_analytics CASCADE;
DROP MATERIALIZED VIEW IF EXISTS popular_search_terms CASCADE;

-- Create user_favorites_businesses table
CREATE TABLE user_favorites_businesses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    business_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    
    -- Ensure unique favorites per user
    UNIQUE(user_id, business_id)
);

-- Create user_favorites_coupons table
CREATE TABLE user_favorites_coupons (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    coupon_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    
    -- Ensure unique favorites per user
    UNIQUE(user_id, coupon_id)
);

-- Create user_wishlist_items table for future wishlist functionality
CREATE TABLE user_wishlist_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    item_type text NOT NULL CHECK (item_type IN ('business', 'coupon', 'product')),
    item_id uuid NOT NULL,
    notes text,
    priority integer DEFAULT 1 CHECK (priority >= 1 AND priority <= 5),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    
    -- Ensure unique wishlist items per user
    UNIQUE(user_id, item_type, item_id)
);

-- Create search analytics table
CREATE TABLE search_analytics (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid,
    search_term text NOT NULL,
    filters jsonb DEFAULT '{}',
    results_count integer DEFAULT 0,
    clicked_result_id uuid,
    clicked_result_type text CHECK (clicked_result_type IN ('business', 'coupon')),
    search_time_ms integer,
    created_at timestamp with time zone DEFAULT now(),
    session_id text,
    user_agent text,
    ip_address inet
);

-- Create indexes for performance
CREATE INDEX idx_user_favorites_businesses_user_id ON user_favorites_businesses(user_id);
CREATE INDEX idx_user_favorites_businesses_business_id ON user_favorites_businesses(business_id);
CREATE INDEX idx_user_favorites_businesses_created_at ON user_favorites_businesses(created_at);

CREATE INDEX idx_user_favorites_coupons_user_id ON user_favorites_coupons(user_id);
CREATE INDEX idx_user_favorites_coupons_coupon_id ON user_favorites_coupons(coupon_id);
CREATE INDEX idx_user_favorites_coupons_created_at ON user_favorites_coupons(created_at);

CREATE INDEX idx_user_wishlist_items_user_id ON user_wishlist_items(user_id);
CREATE INDEX idx_user_wishlist_items_type_id ON user_wishlist_items(item_type, item_id);

-- Search analytics indexes
CREATE INDEX idx_search_analytics_term ON search_analytics(search_term);
CREATE INDEX idx_search_analytics_user_id ON search_analytics(user_id);
CREATE INDEX idx_search_analytics_created_at ON search_analytics(created_at);

-- Enable Row Level Security (RLS) policies

-- RLS for user_favorites_businesses
ALTER TABLE user_favorites_businesses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own business favorites"
    ON user_favorites_businesses FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own business favorites"
    ON user_favorites_businesses FOR ALL
    USING (auth.uid() = user_id);

-- RLS for user_favorites_coupons
ALTER TABLE user_favorites_coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own coupon favorites"
    ON user_favorites_coupons FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own coupon favorites"
    ON user_favorites_coupons FOR ALL
    USING (auth.uid() = user_id);

-- RLS for user_wishlist_items
ALTER TABLE user_wishlist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own wishlist"
    ON user_wishlist_items FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own wishlist"
    ON user_wishlist_items FOR ALL
    USING (auth.uid() = user_id);

-- RLS for search_analytics (users can only see their own, admins can see all)
ALTER TABLE search_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own search analytics"
    ON search_analytics FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Anyone can insert search analytics"
    ON search_analytics FOR INSERT
    WITH CHECK (true); -- Allow anonymous search tracking

-- Create functions for favorites management

-- Function to toggle business favorite
CREATE OR REPLACE FUNCTION toggle_business_favorite(business_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_uuid uuid := auth.uid();
    is_favorited boolean;
BEGIN
    -- Check if already favorited
    SELECT EXISTS(
        SELECT 1 FROM user_favorites_businesses 
        WHERE user_id = user_uuid AND business_id = business_uuid
    ) INTO is_favorited;
    
    IF is_favorited THEN
        -- Remove from favorites
        DELETE FROM user_favorites_businesses 
        WHERE user_id = user_uuid AND business_id = business_uuid;
        RETURN false;
    ELSE
        -- Add to favorites
        INSERT INTO user_favorites_businesses (user_id, business_id)
        VALUES (user_uuid, business_uuid)
        ON CONFLICT (user_id, business_id) DO NOTHING;
        RETURN true;
    END IF;
END;
$$;

-- Function to toggle coupon favorite
CREATE OR REPLACE FUNCTION toggle_coupon_favorite(coupon_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_uuid uuid := auth.uid();
    is_favorited boolean;
BEGIN
    -- Check if already favorited
    SELECT EXISTS(
        SELECT 1 FROM user_favorites_coupons 
        WHERE user_id = user_uuid AND coupon_id = coupon_uuid
    ) INTO is_favorited;
    
    IF is_favorited THEN
        -- Remove from favorites
        DELETE FROM user_favorites_coupons 
        WHERE user_id = user_uuid AND coupon_id = coupon_uuid;
        RETURN false;
    ELSE
        -- Add to favorites
        INSERT INTO user_favorites_coupons (user_id, coupon_id)
        VALUES (user_uuid, coupon_uuid)
        ON CONFLICT (user_id, coupon_id) DO NOTHING;
        RETURN true;
    END IF;
END;
$$;

-- Function to get user's favorite businesses with details
CREATE OR REPLACE FUNCTION get_user_favorite_businesses(
    user_uuid uuid DEFAULT auth.uid(),
    limit_count integer DEFAULT 20,
    offset_count integer DEFAULT 0
)
RETURNS TABLE(
    business_id uuid,
    business_name text,
    business_type text,
    description text,
    address text,
    latitude double precision,
    longitude double precision,
    rating double precision,
    active_coupons_count bigint,
    favorited_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        b.id,
        b.business_name,
        b.business_type,
        b.description,
        b.address,
        b.latitude,
        b.longitude,
        COALESCE(b.average_rating, 0.0) as rating,
        COUNT(bc.id) as active_coupons_count,
        ufb.created_at as favorited_at
    FROM user_favorites_businesses ufb
    JOIN businesses b ON b.id = ufb.business_id
    LEFT JOIN business_coupons bc ON bc.business_id = b.id 
        AND bc.status = 'active' 
        AND bc.valid_until > NOW()
    WHERE ufb.user_id = user_uuid
    GROUP BY b.id, b.business_name, b.business_type, b.description, 
             b.address, b.latitude, b.longitude, b.average_rating, ufb.created_at
    ORDER BY ufb.created_at DESC
    LIMIT limit_count OFFSET offset_count;
END;
$$;

-- Function to get user's favorite coupons with details
CREATE OR REPLACE FUNCTION get_user_favorite_coupons(
    user_uuid uuid DEFAULT auth.uid(),
    limit_count integer DEFAULT 20,
    offset_count integer DEFAULT 0
)
RETURNS TABLE(
    coupon_id uuid,
    title text,
    description text,
    discount_type text,
    discount_value double precision,
    valid_until timestamp with time zone,
    business_id uuid,
    business_name text,
    is_collected boolean,
    favorited_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        bc.id,
        bc.title,
        bc.description,
        bc.discount_type,
        bc.discount_value,
        bc.valid_until,
        b.id as business_id,
        b.business_name,
        EXISTS(
            SELECT 1 FROM user_coupon_collections ucc 
            WHERE ucc.user_id = user_uuid AND ucc.coupon_id = bc.id
        ) as is_collected,
        ufc.created_at as favorited_at
    FROM user_favorites_coupons ufc
    JOIN business_coupons bc ON bc.id = ufc.coupon_id
    JOIN businesses b ON b.id = bc.business_id
    WHERE ufc.user_id = user_uuid
        AND bc.status = 'active'
        AND bc.valid_until > NOW()
    ORDER BY ufc.created_at DESC
    LIMIT limit_count OFFSET offset_count;
END;
$$;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_favorites_businesses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_favorites_coupons TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_wishlist_items TO authenticated;
GRANT INSERT ON search_analytics TO anon, authenticated;

GRANT EXECUTE ON FUNCTION toggle_business_favorite TO authenticated;
GRANT EXECUTE ON FUNCTION toggle_coupon_favorite TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_favorite_businesses TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_favorite_coupons TO authenticated;

-- Migration completed successfully
SELECT 'Favorites system migration V2 completed successfully' as status;