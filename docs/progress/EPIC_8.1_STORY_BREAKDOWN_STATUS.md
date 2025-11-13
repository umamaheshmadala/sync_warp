# 📊 EPIC 8.1 Story Breakdown Status

**Epic:** EPIC 8.1 - Messaging Foundation & Database Architecture  
**Total Stories:** 8  
**Created:** 2 / 8  
**Status:** 🔄 In Progress

---

## ✅ **Stories Created (2/8)**

### ✅ **STORY 8.1.1: Core Database Tables Schema Creation**
- **File:** `docs/stories/STORY_8.1.1_Core_Database_Tables_Schema.md`
- **Effort:** 2 days
- **Status:** Ready for Implementation
- **Coverage:**
  - All 7 core tables (conversations, messages, message_read_receipts, conversation_participants, message_edits, typing_indicators, blocked_users)
  - All indexes (GIN, composite, partial)
  - All constraints (CHECK, foreign keys)
  - Realtime enablement
  - Auto-cleanup trigger for typing indicators
  - Full MCP integration (Supabase + Context7)
  - Comprehensive testing checklist

### ✅ **STORY 8.1.2: Row Level Security (RLS) Implementation**
- **File:** `docs/stories/STORY_8.1.2_RLS_Implementation.md`
- **Effort:** 3 days
- **Status:** Ready for Implementation
- **Coverage:**
  - RLS enablement on all 7 tables
  - Conversations RLS policies (3 policies)
  - Messages RLS policies (4 policies)
  - Read receipts RLS policies (3 policies)
  - Other tables RLS policies
  - Blocking logic integration
  - Edit window enforcement (15 minutes)
  - Friendship validation
  - Full MCP integration (Supabase + Context7)
  - Security testing checklist
  - Edge case documentation

---

## 📋 **Stories To Be Created (6/8)**

### ⏳ **STORY 8.1.3: Storage Bucket Setup**
**Estimated Effort:** 2 days  
**Priority:** 🔴 Critical

**Must Cover:**
- Create `message-attachments` storage bucket
- Configure file size limits (25MB)
- Set allowed MIME types (images/videos)
- Create RLS policies for storage bucket (3 policies):
  - Users can upload to their own folders
  - Users can view attachments in their conversations
  - Users can delete their own attachments
- Test file upload/download with signed URLs
- Configure CORS for web/mobile
- File path structure: `{user_id}/{conversation_id}/{timestamp}-{filename}`
- Thumbnail generation setup

**MCP Commands:**
- Supabase MCP: Create bucket, set policies, test uploads
- Context7 MCP: Analyze storage security, suggest optimization

---

### ⏳ **STORY 8.1.4: Core Database Functions**
**Estimated Effort:** 3 days  
**Priority:** 🔴 Critical

**Must Cover:**
- `send_message()` function - Atomic message creation with:
  - Auto-receipt generation
  - Conversation timestamp update
  - Integration with shares table for coupon/deal tracking
  - Participant validation
- `mark_message_as_read()` function
- `get_unread_message_count()` function
- `create_or_get_conversation()` function - Prevents duplicates
- Auto-update conversation timestamp trigger
- Extend `notification_type` enum for messaging
- Unit tests for all functions
- Error handling for edge cases

**MCP Commands:**
- Supabase MCP: Create functions, test execution, verify triggers
- Context7 MCP: Analyze for race conditions, SQL injection, edge cases

---

### ⏳ **STORY 8.1.5: Optimized Database Views**
**Estimated Effort:** 2 days  
**Priority:** 🟡 High

**Must Cover:**
- `conversation_list` view - Optimized query for conversation list UI:
  - Last message details
  - Sender profile
  - Other participant info (for 1:1)
  - Unread count calculation
- Full-text search index on messages.content
- `conversation_stats` materialized view:
  - Total messages
  - Active participants
  - Media counts
  - Shared coupon/deal counts
- Refresh schedule for materialized views
- Performance testing with sample data

**MCP Commands:**
- Supabase MCP: Create views, test queries, verify indexes, refresh materialized views
- Context7 MCP: Analyze query performance, suggest optimizations

---

### ⏳ **STORY 8.1.6: Data Retention & Cleanup Jobs**
**Estimated Effort:** 2 days  
**Priority:** 🟡 High

**Must Cover:**
- `archive_old_messages()` function - 90-day retention policy
- `cleanup_orphaned_data()` function:
  - Delete read receipts for deleted messages
  - Delete old typing indicators
  - Delete old edit history
- Set up scheduled job trigger (pg_cron or edge function)
- Create admin dashboard for retention monitoring
- Test cleanup logic with old test data
- Storage bucket file cleanup integration

