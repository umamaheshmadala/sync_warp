-- ============================================
-- MIGRATION: Story 11.3.7 All Reviews Enhancements
-- 1. Update view to include helpful_count
-- ============================================

CREATE OR REPLACE VIEW business_reviews_with_details AS
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
    brr.updated_at AS response_updated_at,
    (SELECT COUNT(*) FROM review_helpful_votes WHERE review_id = br.id) as helpful_count
FROM business_reviews br
LEFT JOIN businesses b ON br.business_id = b.id
LEFT JOIN profiles p ON br.user_id = p.id
LEFT JOIN business_review_responses brr ON br.id = brr.review_id;

GRANT SELECT ON business_reviews_with_details TO authenticated, anon;
