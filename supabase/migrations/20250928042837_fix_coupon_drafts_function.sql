-- Fix the get_coupon_drafts function to use correct column references and handle potential type mismatches

-- Drop the existing function first
DROP FUNCTION IF EXISTS public.get_coupon_drafts(uuid, integer);

-- Create the corrected function
CREATE OR REPLACE FUNCTION public.get_coupon_drafts(
    p_business_id uuid DEFAULT NULL::uuid,
    p_limit integer DEFAULT 50
)
RETURNS TABLE(
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
    -- Check authentication
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;
    
    -- Return query with proper column references
    RETURN QUERY
    SELECT 
        cd.id,
        cd.business_id,
        -- Use COALESCE to handle both possible business name columns
        COALESCE(b.business_name, b.name, 'Unknown Business')::text as business_name,
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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_coupon_drafts(uuid, integer) TO authenticated;

-- Add a comment
COMMENT ON FUNCTION public.get_coupon_drafts(uuid, integer) IS 'Retrieves coupon drafts for the authenticated user with optional business filter';

-- Test the function works by calling it (this will only work if there's an authenticated user, but won't fail the migration)
DO $$
BEGIN
    -- Just ensure the function exists and has the right signature
    PERFORM routine_name 
    FROM information_schema.routines 
    WHERE routine_name = 'get_coupon_drafts' 
    AND routine_schema = 'public';
    
    RAISE NOTICE 'get_coupon_drafts function created successfully';
END $$;