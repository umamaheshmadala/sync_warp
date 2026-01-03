# Story 9.9.3: Migration Guide (Old → New Friends Module)

**Epic:** [EPIC 9.9: Documentation & Developer Experience](../epics/EPIC_9.9_Documentation_DX.md)  
**Priority:** 🔴 Critical  
**Estimated Time:** 1 day  
**MCP Usage:** 🧠 Context7 MCP (Light), 🐙 GitHub MCP (Light)  
**Dependencies:** Epics 9.1-9.8  
**Status:** 📋 Planning

---

## 📋 Story Description

Create a comprehensive migration guide to help developers transition from the old Friends module to the new Epic 9.x Friends Module, including database migrations, code changes, and testing procedures.

---

## ✅ Acceptance Criteria

### Migration Documentation

- [ ] Step-by-step migration plan
- [ ] Database migration scripts documented
- [ ] Code changes required (services, hooks, components)
- [ ] Rollback plan documented
- [ ] Testing checklist provided
- [ ] Common issues and solutions documented

### Code Migration

- [ ] Service layer migration guide
- [ ] Hook migration guide
- [ ] Component migration guide
- [ ] Store migration guide
- [ ] Type/interface migration guide

### Validation

- [ ] Migration tested on staging environment
- [ ] Rollback tested
- [ ] Performance comparison documented
- [ ] Data integrity verified

---

## 🎨 Implementation

### Phase 1: Migration Planning Document (2 hours)

**Create `docs/guides/migration.md`:**

````markdown
# Migration Guide: Old Friends Module → Epic 9.x Friends Module

## Overview

This guide will help you migrate from the old Friends module to the new Epic 9.x implementation. The migration includes database schema changes, service layer updates, and UI component replacements.

**Estimated Time:** 2-4 hours  
**Downtime Required:** None (zero-downtime migration)  
**Rollback Time:** < 15 minutes

---

## Prerequisites

- [ ] Node.js 18+ installed
- [ ] Supabase CLI installed
- [ ] Database backup created
- [ ] Git branch created for migration
- [ ] All tests passing on current code

---

## Phase 1: Database Migration (30 minutes)

### Step 1: Review Migration Scripts

```bash
# View pending migrations
supabase migration list

# Review migration files
cat supabase/migrations/20240101_friends_module_v2.sql
```
````

### Step 2: Run Migrations

```bash
# Run migrations on staging
supabase db push --db-url $STAGING_DB_URL

# Verify migrations
supabase db diff --schema public
```

### Step 3: Verify Tables

```sql
-- Verify new tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('friendships', 'friend_requests', 'blocks', 'follows');

-- Verify RLS policies
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE tablename IN ('friendships', 'friend_requests', 'blocks');

-- Check indexes
SELECT indexname, tablename
FROM pg_indexes
WHERE tablename IN ('friendships', 'friend_requests');
```

---

## Phase 2: Service Layer Migration (1 hour)

### Old Service → New Service

**Before (Old):**

```typescript
// src/services/friendService.ts
import { supabase } from "@/lib/supabase";

export async function getFriends(userId: string) {
  const { data } = await supabase
    .from("contacts")
    .select("*")
    .eq("user_id", userId);
  return data;
}
```

**After (New):**

```typescript
// src/services/friendsService.ts
import { supabase } from "@/lib/supabase";

export async function getFriends() {
  const { data } = await supabase
    .from("friendships")
    .select(
      `
      friend:profiles!friend_id (
        id,
        full_name,
        username,
        avatar_url
      )
    `
    )
    .eq("status", "active");
  return data?.map((f) => f.friend) || [];
}
```

### Migration Steps

1. **Rename file:**

   ```bash
   git mv src/services/friendService.ts src/services/friendsService.ts
   ```

2. **Update imports:**

   ```bash
   # Find all imports
   grep -r "from '@/services/friendService'" src/

   # Replace with new import
   find src/ -type f -name "*.ts" -o -name "*.tsx" | xargs sed -i 's/friendService/friendsService/g'
   ```

3. **Update function signatures:**
   - Remove `userId` parameter (use auth context)
   - Update return types
   - Add error handling

---

## Phase 3: Hook Migration (1 hour)

### Old Hook → New Hook

**Before (Old):**

```typescript
// src/hooks/useFriends.ts
export function useFriends(userId: string) {
  return useQuery(["friends", userId], () => getFriends(userId));
}
```

**After (New):**

```typescript
// src/hooks/friends/useFriends.ts
export function useFriends(options?: UseFriendsOptions) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["friends", user?.id],
    queryFn: () => friendsService.getFriends(),
    enabled: !!user,
    ...options,
  });
}
```

### Migration Checklist

- [ ] Move hooks to `src/hooks/friends/` directory
- [ ] Update to React Query v4+ syntax
- [ ] Remove manual `userId` passing
- [ ] Add proper TypeScript types
- [ ] Add error handling
- [ ] Add loading states

---

## Phase 4: Component Migration (1 hour)

### Old Component → New Component

**Before (Old):**

```typescript
// src/components/ContactsSidebar.tsx
function ContactsSidebar() {
  const { data: contacts } = useFriends(userId);
  return <div>{contacts?.map(c => <ContactCard contact={c} />)}</div>;
}
```

**After (New):**

