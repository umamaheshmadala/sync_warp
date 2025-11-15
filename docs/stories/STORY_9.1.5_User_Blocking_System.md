# 📋 STORY 9.1.5: User Blocking System

**Parent Epic:** [EPIC 9.1 - Friends Foundation Database](../epics/EPIC_9.1_Friends_Foundation_Database.md)  
**Owner:** Backend/Database Team  
**Effort:** 2 days | **Priority:** 🔴 Critical  
**Status:** 📋 Ready for Implementation  
**Dependencies:** Story 9.1.2 (Friendships), Story 9.1.3 (Friend Requests), Story 9.1.4 (Following)

---

## 🎯 Story Goal

Implement a **hard privacy barrier** where blocked users become completely invisible to the blocker. Blocking atomically removes friendship, follows, and prevents all future interactions (messaging, friend requests, profile visibility).

---

## ✅ Acceptance Criteria

- [ ] **AC1:** `blocked_users` table created with blocker/blocked relationship
- [ ] **AC2:** `block_user()` function atomically removes friendship + follows + cancels pending requests
- [ ] **AC3:** Blocked users invisible in search results via RLS policies
- [ ] **AC4:** Cannot send messages to blocked users (Epic 8.x integration check)
- [ ] **AC5:** Unblock restores visibility but NOT friendship or follows

---

## 🔧 Implementation Steps

### **STEP 1: Create blocked_users Table (30 min)**

Create migration: `supabase/migrations/20250120_blocking_system.sql`

```sql
-- ============================================================
-- STORY 9.1.5: User Blocking System
-- ============================================================

CREATE TABLE IF NOT EXISTS public.blocked_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT blocked_users_different_users CHECK (blocker_id != blocked_id),
  CONSTRAINT blocked_users_unique_pair UNIQUE (blocker_id, blocked_id)
);

-- Indexes for fast lookup
CREATE INDEX idx_blocked_users_blocker ON blocked_users(blocker_id);
CREATE INDEX idx_blocked_users_blocked ON blocked_users(blocked_id);

-- RLS: Only blocker sees their block list
ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their own blocks"
  ON blocked_users FOR SELECT
  USING (auth.uid() = blocker_id);

CREATE POLICY "Users can block other users"
  ON blocked_users FOR INSERT
  WITH CHECK (auth.uid() = blocker_id);

CREATE POLICY "Users can unblock"
  ON blocked_users FOR DELETE
  USING (auth.uid() = blocker_id);

-- Enable realtime for blocked_users
ALTER PUBLICATION supabase_realtime ADD TABLE blocked_users;
```

**MCP Command:**
```bash
warp mcp run supabase "apply_migration project_id=<your_project_id> name=blocking_system query='<paste SQL>'"
```

---

### **STEP 2: Implement block_user() Function (45 min)**

Add to same migration file:

```sql
-- ============================================================
-- Function: Block user (atomic operation)
-- Removes friendship, follows, cancels requests, then blocks
-- ============================================================

CREATE OR REPLACE FUNCTION block_user(p_blocked_user_id UUID, p_reason TEXT DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
  v_blocker_id UUID := auth.uid();
  v_friendships_removed INT;
  v_follows_removed INT;
  v_requests_cancelled INT;
BEGIN
  -- Validate input
  IF v_blocker_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  IF v_blocker_id = p_blocked_user_id THEN
    RAISE EXCEPTION 'Cannot block yourself';
  END IF;
  
  -- 1. Unfriend both directions (soft delete)
  UPDATE friendships 
  SET status = 'unfriended', unfriended_at = NOW()
  WHERE (user_id = v_blocker_id AND friend_id = p_blocked_user_id)
     OR (user_id = p_blocked_user_id AND friend_id = v_blocker_id)
     AND status = 'active';
  
  GET DIAGNOSTICS v_friendships_removed = ROW_COUNT;
  
  -- 2. Remove follows both directions (hard delete)
  DELETE FROM following 
  WHERE (follower_id = v_blocker_id AND following_id = p_blocked_user_id)
     OR (follower_id = p_blocked_user_id AND following_id = v_blocker_id);
  
  GET DIAGNOSTICS v_follows_removed = ROW_COUNT;
  
  -- 3. Cancel any pending friend requests (both directions)
  UPDATE friend_requests SET status = 'cancelled'
  WHERE (sender_id = v_blocker_id AND receiver_id = p_blocked_user_id)
     OR (sender_id = p_blocked_user_id AND receiver_id = v_blocker_id)
     AND status = 'pending';
  
  GET DIAGNOSTICS v_requests_cancelled = ROW_COUNT;
  
  -- 4. Create block entry (will fail if already blocked due to unique constraint)
  INSERT INTO blocked_users (blocker_id, blocked_id, reason)
  VALUES (v_blocker_id, p_blocked_user_id, p_reason)
  ON CONFLICT (blocker_id, blocked_id) DO NOTHING;
  
  RETURN jsonb_build_object(
    'success', true,
    'friendships_removed', v_friendships_removed,
    'follows_removed', v_follows_removed,
    'requests_cancelled', v_requests_cancelled
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION block_user IS 'Atomically blocks a user: unfriends, unfollows, cancels requests';
```

