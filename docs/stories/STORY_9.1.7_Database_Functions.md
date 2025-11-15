# 📋 STORY 9.1.7: Database Functions for Friend Operations

**Parent Epic:** [EPIC 9.1 - Friends Foundation Database](../epics/EPIC_9.1_Friends_Foundation_Database.md)  
**Owner:** Backend/Database Team  
**Effort:** 2 days | **Priority:** 🔴 Critical  
**Status:** 📋 Ready for Implementation  
**Dependencies:** Story 9.1.2 (Friendships), Story 9.1.4 (Following)

---

## 🎯 Story Goal

Create reusable, performant database functions for common friend operations including unfriend, mutual friends discovery, friend search, and online friend counting. All functions must execute in < 50ms.

---

## ✅ Acceptance Criteria

- [ ] **AC1:** unfriend() function with automatic unfollow
- [ ] **AC2:** get_mutual_friends() returns shared friends efficiently
- [ ] **AC3:** search_friends() with full-text search capability  
- [ ] **AC4:** get_online_friends_count() for realtime metrics
- [ ] **AC5:** get_friend_recommendations() returns "People You May Know" suggestions
- [ ] **AC6:** All functions execute in < 50ms (verified with EXPLAIN ANALYZE)

---

## 🔧 Implementation Steps

### **STEP 1: Create unfriend() Function (30 min)**

Create migration: `supabase/migrations/20250122_friend_functions.sql`

`sql
-- ============================================================
-- STORY 9.1.7: Database Functions for Friend Operations
-- ============================================================

-- Function: Unfriend a user
CREATE OR REPLACE FUNCTION unfriend(p_friend_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_current_user_id UUID := auth.uid();
  v_rows_updated INT;
BEGIN
  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  IF v_current_user_id = p_friend_user_id THEN
    RAISE EXCEPTION 'Cannot unfriend yourself';
  END IF;
  
  -- Soft delete friendship (both directions)
  UPDATE friendships 
  SET status = 'unfriended', unfriended_at = NOW()
  WHERE (user_id = v_current_user_id AND friend_id = p_friend_user_id)
     OR (user_id = p_friend_user_id AND friend_id = v_current_user_id)
     AND status = 'active';
  
  GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
  
  -- Auto-unfollow both directions
  DELETE FROM following 
  WHERE (follower_id = v_current_user_id AND following_id = p_friend_user_id)
     OR (follower_id = p_friend_user_id AND following_id = v_current_user_id);
  
  RETURN jsonb_build_object(
    'success', true,
    'unfriended_count', v_rows_updated
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION unfriend IS 'Unfriend a user and auto-unfollow both directions';
`

**MCP Command:**
`ash
warp mcp run supabase \"apply_migration project_id=<your_project_id> name=friend_functions query='<paste SQL>'\"
`

---

### **STEP 2: Create get_mutual_friends() Function (45 min)**

Add to same migration file:

`sql
-- ============================================================
-- Function: Get mutual friends
-- Returns users who are friends with both the caller and target
-- ============================================================

CREATE OR REPLACE FUNCTION get_mutual_friends(p_target_user_id UUID)
RETURNS TABLE(
  friend_id UUID, 
  username TEXT, 
  full_name TEXT, 
  avatar_url TEXT,
  is_online BOOLEAN
) AS $$
  SELECT 
    p.id, 
    p.username, 
    p.full_name, 
    p.avatar_url,
    p.is_online
  FROM friendships f1
  JOIN friendships f2 
    ON f1.friend_id = f2.friend_id
  JOIN profiles p 
    ON p.id = f1.friend_id
  WHERE f1.user_id = auth.uid() 
    AND f2.user_id = p_target_user_id
    AND f1.status = 'active' 
    AND f2.status = 'active'
    -- Exclude blocked users
    AND NOT EXISTS (
      SELECT 1 FROM blocked_users
      WHERE (blocker_id = auth.uid() AND blocked_id = p.id)
         OR (blocker_id = p.id AND blocked_id = auth.uid())
    )
  ORDER BY p.full_name;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION get_mutual_friends IS 'Returns shared friends between two users';

-- Create index to speed up mutual friends query
CREATE INDEX IF NOT EXISTS idx_friendships_user_friend_status 
  ON friendships(user_id, friend_id, status) 
  WHERE status = 'active';
`