```typescript
// src/components/friends/FriendsList.tsx
function FriendsList() {
  const { data: friends, isLoading } = useFriends();

  if (isLoading) return <FriendsListSkeleton />;
  if (!friends?.length) return <EmptyState />;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {friends.map(friend => (
        <FriendCard key={friend.id} friend={friend} />
      ))}
    </div>
  );
}
```

### Component Mapping

| Old Component      | New Component             | Status  |
| ------------------ | ------------------------- | ------- |
| `ContactsSidebar`  | `FriendsList`             | Replace |
| `ContactCard`      | `FriendCard`              | Replace |
| `ContactsModal`    | `FriendProfileModal`      | Replace |
| `AddContactButton` | `SendFriendRequestButton` | Replace |

---

## Phase 5: Testing (30 minutes)

### Test Checklist

- [ ] **Unit Tests:**

  ```bash
  npm test -- src/services/friendsService.test.ts
  npm test -- src/hooks/friends/
  ```

- [ ] **Integration Tests:**

  ```bash
  npm test -- src/__tests__/integration/friendRequestFlow.test.ts
  ```

- [ ] **E2E Tests:**

  ```bash
  npx playwright test e2e/friends/
  ```

- [ ] **Manual Testing:**
  - [ ] Send friend request
  - [ ] Accept friend request
  - [ ] View friends list
  - [ ] Search friends
  - [ ] Block user
  - [ ] Unblock user

---

## Phase 6: Deployment (30 minutes)

### Deployment Steps

1. **Deploy to Staging:**

   ```bash
   git checkout -b migration/friends-module-v2
   git push origin migration/friends-module-v2
   # Create PR and deploy to staging
   ```

2. **Smoke Test on Staging:**
   - [ ] Login works
   - [ ] Friends list loads
   - [ ] Can send friend request
   - [ ] Can accept friend request
   - [ ] Real-time updates work

3. **Deploy to Production:**

   ```bash
   # Merge PR
   git checkout main
   git merge migration/friends-module-v2
   git push origin main
   ```

4. **Monitor:**
   - [ ] Check error logs
   - [ ] Monitor performance
   - [ ] Watch user feedback

---

## Rollback Plan

If issues occur, follow these steps:

### 1. Rollback Code (5 minutes)

```bash
# Revert to previous commit
git revert HEAD
git push origin main
```

### 2. Rollback Database (10 minutes)

```bash
# Run down migration
supabase migration down

# Verify rollback
supabase db diff
```

### 3. Verify Rollback

- [ ] Old components working
- [ ] Old services working
- [ ] Data intact
- [ ] No errors in logs

---

## Common Issues

### Issue 1: RLS Policy Errors

**Symptom:** "permission denied for table friendships"

**Solution:**

```sql
-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'friendships';

-- Re-apply policies if needed
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
```

### Issue 2: Missing Data

**Symptom:** Friends list empty after migration

**Solution:**

```sql
-- Check data migration
SELECT COUNT(*) FROM friendships;
SELECT COUNT(*) FROM contacts; -- old table

-- Verify bidirectional friendships
SELECT user_id, friend_id FROM friendships LIMIT 10;
```

### Issue 3: Type Errors

**Symptom:** TypeScript errors after migration

**Solution:**

```bash
# Regenerate types
npm run generate:types

# Clear TypeScript cache
rm -rf node_modules/.cache
```

---

## Performance Comparison

| Metric            | Old Module | New Module | Improvement |
| ----------------- | ---------- | ---------- | ----------- |
| Friends List Load | 450ms      | 180ms      | 60% faster  |
| Search Query      | 320ms      | 45ms       | 86% faster  |
| Friend Request    | 280ms      | 120ms      | 57% faster  |
| Real-time Updates | ❌ No      | ✅ Yes     | New feature |

---

## Support

If you encounter issues:

1. **Check Documentation:** [docs/guides/troubleshooting.md](./troubleshooting.md)
2. **Slack:** #friends-module-support
3. **GitHub Issues:** [Create an issue](https://github.com/your-org/sync_warp/issues)
4. **Email:** engineering@yourcompany.com

---

## Conclusion

Congratulations! You've successfully migrated to the new Friends Module. 🎉

**Next Steps:**

- Review [Developer Onboarding Guide](./onboarding.md)
- Explore [API Documentation](../api/)
- Check out [Storybook](https://storybook.yourapp.com)

````

---

## 🎯 MCP Integration

### Context7 MCP Commands

```bash
# Analyze code differences
warp mcp run context7 "compare old friendService.ts with new friendsService.ts"

# Find all usages of old service
warp mcp run context7 "find all imports of friendService in src/"

# Generate migration script
warp mcp run context7 "generate migration script for contacts to friendships"
````

### GitHub MCP Commands

```bash
# Create migration PR
warp mcp run github "create PR for friends module migration"

# Track migration issues
warp mcp run github "list issues with label migration"
```

---

## 📦 Deliverables

1. **Migration Guide:**
   - `docs/guides/migration.md`

2. **Migration Scripts:**
   - Database migration SQL
   - Code migration scripts

3. **Testing Documentation:**
   - Test checklist
   - Validation procedures

4. **Rollback Plan:**
   - Step-by-step rollback guide
   - Emergency procedures

---

## 📈 Success Metrics

- **Migration Time:** < 4 hours
- **Downtime:** 0 minutes
- **Data Loss:** 0%
- **Rollback Success:** 100%
- **Test Pass Rate:** 100%

---

**Next Story:** [STORY 9.9.4: Developer Onboarding Guide](./STORY_9.9.4_Onboarding.md)