**MCP Commands:**
- Supabase MCP: Create cleanup functions, test execution, deploy edge function
- Context7 MCP: Review cleanup logic, suggest storage optimization

**Note:** Full automation handled in Epic 8.9

---

### ⏳ **STORY 8.1.7: Performance Testing & Optimization**
**Estimated Effort:** 2 days  
**Priority:** 🟡 High

**Must Cover:**
- Load testing with 100K messages
- Query performance analysis with EXPLAIN ANALYZE:
  - Message fetch queries
  - Conversation list queries
  - Unread count queries
- Optimize slow queries (if any)
- Test Realtime subscription performance
- Benchmark storage upload/download speeds
- Document performance baseline metrics
- Verify no sequential scans in query plans
- Index usage statistics

**MCP Commands:**
- Supabase MCP: Run EXPLAIN ANALYZE, check index usage, view slow queries
- Context7 MCP: Analyze schema for bottlenecks, review query patterns

**Success Metrics:**
- Message fetch < 50ms
- Conversation list load < 100ms
- No sequential scans
- Realtime latency < 300ms

---

### ⏳ **STORY 8.1.8: Integration with Existing Systems**
**Estimated Effort:** 2 days  
**Priority:** 🔴 Critical

**Must Cover:**
- Verify integration with `friendships` table
- Test integration with `shares` table (coupon/deal tracking):
  - Message with shared_coupon_id creates share record
  - Message with shared_deal_id creates share record
- Extend `notifications` table types:
  - `message_received`
  - `message_reply`
  - `coupon_shared_message`
  - `deal_shared_message`
- Test block functionality with `blocked_users`
- Verify auth flow with existing auth system
- Update existing friend service to support messaging
- End-to-end integration testing

**MCP Commands:**
- Supabase MCP: Test table integrations, verify foreign keys, check enum types
- Context7 MCP: Find integration points in codebase, analyze existing services

**Acceptance Criteria:**
- Only friends can start conversations
- Coupon shares tracked in shares table
- Notifications created for new messages
- Blocked users cannot message each other

---

## 📊 **Overall Epic Coverage Analysis**

### **Components Fully Covered:**
- ✅ Core Tables Schema (Story 8.1.1)
- ✅ Row Level Security (Story 8.1.2)
- ⏳ Storage Bucket (Story 8.1.3 - to be created)
- ⏳ Database Functions (Story 8.1.4 - to be created)
- ⏳ Database Views (Story 8.1.5 - to be created)
- ⏳ Data Retention (Story 8.1.6 - to be created)
- ⏳ Performance Testing (Story 8.1.7 - to be created)
- ⏳ System Integration (Story 8.1.8 - to be created)

### **MCP Integration Coverage:**
- ✅ Supabase MCP: Heavily integrated in all stories
- ✅ Context7 MCP: Used for analysis and security review in all stories
- ✅ Chrome DevTools MCP: Not applicable for database-focused epic
- ✅ Puppeteer MCP: Not applicable for database-focused epic
- ✅ Shadcn MCP: Mentioned for admin dashboards (low usage)

### **Missing from Stories (To be added):**
- None - All epic components are covered in the 8 stories

---

## 🎯 **Next Actions**

1. **Create Story 8.1.3** (Storage Bucket Setup)
2. **Create Story 8.1.4** (Core Database Functions)
3. **Create Story 8.1.5** (Optimized Database Views)
4. **Create Story 8.1.6** (Data Retention & Cleanup)
5. **Create Story 8.1.7** (Performance Testing)
6. **Create Story 8.1.8** (System Integration)
7. **Final Audit**: Compare all 8 stories to parent epic to ensure 100% coverage

---

## ✅ **Epic 8.1 Breakdown Completion Checklist**

- [x] Story 8.1.1 created with full MCP integration
- [x] Story 8.1.2 created with full MCP integration
- [ ] Story 8.1.3 created with full MCP integration
- [ ] Story 8.1.4 created with full MCP integration
- [ ] Story 8.1.5 created with full MCP integration
- [ ] Story 8.1.6 created with full MCP integration
- [ ] Story 8.1.7 created with full MCP integration
- [ ] Story 8.1.8 created with full MCP integration
- [ ] Final audit: Compare stories to epic (100% coverage)
- [ ] Cross-reference MCP commands between stories and epic
- [ ] Verify all acceptance criteria from epic are in stories
- [ ] Verify all success metrics are measurable in stories

---

**Status:** 🔄 25% Complete (2/8 stories created)  
**Next Story:** STORY_8.1.3_Storage_Bucket_Setup.md
