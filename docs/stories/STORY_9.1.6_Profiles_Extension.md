# 📋 STORY 9.1.6: Profiles Extension (Online Status + Counts)

**Parent Epic:** [EPIC 9.1 - Friends Foundation Database](../epics/EPIC_9.1_Friends_Foundation_Database.md)  
**Owner:** Backend/Database Team  
**Effort:** 1 day | **Priority:** 🟡 Medium  
**Status:** 📋 Ready for Implementation  
**Dependencies:** Story 9.1.2 (Friendships), Story 9.1.4 (Following)

---

## 🎯 Story Goal

Extend the `profiles` table with friend-related metrics and online presence tracking to enable real-time status indicators and friend/follower counts across the application.

---

## ✅ Acceptance Criteria

- [ ] **AC1:** Add columns: `is_online`, `last_active`, `friend_count`, `follower_count`, `following_count`, `privacy_settings`
- [ ] **AC2:** Database triggers auto-update counts on friendship/follow changes
- [ ] **AC3:** Realtime presence tracking using Supabase channels
- [ ] **AC4:** Privacy settings JSONB column for user preferences
- [ ] **AC5:** Online status indicators in UI components

---

## 🔧 Implementation Steps

### **STEP 1: Extend Profiles Table (30 min)**

Create migration: `supabase/migrations/20250121_profiles_extension.sql`

```sql
-- ============================================================
-- STORY 9.1.6: Profiles Extension
-- Add friend/follower metrics and online presence
-- ============================================================

ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS last_active TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS friend_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS follower_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS following_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS privacy_settings JSONB DEFAULT '{
    "show_online_status": true,
    "show_friend_list": "friends",
    "allow_friend_requests": true,
    "show_mutual_friends": true
  }'::jsonb;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_is_online 
  ON profiles(is_online) 
  WHERE is_online = true;

CREATE INDEX IF NOT EXISTS idx_profiles_last_active 
  ON profiles(last_active DESC);

COMMENT ON COLUMN profiles.is_online IS 'Real-time presence status via Supabase channels';
COMMENT ON COLUMN profiles.last_active IS 'Last activity timestamp (updated on any action)';
COMMENT ON COLUMN profiles.friend_count IS 'Cached count of active friendships';
COMMENT ON COLUMN profiles.follower_count IS 'Cached count of followers';
COMMENT ON COLUMN profiles.following_count IS 'Cached count of users being followed';
COMMENT ON COLUMN profiles.privacy_settings IS 'User privacy preferences for friend features';
```

**MCP Command:**
```bash
warp mcp run supabase "apply_migration project_id=<your_project_id> name=profiles_extension query='<paste SQL>'"
```

---

### **STEP 2: Create Auto-Update Triggers for Counts (45 min)**

Add to same migration file:

```sql
-- ============================================================
-- Trigger: Auto-update friend_count
-- ============================================================

CREATE OR REPLACE FUNCTION update_friend_counts()
RETURNS TRIGGER AS $$
BEGIN
  -- When a friendship becomes active
  IF TG_OP = 'INSERT' AND NEW.status = 'active' THEN
    UPDATE profiles 
    SET friend_count = friend_count + 1 
    WHERE id IN (NEW.user_id, NEW.friend_id);
    
  -- When a friendship is deactivated (unfriended)
  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'active' AND NEW.status = 'unfriended' THEN
    UPDATE profiles 
    SET friend_count = GREATEST(friend_count - 1, 0)
    WHERE id IN (NEW.user_id, NEW.friend_id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_friend_counts
  AFTER INSERT OR UPDATE ON friendships
  FOR EACH ROW
  EXECUTE FUNCTION update_friend_counts();

COMMENT ON FUNCTION update_friend_counts IS 'Automatically updates friend_count in profiles table';

-- ============================================================
-- Trigger: Auto-update follower/following counts
-- ============================================================

CREATE OR REPLACE FUNCTION update_follow_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Increment follower count for the followed user
    UPDATE profiles 
    SET follower_count = follower_count + 1
    WHERE id = NEW.following_id;
    
    -- Increment following count for the follower
    UPDATE profiles 
    SET following_count = following_count + 1
    WHERE id = NEW.follower_id;
    
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement follower count for the followed user
    UPDATE profiles 
    SET follower_count = GREATEST(follower_count - 1, 0)
    WHERE id = OLD.following_id;
    
    -- Decrement following count for the follower
    UPDATE profiles 
    SET following_count = GREATEST(following_count - 1, 0)
    WHERE id = OLD.follower_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_follow_counts
  AFTER INSERT OR DELETE ON following
  FOR EACH ROW
  EXECUTE FUNCTION update_follow_counts();

COMMENT ON FUNCTION update_follow_counts IS 'Automatically updates follower/following counts';
```

---

### **STEP 3: Initialize Counts for Existing Data (15 min)**

Add to same migration file:

