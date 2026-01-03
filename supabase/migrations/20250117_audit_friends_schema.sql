-- ============================================
-- MIGRATION: Audit & Backup Friends Schema
-- Date: 2025-01-17
-- Story: 9.1.1 - Audit & Migrate Existing Friends Schema
-- Epic: 9.1 - Friends Foundation Database
-- ============================================
-- Purpose: Prepare existing friends schema for migration to
--          Facebook-level bidirectional friendship structure.
--          This migration is SAFE and backward-compatible.
-- ============================================

-- ============================================
-- STEP 1: Pre-migration Data Integrity Check
-- ============================================

DO $$
DECLARE
  pre_friendship_count INTEGER;
  pre_request_count INTEGER;
  pre_connection_count INTEGER;
  pre_activity_count INTEGER;
BEGIN
  -- Get row counts before migration
  SELECT COUNT(*) INTO pre_friendship_count FROM friendships;
  SELECT COUNT(*) INTO pre_request_count FROM friend_requests;
  SELECT COUNT(*) INTO pre_connection_count FROM friend_connections;
  SELECT COUNT(*) INTO pre_activity_count FROM friend_activities;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'PRE-MIGRATION DATA COUNTS';
  RAISE NOTICE '========================================';
  RAISE NOTICE '  friendships:        %', pre_friendship_count;
  RAISE NOTICE '  friend_requests:    %', pre_request_count;
  RAISE NOTICE '  friend_connections: %', pre_connection_count;
  RAISE NOTICE '  friend_activities:  %', pre_activity_count;
  RAISE NOTICE '========================================';
  
  -- Store counts for post-migration validation
  CREATE TEMP TABLE IF NOT EXISTS migration_validation (
    table_name TEXT PRIMARY KEY,
    pre_count INTEGER,
    post_count INTEGER
  );
  
  INSERT INTO migration_validation (table_name, pre_count)
  VALUES 
    ('friendships', pre_friendship_count),
    ('friend_requests', pre_request_count),
    ('friend_connections', pre_connection_count),
    ('friend_activities', pre_activity_count)
  ON CONFLICT (table_name) DO UPDATE
    SET pre_count = EXCLUDED.pre_count;
END $$;

-- ============================================
-- STEP 2: Create Backup Tables
-- ============================================

