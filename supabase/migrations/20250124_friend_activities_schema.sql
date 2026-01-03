-- Migration: 20250124_friend_activities_schema.sql
-- Create friend activities tracking system

-- Create friend activities tracking system

-- Drop existing table if it exists (schema change)
DROP TABLE IF EXISTS friend_activities CASCADE;

-- Create friend_activities table
CREATE TABLE IF NOT EXISTS friend_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN (
    'friend_added',
    'friend_joined',
    'deal_liked',
    'deal_saved',
    'deal_shared'
  )),
  related_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  related_deal_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure we don't log duplicate activities
  UNIQUE(user_id, activity_type, related_user_id, related_deal_id, created_at)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_friend_activities_user_id 
ON friend_activities(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_friend_activities_created_at 
ON friend_activities(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_friend_activities_type 
ON friend_activities(activity_type);

-- Enable RLS
ALTER TABLE friend_activities ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see activities from their friends
CREATE POLICY "Users see friends' activities"
ON friend_activities FOR SELECT
USING (
  user_id IN (
    SELECT friend_id FROM friendships 
    WHERE user_id = auth.uid() AND status = 'active'
  )
  OR user_id = auth.uid() -- Users can see their own activities
);

-- RLS Policy: System can insert activities
CREATE POLICY "System can insert activities"
ON friend_activities FOR INSERT
WITH CHECK (true);

-- Function: Check if user's activity should be logged (respect privacy)
CREATE OR REPLACE FUNCTION should_log_activity(target_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  search_visible BOOLEAN;
BEGIN
  -- Check if user has search visibility enabled
  -- We use search_visibility as a proxy for "public activity" for now, 
  -- or default to true if setting doesn't exist
  SELECT COALESCE(privacy_settings->>'search_visibility', 'true')::boolean
  INTO search_visible
  FROM profiles
  WHERE id = target_user_id;
  
  RETURN COALESCE(search_visible, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Log when users become friends
CREATE OR REPLACE FUNCTION log_friend_added()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log when friendship becomes active
  IF NEW.status = 'active' AND (OLD.status IS NULL OR OLD.status != 'active') THEN
    -- Check privacy settings before logging
    IF should_log_activity(NEW.user_id) THEN
      INSERT INTO friend_activities (user_id, activity_type, related_user_id)
      VALUES (NEW.user_id, 'friend_added', NEW.friend_id)
      ON CONFLICT DO NOTHING;
    END IF;
    
    -- Also log for the friend
    IF should_log_activity(NEW.friend_id) THEN
      INSERT INTO friend_activities (user_id, activity_type, related_user_id)
      VALUES (NEW.friend_id, 'friend_added', NEW.user_id)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_log_friend_added ON friendships;
CREATE TRIGGER trigger_log_friend_added
  AFTER INSERT OR UPDATE ON friendships
  FOR EACH ROW
  EXECUTE FUNCTION log_friend_added();

-- RPC: Get friend activities (paginated)
CREATE OR REPLACE FUNCTION get_friend_activities(
  page_limit INT DEFAULT 20,
  page_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  user_full_name TEXT,
  user_avatar_url TEXT,
  activity_type TEXT,
  related_user_id UUID,
  related_user_full_name TEXT,
  related_deal_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    fa.id,
    fa.user_id,
    p1.full_name as user_full_name,
    p1.avatar_url as user_avatar_url,
    fa.activity_type,
    fa.related_user_id,
    p2.full_name as related_user_full_name,
    fa.related_deal_id,
    fa.metadata,
    fa.created_at
  FROM friend_activities fa
  JOIN profiles p1 ON fa.user_id = p1.id
  LEFT JOIN profiles p2 ON fa.related_user_id = p2.id
  WHERE fa.user_id IN (
    SELECT f.friend_id FROM friendships f
    WHERE f.user_id = auth.uid() AND f.status = 'active'
  )
  ORDER BY fa.created_at DESC
  LIMIT page_limit
  OFFSET page_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_friend_activities(INT, INT) TO authenticated;

-- RPC: Get activity count
CREATE OR REPLACE FUNCTION get_activity_count()
RETURNS INT AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INT
    FROM friend_activities
    WHERE user_id IN (
      SELECT friend_id FROM friendships 
      WHERE user_id = auth.uid() AND status = 'active'
    )
    AND created_at > NOW() - INTERVAL '7 days'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_activity_count() TO authenticated;