```sql
-- ============================================================
-- Backfill existing data counts
-- ============================================================

-- Update friend_count
UPDATE profiles p
SET friend_count = (
  SELECT COUNT(*) 
  FROM friendships f
  WHERE f.user_id = p.id AND f.status = 'active'
);

-- Update follower_count
UPDATE profiles p
SET follower_count = (
  SELECT COUNT(*) 
  FROM following f
  WHERE f.following_id = p.id
);

-- Update following_count
UPDATE profiles p
SET following_count = (
  SELECT COUNT(*) 
  FROM following f
  WHERE f.follower_id = p.id
);

-- Verify counts
SELECT 
  COUNT(*) as total_profiles,
  SUM(friend_count) as total_friendships,
  SUM(follower_count) as total_follows,
  AVG(friend_count)::NUMERIC(10,2) as avg_friends_per_user
FROM profiles;
```

---

### **STEP 4: Create Frontend Presence Service (30 min)**

Create: `src/services/presenceService.ts`

```typescript
import { supabase } from '@/lib/supabase';

/**
 * Initialize presence tracking for current user
 * Call this once when user logs in
 */
export function initializePresence(userId: string) {
  const channel = supabase.channel('online-users', {
    config: {
      presence: {
        key: userId,
      },
    },
  });

  channel
    .on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      const onlineUsers = Object.keys(state);
      
      // Update local state or trigger re-render
      console.log('Online users:', onlineUsers.length);
    })
    .on('presence', { event: 'join' }, ({ key, newPresences }) => {
      console.log('User joined:', key);
    })
    .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
      console.log('User left:', key);
    })
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          user_id: userId,
          online_at: new Date().toISOString(),
        });
        
        // Update is_online in database
        await supabase
          .from('profiles')
          .update({ is_online: true, last_active: new Date().toISOString() })
          .eq('id', userId);
      }
    });

  // Update last_active periodically
  const heartbeat = setInterval(async () => {
    await supabase
      .from('profiles')
      .update({ last_active: new Date().toISOString() })
      .eq('id', userId);
  }, 60000); // Every 1 minute

  // Cleanup function
  return () => {
    clearInterval(heartbeat);
    channel.unsubscribe();
    
    // Mark as offline
    supabase
      .from('profiles')
      .update({ is_online: false })
      .eq('id', userId);
  };
}

/**
 * Get online status for a specific user
 */
export async function getUserOnlineStatus(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('is_online, last_active')
    .eq('id', userId)
    .single();
  
  if (error) throw error;
  return data;
}
```

---

### **STEP 5: Create React Hooks (30 min)**

Create: `src/hooks/usePresence.ts`

```typescript
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { initializePresence, getUserOnlineStatus } from '@/services/presenceService';

/**
 * Initialize presence tracking for current user
 * Use this in root layout or auth provider
 */
export function usePresence() {
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      const cleanup = initializePresence(user.id);
      return cleanup;
    };

    const cleanupPromise = getCurrentUser();

    return () => {
      cleanupPromise.then((cleanup) => cleanup?.());
    };
  }, []);
}

/**
 * Get online status for a user
 */
export function useUserOnlineStatus(userId: string) {
  return useQuery({
    queryKey: ['online-status', userId],
    queryFn: () => getUserOnlineStatus(userId),
    enabled: !!userId,
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

/**
 * Get user's friend/follower counts
 */
export function useUserStats(userId: string) {
  return useQuery({
    queryKey: ['user-stats', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('friend_count, follower_count, following_count')
        .eq('id', userId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
}
```

---

### **STEP 6: Create UI Components (45 min)**

Create: `src/components/OnlineStatusIndicator.tsx`

```typescript
import { useUserOnlineStatus } from '@/hooks/usePresence';
import { formatDistanceToNow } from 'date-fns';

interface OnlineStatusIndicatorProps {
  userId: string;
  showText?: boolean;
}

export function OnlineStatusIndicator({ 
  userId, 
  showText = true 
}: OnlineStatusIndicatorProps) {
  const { data: status } = useUserOnlineStatus(userId);

  if (!status) return null;

  const isOnline = status.is_online;
  const lastActiveText = status.last_active
    ? formatDistanceToNow(new Date(status.last_active), { addSuffix: true })
    : 'Unknown';

  return (
    <div className="flex items-center gap-2">
      <div
        className={`w-2 h-2 rounded-full ${
          isOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
        }`}
        title={isOnline ? 'Online' : `Last active ${lastActiveText}`}
      />
      {showText && (
        <span className="text-sm text-muted-foreground">
          {isOnline ? 'Online' : lastActiveText}
        </span>
      )}
    </div>
  );
}
```

Create: `src/components/UserStatsCard.tsx`

