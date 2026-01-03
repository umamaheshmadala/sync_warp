-- Migration: 20250123_online_status_visibility.sql

-- Function to check if viewer can see online status
CREATE OR REPLACE FUNCTION can_see_online_status(
  viewer_id UUID,
  target_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  visibility_setting TEXT;
  are_friends BOOLEAN;
BEGIN
  -- User can always see their own status
  IF viewer_id = target_id THEN
    RETURN TRUE;
  END IF;
  
  -- Get target's online status visibility setting
  SELECT privacy_settings->>'online_status_visibility' 
  INTO visibility_setting
  FROM profiles WHERE id = target_id;
  
  -- Everyone: all authenticated users can see
  IF visibility_setting = 'everyone' THEN
    RETURN TRUE;
  END IF;
  
  -- No one: hide from everyone
  IF visibility_setting = 'no_one' THEN
    RETURN FALSE;
  END IF;
  
  -- Friends: check if they are friends
  IF visibility_setting = 'friends' THEN
    SELECT EXISTS (
      SELECT 1 FROM friendships
      WHERE user_id = viewer_id 
        AND friend_id = target_id 
        AND status = 'active'
    ) INTO are_friends;
    
    RETURN are_friends;
  END IF;
  
  -- Default: hide
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION can_see_online_status(UUID, UUID) TO authenticated;

-- Function to get user's visible online status
CREATE OR REPLACE FUNCTION get_visible_online_status(
  viewer_id UUID,
  target_id UUID
)
RETURNS JSONB AS $$
DECLARE
  can_see BOOLEAN;
  target_profile RECORD;
BEGIN
  -- Check if viewer can see status
  SELECT can_see_online_status(viewer_id, target_id) INTO can_see;
  
  IF NOT can_see THEN
    RETURN jsonb_build_object(
      'is_online', NULL,
      'last_active', NULL,
      'visible', FALSE
    );
  END IF;
  
  -- Get target's status
  SELECT is_online, last_active INTO target_profile
  FROM profiles WHERE id = target_id;
  
  RETURN jsonb_build_object(
    'is_online', target_profile.is_online,
    'last_active', target_profile.last_active,
    'visible', TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_visible_online_status(UUID, UUID) TO authenticated;
