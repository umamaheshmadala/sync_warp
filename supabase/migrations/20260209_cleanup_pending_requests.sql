-- Clean up stuck pending friend requests
-- Story 9.3.2 / Bugfix V4

DO $$
DECLARE
  r RECORD;
BEGIN
  -- 1. Find and update 'pending' friend requests where the users are already friends
  UPDATE friend_requests fr
  SET status = 'accepted', updated_at = NOW()
  WHERE status = 'pending'
    AND EXISTS (
      SELECT 1 FROM friendships f
      WHERE (f.user_id = fr.sender_id AND f.friend_id = fr.receiver_id)
         OR (f.user_id = fr.receiver_id AND f.friend_id = fr.sender_id)
    );

  -- 2. Find and update 'pending' friend requests where the REVERSE request is already accepted
  -- (e.g. A->B is pending, but B->A is accepted)
  UPDATE friend_requests fr1
  SET status = 'accepted', updated_at = NOW()
  WHERE status = 'pending'
    AND EXISTS (
      SELECT 1 FROM friend_requests fr2
      WHERE fr2.sender_id = fr1.receiver_id
        AND fr2.receiver_id = fr1.sender_id
        AND fr2.status = 'accepted'
    );
    
END $$;
