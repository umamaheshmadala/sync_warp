-- ============================================
-- MIGRATION: Friend Requests with Auto-Expiry
-- Date: 2025-01-18
-- Story: 9.1.3 - Friend Requests with Auto-Expiry
-- Epic: 9.1 - Friends Foundation Database
-- ============================================
-- This migration evolves the existing friend_requests workflow to:
-- - Support full status lifecycle (pending, accepted, rejected, cancelled, expired)
-- - Add optional message field
-- - Enforce 30-day auto-expiry behavior
-- - Provide RPC-style functions for send/accept/reject/cancel
-- - Tighten RLS and add indexes for performance
-- ============================================

-- ============================================
-- STEP 1: Evolve friend_requests Schema
-- ============================================

-- 1.1 Rename requester_id → sender_id for clarity
ALTER TABLE friend_requests
  RENAME COLUMN requester_id TO sender_id;

-- 1.2 Extend status enum to include cancelled + expired
ALTER TABLE friend_requests
  DROP CONSTRAINT IF EXISTS friend_requests_status_check;

ALTER TABLE friend_requests
  ADD CONSTRAINT friend_requests_status_check
  CHECK (
    status::text = ANY (
      ARRAY['pending','accepted','rejected','cancelled','expired']::text[]
    )
  );

-- 1.3 Add optional personalized message (max 200 chars)
ALTER TABLE friend_requests
  ADD COLUMN IF NOT EXISTS message TEXT;

ALTER TABLE friend_requests
  DROP CONSTRAINT IF EXISTS friend_requests_message_length;

ALTER TABLE friend_requests
  ADD CONSTRAINT friend_requests_message_length
  CHECK (message IS NULL OR length(message) <= 200);

-- 1.4 Tighten timestamps (NOT NULL + defaults already exist)
ALTER TABLE friend_requests
  ALTER COLUMN created_at SET NOT NULL,
  ALTER COLUMN updated_at SET NOT NULL,
  ALTER COLUMN expires_at SET NOT NULL;

-- 1.5 Replace old unique constraint with pending-only uniqueness
ALTER TABLE friend_requests
  DROP CONSTRAINT IF EXISTS friend_requests_unique_pair;

-- Use a partial UNIQUE INDEX to enforce one pending request per pair
CREATE UNIQUE INDEX IF NOT EXISTS friend_requests_unique_pending
  ON friend_requests(sender_id, receiver_id)
  WHERE status = 'pending';

-- 1.6 Keep different-users constraint but ensure it is named correctly
ALTER TABLE friend_requests
  DROP CONSTRAINT IF EXISTS friend_requests_different_users;

ALTER TABLE friend_requests
  ADD CONSTRAINT friend_requests_different_users
  CHECK (sender_id <> receiver_id);

COMMENT ON TABLE friend_requests IS 'Friend request workflow with auto-expiry and status lifecycle.';

-- ============================================
-- STEP 2: Indexes for Common Access Patterns
-- ============================================

-- Drop legacy indexes we no longer need
DROP INDEX IF EXISTS idx_friend_requests_receiver;
DROP INDEX IF EXISTS idx_friend_requests_requester;
DROP INDEX IF EXISTS idx_friend_requests_status;

-- Index: Pending requests by receiver ("Received" tab)
CREATE INDEX IF NOT EXISTS idx_friend_requests_receiver_pending
  ON friend_requests(receiver_id, created_at DESC)
  WHERE status = 'pending';

-- Index: Pending requests by sender ("Sent" tab)
CREATE INDEX IF NOT EXISTS idx_friend_requests_sender_pending
  ON friend_requests(sender_id, created_at DESC)
  WHERE status = 'pending';

-- Index: Requests that can expire soon (cleanup job)
CREATE INDEX IF NOT EXISTS idx_friend_requests_expired
  ON friend_requests(expires_at)
  WHERE status = 'pending';

-- Index: Request history (for audits / UI history)
CREATE INDEX IF NOT EXISTS idx_friend_requests_user_history
  ON friend_requests(sender_id, receiver_id, updated_at DESC);

