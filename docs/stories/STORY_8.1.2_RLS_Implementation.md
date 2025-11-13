# 🔒 STORY 8.1.2: Row Level Security (RLS) Implementation

**Parent Epic:** [EPIC 8.1 - Messaging Foundation & Database Architecture](../epics/EPIC_8.1_Messaging_Foundation_Database.md)  
**Story Owner:** Backend Engineering / Security  
**Estimated Effort:** 3 days  
**Priority:** 🔴 Critical (Security requirement)  
**Status:** 📋 Ready for Implementation  
**Depends On:** Story 8.1.1 (Core Tables)

---

## 🎯 **Story Goal**

Implement comprehensive Row Level Security (RLS) policies for all messaging tables to ensure users can only access their own conversations and messages, with proper blocking and friendship validation.

---

## 📱 **Platform Support**

| Platform | Support | Implementation Notes |
|----------|---------|---------------------|
| **Web** | ✅ Full | RLS enforced server-side for all supabase-js queries |
| **iOS** | ✅ Full | Same RLS policies via supabase-js (no native changes needed) |
| **Android** | ✅ Full | Same RLS policies via supabase-js (no native changes needed) |

### Architecture Notes
**RLS is server-side security - platform-agnostic by design.**

- **Enforcement**: Postgres RLS policies enforced at database level
- **Authentication**: Uses `auth.uid()` from Supabase Auth JWT token
- **Mobile Tokens**: 
  - Web: JWT stored in LocalStorage
  - iOS/Android: JWT stored in Capacitor SecureStorage (Epic 7.2)
  - All platforms send JWT in Authorization header

### Mobile-Specific RLS Considerations

1. **Token Persistence**:
   - Mobile apps maintain session across app restarts via SecureStorage
   - RLS policies work identically - JWT token provides user identity

2. **Offline Behavior**:
   - RLS checks cannot run offline (database is unreachable)
   - Mobile apps should cache allowed data locally
   - Re-validate on reconnection (Epic 8.4 offline support)

3. **Background Sync**:
   - iOS/Android background processes use same JWT token
   - RLS policies enforce same rules for background queries

4. **Push Notifications**:
   - Backend push service runs with service role (bypasses RLS)
   - Client-side RLS still enforces on message retrieval

**No Capacitor plugins required** - RLS is pure server-side security.

---

## 📝 **User Story**

**As a** security engineer  
**I want to** implement RLS policies on all messaging tables  
**So that** user data is protected and users can only see messages they're authorized to access

---

## ✅ **Acceptance Criteria**

- [ ] RLS enabled on all 7 messaging tables
- [ ] Conversations table: Users only see conversations they're part of
- [ ] Messages table: Users only see messages in their conversations
- [ ] Blocked users cannot send messages to each other
- [ ] Blocked users' messages are hidden
- [ ] Edit policy enforces 15-minute time window
- [ ] Read receipts only visible to message senders
- [ ] RLS tested with automated security tests
- [ ] No data leakage between users verified

---

## 🛢 **MCP Integration (Primary: Supabase MCP)**

### **Phase 1: Enable RLS on All Tables**

```bash
# Enable RLS on all messaging tables
warp mcp run supabase "execute_sql ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;"
warp mcp run supabase "execute_sql ALTER TABLE messages ENABLE ROW LEVEL SECURITY;"
warp mcp run supabase "execute_sql ALTER TABLE message_read_receipts ENABLE ROW LEVEL SECURITY;"
warp mcp run supabase "execute_sql ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;"
warp mcp run supabase "execute_sql ALTER TABLE message_edits ENABLE ROW LEVEL SECURITY;"
warp mcp run supabase "execute_sql ALTER TABLE typing_indicators ENABLE ROW LEVEL SECURITY;"
warp mcp run supabase "execute_sql ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;"

# Verify RLS enabled
warp mcp run supabase "execute_sql SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('conversations', 'messages', 'message_read_receipts', 'conversation_participants', 'message_edits', 'typing_indicators', 'blocked_users');"
```

### **Phase 2: Create Conversations RLS Policies**

