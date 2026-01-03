# 📋 STORY 9.1.4: Follow System (Instagram-style)

**Parent Epic:** [EPIC 9.1 - Friends Foundation Database](../epics/EPIC_9.1_Friends_Foundation_Database.md)  
**Story Owner:** Backend Engineering  
**Estimated Effort:** 1 day  
**Priority:** 🟡 Medium  
**Status:** 📋 To Do  
**Dependencies:** Story 9.1.2 (Bidirectional Friendships)

---

## 🎯 **Story Goal**

Implement Instagram/Twitter-style **one-way follow relationships** that are separate from mutual friendships, allowing users to follow others without requiring acceptance.

---

## ✅ **Acceptance Criteria**

- [ ] **AC1:** `following` table created with public visibility
  - Stores follower_id and following_id pairs
  - Public (anyone can see who follows whom)
  - Unique constraint prevents duplicate follows
  
- [ ] **AC2:** Follow/unfollow operations work instantly
  - No approval required (unlike friend requests)
  - Immediate effect on follower/following counts
  
- [ ] **AC3:** Auto-unfollow trigger on unfriend
  - When users unfriend, both follows are removed
  - Maintains data consistency
  
- [ ] **AC4:** Follower/following counts tracked in profiles
  - Real-time count updates via trigger
  - Visible in user profiles
  
- [ ] **AC5:** Frontend follow button integration
  - Toggle between "Follow" / "Following"
  - Works from user profiles and search results
  - Real-time updates (< 2 seconds)

---

## 🔧 **Implementation Steps**

### **Step 1: Create Following Table** (2 hours)

**File:** `supabase/migrations/20250119_following_system.sql`

```sql
-- ============================================
-- MIGRATION: Follow System (Instagram-style)
-- Date: 2025-01-19
-- Story: 9.1.4
-- ============================================

CREATE TABLE IF NOT EXISTS public.following (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Constraints
  CONSTRAINT following_different_users 
    CHECK (follower_id != following_id),
  CONSTRAINT following_unique_pair 
    UNIQUE (follower_id, following_id)
);

COMMENT ON TABLE following IS 'One-way follow relationships (Instagram-style)';

-- Enable RLS
ALTER TABLE following ENABLE ROW LEVEL SECURITY;

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_following_follower_id ON following(follower_id);
CREATE INDEX idx_following_following_id ON following(following_id);
CREATE INDEX idx_following_created_at ON following(created_at DESC);

-- ============================================
-- RLS POLICIES (Public visibility)
-- ============================================

-- Anyone can view follows (public information)
CREATE POLICY "Anyone can view follows"
  ON following FOR SELECT
  USING (true);

-- Users can follow anyone
CREATE POLICY "Users can follow others"
  ON following FOR INSERT
  WITH CHECK (
    auth.uid() = follower_id
    AND follower_id != following_id
  );

-- Users can unfollow anyone they follow
CREATE POLICY "Users can unfollow"
  ON following FOR DELETE
  USING (auth.uid() = follower_id);

-- ============================================
-- TRIGGER: Auto-Unfollow on Unfriend
-- ============================================

CREATE OR REPLACE FUNCTION auto_unfollow_on_unfriend()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'unfriended' THEN
    -- Remove both directions of follow
    DELETE FROM following 
    WHERE (follower_id = NEW.user_id AND following_id = NEW.friend_id)
       OR (follower_id = NEW.friend_id AND following_id = NEW.user_id);
       
    RAISE NOTICE 'Auto-unfollowed users % and %', NEW.user_id, NEW.friend_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_unfollow
  AFTER UPDATE ON friendships
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION auto_unfollow_on_unfriend();

-- ============================================
-- TRIGGER: Update Follower/Following Counts
-- ============================================

CREATE OR REPLACE FUNCTION update_follow_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Increment counts
    UPDATE profiles 
    SET following_count = following_count + 1 
    WHERE id = NEW.follower_id;
    
    UPDATE profiles 
    SET follower_count = follower_count + 1 
    WHERE id = NEW.following_id;
    
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement counts
    UPDATE profiles 
    SET following_count = GREATEST(following_count - 1, 0)
    WHERE id = OLD.follower_id;
    
    UPDATE profiles 
    SET follower_count = GREATEST(follower_count - 1, 0)
    WHERE id = OLD.following_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_follow_counts
  AFTER INSERT OR DELETE ON following
  FOR EACH ROW
  EXECUTE FUNCTION update_follow_counts();

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Check if user A follows user B
CREATE OR REPLACE FUNCTION is_following(
  p_follower_id UUID,
  p_following_id UUID
)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM following
    WHERE follower_id = p_follower_id
      AND following_id = p_following_id
  );
$$ LANGUAGE sql STABLE;

-- Get follower count for user
CREATE OR REPLACE FUNCTION get_follower_count(p_user_id UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER FROM following
  WHERE following_id = p_user_id;
$$ LANGUAGE sql STABLE;

-- Get following count for user
CREATE OR REPLACE FUNCTION get_following_count(p_user_id UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER FROM following
  WHERE follower_id = p_user_id;
$$ LANGUAGE sql STABLE;

-- ============================================
-- REALTIME SUBSCRIPTIONS
-- ============================================

ALTER PUBLICATION supabase_realtime ADD TABLE following;
```