---

### **STEP 3: Create search_friends() Function (45 min)**

`sql
-- ============================================================
-- Function: Search friends with full-text search
-- Searches friend's username and full_name
-- ============================================================

CREATE OR REPLACE FUNCTION search_friends(p_query TEXT)
RETURNS TABLE(
  friend_id UUID,
  username TEXT,
  full_name TEXT,
  avatar_url TEXT,
  is_online BOOLEAN,
  rank REAL
) AS $$
  SELECT 
    p.id,
    p.username,
    p.full_name,
    p.avatar_url,
    p.is_online,
    ts_rank(
      to_tsvector('english', COALESCE(p.full_name, '') || ' ' || COALESCE(p.username, '')),
      plainto_tsquery('english', p_query)
    ) AS rank
  FROM friendships f
  JOIN profiles p ON p.id = f.friend_id
  WHERE f.user_id = auth.uid()
    AND f.status = 'active'
    AND (
      p.full_name ILIKE '%' || p_query || '%'
      OR p.username ILIKE '%' || p_query || '%'
    )
    -- Exclude blocked users
    AND NOT EXISTS (
      SELECT 1 FROM blocked_users
      WHERE (blocker_id = auth.uid() AND blocked_id = p.id)
         OR (blocker_id = p.id AND blocked_id = auth.uid())
    )
  ORDER BY rank DESC, p.full_name
  LIMIT 50;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION search_friends IS 'Full-text search across friends list';

-- Add GIN index for full-text search
CREATE INDEX IF NOT EXISTS idx_profiles_fulltext_search 
  ON profiles USING GIN (
    to_tsvector('english', COALESCE(full_name, '') || ' ' || COALESCE(username, ''))
  );
`

---

### **STEP 4: Create get_online_friends_count() (30 min)**

`sql
-- ============================================================
-- Function: Get count of online friends
-- Used for \"X friends online\" indicators
-- ============================================================

CREATE OR REPLACE FUNCTION get_online_friends_count()
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM friendships f
  JOIN profiles p ON p.id = f.friend_id
  WHERE f.user_id = auth.uid()
    AND f.status = 'active'
    AND p.is_online = true
    -- Exclude blocked users
    AND NOT EXISTS (
      SELECT 1 FROM blocked_users
      WHERE (blocker_id = auth.uid() AND blocked_id = p.id)
         OR (blocker_id = p.id AND blocked_id = auth.uid())
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION get_online_friends_count IS 'Returns count of currently online friends';
`

---

### **STEP 5: Create get_friend_recommendations() Function (45 min)**

Add to same migration file:

`sql
-- ============================================================
-- Function: Get friend recommendations ("People You May Know")
-- Returns non-friends who share mutual friends with the user
-- ============================================================

CREATE OR REPLACE FUNCTION get_friend_recommendations(p_limit INT DEFAULT 10)
RETURNS TABLE(
  user_id UUID,
  username TEXT,
  full_name TEXT,
  avatar_url TEXT,
  mutual_friends_count INT,
  is_online BOOLEAN
) AS $$
  SELECT 
    p.id,
    p.username,
    p.full_name,
    p.avatar_url,
    COUNT(DISTINCT f2.friend_id)::INT as mutual_friends_count,
    p.is_online
  FROM profiles p
  JOIN friendships f2 ON f2.user_id = p.id
  WHERE 
    -- Exclude yourself
    p.id != auth.uid()
    -- Exclude existing friends
    AND p.id NOT IN (
      SELECT friend_id FROM friendships 
      WHERE user_id = auth.uid() AND status = 'active'
    )
    -- Exclude users with pending friend requests
    AND p.id NOT IN (
      SELECT sender_id FROM friend_requests 
      WHERE receiver_id = auth.uid() AND status = 'pending'
    )
    AND p.id NOT IN (
      SELECT receiver_id FROM friend_requests 
      WHERE sender_id = auth.uid() AND status = 'pending'
    )
    -- Must have mutual friends (shared connections)
    AND f2.friend_id IN (
      SELECT friend_id FROM friendships 
      WHERE user_id = auth.uid() AND status = 'active'
    )
    AND f2.status = 'active'
    -- Exclude blocked users
    AND NOT EXISTS (
      SELECT 1 FROM blocked_users
      WHERE (blocker_id = auth.uid() AND blocked_id = p.id)
         OR (blocker_id = p.id AND blocked_id = auth.uid())
    )
  GROUP BY p.id, p.username, p.full_name, p.avatar_url, p.is_online
  HAVING COUNT(DISTINCT f2.friend_id) > 0
  ORDER BY mutual_friends_count DESC, p.full_name
  LIMIT p_limit;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION get_friend_recommendations IS 'Returns friend recommendations based on mutual friends';
`

