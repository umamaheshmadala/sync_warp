# 📋 STORY 9.1.2: Implement Bidirectional Friendships Table

**Parent Epic:** [EPIC 9.1 - Friends Foundation Database](../epics/EPIC_9.1_Friends_Foundation_Database.md)  
**Story Owner:** Backend Engineering  
**Estimated Effort:** 2 days  
**Priority:** 🔴 Critical  
**Status:** 📋 To Do  
**Dependencies:** Story 9.1.1 (Audit & Migrate)

---

## 🎯 **Story Goal**

Redesign the `friendships` table to use a **bidirectional graph structure** (Facebook-style) where each friendship creates **TWO rows** (user_id ↔ friend_id) for instant O(1) lookups from both directions.

---

## ✅ **Acceptance Criteria**

- [ ] **AC1:** Bidirectional `friendships` table created with proper schema
  - Two rows created for each friendship (A→B and B→A)
  - Unique constraint on `(user_id, friend_id)` pair prevents duplicates
  - `status` column supports 'active' and 'unfriended' states
  
- [ ] **AC2:** Database trigger auto-creates reverse relationship
  - When row `(userA, userB)` is inserted, trigger creates `(userB, userA)`
  - Both rows share the same `created_at` timestamp
  - Trigger handles cascading updates (status changes propagate)
  
- [ ] **AC3:** Indexes created for O(1) friend lookups
  - Partial index on `user_id` WHERE `status = 'active'`
  - Partial index on `friend_id` WHERE `status = 'active'`
  - Query performance < 30ms for 1000 friends
  
- [ ] **AC4:** RLS policies enforce privacy
  - Users can only see their own friendships
  - Blocked users are invisible in queries
  - Policy tested with multiple user contexts
  
- [ ] **AC5:** Soft delete pattern implemented
  - `unfriended_at` timestamp instead of hard DELETE
  - Unfriended relationships can be queried for analytics
  - Trigger auto-sets `unfriended_at` on status change
  
- [ ] **AC6:** Frontend integration test passes
  - Friend list displays correctly after migration
  - Friendship mutations (add/remove) work bidirectionally
  - No console errors or broken UI

---

## 🔧 **Implementation Steps**

### **Step 1: Create Bidirectional Friendships Schema** (4 hours)

**File:** `supabase/migrations/20250117_bidirectional_friendships.sql`

