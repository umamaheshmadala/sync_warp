-- =========================================
-- FIXED COMPLETE FAVORITES SYSTEM DATABASE SETUP
-- =========================================
-- This script properly handles existing functions and creates all required components

-- ========================================= 
-- PART 1: DROP EXISTING FUNCTIONS FIRST
-- =========================================

-- Drop all existing functions to avoid conflicts
DROP FUNCTION IF EXISTS toggle_business_favorite(uuid);
DROP FUNCTION IF EXISTS toggle_coupon_favorite(uuid);
DROP FUNCTION IF EXISTS is_business_favorited(uuid);
DROP FUNCTION IF EXISTS is_coupon_favorited(uuid);
DROP FUNCTION IF EXISTS get_user_favorite_businesses(uuid, integer, integer);
DROP FUNCTION IF EXISTS get_user_favorite_coupons(uuid, integer, integer);
DROP FUNCTION IF EXISTS get_user_favorite_businesses();
DROP FUNCTION IF EXISTS get_user_favorite_coupons();

-- ========================================= 
-- PART 2: CREATE TABLES (IF NOT EXISTS)
-- =========================================

-- Create user_favorites_businesses table
CREATE TABLE IF NOT EXISTS user_favorites_businesses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    business_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE(user_id, business_id)
);

-- Create user_favorites_coupons table
CREATE TABLE IF NOT EXISTS user_favorites_coupons (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    coupon_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE(user_id, coupon_id)
);

-- Create user_wishlist_items table
CREATE TABLE IF NOT EXISTS user_wishlist_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    item_type text NOT NULL CHECK (item_type IN ('business', 'coupon', 'product')),
    item_id uuid NOT NULL,
    notes text,
    priority integer DEFAULT 1 CHECK (priority >= 1 AND priority <= 5),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE(user_id, item_type, item_id)
);

-- ========================================= 
-- PART 3: CREATE INDEXES
-- =========================================

