# Current Friends Schema Audit - January 17, 2025

## Executive Summary

This document provides a complete audit of the existing friends system schema prior to migration to the new Facebook-level bidirectional friendship structure.

**Audit Date:** January 17, 2025  
**Database:** sync_warp (ysxmgbblljoyebvugrfo)  
**Region:** us-east-2  
**Total Friends Tables:** 6

## Tables Overview

### 1. friendships (Unidirectional)

**Purpose:** Primary table storing unidirectional friendships (user1 → user2)

**Row Count:** 0 (empty table)

**Columns:**
- `id` (uuid, PRIMARY KEY) - DEFAULT gen_random_uuid()
- `user1_id` (uuid, NOT NULL) - User who initiated friendship
- `user2_id` (uuid, NOT NULL) - Friend user
- `created_at` (timestamptz, nullable) - DEFAULT now()

**Indexes:**
- `friendships_pkey` (UNIQUE) - ON id
- `friendships_unique_pair` (UNIQUE) - ON (user1_id, user2_id)
- `idx_friendships_user1` - ON user1_id
- `idx_friendships_user2` - ON user2_id
- `idx_friendships_created_at` - ON created_at DESC

**RLS Policies:**
- `Users can view their friendships` (SELECT) - WHERE (user1_id = auth.uid() OR user2_id = auth.uid())
- `Users can create friendships` (INSERT) - No qualification
- `Users can delete their friendships` (DELETE) - WHERE (user1_id = auth.uid() OR user2_id = auth.uid())

**Foreign Keys:** None documented

**Issues Identified:**
- ❌ **Unidirectional design** - Requires two rows for bidirectional friendships
- ❌ **No status column** - Cannot track unfriended relationships
- ❌ **No metadata column** - Cannot store friendship context
- ❌ **No privacy settings** - Cannot implement privacy controls

---

### 2. friend_requests

**Purpose:** Stores pending/accepted/rejected friend requests

**Row Count:** 0 (empty table)

**Columns:**
- `id` (uuid, PRIMARY KEY) - DEFAULT gen_random_uuid()
- `requester_id` (uuid, NOT NULL) - User sending request
- `receiver_id` (uuid, NOT NULL) - User receiving request
- `status` (varchar, NOT NULL) - DEFAULT 'pending' (pending/accepted/rejected)
- `created_at` (timestamptz, nullable) - DEFAULT now()
- `updated_at` (timestamptz, nullable) - DEFAULT now()

**Indexes:**
- `friend_requests_pkey` (UNIQUE) - ON id
- `friend_requests_unique_pair` (UNIQUE) - ON (requester_id, receiver_id)
- `idx_friend_requests_requester` - ON requester_id
- `idx_friend_requests_receiver` - ON receiver_id WHERE status = 'pending'
- `idx_friend_requests_status` - ON status

**RLS Policies:**
- `Users can view friend requests involving them` (SELECT) - WHERE (requester_id = auth.uid() OR receiver_id = auth.uid())
- `Users can create friend requests` (INSERT) - No qualification
- `Users can update friend requests they received` (UPDATE) - WHERE receiver_id = auth.uid()

**Issues Identified:**
- ❌ **No auto-expiry** - Pending requests never expire
- ❌ **No expires_at column** - Cannot implement 30-day auto-cleanup

---

### 3. friend_connections (Bidirectional)

**Purpose:** Alternative bidirectional friendship table (newer design)

**Row Count:** 1 (active data)

**Columns:**
- `id` (uuid, PRIMARY KEY) - DEFAULT gen_random_uuid()
- `user_a_id` (uuid, NOT NULL) - First user in connection
- `user_b_id` (uuid, NOT NULL) - Second user in connection
- `status` (text, NOT NULL) - DEFAULT 'pending' (pending/accepted/rejected)
- `requester_id` (uuid, NOT NULL) - User who initiated connection
- `created_at` (timestamptz, nullable) - DEFAULT now()
- `updated_at` (timestamptz, nullable) - DEFAULT now()

