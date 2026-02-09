-- Fix accept_friend_request to handle bidirectional duplicate requests
-- Story 9.3.2 / Bugfix V3

CREATE OR REPLACE FUNCTION accept_friend_request(request_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  req RECORD;
  sender_uuid UUID;
  receiver_uuid UUID;
BEGIN
  -- Get the friend request
  SELECT * INTO req
  FROM friend_requests
  WHERE id = request_id
    AND receiver_id = auth.uid()
    AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Friend request not found or already processed';
  END IF;

  sender_uuid := req.sender_id;
  receiver_uuid := req.receiver_id;

  -- Update ALL pending requests between these two users to 'accepted'
  -- This handles the race condition where both users sent requests to each other
  UPDATE friend_requests
  SET status = 'accepted', updated_at = NOW()
  WHERE 
    ((sender_id = sender_uuid AND receiver_id = receiver_uuid) OR
     (sender_id = receiver_uuid AND receiver_id = sender_uuid))
    AND status = 'pending';

  -- Create or Update bidirectional friendships
  INSERT INTO friendships (user_id, friend_id, status, created_at)
  VALUES
    (receiver_uuid, sender_uuid, 'active', NOW()),
    (sender_uuid, receiver_uuid, 'active', NOW())
  ON CONFLICT (user_id, friend_id) 
  DO UPDATE SET 
    status = 'active',
    unfriended_at = NULL; -- Clear any previous unfriend timestamp

END;
$$;