-- ============================================
-- STEP 3: Trigger to Maintain updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_friend_request_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_friend_request_timestamp ON friend_requests;

CREATE TRIGGER trigger_update_friend_request_timestamp
  BEFORE UPDATE ON friend_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_friend_request_timestamp();

-- ============================================
-- STEP 4: RPC Functions - Send / Accept / Reject / Cancel
-- ============================================

-- NOTE: These functions are designed to be called via Supabase RPC.
--       They preserve existing parameter names used by the app
--       (target_user_id, connection_id) for backward compatibility.

-- 4.1 SEND FRIEND REQUEST -----------------------------------------

CREATE OR REPLACE FUNCTION send_friend_request(
  target_user_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_sender_id UUID := auth.uid();
  v_request_id UUID;
BEGIN
  -- Must be authenticated
  IF v_sender_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Not authenticated'
    );
  END IF;

  -- Cannot send to self
  IF v_sender_id = target_user_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Cannot send friend request to yourself'
    );
  END IF;

  -- Blocked users (if blocked_users table exists)
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'blocked_users'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM blocked_users
      WHERE (blocker_id = v_sender_id AND blocked_id = target_user_id)
         OR (blocker_id = target_user_id AND blocked_id = v_sender_id)
    ) THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Cannot send request due to blocking'
      );
    END IF;
  END IF;

  -- Already friends? (using new friendships table)
  IF EXISTS (
    SELECT 1 FROM friendships
    WHERE user_id = v_sender_id
      AND friend_id = target_user_id
      AND status = 'active'
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Already friends with this user'
    );
  END IF;

  -- Try to insert pending request (unique index will guard duplicates)
  BEGIN
    INSERT INTO friend_requests (sender_id, receiver_id)
    VALUES (v_sender_id, target_user_id)
    RETURNING id INTO v_request_id;
  EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Friend request already pending'
    );
  END;

  -- Optional: send notification here if notifications table is available
  -- (Left as a separate story / integration step.)

  RETURN jsonb_build_object(
    'success', true,
    'request_id', v_request_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION send_friend_request(UUID) IS 'Send friend request with validation and pending-only uniqueness.';

-- 4.2 ACCEPT FRIEND REQUEST --------------------------------------

CREATE OR REPLACE FUNCTION accept_friend_request(
  connection_id UUID  -- kept name for backward compatibility
)
RETURNS JSONB AS $$
DECLARE
  v_request   friend_requests%ROWTYPE;
  v_receiver  UUID := auth.uid();
BEGIN
  IF v_receiver IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Fetch pending request for this user
  SELECT * INTO v_request
  FROM friend_requests
  WHERE id = connection_id
    AND receiver_id = v_receiver
    AND status = 'pending';

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Friend request not found or already processed'
    );
  END IF;

  -- Check expiry
  IF v_request.expires_at < NOW() THEN
    UPDATE friend_requests
      SET status = 'expired'
    WHERE id = connection_id;

    RETURN jsonb_build_object(
      'success', false,
      'error', 'Friend request has expired'
    );
  END IF;

  -- Create friendship (TWO-ROW pattern; trigger will create reverse)
  INSERT INTO friendships (user_id, friend_id, status, created_at)
  VALUES (v_request.sender_id, v_request.receiver_id, 'active', NOW())
  ON CONFLICT (user_id, friend_id) DO NOTHING;

  -- Update request status
  UPDATE friend_requests
    SET status = 'accepted'
  WHERE id = connection_id;

  -- Optional: notification to sender (handled in notifications story)

  RETURN jsonb_build_object(
    'success', true,
    'friendship_created', true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION accept_friend_request(UUID) IS 'Accept friend request and create bidirectional friendship.';

-- 4.3 REJECT FRIEND REQUEST --------------------------------------

CREATE OR REPLACE FUNCTION reject_friend_request(
  connection_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_receiver UUID := auth.uid();
BEGIN
  IF v_receiver IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  UPDATE friend_requests
    SET status = 'rejected'
  WHERE id = connection_id
    AND receiver_id = v_receiver
    AND status = 'pending';

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Friend request not found or already processed'
    );
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION reject_friend_request(UUID) IS 'Reject friend request (no friendship created).';

-- 4.4 CANCEL FRIEND REQUEST (SENDER) -----------------------------

CREATE OR REPLACE FUNCTION cancel_friend_request(
  p_request_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_sender UUID := auth.uid();
BEGIN
  IF v_sender IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  UPDATE friend_requests
    SET status = 'cancelled'
  WHERE id = p_request_id
    AND sender_id = v_sender
    AND status = 'pending';

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Friend request not found or already processed'
    );
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION cancel_friend_request(UUID) IS 'Cancel a pending friend request by the sender.';

-- 4.5 EXPIRE OLD FRIEND REQUESTS ---------------------------------

CREATE OR REPLACE FUNCTION expire_old_friend_requests()
RETURNS INTEGER AS $$
DECLARE
  v_expired_count INTEGER;
BEGIN
  UPDATE friend_requests
    SET status = 'expired'
  WHERE status = 'pending'
    AND expires_at < NOW();

  GET DIAGNOSTICS v_expired_count = ROW_COUNT;

  RAISE NOTICE 'Expired % friend requests', v_expired_count;
  RETURN v_expired_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION expire_old_friend_requests() IS 'Expire pending friend requests whose expires_at is in the past.';

-- ============================================
-- STEP 5: RLS Policies for friend_requests
-- ============================================

ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;

-- Drop legacy policies
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'friend_requests' AND policyname = 'Users can create friend requests') THEN
    DROP POLICY "Users can create friend requests" ON friend_requests;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'friend_requests' AND policyname = 'Users can update friend requests they received') THEN
    DROP POLICY "Users can update friend requests they received" ON friend_requests;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'friend_requests' AND policyname = 'Users can view friend requests involving them') THEN
    DROP POLICY "Users can view friend requests involving them" ON friend_requests;
  END IF;
