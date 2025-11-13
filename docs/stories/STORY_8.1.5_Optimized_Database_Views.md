# 📊 STORY 8.1.5: Optimized Database Views Implementation

**Parent Epic:** [EPIC 8.1 - Messaging Foundation & Database Architecture](../epics/EPIC_8.1_Messaging_Foundation_Database.md)  
**Story Owner:** Backend Engineering  
**Estimated Effort:** 2 days  
**Priority:** 🟡 High  
**Status:** 📋 Ready for Implementation  
**Depends On:** Story 8.1.1 (Core Tables), Story 8.1.4 (Functions)

---

## 🎯 **Story Goal**

Create optimized database views and indexes to improve query performance for common messaging operations, including conversation list display, message search, and conversation statistics tracking.

---

## 📝 **User Story**

**As a** backend developer  
**I want to** create optimized views for common messaging queries  
**So that** the conversation list loads quickly and message search is performant

---

## ✅ **Acceptance Criteria**

- [ ] `conversation_list` view created with all required fields
- [ ] Full-text search index created on messages.content
- [ ] `conversation_stats` materialized view created
- [ ] Materialized view refresh function implemented
- [ ] conversation_list query returns results in < 100ms
- [ ] Message search query returns results in < 200ms
- [ ] Unread count calculation is accurate
- [ ] Views tested with sample data (1K+ conversations)
- [ ] Documentation complete with usage examples

---

## 🛢 **MCP Integration (Primary: Supabase MCP)**

### **Phase 1: Create conversation_list View**

```bash
# Create the view
warp mcp run supabase "apply_migration create_conversation_list_view"

# Test the view
warp mcp run supabase "execute_sql SELECT * FROM conversation_list ORDER BY last_message_at DESC LIMIT 10;"

# Verify all columns present
warp mcp run supabase "execute_sql SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'conversation_list';"

# Test unread count accuracy
warp mcp run supabase "execute_sql SELECT conversation_id, unread_count FROM conversation_list WHERE unread_count > 0;"
```

### **Phase 2: Create Full-Text Search Index**

```bash
# Add tsvector column
warp mcp run supabase "execute_sql ALTER TABLE messages ADD COLUMN content_tsv tsvector GENERATED ALWAYS AS (to_tsvector('english', coalesce(content, ''))) STORED;"

# Create GIN index
warp mcp run supabase "execute_sql CREATE INDEX idx_messages_content_search ON messages USING gin(content_tsv);"

# Verify index created
warp mcp run supabase "execute_sql SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'messages' AND indexname = 'idx_messages_content_search';"

# Test search query
warp mcp run supabase "execute_sql SELECT id, content, created_at FROM messages WHERE content_tsv @@ to_tsquery('english', 'hello') LIMIT 10;"

# Check search performance
warp mcp run supabase "execute_sql EXPLAIN ANALYZE SELECT * FROM messages WHERE content_tsv @@ to_tsquery('english', 'test') LIMIT 20;"
```

### **Phase 3: Create conversation_stats Materialized View**

```bash
# Create materialized view
warp mcp run supabase "apply_migration create_conversation_stats_view"

# Initial refresh
warp mcp run supabase "execute_sql REFRESH MATERIALIZED VIEW conversation_stats;"

# Test query
warp mcp run supabase "execute_sql SELECT * FROM conversation_stats ORDER BY total_messages DESC LIMIT 10;"

# Verify unique index
warp mcp run supabase "execute_sql SELECT indexname FROM pg_indexes WHERE tablename = 'conversation_stats';"

# Test concurrent refresh
warp mcp run supabase "execute_sql REFRESH MATERIALIZED VIEW CONCURRENTLY conversation_stats;"
```

### **Phase 4: Test Performance**

```bash
# Measure conversation_list query time
warp mcp run supabase "execute_sql EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM conversation_list ORDER BY last_message_at DESC LIMIT 50;"

# Measure search query time
warp mcp run supabase "execute_sql EXPLAIN ANALYZE SELECT * FROM messages WHERE content_tsv @@ to_tsquery('english', 'search & query') LIMIT 20;"

# Check view statistics
warp mcp run supabase "execute_sql SELECT schemaname, viewname, definition FROM pg_views WHERE schemaname = 'public' AND viewname = 'conversation_list';"
```

---

## 🧠 **MCP Integration (Secondary: Context7 MCP)**

```bash
# Analyze view performance
warp mcp run context7 "Review the conversation_list view SQL and suggest performance optimizations for the unread count subquery"

# Suggest JOIN optimizations
warp mcp run context7 "Analyze the conversation_list view and identify any JOIN operations that could be optimized"

# Review search implementation
warp mcp run context7 "Review the full-text search implementation and suggest improvements for multi-language support"
```

