# 📋 STORY 9.1.1: Audit & Migrate Existing Friends Schema

**Parent Epic:** [EPIC 9.1 - Friends Foundation Database](../epics/EPIC_9.1_Friends_Foundation_Database.md)  
**Story Owner:** Backend Engineering / Database Admin  
**Estimated Effort:** 3 days  
**Priority:** 🔴 Critical  
**Status:** 📋 To Do

---

## 🎯 **Story Goal**

Audit the current friends schema (`friendships`, `friend_requests`, `friend_activities`) and create a safe migration path to the new Facebook-level bidirectional friendship structure **with zero data loss**.

---

## ✅ **Acceptance Criteria**

- [ ] **AC1:** Current schema fully documented in `docs/schema/friends_current_state.md`
  - All tables, columns, constraints, indexes documented
  - Current data volumes recorded (row counts)
  - Existing RLS policies documented
  
- [ ] **AC2:** Data migration risks identified and documented
  - Breaking changes list with impact assessment
  - Data loss scenarios identified and mitigation plans created
  - Rollback strategy documented
  
- [ ] **AC3:** Migration script created: `supabase/migrations/20250116_audit_friends_schema.sql`
  - Backs up existing data to `_legacy` tables
  - Preserves all existing friend relationships
  - Runs data integrity checks (before/after row counts match)
  
- [ ] **AC4:** New schema columns added without breaking existing code
  - `status` column: DEFAULT 'active' for backward compatibility
  - `privacy_settings` column: DEFAULT '{}' JSONB
  - All existing queries continue to work
  
- [ ] **AC5:** Indexes created for performance optimization
  - Index on `user_id` for O(1) friend lookups
  - Index on `friend_id` for reverse lookups
  - Composite index on `(user_id, status)` for active friends queries
  
- [ ] **AC6:** Zero data loss confirmed
  - Pre-migration row count = Post-migration row count
  - Sample data spot-checks pass (10 random user friendships)
  - Automated test script validates data integrity

---

## 🔧 **Implementation Steps**

### **Step 1: Analyze Existing Schema** (4 hours)

**MCP Command:**
```bash
# List all friends-related tables
warp mcp run supabase "list_tables schemas=['public']"

# Get detailed schema for each table
warp mcp run supabase "execute_sql 
  SELECT column_name, data_type, is_nullable, column_default 
  FROM information_schema.columns 
  WHERE table_name IN ('friendships', 'friend_requests', 'friend_activities')
  ORDER BY table_name, ordinal_position"

# Get row counts
warp mcp run supabase "execute_sql 
  SELECT 
    'friendships' AS table_name, COUNT(*) AS row_count FROM friendships
  UNION ALL
  SELECT 'friend_requests', COUNT(*) FROM friend_requests
  UNION ALL
  SELECT 'friend_activities', COUNT(*) FROM friend_activities"

# Get existing indexes
warp mcp run supabase "execute_sql 
  SELECT tablename, indexname, indexdef 
  FROM pg_indexes 
  WHERE tablename LIKE '%friend%'"

# Get existing RLS policies
warp mcp run supabase "execute_sql 
  SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
  FROM pg_policies 
  WHERE tablename LIKE '%friend%'"
```

**MCP Context7 Analysis:**
```bash
# Find all code using current friends schema
warp mcp run context7 "find usage of friendships table in codebase"
warp mcp run context7 "find all imports of friendService.ts"
warp mcp run context7 "analyze src/services/friendService.ts for database queries"
```

**Output:** Document findings in `docs/schema/friends_current_state.md`

**Template:**
```markdown
# Current Friends Schema Audit - January 16, 2025

## Tables Overview

### 1. friendships
- **Row Count:** [X]
- **Columns:** [list columns]
- **Indexes:** [list indexes]
- **RLS Policies:** [list policies]
- **Foreign Keys:** [list FKs]

### 2. friend_requests
- ...

## Code Dependencies
- Files using friendships: [list]
- Services: friendService.ts
- Components: ContactsSidebar*.tsx
- Hooks: useFriends.ts

## Migration Risks
1. **Risk:** Breaking change XYZ
   **Impact:** High
   **Mitigation:** ABC
```

---

### **Step 2: Identify Migration Risks** (2 hours)

**Risk Assessment:**

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| **Unidirectional → Bidirectional conversion loses data** | 🔴 Critical | 🟡 Medium | Create TWO rows per friendship during migration |
| **Existing queries break due to schema changes** | 🔴 Critical | 🔴 High | Add backward-compatible views |
| **RLS policies fail after migration** | 🔴 Critical | 🟡 Medium | Test RLS policies on branch database |
| **Index rebuild causes downtime** | 🟡 Medium | 🔴 High | Use CONCURRENTLY for index creation |
| **Foreign key violations** | 🟡 Medium | 🟢 Low | Validate data before migration |

