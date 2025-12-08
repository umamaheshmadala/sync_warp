-- Migration: Enable Realtime for Notification Log
-- Story: 8.6.6 In-App Notifications
-- Description: Enables supabase_realtime for the notification_log table so the frontend can listen for new message alerts.

BEGIN;

  -- Add table to the publication configuration
  -- This allows listening to changes on this table via the Realtime API
  ALTER PUBLICATION supabase_realtime ADD TABLE notification_log;

COMMIT;
