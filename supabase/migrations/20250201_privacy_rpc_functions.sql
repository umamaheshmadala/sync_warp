-- Migration: 20250201_privacy_rpc_functions.sql

-- 1. can_view_profile
DROP FUNCTION IF EXISTS can_view_profile(UUID, UUID) CASCADE;
CREATE OR REPLACE FUNCTION can_view_profile(
  viewer_id UUID,
  profile_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  privacy_setting TEXT;
  is_friend BOOLEAN;
  mutual_friends_exist BOOLEAN;
BEGIN
  -- User can always view their own profile
  IF viewer_id = profile_id THEN
    RETURN TRUE;
  END IF;

  -- Get target profile's privacy setting
  SELECT COALESCE(privacy_settings->>'profile_visibility', 'public')
  INTO privacy_setting
  FROM profiles
  WHERE id = profile_id;

  -- If public, allow
  IF privacy_setting = 'public' THEN
    RETURN TRUE;
  END IF;

  -- Check friendship status
  SELECT EXISTS (
    SELECT 1 FROM friendships
    WHERE (user_id = viewer_id AND friend_id = profile_id)
       OR (user_id = profile_id AND friend_id = viewer_id)
    AND status = 'active'
  ) INTO is_friend;

  -- If friends only
  IF privacy_setting = 'friends' THEN
    RETURN is_friend;
  END IF;

  -- If friends of friends
  IF privacy_setting = 'friends_of_friends' THEN
    IF is_friend THEN
      RETURN TRUE;
    END IF;

    -- Check mutuals
    SELECT EXISTS (
      SELECT 1
      FROM friendships f1
      JOIN friendships f2 ON f1.friend_id = f2.user_id
      WHERE f1.user_id = viewer_id
        AND f2.friend_id = profile_id
        AND f1.status = 'active'
        AND f2.status = 'active'
    ) INTO mutual_friends_exist;
    
    RETURN mutual_friends_exist;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION can_view_profile(UUID, UUID) TO authenticated;

-- 2. search_users_secure
CREATE OR REPLACE FUNCTION search_users_secure(
  search_query TEXT
)
RETURNS TABLE (
  id UUID,
  username TEXT,
  full_name TEXT,
  avatar_url TEXT,
  similarity FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.username,
    p.full_name,
    p.avatar_url,
    similarity(p.username, search_query) as similarity
  FROM profiles p
  WHERE 
    -- Basic search match
    (p.username ILIKE '%' || search_query || '%' OR p.full_name ILIKE '%' || search_query || '%')
    -- Privacy check: search_visibility must be true
    AND COALESCE((p.privacy_settings->>'search_visibility')::boolean, true) = true
    -- Exclude self
    AND p.id != auth.uid()
    -- Exclude blocked users (assuming block_list table exists from Epic 9.4)
    AND NOT EXISTS (
      SELECT 1 FROM block_list b 
      WHERE b.blocker_id = p.id AND b.blocked_id = auth.uid()
    )
    AND NOT EXISTS (
      SELECT 1 FROM block_list b 
      WHERE b.blocker_id = auth.uid() AND b.blocked_id = p.id
    )
  ORDER BY similarity DESC
  LIMIT 20;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION search_users_secure(TEXT) TO authenticated;

-- 3. can_see_online_status
CREATE OR REPLACE FUNCTION can_see_online_status(
  viewer_id UUID,
  target_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  privacy_setting TEXT;
  is_friend BOOLEAN;
BEGIN
  IF viewer_id = target_id THEN
    RETURN TRUE;
  END IF;

  SELECT COALESCE(privacy_settings->>'online_status_visibility', 'friends')
  INTO privacy_setting
  FROM profiles
  WHERE id = target_id;

  IF privacy_setting = 'everyone' THEN
    RETURN TRUE;
  END IF;

  IF privacy_setting = 'no_one' THEN
    RETURN FALSE;
  END IF;

  -- Check friendship for 'friends' setting
  SELECT EXISTS (
    SELECT 1 FROM friendships
    WHERE (user_id = viewer_id AND friend_id = target_id)
       OR (user_id = target_id AND friend_id = viewer_id)
    AND status = 'active'
  ) INTO is_friend;

  RETURN is_friend;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION can_see_online_status(UUID, UUID) TO authenticated;

-- 4. get_visible_online_status
CREATE OR REPLACE FUNCTION get_visible_online_status(
  target_id UUID
)
RETURNS JSONB AS $$
DECLARE
  is_visible BOOLEAN;
  status_data JSONB;
BEGIN
  -- Check if caller can see status
  is_visible := can_see_online_status(auth.uid(), target_id);
  
  IF NOT is_visible THEN
    RETURN NULL;
  END IF;

  -- Fetch status from presence table (assuming it exists, or profiles)
  -- For now, returning mock structure or null if not found
  -- In a real app, this would query the presence system
  RETURN jsonb_build_object(
    'is_online', false, -- Placeholder, actual logic depends on presence system
    'last_seen', NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_visible_online_status(UUID) TO authenticated;

-- 5. RLS for Profiles Visibility
-- Drop existing policy if it conflicts
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Profiles are viewable based on privacy" ON profiles;

CREATE POLICY "Profiles are viewable based on privacy"
ON profiles FOR SELECT
USING (
  can_view_profile(auth.uid(), id)
);
