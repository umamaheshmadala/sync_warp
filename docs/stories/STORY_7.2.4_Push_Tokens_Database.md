# Story 7.2.4: Push Tokens Database Table ⚪ PLANNED

**Epic**: EPIC 7.2 - Supabase Mobile Security & Coordination  
**Story Points**: 2  
**Estimated Time**: 1-2 hours  
**Dependencies**: Story 7.2.3 complete (Push token hook created)

---

## 📋 Overview

**What**: Create a Supabase database table to store device push notification tokens with proper security policies.

**Why**: We need to store push tokens in the database so the backend can send notifications to specific user devices. Multiple devices per user need to be supported. Row Level Security (RLS) ensures users can only access their own tokens.

**User Value**: Enables push notifications to be sent to users across all their devices securely.

---

## 🎯 Acceptance Criteria

- [ ] `push_tokens` table created in Supabase
- [ ] Table schema matches requirements (user_id, token, platform, timestamps)
- [ ] RLS policies created and tested
- [ ] Indexes added for query performance
- [ ] Unique constraint prevents duplicate tokens
- [ ] Cascade delete when user is deleted
- [ ] Table tested with insert/update/delete operations
- [ ] Documentation created
- [ ] SQL script committed to git

---

## 📝 Implementation Steps

### Step 1: Create SQL Migration File

**Create new file**: `docs/sql/create_push_tokens_table.sql`

```sql
-- =====================================================
-- Push Tokens Table for Mobile Push Notifications
-- =====================================================
-- Purpose: Store device push tokens for sending notifications
-- Supports: iOS (APNs), Android (FCM), Web (FCM)
-- Security: Row Level Security (RLS) enabled
-- =====================================================

-- Create the table
CREATE TABLE IF NOT EXISTS push_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_user_platform UNIQUE (user_id, platform)
);

-- =====================================================
-- Indexes for Performance
-- =====================================================

-- Index for querying tokens by user (most common query)
CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id 
  ON push_tokens(user_id);

-- Index for looking up specific tokens
CREATE INDEX IF NOT EXISTS idx_push_tokens_token 
  ON push_tokens(token);

-- Index for platform-specific queries
CREATE INDEX IF NOT EXISTS idx_push_tokens_platform 
  ON push_tokens(platform);

-- Composite index for user + platform lookups
CREATE INDEX IF NOT EXISTS idx_push_tokens_user_platform 
  ON push_tokens(user_id, platform);

-- =====================================================
-- Row Level Security (RLS) Policies
-- =====================================================

-- Enable RLS on the table
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view only their own push tokens
CREATE POLICY "Users can view own push tokens"
  ON push_tokens
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own push tokens
CREATE POLICY "Users can insert own push tokens"
  ON push_tokens
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own push tokens
CREATE POLICY "Users can update own push tokens"
  ON push_tokens
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own push tokens
CREATE POLICY "Users can delete own push tokens"
  ON push_tokens
  FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- Automatic Timestamp Updates
-- =====================================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_push_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to call the function before updates
CREATE TRIGGER trigger_update_push_tokens_updated_at
  BEFORE UPDATE ON push_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_push_tokens_updated_at();

-- =====================================================
-- Table and Column Comments (Documentation)
-- =====================================================

COMMENT ON TABLE push_tokens IS 
  'Stores push notification tokens for user devices. Supports multiple devices per user.';

COMMENT ON COLUMN push_tokens.id IS 
  'Unique identifier for the push token record';

COMMENT ON COLUMN push_tokens.user_id IS 
  'Reference to the user who owns this device. Cascades on delete.';

COMMENT ON COLUMN push_tokens.token IS 
  'The actual push notification token from FCM (Android/Web) or APNs (iOS)';

COMMENT ON COLUMN push_tokens.platform IS 
  'Device platform: ios, android, or web';

COMMENT ON COLUMN push_tokens.created_at IS 
  'When the token was first registered';

COMMENT ON COLUMN push_tokens.updated_at IS 
  'Last time the token was updated. Auto-updated by trigger.';

COMMENT ON COLUMN push_tokens.last_used_at IS 
  'Last time this token was used to send a notification. Updated by backend.';
```

**Save the file.**

**Acceptance**: ✅ SQL migration file created

---

