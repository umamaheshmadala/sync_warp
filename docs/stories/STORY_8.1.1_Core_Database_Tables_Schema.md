# 📋 STORY 8.1.1: Core Database Tables Schema Creation

**Parent Epic:** [EPIC 8.1 - Messaging Foundation & Database Architecture](../epics/EPIC_8.1_Messaging_Foundation_Database.md)  
**Story Owner:** Backend Engineering  
**Estimated Effort:** 2 days  
**Priority:** 🔴 Critical (Blocks all other messaging stories)  
**Status:** ✅ **COMPLETE** - Implemented 2025-02-01

---

## 🎯 **Story Goal**

Create the foundational database schema for SynC's messaging system, including all core tables with proper constraints, indexes, and Realtime enablement. This establishes the data layer that all messaging features will depend on.

---

## 📱 **Platform Support**

| Platform    | Support | Implementation Notes                                                 |
| ----------- | ------- | -------------------------------------------------------------------- |
| **Web**     | ✅ Full | Supabase Postgres accessible via supabase-js client                  |
| **iOS**     | ✅ Full | Same database via Capacitor + supabase-js (no native changes needed) |
| **Android** | ✅ Full | Same database via Capacitor + supabase-js (no native changes needed) |

### Architecture Notes

**This is a backend/database story - platform-agnostic by design.**

- **Database Layer**: Supabase Postgres serves all platforms identically
- **Access Method**: All platforms use supabase-js library over HTTPS/WebSocket
- **Authentication**: Uses Supabase Auth with platform-specific token storage:
  - Web: LocalStorage
  - iOS/Android: Capacitor SecureStorage (configured in Epic 7.2)

### Mobile-Specific Database Considerations

1. **Push Notification Tokens** (future enhancement):
   - Add `user_push_tokens` table in future story for FCM (Android) and APNs (iOS)
   - Not required for MVP database schema

2. **Metadata Column Usage**:

   ```json
   // conversations.metadata can store mobile-specific data
   {
     "last_read_mobile": "2025-01-13T18:00:00Z",
     "notification_enabled": true,
     "ringtone": "default" // iOS/Android custom ringtone
   }
   ```

3. **Media URLs**:
   - `messages.media_urls` supports both web blob URLs AND native file URIs
   - iOS: `file:///var/mobile/Containers/...`
   - Android: `content://media/external/...`
   - Storage transformation handled by Epic 8.1.3

4. **Realtime Subscriptions**:
   - WebSocket connections work identically on web and mobile
   - Mobile apps handle background/foreground state transitions (Epic 7.1)

5. **Offline Support**:
   - Database schema supports offline message queuing via `status` field
   - Mobile apps can queue messages locally with `status: 'sending'`
   - Sync when connection restored (Epic 8.4)

**No Capacitor plugins required for this story** - database access is pure JavaScript.

---

## 📝 **User Story**

**As a** backend developer  
**I want to** create a robust and scalable database schema for messaging  
**So that** the messaging system has a solid foundation with proper relationships, constraints, and performance optimizations

---

## ✅ **Acceptance Criteria**

- [ ] All 7 core tables created successfully:
  - [ ] `conversations` table with GIN index on participants
  - [ ] `messages` table with composite indexes
  - [ ] `message_read_receipts` table with partial indexes
  - [ ] `conversation_participants` table
  - [ ] `message_edits` table
  - [ ] `typing_indicators` table with auto-cleanup trigger
  - [ ] `blocked_users` table with bidirectional check
- [ ] All CHECK constraints validated and working
- [ ] All foreign key relationships established
- [ ] Indexes created and verified in query plans
- [ ] Realtime publication enabled on critical tables
- [ ] Migration file runs without errors in all environments
- [ ] Database rollback tested and working

---

## 🛢 **MCP Integration (Primary: Supabase MCP)**

### **Phase 1: Create Migration File**

```bash
# Create the migration file structure
warp mcp run supabase "Create migration file for messaging tables schema"

# Verify migration file location
warp mcp run supabase "execute_sql SELECT * FROM supabase_migrations.schema_migrations ORDER BY version DESC LIMIT 5;"
```

