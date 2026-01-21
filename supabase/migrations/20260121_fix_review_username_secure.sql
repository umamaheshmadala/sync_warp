-- Story 11.2.2: Fix Review Username Visibility & Cache Breaking
-- Problem: Users see "Anonymous" due to RLS or caching issues on 'user_name'
-- Solution: 
-- 1. Use SECURITY DEFINER function to bypass profiles RLS
-- 2. Rename column to 'reviewer_name' to break any client/server caching of 'user_name'

-- 1. Create secure helper function (if not exists or update)
CREATE OR REPLACE FUNCTION get_public_profile_name(profile_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p_name text;
BEGIN
  SELECT COALESCE(NULLIF(full_name, ''), NULLIF(username, ''), 'Anonymous')
  INTO p_name
  FROM profiles
  WHERE id = profile_id;
  
  RETURN COALESCE(p_name, 'Anonymous');
END;
$$;

GRANT EXECUTE ON FUNCTION get_public_profile_name(uuid) TO authenticated;

-- 2. Update view with NEW COLUMN NAME
DROP VIEW IF EXISTS business_reviews_with_details;

CREATE OR REPLACE VIEW business_reviews_with_details AS
 SELECT br.id,
    br.business_id,
    br.user_id,
    br.recommendation,
    br.review_text,
    br.photo_url,
    br.photo_urls,
    br.tags,
    br.checkin_id,
    br.created_at,
    br.updated_at,
    br.is_edited,
    br.edit_count,
    br.deleted_at,
    br.deleted_by,
    br.deletion_reason,
    b.name AS business_name,
    get_public_profile_name(br.user_id) AS reviewer_name, -- RENAMED from user_name
    get_public_profile_name(br.user_id) AS user_name,     -- Keep for backward compat (optional, but good for safety)
    p.avatar_url AS user_avatar,
    p.city AS user_city,
    brr.id AS response_id,
    brr.response_text,
    brr.created_at AS response_created_at,
    brr.updated_at AS response_updated_at
   FROM business_reviews br
     LEFT JOIN businesses b ON br.business_id = b.id
     LEFT JOIN profiles p ON br.user_id = p.id
     LEFT JOIN business_review_responses brr ON br.id = brr.review_id;

-- Grant permissions
GRANT SELECT ON business_reviews_with_details TO authenticated;