### Step 2: Execute SQL in Supabase Dashboard

**Steps**:
1. Open your Supabase project dashboard
2. Go to **SQL Editor** (left sidebar)
3. Click **New Query**
4. Copy the entire SQL script from `create_push_tokens_table.sql`
5. Paste into the SQL editor
6. Click **Run** button

**Expected Output**:
```
Success. No rows returned
```

**Acceptance**: ✅ SQL executed successfully

---

### Step 3: Verify Table Creation

**In Supabase Dashboard**:
1. Go to **Table Editor** (left sidebar)
2. Look for `push_tokens` table in the list
3. Click on the table to view its structure

**Verify Columns**:
- ✅ `id` (UUID, Primary Key)
- ✅ `user_id` (UUID, Foreign Key to auth.users)
- ✅ `token` (TEXT)
- ✅ `platform` (TEXT)
- ✅ `created_at` (TIMESTAMPTZ)
- ✅ `updated_at` (TIMESTAMPTZ)
- ✅ `last_used_at` (TIMESTAMPTZ)

**Acceptance**: ✅ Table structure verified

---

### Step 4: Verify RLS Policies

**In Supabase Dashboard**:
1. Go to **Authentication** → **Policies**
2. Find `push_tokens` table
3. Verify 4 policies exist:
   - Users can view own push tokens
   - Users can insert own push tokens
   - Users can update own push tokens
   - Users can delete own push tokens

**Test Policy** (optional):
```sql
-- Should only return current user's tokens
SELECT * FROM push_tokens;
```

**Acceptance**: ✅ RLS policies verified

---

### Step 5: Verify Indexes

**In Supabase Dashboard → SQL Editor**:

```sql
-- Query to list all indexes on push_tokens table
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'push_tokens'
ORDER BY indexname;
```

**Expected Indexes**:
- `push_tokens_pkey` (primary key)
- `idx_push_tokens_user_id`
- `idx_push_tokens_token`
- `idx_push_tokens_platform`
- `idx_push_tokens_user_platform`
- `unique_user_platform` (unique constraint)

**Acceptance**: ✅ Indexes verified

---

### Step 6: Test Table with Sample Data

**Insert Test Data** (in SQL Editor):

```sql
-- Test insert (use your actual user_id)
INSERT INTO push_tokens (user_id, token, platform)
VALUES (
  auth.uid(), 
  'test_token_123', 
  'android'
);

-- Verify insert
SELECT * FROM push_tokens;
```

**Expected Result**: 1 row inserted, visible in results

**Test Update**:
```sql
-- Update the token
UPDATE push_tokens 
SET token = 'test_token_456'
WHERE token = 'test_token_123';

-- Verify updated_at changed
SELECT * FROM push_tokens;
```

**Test Delete**:
```sql
-- Clean up test data
DELETE FROM push_tokens WHERE token = 'test_token_456';
```

**Acceptance**: ✅ CRUD operations work correctly

---

### Step 7: Test Unique Constraint

**Test Duplicate Prevention**:

```sql
-- Insert token for user + platform
INSERT INTO push_tokens (user_id, token, platform)
VALUES (auth.uid(), 'unique_test_1', 'ios');

-- Try to insert another token for same user + platform
-- This should fail due to unique_user_platform constraint
INSERT INTO push_tokens (user_id, token, platform)
VALUES (auth.uid(), 'unique_test_2', 'ios');
```

**Expected**: Second insert should fail with constraint violation

**Update Instead** (use upsert):
```sql
-- This should work (upsert pattern)
INSERT INTO push_tokens (user_id, token, platform)
VALUES (auth.uid(), 'unique_test_2', 'ios')
ON CONFLICT (user_id, platform) 
DO UPDATE SET 
  token = EXCLUDED.token,
  updated_at = NOW();

-- Verify only one record exists
SELECT * FROM push_tokens WHERE platform = 'ios';
```

**Clean up**:
```sql
DELETE FROM push_tokens WHERE token LIKE 'unique_test%';
```

**Acceptance**: ✅ Unique constraint working

---

### Step 8: Test Cascade Delete

**Test User Deletion Cascades**:

