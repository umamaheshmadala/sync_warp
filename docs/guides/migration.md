# Migration Guide: Old Friends Module → Epic 9.x Friends Module

**Version:** 1.0.0  
**Date:** 2025-11-29  
**Estimated Migration Time:** 2-4 hours  
**Difficulty:** Medium

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Breaking Changes](#breaking-changes)
4. [Migration Steps](#migration-steps)
5. [Testing Checklist](#testing-checklist)
6. [Rollback Plan](#rollback-plan)
7. [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

This guide walks you through migrating from the legacy Friends module to the new Epic 9.x implementation, which includes:

- ✅ Improved database schema with RLS policies
- ✅ React Query for data fetching and caching
- ✅ Zustand for real-time presence management
- ✅ Comprehensive error handling and retry logic
- ✅ Offline support for friend requests
- ✅ Performance optimizations
- ✅ Full test coverage (210+ tests)

**Migration Timeline:**

- **Planning:** 30 minutes
- **Database Migration:** 30 minutes
- **Code Migration:** 1-2 hours
- **Testing:** 1 hour
- **Deployment:** 30 minutes

---

## ✅ Prerequisites

Before starting the migration, ensure you have:

- [ ] **Backup:** Full database backup created
- [ ] **Environment:** Staging environment available for testing
- [ ] **Dependencies:** All npm packages up to date
- [ ] **Access:** Supabase dashboard access
- [ ] **Team:** Notify team of migration window
- [ ] **Rollback Plan:** Reviewed and understood

**Required Versions:**

- Node.js: ≥ 18.0.0
- React: ≥ 18.2.0
- @tanstack/react-query: ≥ 5.8.4
- @supabase/supabase-js: ≥ 2.57.4
- zustand: ≥ 4.4.7

---

## 🚨 Breaking Changes

### 1. Database Schema Changes

**Old Schema:**

```sql
-- Simple friendships table
CREATE TABLE friendships (
  id UUID PRIMARY KEY,
  user_id UUID,
  friend_id UUID,
  created_at TIMESTAMP
);
```

**New Schema:**

```sql
-- Enhanced with status and test data flag
CREATE TABLE friendships (
  id UUID PRIMARY KEY,
  user_id UUID,
  friend_id UUID,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP,
  is_test_data BOOLEAN DEFAULT false
);
```

### 2. Service Layer Changes

**Old API:**

```typescript
// Direct Supabase calls
const { data } = await supabase.from("friendships").select("*");
```

**New API:**

```typescript
// Service layer with error handling
import { friendsService } from "@/services/friendsService";

const { success, data, error } = await friendsService.getFriends(userId);
```

### 3. Hook Changes

**Old Hooks:**

```typescript
// Custom hooks with useState
const [friends, setFriends] = useState([]);
const [loading, setLoading] = useState(false);
```

**New Hooks:**

```typescript
// React Query hooks
import { useFriends } from "@/hooks/friends/useFriends";

const { data, isLoading, error } = useFriends();
```

### 4. Real-time Changes

**Old:**

```typescript
// Manual subscription management
const subscription = supabase
  .from("friendships")
  .on("*", handleChange)
  .subscribe();
```

**New:**

```typescript
// Automatic real-time with Zustand
import { useRealtimeFriends } from "@/hooks/realtime/useRealtimeFriends";

useRealtimeFriends(); // Automatically syncs
```

---

## 🔄 Migration Steps

### Phase 1: Database Migration (30 minutes)

#### Step 1.1: Review Migration Scripts

Check the migration files in `supabase/migrations/`:

- `20240101_add_status_to_friendships.sql`
- `20240102_add_is_test_data_flag.sql`
- `20240103_update_rls_policies.sql`

#### Step 1.2: Run Migrations on Staging

```bash
# Connect to staging
supabase link --project-ref your-staging-ref

# Run migrations
supabase db push

# Verify migrations
supabase db diff
```

#### Step 1.3: Verify RLS Policies

```sql
-- Check policies exist
SELECT * FROM pg_policies WHERE tablename = 'friendships';

-- Test policy with user context
SET request.jwt.claim.sub = 'test-user-id';
SELECT * FROM friendships WHERE user_id = auth.uid();
```

#### Step 1.4: Data Migration (if needed)

```sql
-- Add status to existing friendships
UPDATE friendships
SET status = 'active'
WHERE status IS NULL;

-- Mark test data
UPDATE friendships
SET is_test_data = true
WHERE user_id IN (SELECT id FROM profiles WHERE email LIKE '%test%');
```

---

### Phase 2: Service Layer Migration (1 hour)

#### Step 2.1: Install New Dependencies

```bash
npm install @tanstack/react-query@^5.8.4
npm install zustand@^4.4.7
```

#### Step 2.2: Update Service Imports

**Before:**

```typescript
import { supabase } from "@/lib/supabase";

export async function getFriends(userId: string) {
  const { data, error } = await supabase
    .from("friendships")
    .select("*")
    .eq("user_id", userId);

  if (error) throw error;
  return data;
}
```

**After:**

```typescript
import { friendsService } from "@/services/friendsService";

// Use service layer
const { success, data, error } = await friendsService.getFriends(userId);

if (!success) {
  console.error("Failed to fetch friends:", error);
  return;
}

// Use data
console.log("Friends:", data);
```

#### Step 2.3: Update Error Handling

**Before:**

```typescript
try {
  const friends = await getFriends(userId);
} catch (error) {
  console.error(error);
}
```

**After:**

```typescript
const {
  success,
  data: friends,
  error,
} = await friendsService.getFriends(userId);

if (!success) {
  // User-friendly error message
  toast.error(error || "Failed to load friends");
  return;
}

// Use friends data
```

---

### Phase 3: Hook Migration (1 hour)

#### Step 3.1: Setup React Query

**Add QueryClientProvider to App:**

```typescript
// src/main.tsx or src/App.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 2,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      {/* Your app */}
    </QueryClientProvider>
  );
}
```

#### Step 3.2: Migrate to React Query Hooks

**Before:**

```typescript
function FriendsList() {
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadFriends() {
      setLoading(true);
      try {
        const data = await getFriends(userId);
        setFriends(data);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    }
    loadFriends();
  }, [userId]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return <div>{friends.map(f => <FriendCard friend={f} />)}</div>;
}
```

**After:**

```typescript
import { useFriends } from '@/hooks/friends/useFriends';

function FriendsList() {
  const { data, isLoading, error } = useFriends();

  if (isLoading) return <FriendsListSkeleton />;
  if (error) return <ErrorMessage error={error} />;

  const friends = data?.data || [];

  return (
    <div className="grid grid-cols-2 gap-4">
      {friends.map(friend => (
        <FriendCard key={friend.id} friend={friend} />
      ))}
    </div>
  );
}
```

#### Step 3.3: Migrate Mutations

**Before:**

```typescript
async function handleSendRequest(userId: string) {
  try {
    await sendFriendRequest(userId);
    toast.success("Request sent!");
    // Manual refetch
    await loadFriends();
  } catch (error) {
    toast.error("Failed to send request");
  }
}
```

**After:**

```typescript
import { useFriendActions } from '@/hooks/friends/useFriendActions';

function SendRequestButton({ userId }: { userId: string }) {
  const { sendRequest } = useFriendActions();

  const handleSend = () => {
    sendRequest.mutate(userId);
    // Automatic refetch and toast notifications!
  };

  return (
    <button
      onClick={handleSend}
      disabled={sendRequest.isPending}
    >
      {sendRequest.isPending ? 'Sending...' : 'Send Request'}
    </button>
  );
}
```

---

### Phase 4: Component Migration (30 minutes)

#### Step 4.1: Update Component Props

**Before:**

```typescript
interface FriendCardProps {
  friend: any; // Untyped
  onUnfriend: (id: string) => void;
}
```

**After:**

```typescript
import type { Friend } from "@/types/friends";

interface FriendCardProps {
  friend: Friend; // Properly typed
  onClick?: () => void;
}

// useFriendActions handles unfriend internally
```

#### Step 4.2: Update Component Imports

```typescript
// Old imports
import { getFriends } from "../api/friends";

// New imports
import { useFriends } from "@/hooks/friends/useFriends";
import { useFriendActions } from "@/hooks/friends/useFriendActions";
import type { Friend } from "@/types/friends";
```

---

### Phase 5: Real-time Migration (30 minutes)

#### Step 5.1: Remove Manual Subscriptions

**Before:**

```typescript
useEffect(() => {
  const subscription = supabase
    .from("friendships")
    .on("INSERT", (payload) => {
      setFriends((prev) => [...prev, payload.new]);
    })
    .subscribe();

  return () => {
    subscription.unsubscribe();
  };
}, []);
```

**After:**

```typescript
import { useRealtimeFriends } from '@/hooks/realtime/useRealtimeFriends';

function FriendsPage() {
  // Automatic real-time sync!
  useRealtimeFriends();

  const { data: friends } = useFriends();

  // Friends automatically update in real-time
  return <FriendsList friends={friends?.data || []} />;
}
```

---

## ✅ Testing Checklist

### Unit Tests

- [ ] All service functions have tests
- [ ] All hooks have tests
- [ ] All components have tests

### Integration Tests

- [ ] Friend request flow works end-to-end
- [ ] Real-time updates work correctly
- [ ] Offline support works

### Manual Testing

- [ ] Send friend request
- [ ] Accept friend request
- [ ] Reject friend request
- [ ] Unfriend user
- [ ] Block user
- [ ] Search friends
- [ ] Real-time updates (test with 2 browsers)
- [ ] Offline mode (disconnect network)

### Performance Testing

- [ ] Friends list loads in < 1 second
- [ ] No memory leaks
- [ ] Real-time updates are instant

---

## 🔙 Rollback Plan

If issues occur during migration:

### Step 1: Rollback Code

```bash
git revert HEAD
git push origin main
```

### Step 2: Rollback Database

```bash
# Revert last migration
supabase migration down

# Or restore from backup
supabase db restore backup-2025-11-29.sql
```

### Step 3: Clear Cache

```bash
# Clear React Query cache
localStorage.clear();

# Or programmatically
queryClient.clear();
```

### Step 4: Notify Users

- Post announcement about temporary rollback
- Provide ETA for fix
- Monitor error logs

---

## 🐛 Troubleshooting

### Issue: "Permission denied for table friendships"

**Cause:** RLS policies not applied correctly

**Solution:**

```sql
-- Re-apply RLS policies
DROP POLICY IF EXISTS "Users can view their friendships" ON friendships;

CREATE POLICY "Users can view their friendships"
ON friendships FOR SELECT
USING (user_id = auth.uid() OR friend_id = auth.uid());
```

### Issue: "React Query not refetching"

**Cause:** Query keys not invalidated

**Solution:**

```typescript
import { useQueryClient } from "@tanstack/react-query";

const queryClient = useQueryClient();

// Invalidate after mutation
queryClient.invalidateQueries({ queryKey: ["friends"] });
```

### Issue: "Real-time not working"

**Cause:** Subscription not set up

**Solution:**

```typescript
// Ensure useRealtimeFriends is called
import { useRealtimeFriends } from '@/hooks/realtime/useRealtimeFriends';

function App() {
  useRealtimeFriends(); // Add this
  return <YourApp />;
}
```

---

## 📚 Additional Resources

- [API Documentation](../api/) - Complete API reference
- [Troubleshooting Guide](./troubleshooting.md) - Common issues
- [Architecture Diagrams](../architecture/) - System architecture
- [Code Examples](../examples/) - More code examples

---

## 🎉 Migration Complete!

Once you've completed all steps and verified everything works:

1. ✅ Mark migration as complete in your project tracker
2. ✅ Update team documentation
3. ✅ Monitor error logs for 24 hours
4. ✅ Celebrate! 🎊

**Questions?** Contact the engineering team or create a GitHub issue.

---

**Last Updated:** 2025-11-29  
**Version:** 1.0.0  
**Maintainer:** Engineering Team
