# 📋 Stories 9.1.5 - 9.1.9: Complete Implementation Guide

**Parent Epic:** [EPIC 9.1 - Friends Foundation Database](../epics/EPIC_9.1_Friends_Foundation_Database.md)  
**Status:** 📋 Ready for Implementation  
**Total Effort:** 8 days

This document contains complete implementation details for the final 5 stories of Epic 9.1.
Each story follows the same detailed format as Stories 9.1.1-9.1.4.

---

## 📋 STORY 9.1.5: User Blocking System

**Effort:** 2 days | **Priority:** 🔴 Critical  
**Dependencies:** Story 9.1.2, 9.1.3, 9.1.4

### Goal
Implement hard privacy barrier where blocked users cannot find, message, or interact with blocker.

### Acceptance Criteria
- `blocked_users` table created
- `block_user()` function removes friendship + follows atomically
- Blocked users invisible in search results (RLS)
- Cannot send messages to blocked users (Epic 8.x integration)
- Unblock restores visibility but NOT friendship

### Migration: `20250120_blocking_system.sql`

```sql
CREATE TABLE IF NOT EXISTS public.blocked_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT blocked_users_different_users CHECK (blocker_id != blocked_id),
  CONSTRAINT blocked_users_unique_pair UNIQUE (blocker_id, blocked_id)
);

CREATE INDEX idx_blocked_users_blocker ON blocked_users(blocker_id);
CREATE INDEX idx_blocked_users_blocked ON blocked_users(blocked_id);

-- RLS: Only blocker sees their block list
CREATE POLICY "Users view their blocks"
  ON blocked_users FOR SELECT
  USING (auth.uid() = blocker_id);

-- Function: Block user (atomic operation)
CREATE OR REPLACE FUNCTION block_user(p_blocked_user_id UUID, p_reason TEXT DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
  v_blocker_id UUID := auth.uid();
BEGIN
  -- Unfriend both directions
  UPDATE friendships 
  SET status = 'unfriended', unfriended_at = NOW()
  WHERE (user_id = v_blocker_id AND friend_id = p_blocked_user_id)
     OR (user_id = p_blocked_user_id AND friend_id = v_blocker_id);
  
  -- Remove follows both directions
  DELETE FROM following 
  WHERE (follower_id = v_blocker_id AND following_id = p_blocked_user_id)
     OR (follower_id = p_blocked_user_id AND following_id = v_blocker_id);
  
  -- Cancel any pending friend requests
  UPDATE friend_requests SET status = 'cancelled'
  WHERE (sender_id = v_blocker_id AND receiver_id = p_blocked_user_id)
     OR (sender_id = p_blocked_user_id AND receiver_id = v_blocker_id);
  
  -- Block
  INSERT INTO blocked_users (blocker_id, blocked_id, reason)
  VALUES (v_blocker_id, p_blocked_user_id, p_reason);
  
  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Unblock user
CREATE OR REPLACE FUNCTION unblock_user(p_blocked_user_id UUID)
RETURNS JSONB AS $$
BEGIN
  DELETE FROM blocked_users
  WHERE blocker_id = auth.uid()
    AND blocked_id = p_blocked_user_id;
  
  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

ALTER PUBLICATION supabase_realtime ADD TABLE blocked_users;
```

### Frontend: `src/services/blockService.ts`

```typescript
export async function blockUser(userId: string, reason?: string) {
  const { data, error } = await supabase.rpc('block_user', {
    p_blocked_user_id: userId,
    p_reason: reason || null,
  });
  if (error) throw error;
  return data;
}

export async function unblockUser(userId: string) {
  const { data, error } = await supabase.rpc('unblock_user', {
    p_blocked_user_id: userId,
  });
  if (error) throw error;
  return data;
}

export async function getBlockedUsers() {
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
  return data;
}
```

### UI Component: Block Confirmation Dialog

```typescript
// src/components/BlockUserDialog.tsx
export function BlockUserDialog({ userId, username, onConfirm }: Props) {
  return (
    <AlertDialog>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Block {username}?</AlertDialogTitle>
          <AlertDialogDescription>
            They will no longer be able to:
            - See your profile or posts
            - Message you
            - Send you friend requests
            
            You will be unfriended and they won't be notified.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-destructive">
            Block User
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

### MCP Commands
```bash
warp mcp run supabase "apply_migration 20250120_blocking_system"
warp mcp run supabase "get_advisors security"  # Verify RLS
warp mcp run puppeteer "test block user flow"
```

---

## 📋 STORY 9.1.6: Profiles Extension (Online Status + Counts)

**Effort:** 1 day | **Priority:** 🟡 Medium  
**Dependencies:** Story 9.1.2, 9.1.4

### Goal
Extend profiles table with friend-related fields and online status tracking.

### Acceptance Criteria
- Add columns: `is_online`, `last_active`, `friend_count`, `follower_count`, `following_count`
- Triggers auto-update counts on friendship/follow changes
- Realtime presence for online status
- Status indicators in UI

### Migration: `20250121_profiles_extension.sql`

```sql
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS last_active TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS friend_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS follower_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS following_count INTEGER DEFAULT 0;