-- Backup existing tables (create if they don't exist)
CREATE TABLE IF NOT EXISTS friendships_legacy AS 
  SELECT * FROM friendships;

CREATE TABLE IF NOT EXISTS friend_requests_legacy AS 
  SELECT * FROM friend_requests;

CREATE TABLE IF NOT EXISTS friend_connections_legacy AS 
  SELECT * FROM friend_connections;

CREATE TABLE IF NOT EXISTS friend_activities_legacy AS 
  SELECT * FROM friend_activities;

RAISE NOTICE '✅ Backup tables created with _legacy suffix';

-- ============================================
-- STEP 3: Add New Columns to friend_connections
-- ============================================
-- We'll use friend_connections as the primary table since
-- it already has a good bidirectional design

-- Extend status enum to include 'active' and 'unfriended'
ALTER TABLE friend_connections 
  DROP CONSTRAINT IF EXISTS friend_connections_status_check;

ALTER TABLE friend_connections
  ADD CONSTRAINT friend_connections_status_check
  CHECK (status IN ('pending', 'accepted', 'rejected', 'active', 'unfriended'));

-- Add unfriended_at column
ALTER TABLE friend_connections
  ADD COLUMN IF NOT EXISTS unfriended_at TIMESTAMPTZ;

-- Add metadata column for friendship context
ALTER TABLE friend_connections
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Add constraint to prevent self-friendship
ALTER TABLE friend_connections
  DROP CONSTRAINT IF EXISTS friend_connections_different_users;

ALTER TABLE friend_connections
  ADD CONSTRAINT friend_connections_different_users
  CHECK (user_a_id != user_b_id);

RAISE NOTICE '✅ New columns added to friend_connections';

-- ============================================
-- STEP 4: Add New Column to friend_requests
-- ============================================

-- Add expires_at column for 30-day auto-expiry
ALTER TABLE friend_requests
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ 
    DEFAULT (NOW() + INTERVAL '30 days');

-- Update existing pending requests to have expiry date
UPDATE friend_requests
SET expires_at = created_at + INTERVAL '30 days'
WHERE status = 'pending' AND expires_at IS NULL;

RAISE NOTICE '✅ Auto-expiry column added to friend_requests';

-- ============================================
-- STEP 5: Create Performance Indexes (CONCURRENTLY)
-- ============================================
-- Using CONCURRENTLY to avoid table locks

-- friend_connections indexes for active friendships
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_friend_connections_active
  ON friend_connections(user_a_id, user_b_id) 
  WHERE status = 'active';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_friend_connections_unfriended
  ON friend_connections(unfriended_at) 
  WHERE status = 'unfriended';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_friend_connections_metadata
  ON friend_connections USING gin(metadata);

-- friend_requests indexes for pending requests with expiry
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_friend_requests_expires_at
  ON friend_requests(expires_at) 
  WHERE status = 'pending';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_friend_requests_pending_not_expired
  ON friend_requests(receiver_id, created_at)
  WHERE status = 'pending' AND expires_at > NOW();

RAISE NOTICE '✅ Performance indexes created';

-- ============================================
-- STEP 6: Migrate Data from friendships to friend_connections
-- ============================================
-- Convert unidirectional friendships to bidirectional friend_connections

-- Only migrate if friendships table has data
DO $$
DECLARE
  migrated_count INTEGER := 0;
BEGIN
  -- Migrate friendships where status is 'active' (accepted)
  -- Using LEAST/GREATEST to ensure bidirectional uniqueness
  INSERT INTO friend_connections (
    user_a_id, 
    user_b_id, 
    status, 
    requester_id, 
    created_at, 
    updated_at
  )
  SELECT 
    LEAST(user1_id, user2_id) AS user_a_id,
    GREATEST(user1_id, user2_id) AS user_b_id,
    'active' AS status,
    user1_id AS requester_id,  -- Original requester
    created_at,
    NOW() AS updated_at
  FROM friendships
  WHERE NOT EXISTS (
    -- Prevent duplicates if friendship already in friend_connections
    SELECT 1 FROM friend_connections fc
    WHERE fc.user_a_id = LEAST(friendships.user1_id, friendships.user2_id)
      AND fc.user_b_id = GREATEST(friendships.user1_id, friendships.user2_id)
  );
  
  GET DIAGNOSTICS migrated_count = ROW_COUNT;
  RAISE NOTICE '✅ Migrated % friendships to friend_connections', migrated_count;
END $$;

-- ============================================
-- STEP 7: Post-migration Data Integrity Check
-- ============================================

DO $$
DECLARE
  post_friendship_count INTEGER;
  post_request_count INTEGER;
  post_connection_count INTEGER;
  post_activity_count INTEGER;
  pre_friendship_count INTEGER;
  pre_request_count INTEGER;
  pre_connection_count INTEGER;
  pre_activity_count INTEGER;
BEGIN
  -- Get current row counts
  SELECT COUNT(*) INTO post_friendship_count FROM friendships;
  SELECT COUNT(*) INTO post_request_count FROM friend_requests;
  SELECT COUNT(*) INTO post_connection_count FROM friend_connections;
  SELECT COUNT(*) INTO post_activity_count FROM friend_activities;
  
  -- Get pre-migration counts from temp table
  SELECT pre_count INTO pre_friendship_count 
  FROM migration_validation WHERE table_name = 'friendships';
  
  SELECT pre_count INTO pre_request_count 
  FROM migration_validation WHERE table_name = 'friend_requests';
  
  SELECT pre_count INTO pre_connection_count 
  FROM migration_validation WHERE table_name = 'friend_connections';
  
  SELECT pre_count INTO pre_activity_count 
  FROM migration_validation WHERE table_name = 'friend_activities';
  
  -- Update post counts
  UPDATE migration_validation 
  SET post_count = post_friendship_count 
  WHERE table_name = 'friendships';
  
  UPDATE migration_validation 
  SET post_count = post_request_count 
  WHERE table_name = 'friend_requests';
  
  UPDATE migration_validation 
  SET post_count = post_connection_count 
  WHERE table_name = 'friend_connections';
  
  UPDATE migration_validation 
  SET post_count = post_activity_count 
  WHERE table_name = 'friend_activities';
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'POST-MIGRATION DATA COUNTS';
  RAISE NOTICE '========================================';
  RAISE NOTICE '  friendships:        % (pre: %)', post_friendship_count, pre_friendship_count;
  RAISE NOTICE '  friend_requests:    % (pre: %)', post_request_count, pre_request_count;
  RAISE NOTICE '  friend_connections: % (pre: %)', post_connection_count, pre_connection_count;
  RAISE NOTICE '  friend_activities:  % (pre: %)', post_activity_count, pre_activity_count;
  RAISE NOTICE '========================================';
  
  -- Validate counts match (no data loss)
  -- Note: friend_connections count may be higher due to migration from friendships
  IF post_friendship_count != pre_friendship_count THEN
    RAISE EXCEPTION 'Data loss detected in friendships! Pre: %, Post: %', 
      pre_friendship_count, post_friendship_count;
  END IF;
  
  IF post_request_count != pre_request_count THEN
    RAISE EXCEPTION 'Data loss detected in friend_requests! Pre: %, Post: %', 
      pre_request_count, post_request_count;
  END IF;
  
  IF post_activity_count != pre_activity_count THEN
    RAISE EXCEPTION 'Data loss detected in friend_activities! Pre: %, Post: %', 
      pre_activity_count, post_activity_count;
  END IF;
  
  RAISE NOTICE '✅ Migration validation passed: Zero data loss confirmed';
END $$;

-- ============================================
-- STEP 8: Create Migration Audit Log
-- ============================================

CREATE TABLE IF NOT EXISTS migration_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  migration_name TEXT NOT NULL,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT NOT NULL CHECK (status IN ('started', 'completed', 'failed', 'rolled_back')),
  details JSONB,
  error_message TEXT
);