```bash
# Policy 1: View conversations
warp mcp run supabase "execute_sql CREATE POLICY \"Users can view their conversations\" ON conversations FOR SELECT TO authenticated USING (auth.uid() = ANY(participants));"

# Policy 2: Create conversations (with friendship validation)
warp mcp run supabase "execute_sql CREATE POLICY \"Users can create direct conversations\" ON conversations FOR INSERT TO authenticated WITH CHECK (type = 'direct' AND array_length(participants, 1) = 2 AND auth.uid() = ANY(participants) AND EXISTS (SELECT 1 FROM friendships f WHERE ((f.user1_id = auth.uid() AND f.user2_id = ANY(participants)) OR (f.user2_id = auth.uid() AND f.user1_id = ANY(participants)))) AND NOT EXISTS (SELECT 1 FROM blocked_users b WHERE ((b.blocker_id = auth.uid() AND b.blocked_id = ANY(participants)) OR (b.blocker_id = ANY(participants) AND b.blocked_id = auth.uid()))));"

# Policy 3: Update conversations
warp mcp run supabase "execute_sql CREATE POLICY \"Users can update conversation settings\" ON conversations FOR UPDATE TO authenticated USING (auth.uid() = ANY(participants)) WITH CHECK (auth.uid() = ANY(participants));"

# Verify policies created
warp mcp run supabase "execute_sql SELECT policyname, tablename, cmd FROM pg_policies WHERE tablename = 'conversations';"
```

### **Phase 3: Create Messages RLS Policies**

```bash
# Policy 1: View messages (with blocking check)
warp mcp run supabase "execute_sql CREATE POLICY \"Users can view conversation messages\" ON messages FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM conversations c WHERE c.id = messages.conversation_id AND auth.uid() = ANY(c.participants)) AND NOT EXISTS (SELECT 1 FROM blocked_users b WHERE b.blocker_id = auth.uid() AND b.blocked_id = messages.sender_id));"

# Policy 2: Send messages
warp mcp run supabase "execute_sql CREATE POLICY \"Users can send messages\" ON messages FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid() AND EXISTS (SELECT 1 FROM conversations c WHERE c.id = conversation_id AND auth.uid() = ANY(c.participants)) AND NOT EXISTS (SELECT 1 FROM blocked_users b JOIN conversations c ON c.id = messages.conversation_id WHERE b.blocker_id = ANY(c.participants) AND b.blocker_id != auth.uid() AND b.blocked_id = auth.uid()));"

# Policy 3: Edit messages (15-minute window)
warp mcp run supabase "execute_sql CREATE POLICY \"Users can edit their own recent messages\" ON messages FOR UPDATE TO authenticated USING (sender_id = auth.uid() AND is_deleted = false AND created_at > now() - INTERVAL '15 minutes') WITH CHECK (sender_id = auth.uid() AND is_deleted = false);"

# Policy 4: Delete messages (soft delete)
warp mcp run supabase "execute_sql CREATE POLICY \"Users can delete their own messages\" ON messages FOR UPDATE TO authenticated USING (sender_id = auth.uid()) WITH CHECK (sender_id = auth.uid());"

# Verify policies
warp mcp run supabase "execute_sql SELECT policyname, tablename, cmd FROM pg_policies WHERE tablename = 'messages';"
```

### **Phase 4: Test RLS Policies**

```bash
# Test 1: User can see their own conversations
warp mcp run supabase "execute_sql SELECT * FROM conversations WHERE auth.uid() = ANY(participants) LIMIT 5;"

# Test 2: User cannot see other conversations (should return 0 rows)
warp mcp run supabase "execute_sql SELECT COUNT(*) FROM conversations WHERE NOT (auth.uid() = ANY(participants));"

# Test 3: Verify blocked user messages hidden
warp mcp run supabase "execute_sql SELECT COUNT(*) FROM messages WHERE sender_id IN (SELECT blocked_id FROM blocked_users WHERE blocker_id = auth.uid());"

# Test 4: Check edit time window enforcement
warp mcp run supabase "execute_sql UPDATE messages SET content = 'edited' WHERE sender_id = auth.uid() AND created_at < now() - INTERVAL '20 minutes'; -- Should fail or return 0"
```

---

## 🧠 **MCP Integration (Secondary: Context7 MCP)**

```bash
# Analyze RLS policy coverage
warp mcp run context7 "Review all messaging tables and identify any tables missing RLS policies or security gaps"

# Security vulnerability analysis
warp mcp run context7 "Analyze the RLS policies for conversations and messages tables and identify potential security vulnerabilities or bypasses"

# Suggest improvements
warp mcp run context7 "Review the blocked_users RLS implementation and suggest improvements for bidirectional blocking"
```

---

## 📋 **Implementation Tasks**

### **Task 1: Conversations Table RLS** ⏱️ 3 hours
- Enable RLS
- Create SELECT policy (participants only)
- Create INSERT policy (friendship + blocking checks)
- Create UPDATE policy
- Test with multiple users

