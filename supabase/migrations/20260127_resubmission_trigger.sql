-- Migration: Add is_resubmission column and trigger for re-submission detection
-- Purpose: When a rejected review is edited, automatically set it back to pending with a re-submission flag

-- Step 1: Add column if not exists
ALTER TABLE business_reviews ADD COLUMN IF NOT EXISTS is_resubmission boolean DEFAULT false;

-- Step 2: Create trigger function for re-submission detection
CREATE OR REPLACE FUNCTION handle_review_resubmission()
RETURNS TRIGGER AS $$
BEGIN
    -- If previously rejected and content changed (text or photos)
    IF OLD.moderation_status = 'rejected' 
       AND (NEW.review_text IS DISTINCT FROM OLD.review_text 
            OR NEW.photo_urls IS DISTINCT FROM OLD.photo_urls)
    THEN
        NEW.moderation_status := 'pending';
        NEW.is_resubmission := true;
        NEW.is_edited := true;
        NEW.edit_count := COALESCE(OLD.edit_count, 0) + 1;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Attach trigger (drop first if exists to avoid duplicates)
DROP TRIGGER IF EXISTS trigger_review_resubmission ON business_reviews;
CREATE TRIGGER trigger_review_resubmission
    BEFORE UPDATE ON business_reviews
    FOR EACH ROW
    EXECUTE FUNCTION handle_review_resubmission();

-- Step 4: Create notification trigger for re-submissions
CREATE OR REPLACE FUNCTION notify_admins_resubmission()
RETURNS TRIGGER AS $$
DECLARE
    admin_user RECORD;
    business_name TEXT;
    reviewer_name TEXT;
BEGIN
    -- Only fire if this is a re-submission (status changed from rejected to pending)
    IF NEW.moderation_status = 'pending' AND OLD.moderation_status = 'rejected' AND NEW.is_resubmission = true THEN
        -- Get business name
        SELECT name INTO business_name FROM businesses WHERE id = NEW.business_id;
        
        -- Get reviewer name
        SELECT full_name INTO reviewer_name FROM profiles WHERE id = NEW.user_id;
        
        -- Notify all admins
        FOR admin_user IN 
            SELECT id FROM profiles WHERE is_admin = true
        LOOP
            INSERT INTO notification_log (
                user_id, notification_type, title, body, data
            ) VALUES (
                admin_user.id,
                'admin_review_resubmission',
                'Re-Submitted Review Requires Moderation',
                'A previously rejected review for "' || COALESCE(business_name, 'Unknown Business') || '" was edited by ' || COALESCE(reviewer_name, 'a user'),
                jsonb_build_object(
                    'type', 'admin_review_resubmission',
                    'review_id', NEW.id,
                    'business_id', NEW.business_id,
                    'url', '/admin/moderation?tab=pending'
                )
            );
        END LOOP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Attach notification trigger
DROP TRIGGER IF EXISTS trigger_notify_resubmission ON business_reviews;
CREATE TRIGGER trigger_notify_resubmission
    AFTER UPDATE ON business_reviews
    FOR EACH ROW
    EXECUTE FUNCTION notify_admins_resubmission();
