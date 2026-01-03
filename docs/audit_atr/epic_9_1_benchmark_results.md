# Epic 9.1 Performance Benchmark Results

**Test Date**: November 26, 2025  
**Test User**: d7c2f5c4-0f19-4b4f-a641-3f77c34937b2 (testuser1@gmail.com)

---

## 🚀 Quick Test Instructions

### How to Run Each Benchmark:
1. Copy the SQL query below
2. Paste into Supabase Studio SQL Editor
3. Click "Run" (or press Ctrl+Enter)
4. Look at bottom of results for "Execution Time: X.XXX ms"
5. Record the time in the Results section

---

## 📊 Benchmark Queries

### Benchmark 1: Friend List Query
**Target**: < 30ms  
**Purpose**: Measure time to load user's friends list

```sql
EXPLAIN ANALYZE
SELECT 
  f.id,
  p.id as friend_id,
  p.full_name,
  p.username,
  p.avatar_url,
  p.is_online,
  p.last_active
FROM friendships f
JOIN profiles p ON p.id = f.friend_id
WHERE f.user_id = 'd7c2f5c4-0f19-4b4f-a641-3f77c34937b2'
  AND f.status = 'active'
ORDER BY f.created_at DESC;
```

**Result**: _____ ms  
**Status**: [ ] PASS (< 30ms) [ ] FAIL  
**Notes**: _______________

---

### Benchmark 2: Friend Search Query
**Target**: < 100ms  
**Purpose**: Measure time to search friends by name

```sql
EXPLAIN ANALYZE
SELECT 
  p.id,
  p.full_name,
  p.username,
  p.avatar_url,
  p.is_online
FROM friendships f
JOIN profiles p ON p.id = f.friend_id
WHERE f.user_id = 'd7c2f5c4-0f19-4b4f-a641-3f77c34937b2'
  AND f.status = 'active'
  AND (
    p.full_name ILIKE '%test%'
    OR p.username ILIKE '%test%'
  );
```

**Result**: _____ ms  
**Status**: [ ] PASS (< 100ms) [ ] FAIL  
**Notes**: _______________

---

### Benchmark 3: Blocking Check
**Target**: < 10ms  
**Purpose**: Measure time to check if users are blocked

```sql
EXPLAIN ANALYZE
SELECT EXISTS (
  SELECT 1 FROM blocked_users
  WHERE (
    (blocker_id = 'd7c2f5c4-0f19-4b4f-a641-3f77c34937b2' AND blocked_id = 'test-user-id')
    OR
    (blocker_id = 'test-user-id' AND blocked_id = 'd7c2f5c4-0f19-4b4f-a641-3f77c34937b2')
  )
) as is_blocked;
```

**Result**: _____ ms  
**Status**: [ ] PASS (< 10ms) [ ] FAIL  
**Notes**: _______________

---

### Benchmark 4: Mutual Friends Query
**Target**: < 50ms  
**Purpose**: Measure time to find mutual friends

```sql
EXPLAIN ANALYZE
SELECT * FROM get_mutual_friends(
  'd7c2f5c4-0f19-4b4f-a641-3f77c34937b2',
  'd7c2f5c4-0f19-4b4f-a641-3f77c34937b2'
);
```

**Result**: _____ ms  
**Status**: [ ] PASS (< 50ms) [ ] FAIL  
**Notes**: _______________

---

## 📋 Results Summary

### Performance Benchmarks

| Benchmark | Target | Actual | Status | Pass/Fail |
|-----------|--------|--------|--------|-----------|
| Friend List | < 30ms | _____ ms | ⏸️ Pending | ⬜ |
| Friend Search | < 100ms | _____ ms | ⏸️ Pending | ⬜ |
| Blocking Check | < 10ms | _____ ms | ⏸️ Pending | ⬜ |
| Mutual Friends | < 50ms | _____ ms | ⏸️ Pending | ⬜ |

**Overall**: ⏸️ Pending

---

## 🔍 Additional Verification Queries

### Check Presence Heartbeat
```sql
SELECT 
  email,
  is_online,
  last_active,
  NOW() - last_active as seconds_since_update,
  privacy_settings->>'online_status_visibility' as visibility
FROM profiles
WHERE email = 'testuser1@gmail.com';
```

**Expected**: `seconds_since_update` should be < 60 seconds if app is running

---

### Check Friendships (Bidirectional)
```sql
SELECT 
  f.id,
  f.user_id,
  f.friend_id,
  f.status,
  f.created_at,
  p.full_name as friend_name,
  p.is_online
FROM friendships f
JOIN profiles p ON p.id = f.friend_id
WHERE f.user_id = 'd7c2f5c4-0f19-4b4f-a641-3f77c34937b2'
  AND f.status = 'active'
ORDER BY f.created_at DESC;
```

**Expected**: Should show all friends (TWO-ROW pattern means each friendship appears twice)

---

### Check Recent Notifications
```sql
SELECT 
  n.id,
  n.type,
  n.title,
  n.message,
  n.is_read,
  n.created_at,
  p.full_name as sender_name,
  NOW() - n.created_at as age
FROM notifications n
LEFT JOIN profiles p ON p.id = n.sender_id
WHERE n.user_id = 'd7c2f5c4-0f19-4b4f-a641-3f77c34937b2'
ORDER BY n.created_at DESC
LIMIT 10;
```

**Expected**: Should show recent friend-related notifications

---

### Verify Indexes Exist
```sql
SELECT 
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename IN ('friendships', 'friend_requests', 'blocked_users', 'profiles')
  AND schemaname = 'public'
ORDER BY tablename, indexname;
```

**Expected**: Should show multiple indexes for each table

---

## 📝 Test Completion Checklist

- [ ] Benchmark 1: Friend List Query
- [ ] Benchmark 2: Friend Search Query
- [ ] Benchmark 3: Blocking Check
- [ ] Benchmark 4: Mutual Friends Query
- [ ] Verified presence heartbeat
- [ ] Verified friendships exist
- [ ] Verified notifications work
- [ ] Verified indexes exist

---

## 🎯 Next Steps After SQL Tests

1. **If all benchmarks PASS**: Proceed to runtime tests (presence heartbeat)
2. **If any benchmark FAILS**: Investigate slow queries and optimize
3. **After SQL tests**: Test integration points (messaging, notifications)

---

**Instructions**: 
1. Run each benchmark query in Supabase Studio
2. Fill in the "Result" field with execution time
3. Mark PASS or FAIL based on target
4. Save this file when complete
