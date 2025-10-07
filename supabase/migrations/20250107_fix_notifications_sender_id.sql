-- Migration: Add sender_id column to notifications table
-- Date: 2025-01-07
-- Description: Adds missing sender_id column to notifications table to support sender relationship

-- Check if sender_id column exists, if not add it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'notifications' 
        AND column_name = 'sender_id'
    ) THEN
        -- Add sender_id column
        ALTER TABLE public.notifications 
        ADD COLUMN sender_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
        
        -- Add index for performance
        CREATE INDEX IF NOT EXISTS idx_notifications_sender_id 
        ON public.notifications(sender_id);
        
        RAISE NOTICE '✅ Added sender_id column to notifications table';
    ELSE
        RAISE NOTICE 'ℹ️ sender_id column already exists in notifications table';
    END IF;
END $$;

-- Add comment
COMMENT ON COLUMN public.notifications.sender_id IS 'User who triggered this notification (optional)';

-- Update notification_type enum to include review types if not already present
DO $$
BEGIN
    -- Check if review types exist, if not add them
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'business_review' AND enumtypid = 'notification_type'::regtype) THEN
        ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'business_review';
        RAISE NOTICE '✅ Added business_review to notification_type enum';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'connection_request' AND enumtypid = 'notification_type'::regtype) THEN
        ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'connection_request';
        RAISE NOTICE '✅ Added connection_request to notification_type enum';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'connection_accepted' AND enumtypid = 'notification_type'::regtype) THEN
        ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'connection_accepted';
        RAISE NOTICE '✅ Added connection_accepted to notification_type enum';
    END IF;
END $$;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Notifications table migration completed successfully';
  RAISE NOTICE '   - sender_id column added with FK to profiles';
  RAISE NOTICE '   - Index created for sender_id';
  RAISE NOTICE '   - notification_type enum updated';
END $$;
