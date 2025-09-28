-- Debug and Fix Database Issues Script
-- Run this in your Supabase SQL Editor to check and fix the current state

-- 1. Check if favorites tables exist
SELECT 
  table_name, 
  table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('user_favorites_businesses', 'user_favorites_coupons', 'user_wishlist_items', 'coupon_drafts');

-- 2. Check if favorites functions exist
SELECT 
  routine_name, 
  routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN ('toggle_business_favorite', 'toggle_coupon_favorite', 'get_user_favorite_businesses', 'get_user_favorite_coupons');

-- 3. Create missing favorites tables if they don't exist
CREATE TABLE IF NOT EXISTS user_favorites_businesses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    business_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE(user_id, business_id)
);

CREATE TABLE IF NOT EXISTS user_favorites_coupons (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    coupon_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE(user_id, coupon_id)
);

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

-- 4. Create missing draft table
CREATE TABLE IF NOT EXISTS coupon_drafts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    business_id uuid NOT NULL,
    draft_name text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    form_data jsonb NOT NULL DEFAULT '{}',
    step_completed integer DEFAULT 1 CHECK (step_completed >= 1 AND step_completed <= 6),
    CONSTRAINT unique_draft_per_user_business UNIQUE (user_id, business_id, draft_name)
);

-- 5. Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_user_favorites_businesses_user_id ON user_favorites_businesses(user_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_coupons_user_id ON user_favorites_coupons(user_id);
CREATE INDEX IF NOT EXISTS idx_user_wishlist_items_user_id ON user_wishlist_items(user_id);
CREATE INDEX IF NOT EXISTS idx_coupon_drafts_user_id ON coupon_drafts(user_id);
CREATE INDEX IF NOT EXISTS idx_coupon_drafts_business_id ON coupon_drafts(business_id);

-- 6. Enable RLS on all tables
ALTER TABLE user_favorites_businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_favorites_coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_wishlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_drafts ENABLE ROW LEVEL SECURITY;

-- 7. Create or replace RLS policies
DROP POLICY IF EXISTS "Users can manage their own business favorites" ON user_favorites_businesses;
CREATE POLICY "Users can manage their own business favorites"
    ON user_favorites_businesses FOR ALL
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own coupon favorites" ON user_favorites_coupons;
CREATE POLICY "Users can manage their own coupon favorites"
    ON user_favorites_coupons FOR ALL
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own wishlist" ON user_wishlist_items;
CREATE POLICY "Users can manage their own wishlist"
    ON user_wishlist_items FOR ALL
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own coupon drafts" ON coupon_drafts;
CREATE POLICY "Users can manage their own coupon drafts"
    ON coupon_drafts FOR ALL
    USING (auth.uid() = user_id);

-- 8. Create or replace toggle functions
CREATE OR REPLACE FUNCTION toggle_business_favorite(business_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_uuid uuid := auth.uid();
    is_favorited boolean;
BEGIN
    IF user_uuid IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;

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
    IF user_uuid IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;

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

-- 9. Create draft management functions
CREATE OR REPLACE FUNCTION save_coupon_draft(
    p_business_id uuid,
    p_draft_name text,
    p_form_data jsonb,
    p_step_completed integer DEFAULT 1
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id uuid := auth.uid();
    v_draft_id uuid;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;
    
    INSERT INTO coupon_drafts (
        user_id,
        business_id,
        draft_name,
        form_data,
        step_completed,
        updated_at
    ) VALUES (
        v_user_id,
        p_business_id,
        p_draft_name,
        p_form_data,
        p_step_completed,
        now()
    )
    ON CONFLICT (user_id, business_id, draft_name) 
    DO UPDATE SET 
        form_data = EXCLUDED.form_data,
        step_completed = EXCLUDED.step_completed,
        updated_at = now()
    RETURNING id INTO v_draft_id;
    
    RETURN v_draft_id;
END;
$$;

CREATE OR REPLACE FUNCTION get_coupon_drafts(
    p_business_id uuid DEFAULT NULL,
    p_limit integer DEFAULT 50
)
RETURNS TABLE (
    id uuid,
    business_id uuid,
    business_name text,
    draft_name text,
    form_data jsonb,
    step_completed integer,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id uuid := auth.uid();
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;
    
    RETURN QUERY
    SELECT 
        cd.id,
        cd.business_id,
        COALESCE(b.business_name, 'Unknown Business') as business_name,
        cd.draft_name,
        cd.form_data,
        cd.step_completed,
        cd.created_at,
        cd.updated_at
    FROM coupon_drafts cd
    LEFT JOIN businesses b ON cd.business_id = b.id
    WHERE cd.user_id = v_user_id
    AND (p_business_id IS NULL OR cd.business_id = p_business_id)
    ORDER BY cd.updated_at DESC
    LIMIT p_limit;
END;
$$;

CREATE OR REPLACE FUNCTION delete_coupon_draft(p_draft_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id uuid := auth.uid();
    v_deleted_count integer;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;
    
    DELETE FROM coupon_drafts 
    WHERE id = p_draft_id AND user_id = v_user_id;
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    
    RETURN v_deleted_count > 0;
END;
$$;

-- 10. Check current business data and location coordinates
SELECT 
    id,
    business_name,
    latitude,
    longitude,
    address,
    city,
    state,
    status
FROM businesses 
WHERE status = 'active' 
ORDER BY business_name 
LIMIT 10;

-- Success message
SELECT 'Database setup completed successfully!' as status;