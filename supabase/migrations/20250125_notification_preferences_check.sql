-- Update create_friend_notification to check notification preferences
-- This ensures in-app notifications respect user preferences

-- Drop the existing function with exact signature
DROP FUNCTION IF EXISTS create_friend_notification(
  p_user_id uuid,
  p_type notification_type,
  p_title text,
  p_message text,
  p_entity_id uuid,
  p_route_to text,
  p_sender_id uuid
);

-- Recreate with preference checks
CREATE OR REPLACE FUNCTION create_friend_notification(
  p_user_id UUID,
  p_type notification_type,
  p_title TEXT,
  p_message TEXT,
  p_entity_id UUID DEFAULT NULL,
  p_route_to TEXT DEFAULT NULL,
  p_sender_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_notification_id UUID;
  v_is_blocked BOOLEAN;
  v_prefs JSONB;
  v_push_enabled BOOLEAN;
  v_type_enabled BOOLEAN;
  v_notification_type_key TEXT;
BEGIN
  -- Check if users have blocked each other
  SELECT EXISTS (
    SELECT 1 FROM blocked_users
    WHERE (blocker_id = p_user_id AND blocked_id = p_sender_id)
       OR (blocker_id = p_sender_id AND blocked_id = p_user_id)
  ) INTO v_is_blocked;

  -- Don't create notification if blocked
  IF v_is_blocked THEN
    RAISE LOG 'Notification blocked: users have blocked each other';
    RETURN NULL;
  END IF;

  -- Get user's notification preferences
  SELECT notification_preferences INTO v_prefs
  FROM profiles
  WHERE id = p_user_id;

  -- Default to enabled if no preferences set
  v_prefs := COALESCE(v_prefs, '{}'::jsonb);
  
  -- Check global push_enabled flag
  v_push_enabled := COALESCE((v_prefs->>'push_enabled')::boolean, true);
  
  -- Map notification_type enum to preference key
  v_notification_type_key := CASE p_type::text
    WHEN 'friend_request' THEN 'friend_requests'
    WHEN 'friend_accepted' THEN 'friend_accepted'
    WHEN 'deal_shared' THEN 'deal_shared'
    WHEN 'birthday_reminder' THEN 'birthday_reminders'
    ELSE NULL
  END;
  
  -- Check type-specific preference
  IF v_notification_type_key IS NOT NULL THEN
    v_type_enabled := COALESCE((v_prefs->>v_notification_type_key)::boolean, true);
  ELSE
    v_type_enabled := true; -- Allow unknown types by default
  END IF;

  -- Don't create notification if preferences block it
  IF NOT v_push_enabled OR NOT v_type_enabled THEN
    RAISE LOG 'Notification blocked by preferences: user_id=%, type=%, push_enabled=%, type_enabled=%',
      p_user_id, p_type, v_push_enabled, v_type_enabled;
    RETURN NULL;
  END IF;

  -- Create notification
  INSERT INTO notifications (
    user_id,
    title,
    message,
    notification_type,
    entity_id,
    route_to,
    sender_id,
    is_read
  ) VALUES (
    p_user_id,
    p_title,
    p_message,
    p_type,
    p_entity_id,
    p_route_to,
    p_sender_id,
    false
  )
  RETURNING id INTO v_notification_id;

  RAISE LOG 'Notification created: id=%, user_id=%, type=%', v_notification_id, p_user_id, p_type;
  RETURN v_notification_id;
END;
$$;

COMMENT ON FUNCTION create_friend_notification IS
  'Creates friend-related notifications with blocking and preference checks';