---

## 📋 **Implementation Tasks**

### **Task 1: Create conversation_list View** ⏱️ 4 hours

```sql
CREATE OR REPLACE VIEW conversation_list AS
SELECT 
  c.id AS conversation_id,
  c.type,
  c.participants,
  c.is_archived,
  c.is_muted,
  c.is_pinned,
  c.created_at,
  c.last_message_at,
  
  -- Last message details
  lm.id AS last_message_id,
  lm.content AS last_message_content,
  lm.type AS last_message_type,
  lm.sender_id AS last_message_sender_id,
  lm.created_at AS last_message_timestamp,
  
  -- Sender profile
  sender.full_name AS last_message_sender_name,
  sender.avatar_url AS last_message_sender_avatar,
  
  -- Other participant (for 1:1 conversations)
  CASE 
    WHEN c.type = 'direct' THEN
      (SELECT id FROM unnest(c.participants) AS id WHERE id != auth.uid() LIMIT 1)
  END AS other_participant_id,
  
  other_profile.full_name AS other_participant_name,
  other_profile.avatar_url AS other_participant_avatar,
  other_profile.is_online AS other_participant_online,
  
  -- Unread count
  (
    SELECT COUNT(*)
    FROM messages m
    LEFT JOIN message_read_receipts mrr ON mrr.message_id = m.id AND mrr.user_id = auth.uid()
    WHERE m.conversation_id = c.id
      AND m.sender_id != auth.uid()
      AND mrr.read_at IS NULL
      AND m.is_deleted = false
  ) AS unread_count
  
FROM conversations c

-- Last message
LEFT JOIN LATERAL (
  SELECT * FROM messages 
  WHERE conversation_id = c.id 
    AND is_deleted = false
  ORDER BY created_at DESC 
  LIMIT 1
) lm ON true

-- Last message sender
LEFT JOIN profiles sender ON sender.id = lm.sender_id

-- Other participant (for 1:1)
LEFT JOIN LATERAL (
  SELECT * FROM profiles
  WHERE id = (SELECT id FROM unnest(c.participants) AS id WHERE id != auth.uid() LIMIT 1)
) other_profile ON c.type = 'direct'

WHERE auth.uid() = ANY(c.participants);
```

### **Task 2: Add Full-Text Search** ⏱️ 2 hours

```sql
-- Add tsvector column (auto-generated from content)
ALTER TABLE messages ADD COLUMN content_tsv tsvector
  GENERATED ALWAYS AS (to_tsvector('english', coalesce(content, ''))) STORED;

-- Create GIN index for fast search
CREATE INDEX idx_messages_content_search ON messages USING gin(content_tsv);

-- Create search helper function
CREATE OR REPLACE FUNCTION search_messages(
  p_search_query TEXT,
  p_conversation_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  message_id UUID,
  conversation_id UUID,
  content TEXT,
  sender_id UUID,
  created_at TIMESTAMPTZ,
  rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.conversation_id,
    m.content,
    m.sender_id,
    m.created_at,
    ts_rank(m.content_tsv, to_tsquery('english', p_search_query)) AS rank
  FROM messages m
  JOIN conversations c ON c.id = m.conversation_id
  WHERE 
    m.content_tsv @@ to_tsquery('english', p_search_query)
    AND auth.uid() = ANY(c.participants)
    AND m.is_deleted = false
    AND (p_conversation_id IS NULL OR m.conversation_id = p_conversation_id)
  ORDER BY rank DESC, m.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
```

### **Task 3: Create conversation_stats Materialized View** ⏱️ 3 hours

```sql
CREATE MATERIALIZED VIEW conversation_stats AS
SELECT 
  c.id AS conversation_id,
  COUNT(m.id) AS total_messages,
  COUNT(DISTINCT m.sender_id) AS active_participants,
  MAX(m.created_at) AS last_activity,
  COUNT(CASE WHEN m.type = 'image' THEN 1 END) AS image_count,
  COUNT(CASE WHEN m.type = 'video' THEN 1 END) AS video_count,
  COUNT(CASE WHEN m.shared_coupon_id IS NOT NULL THEN 1 END) AS shared_coupons_count,
  COUNT(CASE WHEN m.shared_deal_id IS NOT NULL THEN 1 END) AS shared_deals_count
FROM conversations c
LEFT JOIN messages m ON m.conversation_id = c.id AND m.is_deleted = false
GROUP BY c.id;

-- Create unique index for concurrent refresh
CREATE UNIQUE INDEX idx_conversation_stats_id ON conversation_stats(conversation_id);

-- Create refresh function
CREATE OR REPLACE FUNCTION refresh_conversation_stats()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY conversation_stats;
END;
$$ LANGUAGE plpgsql;
```