-- Indexes for user_favorites_businesses
CREATE INDEX IF NOT EXISTS idx_user_favorites_businesses_user_id ON user_favorites_businesses(user_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_businesses_business_id ON user_favorites_businesses(business_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_businesses_created_at ON user_favorites_businesses(created_at);

-- Indexes for user_favorites_coupons
CREATE INDEX IF NOT EXISTS idx_user_favorites_coupons_user_id ON user_favorites_coupons(user_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_coupons_coupon_id ON user_favorites_coupons(coupon_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_coupons_created_at ON user_favorites_coupons(created_at);

-- Indexes for user_wishlist_items
CREATE INDEX IF NOT EXISTS idx_user_wishlist_items_user_id ON user_wishlist_items(user_id);
CREATE INDEX IF NOT EXISTS idx_user_wishlist_items_type_id ON user_wishlist_items(item_type, item_id);

-- ========================================= 
-- PART 4: ENABLE ROW LEVEL SECURITY
-- =========================================

-- Enable RLS on all tables
ALTER TABLE user_favorites_businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_favorites_coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_wishlist_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can manage their own business favorites" ON user_favorites_businesses;
DROP POLICY IF EXISTS "Users can manage their own coupon favorites" ON user_favorites_coupons;
DROP POLICY IF EXISTS "Users can manage their own wishlist" ON user_wishlist_items;

-- Create RLS policies
CREATE POLICY "Users can manage their own business favorites"
    ON user_favorites_businesses FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own coupon favorites"
    ON user_favorites_coupons FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own wishlist"
    ON user_wishlist_items FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ========================================= 
-- PART 5: CREATE NEW FUNCTIONS
-- =========================================

-- Function to toggle business favorite
CREATE FUNCTION toggle_business_favorite(business_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_uuid uuid;
    is_favorited boolean;
BEGIN
    -- Get current user ID
    user_uuid := auth.uid();
    
    IF user_uuid IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

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
CREATE FUNCTION toggle_coupon_favorite(coupon_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_uuid uuid;
    is_favorited boolean;
BEGIN
    -- Get current user ID
    user_uuid := auth.uid();
    
    IF user_uuid IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

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

-- Function to check if business is favorited
CREATE FUNCTION is_business_favorited(business_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_uuid uuid;
BEGIN
    user_uuid := auth.uid();
    
    IF user_uuid IS NULL THEN
        RETURN false;
    END IF;

    RETURN EXISTS(
        SELECT 1 FROM user_favorites_businesses 
        WHERE user_id = user_uuid AND business_id = business_uuid
    );
END;
$$;

-- Function to check if coupon is favorited
CREATE FUNCTION is_coupon_favorited(coupon_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_uuid uuid;
BEGIN
    user_uuid := auth.uid();
    
    IF user_uuid IS NULL THEN
        RETURN false;
    END IF;

    RETURN EXISTS(
        SELECT 1 FROM user_favorites_coupons 
        WHERE user_id = user_uuid AND coupon_id = coupon_uuid
    );
END;
$$;

-- Function to get user's favorite businesses with details
CREATE FUNCTION get_user_favorite_businesses(
    user_uuid uuid DEFAULT auth.uid(),
    limit_count integer DEFAULT 50,
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
    favorited_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF user_uuid IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;
    
    -- Only allow users to get their own favorites
    IF user_uuid != auth.uid() THEN
        RAISE EXCEPTION 'Permission denied';
    END IF;

    RETURN QUERY
    SELECT 
        b.id,
        COALESCE(b.business_name, 'Unknown Business') as business_name,
        COALESCE(b.business_type, 'Unknown') as business_type,
        COALESCE(b.description, '') as description,
        COALESCE(b.address, '') as address,
        COALESCE(b.latitude, 0.0) as latitude,
        COALESCE(b.longitude, 0.0) as longitude,
        COALESCE(b.average_rating, 0.0) as rating,
        ufb.created_at as favorited_at
    FROM user_favorites_businesses ufb
    LEFT JOIN businesses b ON b.id = ufb.business_id
    WHERE ufb.user_id = user_uuid
    ORDER BY ufb.created_at DESC
    LIMIT limit_count OFFSET offset_count;
END;
$$;

-- Function to get user's favorite coupons with details
CREATE FUNCTION get_user_favorite_coupons(
    user_uuid uuid DEFAULT auth.uid(),
    limit_count integer DEFAULT 50,
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
    favorited_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF user_uuid IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;
    
    -- Only allow users to get their own favorites
    IF user_uuid != auth.uid() THEN
        RAISE EXCEPTION 'Permission denied';
    END IF;

    RETURN QUERY
    SELECT 
        bc.id,
        COALESCE(bc.title, 'Unknown Coupon') as title,
        COALESCE(bc.description, '') as description,
        COALESCE(bc.discount_type, 'unknown') as discount_type,
        COALESCE(bc.discount_value, 0.0) as discount_value,
        COALESCE(bc.valid_until, NOW() + INTERVAL '30 days') as valid_until,
        COALESCE(b.id, gen_random_uuid()) as business_id,
        COALESCE(b.business_name, 'Unknown Business') as business_name,
        ufc.created_at as favorited_at
    FROM user_favorites_coupons ufc
    LEFT JOIN business_coupons bc ON bc.id = ufc.coupon_id
    LEFT JOIN businesses b ON b.id = bc.business_id
    WHERE ufc.user_id = user_uuid
    ORDER BY ufc.created_at DESC
    LIMIT limit_count OFFSET offset_count;
END;
$$;

-- ========================================= 
-- PART 6: GRANT PERMISSIONS
-- =========================================

-- Grant table permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON user_favorites_businesses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_favorites_coupons TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_wishlist_items TO authenticated;

-- Grant function permissions
GRANT EXECUTE ON FUNCTION toggle_business_favorite(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION toggle_coupon_favorite(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION is_business_favorited(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION is_coupon_favorited(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_favorite_businesses(uuid, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_favorite_coupons(uuid, integer, integer) TO authenticated;

-- ========================================= 
-- PART 7: VERIFICATION QUERIES
-- =========================================

-- Check that tables were created
SELECT 
    table_name, 
    table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('user_favorites_businesses', 'user_favorites_coupons', 'user_wishlist_items')
ORDER BY table_name;

-- Check that functions were created
SELECT 
    routine_name, 
    routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%favorite%'
ORDER BY routine_name;

-- Success message
SELECT 'Fixed database setup completed successfully! All favorites tables and functions are now available.' as status;