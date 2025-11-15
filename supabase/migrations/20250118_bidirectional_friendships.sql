-- ============================================
-- MIGRATION: Bidirectional Friendships Table
-- Date: 2025-01-18
-- Story: 9.1.2 - Implement Bidirectional Friendships Table
-- Epic: 9.1 - Friends Foundation Database
-- ============================================
-- Purpose: Create bidirectional friendships table using TWO-ROW pattern
--          Each friendship creates (user_id, friend_id) AND (friend_id, user_id)
--          This provides O(1) lookups from both directions.
-- ============================================

-- ============================================
-- STEP 1: Create Bidirectional Friendships Table
-- ============================================

-- Create new bidirectional friendships table
CREATE TABLE IF NOT EXISTS public.friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Status: active, unfriended
  status TEXT NOT NULL DEFAULT 'active' 
    CHECK (status IN ('active', 'unfriended')),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  unfriended_at TIMESTAMPTZ,
  
  -- Metadata for future extensibility
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Constraints
  CONSTRAINT friendships_different_users CHECK (user_id != friend_id),
  CONSTRAINT friendships_unique_pair UNIQUE (user_id, friend_id)
);

-- Comment on table
COMMENT ON TABLE friendships IS 'Bidirectional friend relationships. Each friendship creates TWO rows: (A,B) and (B,A) for O(1) lookups';

-- Enable Row Level Security
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

RAISE NOTICE '✅ Bidirectional friendships table created';

-- ============================================
-- STEP 2: Create Performance Indexes
-- ============================================

-- Partial index: Active friends by user_id (most common query)
CREATE INDEX idx_friendships_user_active 
  ON friendships(user_id) 
  WHERE status = 'active';

COMMENT ON INDEX idx_friendships_user_active IS 'Fast active friend lookups by user_id - O(1) performance';

-- Partial index: Active friends by friend_id (for reverse lookups)
CREATE INDEX idx_friendships_friend_active 
  ON friendships(friend_id) 
  WHERE status = 'active';

-- Index for unfriended relationships (analytics)
CREATE INDEX idx_friendships_unfriended 
  ON friendships(user_id, unfriended_at) 
  WHERE status = 'unfriended';

-- Composite index for status queries with time sorting
CREATE INDEX idx_friendships_status_created 
  ON friendships(status, created_at DESC);

-- GIN index for metadata JSONB searches
CREATE INDEX idx_friendships_metadata 
  ON friendships USING gin(metadata);

RAISE NOTICE '✅ Performance indexes created (5 total)';

-- ============================================
-- STEP 3: Auto-Create Reverse Relationship Trigger
-- ============================================

CREATE OR REPLACE FUNCTION create_reverse_friendship()
RETURNS TRIGGER AS $$
DECLARE
  reverse_exists BOOLEAN;
BEGIN
  -- Only create reverse on INSERT if it doesn't exist
  IF TG_OP = 'INSERT' THEN
    -- Check if reverse already exists to avoid infinite loop
    SELECT EXISTS(
      SELECT 1 FROM friendships 
      WHERE user_id = NEW.friend_id 
        AND friend_id = NEW.user_id
    ) INTO reverse_exists;
    
    IF NOT reverse_exists THEN
      -- Create reverse relationship with same timestamp
      INSERT INTO friendships (user_id, friend_id, status, created_at, metadata, unfriended_at)
      VALUES (NEW.friend_id, NEW.user_id, NEW.status, NEW.created_at, NEW.metadata, NEW.unfriended_at)
      ON CONFLICT (user_id, friend_id) DO NOTHING;
      
      RAISE NOTICE 'Created reverse friendship: % → %', NEW.friend_id, NEW.user_id;
    END IF;
    
  -- On UPDATE, sync status and unfriended_at to reverse relationship
  ELSIF TG_OP = 'UPDATE' AND (OLD.status != NEW.status OR OLD.unfriended_at IS DISTINCT FROM NEW.unfriended_at) THEN
    UPDATE friendships 
    SET 
      status = NEW.status,
      unfriended_at = NEW.unfriended_at,
      metadata = NEW.metadata
    WHERE user_id = NEW.friend_id 
      AND friend_id = NEW.user_id;
      
    RAISE NOTICE 'Synced status change to reverse friendship: % ↔ %', NEW.user_id, NEW.friend_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER trigger_create_reverse_friendship
  AFTER INSERT OR UPDATE ON friendships
  FOR EACH ROW
  EXECUTE FUNCTION create_reverse_friendship();

COMMENT ON FUNCTION create_reverse_friendship() IS 'Auto-creates reverse friendship row (B,A) when (A,B) is inserted. Syncs status changes bidirectionally.';

