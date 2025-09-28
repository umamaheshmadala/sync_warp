-- Manual Migration: Create Favorites System
-- Run this in your Supabase SQL Editor to create the favorites system

-- Drop existing if needed
DROP TABLE IF EXISTS user_favorites_businesses CASCADE;
DROP TABLE IF EXISTS user_favorites_coupons CASCADE;
DROP TABLE IF EXISTS user_wishlist_items CASCADE;

-- Create user_favorites_businesses table
CREATE TABLE user_favorites_businesses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    business_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE(user_id, business_id)
);

-- Create user_favorites_coupons table
CREATE TABLE user_favorites_coupons (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    coupon_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE(user_id, coupon_id)
);

-- Create user_wishlist_items table
CREATE TABLE user_wishlist_items (
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

-- Create indexes
CREATE INDEX idx_user_favorites_businesses_user_id ON user_favorites_businesses(user_id);
CREATE INDEX idx_user_favorites_coupons_user_id ON user_favorites_coupons(user_id);
CREATE INDEX idx_user_wishlist_items_user_id ON user_wishlist_items(user_id);

-- Enable RLS
ALTER TABLE user_favorites_businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_favorites_coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_wishlist_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can manage their own business favorites"
    ON user_favorites_businesses FOR ALL
    USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own coupon favorites"
    ON user_favorites_coupons FOR ALL
    USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own wishlist"
    ON user_wishlist_items FOR ALL
    USING (auth.uid() = user_id);

-- Create functions
CREATE OR REPLACE FUNCTION toggle_business_favorite(business_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_uuid uuid := auth.uid();
    is_favorited boolean;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM user_favorites_businesses 
        WHERE user_id = user_uuid AND business_id = business_uuid
    ) INTO is_favorited;
    
    IF is_favorited THEN
        DELETE FROM user_favorites_businesses 
        WHERE user_id = user_uuid AND business_id = business_uuid;
        RETURN false;
    ELSE
        INSERT INTO user_favorites_businesses (user_id, business_id)
        VALUES (user_uuid, business_uuid)
        ON CONFLICT (user_id, business_id) DO NOTHING;
        RETURN true;
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION toggle_coupon_favorite(coupon_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_uuid uuid := auth.uid();
    is_favorited boolean;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM user_favorites_coupons 
        WHERE user_id = user_uuid AND coupon_id = coupon_uuid
    ) INTO is_favorited;
    
    IF is_favorited THEN
        DELETE FROM user_favorites_coupons 
        WHERE user_id = user_uuid AND coupon_id = coupon_uuid;
        RETURN false;
    ELSE
        INSERT INTO user_favorites_coupons (user_id, coupon_id)
        VALUES (user_uuid, coupon_uuid)
        ON CONFLICT (user_id, coupon_id) DO NOTHING;
        RETURN true;
    END IF;
END;
$$;

-- Success message
SELECT 'Favorites system created successfully!' as status;