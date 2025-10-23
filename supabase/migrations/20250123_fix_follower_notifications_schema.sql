-- Migration: Fix follower_notifications schema
-- Description: Adds 'message' column as an alias for 'body' to fix compatibility
-- Created: 2025-01-23
-- Issue: Product creation fails with "column message does not exist"

-- Add message column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='follower_notifications' AND column_name='message'
  ) THEN
    -- Add message column as an alias/duplicate of body
    ALTER TABLE follower_notifications ADD COLUMN message TEXT;
    
    -- Update existing rows to copy body to message
    UPDATE follower_notifications SET message = body WHERE message IS NULL;
    
    -- Create trigger to keep message and body in sync
    CREATE OR REPLACE FUNCTION sync_notification_message()
    RETURNS TRIGGER AS $func$
    BEGIN
      -- If body is set, copy to message
      IF NEW.body IS NOT NULL THEN
        NEW.message := NEW.body;
      END IF;
      
      -- If message is set, copy to body
      IF NEW.message IS NOT NULL AND NEW.body IS NULL THEN
        NEW.body := NEW.message;
      END IF;
      
      RETURN NEW;
    END;
    $func$ LANGUAGE plpgsql;
    
    DROP TRIGGER IF EXISTS sync_notification_message_trigger ON follower_notifications;
    CREATE TRIGGER sync_notification_message_trigger
      BEFORE INSERT OR UPDATE ON follower_notifications
      FOR EACH ROW
      EXECUTE FUNCTION sync_notification_message();
    
    RAISE NOTICE 'Added message column to follower_notifications table';
  ELSE
    RAISE NOTICE 'message column already exists in follower_notifications table';
  END IF;
END $$;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_follower_notifications_user_business 
  ON follower_notifications(user_id, business_id);

-- Add comment
COMMENT ON COLUMN follower_notifications.message IS 'Notification message text (synced with body column for compatibility)';

-- Verify the column exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='follower_notifications' AND column_name='message'
  ) THEN
    RAISE NOTICE '✅ Migration successful: message column added to follower_notifications';
  ELSE
    RAISE EXCEPTION '❌ Migration failed: message column not added';
  END IF;
END $$;
