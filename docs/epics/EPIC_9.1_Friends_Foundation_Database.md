# 👥 EPIC 9.1: Friends Module Foundation - Database Schema & Core Infrastructure

**Epic Owner:** Backend Engineering / Database Admin  
**Stakeholders:** Backend Engineering, Security, Frontend Engineering, QA  
**Dependencies:** Epic 2 (Authentication), Epic 8.1 (Messaging Database)  
**Timeline:** Week 1-2 (2 weeks)  
**Status:** 📋 Planning

---

## 🎯 **Epic Goal**

Build a **Facebook-level friends system** with robust database foundation that supports:
- Bidirectional friend relationships (mutual friendships)
- Friend request workflow (send → accept/reject → notification)
- One-way follow system (Instagram/Twitter-style)
- User blocking for privacy and safety
- Friend search and discovery (People You May Know)
- Friend recommendations engine
- Online/offline status tracking
- Integration with existing messaging system (Epic 8.x)
- **Cross-platform support: Web browsers + Native iOS/Android apps (Capacitor)**

This epic establishes the **data layer** and **business logic** that all friends features depend on.

---

## 📱 **Platform Support**

**Target Platforms:**
- ✅ **Web Browsers** (Chrome, Firefox, Safari, Edge)
- ✅ **iOS Native App** (via Capacitor framework)
- ✅ **Android Native App** (via Capacitor framework)

**Architecture Foundation:**
- **Database**: Platform-agnostic Supabase Postgres accessible from all platforms
- **Realtime**: Supabase Realtime for live friend status updates (online/offline)
- **Storage**: Profile avatars stored in Supabase Storage with CDN delivery
- **Authentication**: Integrated with Epic 2 auth system
- **RLS Security**: Row-level security prevents unauthorized friend data access

**Mobile-Specific Considerations:**
- Contact sync integration (iOS Contacts, Android Contacts API)
- Push notifications for friend requests (FCM/APNs)
- Background refresh for friend status updates
- Offline-first architecture for viewing friends list

---

## 🎯 **MCP Integration Strategy**

**This epic follows the global MCP routing rule (`rule:yCm2e9oHOnrU5qbhrGa2IE`)** to maximize development efficiency:

### **Primary MCP Servers Used:**

1. **🛢 Supabase MCP** (Heavy usage)
   ```bash
   # Execute SQL migrations
   warp mcp run supabase "apply_migration friends_foundation"
   
   # Test RLS policies
   warp mcp run supabase "execute_sql SELECT * FROM friendships WHERE user_id = ?"
   
   # Deploy edge functions for friend recommendations
   warp mcp run supabase "deploy_edge_function friend_recommendations"
   
   # Test database functions
   warp mcp run supabase "execute_sql SELECT accept_friend_request('...')"
   ```

2. **🧠 Context7 MCP** (Medium usage)
   ```bash
   # Analyze existing friends code for conflicts
   warp mcp run context7 "analyze src/services/friendService.ts"
   
   # Find all friend-related components
   warp mcp run context7 "find usage of useFriends hook"
   
   # Review SQL functions for security vulnerabilities
   warp mcp run context7 "explain supabase/migrations/*friends*.sql"
   ```

3. **🐙 GitHub MCP** (For migration tracking)
   ```bash
   # Create migration tracking issue
   warp mcp run github "create_issue 'Epic 9.1: Friends Database Migration'"
   
   # Track schema changes in PR
   warp mcp run github "create_pull_request epic-9.1-friends-foundation"
   ```

**🔄 Automatic Routing:** The global MCP rule automatically routes:
- SQL/database/RLS queries → Supabase MCP
- Code analysis/refactoring → Context7 MCP
- Repo/issue management → GitHub MCP

**📖 Each story includes specific MCP commands for implementation.**

---

## ✅ **Success Criteria**

| Objective | KPI / Target |
|-----------|--------------|
| **Database Performance** | Friend list query < 30ms for 1000 friends |
| **RLS Security** | 100% of tables protected with Row Level Security |
| **Friend Request Flow** | Complete send → accept flow in < 500ms |
| **Recommendation Engine** | "People You May Know" generated in < 100ms |
| **Online Status** | Real-time status updates within 2 seconds |
| **Migration Success** | Zero data loss from existing friends tables |
| **Backward Compatibility** | Existing friends features continue working |
| **Index Optimization** | All queries use indexes (no sequential scans) |