```typescript
import { useUserStats } from '@/hooks/usePresence';
import { Users, UserPlus, UserCheck } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface UserStatsCardProps {
  userId: string;
}

export function UserStatsCard({ userId }: UserStatsCardProps) {
  const { data: stats, isLoading } = useUserStats(userId);

  if (isLoading) return <div>Loading stats...</div>;
  if (!stats) return null;

  return (
    <Card>
      <CardContent className="flex justify-around p-4">
        <div className="flex flex-col items-center">
          <UserCheck className="w-5 h-5 mb-1 text-muted-foreground" />
          <span className="text-2xl font-bold">{stats.friend_count}</span>
          <span className="text-xs text-muted-foreground">Friends</span>
        </div>
        
        <div className="flex flex-col items-center">
          <Users className="w-5 h-5 mb-1 text-muted-foreground" />
          <span className="text-2xl font-bold">{stats.follower_count}</span>
          <span className="text-xs text-muted-foreground">Followers</span>
        </div>
        
        <div className="flex flex-col items-center">
          <UserPlus className="w-5 h-5 mb-1 text-muted-foreground" />
          <span className="text-2xl font-bold">{stats.following_count}</span>
          <span className="text-xs text-muted-foreground">Following</span>
        </div>
      </CardContent>
    </Card>
  );
}
```

---

## 🧪 Testing & Validation

### **SQL Tests**

```sql
-- Test 1: Verify columns added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
  AND column_name IN ('is_online', 'last_active', 'friend_count', 'follower_count', 'following_count');

-- Test 2: Verify triggers created
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_name IN ('trigger_update_friend_counts', 'trigger_update_follow_counts');

-- Test 3: Test friend_count trigger
INSERT INTO friendships (user_id, friend_id, status) 
VALUES ('user1_uuid', 'user2_uuid', 'active');
-- Verify both users have friend_count incremented
SELECT id, friend_count FROM profiles WHERE id IN ('user1_uuid', 'user2_uuid');

-- Test 4: Test follower_count trigger
INSERT INTO following (follower_id, following_id) 
VALUES ('user1_uuid', 'user2_uuid');
-- Verify counts updated
SELECT id, follower_count, following_count FROM profiles 
WHERE id IN ('user1_uuid', 'user2_uuid');

-- Test 5: Verify indexes
SELECT indexname, indexdef FROM pg_indexes 
WHERE tablename = 'profiles' 
  AND indexname LIKE 'idx_profiles_%';
```

### **Frontend Integration Tests**

```typescript
// tests/integration/presence.test.ts
import { initializePresence, getUserOnlineStatus } from '@/services/presenceService';

describe('Presence System', () => {
  it('should mark user as online', async () => {
    const cleanup = initializePresence('test-user-id');
    
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    const status = await getUserOnlineStatus('test-user-id');
    expect(status.is_online).toBe(true);
    
    cleanup();
  });

  it('should update last_active timestamp', async () => {
    const status1 = await getUserOnlineStatus('test-user-id');
    
    await new Promise((resolve) => setTimeout(resolve, 2000));
    
    const status2 = await getUserOnlineStatus('test-user-id');
    expect(new Date(status2.last_active).getTime())
      .toBeGreaterThan(new Date(status1.last_active).getTime());
  });
});
```

### **E2E Test Script**

```bash
# Using Puppeteer MCP
warp mcp run puppeteer "navigate localhost:3000 and test:
1. Login as User A
2. Verify online status indicator shows 'Online'
3. Open User B's profile
4. Verify friend/follower counts display correctly
5. Send friend request to User B
6. Verify friend_count increments after acceptance
7. Follow User B
8. Verify following_count increments"
```

---

## 🎯 MCP Integration Summary

| MCP Server | Usage | Commands |
|------------|-------|----------|
| 🛢 **Supabase** | Heavy | `apply_migration`, `execute_sql` |
| 🧠 **Context7** | Light | `analyze presenceService.ts` |
| 🤖 **Puppeteer** | Medium | E2E test presence tracking |

---

## 📋 Definition of Done

- [ ] Migration `20250121_profiles_extension.sql` applied successfully
- [ ] All 5 new columns added to profiles table
- [ ] Triggers auto-update friend/follower counts
- [ ] Existing data backfilled with correct counts
- [ ] Presence service (`presenceService.ts`) implemented
- [ ] React hooks (`usePresence.ts`) created
- [ ] UI components (OnlineStatusIndicator, UserStatsCard) working
- [ ] Realtime presence updates visible in UI
- [ ] Integration tests pass
- [ ] Performance benchmarks meet < 50ms query time
- [ ] Documentation updated

---

## 🔗 Related Stories

- **Previous:** [Story 9.1.5 - User Blocking System](STORY_9.1.5_User_Blocking_System.md)
- **Next:** [Story 9.1.7 - Database Functions](STORY_9.1.7_Database_Functions.md)

---

**Status:** 📋 Ready for Implementation  
**Estimated Time:** 1 day  
**Last Updated:** 2025-01-15
