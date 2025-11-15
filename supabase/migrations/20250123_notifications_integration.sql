-- =====================================================================================
-- Migration: Notifications Integration for Friends System
-- Version: 1.0.0
-- Description: Integrates friends module with existing notifications system
--              - Adds friend notification types
--              - Creates auto-notification triggers
--              - Tracks friend activities for feed/analytics
-- Dependencies: 
--   - notifications table (Epic 8)
--   - friend_requests table (Story 9.1.3)
--   - friendships table (Story 9.1.2)
--   - following table (Story 9.1.4)
--   - blocked_users table (Story 9.1.5)
-- =====================================================================================

-- =====================================================================================
-- STEP 1: Add Friend Notification Types
-- =====================================================================================

-- Drop existing constraint if exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'notifications_type_check'
  ) THEN
    ALTER TABLE notifications DROP CONSTRAINT notifications_type_check;
  END IF;
END $$;

-- Add new constraint including friend notification types
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
CHECK (type IN (
  -- Epic 8 types (preserve existing)
  'message', 'mention', 'reaction', 'like', 'comment', 'reply',
  -- Epic 9.1 friend types (new)
  'friend_request', 'friend_accepted', 'friend_removed',
  -- Allow extensibility
  'system', 'update', 'announcement'
));

COMMENT ON CONSTRAINT notifications_type_check ON notifications IS
  'Valid notification types including friend-related events from Epic 9.1';

-- =====================================================================================
-- STEP 2: Create Friend Activities Table
-- =====================================================================================

CREATE TABLE IF NOT EXISTS friend_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN (
    'sent_friend_request',
    'received_friend_request',
    'accepted_friend_request',
    'rejected_friend_request',
    'cancelled_friend_request',
    'removed_friend',
    'started_following',
    'stopped_following',
    'blocked_user',
    'unblocked_user'
  )),
  related_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_friend_activities_user_id 
  ON friend_activities(user_id);

