# Troubleshooting Guide - Friends Module

**Having issues?** This guide will help you quickly diagnose and fix common problems with the Friends Module.

---

## 📋 Table of Contents

1. [Quick Diagnostics](#quick-diagnostics)
2. [Common Issues](#common-issues)
3. [Error Messages](#error-messages)
4. [Debugging Techniques](#debugging-techniques)
5. [Performance Issues](#performance-issues)
6. [FAQ](#faq)

---

## 🔍 Quick Diagnostics

**Start here if you're experiencing issues:**

### Checklist

- [ ] Is the dev server running? (`npm run dev`)
- [ ] Are environment variables set? (`.env.local`)
- [ ] Is Supabase accessible? (Check dashboard)
- [ ] Are tests passing? (`npm test`)
- [ ] Is your branch up to date? (`git pull`)

### Quick Tests

```bash
# Test Supabase connection
curl https://your-project.supabase.co/rest/v1/

# Test local server
curl http://localhost:5173

# Run health check tests
npm test -- healthCheck
```

---

## 🐛 Common Issues

### Issue 1: "Permission denied for table friendships"

**Symptoms:**

- Error when fetching friends list
- Console shows RLS policy error
- Empty friends list despite having friends

**Cause:** Row Level Security (RLS) policies not configured or user not authenticated

**Solution:**

```sql
-- 1. Check if RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'friendships';

-- 2. Check policies exist
SELECT * FROM pg_policies
WHERE tablename = 'friendships';

-- 3. Test with user context
SET request.jwt.claim.sub = 'your-user-id';
SELECT * FROM friendships WHERE user_id = auth.uid();
```

**If policies are missing:**

```sql
-- Re-apply RLS policies
DROP POLICY IF EXISTS "Users can view their friendships" ON friendships;

CREATE POLICY "Users can view their friendships"
ON friendships FOR SELECT
USING (user_id = auth.uid() OR friend_id = auth.uid());
```

**Prevention:**

- Always run migrations: `supabase db push`
- Test with authenticated user
- Check Supabase logs

---

### Issue 2: "React Query not refetching after mutation"

**Symptoms:**

- Friends list doesn't update after accepting request
- UI shows stale data
- Manual refresh required

**Cause:** Query cache not invalidated after mutation

**Solution:**

```typescript
import { useQueryClient } from "@tanstack/react-query";

function MyComponent() {
  const queryClient = useQueryClient();
  const { acceptRequest } = useFriendActions();

  const handleAccept = async (requestId: string) => {
    await acceptRequest.mutateAsync(requestId);

    // Invalidate queries to refetch
    queryClient.invalidateQueries({ queryKey: ["friends"] });
    queryClient.invalidateQueries({ queryKey: ["friendRequests"] });
  };
}
```

**Better Solution (already implemented):**

```typescript
// In useFriendActions hook
const acceptRequest = useMutation({
  mutationFn: (requestId: string) =>
    friendsService.acceptFriendRequest(requestId),
  onSuccess: () => {
    // Automatic invalidation
    queryClient.invalidateQueries({ queryKey: ["friends"] });
    queryClient.invalidateQueries({ queryKey: ["friendRequests"] });
  },
});
```

**Prevention:**

- Use provided hooks (`useFriendActions`)
- Always invalidate related queries
- Check React Query DevTools

---

### Issue 3: "Real-time updates not working"

**Symptoms:**

- Friends list doesn't update in real-time
- Need to refresh page to see changes
- Other user's actions not reflected

**Cause:** Real-time subscription not set up or connection lost

**Solution:**

```typescript
// 1. Ensure useRealtimeFriends is called
import { useRealtimeFriends } from '@/hooks/realtime/useRealtimeFriends';

function App() {
  useRealtimeFriends(); // Must be called!
  return <YourApp />;
}

// 2. Check Supabase connection
import { supabase } from '@/lib/supabase';

const status = supabase.channel('test').subscribe((status) => {
  console.log('Realtime status:', status);
});
```

**Debug real-time:**

```typescript
// Enable verbose logging
const channel = supabase
  .channel("friendships")
  .on(
    "postgres_changes",
    { event: "*", schema: "public", table: "friendships" },
    (payload) => {
      console.log("Change received!", payload);
    }
  )
  .subscribe((status) => {
    console.log("Subscription status:", status);
  });
```

**Prevention:**

- Call `useRealtimeFriends` in root component
- Check Supabase real-time is enabled
- Monitor connection status

---

### Issue 4: "Friends list is empty but I have friends"

**Symptoms:**

- Friends list shows empty state
- Database has friendship records
- No errors in console

**Possible Causes & Solutions:**

**A. Wrong user ID:**

```typescript
// Check current user
import { useAuthStore } from "@/store/authStore";

const user = useAuthStore((state) => state.user);
console.log("Current user:", user?.id);
```

**B. Status filter:**

```sql
-- Check friendship status
SELECT user_id, friend_id, status
FROM friendships
WHERE user_id = 'your-user-id';

-- Update if needed
UPDATE friendships
SET status = 'active'
WHERE status IS NULL;
```

**C. Bidirectional friendships missing:**

```sql
-- Check both directions
SELECT * FROM friendships
WHERE user_id = 'user-a' AND friend_id = 'user-b'
   OR user_id = 'user-b' AND friend_id = 'user-a';
```

---

### Issue 5: "Cannot send friend request - already friends"

**Symptoms:**

- Error when sending friend request
- Message says "already friends"
- But user not in friends list

**Cause:** Pending request exists or friendship in different status

**Solution:**

```sql
-- Check existing relationships
SELECT * FROM friend_requests
WHERE (sender_id = 'user-a' AND receiver_id = 'user-b')
   OR (sender_id = 'user-b' AND receiver_id = 'user-a');

SELECT * FROM friendships
WHERE (user_id = 'user-a' AND friend_id = 'user-b')
   OR (user_id = 'user-b' AND friend_id = 'user-a');
```

**Fix:**

```typescript
// Handle specific error codes
try {
  await friendsService.sendFriendRequest(userId);
} catch (error) {
  if (error.code === "already_friends") {
    toast.info("You are already friends!");
  } else if (error.code === "request_pending") {
    toast.info("Friend request already sent");
  } else {
    toast.error("Failed to send request");
  }
}
```

---

### Issue 6: "Module not found" errors

**Symptoms:**

- TypeScript errors about missing modules
- Import statements fail
- Build fails

**Cause:** Incorrect import paths or missing dependencies

**Solution:**

```typescript
// ❌ Wrong - relative paths
import { friendsService } from "../../services/friendsService";

// ✅ Correct - use @ alias
import { friendsService } from "@/services/friendsService";
```

**Check tsconfig.json:**

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

**Reinstall dependencies:**

```bash
rm -rf node_modules package-lock.json
npm install
```

---

### Issue 7: "Type errors after pulling latest code"

**Symptoms:**

- TypeScript errors in previously working code
- Type mismatches
- Missing properties

**Cause:** Types changed in latest code

**Solution:**

```bash
# 1. Clear TypeScript cache
rm -rf node_modules/.cache

# 2. Regenerate types
npm run generate:types

# 3. Restart TypeScript server in VS Code
# Cmd/Ctrl + Shift + P → "TypeScript: Restart TS Server"
```

---

## ⚠️ Error Messages

### Service Layer Errors

**Error:** `"Failed to fetch friends"`

**Meaning:** Network error or Supabase down

**Fix:**

```typescript
// Check Supabase status
const { data, error } = await supabase.from("friendships").select("count");
if (error) console.error("Supabase error:", error);
```

---

**Error:** `"User not authenticated"`

**Meaning:** No valid session

**Fix:**

```typescript
import { supabase } from "@/lib/supabase";

const {
  data: { session },
} = await supabase.auth.getSession();
if (!session) {
  // Redirect to login
  window.location.href = "/login";
}
```

---

### React Query Errors

**Error:** `"Query data is undefined"`

**Meaning:** Query hasn't loaded yet or failed

**Fix:**

```typescript
const { data, isLoading, error } = useFriends();

// Always check loading and error states
if (isLoading) return <Skeleton />;
if (error) return <ErrorMessage error={error} />;

// Safe to use data
const friends = data?.data || [];
```

---

**Error:** `"Too many re-renders"`

**Meaning:** Infinite loop in component

**Fix:**

```typescript
// ❌ Wrong - causes infinite loop
function MyComponent() {
  const { refetch } = useFriends();
  refetch(); // Called on every render!
}

// ✅ Correct - use useEffect
function MyComponent() {
  const { refetch } = useFriends();

  useEffect(() => {
    refetch();
  }, []); // Only on mount
}
```

---

### Supabase Errors

**Error:** `"JWT expired"`

**Meaning:** Session expired

**Fix:**

```typescript
import { supabase } from "@/lib/supabase";

// Refresh session
const { data, error } = await supabase.auth.refreshSession();
if (error) {
  // Redirect to login
  window.location.href = "/login";
}
```

---

**Error:** `"Invalid API key"`

**Meaning:** Wrong Supabase credentials

**Fix:**

```env
# Check .env.local
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-correct-anon-key
```

---

## 🔧 Debugging Techniques

### 1. Browser DevTools

**Network Tab:**

```
1. Open DevTools (F12)
2. Go to Network tab
3. Filter by "Fetch/XHR"
4. Look for Supabase requests
5. Check status codes and responses
```

**Console:**

```typescript
// Add debug logs
console.log("Friends data:", friends);
console.log("User:", user);
console.log("Query status:", { isLoading, error });
```

---

### 2. React Query DevTools

**Already configured in the app:**

```typescript
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

// Press Ctrl+Shift+Q to toggle
<ReactQueryDevtools initialIsOpen={false} />
```

**Features:**

- View all queries and their states
- Manually refetch queries
- Inspect query data
- See cache status

---

### 3. Supabase Logs

**Check real-time logs:**

1. Go to Supabase Dashboard
2. Select your project
3. Go to "Logs" → "Postgres Logs"
4. Filter by table name

**SQL debugging:**

```sql
-- Enable query logging
ALTER DATABASE postgres SET log_statement = 'all';

-- View recent queries
SELECT * FROM pg_stat_statements
ORDER BY calls DESC
LIMIT 10;
```

---

### 4. State Debugging

**Zustand DevTools:**

```typescript
import { devtools } from "zustand/middleware";

export const useFriendsStore = create(
  devtools(
    (set) => ({
      // ... store
    }),
    { name: "FriendsStore" }
  )
);
```

**React DevTools:**

- Install React DevTools extension
- Inspect component props and state
- Track re-renders

---

## ⚡ Performance Issues

### Issue: "Friends list loads slowly"

**Symptoms:**

- Takes > 2 seconds to load
- UI feels sluggish

**Solutions:**

**1. Add pagination:**

```typescript
const { data, fetchNextPage } = useInfiniteQuery({
  queryKey: ["friends"],
  queryFn: ({ pageParam = 0 }) =>
    friendsService.getFriends({ offset: pageParam, limit: 20 }),
  getNextPageParam: (lastPage, pages) =>
    lastPage.length === 20 ? pages.length * 20 : undefined,
});
```

**2. Optimize queries:**

```sql
-- Add index
CREATE INDEX idx_friendships_user_id ON friendships(user_id);
CREATE INDEX idx_friendships_friend_id ON friendships(friend_id);
```

**3. Use React Query caching:**

```typescript
const { data } = useFriends({
  staleTime: 5 * 60 * 1000, // 5 minutes
  cacheTime: 10 * 60 * 1000, // 10 minutes
});
```

---

### Issue: "Too many re-renders"

**Solutions:**

**1. Memoize expensive computations:**

```typescript
const sortedFriends = useMemo(
  () => friends?.sort((a, b) => a.full_name.localeCompare(b.full_name)),
  [friends]
);
```

**2. Use React.memo:**

```typescript
export const FriendCard = React.memo(({ friend }) => {
  // Component
});
```

**3. Optimize selectors:**

```typescript
// ❌ Creates new array every render
const friends = useFriendsStore((state) =>
  state.friends.filter((f) => f.is_online)
);

// ✅ Use selector
const onlineFriends = useFriendsStore(
  useCallback((state) => state.friends.filter((f) => f.is_online), [])
);
```

---

## ❓ FAQ

### Q: How do I reset the database?

```bash
# Reset all migrations
supabase db reset

# Re-run migrations
supabase db push
```

### Q: How do I clear React Query cache?

```typescript
import { useQueryClient } from "@tanstack/react-query";

const queryClient = useQueryClient();
queryClient.clear(); // Clear all
queryClient.removeQueries({ queryKey: ["friends"] }); // Clear specific
```

### Q: How do I test with different users?

```typescript
// Use Supabase auth admin
import { supabase } from "@/lib/supabase";

await supabase.auth.admin.createUser({
  email: "test@example.com",
  password: "password",
  email_confirm: true,
});
```

### Q: Where are the logs?

- **Browser:** DevTools Console
- **Supabase:** Dashboard → Logs
- **Server:** Terminal running `npm run dev`

---

## 🆘 Still Having Issues?

If you're still stuck:

1. **Check Documentation:**
   - [API Docs](../api/)
   - [Migration Guide](./migration.md)
   - [Onboarding Guide](./onboarding.md)

2. **Search GitHub Issues:**
   - [Existing Issues](https://github.com/your-org/sync_warp/issues)
   - [Create New Issue](https://github.com/your-org/sync_warp/issues/new)

3. **Ask the Team:**
   - Slack: #friends-module
   - Email: engineering@yourcompany.com

4. **Debug Logs:**
   - Enable verbose logging
   - Share error messages
   - Provide reproduction steps

---

**Last Updated:** 2025-11-29  
**Maintainer:** Engineering Team