END $$;

-- Policy: Only sender or receiver can view a request
CREATE POLICY "Users view their requests"
  ON friend_requests FOR SELECT
  USING (
    auth.uid() = sender_id
    OR auth.uid() = receiver_id
  );

-- Policy: Only sender can insert request
CREATE POLICY "Users send requests"
  ON friend_requests FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND sender_id <> receiver_id
  );

-- Policy: Sender or receiver can update (for cancel/accept/reject flows)
CREATE POLICY "Users update requests"
  ON friend_requests FOR UPDATE
  USING (
    auth.uid() = sender_id OR auth.uid() = receiver_id
  )
  WITH CHECK (
    auth.uid() = sender_id OR auth.uid() = receiver_id
  );

-- ============================================
-- STEP 6: Realtime Integration
-- ============================================

ALTER PUBLICATION supabase_realtime ADD TABLE friend_requests;

-- ============================================
-- STEP 7: Update pending_friend_requests View
-- ============================================

-- This view is used by newFriendService.getFriendRequests()
-- Keep column names (id, requester_id, requester_name, requester_avatar) for compatibility

CREATE OR REPLACE VIEW public.pending_friend_requests AS
SELECT
  fr.id,
  fr.sender_id AS requester_id,
  fr.created_at,
  p.full_name AS requester_name,
  p.avatar_url AS requester_avatar
FROM friend_requests fr
JOIN profiles p ON p.id = fr.sender_id
WHERE fr.status = 'pending'
  AND fr.receiver_id = auth.uid()
  AND fr.expires_at > NOW();

COMMENT ON VIEW public.pending_friend_requests IS 'Pending friend requests for the current user (receiver), based on friend_requests table.';

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '🎉 MIGRATION 20250118_friend_requests COMPLETED';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'friend_requests schema evolved, RPC functions ready, RLS tightened, and pending_friend_requests view updated.';
END $$;