```sql
-- ============================================
-- MIGRATION: Bidirectional Friendships Table
-- Date: 2025-01-17
-- Story: 9.1.2
-- ============================================

-- Drop existing table if recreating
-- DROP TABLE IF EXISTS friendships CASCADE;

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
COMMENT ON TABLE friendships IS 'Bidirectional friend relationships. Each friendship creates TWO rows: (A,B) and (B,A)';

-- Enable Row Level Security
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Partial index: Active friends by user_id
CREATE INDEX idx_friendships_user_active 
  ON friendships(user_id) 
  WHERE status = 'active';

-- Partial index: Active friends by friend_id (for reverse lookups)
CREATE INDEX idx_friendships_friend_active 
  ON friendships(friend_id) 
  WHERE status = 'active';

-- Index for unfriended relationships (analytics)
CREATE INDEX idx_friendships_unfriended 
  ON friendships(user_id, unfriended_at) 
  WHERE status = 'unfriended';

-- Composite index for status queries
CREATE INDEX idx_friendships_status_created 
  ON friendships(status, created_at DESC);

-- ============================================
-- TRIGGER: Auto-Create Reverse Relationship
-- ============================================

CREATE OR REPLACE FUNCTION create_reverse_friendship()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create reverse on INSERT if it doesn't exist
  IF TG_OP = 'INSERT' THEN
    INSERT INTO friendships (user_id, friend_id, status, created_at, metadata)
    VALUES (NEW.friend_id, NEW.user_id, NEW.status, NEW.created_at, NEW.metadata)
    ON CONFLICT (user_id, friend_id) DO NOTHING;
    
  -- On UPDATE, sync status to reverse relationship
  ELSIF TG_OP = 'UPDATE' AND (OLD.status != NEW.status) THEN
    UPDATE friendships 
    SET 
      status = NEW.status,
      unfriended_at = NEW.unfriended_at
    WHERE user_id = NEW.friend_id 
      AND friend_id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_reverse_friendship
  AFTER INSERT OR UPDATE ON friendships
  FOR EACH ROW
  EXECUTE FUNCTION create_reverse_friendship();

COMMENT ON FUNCTION create_reverse_friendship() IS 'Auto-creates reverse friendship row (B,A) when (A,B) is inserted';

-- ============================================
-- TRIGGER: Auto-Set unfriended_at
-- ============================================

CREATE OR REPLACE FUNCTION set_unfriended_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'unfriended' AND OLD.status = 'active' THEN
    NEW.unfriended_at := NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_unfriended_timestamp
  BEFORE UPDATE ON friendships
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION set_unfriended_timestamp();

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Policy: Users can view their own friendships
CREATE POLICY "Users view their friendships"
  ON friendships FOR SELECT
  USING (
    auth.uid() = user_id 
    OR auth.uid() = friend_id
  );

-- Policy: Users can insert friendships (will be controlled by app logic)
CREATE POLICY "Users create friendships"
  ON friendships FOR INSERT
  WITH CHECK (
    auth.uid() = user_id 
    AND user_id != friend_id
    AND NOT EXISTS (
      SELECT 1 FROM blocked_users
      WHERE (blocker_id = user_id AND blocked_id = friend_id)
         OR (blocker_id = friend_id AND blocked_id = user_id)
    )
  );

-- Policy: Users can update their own friendships (for unfriending)
CREATE POLICY "Users update their friendships"
  ON friendships FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their friendships (soft delete preferred)
CREATE POLICY "Users delete their friendships"
  ON friendships FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- REALTIME SUBSCRIPTIONS
-- ============================================

ALTER PUBLICATION supabase_realtime ADD TABLE friendships;

-- ============================================
-- DATA MIGRATION: Convert Unidirectional to Bidirectional
-- ============================================

DO $$
DECLARE
  friendship_record RECORD;
BEGIN
  -- For each existing friendship, ensure reverse exists
  FOR friendship_record IN 
    SELECT DISTINCT user_id, friend_id, status, created_at
    FROM friendships_legacy
  LOOP
    -- Insert both directions if not exists
    INSERT INTO friendships (user_id, friend_id, status, created_at)
    VALUES 
      (friendship_record.user_id, friendship_record.friend_id, 
       friendship_record.status, friendship_record.created_at)
    ON CONFLICT (user_id, friend_id) DO NOTHING;
    
    INSERT INTO friendships (user_id, friend_id, status, created_at)
    VALUES 
      (friendship_record.friend_id, friendship_record.user_id, 
       friendship_record.status, friendship_record.created_at)
    ON CONFLICT (user_id, friend_id) DO NOTHING;
  END LOOP;
  
  RAISE NOTICE '✅ Bidirectional friendships migration complete';
END $$;
```

**MCP Command:**
```bash
# Apply migration
warp mcp run supabase "apply_migration 20250117_bidirectional_friendships"

# Verify table structure
warp mcp run supabase "execute_sql \d+ friendships"

# Verify triggers created
warp mcp run supabase "execute_sql 
  SELECT tgname, tgtype, tgenabled 
  FROM pg_trigger 
  WHERE tgrelid = 'friendships'::regclass"
```

---

### **Step 2: Test Bidirectional Insert** (2 hours)

**Test Script:**

