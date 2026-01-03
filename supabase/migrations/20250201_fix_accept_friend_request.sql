-- Fix accept_friend_request to handle re-friending (update existing rows)
-- Story 9.3.2 / Bugfix

CREATE OR REPLACE FUNCTION accept_friend_request(request_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  req RECORD;
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

  -- Update request status
  UPDATE friend_requests
  SET status = 'accepted', updated_at = NOW()
  WHERE id = request_id;

  -- Create or Update bidirectional friendships
  -- Use ON CONFLICT DO UPDATE to handle cases where users were previously friends (unfriended)
  INSERT INTO friendships (user_id, friend_id, status, created_at)
  VALUES
    (req.receiver_id, req.sender_id, 'active', NOW()),
    (req.sender_id, req.receiver_id, 'active', NOW())
  ON CONFLICT (user_id, friend_id) 
  DO UPDATE SET 
    status = 'active',
    updated_at = NOW(),
    unfriended_at = NULL; -- Clear any previous unfriend timestamp

END;
$$;

COMMENT ON FUNCTION accept_friend_request(UUID) IS 'Accepts friend request and creates/updates bidirectional friendship to active status.';
