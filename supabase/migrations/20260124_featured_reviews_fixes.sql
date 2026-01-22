-- ============================================
-- MIGRATION: Featured Reviews Fixes
-- Story: 11.3.6
-- Fixes: View definition and RLS policies
-- ============================================

-- 1. Update business_reviews_with_details view to include featured columns
DROP VIEW IF EXISTS business_reviews_with_details;

CREATE VIEW business_reviews_with_details AS
SELECT 
    br.id,
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
    br.is_featured,
    br.featured_at,
    br.featured_by,
    b.name AS business_name,
    get_public_profile_name(br.user_id) AS reviewer_name,
    get_public_profile_name(br.user_id) AS user_name,
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

-- Grant permissions (inherited from table but good to be explicit for view)
GRANT SELECT ON business_reviews_with_details TO authenticated, anon;

-- 2. Add RLS policy for business owners to feature/update reviews
-- This is needed because the default update policy only allows the review author to update.
CREATE POLICY "Business owners can feature reviews" 
ON business_reviews 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM businesses 
    WHERE businesses.id = business_reviews.business_id 
      AND businesses.owner_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM businesses 
    WHERE businesses.id = business_reviews.business_id 
      AND businesses.owner_id = auth.uid()
  )
);