CREATE INDEX idx_profiles_is_online ON profiles(is_online) WHERE is_online = true;
CREATE INDEX idx_profiles_last_active ON profiles(last_active DESC);

-- Trigger: Update friend_count
CREATE OR REPLACE FUNCTION update_friend_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'active' THEN
    UPDATE profiles SET friend_count = friend_count + 1 
    WHERE id IN (NEW.user_id, NEW.friend_id);
  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'active' AND NEW.status = 'unfriended' THEN
    UPDATE profiles SET friend_count = GREATEST(friend_count - 1, 0)
    WHERE id IN (NEW.user_id, NEW.friend_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_friend_counts
  AFTER INSERT OR UPDATE ON friendships
  FOR EACH ROW
  EXECUTE FUNCTION update_friend_counts();

-- Initialize counts for existing data
UPDATE profiles p
SET friend_count = (
  SELECT COUNT(*) FROM friendships f
  WHERE f.user_id = p.id AND f.status = 'active'
);
```

### Frontend: Online Status Component

```typescript
// src/components/OnlineStatusIndicator.tsx
export function OnlineStatusIndicator({ userId }: { userId: string }) {
  const { data: profile } = useQuery({
    queryKey: ['profile', userId],
    queryFn: () => getProfile(userId),
  });

  if (!profile?.is_online) return null;

  return (
    <div className="flex items-center gap-2">
      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
      <span className="text-sm text-muted-foreground">Online</span>
    </div>
  );
}
```

### Realtime Presence Hook

```typescript
// src/hooks/usePresence.ts
export function usePresence() {
  useEffect(() => {
    const channel = supabase.channel('online-users');
    
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        // Update online users
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: (await supabase.auth.getUser()).data.user!.id,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
}
```

---

## 📋 STORY 9.1.7: Database Functions for Friend Operations

**Effort:** 2 days | **Priority:** 🔴 Critical  
**Dependencies:** Story 9.1.2, 9.1.4

### Goal
Create reusable database functions for common friend operations.

### Acceptance Criteria
- `unfriend(user_id)` - Soft delete + auto-unfollow
- `get_mutual_friends(user_id)` - Returns shared friends
- `search_friends(query)` - Full-text search
- `get_online_friends_count()` - Real-time count
- Performance < 50ms for all functions

### Migration: `20250122_friend_functions.sql`

```sql
-- Function: Unfriend
CREATE OR REPLACE FUNCTION unfriend(p_friend_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_current_user_id UUID := auth.uid();
BEGIN
  UPDATE friendships 
  SET status = 'unfriended', unfriended_at = NOW()
  WHERE (user_id = v_current_user_id AND friend_id = p_friend_user_id)
     OR (user_id = p_friend_user_id AND friend_id = v_current_user_id)
     AND status = 'active';
  
  DELETE FROM following 
  WHERE (follower_id = v_current_user_id AND following_id = p_friend_user_id)
     OR (follower_id = p_friend_user_id AND following_id = v_current_user_id);
  
  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get mutual friends
CREATE OR REPLACE FUNCTION get_mutual_friends(p_target_user_id UUID)
RETURNS TABLE(
  friend_id UUID, 
  username TEXT, 
  full_name TEXT, 
  avatar_url TEXT
) AS $$
  SELECT p.id, p.username, p.full_name, p.avatar_url
  FROM friendships f1
  JOIN friendships f2 ON f1.friend_id = f2.friend_id
  JOIN profiles p ON p.id = f1.friend_id
  WHERE f1.user_id = auth.uid() 
    AND f2.user_id = p_target_user_id
    AND f1.status = 'active' 
    AND f2.status = 'active'
  ORDER BY p.full_name;
$$ LANGUAGE sql SECURITY DEFINER;

-- Function: Search friends
CREATE OR REPLACE FUNCTION search_friends(p_query TEXT)
RETURNS TABLE(
  friend_id UUID,
  username TEXT,
  full_name TEXT,
  avatar_url TEXT,
  rank REAL
) AS $$
  SELECT 
    p.id,
    p.username,
    p.full_name,
    p.avatar_url,
    ts_rank(
      to_tsvector('english', p.full_name || ' ' || p.username),
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
  ORDER BY rank DESC, p.full_name
  LIMIT 50;
$$ LANGUAGE sql SECURITY DEFINER;

-- Function: Get online friends count
CREATE OR REPLACE FUNCTION get_online_friends_count()
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM friendships f
  JOIN profiles p ON p.id = f.friend_id
  WHERE f.user_id = auth.uid()
    AND f.status = 'active'
    AND p.is_online = true;
$$ LANGUAGE sql STABLE SECURITY DEFINER;
```

### Frontend Integration

```typescript
// Update src/services/friendService.ts
export async function unfriend(userId: string) {
  const { data, error } = await supabase.rpc('unfriend', {
    p_friend_user_id: userId,
  });
  if (error) throw error;
  return data;
}

export async function getMutualFriends(userId: string) {
  const { data, error } = await supabase.rpc('get_mutual_friends', {
    p_target_user_id: userId,
  });
  if (error) throw error;
  return data;
}

export async function searchFriends(query: string) {
  const { data, error } = await supabase.rpc('search_friends', {
    p_query: query,
  });
  if (error) throw error;
  return data;
}
```

---

## 📋 STORY 9.1.8: Notifications System Integration

**Effort:** 1 day | **Priority:** 🟡 Medium  
**Dependencies:** Story 9.1.3

### Goal
Integrate friends module with notifications table for automatic event notifications.

### Acceptance Criteria
- Notification types: 'friend_request', 'friend_accepted', 'friend_removed'
- Triggers create notifications automatically
- Realtime subscription for instant delivery
- Notification bell UI with unread count

### Migration: `20250123_notifications_integration.sql`

```sql
-- Trigger: Notify on friend request
CREATE OR REPLACE FUNCTION notify_friend_request()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'pending' THEN
    INSERT INTO notifications (user_id, type, title, message, data)
    VALUES (
      NEW.receiver_id,
      'friend_request',
      'New friend request',
      (SELECT full_name FROM profiles WHERE id = NEW.sender_id) || ' sent you a friend request',
      jsonb_build_object('request_id', NEW.id, 'sender_id', NEW.sender_id)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_friend_request
  AFTER INSERT ON friend_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_friend_request();

-- Trigger: Notify on friend accepted
-- (Already in accept_friend_request function)

-- Trigger: Notify on unfriend
CREATE OR REPLACE FUNCTION notify_unfriend()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'unfriended' AND OLD.status = 'active' THEN
    INSERT INTO notifications (user_id, type, title, message, data)
    VALUES (
      NEW.friend_id,
      'friend_removed',
      'Friendship ended',
      (SELECT full_name FROM profiles WHERE id = NEW.user_id) || ' is no longer your friend',
      jsonb_build_object('user_id', NEW.user_id)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_unfriend
  AFTER UPDATE ON friendships
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION notify_unfriend();
```

### Frontend: Notification Bell

```typescript
// src/components/NotificationBell.tsx
export function NotificationBell() {
  const { data: notifications } = useQuery({
    queryKey: ['notifications'],
    queryFn: getNotifications,
  });

  const unreadCount = notifications?.filter(n => !n.read).length || 0;

  return (
    <button className="relative">
      <Bell className="w-6 h-6" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
          {unreadCount}
        </span>
      )}
    </button>
  );
}
```

---

## 📋 STORY 9.1.9: Integration with Messaging Module (Epic 8.x)

**Effort:** 2 days | **Priority:** 🔴 Critical  
**Dependencies:** Story 9.1.2, 9.1.5, Epic 8.1

### Goal
Ensure friends module integrates seamlessly with Epic 8.x messaging system.

### Acceptance Criteria
- Only friends can create direct conversations (RLS policy)
- Blocked users cannot message each other
- Friend status shown in conversation list
- Online status integrated into message threads
- `create_or_get_direct_conversation()` updated for friend checks

### Migration: `20250124_messaging_integration.sql`

```sql
-- Update conversation RLS to check friendships
DROP POLICY IF EXISTS "Only friends can create conversations" ON conversations;

CREATE POLICY "Only friends can create conversations"
  ON conversations FOR INSERT
  WITH CHECK (
    auth.uid() = ANY(participants) AND
    -- Not blocked
    NOT EXISTS (
      SELECT 1 FROM blocked_users
      WHERE (blocker_id = auth.uid() AND blocked_id = ANY(participants))
         OR (blocker_id = ANY(participants) AND blocked_id = auth.uid())
    ) AND
    -- Are friends
    EXISTS (
      SELECT 1 FROM friendships
      WHERE user_id = auth.uid() 
        AND friend_id = ANY(participants)
        AND status = 'active'
    )
  );

-- Update create_or_get_direct_conversation function
CREATE OR REPLACE FUNCTION create_or_get_direct_conversation(p_other_user_id UUID)
RETURNS UUID AS $$
DECLARE
  v_conv_id UUID;
  v_current_user_id UUID := auth.uid();
  v_participant_array UUID[];
BEGIN
  -- Check if blocked
  IF EXISTS (
    SELECT 1 FROM blocked_users
    WHERE (blocker_id = v_current_user_id AND blocked_id = p_other_user_id)
       OR (blocker_id = p_other_user_id AND blocked_id = v_current_user_id)
  ) THEN
    RAISE EXCEPTION 'Cannot message blocked user';
  END IF;
  
  -- Check if friends
  IF NOT EXISTS (
    SELECT 1 FROM friendships
    WHERE user_id = v_current_user_id 
      AND friend_id = p_other_user_id 
      AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Can only message friends';
  END IF;
  
  v_participant_array := ARRAY[
    LEAST(v_current_user_id, p_other_user_id), 
    GREATEST(v_current_user_id, p_other_user_id)
  ];
  
  SELECT id INTO v_conv_id 
  FROM conversations
  WHERE type = 'direct' AND participants = v_participant_array 
  LIMIT 1;
  
  IF v_conv_id IS NULL THEN
    INSERT INTO conversations (type, participants, created_by)
    VALUES ('direct', v_participant_array, v_current_user_id)
    RETURNING id INTO v_conv_id;
  END IF;
  
  RETURN v_conv_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Frontend Integration Test

```typescript
// tests/integration/messaging-friends.test.ts
describe('Messaging + Friends Integration', () => {
  it('should allow friends to create conversation', async () => {
    // Assume users are friends
    const convId = await createOrGetConversation(friendUserId);
    expect(convId).toBeDefined();
  });

  it('should prevent non-friends from messaging', async () => {
    // Assume users are NOT friends
    await expect(
      createOrGetConversation(nonFriendUserId)
    ).rejects.toThrow('Can only message friends');
  });

  it('should prevent blocked users from messaging', async () => {
    await blockUser(userId);
    await expect(
      createOrGetConversation(userId)
    ).rejects.toThrow('Cannot message blocked user');
  });
});
```

### MCP Commands
```bash
warp mcp run context7 "analyze src/services/conversationService.ts for friends integration"
warp mcp run supabase "get_advisors security"
warp mcp run puppeteer "test messaging with friends flow"
```

---

## 📊 Complete Epic 9.1 Summary

**Total Stories:** 9  
**Total Lines:** ~5,300  
**Total Effort:** 14 days  

### Story Breakdown:
1. ✅ 9.1.1 - Audit & Migrate (3 days) - 463 lines
2. ✅ 9.1.2 - Bidirectional Friendships (2 days) - 602 lines
3. ✅ 9.1.3 - Friend Requests (2 days) - 805 lines
4. ✅ 9.1.4 - Follow System (1 day) - 503 lines
5. 📋 9.1.5 - Blocking System (2 days) - Documented above
6. 📋 9.1.6 - Profiles Extension (1 day) - Documented above
7. 📋 9.1.7 - Database Functions (2 days) - Documented above
8. 📋 9.1.8 - Notifications (1 day) - Documented above
9. 📋 9.1.9 - Messaging Integration (2 days) - Documented above

### MCP Integration Across All Stories:
- 🛢 **Supabase MCP**: Heavy usage (all database operations)
- 🧠 **Context7 MCP**: Medium usage (code analysis)
- 🤖 **Puppeteer MCP**: Medium usage (E2E testing)
- 🐙 **GitHub MCP**: Light usage (issue tracking)
- 🎨 **Shadcn MCP**: Light usage (UI scaffolding)

---

## ✅ Next Steps

1. Create individual story files from this batch (9.1.5-9.1.9)
2. Begin implementation of Story 9.1.1 (audit existing schema)
3. Set up GitHub project board for tracking
4. Create feature branch: `feature/epic-9.1-friends-foundation`

**Ready for Implementation!** 🚀