RAISE NOTICE '✅ Bidirectional trigger created';

-- ============================================
-- STEP 4: Auto-Set unfriended_at Timestamp
-- ============================================

CREATE OR REPLACE FUNCTION set_unfriended_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  -- Set unfriended_at when status changes to unfriended
  IF NEW.status = 'unfriended' AND (OLD.status IS NULL OR OLD.status = 'active') THEN
    NEW.unfriended_at := NOW();
    RAISE NOTICE 'Set unfriended_at timestamp for friendship: % → %', NEW.user_id, NEW.friend_id;
  END IF;
  
  -- Clear unfriended_at if status changes back to active
  IF NEW.status = 'active' AND OLD.status = 'unfriended' THEN
    NEW.unfriended_at := NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger (BEFORE UPDATE to modify NEW before it's saved)
CREATE TRIGGER trigger_set_unfriended_timestamp
  BEFORE UPDATE ON friendships
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION set_unfriended_timestamp();

COMMENT ON FUNCTION set_unfriended_timestamp() IS 'Auto-sets unfriended_at timestamp when status changes to unfriended';

RAISE NOTICE '✅ Unfriend timestamp trigger created';

-- ============================================
-- STEP 5: Row Level Security Policies
-- ============================================

-- Policy 1: Users can view friendships where they are user_id OR friend_id
CREATE POLICY "Users view their friendships"
  ON friendships FOR SELECT
  USING (
    auth.uid() = user_id 
    OR auth.uid() = friend_id
  );

COMMENT ON POLICY "Users view their friendships" ON friendships IS 'Users can see friendships where they are either user_id or friend_id';

-- Policy 2: Users can insert friendships (app logic controls when)
CREATE POLICY "Users create friendships"
  ON friendships FOR INSERT
  WITH CHECK (
    auth.uid() = user_id 
    AND user_id != friend_id
    -- Note: Blocking check will be added in Story 9.1.5
  );

-- Policy 3: Users can update their own friendships (for unfriending)
CREATE POLICY "Users update their friendships"
  ON friendships FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy 4: Users can delete their friendships (soft delete preferred)
CREATE POLICY "Users delete their friendships"
  ON friendships FOR DELETE
  USING (auth.uid() = user_id);

RAISE NOTICE '✅ RLS policies created (4 total)';

-- ============================================
-- STEP 6: Enable Realtime Subscriptions
-- ============================================

-- Enable realtime for instant friendship updates
ALTER PUBLICATION supabase_realtime ADD TABLE friendships;

RAISE NOTICE '✅ Realtime subscriptions enabled';

-- ============================================
-- STEP 7: Helper Functions for Business Logic
-- ============================================

-- Function: Check if two users are friends
CREATE OR REPLACE FUNCTION are_friends_v2(user1_uuid UUID, user2_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM friendships
    WHERE user_id = user1_uuid
      AND friend_id = user2_uuid
      AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION are_friends_v2(uuid, uuid) IS 'Check if two users are friends (active friendship). Uses bidirectional lookup.';

-- Function: Get friend count for a user
CREATE OR REPLACE FUNCTION get_friend_count_v2(user_uuid UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM friendships
    WHERE user_id = user_uuid
      AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION get_friend_count_v2(uuid) IS 'Get total active friend count for a user. O(1) with index.';

-- Function: Get mutual friends between two users
CREATE OR REPLACE FUNCTION get_mutual_friends(user1_uuid UUID, user2_uuid UUID)
RETURNS TABLE(friend_id UUID, friend_name TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    f1.friend_id,
    p.full_name AS friend_name
  FROM friendships f1
  INNER JOIN friendships f2 
    ON f1.friend_id = f2.friend_id
  INNER JOIN profiles p 
    ON p.id = f1.friend_id
  WHERE f1.user_id = user1_uuid
    AND f2.user_id = user2_uuid
    AND f1.status = 'active'
    AND f2.status = 'active';
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION get_mutual_friends(uuid, uuid) IS 'Get mutual friends between two users with their names';

RAISE NOTICE '✅ Helper functions created (3 total)';

-- ============================================
-- STEP 8: Data Migration from friend_connections
-- ============================================

DO $$
DECLARE
  connection_record RECORD;
  migrated_count INTEGER := 0;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'DATA MIGRATION: friend_connections → friendships';
  RAISE NOTICE '========================================';
  
  -- Migrate from friend_connections (LEAST/GREATEST pattern) to friendships (TWO-ROW pattern)
  FOR connection_record IN 
    SELECT DISTINCT 
      user_a_id, 
      user_b_id, 
      CASE 
        WHEN status IN ('accepted', 'active') THEN 'active'
        ELSE 'unfriended'
      END AS friendship_status,
      created_at,
      unfriended_at,
      metadata
    FROM friend_connections_legacy
    WHERE status IN ('accepted', 'active', 'unfriended')
  LOOP
    -- Insert both directions (A→B and B→A)
    -- The trigger will handle creating the reverse, but we insert both for safety
    
    -- Direction 1: user_a → user_b
    INSERT INTO friendships (user_id, friend_id, status, created_at, unfriended_at, metadata)
    VALUES (
      connection_record.user_a_id, 
      connection_record.user_b_id, 
      connection_record.friendship_status,
      connection_record.created_at,
      connection_record.unfriended_at,
      connection_record.metadata
    )
    ON CONFLICT (user_id, friend_id) DO NOTHING;
    
    -- Direction 2: user_b → user_a (reverse)
    INSERT INTO friendships (user_id, friend_id, status, created_at, unfriended_at, metadata)
    VALUES (
      connection_record.user_b_id, 
      connection_record.user_a_id, 
      connection_record.friendship_status,
      connection_record.created_at,
      connection_record.unfriended_at,
      connection_record.metadata
    )
    ON CONFLICT (user_id, friend_id) DO NOTHING;
    
    migrated_count := migrated_count + 1;
  END LOOP;
  
  RAISE NOTICE '✅ Migrated % friendships (% total rows)', migrated_count, migrated_count * 2;
  RAISE NOTICE '========================================';
END $$;

-- ============================================
-- STEP 9: Validation & Audit
-- ============================================

DO $$
DECLARE
  total_friendships INTEGER;
  active_friendships INTEGER;
  unfriended_friendships INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_friendships FROM friendships;
  SELECT COUNT(*) INTO active_friendships FROM friendships WHERE status = 'active';
  SELECT COUNT(*) INTO unfriended_friendships FROM friendships WHERE status = 'unfriended';
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'MIGRATION VALIDATION';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total friendship rows:  %', total_friendships;
  RAISE NOTICE 'Active friendships:     %', active_friendships;
  RAISE NOTICE 'Unfriended friendships: %', unfriended_friendships;
  RAISE NOTICE '========================================';
  
  -- Verify bidirectionality: every (A,B) should have (B,A)
  IF EXISTS (
    SELECT 1 FROM friendships f1
    WHERE NOT EXISTS (
      SELECT 1 FROM friendships f2
      WHERE f2.user_id = f1.friend_id
        AND f2.friend_id = f1.user_id
        AND f2.status = f1.status
    )
  ) THEN
    RAISE EXCEPTION 'Bidirectionality check failed! Some friendships missing reverse relationship.';
  ELSE
    RAISE NOTICE '✅ Bidirectionality verified: All friendships have reverse pair';
  END IF;
END $$;

-- ============================================
-- STEP 10: Insert Migration Audit Record
-- ============================================

INSERT INTO migration_audit (migration_name, status, details)
VALUES (
  '20250118_bidirectional_friendships',
  'completed',
  jsonb_build_object(
    'table_created', 'friendships',
    'pattern', 'TWO-ROW bidirectional',
    'indexes_created', 5,
    'triggers_created', 2,
    'rls_policies', 4,
    'helper_functions', 3,
    'realtime_enabled', true,
    'data_migrated', true,
    'bidirectionality_verified', true
  )
);

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '🎉 MIGRATION 20250118_bidirectional_friendships COMPLETED';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Summary:';
  RAISE NOTICE '  ✅ Bidirectional friendships table created';
  RAISE NOTICE '  ✅ TWO-ROW pattern implemented (A→B & B→A)';
  RAISE NOTICE '  ✅ 5 performance indexes created';
  RAISE NOTICE '  ✅ 2 triggers: auto-reverse & unfriend timestamp';
  RAISE NOTICE '  ✅ 4 RLS policies enforced';
  RAISE NOTICE '  ✅ 3 helper functions created';
  RAISE NOTICE '  ✅ Realtime subscriptions enabled';
  RAISE NOTICE '  ✅ Data migrated from friend_connections';
  RAISE NOTICE '  ✅ Bidirectionality verified';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Next Steps:';
  RAISE NOTICE '  1. Update frontend services to use friendships table';
  RAISE NOTICE '  2. Test bidirectional insert/update';
  RAISE NOTICE '  3. Benchmark query performance (target < 30ms)';
  RAISE NOTICE '  4. Proceed to Story 9.1.3';
  RAISE NOTICE '========================================';
END $$;
