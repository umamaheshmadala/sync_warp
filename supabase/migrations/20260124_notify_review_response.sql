-- Story 11.3.8: Push Notification for Responses
-- Trigger on business_review_responses insert

-- 1. Create function to handle the notification logic
CREATE OR REPLACE FUNCTION notify_review_response()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_business_id UUID;
  v_business_name TEXT;
  v_pref_enabled BOOLEAN;
BEGIN
  -- Get review, business info, and user preferences
  SELECT
    br.user_id,
    br.business_id,
    b.business_name,
    COALESCE(p.notification_preferences->>'review_responses', 'true')::boolean -- Default to 'true' if preference is not set
  INTO
    v_user_id,
    v_business_id,
    v_business_name,
    v_pref_enabled
  FROM business_reviews br
  JOIN businesses b ON b.id = br.business_id
  LEFT JOIN profiles p ON p.id = br.user_id
  WHERE br.id = NEW.review_id;

  -- Only insert if preference is enabled (default to true if not set/migrated)
  -- Note: Application defaults might be true, but strictly respecting the field here.
  -- If null, we treated as true above.

  -- Based on useNotificationPreferences.ts, default is TRUE.
  -- So we should default to TRUE if key is missing.

  -- The COALESCE handles NULL for p.notification_preferences->>'review_responses'
  -- If p.notification_preferences itself is NULL (no profile or no preferences column),
  -- then p.notification_preferences->>'review_responses' would be NULL, and COALESCE handles it.

  IF v_pref_enabled THEN
      -- Insert into notification_log (used by current UI)
      INSERT INTO notification_log (
        user_id,
        notification_type,
        title,
        body,
        data,
        sent_at,
        opened
      ) VALUES (
        v_user_id,
        'review_response',
        v_business_name || ' responded to your review',
        LEFT(NEW.response_text, 100),
        jsonb_build_object(
          'review_id', NEW.review_id,
          'business_id', v_business_id,
          'response_id', NEW.id,
          'type', 'review_response',
          'action_url', '/business/' || v_business_id
        ),
        NOW(),
        FALSE
      );
  END IF;

  -- Also insert into in_app_notifications view source if needed,
  -- but usually 'notifications' table is the source.
  -- Checking previous migrations, 'notifications' seems to be the main table.

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create the trigger
DROP TRIGGER IF EXISTS on_review_response_created ON business_review_responses;
CREATE TRIGGER on_review_response_created
AFTER INSERT ON business_review_responses
FOR EACH ROW EXECUTE FUNCTION notify_review_response();