**Indexes:**
- `friend_connections_pkey` (UNIQUE) - ON id
- `friend_connections_unique_bidirectional` (UNIQUE) - ON (LEAST(user_a_id, user_b_id), GREATEST(user_a_id, user_b_id))
- `idx_friend_connections_user_a` - ON user_a_id
- `idx_friend_connections_user_b` - ON user_b_id
- `idx_friend_connections_requester` - ON requester_id
- `idx_friend_connections_status` - ON status

**RLS Policies:**
- `Users can view their connections` (SELECT) - WHERE (user_a_id = auth.uid() OR user_b_id = auth.uid())
- `Users can create friend requests` (INSERT) - No qualification
- `Users can update their connections` (UPDATE) - WHERE (user_a_id = auth.uid() OR user_b_id = auth.uid())

**Foreign Keys:**
- `friend_connections_user_a_id_fkey` -> auth.users.id
- `friend_connections_user_b_id_fkey` -> auth.users.id
- `friend_connections_requester_id_fkey` -> auth.users.id

**Issues Identified:**
- ✅ **Good bidirectional design** - Uses LEAST/GREATEST pattern
- ❌ **No unfriended status** - Cannot track unfriended relationships
- ❌ **No metadata column** - Cannot store friendship context

---

### 4. friend_activities

**Purpose:** Tracks friend activities for feed/timeline

**Row Count:** 0 (empty table)

**Columns:**
- `id` (uuid, PRIMARY KEY) - DEFAULT gen_random_uuid()
- `user_id` (uuid, NOT NULL) - User performing activity
- `type` (varchar, NOT NULL) - Activity type (deal_shared, coupon_shared, etc.)
- `deal_id` (uuid, nullable) - Related deal ID
- `deal_title` (varchar, nullable) - Deal title for display
- `message` (text, nullable) - Activity message
- `activity_data` (jsonb, nullable) - Additional metadata
- `created_at` (timestamptz, nullable) - DEFAULT now()

**Indexes:**
- `friend_activities_pkey` (UNIQUE) - ON id
- `idx_friend_activities_user` - ON user_id
- `idx_friend_activities_type` - ON type
- `idx_friend_activities_created_at` - ON created_at DESC

**RLS Policies:**
- `Users can view activities of their friends` (SELECT) - Complex query joining friendships table
- `Users can create their own activities` (INSERT) - No qualification

**Issues Identified:**
- ✅ **Good design** - Suitable for activity feed
- ⚠️ **Depends on friendships table** - RLS policy references unidirectional friendships table

---

### 5. pending_friend_requests (View/Table?)

**Purpose:** Appears to be a materialized view or denormalized table

**Row Count:** 0 (empty table)

**Columns:**
- `id` (uuid, nullable)
- `requester_id` (uuid, nullable)
- `created_at` (timestamptz, nullable)
- `requester_name` (text, nullable)
- `requester_avatar` (text, nullable)

**Indexes:** None

**RLS Policies:** None

**Issues Identified:**
- ⚠️ **Purpose unclear** - May be denormalized view for performance
- ⚠️ **No primary key** - All columns nullable

---

### 6. user_friends (View/Table?)

**Purpose:** Appears to be a materialized view or denormalized table

**Row Count:** 0 (empty table)

**Columns:**
- `id` (uuid, nullable)
- `friend_id` (uuid, nullable)
- `created_at` (timestamptz, nullable)

**Indexes:** None

**RLS Policies:** None

**Issues Identified:**
- ⚠️ **Purpose unclear** - May be denormalized view for performance
- ⚠️ **No primary key** - All columns nullable

---

## Code Dependencies

Based on project structure analysis, the following files likely use the friends schema:

### Services:
- `src/services/friendService.ts` - Friend CRUD operations
- `src/services/messageService.ts` - May reference friends for messaging

### Hooks:
- `src/hooks/useFriends.ts` - React hook for friends data
- `src/hooks/useFriendRequests.ts` - Friend request management

### Components:
- `src/components/ContactsSidebar.tsx` - Friends list display
- `src/components/ContactsSidebar_v2.tsx` - Updated friends UI
- `src/components/ContactsSidebar_v3.tsx` - Latest friends UI
- `src/screens/messaging/MessageThreadScreen.tsx` - Friend-based messaging

---