---

### **STEP 6: Performance Benchmarking (30 min)**

Add to migration file:

`sql
-- ============================================================
-- Performance Tests
-- All functions must execute in < 50ms
-- ============================================================

-- Test 1: unfriend() performance
EXPLAIN ANALYZE
SELECT unfriend('test_user_uuid');

-- Test 2: get_mutual_friends() performance  
EXPLAIN ANALYZE
SELECT * FROM get_mutual_friends('test_user_uuid');

-- Test 3: search_friends() performance
EXPLAIN ANALYZE
SELECT * FROM search_friends('john');

-- Test 4: get_online_friends_count() performance
EXPLAIN ANALYZE
SELECT get_online_friends_count();

-- Test 5: get_friend_recommendations() performance
EXPLAIN ANALYZE
SELECT * FROM get_friend_recommendations(10);

-- Expected: Execution Time < 50ms for all queries (< 100ms for recommendations)
`

**MCP Command:**
`ash
warp mcp run supabase \"execute_sql project_id=<your_project_id> query='EXPLAIN ANALYZE SELECT * FROM get_mutual_friends(...)'\"
`

---

### **STEP 6: Create Frontend Service Updates (45 min)**

Update: `src/services/friendService.ts`

`	ypescript
// Add these functions to existing friendService.ts

/**
 * Unfriend a user - removes friendship and follows
 */
export async function unfriend(userId: string) {
  const { data, error } = await supabase.rpc('unfriend', {
    p_friend_user_id: userId,
  });
  
  if (error) throw error;
  return data;
}

/**
 * Get mutual friends with another user
 */
export async function getMutualFriends(userId: string) {
  const { data, error } = await supabase.rpc('get_mutual_friends', {
    p_target_user_id: userId,
  });
  
  if (error) throw error;
  return data;
}

/**
 * Search friends by name or username
 */
export async function searchFriends(query: string) {
  const { data, error } = await supabase.rpc('search_friends', {
    p_query: query,
  });
  
  if (error) throw error;
  return data;
}

/**
 * Get count of online friends
 */
export async function getOnlineFriendsCount(): Promise<number> {
  const { data, error } = await supabase.rpc('get_online_friends_count');
  
  if (error) throw error;
  return data;
}

/**
 * Get friend recommendations ("People You May Know")
 */
export async function getFriendRecommendations(limit: number = 10) {
  const { data, error } = await supabase.rpc('get_friend_recommendations', {
    p_limit: limit,
  });
  
  if (error) throw error;
  return data;
}
`

---

### **STEP 7: Create React Hooks (30 min)**

Create: `src/hooks/useFriendOperations.ts`