```sql
-- Note: This is a destructive test - only do on test users!
-- Insert a token for a user
INSERT INTO push_tokens (user_id, token, platform)
VALUES (auth.uid(), 'cascade_test', 'android');

-- If you delete the user, the token should also be deleted
-- (Don't actually run this unless on a test user)
-- DELETE FROM auth.users WHERE id = auth.uid();

-- Instead, just verify the foreign key exists:
SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'push_tokens'::regclass
  AND contype = 'f'; -- foreign key
```

**Expected**: Should show `ON DELETE CASCADE` in definition

**Acceptance**: ✅ Cascade delete configured

---

### Step 9: Create Table Documentation

**Create new file**: `docs/DATABASE_PUSH_TOKENS.md`

```markdown
# Push Tokens Database Table 📊

## Overview

The `push_tokens` table stores device push notification tokens for iOS, Android, and Web platforms.

---

## Schema

```sql
CREATE TABLE push_tokens (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_user_platform UNIQUE (user_id, platform)
);
```

---

## Columns

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key (auto-generated) |
| `user_id` | UUID | Foreign key to `auth.users` |
| `token` | TEXT | Push notification token (FCM/APNs) |
| `platform` | TEXT | Device platform: `ios`, `android`, or `web` |
| `created_at` | TIMESTAMPTZ | When token was first registered |
| `updated_at` | TIMESTAMPTZ | Last update time (auto-updated) |
| `last_used_at` | TIMESTAMPTZ | Last time token was used for push |

---

## Constraints

- **Primary Key**: `id`
- **Foreign Key**: `user_id` → `auth.users(id)` with `ON DELETE CASCADE`
- **Check**: `platform` must be `'ios'`, `'android'`, or `'web'`
- **Unique**: `(user_id, platform)` - one token per platform per user

---

## Indexes

- `idx_push_tokens_user_id` - Query by user
- `idx_push_tokens_token` - Lookup specific token
- `idx_push_tokens_platform` - Filter by platform
- `idx_push_tokens_user_platform` - Composite index

---

## Row Level Security (RLS)

All policies require users to be authenticated (`auth.uid()` must match `user_id`):

- **SELECT**: Users can only view their own tokens
- **INSERT**: Users can only insert tokens for themselves
- **UPDATE**: Users can only update their own tokens
- **DELETE**: Users can only delete their own tokens

---

## Usage Examples

### Insert/Upsert Token
```typescript
// Insert or update token for current user
const { error } = await supabase
  .from('push_tokens')
  .upsert({
    user_id: user.id,
    token: 'fcm_token_here',
    platform: 'android'
  }, {
    onConflict: 'user_id,platform'
  });
```

### Get User's Tokens
```typescript
// Get all tokens for current user
const { data, error } = await supabase
  .from('push_tokens')
  .select('*')
  .eq('user_id', user.id);
```

### Delete Token
```typescript
// Delete specific token
const { error } = await supabase
  .from('push_tokens')
  .delete()
  .eq('token', tokenToDelete);
```

### Get Tokens by Platform
```typescript
// Get all iOS tokens for user
const { data, error } = await supabase
  .from('push_tokens')
  .select('*')
  .eq('user_id', user.id)
  .eq('platform', 'ios');
```

---

## Backend Usage

Send notification to all user devices:

```typescript
// Get all tokens for user
const { data: tokens } = await supabase
  .from('push_tokens')
  .select('token, platform')
  .eq('user_id', userId);

// Send to each device
for (const tokenData of tokens) {
  if (tokenData.platform === 'android' || tokenData.platform === 'web') {
    await sendFCMNotification(tokenData.token, message);
  } else if (tokenData.platform === 'ios') {
    await sendAPNsNotification(tokenData.token, message);
  }
  
  // Update last_used_at
  await supabase
    .from('push_tokens')
    .update({ last_used_at: new Date().toISOString() })
    .eq('token', tokenData.token);
}
```

---

## Maintenance

### Clean Up Expired Tokens
```sql
-- Remove tokens not used in 90 days
DELETE FROM push_tokens
WHERE last_used_at < NOW() - INTERVAL '90 days';
```

### Find Users with Multiple Devices
```sql
SELECT 
  user_id, 
  COUNT(*) as device_count,
  ARRAY_AGG(platform) as platforms
