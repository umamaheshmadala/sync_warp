# Story 5.5 Enhanced Sharing Limits - Manual Deployment Guide

**Date**: October 2, 2025  
**Status**: Ready for Deployment  
**Method**: Manual via Supabase Dashboard (Docker not available)

---

## 🚀 Deployment Steps

### Step 1: Access Supabase Dashboard

1. Go to https://supabase.com/dashboard
2. Sign in to your account
3. Select your project
4. Navigate to **SQL Editor** from the left sidebar

---

### Step 2: Copy Migration SQL

The migration file is located at:
```
supabase/migrations/20251002000000_create_sharing_limits_system.sql
```

**Full Path**: `C:\Users\umama\Documents\GitHub\sync_warp\supabase\migrations\20251002000000_create_sharing_limits_system.sql`

---

### Step 3: Execute Migration

1. In the SQL Editor, click **"New Query"**
2. Copy the entire contents of the migration file
3. Paste into the SQL Editor
4. Click **"Run"** or press `Ctrl+Enter`

**Expected Result**: 
- Green success message
- Output showing: "Story 5.5: Enhanced Sharing Limits migration completed successfully"
- Display of 4 configuration rows

---

### Step 4: Verify Deployment

Run these verification queries in SQL Editor:

#### **Query 1: Check Tables Created**
```sql
-- Check sharing_limits_config table
SELECT * FROM sharing_limits_config;
```

**Expected Result**: 4 rows
- `per_friend_daily`: 3
- `total_daily`: 20
- `driver_per_friend_daily`: 5
- `driver_total_daily`: 30

#### **Query 2: Check Functions Exist**
```sql
-- Check all sharing-related functions
SELECT 
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines 
WHERE routine_name LIKE '%sharing%'
ORDER BY routine_name;
```

**Expected Result**: 4 functions
- `can_share_to_friend`
- `get_sharing_limits`
- `get_sharing_stats_today`
- `log_coupon_share`

#### **Query 3: Check Indexes**
```sql
-- Check indexes on coupon_sharing_log
SELECT 
    indexname,
    tablename
FROM pg_indexes
WHERE tablename = 'coupon_sharing_log';
```

**Expected Result**: 4 indexes
- `idx_sharing_log_sender_day`
- `idx_sharing_log_sender_recipient_day`
- `idx_sharing_log_shared_at`
- `idx_sharing_log_recipient`

#### **Query 4: Check RLS Policies**
```sql
-- Check RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd
FROM pg_policies
WHERE tablename IN ('sharing_limits_config', 'coupon_sharing_log')
ORDER BY tablename, policyname;
```

**Expected Result**: 5 policies total
- **sharing_limits_config**:
  - "Sharing limits are publicly readable" (SELECT)
  - "Only admins can modify sharing limits" (ALL)
- **coupon_sharing_log**:
  - "Users can read their own sharing logs" (SELECT)
  - "Users can log shares as sender" (INSERT)
  - "Sharing logs are immutable" (UPDATE)
  - "Sharing logs cannot be deleted" (DELETE)

---

### Step 5: Test Functions

#### **Test 1: Get Sharing Limits (Regular User)**
```sql
-- Test with your user ID (replace 'YOUR-USER-ID' with actual ID)
SELECT get_sharing_limits('YOUR-USER-ID'::UUID, false);
```

**Expected Result**:
```json
{
  "per_friend_daily": 3,
  "total_daily": 20,
  "is_driver": false
}
```

#### **Test 2: Get Sharing Limits (Driver)**
```sql
-- Test Driver limits
SELECT get_sharing_limits('YOUR-USER-ID'::UUID, true);
```

**Expected Result**:
```json
{
  "per_friend_daily": 5,
  "total_daily": 30,
  "is_driver": true
}
```

#### **Test 3: Check Can Share (Fresh User)**
```sql
-- Test with two user IDs (both should exist in auth.users)
SELECT can_share_to_friend(
  'SENDER-USER-ID'::UUID,
  'RECIPIENT-USER-ID'::UUID,
  false
);
```

**Expected Result** (if no shares today):
```json
{
  "can_share": true,
  "reason": "Can share",
  "shares_to_friend_today": 0,
  "per_friend_limit": 3,
  "total_shares_today": 0,
  "total_daily_limit": 20,
  "remaining_to_friend": 3,
  "remaining_total": 20
}
```

#### **Test 4: Get Sharing Stats**
```sql
-- Get today's sharing stats for a user
SELECT get_sharing_stats_today('YOUR-USER-ID'::UUID);
```

**Expected Result** (if no shares today):
```json
{
  "total_shared_today": 0,
  "total_daily_limit": 20,
  "remaining_today": 20,
  "per_friend_limit": 3,
  "friends_shared_with": [],
  "is_driver": false
}
```

---

### Step 6: Test Sharing Log

#### **Manual Test Insert**
```sql
-- Test logging a share (replace IDs with real ones)
SELECT log_coupon_share(
  'SENDER-USER-ID'::UUID,
  'RECIPIENT-USER-ID'::UUID,
  'COUPON-ID'::UUID,
  false
);
```

