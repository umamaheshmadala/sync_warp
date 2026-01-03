# 📝 Epic 8.1 - Remaining Story Templates (8.1.5-8.1.8)

**Status:** Ready for Story Creation  
**Stories Completed:** 4/8 (50%)  
**Remaining:** 4 stories  

---

## ✅ **Completed Stories (4/8)**

1. ✅ STORY_8.1.1_Core_Database_Tables_Schema.md (390 lines)
2. ✅ STORY_8.1.2_RLS_Implementation.md (282 lines)
3. ✅ STORY_8.1.3_Storage_Bucket_Setup.md (360 lines)
4. ✅ STORY_8.1.4_Core_Database_Functions.md (525 lines)

---

## 📋 **Story Templates for Creation**

### **STORY 8.1.5: Optimized Database Views**

**File:** `STORY_8.1.5_Optimized_Database_Views.md`  
**Effort:** 2 days  
**Priority:** 🟡 High

**Key Components:**
1. **conversation_list view** - Main view for conversation list UI
   ```sql
   - Last message details (content, type, sender)
   - Sender profile (name, avatar)
   - Other participant info (for 1:1 chats)
   - Unread count calculation (optimized subquery)
   - Sort by last_message_at
   ```

2. **Full-text search index** on messages.content
   ```sql
   - Add tsvector column (generated)
   - CREATE INDEX using GIN
   - Test search performance
   ```

3. **conversation_stats materialized view**
   ```sql
   - Total messages per conversation
   - Active participants count
   - Image count, video count
   - Shared coupon/deal counts
   - Last activity timestamp
   ```

4. **Refresh strategy** for materialized views
   ```sql
   - REFRESH MATERIALIZED VIEW CONCURRENTLY
   - Schedule (daily or on-demand)
   ```

**MCP Commands:**
- Supabase MCP: Create views, test queries, refresh materialized views, verify indexes
- Context7 MCP: Analyze query performance, suggest JOIN optimizations

**Success Metrics:**
- conversation_list query < 100ms
- Search query < 200ms
- Unread count accurate
- Materialized view refresh < 5 seconds

---

### **STORY 8.1.6: Data Retention & Cleanup Jobs**

**File:** `STORY_8.1.6_Data_Retention_Cleanup.md`  
**Effort:** 2 days  
**Priority:** 🟡 High

**Key Components:**
1. **archive_old_messages() function** - 90-day retention
   ```sql
   - Soft delete messages older than 90 days
   - Return count of archived messages
   - Performance: Process in batches
   ```

2. **cleanup_orphaned_data() function**
   ```sql
   - Delete read receipts for deleted messages (>7 days)
   - Delete typing indicators (>1 minute)
   - Delete edit history (>30 days)
   ```

3. **Storage cleanup integration**
   ```sql
   - List files older than 90 days
   - Delete from storage bucket
   - Log cleanup operations
   ```

4. **Admin dashboard** for monitoring
   ```typescript
   - Display cleanup statistics
   - Manual trigger option
   - Cleanup history log
   ```

**MCP Commands:**
- Supabase MCP: Create functions, test execution, deploy edge function
- Context7 MCP: Review cleanup logic, suggest batch optimization

**Success Metrics:**
- Messages archived: 100% of 90+ day old
- Orphaned data cleaned: 100%
- Zero downtime during cleanup
- Performance: < 30s for 10K messages

**Note:** Full automation is handled in Epic 8.9

---

### **STORY 8.1.7: Performance Testing & Optimization**

**File:** `STORY_8.1.7_Performance_Testing_Optimization.md`  
**Effort:** 2 days  
**Priority:** 🟡 High

**Key Components:**
1. **Load Testing**
   ```bash
   - Seed 100K messages
   - Seed 10K conversations
   - Seed 1K users
   ```

2. **Query Performance Analysis** with EXPLAIN ANALYZE
   ```sql
   - Message fetch query
   - Conversation list query
   - Unread count query
   - Search query
   ```

3. **Index Usage Verification**
   ```sql
   - pg_stat_user_indexes
   - Verify no sequential scans
   - Check index hit rate
   ```

4. **Realtime Performance**
   ```typescript
   - Subscription latency
   - Broadcast performance
   - Connection stability
   ```

5. **Storage Performance**
   ```typescript
   - Upload speed benchmarks
   - Download speed tests
   - Signed URL generation time
   ```

**MCP Commands:**
- Supabase MCP: EXPLAIN ANALYZE, check index usage, view slow queries, table statistics
- Context7 MCP: Analyze schema for bottlenecks, suggest missing indexes

