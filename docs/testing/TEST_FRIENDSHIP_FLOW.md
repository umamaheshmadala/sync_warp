# Test: Friendship Flow

## Test Scenario: User1 and User4

### Initial State
- User1 and User4 are NOT friends
- No pending requests

### Test Steps

#### 1. Send Friend Request
**Action**: User1 → Send request → User4

**Expected Results**:
- ✅ User1 sees "Cancel Request" button for User4
- ✅ User4 sees "View Request" button for User1
- ✅ User4 has notification: "User1 sent you a friend request"
- ✅ Database: `friend_requests` row with `status='pending'`

**SQL Check**:
```sql
SELECT * FROM friend_requests 
WHERE sender_id = 'user1_id' AND receiver_id = 'user4_id' AND status = 'pending';
```

---

#### 2. Accept Friend Request
**Action**: User4 → Accept request from User1

**Expected Results**:
- ✅ User4 sees User1 in friends list at `/friends`
- ✅ User1 sees User4 in friends list at `/friends`
- ✅ Both see "Friends" badge when searching for each other
- ✅ Database: TWO `friendships` rows with `status='active'`

**SQL Check**:
```sql
-- Should return 2 rows
SELECT * FROM friendships 
WHERE (user_id = 'user1_id' AND friend_id = 'user4_id')
   OR (user_id = 'user4_id' AND friend_id = 'user1_id');

-- Both should have status='active'
```

**SQL Verify Bidirectional**:
```sql
-- User1's perspective
SELECT * FROM friendships WHERE user_id = 'user1_id' AND friend_id = 'user4_id';
-- Should return: status='active'

-- User4's perspective
SELECT * FROM friendships WHERE user_id = 'user4_id' AND friend_id = 'user1_id';
-- Should return: status='active'
```

---

#### 3. Unfriend
**Action**: User1 → Unfriend → User4

**Expected Results**:
- ✅ User1 NO LONGER sees User4 in friends list
- ✅ User4 NO LONGER sees User1 in friends list
- ✅ Both see "Add Friend" button when searching for each other
- ✅ Database: ZERO `friendships` rows (hard delete)

**SQL Check**:
```sql
-- Should return 0 rows
SELECT * FROM friendships 
WHERE (user_id = 'user1_id' AND friend_id = 'user4_id')
   OR (user_id = 'user4_id' AND friend_id = 'user1_id');
```

---

#### 4. Re-add After Unfriend
**Action**: User4 → Send request → User1 (reverse direction)

**Expected Results**:
- ✅ Can send friend request again (no restriction)
- ✅ User1 sees "View Request" button
- ✅ User4 sees "Cancel Request" button

---

## Common Issues & Fixes

### Issue: User1 unfriends User4, but User4 still sees User1 as friend

**Root Cause**: Unfriend only deleted one row, not both

**Fix**: Ensure trigger handles DELETE:
```sql
-- Check if trigger exists
SELECT tgname FROM pg_trigger WHERE tgname = 'trigger_create_reverse_friendship';

-- Verify trigger handles DELETE
SELECT pg_get_triggerdef(oid) FROM pg_trigger 
WHERE tgname = 'trigger_create_reverse_friendship';
```

**Solution Applied**:
- Updated `create_reverse_friendship()` trigger to handle DELETE
- Created `unfriend_user()` DB function with double-delete safety
- Updated frontend to use `unfriend_user()` instead of manual DELETE

---

## Manual Test Checklist

### Before Testing
- [ ] Clear browser cache
- [ ] Refresh page to reload queries
- [ ] Check PostgreSQL logs for errors

### Test Flow
1. [ ] User1: Navigate to `/friends/search`
2. [ ] User1: Search for User4
3. [ ] User1: Click "Add Friend"
4. [ ] Verify: Button changes to "Pending"
5. [ ] User4: Navigate to `/friends/requests`
6. [ ] User4: See User1's request
7. [ ] User4: Click "Accept"
8. [ ] User4: Navigate to `/friends`
9. [ ] Verify: User1 appears in list
10. [ ] User1: Navigate to `/friends`
11. [ ] Verify: User4 appears in list
12. [ ] User1: Click "Unfriend" on User4
13. [ ] User1: Confirm unfriend
14. [ ] Verify: User4 disappears from list
15. [ ] User4: Refresh `/friends`
16. [ ] Verify: User1 disappears from User4's list too
17. [ ] Both: Search for each other
18. [ ] Verify: Both see "Add Friend" button

---

## SQL Debug Queries

### Check all friendships for a user
```sql
SELECT 
  f.user_id,
  f.friend_id,
  f.status,
  p.full_name as friend_name
FROM friendships f
JOIN profiles p ON p.id = f.friend_id
WHERE f.user_id = 'YOUR_USER_ID';
```

### Check pending friend requests
```sql
SELECT 
  fr.*,
  sender.full_name as sender_name,
  receiver.full_name as receiver_name
FROM friend_requests fr
JOIN profiles sender ON sender.id = fr.sender_id
JOIN profiles receiver ON receiver.id = fr.receiver_id
WHERE fr.status = 'pending';
```

### Find orphaned friendships (only one direction)
```sql
SELECT f1.*
FROM friendships f1
LEFT JOIN friendships f2 
  ON f1.user_id = f2.friend_id AND f1.friend_id = f2.user_id
WHERE f2.id IS NULL;
```