**Expected Result**: UUID of the log entry

#### **Verify Log Entry**
```sql
-- Check the log
SELECT * FROM coupon_sharing_log 
WHERE sender_id = 'SENDER-USER-ID'::UUID
ORDER BY shared_at DESC
LIMIT 5;
```

#### **Test Stats After Share**
```sql
-- Check stats updated
SELECT get_sharing_stats_today('SENDER-USER-ID'::UUID);
```

**Expected Result**:
```json
{
  "total_shared_today": 1,
  "total_daily_limit": 20,
  "remaining_today": 19,
  "per_friend_limit": 3,
  "friends_shared_with": [{"recipient_id": "...", "count": 1}],
  "is_driver": false
}
```

---

## ✅ Deployment Checklist

- [ ] Step 1: Accessed Supabase Dashboard
- [ ] Step 2: Copied migration SQL file
- [ ] Step 3: Executed migration successfully
- [ ] Step 4: Verified tables created (4 rows in config)
- [ ] Step 4: Verified functions exist (4 functions)
- [ ] Step 4: Verified indexes created (4 indexes)
- [ ] Step 4: Verified RLS policies (5 policies)
- [ ] Step 5: Tested get_sharing_limits() - regular user
- [ ] Step 5: Tested get_sharing_limits() - Driver
- [ ] Step 5: Tested can_share_to_friend()
- [ ] Step 5: Tested get_sharing_stats_today()
- [ ] Step 6: Tested log_coupon_share()
- [ ] Step 6: Verified log entry created
- [ ] Step 6: Verified stats updated after share

---

## 🐛 Troubleshooting

### Issue: "function already exists"
**Solution**: Functions may already be created. Run:
```sql
DROP FUNCTION IF EXISTS get_sharing_limits(UUID, BOOLEAN);
DROP FUNCTION IF EXISTS can_share_to_friend(UUID, UUID, BOOLEAN);
DROP FUNCTION IF EXISTS get_sharing_stats_today(UUID);
DROP FUNCTION IF EXISTS log_coupon_share(UUID, UUID, UUID, BOOLEAN);
```
Then re-run the migration.

### Issue: "table already exists"
**Solution**: Tables may already be created. Run:
```sql
DROP TABLE IF EXISTS coupon_sharing_log CASCADE;
DROP TABLE IF EXISTS sharing_limits_config CASCADE;
DROP VIEW IF EXISTS sharing_analytics CASCADE;
```
Then re-run the migration.

### Issue: "relation does not exist"
**Solution**: Make sure you're in the correct schema. Verify:
```sql
SELECT current_schema();
```
Should return "public".

### Issue: Can't find user IDs for testing
**Solution**: Get some user IDs:
```sql
SELECT id, email FROM auth.users LIMIT 5;
```

### Issue: Can't find coupon IDs for testing
**Solution**: Get some coupon IDs:
```sql
SELECT id, name FROM coupons LIMIT 5;
```

---

## 🎯 Post-Deployment Tasks

### Immediate:
1. ✅ Update application code to use new functions
2. ✅ Deploy frontend with new components
3. ✅ Test end-to-end sharing flow

### Optional (Post-MVP):
1. **Implement Driver Detection** - Update `isUserDriver()` function
2. **Admin UI** - Build configuration interface for limits
3. **Analytics Dashboard** - Visualize sharing patterns
4. **Monitoring** - Set up alerts for limit violations

---

## 📊 Expected Database State After Deployment

### Tables (2 new):
- `sharing_limits_config` - 4 rows (limit configurations)
- `coupon_sharing_log` - 0 rows initially (fills as users share)

### Functions (4 new):
- `get_sharing_limits(user_id, is_driver)`
- `can_share_to_friend(sender_id, recipient_id, is_driver)`
- `get_sharing_stats_today(user_id)`
- `log_coupon_share(sender_id, recipient_id, coupon_id, is_driver)`

### Views (1 new):
- `sharing_analytics` - Aggregated sharing stats

### Indexes (4 new):
- On `coupon_sharing_log` for query performance

### RLS Policies (5 new):
- Protect sensitive data
- Allow public reading of limits
- Enforce user ownership

---

## 🎉 Success Criteria

Deployment is successful when:
- ✅ All verification queries return expected results
- ✅ All test functions execute without errors
- ✅ No error messages in Supabase Dashboard
- ✅ Application can call functions via Supabase client
- ✅ Limits are enforced in the UI

---

## 📞 Support

If you encounter issues:
1. Check the Supabase Dashboard logs
2. Review the troubleshooting section above
3. Verify all prerequisites are met
4. Check the migration SQL for syntax errors

---

## 📝 Notes

- Migration is idempotent (safe to run multiple times with IF NOT EXISTS)
- Default limits can be changed via `sharing_limits_config` table
- Driver detection logic is stubbed (returns false for all users)
- Timezone handling is server-side (CURRENT_DATE)
- All logs are immutable (cannot be updated/deleted)

---

**Deployment Guide Version**: 1.0  
**Last Updated**: October 2, 2025  
**Status**: Ready for execution