### **Phase 2: Apply Migration**

```bash
# Apply the migration to create all tables
warp mcp run supabase "apply_migration create_messaging_tables_20250201"

# Verify all tables created
warp mcp run supabase "execute_sql SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND (tablename LIKE '%message%' OR tablename = 'conversations' OR tablename = 'blocked_users' OR tablename = 'typing_indicators') ORDER BY tablename;"
```

### **Phase 3: Verify Constraints**

```bash
# Check all constraints
warp mcp run supabase "execute_sql SELECT conname, conrelid::regclass, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid::regclass::text IN ('conversations', 'messages', 'message_read_receipts', 'conversation_participants', 'message_edits', 'typing_indicators', 'blocked_users') ORDER BY conrelid::regclass::text, conname;"

# Test CHECK constraint on conversations.participants
warp mcp run supabase "execute_sql INSERT INTO conversations (type, participants) VALUES ('direct', ARRAY[]::uuid[]); -- Should fail"

# Test CHECK constraint on messages.type
warp mcp run supabase "execute_sql INSERT INTO messages (conversation_id, sender_id, content, type) VALUES (gen_random_uuid(), auth.uid(), 'test', 'invalid_type'); -- Should fail"
```

### **Phase 4: Verify Indexes**

```bash
# List all indexes created
warp mcp run supabase "execute_sql SELECT schemaname, tablename, indexname, indexdef FROM pg_indexes WHERE schemaname = 'public' AND tablename IN ('conversations', 'messages', 'message_read_receipts', 'conversation_participants', 'message_edits', 'typing_indicators', 'blocked_users') ORDER BY tablename, indexname;"

# Verify GIN index on conversations.participants
warp mcp run supabase "execute_sql SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'conversations' AND indexdef LIKE '%gin%';"

# Verify composite index on messages
warp mcp run supabase "execute_sql SELECT indexname FROM pg_indexes WHERE tablename = 'messages' AND indexname LIKE '%conversation%created%';"
```

### **Phase 5: Enable Realtime**

```bash
# Enable Realtime publication on critical tables
warp mcp run supabase "execute_sql ALTER PUBLICATION supabase_realtime ADD TABLE conversations, messages, message_read_receipts;"

# Verify Realtime enabled
warp mcp run supabase "execute_sql SELECT schemaname, tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename IN ('conversations', 'messages', 'message_read_receipts') ORDER BY tablename;"
```

### **Phase 6: Test Triggers**

```bash
# Test typing indicators auto-cleanup trigger
warp mcp run supabase "execute_sql INSERT INTO typing_indicators (conversation_id, user_id, started_at) VALUES (gen_random_uuid(), auth.uid(), now() - INTERVAL '15 seconds');"

# Verify trigger fires
warp mcp run supabase "execute_sql SELECT COUNT(*) FROM typing_indicators WHERE started_at < now() - INTERVAL '10 seconds';"
```

---

## 🧠 **MCP Integration (Secondary: Context7 MCP)**

```bash
# Analyze schema for potential issues
warp mcp run context7 "Review the messaging database schema and identify any missing indexes or constraints that could impact performance or data integrity"

# Check for security vulnerabilities
warp mcp run context7 "Analyze the conversations and messages table schema for potential security vulnerabilities"

# Suggest optimizations
warp mcp run context7 "Review the message_read_receipts table design and suggest optimizations for unread count queries"
```

---

## 📋 **Implementation Tasks**

### **Task 1: Create Conversations Table** ⏱️ 2 hours

```sql
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL DEFAULT 'direct' CHECK (type IN ('direct', 'group')),
  participants UUID[] NOT NULL,
  name TEXT,
  avatar_url TEXT,
  is_archived BOOLEAN DEFAULT false,
  is_muted BOOLEAN DEFAULT false,
  is_pinned BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  last_message_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT valid_participants CHECK (array_length(participants, 1) >= 2),
  CONSTRAINT valid_metadata CHECK (jsonb_typeof(metadata) = 'object')
);

CREATE INDEX idx_conversations_participants ON conversations USING gin(participants);
CREATE INDEX idx_conversations_last_message_at ON conversations(last_message_at DESC);
CREATE INDEX idx_conversations_type ON conversations(type);
```