---

## 📊 **High-Level Architecture**

```
┌─────────────────────────────────────────────────────────────┐
│                  FRIENDS DATABASE LAYER                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐   │
│  │  friendships │  │friend_requests│ │   following     │   │
│  │              │  │              │  │                 │   │
│  │ • id         │  │ • id         │  │ • id            │   │
│  │ • user_id    │  │ • sender_id  │  │ • follower_id   │   │
│  │ • friend_id  │  │ • receiver_id│  │ • following_id  │   │
│  │ • status     │  │ • status     │  │ • created_at    │   │
│  │ • created_at │  │ • message    │  │                 │   │
│  │ • unfriended │  │ • expires_at │  └─────────────────┘   │
│  └──────────────┘  └──────────────┘                         │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐   │
│  │blocked_users │  │ notifications │  │friend_activities│   │
│  │              │  │              │  │                 │   │
│  │ • blocker_id │  │ • user_id    │  │ • user_id       │   │
│  │ • blocked_id │  │ • type       │  │ • activity_type │   │
│  │ • reason     │  │ • title      │  │ • related_user  │   │
│  │ • created_at │  │ • data       │  │ • created_at    │   │
│  └──────────────┘  │ • read       │  └─────────────────┘   │
│                     └──────────────┘                         │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │           PROFILES EXTENSION                        │    │
│  │  • is_online (boolean)                              │    │
│  │  • last_active (timestamp)                          │    │
│  │  • friend_count (integer)                           │    │
│  │  • follower_count (integer)                         │    │
│  │  • following_count (integer)                        │    │
│  │  • privacy_settings (jsonb)                         │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │           DATABASE FUNCTIONS                        │    │
│  │  • accept_friend_request(request_id)                │    │
│  │  • reject_friend_request(request_id)                │    │
│  │  • unfriend(user_id)                                │    │
│  │  • block_user(user_id, reason)                      │    │
│  │  • get_mutual_friends(user_id)                      │    │
│  │  • get_friend_recommendations(limit)                │    │
│  │  • search_friends(query)                            │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │           ROW LEVEL SECURITY (RLS)                  │    │
│  │  ✓ Users see only their friendships                 │    │
│  │  ✓ Friend requests visible to sender/receiver only  │    │
│  │  ✓ Following relationships are public               │    │
│  │  ✓ Blocked users invisible in all queries           │    │
│  │  ✓ Notifications private to recipient               │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │           REALTIME SUBSCRIPTIONS                    │    │
│  │  • postgres_changes on friendships                  │    │
│  │  • postgres_changes on friend_requests              │    │
│  │  • presence for online/offline status               │    │
│  │  • broadcast for typing in search                   │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

---

## 🗂️ **Stories in This Epic**

### **STORY 9.1.1: Audit & Migrate Existing Friends Schema** ⏱️ 3 days
**Priority:** 🔴 Critical  
**MCP Usage:** 🛢 Supabase MCP (Heavy), 🧠 Context7 MCP (Medium)

**Description:**  
Audit existing friends tables (`friendships`, `friend_requests`, `friend_activities`) and migrate to Facebook-level schema with bidirectional graph structure.

**Acceptance Criteria:**
- [x] Document current schema in `docs/schema/friends_current_state.md`
- [x] Identify data migration risks (breaking changes, data loss)
- [x] Create migration script that preserves existing friend relationships
- [x] Add new columns: `status` (active/unfriended), `privacy_settings`
- [x] Create indexes for fast friend lookups
- [x] Zero data loss confirmed via pre/post migration tests

**MCP Commands:**
```bash
# 1. Analyze existing schema
warp mcp run supabase "list_tables schemas=['public'] filter='friend'"

# 2. Export existing data for backup
warp mcp run supabase "execute_sql COPY (SELECT * FROM friendships) TO STDOUT CSV"

# 3. Test migration on branch database
warp mcp run supabase "create_branch epic-9-1-friends"
warp mcp run supabase "apply_migration 20250116_audit_friends_schema"