CREATE INDEX IF NOT EXISTS idx_friend_activities_created_at 
  ON friend_activities(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_friend_activities_type 
  ON friend_activities(activity_type);

CREATE INDEX IF NOT EXISTS idx_friend_activities_related_user 
  ON friend_activities(related_user_id) 
  WHERE related_user_id IS NOT NULL;

-- Composite index for user activity feed
CREATE INDEX IF NOT EXISTS idx_friend_activities_user_feed 
  ON friend_activities(user_id, created_at DESC);

COMMENT ON TABLE friend_activities IS
  'Tracks all friend-related activities for activity feed and analytics';

-- =====================================================================================
-- STEP 3: RLS Policies for Friend Activities
-- =====================================================================================

ALTER TABLE friend_activities ENABLE ROW LEVEL SECURITY;

-- Users can view their own activities
CREATE POLICY friend_activities_select_own
  ON friend_activities
  FOR SELECT
  USING (auth.uid() = user_id);

-- System can insert activities (via triggers)
CREATE POLICY friend_activities_insert_system
  ON friend_activities
  FOR INSERT
  WITH CHECK (true); -- Triggers use SECURITY DEFINER

-- No direct updates/deletes (immutable audit log)
-- Only automatic cleanup via retention policy

COMMENT ON POLICY friend_activities_select_own ON friend_activities IS
  'Users can view their own friend activity history';

-- =====================================================================================
-- STEP 4: Notification Creation Function
-- =====================================================================================

CREATE OR REPLACE FUNCTION create_friend_notification(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_data JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_notification_id UUID;
  v_is_blocked BOOLEAN;
BEGIN
  -- Check if users have blocked each other
  SELECT EXISTS (
    SELECT 1 FROM blocked_users
    WHERE (blocker_id = p_user_id AND blocked_id = auth.uid())
       OR (blocker_id = auth.uid() AND blocked_id = p_user_id)
  ) INTO v_is_blocked;

  -- Don't create notification if blocked
  IF v_is_blocked THEN
    RETURN NULL;
  END IF;

  -- Create notification
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    data,
    read
  ) VALUES (
    p_user_id,
    p_type,
    p_title,
    p_message,
    p_data,
    false
  )
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$;

COMMENT ON FUNCTION create_friend_notification IS
  'Creates friend-related notifications with blocking check';

-- =====================================================================================
-- STEP 5: Log Friend Activity Function
-- =====================================================================================

CREATE OR REPLACE FUNCTION log_friend_activity(
  p_user_id UUID,
  p_activity_type TEXT,
  p_related_user_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_activity_id UUID;
BEGIN
  INSERT INTO friend_activities (
    user_id,
    activity_type,
    related_user_id,
    metadata
  ) VALUES (
    p_user_id,
    p_activity_type,
    p_related_user_id,
    p_metadata
  )
  RETURNING id INTO v_activity_id;

  RETURN v_activity_id;
END;
$$;

COMMENT ON FUNCTION log_friend_activity IS
  'Logs friend-related activities for activity feed';

-- =====================================================================================
-- STEP 6: Trigger Function - Friend Request Sent
-- =====================================================================================

CREATE OR REPLACE FUNCTION notify_friend_request_sent()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender_profile RECORD;
BEGIN
  -- Only trigger on new pending requests
  IF NEW.status != 'pending' OR TG_OP = 'UPDATE' THEN
    RETURN NEW;
  END IF;

  -- Get sender profile info
  SELECT username, avatar_url, full_name
  INTO v_sender_profile
  FROM profiles
  WHERE user_id = NEW.sender_id;

  -- Create notification for receiver
  PERFORM create_friend_notification(
    NEW.receiver_id,
    'friend_request',
    'New Friend Request',
    COALESCE(v_sender_profile.full_name, v_sender_profile.username, 'Someone') || ' sent you a friend request',
    jsonb_build_object(
      'request_id', NEW.id,
      'sender_id', NEW.sender_id,
      'sender_username', v_sender_profile.username,
      'sender_avatar', v_sender_profile.avatar_url,
      'sender_name', v_sender_profile.full_name
    )
  );

  -- Log activity for sender
  PERFORM log_friend_activity(
    NEW.sender_id,
    'sent_friend_request',
    NEW.receiver_id,
    jsonb_build_object('request_id', NEW.id)
  );

  -- Log activity for receiver
  PERFORM log_friend_activity(
    NEW.receiver_id,
    'received_friend_request',
    NEW.sender_id,
    jsonb_build_object('request_id', NEW.id)
  );

  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_notify_friend_request ON friend_requests;
CREATE TRIGGER trigger_notify_friend_request
  AFTER INSERT ON friend_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_friend_request_sent();

COMMENT ON FUNCTION notify_friend_request_sent IS
  'Creates notification when friend request is sent';

-- =====================================================================================
-- STEP 7: Trigger Function - Friend Request Status Change
-- =====================================================================================

CREATE OR REPLACE FUNCTION notify_friend_request_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_receiver_profile RECORD;
BEGIN
  -- Only trigger on status changes
  IF TG_OP = 'INSERT' OR OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Get receiver profile info
  SELECT username, avatar_url, full_name
  INTO v_receiver_profile
  FROM profiles
  WHERE user_id = NEW.receiver_id;

  -- Handle accepted requests
  IF NEW.status = 'accepted' THEN
    -- Notify sender that request was accepted
    PERFORM create_friend_notification(
      NEW.sender_id,
      'friend_accepted',
      'Friend Request Accepted',
      COALESCE(v_receiver_profile.full_name, v_receiver_profile.username, 'Someone') || ' accepted your friend request',
      jsonb_build_object(
        'request_id', NEW.id,
        'friend_id', NEW.receiver_id,
        'friend_username', v_receiver_profile.username,
        'friend_avatar', v_receiver_profile.avatar_url,
        'friend_name', v_receiver_profile.full_name
      )
    );

    -- Log activity for both users
    PERFORM log_friend_activity(
      NEW.sender_id,
      'accepted_friend_request',
      NEW.receiver_id,
      jsonb_build_object('request_id', NEW.id)
    );

    PERFORM log_friend_activity(
      NEW.receiver_id,
      'accepted_friend_request',
      NEW.sender_id,
      jsonb_build_object('request_id', NEW.id)
    );

  -- Handle rejected requests
  ELSIF NEW.status = 'rejected' THEN
    -- Log activity (no notification - privacy)
    PERFORM log_friend_activity(
      NEW.receiver_id,
      'rejected_friend_request',
      NEW.sender_id,
      jsonb_build_object('request_id', NEW.id)
    );

  -- Handle cancelled requests
  ELSIF NEW.status = 'cancelled' THEN
    -- Log activity (no notification)
    PERFORM log_friend_activity(
      NEW.sender_id,
      'cancelled_friend_request',
      NEW.receiver_id,
      jsonb_build_object('request_id', NEW.id)
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_notify_friend_status ON friend_requests;
CREATE TRIGGER trigger_notify_friend_status
  AFTER UPDATE ON friend_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_friend_request_status();

COMMENT ON FUNCTION notify_friend_request_status IS
  'Creates notifications when friend request status changes';

-- =====================================================================================
-- STEP 8: Trigger Function - Friendship Removed
-- =====================================================================================

CREATE OR REPLACE FUNCTION notify_friendship_removed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only trigger when friendship ends (active -> inactive)
  IF OLD.is_active = true AND NEW.is_active = false THEN
    -- Log activity for both users (no notification - privacy decision)
    PERFORM log_friend_activity(
      OLD.user_id,
      'removed_friend',
      OLD.friend_user_id,
      jsonb_build_object('friendship_id', OLD.id, 'ended_at', NEW.updated_at)
    );

    PERFORM log_friend_activity(
      OLD.friend_user_id,
      'removed_friend',
      OLD.user_id,
      jsonb_build_object('friendship_id', OLD.id, 'ended_at', NEW.updated_at)
    );

    -- Optional: Uncomment to notify when unfriended (most platforms don't do this)
    -- PERFORM create_friend_notification(
    --   OLD.friend_user_id,
    --   'friend_removed',
    --   'Friendship Ended',
    --   'You are no longer friends with ' || (SELECT username FROM profiles WHERE user_id = OLD.user_id),
    --   jsonb_build_object('user_id', OLD.user_id)
    -- );
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_notify_friendship_removed ON friendships;
CREATE TRIGGER trigger_notify_friendship_removed
  AFTER UPDATE ON friendships
  FOR EACH ROW
  EXECUTE FUNCTION notify_friendship_removed();

COMMENT ON FUNCTION notify_friendship_removed IS
  'Logs activity when friendship is removed (notification disabled by default)';

-- =====================================================================================
-- STEP 9: Trigger Function - Follow Actions
-- =====================================================================================

CREATE OR REPLACE FUNCTION log_follow_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Log started following
    PERFORM log_friend_activity(
      NEW.follower_id,
      'started_following',
      NEW.following_id,
      jsonb_build_object('follow_id', NEW.id)
    );

  ELSIF TG_OP = 'DELETE' THEN
    -- Log stopped following
    PERFORM log_friend_activity(
      OLD.follower_id,
      'stopped_following',
      OLD.following_id,
      jsonb_build_object('follow_id', OLD.id)
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_log_follow_insert ON following;
CREATE TRIGGER trigger_log_follow_insert
  AFTER INSERT ON following
  FOR EACH ROW
  EXECUTE FUNCTION log_follow_activity();

DROP TRIGGER IF EXISTS trigger_log_follow_delete ON following;
CREATE TRIGGER trigger_log_follow_delete
  AFTER DELETE ON following
  FOR EACH ROW
  EXECUTE FUNCTION log_follow_activity();

COMMENT ON FUNCTION log_follow_activity IS
  'Logs follow/unfollow activities (no notifications)';

-- =====================================================================================
-- STEP 10: Trigger Function - Block Actions
-- =====================================================================================

CREATE OR REPLACE FUNCTION log_block_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Log blocked user
    PERFORM log_friend_activity(
      NEW.blocker_id,
      'blocked_user',
      NEW.blocked_id,
      jsonb_build_object('block_id', NEW.id)
    );

  ELSIF TG_OP = 'DELETE' THEN
    -- Log unblocked user
    PERFORM log_friend_activity(
      OLD.blocker_id,
      'unblocked_user',
      OLD.blocked_id,
      jsonb_build_object('block_id', OLD.id)
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_log_block_insert ON blocked_users;
CREATE TRIGGER trigger_log_block_insert
  AFTER INSERT ON blocked_users
  FOR EACH ROW
  EXECUTE FUNCTION log_block_activity();

DROP TRIGGER IF EXISTS trigger_log_block_delete ON blocked_users;
CREATE TRIGGER trigger_log_block_delete
  AFTER DELETE ON blocked_users
  FOR EACH ROW
  EXECUTE FUNCTION log_block_activity();

COMMENT ON FUNCTION log_block_activity IS
  'Logs block/unblock activities (no notifications)';

-- =====================================================================================
-- STEP 11: Helper Function - Get User Activity Feed
-- =====================================================================================

CREATE OR REPLACE FUNCTION get_user_activity_feed(
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  activity_type TEXT,
  related_user_id UUID,
  related_username TEXT,
  related_avatar TEXT,
  related_full_name TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    fa.id,
    fa.activity_type,
    fa.related_user_id,
    p.username AS related_username,
    p.avatar_url AS related_avatar,
    p.full_name AS related_full_name,
    fa.metadata,
    fa.created_at
  FROM friend_activities fa
  LEFT JOIN profiles p ON p.user_id = fa.related_user_id
  WHERE fa.user_id = auth.uid()
    AND fa.related_user_id IS NOT NULL
    -- Exclude blocked users
    AND NOT EXISTS (
      SELECT 1 FROM blocked_users bu
      WHERE (bu.blocker_id = auth.uid() AND bu.blocked_id = fa.related_user_id)
         OR (bu.blocker_id = fa.related_user_id AND bu.blocked_id = auth.uid())
    )
  ORDER BY fa.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

COMMENT ON FUNCTION get_user_activity_feed IS
  'Retrieves user activity feed with profile enrichment';

-- =====================================================================================
-- STEP 12: Cleanup - Activity Retention Policy Function
-- =====================================================================================

CREATE OR REPLACE FUNCTION cleanup_old_activities()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  -- Delete activities older than 90 days
  DELETE FROM friend_activities
  WHERE created_at < NOW() - INTERVAL '90 days';

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  RETURN v_deleted_count;
END;
$$;

COMMENT ON FUNCTION cleanup_old_activities IS
  'Removes friend activities older than 90 days (call via scheduled job)';

-- =====================================================================================
-- STEP 13: Grant Permissions
-- =====================================================================================

-- Grant execute on functions to authenticated users
GRANT EXECUTE ON FUNCTION create_friend_notification TO authenticated;
GRANT EXECUTE ON FUNCTION log_friend_activity TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_activity_feed TO authenticated;

-- Grant select on friend_activities to authenticated users (via RLS)
GRANT SELECT ON friend_activities TO authenticated;

-- =====================================================================================
-- Migration Complete
-- =====================================================================================

-- Verification queries (commented out for production)
-- SELECT * FROM friend_activities ORDER BY created_at DESC LIMIT 10;
-- SELECT * FROM notifications WHERE type IN ('friend_request', 'friend_accepted', 'friend_removed') LIMIT 10;
-- SELECT get_user_activity_feed(20, 0);

DO $$
BEGIN
  RAISE NOTICE '✅ Story 9.1.8 - Notifications Integration migration completed successfully';
  RAISE NOTICE '📊 Created: friend_activities table, 6 triggers, 4 helper functions';
  RAISE NOTICE '🔔 Friend notification types: friend_request, friend_accepted, friend_removed';
  RAISE NOTICE '📝 Activity tracking: requests, friendships, follows, blocks';
  RAISE NOTICE '🔒 RLS policies and blocking checks enabled';
END $$;
