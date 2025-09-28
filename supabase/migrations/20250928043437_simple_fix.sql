-- Drop all existing versions and create the simplest possible working function
DROP FUNCTION IF EXISTS get_coupon_drafts(uuid, integer);
DROP FUNCTION IF EXISTS get_coupon_drafts();

-- Create simple function that returns JSON
CREATE OR REPLACE FUNCTION get_coupon_drafts()
RETURNS json
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    json_agg(
      json_build_object(
        'id', cd.id,
        'business_id', cd.business_id,
        'business_name', 'Business Name',
        'draft_name', cd.draft_name,
        'form_data', cd.form_data,
        'step_completed', cd.step_completed,
        'created_at', cd.created_at,
        'updated_at', cd.updated_at
      )
    ),
    '[]'::json
  )
  FROM coupon_drafts cd
  WHERE cd.user_id = auth.uid()
  ORDER BY cd.updated_at DESC
  LIMIT 50;
$$;

GRANT EXECUTE ON FUNCTION get_coupon_drafts() TO authenticated;