### **Task 4: Create Usage Examples** ⏱️ 1 hour

Document common query patterns:
- Get conversation list sorted by recent activity
- Search messages in a specific conversation
- Get conversation statistics
- Filter unread conversations

### **Task 5: Performance Testing** ⏱️ 2 hours
- Test with 1K conversations
- Test with 100K messages
- Measure query times
- Verify index usage

---

## 🧪 **Testing Checklist**

### **conversation_list View Tests**
- [ ] Returns all user's conversations
- [ ] Shows last message details correctly
- [ ] Calculates unread count accurately
- [ ] Shows other participant info for 1:1 chats
- [ ] Sorts by last_message_at correctly
- [ ] Performance < 100ms with 1K conversations
- [ ] RLS enforced (users only see their conversations)

### **Full-Text Search Tests**
- [ ] Search finds exact word matches
- [ ] Search finds partial matches
- [ ] Search respects RLS (only user's conversations)
- [ ] Search excludes deleted messages
- [ ] Search ranking works correctly
- [ ] Performance < 200ms with 100K messages
- [ ] Index is used (no sequential scan)

### **conversation_stats Tests**
- [ ] Counts total messages correctly
- [ ] Counts media correctly
- [ ] Counts shared coupons/deals correctly
- [ ] Refresh completes without errors
- [ ] Concurrent refresh works
- [ ] Statistics are accurate after refresh

---

## 📊 **Success Metrics**

| Metric | Target | How to Measure |
|--------|--------|----------------|
| **conversation_list Query** | < 100ms | EXPLAIN ANALYZE |
| **Search Query** | < 200ms | EXPLAIN ANALYZE |
| **Unread Count Accuracy** | 100% | Manual verification |
| **Materialized View Refresh** | < 5s | Measure execution time |
| **Index Usage** | 100% | Check EXPLAIN plans |
| **View Data Accuracy** | 100% | Compare with raw queries |

---

## 🔗 **Dependencies**

**Requires:**
- ✅ Story 8.1.1 (All tables exist)
- ✅ Story 8.1.4 (Functions for testing)
- ✅ profiles table

**Enables:**
- Frontend conversation list UI
- Message search feature
- Conversation statistics dashboard

---

## 📦 **Deliverables**

1. **Migration File**: `supabase/migrations/20250205_create_messaging_views.sql`
2. **View Documentation**: `docs/messaging/DATABASE_VIEWS.md`
3. **Usage Examples**: SQL queries for common patterns
4. **Performance Report**: Benchmark results with large datasets

---

## 🚨 **Edge Cases**

1. **Empty conversations**: View should handle conversations with no messages
2. **Deleted messages**: Should not appear in last_message or stats
3. **Blocked users**: Messages from blocked users handled by RLS
4. **Large conversations**: 10K+ messages per conversation
5. **Concurrent refreshes**: Materialized view refresh during queries
6. **Search special characters**: Handle quotes, apostrophes, etc.

---

## 💡 **Usage Examples**

### **Get Conversation List**
```sql
-- Get all conversations sorted by recent activity
SELECT * FROM conversation_list
ORDER BY last_message_at DESC NULLS LAST;

-- Get only unread conversations
SELECT * FROM conversation_list
WHERE unread_count > 0
ORDER BY last_message_at DESC;

-- Get pinned conversations
SELECT * FROM conversation_list
WHERE is_pinned = true
ORDER BY last_message_at DESC;
```

### **Search Messages**
```sql
-- Search all messages
SELECT * FROM search_messages('hello world');

-- Search within specific conversation
SELECT * FROM search_messages('hello', 'conversation-id-here');

-- Search with limit
SELECT * FROM search_messages('search query', NULL, 50);
```

### **Get Conversation Stats**
```sql
-- Get stats for all conversations
SELECT * FROM conversation_stats
ORDER BY total_messages DESC;

-- Get most active conversations
SELECT * FROM conversation_stats
WHERE total_messages > 100
ORDER BY last_activity DESC;
```

---

## ✅ **Definition of Done**

- [ ] conversation_list view created and tested
- [ ] Full-text search index created
- [ ] search_messages function implemented
- [ ] conversation_stats materialized view created
- [ ] Refresh function implemented
- [ ] All performance targets met
- [ ] Usage examples documented
- [ ] Integration tested with frontend queries
- [ ] Code reviewed and approved

---

**Story Status:** 📋 Ready for Implementation  
**Next Story:** [STORY 8.1.6 - Data Retention & Cleanup](./STORY_8.1.6_Data_Retention_Cleanup.md)
