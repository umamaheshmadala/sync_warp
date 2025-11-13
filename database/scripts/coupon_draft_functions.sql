-- =========================================
-- Missing Coupon Draft Functions Fix
-- =========================================
-- This script creates the missing PostgreSQL functions required for coupon drafts functionality
-- These functions are called by the useCouponDrafts hook via supabase.rpc()

-- Function 1: Get coupon drafts for a business
-- Called by: useCouponDrafts.loadDrafts()
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
-- Called by: useCouponDrafts.saveDraft()
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
-- Called by: useCouponDrafts.deleteDraft()
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

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_coupon_drafts(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION save_coupon_draft(UUID, TEXT, JSONB, INTEGER, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_coupon_draft(UUID) TO authenticated;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_coupon_drafts_business_id ON coupon_drafts(business_id);
CREATE INDEX IF NOT EXISTS idx_coupon_drafts_created_by ON coupon_drafts(created_by);
CREATE INDEX IF NOT EXISTS idx_coupon_drafts_updated_at ON coupon_drafts(updated_at);

-- Test the functions (optional - can be run after creating the functions)
-- SELECT get_coupon_drafts(); -- Should work when authenticated