**Rollback Strategy:**
```sql
-- If migration fails, restore from backup
DROP TABLE IF EXISTS friendships CASCADE;
ALTER TABLE friendships_legacy RENAME TO friendships;
-- Restore indexes and RLS policies
```

---

### **Step 3: Create Backup Migration Script** (4 hours)

**File:** `supabase/migrations/20250116_audit_friends_schema.sql`

```sql
-- ============================================
-- MIGRATION: Audit & Backup Friends Schema
-- Date: 2025-01-16
-- Story: 9.1.1
-- ============================================

-- Step 1: Backup existing tables
CREATE TABLE IF NOT EXISTS friendships_legacy AS SELECT * FROM friendships;
CREATE TABLE IF NOT EXISTS friend_requests_legacy AS SELECT * FROM friend_requests;
CREATE TABLE IF NOT EXISTS friend_activities_legacy AS SELECT * FROM friend_activities;

-- Step 2: Pre-migration data integrity check
DO $$
DECLARE
  pre_friendship_count INTEGER;
  pre_request_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO pre_friendship_count FROM friendships;
  SELECT COUNT(*) INTO pre_request_count FROM friend_requests;
  
  RAISE NOTICE 'Pre-migration counts:';
  RAISE NOTICE '  friendships: %', pre_friendship_count;
  RAISE NOTICE '  friend_requests: %', pre_request_count;
  
  -- Store counts for post-migration validation
  CREATE TEMP TABLE migration_validation (
    table_name TEXT,
    pre_count INTEGER,
    post_count INTEGER
  );
  
  INSERT INTO migration_validation (table_name, pre_count)
  VALUES 
    ('friendships', pre_friendship_count),
    ('friend_requests', pre_request_count);
END $$;

-- Step 3: Add new columns to existing tables (backward compatible)
ALTER TABLE friendships 
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' 
    CHECK (status IN ('active', 'unfriended')),
  ADD COLUMN IF NOT EXISTS unfriended_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

ALTER TABLE friend_requests
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ 
    DEFAULT (NOW() + INTERVAL '30 days');

-- Step 4: Add constraint to prevent self-friendship
ALTER TABLE friendships
  DROP CONSTRAINT IF EXISTS friendships_different_users;

ALTER TABLE friendships
  ADD CONSTRAINT friendships_different_users 
  CHECK (user_id != friend_id);

-- Step 5: Create indexes for performance (CONCURRENTLY to avoid downtime)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_friendships_user_active 
  ON friendships(user_id) WHERE status = 'active';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_friendships_friend_active 
  ON friendships(friend_id) WHERE status = 'active';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_friend_requests_receiver_pending
  ON friend_requests(receiver_id) WHERE status = 'pending';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_friend_requests_expires_at
  ON friend_requests(expires_at) WHERE status = 'pending';

-- Step 6: Post-migration validation
DO $$
DECLARE
  post_friendship_count INTEGER;
  post_request_count INTEGER;
  pre_friendship_count INTEGER;
  pre_request_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO post_friendship_count FROM friendships;
  SELECT COUNT(*) INTO post_request_count FROM friend_requests;
  
  SELECT pre_count INTO pre_friendship_count 
  FROM migration_validation WHERE table_name = 'friendships';
  
  SELECT pre_count INTO pre_request_count 
  FROM migration_validation WHERE table_name = 'friend_requests';
  
  RAISE NOTICE 'Post-migration counts:';
  RAISE NOTICE '  friendships: % (pre: %)', post_friendship_count, pre_friendship_count;
  RAISE NOTICE '  friend_requests: % (pre: %)', post_request_count, pre_request_count;
  
  -- Validate counts match
  IF post_friendship_count != pre_friendship_count THEN
    RAISE EXCEPTION 'Data loss detected in friendships! Pre: %, Post: %', 
      pre_friendship_count, post_friendship_count;
  END IF;
  
  IF post_request_count != pre_request_count THEN
    RAISE EXCEPTION 'Data loss detected in friend_requests! Pre: %, Post: %', 
      pre_request_count, post_request_count;
  END IF;
  
  RAISE NOTICE '✅ Migration validation passed: Zero data loss confirmed';
END $$;

-- Step 7: Create audit log
CREATE TABLE IF NOT EXISTS migration_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  migration_name TEXT NOT NULL,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT NOT NULL,
  details JSONB
);

INSERT INTO migration_audit (migration_name, status, details)
VALUES (
  '20250116_audit_friends_schema',
  'completed',
  jsonb_build_object(
    'tables_modified', ARRAY['friendships', 'friend_requests'],
    'indexes_created', 4,
    'data_loss', false
  )
);
```

**MCP Command to Apply:**
```bash
# Create branch database for testing
warp mcp run supabase "create_branch epic-9-1-friends"

# Apply migration on branch
warp mcp run supabase "apply_migration 20250116_audit_friends_schema"

# Validate migration
warp mcp run supabase "execute_sql SELECT * FROM migration_audit ORDER BY executed_at DESC LIMIT 1"
```

---

### **Step 4: Test Migration** (4 hours)