FROM push_tokens
GROUP BY user_id
HAVING COUNT(*) > 1;
```

---

## Related

- **Story 7.2.3**: Push Token Registration Hook
- **Story 7.2.5**: Integrated Auth Flow (uses this table)
```

**Save as**: `docs/DATABASE_PUSH_TOKENS.md`

**Acceptance**: ✅ Documentation created

---

### Step 10: Commit Database Changes

**Terminal Commands**:
```powershell
git add .

git commit -m "feat: Create push_tokens database table - Story 7.2.4

- Created push_tokens table in Supabase
- Added columns: id, user_id, token, platform, timestamps
- Enabled Row Level Security (RLS) with 4 policies
- Added indexes for query performance
- Unique constraint: one token per user per platform
- Cascade delete when user is deleted
- Auto-update updated_at timestamp with trigger
- Tested CRUD operations and constraints
- Created comprehensive documentation

Changes:
- docs/sql/create_push_tokens_table.sql: Complete table setup
- docs/DATABASE_PUSH_TOKENS.md: Table documentation

Epic: 7.2 - Supabase Mobile Security
Story: 7.2.4 - Push Tokens Database Table

Features:
- Secure token storage in database
- RLS policies protect user data
- Supports multiple devices per user
- Optimized with indexes
- Automatic timestamp updates"

git push origin mobile-app-setup
```

**Acceptance**: ✅ All changes committed

---

## ✅ Verification Checklist

- [ ] SQL migration file created
- [ ] SQL executed in Supabase dashboard
- [ ] push_tokens table exists
- [ ] All 7 columns present and correct types
- [ ] RLS enabled on table
- [ ] 4 RLS policies created
- [ ] 5 indexes created
- [ ] Unique constraint working
- [ ] Foreign key with CASCADE DELETE
- [ ] Auto-update trigger working
- [ ] Tested INSERT operation
- [ ] Tested UPDATE operation
- [ ] Tested DELETE operation
- [ ] Tested UPSERT (conflict resolution)
- [ ] Documentation created
- [ ] SQL script committed to git

**All items checked?** ✅ Story 7.2.4 is COMPLETE

---

## 🚨 Troubleshooting

### Issue: "relation already exists"
**Solution**: Table already created. Safe to ignore or drop and recreate:
```sql
DROP TABLE IF EXISTS push_tokens CASCADE;
-- Then re-run creation script
```

### Issue: RLS policies not working
**Solution**: Verify RLS is enabled:
```sql
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;
```

### Issue: Can't insert tokens
**Solution**: Check RLS policies allow INSERT for authenticated users:
```sql
-- Should return true for authenticated user
SELECT auth.uid() IS NOT NULL;
```

### Issue: Unique constraint violations
**Solution**: Use upsert pattern:
```sql
INSERT INTO push_tokens (user_id, token, platform)
VALUES (?, ?, ?)
ON CONFLICT (user_id, platform) 
DO UPDATE SET token = EXCLUDED.token;
```

---

## 📚 Additional Notes

### What We Created
- ✅ Database table with proper schema
- ✅ Row Level Security policies
- ✅ Performance indexes
- ✅ Unique constraints
- ✅ Cascade delete
- ✅ Auto-updating timestamps

### Security Features
- **RLS**: Users can only access their own tokens
- **Constraints**: Prevents invalid data
- **Cascade Delete**: Tokens removed when user deleted
- **Encrypted**: Supabase encrypts data at rest

### What's Next
- **Story 7.2.5**: Sync push tokens from hook to this table (integrated auth flow)
- **Future**: Send notifications using stored tokens

---

## 🔗 Related Documentation

- [Supabase RLS](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL Constraints](https://www.postgresql.org/docs/current/ddl-constraints.html)
- [PostgreSQL Indexes](https://www.postgresql.org/docs/current/indexes.html)
- [EPIC 7.2 Overview](../epics/EPIC_7.2_Supabase_Mobile_Security.md)

---

**Story Status**: ⚪ PLANNED  
**Previous Story**: [STORY_7.2.3_Push_Token_Hook.md](./STORY_7.2.3_Push_Token_Hook.md)  
**Next Story**: [STORY_7.2.5_Integrated_Auth_Flow.md](./STORY_7.2.5_Integrated_Auth_Flow.md)  
**Epic Progress**: Story 4/5 complete (60% → 80%)
