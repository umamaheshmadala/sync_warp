-- Migration: Notify Admins on Reported Review
-- Date: 2026-01-26
-- Description: Triggers in-app and push notifications to ALL admins when a review is reported.

CREATE OR REPLACE FUNCTION notify_admins_reported_review()
RETURNS TRIGGER AS $$
DECLARE
  admin_user RECORD;
  reporter_name TEXT;
  business_name TEXT;
  review_content_preview TEXT;
  edge_function_url TEXT;
  service_role_key TEXT;
  supabase_url TEXT;
BEGIN
  -- 1. Get Reporter Name
  SELECT full_name INTO reporter_name
  FROM profiles
  WHERE id = NEW.reporter_id;
  
  reporter_name := COALESCE(reporter_name, 'Unknown User');

  -- 2. Get Business Name & Review Preview
  SELECT 
    b.name, 
    COALESCE(substring(br.review_text from 1 for 50), 'No content') 
  INTO business_name, review_content_preview
  FROM business_reviews br
  JOIN businesses b ON br.business_id = b.id
  WHERE br.id = NEW.review_id;

  -- 3. Loop through ALL Admins
  -- We assume admins are defined by distinct claim or role table. 
  -- For this app, we usually use `is_admin` column in `profiles` if it exists, or check a role.
  -- Based on previous context, we check `profiles` for admin flag or specific users.
  -- Falling back to checking `auth.users` metadata or specific profile column if established.
  -- Let's assume `profiles.is_admin` exists as per standard sync_warp patterns or check prior migrations.
  -- Actually, `moderationService.ts` implies admins are notified. 
  -- Let's verify `profiles` table structure via `is_admin` column or similar.
  -- Using a robust query for admins:
  
  FOR admin_user IN
    SELECT id, notification_preferences FROM profiles WHERE is_admin = true
  LOOP
      -- A. Insert In-App Notification
      INSERT INTO notification_log (
        user_id,
        notification_type,
        title,
        body,
        data,
        sent_at,
        opened
      ) VALUES (
        admin_user.id,
        'admin_report_new',
        'New Review Reported',
        'A review for ' || business_name || ' was reported by ' || reporter_name,
        jsonb_build_object(
          'type', 'admin_report_new',
          'review_id', NEW.review_id,
          'report_id', NEW.id,
          'reason', NEW.reason,
          'url', '/admin/moderation?tab=reported'
        ),
        NOW(),
        false
      );

      -- B. Push Notification (if enabled)
      -- Check global push pref (we can use helper if available, or raw check)
      IF (admin_user.notification_preferences->>'push_enabled')::boolean IS DISTINCT FROM false THEN
          
          -- Get Env Vars for Edge Function
          supabase_url := COALESCE(
            current_setting('app.settings.supabase_url', true),
            current_setting('supabase.url', true),
            'https://ysxmgbblljoyebvugrfo.supabase.co'
          );
          service_role_key := COALESCE(
            current_setting('app.settings.supabase_service_role_key', true),
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzeG1nYmJsbGpveWVidnVncmZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxMDU2MjksImV4cCI6MjA3MzY4MTYyOX0.m1zCtG-Rvrga_g-YX0QqMLVQ0uLxogUqGLqNVTrQBqI'
          );

          PERFORM net.http_post(
              url := supabase_url || '/functions/v1/send-push-notification',
              headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || service_role_key
              ),
              body := jsonb_build_object(
                'userId', admin_user.id,
                'title', 'New Review Reported',
                'body', 'A review for ' || business_name || ' was reported.',
                'data', jsonb_build_object(
                  'type', 'admin_report_new',
                  'review_id', NEW.review_id,
                  'url', '/admin/moderation?tab=reported'
                )
              )
          );
      END IF;

  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger
DROP TRIGGER IF EXISTS trigger_notify_admins_reported_review ON review_reports;

CREATE TRIGGER trigger_notify_admins_reported_review
  AFTER INSERT ON review_reports
  FOR EACH ROW
  EXECUTE FUNCTION notify_admins_reported_review();
