# Story 9.9.5: Troubleshooting Guide

**Epic:** [EPIC 9.9: Documentation & Developer Experience](../epics/EPIC_9.9_Documentation_DX.md)  
**Priority:** 🟡 Medium  
**Estimated Time:** 1 day  
**MCP Usage:** 🧠 Context7 MCP (Light), 🐙 GitHub MCP (Medium)  
**Dependencies:** Stories 9.9.1-9.9.4  
**Status:** 📋 Planning

---

## 📋 Story Description

Create a comprehensive troubleshooting guide documenting the top 10+ common issues, error messages, debugging tips, and solutions to help developers quickly resolve problems.

---

## ✅ Acceptance Criteria

### Troubleshooting Documentation

- [ ] Top 10+ common issues documented
- [ ] Error messages explained with solutions
- [ ] Debugging tips and techniques
- [ ] Support channels listed
- [ ] Quick reference guide
- [ ] Search functionality

### Issue Coverage

- [ ] RLS policy errors
- [ ] Real-time subscription issues
- [ ] Performance problems
- [ ] Data synchronization issues
- [ ] Authentication errors
- [ ] Type errors
- [ ] Build/deployment issues

### Validation

- [ ] Tested with real issues from GitHub
- [ ] Solutions verified to work
- [ ] Feedback from developers incorporated

---

## 🎨 Implementation

### Phase 1: Common Issues Documentation (4 hours)

**Create `docs/guides/troubleshooting.md`:**

````markdown
# Troubleshooting Guide - Friends Module

Quick reference for common issues and solutions.

## Table of Contents