**Test Plan:**

1. **Data Integrity Test:**
```bash
# Compare row counts before/after
warp mcp run supabase "execute_sql 
  SELECT 
    'friendships' AS table, 
    (SELECT COUNT(*) FROM friendships) AS current_count,
    (SELECT COUNT(*) FROM friendships_legacy) AS backup_count"
```

2. **Spot Check Test:**
```bash
# Verify 10 random user friendships migrated correctly
warp mcp run supabase "execute_sql 
  SELECT f.*, fl.*
  FROM friendships f
  JOIN friendships_legacy fl ON f.id = fl.id
  ORDER BY RANDOM()
  LIMIT 10"
```

3. **Index Performance Test:**
```bash
# Verify indexes are being used (no sequential scans)
warp mcp run supabase "execute_sql 
  EXPLAIN ANALYZE 
  SELECT * FROM friendships 
  WHERE user_id = (SELECT id FROM auth.users LIMIT 1) 
    AND status = 'active'"
```

4. **RLS Policy Test:**
```bash
# Test as different users
warp mcp run supabase "execute_sql 
  SET request.jwt.claim.sub = '...';
  SELECT * FROM friendships WHERE user_id = auth.uid()"
```

---

### **Step 5: Document & Communicate** (2 hours)

**Create Migration Guide:**

File: `docs/migration/friends_schema_migration_guide.md`

```markdown
# Friends Schema Migration Guide

## Pre-Migration Checklist
- [ ] Backup production database
- [ ] Test migration on staging/branch database
- [ ] Notify team of migration window
- [ ] Prepare rollback script

## Migration Steps
1. Run: `supabase migration up`
2. Monitor: Check logs for errors
3. Validate: Run integrity checks
4. Confirm: Zero data loss

## Rollback Plan
If migration fails:
1. Stop application
2. Run rollback script
3. Restore from backup
4. Investigate failure
```

**Communicate to Team:**
```bash
# Create GitHub issue for tracking
warp mcp run github "create_issue 
  title='[Story 9.1.1] Friends Schema Migration - Jan 16' 
  body='Migration window: [DATE]. Expected downtime: 0 minutes. Rollback plan attached.'"
```

---

## 🧪 **Testing & Validation**

### **Unit Tests:**

None required (database migration only).

### **Integration Tests:**

**Test Script:** `tests/migrations/test_friends_audit_migration.sql`

```sql
-- Test: Migration completes without errors
BEGIN;
  \i supabase/migrations/20250116_audit_friends_schema.sql
  SELECT * FROM migration_audit WHERE migration_name = '20250116_audit_friends_schema';
ROLLBACK;

-- Test: Data integrity preserved
SELECT COUNT(*) AS friendship_count FROM friendships;
SELECT COUNT(*) AS backup_count FROM friendships_legacy;
-- Counts should match

-- Test: New columns exist with defaults
SELECT status, unfriended_at, metadata FROM friendships LIMIT 1;

-- Test: Indexes created
SELECT indexname FROM pg_indexes WHERE tablename = 'friendships' AND indexname LIKE 'idx_%';
```

---

## 🚀 **Frontend Integration**

**No frontend changes required for this story** - this is a database-only migration that maintains backward compatibility.

**Frontend Testing Plan:**
After migration, verify existing friends features still work:

1. Open Friends List page
2. Verify friends display correctly
3. Send a friend request
4. Accept a friend request
5. Check no errors in console

**Files to Monitor:**
- `src/services/friendService.ts` - Should work unchanged
- `src/hooks/useFriends.ts` - Should work unchanged
- `src/components/ContactsSidebar*.tsx` - Should work unchanged

---

## 📦 **Deliverables**

- [ ] `docs/schema/friends_current_state.md` - Current schema audit document
- [ ] `supabase/migrations/20250116_audit_friends_schema.sql` - Migration script
- [ ] `docs/migration/friends_schema_migration_guide.md` - Migration runbook
- [ ] `tests/migrations/test_friends_audit_migration.sql` - Test script
- [ ] GitHub issue created for migration tracking

---

## 🎯 **MCP Integration Summary**

| MCP Server | Usage | Commands |
|------------|-------|----------|
| 🛢 **Supabase** | Heavy | `list_tables`, `execute_sql`, `apply_migration`, `create_branch` |
| 🧠 **Context7** | Medium | `find usage`, `analyze` |
| 🐙 **GitHub** | Light | `create_issue` |

---

## ✅ **Definition of Done**

- [ ] Migration script created and tested on branch database
- [ ] Zero data loss confirmed (pre/post counts match)
- [ ] All indexes created successfully
- [ ] RLS policies tested and working
- [ ] Documentation complete
- [ ] Team notified via GitHub issue
- [ ] Code reviewed and approved
- [ ] Ready to merge to main branch

---

**Next Story:** [STORY 9.1.2 - Implement Bidirectional Friendships Table](./STORY_9.1.2_Bidirectional_Friendships_Table.md)
