-- Fix friend acceptance notification trigger to match table schema
-- Story 9.4.4 / Bugfix

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

    -- Check if this friendship corresponds to an accepted request where NEW.user_id was the sender
    IF EXISTS (
      SELECT 1 FROM friend_requests 
      WHERE sender_id = NEW.user_id 
      AND receiver_id = NEW.friend_id 
      AND status = 'accepted'
    ) THEN
      -- Insert into notifications table with correct columns
      -- Columns found: id, user_id, title, message, notification_type, route_to, entity_id, is_read, created_at, sender_id
      INSERT INTO notifications (
        user_id,
        notification_type,
        title,
        message,
        route_to,
        entity_id,
        sender_id,
        created_at
      ) VALUES (
        NEW.user_id,
        'friend_accepted', -- Correct enum value
        'Friend Request Accepted',
        accepter_name || ' accepted your friend request',
        '/friends',
        NEW.friend_id, -- entity_id points to the friend
        NEW.friend_id, -- sender_id of the notification is the friend who accepted
        NOW()
      );
    END IF;
    
  END IF;
  RETURN NEW;
END;
$$;
