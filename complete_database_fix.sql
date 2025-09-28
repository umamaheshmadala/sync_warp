-- =========================================
-- COMPLETE DATABASE FIX FOR SYNC_WARP
-- =========================================
-- This script fixes all missing database components causing the issues:
-- 1. "Failed to load drafts" - missing coupon draft functions
-- 2. Heart icon state issues - missing favorites tables 
-- 3. Location filter issues - missing RLS policies
-- 4. Missing database functions for favorites and drafts

-- ========================================= 
-- PART 1: MISSING COUPON DRAFT FUNCTIONS
-- =========================================

-- Function 1: Get coupon drafts for a business
CREATE OR REPLACE FUNCTION get_coupon_drafts(
    p_business_id UUID DEFAULT NULL,
    p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
    id UUID,
    business_id UUID,
    business_name TEXT,
    draft_name TEXT,
    form_data JSONB,
    step_completed INTEGER,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Verify user is authenticated
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    -- If no business_id provided, get all drafts for user's businesses
    IF p_business_id IS NULL THEN
        RETURN QUERY
        SELECT 
            cd.id,
            cd.business_id,
            b.business_name,
            cd.draft_name,
            cd.form_data,
            cd.step_completed,
            cd.created_at,
            cd.updated_at
        FROM coupon_drafts cd
        INNER JOIN businesses b ON cd.business_id = b.id
        WHERE cd.created_by = auth.uid()
        ORDER BY cd.updated_at DESC
        LIMIT p_limit;
    ELSE
        -- Verify user owns the business
        IF NOT EXISTS (
            SELECT 1 FROM businesses 
            WHERE id = p_business_id AND user_id = auth.uid()
        ) THEN
            RAISE EXCEPTION 'Permission denied: You can only access drafts for your own businesses';
        END IF;

        RETURN QUERY
        SELECT 
            cd.id,
            cd.business_id,
            b.business_name,
            cd.draft_name,
            cd.form_data,
            cd.step_completed,
            cd.created_at,
            cd.updated_at
        FROM coupon_drafts cd
        INNER JOIN businesses b ON cd.business_id = b.id
        WHERE cd.business_id = p_business_id 
        AND cd.created_by = auth.uid()
        ORDER BY cd.updated_at DESC
        LIMIT p_limit;
    END IF;
END;
$$;

-- Function 2: Save or update a coupon draft
CREATE OR REPLACE FUNCTION save_coupon_draft(
    p_business_id UUID,
    p_draft_name TEXT,
    p_form_data JSONB,
    p_step_completed INTEGER DEFAULT 1,
    p_draft_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_draft_id UUID;
BEGIN
    -- Verify user is authenticated
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    -- Verify user owns the business
    IF NOT EXISTS (
        SELECT 1 FROM businesses 
        WHERE id = p_business_id AND user_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Permission denied: You can only create drafts for your own businesses';
    END IF;

    -- Validate inputs
    IF p_draft_name IS NULL OR trim(p_draft_name) = '' THEN
        RAISE EXCEPTION 'Draft name is required';
    END IF;

    IF p_form_data IS NULL THEN
        RAISE EXCEPTION 'Form data is required';
    END IF;

    -- Check if updating existing draft
    IF p_draft_id IS NOT NULL THEN
        -- Verify user owns the draft
        IF NOT EXISTS (
            SELECT 1 FROM coupon_drafts 
            WHERE id = p_draft_id AND created_by = auth.uid()
        ) THEN
            RAISE EXCEPTION 'Draft not found or permission denied';
        END IF;

        UPDATE coupon_drafts
        SET 
            draft_name = trim(p_draft_name),
            form_data = p_form_data,
            step_completed = p_step_completed,
            updated_at = NOW()
        WHERE id = p_draft_id;

        v_draft_id := p_draft_id;
    ELSE
        -- Create new draft
        INSERT INTO coupon_drafts (
            business_id,
            draft_name,
            form_data,
            step_completed,
            created_by
        ) VALUES (
            p_business_id,
            trim(p_draft_name),
            p_form_data,
            p_step_completed,
            auth.uid()
        ) RETURNING id INTO v_draft_id;
    END IF;

    RETURN v_draft_id;
END;
$$;

-- Function 3: Delete a coupon draft
CREATE OR REPLACE FUNCTION delete_coupon_draft(
    p_draft_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_deleted BOOLEAN := FALSE;
BEGIN
    -- Verify user is authenticated
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    -- Delete the draft (only if owned by current user)
    DELETE FROM coupon_drafts
    WHERE id = p_draft_id AND created_by = auth.uid();

    -- Check if anything was deleted
    GET DIAGNOSTICS v_deleted = ROW_COUNT;

    IF v_deleted = 0 THEN
        RAISE EXCEPTION 'Draft not found or permission denied';
    END IF;

    RETURN TRUE;
END;
$$;

-- =========================================
-- PART 2: FAVORITES FUNCTIONS (if missing)
-- =========================================

-- Toggle business favorite function
CREATE OR REPLACE FUNCTION toggle_business_favorite(
    business_id_param UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_id_val UUID;
    is_favorited BOOLEAN;
BEGIN
    -- Get current user ID
    user_id_val := auth.uid();
    
    IF user_id_val IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    -- Check if already favorited
    SELECT EXISTS(
        SELECT 1 FROM user_favorites_businesses 
        WHERE user_id = user_id_val AND business_id = business_id_param
    ) INTO is_favorited;

    IF is_favorited THEN
        -- Remove from favorites
        DELETE FROM user_favorites_businesses 
        WHERE user_id = user_id_val AND business_id = business_id_param;
        RETURN FALSE;
    ELSE
        -- Add to favorites
        INSERT INTO user_favorites_businesses (user_id, business_id)
        VALUES (user_id_val, business_id_param)
        ON CONFLICT (user_id, business_id) DO NOTHING;
        RETURN TRUE;
    END IF;
END;
$$;

-- Toggle coupon favorite function
CREATE OR REPLACE FUNCTION toggle_coupon_favorite(
    coupon_id_param UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_id_val UUID;
    is_favorited BOOLEAN;
BEGIN
    -- Get current user ID
    user_id_val := auth.uid();
    
    IF user_id_val IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    -- Check if already favorited
    SELECT EXISTS(
        SELECT 1 FROM user_favorites_coupons 
        WHERE user_id = user_id_val AND coupon_id = coupon_id_param
    ) INTO is_favorited;

    IF is_favorited THEN
        -- Remove from favorites
        DELETE FROM user_favorites_coupons 
        WHERE user_id = user_id_val AND coupon_id = coupon_id_param;
        RETURN FALSE;
    ELSE
        -- Add to favorites
        INSERT INTO user_favorites_coupons (user_id, coupon_id)
        VALUES (user_id_val, coupon_id_param)
        ON CONFLICT (user_id, coupon_id) DO NOTHING;
        RETURN TRUE;
    END IF;
END;
$$;

-- =========================================
-- PART 3: GRANT PERMISSIONS
-- =========================================

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_coupon_drafts(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION save_coupon_draft(UUID, TEXT, JSONB, INTEGER, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_coupon_draft(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION toggle_business_favorite(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION toggle_coupon_favorite(UUID) TO authenticated;

-- =========================================
-- PART 4: PERFORMANCE INDEXES
-- =========================================

-- Indexes for coupon drafts
CREATE INDEX IF NOT EXISTS idx_coupon_drafts_business_id ON coupon_drafts(business_id);
CREATE INDEX IF NOT EXISTS idx_coupon_drafts_created_by ON coupon_drafts(created_by);
CREATE INDEX IF NOT EXISTS idx_coupon_drafts_updated_at ON coupon_drafts(updated_at);

-- Indexes for favorites
CREATE INDEX IF NOT EXISTS idx_user_favorites_businesses_user_id ON user_favorites_businesses(user_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_businesses_business_id ON user_favorites_businesses(business_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_coupons_user_id ON user_favorites_coupons(user_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_coupons_coupon_id ON user_favorites_coupons(coupon_id);

-- =========================================
-- PART 5: RLS POLICY UPDATES (if needed)
-- =========================================

-- Ensure RLS is enabled and policies exist for coupon_drafts
ALTER TABLE coupon_drafts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can only access their own coupon drafts" ON coupon_drafts;

-- Create RLS policy for coupon_drafts
CREATE POLICY "Users can only access their own coupon drafts" 
ON coupon_drafts FOR ALL 
TO authenticated 
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

-- =========================================
-- VERIFICATION QUERIES
-- =========================================

-- Test that all tables exist (run these after the script)
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN (
--   'businesses', 'user_favorites_businesses', 'user_favorites_coupons', 
--   'user_wishlist_items', 'coupon_drafts', 'business_coupons'
-- );

-- Test that all functions exist
-- SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name IN (
--   'get_coupon_drafts', 'save_coupon_draft', 'delete_coupon_draft', 
--   'toggle_business_favorite', 'toggle_coupon_favorite'
-- );

-- If you have a user session, test the functions:
-- SELECT get_coupon_drafts(); -- Should return empty array or your drafts