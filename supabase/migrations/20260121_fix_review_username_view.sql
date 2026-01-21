-- Story 11.2.2: Fix User Name Display in Reviews View
-- Fixing the issue where reviews show 'SyncWarp User' because full_name is null
-- Fallback to username if full_name is missing

-- 1. Update business_reviews_with_details view
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
    COALESCE(p.full_name, p.username, 'Anonymous') AS user_name,
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