**Success Metrics:**
- Message fetch: < 50ms
- Conversation list: < 100ms
- Unread count: < 50ms
- Realtime latency: < 300ms
- No sequential scans: 100%

---

### **STORY 8.1.8: Integration with Existing Systems**

**File:** `STORY_8.1.8_System_Integration_Testing.md`  
**Effort:** 2 days  
**Priority:** 🔴 Critical

**Key Components:**
1. **Friendships Integration**
   ```sql
   - Verify conversation creation requires friendship
   - Test friendship status changes
   - Test conversation access after unfriending
   ```

2. **Shares Table Integration**
   ```sql
   - Test coupon share tracking
   - Test deal share tracking
   - Verify share_method = 'message'
   - Verify share analytics work
   ```

3. **Notifications Integration**
   ```sql
   - Test message_received notifications
   - Test message_reply notifications
   - Test coupon_shared_message notifications
   - Test deal_shared_message notifications
   ```

4. **Blocked Users Integration**
   ```sql
   - Verify blocked user cannot send message
   - Verify blocked user messages hidden
   - Test bidirectional blocking
   ```

5. **Auth System Integration**
   ```sql
   - Test auth.uid() in all functions
   - Test RLS with different users
   - Verify session expiration handling
   ```

6. **Friend Service Updates**
   ```typescript
   - Add messaging CTA to friend profile
   - Show last message preview (if exists)
   - Navigate to conversation
   ```

**MCP Commands:**
- Supabase MCP: Test integrations, verify foreign keys, check enum types, test cross-table queries
- Context7 MCP: Find all integration points in codebase, analyze existing services

**Success Metrics:**
- Only friends can message: 100%
- Shares tracked: 100%
- Notifications created: 100%
- Blocked users prevented: 100%
- Auth integration: 100%

**Acceptance Criteria:**
- [ ] Conversation requires friendship
- [ ] Coupon shares tracked in shares table
- [ ] Deal shares tracked in shares table
- [ ] Notifications created for messages
- [ ] Blocked users cannot message
- [ ] Auth flow works correctly
- [ ] Friend service integrated
- [ ] End-to-end integration tested

---

## 🎯 **Implementation Instructions**

For each remaining story, create a full story file following this structure:

### **Standard Story Template:**
```markdown
# [Icon] STORY X.X.X: [Title]

**Parent Epic:** Link to epic  
**Story Owner:** Role  
**Estimated Effort:** X days  
**Priority:** Level  
**Status:** 📋 Ready  
**Depends On:** Previous stories

---

## 🎯 Story Goal
[Clear, concise goal statement]

## 📝 User Story
As a [role]
I want to [action]
So that [benefit]

## ✅ Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2
...

## 🛢 MCP Integration (Primary: Supabase MCP)
### Phase 1: [Name]
```bash
# Commands here
```

### Phase 2: [Name]
...

## 🧠 MCP Integration (Secondary: Context7 MCP)
```bash
# Analysis commands
```

## 📋 Implementation Tasks
### Task 1: [Name] ⏱️ X hours
- Details
- Code examples

## 🧪 Testing Checklist
- [ ] Test 1
- [ ] Test 2
...

## 📊 Success Metrics
| Metric | Target | How to Measure |

## 🔗 Dependencies
**Requires:**
- Items

**Enables:**
- Items

## 📦 Deliverables
1. Item 1
2. Item 2
...

## 🚨 Edge Cases
1. Case 1
2. Case 2
...

## ✅ Definition of Done
- [ ] Item 1
- [ ] Item 2
...

---

**Story Status:** 📋 Ready  
**Next Story:** Link
```

---

## 📊 **Progress Tracking**

**Phase 1 Complete:** Stories 8.1.1 - 8.1.4 ✅  
**Phase 2 To Do:** Stories 8.1.5 - 8.1.8 ⏳

Once all 8 stories are created:
1. Run final audit comparing stories to parent epic
2. Verify 100% epic coverage
3. Verify all MCP commands documented
4. Update EPIC_8.1_STORY_BREAKDOWN_STATUS.md

---

## ✅ **Completion Checklist**

- [x] Story 8.1.1 created (Core Tables)
- [x] Story 8.1.2 created (RLS)
- [x] Story 8.1.3 created (Storage)
- [x] Story 8.1.4 created (Functions)
- [ ] Story 8.1.5 created (Views)
- [ ] Story 8.1.6 created (Cleanup)
- [ ] Story 8.1.7 created (Performance)
- [ ] Story 8.1.8 created (Integration)
- [ ] Final audit completed
- [ ] All stories committed and pushed

---

**Next Action:** Create full story files for 8.1.5-8.1.8 using the templates above and following the pattern of stories 8.1.1-8.1.4.
