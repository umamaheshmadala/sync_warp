-- =====================================================
-- Story 5.5: Fix Coupon Sharing Architecture
-- Migration: Enforce one-share-per-instance and implement wallet transfers
-- Date: October 2, 2025
-- =====================================================

-- =====================================================
-- 1. ADD COLUMNS TO user_coupon_collections
-- =====================================================

-- Add columns to track coupon lifecycle and sharing
ALTER TABLE user_coupon_collections
  ADD COLUMN IF NOT EXISTS acquisition_method VARCHAR(50) DEFAULT 'collected' 
    CHECK (acquisition_method IN ('collected', 'shared_received', 'admin_granted', 'promotion')),
  ADD COLUMN IF NOT EXISTS is_shareable BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS has_been_shared BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS shared_to_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS shared_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS original_owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sharing_log_id UUID REFERENCES coupon_sharing_log(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_user_coupons_shareable 
  ON user_coupon_collections(user_id, is_shareable, has_been_shared) 
  WHERE is_shareable = TRUE AND has_been_shared = FALSE;

CREATE INDEX IF NOT EXISTS idx_user_coupons_acquisition 
  ON user_coupon_collections(user_id, acquisition_method, collected_at);

COMMENT ON COLUMN user_coupon_collections.acquisition_method IS 'How the user obtained this coupon';
COMMENT ON COLUMN user_coupon_collections.is_shareable IS 'Whether this coupon instance can be shared';
COMMENT ON COLUMN user_coupon_collections.has_been_shared IS 'Whether this specific coupon instance has been shared away';
COMMENT ON COLUMN user_coupon_collections.shared_to_user_id IS 'User ID this coupon was shared to (if shared)';
COMMENT ON COLUMN user_coupon_collections.shared_at IS 'When this coupon was shared (if shared)';
COMMENT ON COLUMN user_coupon_collections.original_owner_id IS 'Original owner if received via sharing';
COMMENT ON COLUMN user_coupon_collections.sharing_log_id IS 'Reference to sharing log entry if received via sharing';

-- =====================================================
-- 2. UPDATE coupon_sharing_log TABLE
-- =====================================================

-- Add column to track which collection instance was shared
ALTER TABLE coupon_sharing_log
  ADD COLUMN IF NOT EXISTS sender_collection_id UUID REFERENCES user_coupon_collections(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS receiver_collection_id UUID REFERENCES user_coupon_collections(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS notification_sent BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS notification_sent_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN coupon_sharing_log.sender_collection_id IS 'The sender collection instance that was shared';
COMMENT ON COLUMN coupon_sharing_log.receiver_collection_id IS 'The receiver collection instance that was created';
COMMENT ON COLUMN coupon_sharing_log.notification_sent IS 'Whether notification was sent to receiver';

-- =====================================================
-- 3. CREATE COUPON LIFECYCLE TRACKING TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS coupon_lifecycle_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  coupon_id UUID NOT NULL REFERENCES business_coupons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL CHECK (event_type IN (
    'generated', 'collected', 'shared_sent', 'shared_received', 
    'redeemed', 'expired', 'removed', 'cancelled'
  )),
  
  -- Related entities
  collection_id UUID REFERENCES user_coupon_collections(id) ON DELETE SET NULL,
  sharing_log_id UUID REFERENCES coupon_sharing_log(id) ON DELETE SET NULL,
  redemption_id UUID REFERENCES coupon_redemptions(id) ON DELETE SET NULL,
  
  -- Event details
  event_metadata JSONB DEFAULT '{}',
  event_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Context
  related_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- For sharing: sender or receiver
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_lifecycle_coupon_id ON coupon_lifecycle_events(coupon_id, event_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_lifecycle_user_id ON coupon_lifecycle_events(user_id, event_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_lifecycle_event_type ON coupon_lifecycle_events(event_type, event_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_lifecycle_collection_id ON coupon_lifecycle_events(collection_id);

COMMENT ON TABLE coupon_lifecycle_events IS 'Comprehensive audit trail of all coupon lifecycle events';

-- =====================================================
-- 4. UPDATE FUNCTION: log_coupon_share
-- =====================================================

-- Drop the old version of the function first
DROP FUNCTION IF EXISTS log_coupon_share(UUID, UUID, UUID, BOOLEAN);

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
    sharing_day
  ) VALUES (
    p_sender_id,
    p_recipient_id,
    p_coupon_id,
    p_sender_collection_id,
    v_receiver_collection_id,
    p_is_driver,
    NOW(),
    CURRENT_DATE
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

COMMENT ON FUNCTION log_coupon_share IS 'Shares a coupon instance from sender to receiver with complete wallet transfer';

-- =====================================================
-- 5. CREATE FUNCTION: Get shareable coupons for user
-- =====================================================

CREATE OR REPLACE FUNCTION get_shareable_coupons(
  p_user_id UUID
)
RETURNS TABLE (
  collection_id UUID,
  coupon_id UUID,
  coupon_title VARCHAR,
  coupon_code VARCHAR,
  expires_at TIMESTAMP WITH TIME ZONE,
  collected_at TIMESTAMP WITH TIME ZONE,
  acquisition_method VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ucc.id as collection_id,
    ucc.coupon_id,
    bc.title as coupon_title,
    bc.coupon_code,
    ucc.expires_at,
    ucc.collected_at,
    ucc.acquisition_method
  FROM user_coupon_collections ucc
  JOIN business_coupons bc ON bc.id = ucc.coupon_id
  WHERE ucc.user_id = p_user_id
    AND ucc.is_shareable = TRUE
    AND ucc.has_been_shared = FALSE
    AND ucc.status = 'active'
    AND ucc.expires_at > NOW()
    AND bc.status = 'active'
  ORDER BY ucc.collected_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_shareable_coupons IS 'Returns all coupons that a user can share';

-- =====================================================
-- 6. CREATE FUNCTION: Get coupon lifecycle history
-- =====================================================

CREATE OR REPLACE FUNCTION get_coupon_lifecycle(
  p_coupon_id UUID,
  p_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
  event_id UUID,
  event_type VARCHAR,
  user_id UUID,
  user_email VARCHAR,
  related_user_id UUID,
  related_user_email VARCHAR,
  event_timestamp TIMESTAMP WITH TIME ZONE,
  event_metadata JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cle.id as event_id,
    cle.event_type,
    cle.user_id,
    u1.email as user_email,
    cle.related_user_id,
    u2.email as related_user_email,
    cle.event_timestamp,
    cle.event_metadata
  FROM coupon_lifecycle_events cle
  LEFT JOIN auth.users u1 ON u1.id = cle.user_id
  LEFT JOIN auth.users u2 ON u2.id = cle.related_user_id
  WHERE cle.coupon_id = p_coupon_id
    AND (p_user_id IS NULL OR cle.user_id = p_user_id OR cle.related_user_id = p_user_id)
  ORDER BY cle.event_timestamp DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_coupon_lifecycle IS 'Returns complete lifecycle history for a coupon';

-- =====================================================
-- 7. UPDATE RLS POLICIES
-- =====================================================

-- Allow users to read lifecycle events they're involved in
ALTER TABLE coupon_lifecycle_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own lifecycle events"
  ON coupon_lifecycle_events FOR SELECT
  USING (
    auth.uid() = user_id OR 
    auth.uid() = related_user_id
  );

-- =====================================================
-- 8. CREATE TRIGGER: Log collection events
-- =====================================================

CREATE OR REPLACE FUNCTION log_collection_lifecycle()
RETURNS TRIGGER AS $$
BEGIN
  -- Log when a coupon is collected
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO coupon_lifecycle_events (
      coupon_id,
      user_id,
      event_type,
      collection_id,
      event_metadata
    ) VALUES (
      NEW.coupon_id,
      NEW.user_id,
      CASE 
        WHEN NEW.acquisition_method = 'shared_received' THEN 'shared_received'
        ELSE 'collected'
      END,
      NEW.id,
      json_build_object(
        'acquisition_method', NEW.acquisition_method,
        'collected_from', NEW.collected_from
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_log_collection_lifecycle
  AFTER INSERT ON user_coupon_collections
  FOR EACH ROW
  EXECUTE FUNCTION log_collection_lifecycle();

-- =====================================================
-- 9. VERIFICATION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE 'Story 5.5: Coupon sharing architecture fix completed';
  RAISE NOTICE '✅ Added lifecycle tracking to user_coupon_collections';
  RAISE NOTICE '✅ Updated coupon_sharing_log with collection references';
  RAISE NOTICE '✅ Created coupon_lifecycle_events table';
  RAISE NOTICE '✅ Updated log_coupon_share function with wallet transfer logic';
  RAISE NOTICE '✅ Created get_shareable_coupons function';
  RAISE NOTICE '✅ Created get_coupon_lifecycle function';
  RAISE NOTICE '✅ Added RLS policies and triggers';
END $$;
