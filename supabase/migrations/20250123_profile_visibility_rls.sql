-- Migration: 20250123_profile_visibility_rls.sql

-- Function to check if a user can view another user's profile
CREATE OR REPLACE FUNCTION can_view_profile(
  viewer_id UUID,
  target_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  visibility_setting TEXT;
  are_friends BOOLEAN;
BEGIN
  -- User can always view their own profile
  IF viewer_id = target_id THEN
    RETURN TRUE;
  END IF;

  -- Get target's profile visibility setting
  -- Default to 'public' if not set
  SELECT COALESCE(privacy_settings->>'profile_visibility', 'public')
  INTO visibility_setting
  FROM profiles
  WHERE id = target_id;

  -- If setting is 'public', allow
  IF visibility_setting = 'public' THEN
    RETURN TRUE;
  END IF;

  -- If setting is 'friends', check if they are friends
  IF visibility_setting = 'friends' THEN
    SELECT EXISTS (
      SELECT 1 FROM friendships
      WHERE user_id = viewer_id 
        AND friend_id = target_id 
        AND status = 'active'
    ) INTO are_friends;
    
    RETURN are_friends;
  END IF;

  -- If setting is 'friends_of_friends', check for mutual friends
  IF visibility_setting = 'friends_of_friends' THEN
    -- Check if they are friends first
    SELECT EXISTS (
      SELECT 1 FROM friendships
      WHERE user_id = viewer_id 
        AND friend_id = target_id 
        AND status = 'active'
    ) INTO are_friends;
    
    IF are_friends THEN
      RETURN TRUE;
    END IF;

    -- Check for mutual friends
    SELECT EXISTS (
      SELECT 1
      FROM friendships f1
      JOIN friendships f2 ON f1.friend_id = f2.user_id
      WHERE f1.user_id = viewer_id        -- f1.friend_id is a friend of viewer
        AND f2.friend_id = target_id      -- f2.user_id (same person) is a friend of target
        AND f1.status = 'active'
        AND f2.status = 'active'
    ) INTO are_friends;
    
    RETURN are_friends;
  END IF;

  -- Default allow (public) if setting is unknown, but let's be safe and default to false if we reached here unexpectedly
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION can_view_profile(UUID, UUID) TO authenticated;

-- Update RLS policy for viewing profiles
-- First, drop existing policy if it exists
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;

-- Create new policy using the function
CREATE POLICY "Profiles are viewable based on privacy settings"
ON profiles
FOR SELECT
USING (
  can_view_profile(auth.uid(), id)
);

-- Update search_users function to respect search_visibility
-- We need to see the existing function first to modify it correctly, 
-- but since we are replacing it, we can define the new version.
-- However, let's create a wrapper or update the existing one if we know its name.
-- Assuming standard search function or we create a new secure one.

-- Let's create a secure search function that respects privacy
CREATE OR REPLACE FUNCTION search_users_secure(
  search_query TEXT,
  limit_count INT DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  username TEXT,
  full_name TEXT,
  avatar_url TEXT,
  is_online BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.username,
    p.full_name,
    p.avatar_url,
    p.is_online
  FROM profiles p
  WHERE 
    (p.username ILIKE '%' || search_query || '%' OR p.full_name ILIKE '%' || search_query || '%')
    AND (p.privacy_settings->>'search_visibility')::BOOLEAN IS NOT FALSE -- Default to true if null
    AND can_view_profile(auth.uid(), p.id) -- Also enforce profile visibility
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION search_users_secure(TEXT, INT) TO authenticated;