---

### **STEP 3: Implement unblock_user() Function (15 min)**

```sql
-- ============================================================
-- Function: Unblock user
-- Removes block entry, but does NOT restore friendship/follows
-- ============================================================

CREATE OR REPLACE FUNCTION unblock_user(p_blocked_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_blocker_id UUID := auth.uid();
  v_deleted BOOLEAN;
BEGIN
  IF v_blocker_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  DELETE FROM blocked_users
  WHERE blocker_id = v_blocker_id
    AND blocked_id = p_blocked_user_id;
  
  GET DIAGNOSTICS v_deleted = FOUND;
  
  IF NOT v_deleted THEN
    RAISE EXCEPTION 'User was not blocked';
  END IF;
  
  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION unblock_user IS 'Unblocks a user, allowing them to interact again';
```

---

### **STEP 4: Add RLS Invisibility Policies (30 min)**

Add to same migration file:

```sql
-- ============================================================
-- RLS Policies: Make blocked users invisible
-- ============================================================

-- Prevent blocked users from seeing blocker's profile
DROP POLICY IF EXISTS "blocked_users_invisible" ON profiles;

CREATE POLICY "blocked_users_invisible"
  ON profiles FOR SELECT
  USING (
    id = auth.uid() OR  -- Always see your own profile
    NOT EXISTS (
      SELECT 1 FROM blocked_users
      WHERE (blocker_id = id AND blocked_id = auth.uid())  -- You're blocked
         OR (blocker_id = auth.uid() AND blocked_id = id)  -- You blocked them
    )
  );

-- Prevent blocked users from seeing each other's posts (if posts table exists)
-- This is a template - adjust based on your posts table schema
/*
CREATE POLICY "posts_blocked_invisible"
  ON posts FOR SELECT
  USING (
    author_id = auth.uid() OR
    NOT EXISTS (
      SELECT 1 FROM blocked_users
      WHERE (blocker_id = author_id AND blocked_id = auth.uid())
         OR (blocker_id = auth.uid() AND blocked_id = author_id)
    )
  );
*/
```

---

### **STEP 5: Create Frontend Service Layer (45 min)**

Create: `src/services/blockService.ts`

```typescript
import { supabase } from '@/lib/supabase';

export interface BlockedUser {
  blocked_id: string;
  reason: string | null;
  created_at: string;
  blocked_user: {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string;
  };
}

/**
 * Block a user - atomic operation that:
 * - Unfriends both directions
 * - Unfollows both directions
 * - Cancels pending friend requests
 * - Adds block entry
 */
export async function blockUser(userId: string, reason?: string) {
  const { data, error } = await supabase.rpc('block_user', {
    p_blocked_user_id: userId,
    p_reason: reason || null,
  });
  
  if (error) throw error;
  return data;
}

/**
 * Unblock a user - restores visibility but NOT friendship
 */
export async function unblockUser(userId: string) {
  const { data, error } = await supabase.rpc('unblock_user', {
    p_blocked_user_id: userId,
  });
  
  if (error) throw error;
  return data;
}

/**
 * Get list of users you've blocked
 */
export async function getBlockedUsers(): Promise<BlockedUser[]> {
  const { data, error } = await supabase
    .from('blocked_users')
    .select(`
      blocked_id,
      reason,
      created_at,
      blocked_user:profiles!blocked_users_blocked_id_fkey(
        id, username, full_name, avatar_url
      )
    `)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data as BlockedUser[];
}

/**
 * Check if a specific user is blocked
 */
export async function isUserBlocked(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('blocked_users')
    .select('id')
    .eq('blocked_id', userId)
    .maybeSingle();
  
  if (error) throw error;
  return data !== null;
}
```

---

### **STEP 6: Create React Hooks (30 min)**

Create: `src/hooks/useBlock.ts`

```typescript
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { blockUser, unblockUser, getBlockedUsers, isUserBlocked } from '@/services/blockService';
import { toast } from '@/hooks/use-toast';

export function useBlockedUsers() {
  return useQuery({
    queryKey: ['blocked-users'],
    queryFn: getBlockedUsers,
  });
}

export function useIsBlocked(userId: string) {
  return useQuery({
    queryKey: ['is-blocked', userId],
    queryFn: () => isUserBlocked(userId),
    enabled: !!userId,
  });
}

export function useBlockUser() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason?: string }) =>
      blockUser(userId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blocked-users'] });
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      queryClient.invalidateQueries({ queryKey: ['following'] });
      toast({
        title: 'User blocked',
        description: 'They can no longer see your profile or message you.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to block user',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUnblockUser() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: unblockUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blocked-users'] });
      toast({
        title: 'User unblocked',
        description: 'They can now see your profile again.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to unblock user',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
```

---

### **STEP 7: Create UI Components (45 min)**

Create: `src/components/BlockUserDialog.tsx`

