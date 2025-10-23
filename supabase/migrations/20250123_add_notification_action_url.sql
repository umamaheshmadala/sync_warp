-- Migration: Add missing notification columns
-- Description: Adds action_url, image_url, icon, and priority columns
-- Created: 2025-01-23
-- Issue: Product creation fails with "column action_url does not exist"

-- Add action_url column
ALTER TABLE follower_notifications 
ADD COLUMN IF NOT EXISTS action_url TEXT;

-- Add image_url column (for notification thumbnails)
ALTER TABLE follower_notifications 
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Add icon column (for notification icons/emojis)
ALTER TABLE follower_notifications 
ADD COLUMN IF NOT EXISTS icon TEXT;

-- Add priority column (for notification sorting)
ALTER TABLE follower_notifications 
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent'));

-- Add comments for documentation
COMMENT ON COLUMN follower_notifications.action_url IS 'URL to navigate to when notification is clicked';
COMMENT ON COLUMN follower_notifications.image_url IS 'Thumbnail image for the notification';
COMMENT ON COLUMN follower_notifications.icon IS 'Icon or emoji to display with notification';
COMMENT ON COLUMN follower_notifications.priority IS 'Notification priority level for sorting/display';

-- Create index for action_url queries
CREATE INDEX IF NOT EXISTS idx_follower_notifications_action_url 
ON follower_notifications(action_url) WHERE action_url IS NOT NULL;

-- Verify columns were added
DO $$
DECLARE
  col_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO col_count
  FROM information_schema.columns
  WHERE table_name = 'follower_notifications'
  AND column_name IN ('action_url', 'image_url', 'icon', 'priority');
  
  IF col_count = 4 THEN
    RAISE NOTICE '✅ All missing columns added successfully';
  ELSE
    RAISE NOTICE '⚠️ Only % of 4 columns were added', col_count;
  END IF;
END $$;