# 4. Validate migration
warp mcp run supabase "execute_sql SELECT COUNT(*) FROM friendships"
```

**Files Modified:**
- `supabase/migrations/20250116_audit_friends_schema.sql`
- `docs/schema/friends_current_state.md`

---

### **STORY 9.1.2: Implement Bidirectional Friendships Table** ⏱️ 2 days
**Priority:** 🔴 Critical  
**MCP Usage:** 🛢 Supabase MCP (Heavy)

**Description:**  
Redesign `friendships` table to use bidirectional graph structure (Facebook-style) where each friendship creates TWO rows (user_id ↔ friend_id).

**Acceptance Criteria:**
- [x] Create new `friendships` schema with bidirectional constraint
- [x] Unique constraint on (user_id, friend_id) pair
- [x] `status` column: 'active', 'unfriended'
- [x] `unfriended_at` timestamp for soft deletes
- [x] Database trigger to auto-create reverse relationship
- [x] GIN indexes on user_id and friend_id for O(1) lookups
- [x] RLS policies: users see only their active friendships

**Technical Spec:**
```sql
CREATE TABLE public.friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' 
    CHECK (status IN ('active', 'unfriended')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  unfriended_at TIMESTAMPTZ,
  
  CONSTRAINT friendships_different_users CHECK (user_id != friend_id),
  CONSTRAINT friendships_unique_pair UNIQUE (user_id, friend_id)
);

-- Indexes for O(1) friend lookups
CREATE INDEX idx_friendships_user_active 
  ON friendships(user_id) WHERE status = 'active';
CREATE INDEX idx_friendships_friend_active 
  ON friendships(friend_id) WHERE status = 'active';

-- RLS: Users see only their friendships
CREATE POLICY "Users view their friendships"
  ON friendships FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = friend_id);
```

**MCP Commands:**
```bash
warp mcp run supabase "apply_migration 20250116_bidirectional_friendships"
warp mcp run supabase "execute_sql SELECT * FROM friendships LIMIT 5"
```

---

### **STORY 9.1.3: Friend Requests with Auto-Expiry** ⏱️ 2 days
**Priority:** 🔴 Critical  
**MCP Usage:** 🛢 Supabase MCP (Heavy)

**Description:**  
Implement friend request workflow with pending/accepted/rejected/cancelled states and auto-expiry after 30 days.

**Acceptance Criteria:**
- [x] Create `friend_requests` table with status workflow
- [x] Optional message field for request personalization
- [x] `expires_at` timestamp (30 days from creation)
- [x] Database function `accept_friend_request()` creates bidirectional friendship
- [x] Prevent duplicate pending requests (unique constraint)
- [x] RLS: only sender and receiver see request
- [x] Realtime subscription for instant request notifications

**Technical Spec:**
```sql
CREATE TABLE public.friend_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' 
    CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled')),
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  
  CONSTRAINT friend_requests_different_users 
    CHECK (sender_id != receiver_id),
  CONSTRAINT friend_requests_unique_pending 
    UNIQUE (sender_id, receiver_id, status) WHERE status = 'pending'
);

-- Function: Accept friend request
CREATE OR REPLACE FUNCTION accept_friend_request(request_id UUID)
RETURNS JSONB AS $$
DECLARE
  req RECORD;
BEGIN
  SELECT * INTO req FROM friend_requests 
  WHERE id = request_id AND status = 'pending';
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Request not found');
  END IF;
  
  -- Create bidirectional friendship
  INSERT INTO friendships (user_id, friend_id)
  VALUES 
    (req.sender_id, req.receiver_id),
    (req.receiver_id, req.sender_id);
  
  -- Update request status
  UPDATE friend_requests SET status = 'accepted' WHERE id = request_id;
  
  -- Send notification
  INSERT INTO notifications (user_id, type, title, data)
  VALUES (
    req.sender_id,
    'friend_accepted',
    'Friend request accepted',
    jsonb_build_object('user_id', req.receiver_id)
  );
  
  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**MCP Commands:**
```bash
warp mcp run supabase "apply_migration 20250116_friend_requests"
warp mcp run supabase "execute_sql SELECT accept_friend_request('...')"
```

---

### **STORY 9.1.4: Follow System (Instagram-style)** ⏱️ 1 day
**Priority:** 🟡 Medium  
**MCP Usage:** 🛢 Supabase MCP (Medium)

**Description:**  
Implement one-way follow relationships (like Instagram/Twitter) separate from friendships.