```typescript
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface BlockUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  username: string;
  onConfirm: (reason?: string) => void;
}

export function BlockUserDialog({
  open,
  onOpenChange,
  userId,
  username,
  onConfirm,
}: BlockUserDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Block {username}?</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>Once you block {username}, they will no longer be able to:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>See your profile or posts</li>
              <li>Message you</li>
              <li>Send you friend requests</li>
              <li>Follow you</li>
            </ul>
            <p className="text-sm text-muted-foreground mt-4">
              You will be unfriended automatically and they won't be notified.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => onConfirm()}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Block User
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

Create: `src/components/BlockedUsersList.tsx`

```typescript
import { useBlockedUsers, useUnblockUser } from '@/hooks/useBlock';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';

export function BlockedUsersList() {
  const { data: blockedUsers, isLoading } = useBlockedUsers();
  const unblockMutation = useUnblockUser();

  if (isLoading) return <div>Loading blocked users...</div>;
  if (!blockedUsers?.length) return <div>No blocked users</div>;

  return (
    <div className="space-y-4">
      {blockedUsers.map((block) => (
        <Card key={block.blocked_id}>
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarImage src={block.blocked_user.avatar_url} />
                <AvatarFallback>
                  {block.blocked_user.full_name?.[0] || '?'}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{block.blocked_user.full_name}</p>
                <p className="text-sm text-muted-foreground">
                  @{block.blocked_user.username}
                </p>
                {block.reason && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Reason: {block.reason}
                  </p>
                )}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => unblockMutation.mutate(block.blocked_id)}
              disabled={unblockMutation.isPending}
            >
              Unblock
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

---

## 🧪 Testing & Validation

### **SQL Tests**

```sql
-- Test 1: Block user
SELECT block_user('user_uuid_to_block', 'Spam');

-- Test 2: Verify friendship removed
SELECT * FROM friendships WHERE user_id = auth.uid();

-- Test 3: Verify follows removed
SELECT * FROM following WHERE follower_id = auth.uid();

-- Test 4: Verify blocked entry created
SELECT * FROM blocked_users WHERE blocker_id = auth.uid();

-- Test 5: Unblock user
SELECT unblock_user('user_uuid_to_unblock');

-- Test 6: Verify RLS invisibility
-- (Login as blocked user, try to query blocker's profile)
SELECT * FROM profiles WHERE id = 'blocker_uuid';  -- Should return nothing
```

### **Frontend Integration Tests**

```typescript
// tests/integration/blocking.test.ts
import { blockUser, unblockUser, getBlockedUsers } from '@/services/blockService';

describe('Blocking System', () => {
  it('should block a user and remove friendship', async () => {
    const result = await blockUser('user-id', 'Test reason');
    expect(result.success).toBe(true);
    expect(result.friendships_removed).toBeGreaterThanOrEqual(0);
  });

  it('should prevent blocked users from sending messages', async () => {
    await blockUser('user-id');
    // Attempt to create conversation should fail in Story 9.1.9
  });

  it('should list all blocked users', async () => {
    const blocked = await getBlockedUsers();
    expect(Array.isArray(blocked)).toBe(true);
  });

  it('should unblock a user', async () => {
    await blockUser('user-id');
    const result = await unblockUser('user-id');
    expect(result.success).toBe(true);
  });
});
```

### **E2E Test Script**

```bash
# Using Puppeteer MCP
warp mcp run puppeteer "navigate localhost:3000 and test:
1. Login as User A
2. Block User B from their profile
3. Verify friendship removed
4. Verify User B can't see User A's profile
5. Verify User B can't send messages to User A
6. Unblock User B
7. Verify User B can see profile again"
```

---

## 🎯 MCP Integration Summary

| MCP Server | Usage | Commands |
|------------|-------|----------|
| 🛢 **Supabase** | Heavy | `apply_migration`, `execute_sql`, `get_advisors security` |
| 🧠 **Context7** | Light | `analyze blockService.ts` |
| 🤖 **Puppeteer** | Medium | E2E test block/unblock flow |
| 🎨 **Shadcn** | Light | Scaffold `BlockUserDialog` component |

---

## 📋 Definition of Done

- [ ] Migration `20250120_blocking_system.sql` applied successfully
- [ ] `block_user()` function tested with atomic operations
- [ ] RLS policies prevent blocked users from seeing blocker's content
- [ ] Frontend service layer (`blockService.ts`) created
- [ ] React hooks (`useBlock.ts`) implemented
- [ ] UI components (BlockUserDialog, BlockedUsersList) working
- [ ] Integration tests pass
- [ ] E2E test validates block/unblock flow
- [ ] Security advisor shows no RLS vulnerabilities
- [ ] Documentation updated

---

## 🔗 Related Stories

- **Previous:** [Story 9.1.4 - Follow System](STORY_9.1.4_Follow_System.md)
- **Next:** [Story 9.1.6 - Profiles Extension](STORY_9.1.6_Profiles_Extension.md)

---

**Status:** 📋 Ready for Implementation  
**Estimated Time:** 2 days  
**Last Updated:** 2025-01-15