```sql
-- Test 1: Insert friendship creates reverse automatically
BEGIN;
  -- Insert one direction
  INSERT INTO friendships (user_id, friend_id)
  VALUES (
    (SELECT id FROM auth.users LIMIT 1 OFFSET 0),
    (SELECT id FROM auth.users LIMIT 1 OFFSET 1)
  );
  
  -- Verify reverse was created
  SELECT COUNT(*) FROM friendships; -- Should be 2
  
ROLLBACK;

-- Test 2: Update status propagates to reverse
BEGIN;
  DECLARE user_a UUID := (SELECT id FROM auth.users LIMIT 1 OFFSET 0);
  DECLARE user_b UUID := (SELECT id FROM auth.users LIMIT 1 OFFSET 1);
  
  -- Create friendship
  INSERT INTO friendships (user_id, friend_id) VALUES (user_a, user_b);
  
  -- Unfriend from one direction
  UPDATE friendships SET status = 'unfriended' 
  WHERE user_id = user_a AND friend_id = user_b;
  
  -- Verify reverse also unfriended
  SELECT status FROM friendships 
  WHERE user_id = user_b AND friend_id = user_a;
  -- Should return 'unfriended'
  
ROLLBACK;
```

**MCP Command:**
```bash
warp mcp run supabase "execute_sql [test script above]"
```

---

### **Step 3: Performance Benchmark** (2 hours)

**Benchmark Script:**

```sql
-- Test: Query performance with 1000 friends
EXPLAIN ANALYZE
SELECT f.friend_id, p.full_name, p.avatar_url
FROM friendships f
JOIN profiles p ON p.id = f.friend_id
WHERE f.user_id = (SELECT id FROM auth.users LIMIT 1)
  AND f.status = 'active'
ORDER BY p.full_name;

-- Expected: Index Scan using idx_friendships_user_active
-- Expected: Execution time < 30ms
```

**MCP Command:**
```bash
warp mcp run supabase "execute_sql EXPLAIN ANALYZE SELECT ..."

# Analyze query performance
warp mcp run context7 "analyze query performance for friendships table"
```

---

### **Step 4: Test RLS Policies** (2 hours)

**RLS Test Script:**

```sql
-- Test 1: User A sees only their friendships
SET request.jwt.claim.sub = '[user_a_id]';
SELECT COUNT(*) FROM friendships WHERE user_id = auth.uid();
-- Should return count of user A's friendships only

-- Test 2: User B cannot see User A's friendships
SET request.jwt.claim.sub = '[user_b_id]';
SELECT COUNT(*) FROM friendships WHERE user_id = '[user_a_id]';
-- Should return 0 (RLS blocks)

-- Test 3: Blocked users are invisible
SET request.jwt.claim.sub = '[user_a_id]';
SELECT COUNT(*) FROM friendships 
WHERE user_id = auth.uid() 
  AND friend_id = '[blocked_user_id]';
-- Should return 0 if blocked
```

**MCP Command:**
```bash
warp mcp run supabase "get_advisors security"
# Should return no RLS violations
```

---

## 🚀 **Frontend Integration**

### **Step 5: Update friendService.ts** (4 hours)

**File:** `src/services/friendService.ts`

```typescript
// src/services/friendService.ts
import { supabase } from '../lib/supabase';

export interface Friendship {
  id: string;
  user_id: string;
  friend_id: string;
  status: 'active' | 'unfriended';
  created_at: string;
  unfriended_at: string | null;
}

/**
 * Get all active friends for current user
 * Uses bidirectional friendship lookup
 */
export async function getFriends() {
  const { data, error } = await supabase
    .from('friendships')
    .select(`
      id,
      friend_id,
      status,
      created_at,
      friend:profiles!friendships_friend_id_fkey(
        id,
        username,
        full_name,
        avatar_url,
        is_online,
        last_active
      )
    `)
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (error) throw error;
  
  return data.map(f => ({
    ...f.friend,
    friendship_id: f.id,
    friendship_status: f.status,
    friends_since: f.created_at
  }));
}

/**
 * Check if two users are friends
 */
export async function areFriends(userId: string, friendId: string): Promise<boolean> {
  const { data } = await supabase
    .from('friendships')
    .select('id')
    .eq('user_id', userId)
    .eq('friend_id', friendId)
    .eq('status', 'active')
    .single();
  
  return !!data;
}

/**
 * Get friend count for a user
 */
export async function getFriendCount(userId: string): Promise<number> {
  const { count } = await supabase
    .from('friendships')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'active');
  
  return count || 0;
}
```