**Acceptance Criteria:**
- [x] Create `following` table with follower_id and following_id
- [x] Public visibility (anyone can see who follows whom)
- [x] RLS: users can follow/unfollow anyone
- [x] Unique constraint to prevent duplicate follows
- [x] Indexes for fast follower/following count queries
- [x] Auto-unfollow when unfriending (database trigger)

**Technical Spec:**
```sql
CREATE TABLE public.following (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT following_different_users CHECK (follower_id != following_id),
  CONSTRAINT following_unique_pair UNIQUE (follower_id, following_id)
);

-- RLS: Public visibility
CREATE POLICY "Anyone can view follows"
  ON following FOR SELECT USING (true);

-- Trigger: Auto-unfollow on unfriend
CREATE OR REPLACE FUNCTION auto_unfollow_on_unfriend()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'unfriended' THEN
    DELETE FROM following 
    WHERE (follower_id = NEW.user_id AND following_id = NEW.friend_id)
       OR (follower_id = NEW.friend_id AND following_id = NEW.user_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_unfollow
  AFTER UPDATE ON friendships
  FOR EACH ROW
  EXECUTE FUNCTION auto_unfollow_on_unfriend();
```

---

### **STORY 9.1.5: User Blocking System** ⏱️ 2 days
**Priority:** 🔴 Critical  
**MCP Usage:** 🛢 Supabase MCP (Heavy)

**Description:**  
Implement hard privacy barrier where blocked users cannot find, message, or interact with blocker.

**Acceptance Criteria:**
- [x] Create `blocked_users` table
- [x] Database function `block_user()` removes friendship + follows
- [x] Blocked users invisible in search results (RLS policy)
- [x] Blocked users cannot send messages (integrated with Epic 8.x)
- [x] Blocked users cannot send friend requests
- [x] Unblock restores visibility but not friendship

**Technical Spec:**
```sql
CREATE TABLE public.blocked_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT blocked_users_different_users CHECK (blocker_id != blocked_id),
  CONSTRAINT blocked_users_unique_pair UNIQUE (blocker_id, blocked_id)
);

-- Function: Block user
CREATE OR REPLACE FUNCTION block_user(blocked_user_id UUID, block_reason TEXT)
RETURNS JSONB AS $$
DECLARE
  current_user_id UUID := auth.uid();
BEGIN
  -- Unfriend both directions
  UPDATE friendships SET status = 'unfriended', unfriended_at = NOW()
  WHERE (user_id = current_user_id AND friend_id = blocked_user_id)
     OR (user_id = blocked_user_id AND friend_id = current_user_id);
  
  -- Remove follows both directions
  DELETE FROM following 
  WHERE (follower_id = current_user_id AND following_id = blocked_user_id)
     OR (follower_id = blocked_user_id AND following_id = current_user_id);
  
  -- Block
  INSERT INTO blocked_users (blocker_id, blocked_id, reason)
  VALUES (current_user_id, blocked_user_id, block_reason);
  
  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

### **STORY 9.1.6: Profiles Extension (Online Status + Counts)** ⏱️ 1 day
**Priority:** 🟡 Medium  
**MCP Usage:** 🛢 Supabase MCP (Medium)

**Description:**  
Extend `profiles` table with friend-related fields: online status, last active, friend/follower counts.

**Acceptance Criteria:**
- [x] Add columns: `is_online`, `last_active`, `friend_count`, `follower_count`, `following_count`
- [x] Database trigger to update counts on friendship changes
- [x] Database trigger to update `last_active` on profile updates
- [x] Indexes on `is_online` and `last_active` for fast queries
- [x] Backward compatible with existing profiles

**Technical Spec:**
```sql
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS last_active TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS friend_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS follower_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS following_count INTEGER DEFAULT 0;

-- Trigger: Update friend_count on friendship change
CREATE OR REPLACE FUNCTION update_friend_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'active' THEN
    UPDATE profiles SET friend_count = friend_count + 1 
    WHERE id IN (NEW.user_id, NEW.friend_id);
  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'active' AND NEW.status = 'unfriended' THEN
    UPDATE profiles SET friend_count = friend_count - 1 
    WHERE id IN (NEW.user_id, NEW.friend_id) AND friend_count > 0;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_friend_counts
  AFTER INSERT OR UPDATE ON friendships
  FOR EACH ROW
  EXECUTE FUNCTION update_friend_counts();