### **Task 2: Messages Table RLS** ⏱️ 4 hours
- Enable RLS
- Create SELECT policy with blocking check
- Create INSERT policy with blocking validation
- Create UPDATE policy for edits (15-minute window)
- Create UPDATE policy for deletes
- Test edit window enforcement
- Test blocking scenarios

### **Task 3: Read Receipts RLS** ⏱️ 2 hours
```sql
-- Enable RLS
ALTER TABLE message_read_receipts ENABLE ROW LEVEL SECURITY;

-- Policy 1: Senders can view read receipts
CREATE POLICY "Senders can view read receipts"
ON message_read_receipts FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM messages m
    WHERE m.id = message_id AND m.sender_id = auth.uid()
  )
);

-- Policy 2: System can create read receipts
CREATE POLICY "System can create read receipts"
ON message_read_receipts FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Policy 3: Users can update their own read receipts
CREATE POLICY "Users can update their own read receipts"
ON message_read_receipts FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
```

### **Task 4: Other Tables RLS** ⏱️ 3 hours
- `conversation_participants`: User-specific policies
- `message_edits`: View own message edits only
- `typing_indicators`: Conversation participants only
- `blocked_users`: User can manage their own blocks

### **Task 5: Security Testing** ⏱️ 4 hours
- Test with different user roles
- Attempt unauthorized access
- Test blocking scenarios
- Test edit window edge cases
- Verify no data leakage

### **Task 6: Documentation** ⏱️ 2 hours
- Document all RLS policies
- Create security test cases
- Document edge cases
- Create RLS troubleshooting guide

---

## 🧪 **Testing Checklist**

### **Positive Tests (Should Work)**
- [ ] User can view their own conversations
- [ ] User can send message in their conversation
- [ ] User can edit their recent message (<15 min)
- [ ] User can delete their own message
- [ ] User can view read receipts for messages they sent
- [ ] User can block another user
- [ ] User can view their blocked users list

### **Negative Tests (Should Fail/Be Blocked)**
- [ ] User CANNOT view other users' conversations
- [ ] User CANNOT send message to blocked user
- [ ] Blocked user's messages are hidden
- [ ] User CANNOT edit messages older than 15 minutes
- [ ] User CANNOT delete other users' messages
- [ ] User CANNOT view read receipts for others' messages
- [ ] User CANNOT create conversation without friendship

### **Edge Cases**
- [ ] Bidirectional blocking works correctly
- [ ] Edit window exactly at 15-minute boundary
- [ ] Conversation with exactly 2 participants
- [ ] Read receipt for own message (should not exist)

---

## 📊 **Success Metrics**

| Metric | Target | How to Measure |
|--------|--------|----------------|
| **RLS Coverage** | 100% | All tables have RLS enabled |
| **Policy Count** | 15+ | Count from `pg_policies` |
| **Security Tests Pass** | 100% | Automated test suite |
| **Data Leakage** | 0 | Penetration testing |
| **Edit Window Accuracy** | 100% | Test at boundary conditions |

---

## 🔗 **Dependencies**

**Requires:**
- ✅ Story 8.1.1 (All tables created)
- ✅ Existing `friendships` table
- ✅ Auth system with `auth.uid()` function

**Enables:**
- Story 8.1.4 (Database Functions) - RLS must be in place
- All frontend messaging features

---

## 📦 **Deliverables**

1. **Migration File**: `supabase/migrations/20250202_enable_rls_messaging.sql`
2. **Security Documentation**: `docs/messaging/RLS_POLICIES.md`
3. **Test Suite**: `tests/security/messaging_rls.test.ts`
4. **Policy Reference**: Quick reference guide for all policies

---

## 🚨 **Security Edge Cases**

1. **Race condition on edit window**: User edits just before 15-minute mark
2. **Block after message sent**: Message already delivered but user blocks sender
3. **Friendship revoked**: Existing conversation still accessible
4. **Self-messaging**: Prevented by conversation creation validation
5. **Admin override**: Consider service role bypass for moderation

---

## ✅ **Definition of Done**

- [ ] RLS enabled on all 7 tables
- [ ] All policies created and tested
- [ ] Security tests passing (100%)
- [ ] No unauthorized data access possible
- [ ] Edit window enforced correctly
- [ ] Blocking logic verified
- [ ] Documentation complete
- [ ] Code reviewed by security team
- [ ] Penetration testing completed

---

**Story Status:** 📋 Ready for Implementation  
**Next Story:** [STORY 8.1.3 - Storage Bucket Setup](./STORY_8.1.3_Storage_Bucket_Setup.md)