1. [RLS Policy Errors](#rls-policy-errors)
2. [Real-time Issues](#real-time-issues)
3. [Performance Problems](#performance-problems)
4. [Data Sync Issues](#data-sync-issues)
5. [Authentication Errors](#authentication-errors)
6. [Type Errors](#type-errors)
7. [Build Issues](#build-issues)
8. [Testing Issues](#testing-issues)
9. [Deployment Issues](#deployment-issues)
10. [General Debugging](#general-debugging)

---

## 1. RLS Policy Errors

### Issue: "permission denied for table friendships"

**Symptoms:**

- Cannot fetch friends list
- Error in console: `permission denied for table friendships`
- Empty friends list despite having friends

**Causes:**

- RLS policies not applied
- User not authenticated
- Policy conditions not met

**Solutions:**

**Step 1: Check if RLS is enabled**

```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'friendships';
```
````

**Step 2: Verify policies exist**

```sql
SELECT * FROM pg_policies WHERE tablename = 'friendships';
```

**Step 3: Test policy with user context**

```sql
-- Set user context
SET request.jwt.claim.sub = 'your-user-id';

-- Test query
SELECT * FROM friendships WHERE user_id = auth.uid();
```

**Step 4: Re-apply policies if needed**

```sql
-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their friendships" ON friendships;

-- Re-create policy
CREATE POLICY "Users can view their friendships"
ON friendships FOR SELECT
USING (user_id = auth.uid() OR friend_id = auth.uid());
```

**Prevention:**

- Always test RLS policies before deploying
- Use Supabase SQL Editor to verify
- Check auth context in queries

---

## 2. Real-time Issues

### Issue: Friend list not updating in real-time

**Symptoms:**

- Friend list doesn't update after accepting request
- No real-time updates
- Need to refresh page to see changes

**Causes:**

- Realtime subscription not connected
- Channel not subscribed
- RLS blocking realtime events

**Solutions:**

**Step 1: Check subscription status**

```typescript
import { useFriendsStore } from "@/store/friendsStore";

// In your component
const subscriptionStatus = useFriendsStore((state) => state.subscriptionStatus);
console.log("Subscription status:", subscriptionStatus);
```

**Step 2: Verify channel is subscribed**

```typescript
import { supabase } from "@/lib/supabase";

const channels = supabase.getChannels();
console.log("Active channels:", channels);
```

**Step 3: Reconnect subscription**

```typescript
// Remove all channels
supabase.removeAllChannels();

// Re-subscribe
import { setupRealtimeSubscription } from "@/hooks/realtime/useRealtimeFriends";
setupRealtimeSubscription();
```

**Step 4: Check RLS policies allow SELECT**

```sql
-- Verify SELECT policy exists
SELECT * FROM pg_policies
WHERE tablename = 'friendships'
  AND cmd = 'SELECT';
```

**Prevention:**

- Monitor subscription status
- Handle reconnection on network changes
- Test realtime in development

---

## 3. Performance Problems

### Issue: Friends list takes > 1s to load

**Symptoms:**

- Slow initial load
- Laggy scrolling
- High memory usage

**Causes:**

- Missing database indexes
- Loading too many friends at once
- No pagination
- Inefficient queries

**Solutions:**

**Step 1: Check query performance**

```sql
EXPLAIN ANALYZE
SELECT p.*
FROM profiles p
JOIN friendships f ON f.friend_id = p.id
WHERE f.user_id = 'your-user-id'
  AND f.status = 'active';
```

**Step 2: Add missing indexes**

```sql
-- Index on user_id
CREATE INDEX IF NOT EXISTS idx_friendships_user_id
ON friendships(user_id);

-- Index on friend_id
CREATE INDEX IF NOT EXISTS idx_friendships_friend_id
ON friendships(friend_id);

-- Composite index
CREATE INDEX IF NOT EXISTS idx_friendships_user_status
ON friendships(user_id, status);
```

**Step 3: Implement pagination**

```typescript
import { useFriends } from '@/hooks/friends/useFriends';

function FriendsList() {
  const { data, fetchNextPage, hasNextPage } = useFriends({
    limit: 50, // Load 50 at a time
  });

  return (
    <div>
      {data?.pages.map(page =>
        page.map(friend => <FriendCard key={friend.id} friend={friend} />)
      )}
      {hasNextPage && <button onClick={() => fetchNextPage()}>Load More</button>}
    </div>
  );
}
```

**Step 4: Use React Query caching**

```typescript
const { data: friends } = useFriends({
  staleTime: 5 * 60 * 1000, // 5 minutes
  cacheTime: 10 * 60 * 1000, // 10 minutes
});
```

**Prevention:**

- Always use pagination for large lists
- Add indexes during migration
- Monitor query performance
- Use React Query's caching

---

## 4. Data Sync Issues

### Issue: Blocked user still visible in search

**Symptoms:**

- Blocked user appears in search results
- Can still see blocked user's profile
- Block list not synced

**Causes:**

- Cache not invalidated
- Search query not excluding blocked users
- RLS policy not filtering blocks

**Solutions:**

**Step 1: Check blocks table**

```sql
SELECT * FROM blocks WHERE user_id = auth.uid();
```

**Step 2: Verify search excludes blocked users**

```typescript
// In friendsService.ts
export async function searchUsers(query: string) {
  const { data: blockedUsers } = await supabase
    .from("blocks")
    .select("blocked_user_id");

  const blockedIds = blockedUsers?.map((b) => b.blocked_user_id) || [];

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .ilike("full_name", `%${query}%`)
    .not("id", "in", `(${blockedIds.join(",")})`);

  return data;
}
```

**Step 3: Clear cache**

```typescript
import { queryClient } from "@/lib/queryClient";

// Invalidate friends queries
queryClient.invalidateQueries({ queryKey: ["friends"] });

// Or clear all cache
queryClient.clear();
```

**Prevention:**

- Always invalidate cache after blocking
- Test block functionality thoroughly
- Use RLS to enforce blocks at database level

---

## 5. Authentication Errors

### Issue: "User not authenticated" errors

**Symptoms:**

- Cannot access friends page
- Redirected to login
- 401 errors in console

**Causes:**

- Session expired
- Invalid token
- Auth context not available

**Solutions:**

**Step 1: Check auth status**

```typescript
import { useAuth } from "@/hooks/useAuth";

const { user, session } = useAuth();
console.log("User:", user);
console.log("Session:", session);
```

**Step 2: Refresh session**

```typescript
import { supabase } from "@/lib/supabase";

const { data, error } = await supabase.auth.refreshSession();
if (error) console.error("Session refresh failed:", error);
```

**Step 3: Re-login**

```typescript
// Clear session and redirect to login
await supabase.auth.signOut();
window.location.href = "/login";
```

**Prevention:**

- Handle session expiration gracefully
- Implement auto-refresh
- Show clear error messages

---

## 6. Type Errors

### Issue: TypeScript errors after migration

**Symptoms:**

- Type errors in IDE
- Build fails with type errors
- Incorrect type inference

**Causes:**

- Outdated generated types
- Missing type definitions
- Type cache issues

**Solutions:**

**Step 1: Regenerate types**

```bash
npm run generate:types
```

**Step 2: Clear TypeScript cache**

```bash
rm -rf node_modules/.cache
rm -rf .tsbuildinfo
```

**Step 3: Restart TypeScript server**

- VS Code: Cmd/Ctrl + Shift + P → "TypeScript: Restart TS Server"

**Step 4: Check type definitions**

```typescript
// Verify types are imported correctly
import type { Friend, FriendRequest } from "@/types/friends";
```

**Prevention:**

- Regenerate types after schema changes
- Use strict TypeScript settings
- Keep dependencies updated

---

## 7. Build Issues

### Issue: Build fails with "Cannot find module" errors

**Symptoms:**

- `npm run build` fails
- Module not found errors
- Import path errors

**Causes:**

- Incorrect import paths
- Missing dependencies
- Path alias not configured

**Solutions:**

**Step 1: Check import paths**

```typescript
// Use path aliases
import { useFriends } from "@/hooks/friends/useFriends";

// Not relative paths
// import { useFriends } from '../../../hooks/friends/useFriends';
```

**Step 2: Verify tsconfig.json**

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

**Step 3: Install missing dependencies**

```bash
npm install
```

**Prevention:**

- Use path aliases consistently
- Keep dependencies in sync
- Test builds before deploying

---

## 8. Testing Issues

### Issue: Tests failing with "Cannot read property of undefined"

**Symptoms:**

- Tests fail with undefined errors
- Mocks not working
- Async issues

**Causes:**

- Missing mocks
- Async not awaited
- Test environment issues

**Solutions:**

**Step 1: Add proper mocks**

```typescript
import { vi } from "vitest";

vi.mock("@/services/friendsService", () => ({
  getFriends: vi.fn(() => Promise.resolve([])),
}));
```

**Step 2: Use async/await**

```typescript
test("should load friends", async () => {
  const { result } = renderHook(() => useFriends());

  await waitFor(() => {
    expect(result.current.data).toBeDefined();
  });
});
```

**Step 3: Setup test environment**

```typescript
// In test setup file
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});
```

**Prevention:**

- Write tests alongside code
- Use proper test utilities
- Mock external dependencies

---

## 9. Deployment Issues

### Issue: App works locally but fails in production

**Symptoms:**

- Works in development
- Fails in production
- Environment variable issues

**Causes:**

- Missing environment variables
- Different build configuration
- CORS issues

**Solutions:**

**Step 1: Check environment variables**

```bash
# Verify all required vars are set
echo $VITE_SUPABASE_URL
echo $VITE_SUPABASE_ANON_KEY
```

**Step 2: Test production build locally**

```bash
npm run build
npm run preview
```

**Step 3: Check build logs**

```bash
# Review build output for errors
npm run build 2>&1 | tee build.log
```

**Prevention:**

- Use .env.example as template
- Test production builds locally
- Monitor deployment logs

---

## 10. General Debugging

### Debugging Tips

**Enable verbose logging:**

```typescript
// In development
if (import.meta.env.DEV) {
  console.log("Friends data:", friends);
  console.log("Query status:", { isLoading, error });
}
```

**Use React Query Devtools:**

```typescript
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

function App() {
  return (
    <>
      <YourApp />
      <ReactQueryDevtools initialIsOpen={false} />
    </>
  );
}
```

**Check Supabase logs:**

- Go to Supabase Dashboard → Logs
- Filter by table/function
- Look for errors

**Use browser DevTools:**

- Network tab: Check API calls
- Console: Check for errors
- React DevTools: Inspect component state

---

## Need Help?

If you're still stuck:

1. **Search Documentation:**
   - [API Docs](../api/)
   - [Onboarding Guide](./onboarding.md)
   - [Migration Guide](./migration.md)

2. **Check GitHub Issues:**
   - [Open Issues](https://github.com/your-org/sync_warp/issues)
   - [Closed Issues](https://github.com/your-org/sync_warp/issues?q=is%3Aissue+is%3Aclosed)

3. **Ask for Help:**
   - Slack: #friends-module-support
   - Email: engineering@yourcompany.com
   - Create GitHub Issue

4. **Emergency Contact:**
   - On-call engineer: See PagerDuty
   - Critical bugs: Escalate immediately

---

## Contributing

Found a solution not listed here? [Add it to the guide!](https://github.com/your-org/sync_warp/edit/main/docs/guides/troubleshooting.md)

````

---

## 🎯 MCP Integration

### Context7 MCP Commands

```bash
# Analyze error patterns
warp mcp run context7 "find common error patterns in src/services/friendsService.ts"

# Generate troubleshooting steps
warp mcp run context7 "generate troubleshooting steps for RLS errors"
````

### GitHub MCP Commands

```bash
# Find common issues
warp mcp run github "list issues with label 'bug' and label 'friends'"

# Generate FAQ from issues
warp mcp run github "summarize common issues from closed bugs"
```

---

## 📦 Deliverables

1. **Troubleshooting Guide:**
   - `docs/guides/troubleshooting.md`

2. **Quick Reference:**
   - Common errors table
   - Quick fixes list

3. **Debug Scripts:**
   - Diagnostic tools
   - Log analyzers

---

## 📈 Success Metrics

- **Issues Covered:** 10+
- **Resolution Time:** < 30 minutes average
- **Self-Service Rate:** > 80%
- **Support Ticket Reduction:** > 50%

---

**Next Story:** [STORY 9.9.6: Architecture Diagrams](./STORY_9.9.6_Architecture_Diagrams.md)
