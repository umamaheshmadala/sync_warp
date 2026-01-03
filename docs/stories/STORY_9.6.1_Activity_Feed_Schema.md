# Story 9.6.1: Activity Feed Database Schema

**Epic:** [EPIC 9.6: Friend Activity Feed & Notifications](../epics/EPIC_9.6_Friend_Activity_Notifications.md)  
**Priority:** 🟡 Medium  
**Estimated Time:** 1 day  
**MCP Usage:** 🛢 Supabase MCP (Heavy)

---

## 📋 Story Description

Create the database schema and infrastructure for tracking friend activities. This includes tables, triggers, RLS policies, and RPC functions to log and retrieve friend activities while respecting privacy settings.

---

## ✅ Acceptance Criteria

### Database Schema
- [ ] Create `friend_activities` table with proper columns and constraints
- [ ] Add indexes for performance (user_id, created_at)
- [ ] Implement RLS policies to show only friends' activities
- [ ] Support activity types: friend_added, friend_joined, deal_liked, deal_saved, deal_shared

### Triggers
- [ ] Auto-log when users become friends
- [ ] Auto-log when users like/save/share deals
- [ ] Respect privacy settings (don't log if user has private profile)

### RPC Functions
- [ ] `get_friend_activities(limit, offset)` - Paginated activity feed
- [ ] `get_activity_count()` - Count of unread activities
- [ ] Privacy filtering built into queries

### Testing
- [ ] Verify activities are logged correctly
- [ ] Test RLS policies (users only see friends' activities)
- [ ] Test pagination
- [ ] Verify privacy settings are respected

---

## 🛢 Database Migration

### File: `supabase/migrations/20250124_friend_activities_schema.sql`

```sql
-- Migration: 20250124_friend_activities_schema.sql
-- Create friend activities tracking system

-- Create friend_activities table
CREATE TABLE IF NOT EXISTS friend_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN (
    'friend_added',
    'friend_joined',
    'deal_liked',
    'deal_saved',
    'deal_shared'
  )),
  related_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  related_deal_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure we don't log duplicate activities
  UNIQUE(user_id, activity_type, related_user_id, related_deal_id, created_at)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_friend_activities_user_id 
ON friend_activities(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_friend_activities_created_at 
ON friend_activities(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_friend_activities_type 
ON friend_activities(activity_type);

-- Enable RLS
ALTER TABLE friend_activities ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see activities from their friends
CREATE POLICY "Users see friends' activities"
ON friend_activities FOR SELECT
USING (
  user_id IN (
    SELECT friend_id FROM friendships 
    WHERE user_id = auth.uid() AND status = 'active'
  )
  OR user_id = auth.uid() -- Users can see their own activities
);

-- RLS Policy: System can insert activities
CREATE POLICY "System can insert activities"
ON friend_activities FOR INSERT
WITH CHECK (true);

-- Function: Check if user's activity should be logged (respect privacy)
CREATE OR REPLACE FUNCTION should_log_activity(target_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  search_visible BOOLEAN;
BEGIN
  -- Check if user has search visibility enabled
  SELECT COALESCE(privacy_settings->>'search_visibility', 'true')::boolean
  INTO search_visible
  FROM profiles
  WHERE id = target_user_id;
  
  RETURN COALESCE(search_visible, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Log when users become friends
CREATE OR REPLACE FUNCTION log_friend_added()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log when friendship becomes active
  IF NEW.status = 'active' AND (OLD.status IS NULL OR OLD.status != 'active') THEN
    -- Check privacy settings before logging
    IF should_log_activity(NEW.user_id) THEN
      INSERT INTO friend_activities (user_id, activity_type, related_user_id)
      VALUES (NEW.user_id, 'friend_added', NEW.friend_id)
      ON CONFLICT DO NOTHING;
    END IF;
    
    -- Also log for the friend
    IF should_log_activity(NEW.friend_id) THEN
      INSERT INTO friend_activities (user_id, activity_type, related_user_id)
      VALUES (NEW.friend_id, 'friend_added', NEW.user_id)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_log_friend_added
  AFTER INSERT OR UPDATE ON friendships
  FOR EACH ROW
  EXECUTE FUNCTION log_friend_added();

-- RPC: Get friend activities (paginated)
CREATE OR REPLACE FUNCTION get_friend_activities(
  page_limit INT DEFAULT 20,
  page_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  user_full_name TEXT,
  user_avatar_url TEXT,
  activity_type TEXT,
  related_user_id UUID,
  related_user_full_name TEXT,
  related_deal_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    fa.id,
    fa.user_id,
    p1.full_name as user_full_name,
    p1.avatar_url as user_avatar_url,
    fa.activity_type,
    fa.related_user_id,
    p2.full_name as related_user_full_name,
    fa.related_deal_id,
    fa.metadata,
    fa.created_at
  FROM friend_activities fa
  JOIN profiles p1 ON fa.user_id = p1.id
  LEFT JOIN profiles p2 ON fa.related_user_id = p2.id
  WHERE fa.user_id IN (
    SELECT friend_id FROM friendships 
    WHERE user_id = auth.uid() AND status = 'active'
  )
  ORDER BY fa.created_at DESC
  LIMIT page_limit
  OFFSET page_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_friend_activities(INT, INT) TO authenticated;

-- RPC: Get activity count
CREATE OR REPLACE FUNCTION get_activity_count()
RETURNS INT AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INT
    FROM friend_activities
    WHERE user_id IN (
      SELECT friend_id FROM friendships 
      WHERE user_id = auth.uid() AND status = 'active'
    )
    AND created_at > NOW() - INTERVAL '7 days'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_activity_count() TO authenticated;
```

---

## 🔧 MCP Integration

### Using Supabase MCP

1. **Apply Migration:**
```bash
# Use Supabase MCP to apply the migration
mcp4_apply_migration(
  project_id="ysxmgbblljoyebvugrfo",
  name="friend_activities_schema",
  query=<migration_sql>
)
```

2. **Verify Schema:**
```bash
# Check if table exists
mcp4_execute_sql(
  project_id="ysxmgbblljoyebvugrfo",
  query="SELECT * FROM friend_activities LIMIT 1"
)
```

3. **Test RPC Functions:**
```bash
# Test get_friend_activities
mcp4_execute_sql(
  project_id="ysxmgbblljoyebvugrfo",
  query="SELECT * FROM get_friend_activities(10, 0)"
)
```

---

## 🧪 Testing Checklist

### Manual Testing
- [ ] Create a friendship between two users
- [ ] Verify `friend_added` activity is logged for both users
- [ ] Check that activities appear in `get_friend_activities()` RPC
- [ ] Verify RLS: User A can only see activities from their friends
- [ ] Test privacy: Set a user's `search_visibility` to false, verify no activities are logged

### SQL Test Queries
```sql
-- Test 1: Check activities are being logged
SELECT * FROM friend_activities ORDER BY created_at DESC LIMIT 10;

-- Test 2: Test RPC function
SELECT * FROM get_friend_activities(10, 0);

-- Test 3: Verify RLS (run as different users)
SET request.jwt.claim.sub = '<user_id>';
SELECT * FROM friend_activities;

-- Test 4: Check activity count
SELECT get_activity_count();
```

---

## 📝 Implementation Notes

### Privacy Considerations
- Activities are only logged if the user has `search_visibility` enabled
- RLS ensures users only see activities from their friends
- The `should_log_activity()` function centralizes privacy checks

### Performance
- Indexes on `user_id` and `created_at` for fast queries
- UNIQUE constraint prevents duplicate activity logs
- Pagination support via `page_limit` and `page_offset`

### Future Enhancements
- Add activity types for: deal_reviewed, deal_redeemed, check_in
- Add notification triggers based on activities
- Add activity aggregation (e.g., "5 friends liked this deal")

---

## ✅ Definition of Done

- [ ] Migration file created and applied via Supabase MCP
- [ ] All tables, indexes, and RLS policies created
- [ ] Triggers are working and logging activities
- [ ] RPC functions tested and returning correct data
- [ ] Privacy settings are respected
- [ ] Manual testing completed
- [ ] Documentation updated

---

**Next Story:** [STORY 9.6.2: Activity Feed UI Component](./STORY_9.6.2_Activity_Feed_UI.md)