## Migration Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| **Data consolidation from 3 tables** | 🔴 Critical | 🟡 Medium | Create comprehensive backup strategy, test on branch database |
| **Unidirectional → Bidirectional conversion** | 🔴 Critical | 🟡 Medium | Preserve both friendships table entries by consolidating into friend_connections |
| **Existing queries break due to schema changes** | 🔴 Critical | 🔴 High | Add backward-compatible views, update all queries to use friend_connections |
| **RLS policies fail after migration** | 🔴 Critical | 🟡 Medium | Test RLS policies on branch database with real user scenarios |
| **Index rebuild causes downtime** | 🟡 Medium | 🔴 High | Use CONCURRENTLY for index creation, run during low-traffic hours |
| **Foreign key violations** | 🟡 Medium | 🟢 Low | Validate all user_ids exist in auth.users before migration |
| **Activity feed breaks** | 🟡 Medium | 🟡 Medium | Update friend_activities RLS policy to reference new table structure |

---

## Recommended Migration Strategy

### Phase 1: Backup & Audit (Story 9.1.1)
1. ✅ **Audit complete** - This document
2. Create backup tables with `_legacy` suffix
3. Document row counts (all tables currently empty except friend_connections: 1 row)

### Phase 2: Consolidate to Bidirectional (Story 9.1.2)
1. **Primary table:** Use `friend_connections` as base (already bidirectional)
2. **Migrate data from:**
   - `friendships` → `friend_connections` (convert unidirectional to bidirectional)
   - `friend_requests` remains separate for pending requests
3. **Add new columns:**
   - `status` column: 'active' | 'unfriended' (extend current status enum)
   - `unfriended_at` (timestamptz)
   - `metadata` (jsonb) for friendship context

### Phase 3: Deprecate Old Tables (Story 9.1.7)
1. Create backward-compatible views:
   - `friendships` VIEW → SELECT from friend_connections
   - Ensures existing code continues to work
2. Update all queries to use new table
3. Drop views after code migration

### Phase 4: Clean Up (Post-Migration)
1. Drop `_legacy` backup tables after 30 days
2. Drop deprecated views after all code updated
3. Drop `pending_friend_requests` and `user_friends` if confirmed unused

---

## Rollback Plan

If migration fails:

```sql
-- 1. Drop new tables
DROP TABLE IF EXISTS friend_connections CASCADE;

-- 2. Restore from backup
ALTER TABLE friendships_legacy RENAME TO friendships;
ALTER TABLE friend_requests_legacy RENAME TO friend_requests;
ALTER TABLE friend_activities_legacy RENAME TO friend_activities;

-- 3. Restore indexes (run create index scripts)
-- 4. Restore RLS policies (run RLS scripts)
-- 5. Verify data integrity
SELECT COUNT(*) FROM friendships;
SELECT COUNT(*) FROM friend_requests;
```

---

## Next Steps

1. ✅ **AC1 Complete:** Current schema documented
2. ⏳ **AC2:** Create migration risk assessment (above)
3. ⏳ **AC3:** Create migration script: `supabase/migrations/20250117_audit_friends_schema.sql`
4. ⏳ **AC4:** Test migration on branch database
5. ⏳ **AC5:** Validate zero data loss
6. ⏳ **AC6:** Update RLS policies and test

---

## Appendix A: Full Schema DDL

### friendships
```sql
CREATE TABLE friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id UUID NOT NULL,
  user2_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user1_id, user2_id)
);

CREATE INDEX idx_friendships_user1 ON friendships(user1_id);
CREATE INDEX idx_friendships_user2 ON friendships(user2_id);
CREATE INDEX idx_friendships_created_at ON friendships(created_at DESC);
```

### friend_connections (Recommended Primary Table)
```sql
CREATE TABLE friend_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a_id UUID NOT NULL REFERENCES auth.users(id),
  user_b_id UUID NOT NULL REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'rejected')),
  requester_id UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(LEAST(user_a_id, user_b_id), GREATEST(user_a_id, user_b_id))
);
```

---

**Document Status:** ✅ Complete  
**Next Story:** [STORY 9.1.2 - Implement Bidirectional Friendships Table](../stories/STORY_9.1.2_Bidirectional_Friendships_Table.md)
