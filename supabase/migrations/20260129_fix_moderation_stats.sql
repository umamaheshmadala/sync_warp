-- Migration: Fix Review Statistics and Resubmission Logic
-- Story 11.4.1: Pre-Moderation System Polish

-- 1. Fix get_business_review_stats to only include approved reviews in public counts
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
    COUNT(*) FILTER (WHERE array_length(photo_urls, 1) > 0)::BIGINT AS reviews_with_photos,
    CASE
      WHEN COUNT(*) = 0 THEN 0
      ELSE ROUND(AVG(array_length(tags, 1))::NUMERIC, 1)
    END AS average_tags_per_review
  FROM business_reviews
  WHERE business_id = p_business_id
  AND deleted_at IS NULL
  AND moderation_status = 'approved'; -- <-- Added filter to exclude pending/rejected reviews
END;
$function$;

-- 2. Update handle_review_resubmission trigger to be more robust
-- Ensures that ANY edit to content resets status (unless auto-approved)
-- and correctly manages resubmission flags/moderator info.
CREATE OR REPLACE FUNCTION public.handle_review_resubmission()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Only trigger if content changed (text or photos)
    IF (NEW.review_text IS DISTINCT FROM OLD.review_text 
        OR NEW.photo_urls IS DISTINCT FROM OLD.photo_urls)
    THEN
        -- Set is_resubmission flag ONLY if it was previously rejected
        IF OLD.moderation_status = 'rejected' THEN
            NEW.is_resubmission := true;
        END IF;

        -- Auto-approve rule: reviews with NO text and NO photos are instantly approved
        IF (NEW.review_text IS NULL OR TRIM(NEW.review_text) = '') 
           AND (NEW.photo_urls IS NULL OR array_length(NEW.photo_urls, 1) IS NULL OR array_length(NEW.photo_urls, 1) = 0)
        THEN
            NEW.moderation_status := 'approved';
            NEW.rejection_reason := null;
            NEW.moderated_at := null;
            NEW.moderated_by := null;
        ELSE
            -- If it wasn't already pending, reset it to pending for review
            -- This applies to BOTH approved and rejected reviews that now have content
            IF OLD.moderation_status != 'pending' THEN
                NEW.moderation_status := 'pending';
                NEW.rejection_reason := null;
                NEW.moderated_at := null;
                NEW.moderated_by := null;
            END IF;
        END IF;

        -- Track edit history
        NEW.is_edited := true;
        NEW.edit_count := COALESCE(OLD.edit_count, 0) + 1;
    END IF;
    RETURN NEW;
END;
$function$;