INSERT INTO migration_audit (migration_name, status, details)
VALUES (
  '20250117_audit_friends_schema',
  'completed',
  jsonb_build_object(
    'tables_modified', ARRAY['friend_connections', 'friend_requests'],
    'columns_added', ARRAY['unfriended_at', 'metadata', 'expires_at'],
    'indexes_created', 5,
    'data_migrated', true,
    'data_loss', false,
    'backup_tables', ARRAY['friendships_legacy', 'friend_requests_legacy', 'friend_connections_legacy', 'friend_activities_legacy']
  )
);

-- ============================================
-- STEP 9: Create Helper Functions
-- ============================================

-- Function to check if users are friends
CREATE OR REPLACE FUNCTION are_friends(user1_uuid UUID, user2_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM friend_connections
    WHERE status = 'active'
      AND (
        (user_a_id = user1_uuid AND user_b_id = user2_uuid)
        OR
        (user_a_id = user2_uuid AND user_b_id = user1_uuid)
      )
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get friend count for a user
CREATE OR REPLACE FUNCTION get_friend_count(user_uuid UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM friend_connections
    WHERE status = 'active'
      AND (user_a_id = user_uuid OR user_b_id = user_uuid)
  );
END;
$$ LANGUAGE plpgsql STABLE;

RAISE NOTICE '✅ Helper functions created';

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '🎉 MIGRATION 20250117_audit_friends_schema COMPLETED SUCCESSFULLY';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Summary:';
  RAISE NOTICE '  ✅ Backup tables created';
  RAISE NOTICE '  ✅ New columns added';
  RAISE NOTICE '  ✅ Indexes created';
  RAISE NOTICE '  ✅ Data migrated';
  RAISE NOTICE '  ✅ Zero data loss confirmed';
  RAISE NOTICE '  ✅ Helper functions created';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Next Steps:';
  RAISE NOTICE '  1. Test friend operations on frontend';
  RAISE NOTICE '  2. Verify RLS policies still work';
  RAISE NOTICE '  3. Monitor performance with new indexes';
  RAISE NOTICE '  4. Proceed to Story 9.1.2';
  RAISE NOTICE '========================================';
END $$;