**MCP Command:**
```bash
warp mcp run supabase "apply_migration 20250119_following_system"
warp mcp run supabase "execute_sql SELECT * FROM following LIMIT 5"
```

---

### **Step 2: Create Follow Service** (2 hours)

**File:** `src/services/followService.ts`

```typescript
// src/services/followService.ts
import { supabase } from '../lib/supabase';

/**
 * Follow a user
 */
export async function followUser(userId: string) {
  const { error } = await supabase
    .from('following')
    .insert({
      follower_id: (await supabase.auth.getUser()).data.user!.id,
      following_id: userId,
    });

  if (error) throw error;
}

/**
 * Unfollow a user
 */
export async function unfollowUser(userId: string) {
  const { error } = await supabase
    .from('following')
    .delete()
    .eq('follower_id', (await supabase.auth.getUser()).data.user!.id)
    .eq('following_id', userId);

  if (error) throw error;
}

/**
 * Check if current user follows another user
 */
export async function isFollowing(userId: string): Promise<boolean> {
  const { data } = await supabase.rpc('is_following', {
    p_follower_id: (await supabase.auth.getUser()).data.user!.id,
    p_following_id: userId,
  });

  return data || false;
}

/**
 * Get followers list
 */
export async function getFollowers(userId: string) {
  const { data, error } = await supabase
    .from('following')
    .select(`
      follower_id,
      created_at,
      follower:profiles!following_follower_id_fkey(
        id,
        username,
        full_name,
        avatar_url
      )
    `)
    .eq('following_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data.map(f => ({ ...f.follower, followed_at: f.created_at }));
}

/**
 * Get following list
 */
export async function getFollowing(userId: string) {
  const { data, error } = await supabase
    .from('following')
    .select(`
      following_id,
      created_at,
      following:profiles!following_following_id_fkey(
        id,
        username,
        full_name,
        avatar_url
      )
    `)
    .eq('follower_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data.map(f => ({ ...f.following, followed_at: f.created_at }));
}
```

---

### **Step 3: Create React Hook** (2 hours)

**File:** `src/hooks/useFollow.ts`

```typescript
// src/hooks/useFollow.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  followUser,
  unfollowUser,
  isFollowing,
  getFollowers,
  getFollowing,
} from '../services/followService';
import { toast } from 'sonner';

export function useFollow(userId: string) {
  const queryClient = useQueryClient();

  // Query: Check if following
  const { data: following = false } = useQuery({
    queryKey: ['following', userId],
    queryFn: () => isFollowing(userId),
    enabled: !!userId,
  });

  // Mutation: Follow
  const follow = useMutation({
    mutationFn: () => followUser(userId),
    onSuccess: () => {
      toast.success('Following user');
      queryClient.invalidateQueries({ queryKey: ['following', userId] });
      queryClient.invalidateQueries({ queryKey: ['followers'] });
      queryClient.invalidateQueries({ queryKey: ['profile', userId] });
    },
  });

  // Mutation: Unfollow
  const unfollow = useMutation({
    mutationFn: () => unfollowUser(userId),
    onSuccess: () => {
      toast.success('Unfollowed user');
      queryClient.invalidateQueries({ queryKey: ['following', userId] });
      queryClient.invalidateQueries({ queryKey: ['followers'] });
      queryClient.invalidateQueries({ queryKey: ['profile', userId] });
    },
  });

  return {
    following,
    follow: follow.mutate,
    unfollow: unfollow.mutate,
    isLoading: follow.isPending || unfollow.isPending,
  };
}

export function useFollowers(userId: string) {
  return useQuery({
    queryKey: ['followers', userId],
    queryFn: () => getFollowers(userId),
    enabled: !!userId,
  });
}

export function useFollowing(userId: string) {
  return useQuery({
    queryKey: ['following-list', userId],
    queryFn: () => getFollowing(userId),
    enabled: !!userId,
  });
}
```