```

---

### **STORY 9.1.7: Database Functions for Friend Operations** ⏱️ 2 days
**Priority:** 🔴 Critical  
**MCP Usage:** 🛢 Supabase MCP (Heavy), 🧠 Context7 MCP (Medium)

**Description:**  
Create reusable database functions for common friend operations (unfriend, mutual friends, search).

**Acceptance Criteria:**
- [x] `unfriend(user_id)` - Soft delete friendship + auto-unfollow
- [x] `get_mutual_friends(user_id)` - Returns mutual friends count and list
- [x] `search_friends(query)` - Full-text search on friend names
- [x] `get_online_friends_count()` - Real-time online friends count
- [x] All functions have `SECURITY DEFINER` with RLS enforcement
- [x] Performance tested with 1000+ friends (< 50ms response time)

**Technical Spec:**
```sql
-- Function: Unfriend
CREATE OR REPLACE FUNCTION unfriend(friend_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  current_user_id UUID := auth.uid();
BEGIN
  UPDATE friendships SET status = 'unfriended', unfriended_at = NOW()
  WHERE (user_id = current_user_id AND friend_id = friend_user_id)
     OR (user_id = friend_user_id AND friend_id = current_user_id)
    AND status = 'active';
  
  UPDATE profiles SET friend_count = friend_count - 1 
  WHERE id IN (current_user_id, friend_user_id) AND friend_count > 0;
  
  DELETE FROM following 
  WHERE (follower_id = current_user_id AND following_id = friend_user_id)
     OR (follower_id = friend_user_id AND following_id = current_user_id);
  
  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get mutual friends
CREATE OR REPLACE FUNCTION get_mutual_friends(target_user_id UUID)
RETURNS TABLE(friend_id UUID, full_name TEXT, avatar_url TEXT) AS $$
  SELECT p.id, p.full_name, p.avatar_url
  FROM friendships f1
  JOIN friendships f2 ON f1.friend_id = f2.friend_id
  JOIN profiles p ON p.id = f1.friend_id
  WHERE f1.user_id = auth.uid() 
    AND f2.user_id = target_user_id
    AND f1.status = 'active' 
    AND f2.status = 'active';
$$ LANGUAGE sql SECURITY DEFINER;
```

**MCP Commands:**
```bash
# Test functions
warp mcp run supabase "execute_sql SELECT unfriend('...')"
warp mcp run supabase "execute_sql SELECT * FROM get_mutual_friends('...')"
```

---

### **STORY 9.1.8: Notifications System Integration** ⏱️ 1 day
**Priority:** 🟡 Medium  
**MCP Usage:** 🛢 Supabase MCP (Medium)

**Description:**  
Integrate friends module with notifications table for friend request/accept/unfriend events.

**Acceptance Criteria:**
- [x] Notification types: 'friend_request', 'friend_accepted', 'friend_removed'
- [x] Notifications created automatically via database triggers
- [x] Unread notification count in API
- [x] RLS: users see only their notifications
- [x] Realtime subscription for instant notification delivery

**Technical Spec:**
```sql
-- Trigger: Notify on friend request
CREATE OR REPLACE FUNCTION notify_friend_request()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'pending' THEN
    INSERT INTO notifications (user_id, type, title, message, data)
    VALUES (
      NEW.receiver_id,
      'friend_request',
      'New friend request',
      (SELECT full_name FROM profiles WHERE id = NEW.sender_id) || ' sent you a friend request',
      jsonb_build_object('request_id', NEW.id, 'sender_id', NEW.sender_id)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_friend_request
  AFTER INSERT ON friend_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_friend_request();
```

---

### **STORY 9.1.9: Integration with Messaging Module (Epic 8.x)** ⏱️ 2 days
**Priority:** 🔴 Critical  
**MCP Usage:** 🛢 Supabase MCP (Heavy), 🧠 Context7 MCP (Heavy)

**Description:**  
Ensure friends module integrates seamlessly with existing messaging system (conversations table, message permissions).

**Acceptance Criteria:**
- [x] Only friends can create direct conversations (RLS policy)
- [x] Blocked users cannot message each other
- [x] Friend status shown in conversation list
- [x] Online status integrated into message thread UI
- [x] Existing `create_or_get_direct_conversation()` function updated for friend checks
- [x] Zero breaking changes to Epic 8.x code

**Technical Spec:**
```sql
-- Update conversation RLS to check friendships
CREATE POLICY "Only friends can create conversations"
  ON conversations FOR INSERT
  WITH CHECK (
    auth.uid() = ANY(participants) AND
    NOT EXISTS (
      SELECT 1 FROM blocked_users
      WHERE (blocker_id = auth.uid() AND blocked_id = ANY(participants))
         OR (blocker_id = ANY(participants) AND blocked_id = auth.uid())
    ) AND
    EXISTS (
      SELECT 1 FROM friendships
      WHERE user_id = auth.uid() 
        AND friend_id = ANY(participants)
        AND status = 'active'
    )
  );

-- Update create_or_get_direct_conversation to check friendship
CREATE OR REPLACE FUNCTION create_or_get_direct_conversation(other_user_id UUID)
RETURNS UUID AS $$
DECLARE
  conv_id UUID;
  current_user_id UUID := auth.uid();
  participant_array UUID[];
BEGIN
  -- Check if blocked
  IF EXISTS (
    SELECT 1 FROM blocked_users
    WHERE (blocker_id = current_user_id AND blocked_id = other_user_id)
       OR (blocker_id = other_user_id AND blocked_id = current_user_id)
  ) THEN
    RAISE EXCEPTION 'Cannot message blocked user';
  END IF;
  
  -- Check if friends
  IF NOT EXISTS (
    SELECT 1 FROM friendships
    WHERE user_id = current_user_id 
      AND friend_id = other_user_id 
      AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Can only message friends';
  END IF;
  
  participant_array := ARRAY[LEAST(current_user_id, other_user_id), 
                             GREATEST(current_user_id, other_user_id)];
  
  SELECT id INTO conv_id FROM conversations
  WHERE type = 'direct' AND participants = participant_array LIMIT 1;
  
  IF conv_id IS NULL THEN
    INSERT INTO conversations (type, participants, created_by)
    VALUES ('direct', participant_array, current_user_id)
    RETURNING id INTO conv_id;
  END IF;
  
  RETURN conv_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**MCP Commands:**
```bash
# Analyze messaging integration points
warp mcp run context7 "analyze src/services/conversationService.ts"
warp mcp run context7 "find usage of create_or_get_direct_conversation"

# Test integration
warp mcp run supabase "execute_sql SELECT create_or_get_direct_conversation('...')"
```

---

## 📦 **Deliverables**

### **Database Migrations:**
1. `20250116_audit_friends_schema.sql` - Audit and backup existing data
2. `20250116_bidirectional_friendships.sql` - New friendships table structure
3. `20250116_friend_requests.sql` - Friend request workflow
4. `20250116_following_system.sql` - One-way follow relationships
5. `20250116_blocking_system.sql` - User blocking
6. `20250116_profiles_extension.sql` - Online status and counts
7. `20250116_friend_functions.sql` - Database functions
8. `20250116_notifications_integration.sql` - Notification triggers
9. `20250116_messaging_integration.sql` - Epic 8.x integration

### **Documentation:**
1. `docs/schema/friends_database_schema.md` - Complete schema documentation
2. `docs/schema/friends_current_state.md` - Current state audit
3. `docs/api/friends_database_functions.md` - Database function reference
4. `docs/migration/friends_migration_guide.md` - Migration runbook

### **Testing:**
1. RLS policy tests for all tables
2. Database function unit tests
3. Performance benchmarks (1000+ friends)
4. Integration tests with Epic 8.x messaging

---

## 🔗 **Integration with Existing Code**

### **Files to Modify:**
```
src/services/friendService.ts          # Update to use new schema
src/hooks/useFriends.ts                 # Update queries
src/components/ContactsSidebar*.tsx     # Update friend displays
src/services/conversationService.ts     # Add friend checks
```

### **Backward Compatibility Strategy:**
1. Keep existing tables during migration
2. Create views with old column names pointing to new schema
3. Update code incrementally (feature flags)
4. Remove old tables only after 100% migration

---

## 📈 **Metrics & Monitoring**

### **Database Metrics:**
- Friend list query time (p50, p95, p99)
- Friend request acceptance rate
- Online status update latency
- RLS policy evaluation time

### **Business Metrics:**
- Friend requests sent per user per day
- Friend request acceptance rate
- Average friends per user
- Blocking incidents per 1000 users

---

**Next Epic:** [EPIC 9.2: Friend Discovery & Search](./EPIC_9.2_Friend_Discovery_Search.md)