`	ypescript
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  unfriend, 
  getMutualFriends, 
  searchFriends, 
  getOnlineFriendsCount,
  getFriendRecommendations 
} from '@/services/friendService';
import { toast } from '@/hooks/use-toast';

export function useUnfriend() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: unfriend,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      queryClient.invalidateQueries({ queryKey: ['following'] });
      toast({
        title: 'Friend removed',
        description: 'You are no longer friends with this user.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to unfriend',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useMutualFriends(userId: string) {
  return useQuery({
    queryKey: ['mutual-friends', userId],
    queryFn: () => getMutualFriends(userId),
    enabled: !!userId,
  });
}

export function useSearchFriends(query: string) {
  return useQuery({
    queryKey: ['search-friends', query],
    queryFn: () => searchFriends(query),
    enabled: query.length >= 2, // Only search if 2+ characters
  });
}

export function useOnlineFriendsCount() {
  return useQuery({
    queryKey: ['online-friends-count'],
    queryFn: getOnlineFriendsCount,
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

export function useFriendRecommendations(limit: number = 10) {
  return useQuery({
    queryKey: ['friend-recommendations', limit],
    queryFn: () => getFriendRecommendations(limit),
  });
}
`

---

## 🧪 Testing & Validation

### **SQL Tests**

`sql
-- Test 1: Unfriend function
SELECT unfriend('friend_user_uuid');
SELECT * FROM friendships WHERE user_id = auth.uid();

-- Test 2: Mutual friends
SELECT * FROM get_mutual_friends('target_user_uuid');

-- Test 3: Search friends
SELECT * FROM search_friends('john');
SELECT * FROM search_friends('doe');

-- Test 4: Online friends count
SELECT get_online_friends_count();

-- Test 5: Friend recommendations
SELECT * FROM get_friend_recommendations(10);

-- Test 6: Performance validation
-- All should execute in < 50ms
EXPLAIN ANALYZE SELECT * FROM get_mutual_friends('uuid');
EXPLAIN ANALYZE SELECT * FROM search_friends('test');
`

### **Frontend Integration Tests**

`	ypescript
// tests/integration/friendOperations.test.ts
describe('Friend Operations', () => {
  it('should unfriend a user', async () => {
    const result = await unfriend('friend-id');
    expect(result.success).toBe(true);
  });

  it('should return mutual friends', async () => {
    const mutuals = await getMutualFriends('user-id');
    expect(Array.isArray(mutuals)).toBe(true);
  });

  it('should search friends by name', async () => {
    const results = await searchFriends('john');
    expect(results.length).toBeGreaterThanOrEqual(0);
  });

  it('should get online friends count', async () => {
    const count = await getOnlineFriendsCount();
    expect(typeof count).toBe('number');
    expect(count).toBeGreaterThanOrEqual(0);
  });

  it('should get friend recommendations', async () => {
    const recommendations = await getFriendRecommendations(5);
    expect(Array.isArray(recommendations)).toBe(true);
    recommendations.forEach(rec => {
      expect(rec.mutual_friends_count).toBeGreaterThan(0);
    });
  });
});
`

---

## 🎯 MCP Integration Summary

| MCP Server | Usage | Commands |
|------------|-------|----------|
| 🛢 **Supabase** | Heavy | `apply_migration`, `execute_sql`, performance benchmarks |
| 🧠 **Context7** | Medium | Analyze friendService.ts for optimization |
| 🤖 **Puppeteer** | Light | E2E test search functionality |

---

## 📋 Definition of Done

- [ ] Migration `20250122_friend_functions.sql` applied
- [ ] All 4 database functions created
- [ ] Performance benchmarks < 50ms verified
- [ ] Indexes created for optimal performance
- [ ] Frontend service layer updated
- [ ] React hooks created
- [ ] Integration tests pass
- [ ] EXPLAIN ANALYZE confirms query optimization
- [ ] Documentation updated

---

## 🔗 Related Stories

- **Previous:** [Story 9.1.6 - Profiles Extension](STORY_9.1.6_Profiles_Extension.md)
- **Next:** [Story 9.1.8 - Notifications Integration](STORY_9.1.8_Notifications_Integration.md)

---

**Status:** 📋 Ready for Implementation  
**Estimated Time:** 2 days  
**Last Updated:** 2025-01-15
