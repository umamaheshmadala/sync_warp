-- Migration: 20250123_friend_request_privacy_rls.sql

-- Function to check if a user can send a friend request to another user
CREATE OR REPLACE FUNCTION can_send_friend_request(
  sender_id UUID,
  receiver_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  privacy_setting TEXT;
  mutual_friends_exist BOOLEAN;
BEGIN
  -- User cannot send request to themselves
  IF sender_id = receiver_id THEN
    RETURN FALSE;
  END IF;

  -- Get receiver's privacy setting for friend requests
  -- Default to 'everyone' if not set
  SELECT COALESCE(privacy_settings->>'friend_requests', 'everyone')
  INTO privacy_setting
  FROM profiles
  WHERE id = receiver_id;

  -- If setting is 'everyone', allow
  IF privacy_setting = 'everyone' THEN
    RETURN TRUE;
  END IF;

  -- If setting is 'no_one', deny
  IF privacy_setting = 'no_one' THEN
    RETURN FALSE;
  END IF;

  -- If setting is 'friends_of_friends', check for mutual friends
  IF privacy_setting = 'friends_of_friends' THEN
    -- Check if there exists a user who is a friend of both sender and receiver
    SELECT EXISTS (
      SELECT 1
      FROM friendships f1
      JOIN friendships f2 ON f1.friend_id = f2.user_id
      WHERE f1.user_id = sender_id        -- f1.friend_id is a friend of sender
        AND f2.friend_id = receiver_id    -- f2.user_id (same person) is a friend of receiver
        AND f1.status = 'active'
        AND f2.status = 'active'
    ) INTO mutual_friends_exist;
    
    RETURN mutual_friends_exist;
  END IF;

  -- Default deny for safety if setting is unknown
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION can_send_friend_request(UUID, UUID) TO authenticated;

-- Update RLS policy for inserting friend requests
-- First, drop existing policy if it exists (or we can create a new one and drop the old one)
-- Assuming standard policy names, let's try to be safe.

DROP POLICY IF EXISTS "Users can send friend requests" ON friend_requests;

CREATE POLICY "Users can send friend requests based on privacy"
ON friend_requests
FOR INSERT
WITH CHECK (
  auth.uid() = sender_id AND
  can_send_friend_request(auth.uid(), receiver_id)
);

-- Ensure users can view requests they sent or received (usually already exists, but reinforcing)
DROP POLICY IF EXISTS "Users can view their own friend requests" ON friend_requests;

CREATE POLICY "Users can view their own friend requests"
ON friend_requests
FOR SELECT
USING (
  auth.uid() = sender_id OR 
  auth.uid() = receiver_id
);
