-- Story 11.2.2: Update Views and Functions for Multi-Photo Support (Fixed)

-- 1. Update business_reviews_with_details view
-- Drop first to allow structure change
DROP VIEW IF EXISTS business_reviews_with_details;

CREATE OR REPLACE VIEW business_reviews_with_details AS
 SELECT br.id,
    br.business_id,
    br.user_id,
    br.recommendation,
    br.review_text,
    br.photo_url,
    br.photo_urls, -- Added column
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
    p.full_name AS user_name,
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

-- Grant permissions again just in case drop removed them
GRANT SELECT ON business_reviews_with_details TO authenticated;

-- 2. Update user_review_activity view
CREATE OR REPLACE VIEW user_review_activity AS
 SELECT br.user_id,
    count(*)::integer AS total_reviews,
    count(*) FILTER (WHERE br.recommendation = true)::integer AS positive_reviews,
    count(*) FILTER (WHERE br.recommendation = false)::integer AS negative_reviews,
    count(*) FILTER (WHERE br.review_text IS NOT NULL AND br.review_text != '')::integer AS reviews_with_text,
    count(*) FILTER (WHERE array_length(br.photo_urls, 1) > 0)::integer AS reviews_with_photos, -- Updated check
    max(br.created_at) AS last_review_date
   FROM business_reviews br
  WHERE br.deleted_at IS NULL
  GROUP BY br.user_id;

-- 3. Update get_business_review_stats function
CREATE OR REPLACE FUNCTION public.get_business_review_stats(p_business_id uuid)
 RETURNS TABLE(total_reviews bigint, recommend_count bigint, not_recommend_count bigint, recommend_percentage numeric, reviews_with_text bigint, reviews_with_photos bigint, average_tags_per_review numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT AS total_reviews,
    COUNT(*) FILTER (WHERE recommendation = TRUE)::BIGINT AS recommend_count,
    COUNT(*) FILTER (WHERE recommendation = FALSE)::BIGINT AS not_recommend_count,
    CASE 
      WHEN COUNT(*) = 0 THEN 0
      ELSE ROUND((COUNT(*) FILTER (WHERE recommendation = TRUE)::NUMERIC / COUNT(*)::NUMERIC) * 100, 1)
    END AS recommend_percentage,
    COUNT(*) FILTER (WHERE review_text IS NOT NULL AND review_text != '')::BIGINT AS reviews_with_text,
    COUNT(*) FILTER (WHERE array_length(photo_urls, 1) > 0)::BIGINT AS reviews_with_photos, -- Updated check
    CASE
      WHEN COUNT(*) = 0 THEN 0
      ELSE ROUND(AVG(array_length(tags, 1))::NUMERIC, 1)
    END AS average_tags_per_review
  FROM business_reviews
  WHERE business_id = p_business_id
  AND deleted_at IS NULL; -- EXCLUDE DELETED REVIEWS
END;
$function$;