---

### **Step 4: Create Follow Button Component** (2 hours)

**File:** `src/components/FollowButton.tsx`

```typescript
// src/components/FollowButton.tsx
import { useFollow } from '../hooks/useFollow';
import { Button } from './ui/button';
import { UserPlus, UserCheck } from 'lucide-react';

interface Props {
  userId: string;
  variant?: 'default' | 'outline';
  size?: 'sm' | 'default' | 'lg';
}

export function FollowButton({ userId, variant = 'default', size = 'default' }: Props) {
  const { following, follow, unfollow, isLoading } = useFollow(userId);

  if (following) {
    return (
      <Button
        variant="outline"
        size={size}
        onClick={() => unfollow()}
        disabled={isLoading}
      >
        <UserCheck className="w-4 h-4 mr-2" />
        Following
      </Button>
    );
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={() => follow()}
      disabled={isLoading}
    >
      <UserPlus className="w-4 h-4 mr-2" />
      Follow
    </Button>
  );
}
```

---

### **Step 5: Test Follow System** (2 hours)

**Test Script:**

```sql
-- Test 1: Follow user
INSERT INTO following (follower_id, following_id)
VALUES (
  (SELECT id FROM auth.users LIMIT 1 OFFSET 0),
  (SELECT id FROM auth.users LIMIT 1 OFFSET 1)
);

-- Test 2: Verify counts updated
SELECT id, follower_count, following_count 
FROM profiles 
WHERE id IN (
  SELECT id FROM auth.users LIMIT 2
);

-- Test 3: Verify auto-unfollow on unfriend
UPDATE friendships SET status = 'unfriended'
WHERE user_id = (SELECT id FROM auth.users LIMIT 1 OFFSET 0)
  AND friend_id = (SELECT id FROM auth.users LIMIT 1 OFFSET 1);

-- Verify follows removed
SELECT COUNT(*) FROM following
WHERE follower_id = (SELECT id FROM auth.users LIMIT 1 OFFSET 0)
  AND following_id = (SELECT id FROM auth.users LIMIT 1 OFFSET 1);
-- Should return 0
```

**MCP Commands:**
```bash
warp mcp run supabase "execute_sql [test script]"
warp mcp run context7 "analyze src/services/followService.ts"
```

---

## 📦 **Deliverables**

- [ ] `supabase/migrations/20250119_following_system.sql`
- [ ] `src/services/followService.ts`
- [ ] `src/hooks/useFollow.ts`
- [ ] `src/components/FollowButton.tsx`

---

## 🎯 **MCP Integration Summary**

| MCP Server | Usage | Commands |
|------------|-------|----------|
| 🛢 **Supabase** | Heavy | `apply_migration`, `execute_sql` |
| 🧠 **Context7** | Light | `analyze followService.ts` |
| 🤖 **Puppeteer** | Light | E2E test follow button |

---

## ✅ **Definition of Done**

- [ ] Migration applied successfully
- [ ] Follow/unfollow works instantly
- [ ] Auto-unfollow trigger tested
- [ ] Follower/following counts update correctly
- [ ] Follow button works in UI
- [ ] Real-time updates work (< 2 seconds)
- [ ] Code reviewed and approved

---

**Next Story:** [STORY 9.1.5 - User Blocking System](./STORY_9.1.5_User_Blocking_System.md)
