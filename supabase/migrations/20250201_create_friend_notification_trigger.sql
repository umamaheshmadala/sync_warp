-- Create in-app notification on friend acceptance
-- Story 9.4.4 / Realtime Notifications

CREATE OR REPLACE FUNCTION create_friend_acceptance_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  accepter_name TEXT;
BEGIN
  -- Only run when status changes to 'active'
  IF NEW.status = 'active' AND (OLD.status IS NULL OR OLD.status != 'active') THEN
    
    -- Get accepter's name
    SELECT full_name INTO accepter_name
    FROM profiles
    WHERE id = NEW.friend_id;

    -- Insert in-app notification for the user who sent the request (NEW.user_id)
    -- We only want to notify the person who *didn't* just perform the action.
    -- In the accept_friend_request RPC, we insert two rows.
    -- We need to determine which row corresponds to the "sender" of the original request.
    -- However, simpler logic: Notify the user of THIS row that their friend (friend_id) is now connected.
    -- To avoid double notifications (since 2 rows are inserted), we can check if a notification already exists recently?
    -- OR, we rely on the fact that the UI needs to know.
    
    -- Actually, the best way is to insert a notification for the user_id about friend_id.
    -- But we only want to notify the *original sender*.
    -- The RPC inserts: (receiver, sender) AND (sender, receiver).
    -- The receiver triggered the action. The sender needs the notification.
    -- So we should notify NEW.user_id if NEW.user_id was the SENDER of the request.
    
    -- Let's check the friend_requests table to see who sent it.
    -- But the request is already 'accepted'.
    -- We can check if there was an accepted request where sender_id = NEW.user_id AND receiver_id = NEW.friend_id.
    
    IF EXISTS (
      SELECT 1 FROM friend_requests 
      WHERE sender_id = NEW.user_id 
      AND receiver_id = NEW.friend_id 
      AND status = 'accepted'
    ) THEN
      INSERT INTO notifications (
        user_id,
        type,
        title,
        message,
        data,
        created_at
      ) VALUES (
        NEW.user_id,
        'friend_accepted',
        'Friend Request Accepted',
        accepter_name || ' accepted your friend request',
        jsonb_build_object('friend_id', NEW.friend_id, 'url', '/friends'),
        NOW()
      );
    END IF;
    
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_create_friend_acceptance_notification ON friendships;

CREATE TRIGGER trigger_create_friend_acceptance_notification
  AFTER INSERT OR UPDATE ON friendships
  FOR EACH ROW
  EXECUTE FUNCTION create_friend_acceptance_notification();