### **Task 2: Create Messages Table** ⏱️ 3 hours

```sql
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT,
  type TEXT NOT NULL DEFAULT 'text' CHECK (type IN ('text', 'image', 'video', 'link', 'coupon', 'deal')),
  media_urls TEXT[],
  thumbnail_url TEXT,
  link_preview JSONB,
  shared_coupon_id UUID REFERENCES coupons(id) ON DELETE SET NULL,
  shared_deal_id UUID REFERENCES offers(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sending', 'sent', 'delivered', 'read', 'failed')),
  is_edited BOOLEAN DEFAULT false,
  edited_at TIMESTAMPTZ,
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reply_to_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT valid_content CHECK (
    content IS NOT NULL OR
    array_length(media_urls, 1) > 0 OR
    shared_coupon_id IS NOT NULL OR
    shared_deal_id IS NOT NULL
  ),
  CONSTRAINT valid_metadata CHECK (jsonb_typeof(metadata) = 'object')
);

CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_created_at ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_status ON messages(status) WHERE status != 'read';
CREATE INDEX idx_messages_type ON messages(type);
CREATE INDEX idx_messages_shared_coupon ON messages(shared_coupon_id) WHERE shared_coupon_id IS NOT NULL;
CREATE INDEX idx_messages_shared_deal ON messages(shared_deal_id) WHERE shared_deal_id IS NOT NULL;
CREATE INDEX idx_messages_reply_to ON messages(reply_to_id) WHERE reply_to_id IS NOT NULL;
```

### **Task 3: Create Message Read Receipts Table** ⏱️ 1 hour

```sql
CREATE TABLE public.message_read_receipts (
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (message_id, user_id)
);

CREATE INDEX idx_read_receipts_message_id ON message_read_receipts(message_id);
CREATE INDEX idx_read_receipts_user_id ON message_read_receipts(user_id);
CREATE INDEX idx_read_receipts_unread ON message_read_receipts(user_id, read_at) WHERE read_at IS NULL;
```

### **Task 4: Create Conversation Participants Table** ⏱️ 1 hour

```sql
CREATE TABLE public.conversation_participants (
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_admin BOOLEAN DEFAULT false,
  joined_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  left_at TIMESTAMPTZ,
  is_muted BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  is_pinned BOOLEAN DEFAULT false,
  last_read_at TIMESTAMPTZ,
  notification_preference TEXT DEFAULT 'all' CHECK (notification_preference IN ('all', 'mentions', 'none')),
  PRIMARY KEY (conversation_id, user_id)
);

CREATE INDEX idx_participants_conversation_id ON conversation_participants(conversation_id);
CREATE INDEX idx_participants_user_id ON conversation_participants(user_id);
CREATE INDEX idx_participants_active ON conversation_participants(user_id) WHERE left_at IS NULL;
```

### **Task 5: Create Message Edits Table** ⏱️ 1 hour

```sql
CREATE TABLE public.message_edits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  old_content TEXT NOT NULL,
  new_content TEXT NOT NULL,
  edited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  edited_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT different_content CHECK (old_content != new_content)
);

CREATE INDEX idx_message_edits_message_id ON message_edits(message_id, edited_at DESC);
```

### **Task 6: Create Typing Indicators Table with Auto-Cleanup** ⏱️ 1 hour

```sql
CREATE TABLE public.typing_indicators (
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (conversation_id, user_id)
);

CREATE INDEX idx_typing_conversation_id ON typing_indicators(conversation_id);

-- Auto-cleanup trigger
CREATE OR REPLACE FUNCTION cleanup_old_typing_indicators()
RETURNS trigger AS $$
BEGIN
  DELETE FROM typing_indicators
  WHERE started_at < now() - INTERVAL '10 seconds';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cleanup_typing_trigger
  AFTER INSERT ON typing_indicators
  EXECUTE FUNCTION cleanup_old_typing_indicators();
```