**MCP Context7 Analysis:**
```bash
# Analyze existing friendService.ts for breaking changes
warp mcp run context7 "analyze src/services/friendService.ts"

# Find all usages of getFriends()
warp mcp run context7 "find usage of getFriends function"
```

---

### **Step 6: Create React Hook** (2 hours)

**File:** `src/hooks/useFriendsList.ts`

```typescript
// src/hooks/useFriendsList.ts
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { getFriends } from '../services/friendService';
import { supabase } from '../lib/supabase';

export function useFriendsList() {
  const queryClient = useQueryClient();
  
  const { data: friends, isLoading, error } = useQuery({
    queryKey: ['friends'],
    queryFn: getFriends,
    staleTime: 30000, // Cache for 30 seconds
  });

  // Subscribe to realtime friendship changes
  useEffect(() => {
    const channel = supabase
      .channel('friendships_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friendships',
        },
        (payload) => {
          console.log('Friendship change:', payload);
          // Invalidate cache to refetch
          queryClient.invalidateQueries({ queryKey: ['friends'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return {
    friends: friends || [],
    isLoading,
    error,
  };
}
```

---

### **Step 7: Frontend Testing** (2 hours)

**Manual Test Plan:**

1. **Open Friends List:**
   - Navigate to `/friends`
   - Verify friends display correctly
   - Check no console errors

2. **Test Bidirectional Lookup:**
   - Open Network tab
   - Verify query uses index (< 30ms response time)
   - Check only ONE database query (not N+1)

3. **Test Realtime Updates:**
   - Open app in two browser windows (User A and User B)
   - Accept friend request in Window A
   - Verify friends list updates in Window B within 2 seconds

**Automated Test:**

```typescript
// tests/integration/friendships.test.ts
import { describe, it, expect } from 'vitest';
import { getFriends, areFriends } from '../services/friendService';

describe('Bidirectional Friendships', () => {
  it('should return friends list for user', async () => {
    const friends = await getFriends();
    expect(Array.isArray(friends)).toBe(true);
  });

  it('should check if users are friends bidirectionally', async () => {
    const userA = 'user-a-id';
    const userB = 'user-b-id';
    
    const isFriend = await areFriends(userA, userB);
    expect(typeof isFriend).toBe('boolean');
  });
});
```

**MCP Puppeteer E2E Test:**
```bash
warp mcp run puppeteer "test bidirectional friendship flow:
1. Login as User A
2. Navigate to friends list
3. Verify friends display
4. Check friend count matches database"
```

---

## 📦 **Deliverables**

- [ ] `supabase/migrations/20250117_bidirectional_friendships.sql` - Migration script
- [ ] `src/services/friendService.ts` - Updated service functions
- [ ] `src/hooks/useFriendsList.ts` - React hook for friends list
- [ ] `tests/integration/friendships.test.ts` - Integration tests
- [ ] Performance benchmark report (< 30ms query time)

---

## 🎯 **MCP Integration Summary**

| MCP Server | Usage | Commands |
|------------|-------|----------|
| 🛢 **Supabase** | Heavy | `apply_migration`, `execute_sql`, `get_advisors` |
| 🧠 **Context7** | Medium | `analyze`, `find usage` |
| 🤖 **Puppeteer** | Light | E2E test for friends list |

---

## ✅ **Definition of Done**

- [ ] Migration applied successfully on branch database
- [ ] Bidirectional trigger creates reverse relationships
- [ ] Indexes created and used by queries (verified with EXPLAIN ANALYZE)
- [ ] RLS policies tested with multiple user contexts
- [ ] Query performance < 30ms for 1000 friends
- [ ] Frontend displays friends list correctly
- [ ] Realtime updates work within 2 seconds
- [ ] No console errors or broken UI
- [ ] Code reviewed and approved

---

**Next Story:** [STORY 9.1.3 - Friend Requests with Auto-Expiry](./STORY_9.1.3_Friend_Requests_Auto_Expiry.md)
