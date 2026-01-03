-- =====================================================
-- Fix: Add notification to log_coupon_share
-- Date: December 3, 2025
-- =====================================================

CREATE OR REPLACE FUNCTION log_coupon_share(
  p_sender_id UUID,
  p_recipient_id UUID,
  p_coupon_id UUID,
  p_sender_collection_id UUID,
  p_is_driver BOOLEAN DEFAULT FALSE
)
RETURNS JSON AS $$
DECLARE
  v_log_id UUID;
  v_receiver_collection_id UUID;
  v_coupon_expires_at TIMESTAMP WITH TIME ZONE;
  v_sender_name TEXT;
BEGIN
  -- Validate sender owns the collection
  IF NOT EXISTS (
    SELECT 1 FROM user_coupon_collections
    WHERE id = p_sender_collection_id
      AND user_id = p_sender_id
      AND coupon_id = p_coupon_id
      AND is_shareable = TRUE
      AND has_been_shared = FALSE
      AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Invalid collection: either not owned by sender, already shared, or not shareable';
  END IF;

  -- Get coupon expiry date
  SELECT valid_until INTO v_coupon_expires_at
  FROM business_coupons
  WHERE id = p_coupon_id;

  -- Get sender name for notification
  SELECT COALESCE(full_name, email, 'A friend') INTO v_sender_name
  FROM profiles
  WHERE id = p_sender_id;

  -- Start transaction (implicitly in function)
  
  -- 1. Mark sender's collection as shared
  UPDATE user_coupon_collections
  SET 
    has_been_shared = TRUE,
    shared_to_user_id = p_recipient_id,
    shared_at = NOW(),
    status = 'used', -- Mark as used since it's been shared away
    updated_at = NOW()
  WHERE id = p_sender_collection_id;

  -- 2. Create receiver's collection
  INSERT INTO user_coupon_collections (
    user_id,
    coupon_id,
    acquisition_method,
    is_shareable,
    has_been_shared,
    original_owner_id,
    collected_at,
    expires_at,
    status
  ) VALUES (
    p_recipient_id,
    p_coupon_id,
    'shared_received',
    TRUE, -- Can be re-shared
    FALSE,
    p_sender_id,
    NOW(),
    v_coupon_expires_at,
    'active'
  )
  RETURNING id INTO v_receiver_collection_id;

  -- 3. Log the sharing event
  INSERT INTO coupon_sharing_log (
    sender_id,
    recipient_id,
    coupon_id,
    sender_collection_id,
    receiver_collection_id,
    is_driver,
    shared_at,
    sharing_day,
    notification_sent
  ) VALUES (
    p_sender_id,
    p_recipient_id,
    p_coupon_id,
    p_sender_collection_id,
    v_receiver_collection_id,
    p_is_driver,
    NOW(),
    CURRENT_DATE,
    TRUE -- Mark notification as sent (we will send it below)
  )
  RETURNING id INTO v_log_id;

  -- 4. Update receiver's collection with sharing_log_id
  UPDATE user_coupon_collections
  SET sharing_log_id = v_log_id
  WHERE id = v_receiver_collection_id;

  -- 5. Log lifecycle events
  -- Event: shared_sent (for sender)
  INSERT INTO coupon_lifecycle_events (
    coupon_id,
    user_id,
    event_type,
    collection_id,
    sharing_log_id,
    related_user_id,
    event_metadata
  ) VALUES (
    p_coupon_id,
    p_sender_id,
    'shared_sent',
    p_sender_collection_id,
    v_log_id,
    p_recipient_id,
    json_build_object(
      'recipient_id', p_recipient_id,
      'is_driver', p_is_driver
    )
  );

  -- Event: shared_received (for receiver)
  INSERT INTO coupon_lifecycle_events (
    coupon_id,
    user_id,
    event_type,
    collection_id,
    sharing_log_id,
    related_user_id,
    event_metadata
  ) VALUES (
    p_coupon_id,
    p_recipient_id,
    'shared_received',
    v_receiver_collection_id,
    v_log_id,
    p_sender_id,
    json_build_object(
      'sender_id', p_sender_id,
      'original_owner_id', p_sender_id
    )
  );

  -- 6. Update coupon collection count
  UPDATE business_coupons
  SET collection_count = collection_count + 1,
      updated_at = NOW()
  WHERE id = p_coupon_id;

  -- 7. Send notification to recipient
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    data,
    route_to,
    sender_id
  ) VALUES (
    p_recipient_id,
    'coupon_shared',
    'You received a coupon!',
    v_sender_name || ' shared a coupon with you.',
    json_build_object(
      'coupon_id', p_coupon_id, 
      'sender_id', p_sender_id,
      'collection_id', v_receiver_collection_id
    ),
    '/wallet',
    p_sender_id
  );

  -- Return success with details
  RETURN json_build_object(
    'success', TRUE,
    'sharing_log_id', v_log_id,
    'sender_collection_id', p_sender_collection_id,
    'receiver_collection_id', v_receiver_collection_id,
    'message', 'Coupon shared successfully'
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to share coupon: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