### **Task 7: Create Blocked Users Table** ⏱️ 1 hour

```sql
CREATE TABLE public.blocked_users (
  blocker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  reason TEXT,
  PRIMARY KEY (blocker_id, blocked_id),
  CONSTRAINT cannot_block_self CHECK (blocker_id != blocked_id)
);

CREATE INDEX idx_blocked_users_blocker ON blocked_users(blocker_id);
CREATE INDEX idx_blocked_users_blocked ON blocked_users(blocked_id);
```

### **Task 8: Enable Realtime & Test** ⏱️ 1 hour

- Enable Realtime publication on conversations, messages, message_read_receipts
- Test Realtime subscriptions
- Verify auto-cleanup trigger works

---

## 🧪 **Testing Checklist**

### **Schema Validation Tests**

- [ ] All tables exist in database
- [ ] All columns have correct data types
- [ ] All constraints work as expected
- [ ] Foreign keys enforce referential integrity
- [ ] Default values are set correctly

### **Index Performance Tests**

- [ ] GIN index on participants used in queries
- [ ] Composite index on (conversation_id, created_at) used
- [ ] Partial indexes reduce index size
- [ ] No sequential scans in EXPLAIN plans

### **Constraint Tests**

- [ ] Cannot insert conversation with < 2 participants
- [ ] Cannot insert message with invalid type
- [ ] Cannot block self
- [ ] Message content validation works
- [ ] JSONB metadata validation works

### **Trigger Tests**

- [ ] Typing indicators auto-cleanup works
- [ ] Old indicators (>10s) are deleted automatically

### **Realtime Tests**

- [ ] New conversation appears in subscriptions
- [ ] New message triggers realtime event
- [ ] Read receipt update triggers event

---

## 📊 **Success Metrics**

| Metric                    | Target | How to Measure                        |
| ------------------------- | ------ | ------------------------------------- |
| **Migration Success**     | 100%   | Zero errors during `apply_migration`  |
| **Index Creation**        | 100%   | All indexes present in `pg_indexes`   |
| **Constraint Validation** | 100%   | All invalid inserts rejected          |
| **Realtime Enablement**   | 100%   | Tables in `pg_publication_tables`     |
| **Query Performance**     | < 50ms | EXPLAIN ANALYZE on participant lookup |

---

## 🔗 **Dependencies**

**Requires:**

- ✅ Supabase project set up
- ✅ Auth system (Epic 2) completed
- ✅ Existing `coupons` and `offers` tables
- ✅ Existing `friendships` table

**Enables:**

- Story 8.1.2 (RLS Implementation)
- Story 8.1.4 (Database Functions)
- All other messaging stories

---

## 📦 **Deliverables**

1. **Migration File**: `supabase/migrations/20250201_create_messaging_tables.sql`
2. **Schema Diagram**: Visual representation of table relationships
3. **Test Results**: Documentation of all constraint and index tests
4. **Rollback Script**: Migration down script for reverting changes

---

## 🚨 **Edge Cases to Handle**

1. **Empty participants array**: Prevented by CHECK constraint
2. **Self-referencing messages**: Allowed for reply threading
3. **Orphaned typing indicators**: Auto-cleaned by trigger
4. **Duplicate conversations**: Handled in Story 8.1.4
5. **Invalid JSON metadata**: Prevented by CHECK constraint

---

## ✅ **Definition of Done**

- [ ] All tables created and verified
- [ ] All indexes created and tested
- [ ] All constraints validated
- [ ] Realtime enabled on critical tables
- [ ] Migration tested in staging
- [ ] Rollback tested successfully
- [ ] MCP commands documented
- [ ] Code reviewed and approved

---

**Story Status:** ✅ **COMPLETE** - Implemented 2025-02-01  
**Migration File:** `supabase/migrations/20250201_create_messaging_tables.sql`  
**Next Story:** [STORY 8.1.2 - Row Level Security Implementation](./STORY_8.1.2_RLS_Implementation.md)
