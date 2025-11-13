# ⚙️ STORY 8.1.4: Core Database Functions Implementation

**Parent Epic:** [EPIC 8.1 - Messaging Foundation & Database Architecture](../epics/EPIC_8.1_Messaging_Foundation_Database.md)  
**Story Owner:** Backend Engineering  
**Estimated Effort:** 3 days  
**Priority:** 🔴 Critical  
**Status:** 📋 Ready for Implementation  
**Depends On:** Story 8.1.1 (Core Tables), Story 8.1.2 (RLS)

---

## 🎯 **Story Goal**

Implement core database functions and triggers that provide atomic operations for messaging, including message sending with auto-receipt generation, read tracking, unread count calculation, and conversation management. These functions ensure data consistency and integrate with the existing coupon/deal sharing system.

---

## 📱 **Platform Support**

| Platform | Support | Implementation Notes |
|----------|---------|---------------------|
| **Web** | ✅ Full | Functions called via supabase-js `.rpc()` method |
| **iOS** | ✅ Full | Same functions via supabase-js (no native changes needed) |
| **Android** | ✅ Full | Same functions via supabase-js (no native changes needed) |

### Architecture Notes
**Database functions are server-side - platform-agnostic by design.**

- **Execution**: Postgres functions run server-side
- **Invocation**: All platforms use `supabase.rpc('function_name', params)`
- **Atomicity**: Transactions ensure consistency across platforms

### Mobile-Specific Function Considerations

1. **Network Optimization**:
   - Functions reduce round trips (atomic operations)
   - Single RPC call vs multiple queries
   - Especially beneficial for mobile networks (high latency)

2. **Offline Message Sending** (Epic 8.4):
   ```typescript
   // Mobile: Queue for later if offline
   if (Capacitor.isNativePlatform() && !navigator.onLine) {
     await queueMessageLocally(messageData)
   } else {
     await supabase.rpc('send_message', messageData)
   }
   ```

3. **Error Handling**:
   - Mobile: Retry logic for intermittent connectivity
   - Handle timeout errors gracefully
   - Show user feedback during slow operations

4. **Function Parameters**:
   - Same parameter format for all platforms
   - Mobile uses native file URIs in media_urls (converted to storage paths)

5. **Receipt Generation**:
   - Auto-receipt creation works identically on all platforms
   - Mobile apps listen to receipts via Realtime subscriptions

**No Capacitor plugins required** - functions are pure server-side.

---

## 📝 **User Story**

**As a** backend developer  
**I want to** create robust database functions for messaging operations  
**So that** message handling is atomic, consistent, and properly integrated with existing systems

---

## ✅ **Acceptance Criteria**

- [ ] `send_message()` function created with:
  - [ ] Atomic message creation
  - [ ] Auto-receipt generation for participants
  - [ ] Conversation timestamp update
  - [ ] Integration with shares table for coupons/deals
  - [ ] Participant validation
- [ ] `mark_message_as_read()` function implemented
- [ ] `get_unread_message_count()` function implemented
- [ ] `create_or_get_conversation()` function prevents duplicates
- [ ] Auto-update conversation timestamp trigger created
- [ ] `notification_type` enum extended for messaging
- [ ] All functions have unit tests
- [ ] Error handling for all edge cases
- [ ] Functions are SECURITY DEFINER where appropriate

---

## 🛢 **MCP Integration (Primary: Supabase MCP)**

### **Phase 1: Create send_message Function**

```bash
# Create the atomic send_message function
warp mcp run supabase "apply_migration create_send_message_function"

# Test the function
warp mcp run supabase "execute_sql SELECT send_message('test-conversation-id', 'Hello, this is a test message', 'text');"

# Verify receipts auto-created
warp mcp run supabase "execute_sql SELECT * FROM message_read_receipts WHERE message_id = (SELECT id FROM messages ORDER BY created_at DESC LIMIT 1);"

# Test with coupon share
warp mcp run supabase "execute_sql SELECT send_message('test-conv-id', 'Check this coupon!', 'coupon', NULL, NULL, NULL, 'coupon-id-here', NULL);"

# Verify share tracked
warp mcp run supabase "execute_sql SELECT * FROM shares WHERE coupon_id = 'coupon-id-here' AND share_method = 'message' ORDER BY shared_at DESC LIMIT 1;"
```

### **Phase 2: Create mark_message_as_read Function**

```bash
# Create function
warp mcp run supabase "apply_migration create_read_message_function"

# Test marking as read
warp mcp run supabase "execute_sql SELECT mark_message_as_read('message-id-here');"

# Verify read_at timestamp set
warp mcp run supabase "execute_sql SELECT user_id, read_at FROM message_read_receipts WHERE message_id = 'message-id-here' AND user_id = auth.uid();"

# Verify message status updated to 'read'
warp mcp run supabase "execute_sql SELECT status FROM messages WHERE id = 'message-id-here';"
```

### **Phase 3: Create get_unread_message_count Function**

```bash
# Create function
warp mcp run supabase "apply_migration create_unread_count_function"

# Test unread count
warp mcp run supabase "execute_sql SELECT get_unread_message_count();"

# Verify accuracy
warp mcp run supabase "execute_sql SELECT COUNT(DISTINCT m.id) FROM messages m JOIN conversations c ON c.id = m.conversation_id LEFT JOIN message_read_receipts mrr ON mrr.message_id = m.id AND mrr.user_id = auth.uid() WHERE auth.uid() = ANY(c.participants) AND m.sender_id != auth.uid() AND mrr.read_at IS NULL AND m.is_deleted = false;"
```

### **Phase 4: Create create_or_get_conversation Function**

```bash
# Create function
warp mcp run supabase "apply_migration create_or_get_conversation_function"

# Test conversation creation (first time)
warp mcp run supabase "execute_sql SELECT create_or_get_conversation('friend-user-id-here');"

# Test conversation retrieval (second time with same user)
warp mcp run supabase "execute_sql SELECT create_or_get_conversation('friend-user-id-here');"

# Verify no duplicates created
warp mcp run supabase "execute_sql SELECT COUNT(*) FROM conversations WHERE participants @> ARRAY[auth.uid(), 'friend-user-id-here'] AND type = 'direct';"
```

### **Phase 5: Create Conversation Timestamp Trigger**

```bash
# Create trigger
warp mcp run supabase "apply_migration create_conversation_timestamp_trigger"

# Test trigger fires
warp mcp run supabase "execute_sql INSERT INTO messages (conversation_id, sender_id, content, type) VALUES ('test-conv-id', auth.uid(), 'Test', 'text') RETURNING id;"

# Verify conversation timestamp updated
warp mcp run supabase "execute_sql SELECT last_message_at FROM conversations WHERE id = 'test-conv-id';"
```

### **Phase 6: Extend Notification Types**

```bash
# Add messaging notification types
warp mcp run supabase "execute_sql ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'message_received';"
warp mcp run supabase "execute_sql ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'message_reply';"
warp mcp run supabase "execute_sql ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'coupon_shared_message';"
warp mcp run supabase "execute_sql ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'deal_shared_message';"

# Verify types added
warp mcp run supabase "execute_sql SELECT enumlabel FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'notification_type') ORDER BY enumlabel;"
```

---

## 🧠 **MCP Integration (Secondary: Context7 MCP)**

```bash
# Analyze for race conditions
warp mcp run context7 "Review the send_message function and identify any potential race conditions or concurrency issues"

# Check for SQL injection
warp mcp run context7 "Analyze all database functions for SQL injection vulnerabilities"

# Suggest optimizations
warp mcp run context7 "Review the get_unread_message_count function and suggest performance optimizations"

# Find integration points
warp mcp run context7 "Analyze the shares table schema and confirm the send_message integration is correct"
```

---

## 📋 **Implementation Tasks**

### **Task 1: Implement send_message Function** ⏱️ 6 hours

```sql
CREATE OR REPLACE FUNCTION send_message(
  p_conversation_id UUID,
  p_content TEXT,
  p_type TEXT DEFAULT 'text',
  p_media_urls TEXT[] DEFAULT NULL,
  p_thumbnail_url TEXT DEFAULT NULL,
  p_link_preview JSONB DEFAULT NULL,
  p_shared_coupon_id UUID DEFAULT NULL,
  p_shared_deal_id UUID DEFAULT NULL,
  p_reply_to_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_message_id UUID;
  v_conversation conversations%ROWTYPE;
  v_participant UUID;
BEGIN
  -- Get conversation details
  SELECT * INTO v_conversation 
  FROM conversations 
  WHERE id = p_conversation_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Conversation not found';
  END IF;
  
  -- Verify sender is participant
  IF NOT (auth.uid() = ANY(v_conversation.participants)) THEN
    RAISE EXCEPTION 'User is not a conversation participant';
  END IF;
  
  -- Create message
  INSERT INTO messages (
    conversation_id,
    sender_id,
    content,
    type,
    media_urls,
    thumbnail_url,
    link_preview,
    shared_coupon_id,
    shared_deal_id,
    reply_to_id,
    status
  ) VALUES (
    p_conversation_id,
    auth.uid(),
    p_content,
    p_type,
    p_media_urls,
    p_thumbnail_url,
    p_link_preview,
    p_shared_coupon_id,
    p_shared_deal_id,
    p_reply_to_id,
    'sent'
  )
  RETURNING id INTO v_message_id;
  
  -- Create read receipt entries for all participants except sender
  FOREACH v_participant IN ARRAY v_conversation.participants LOOP
    IF v_participant != auth.uid() THEN
      INSERT INTO message_read_receipts (message_id, user_id, delivered_at)
      VALUES (v_message_id, v_participant, now());
    END IF;
  END LOOP;
  
  -- Update conversation last_message_at
  UPDATE conversations
  SET last_message_at = now(), updated_at = now()
  WHERE id = p_conversation_id;
  
  -- If sharing coupon/deal, record in shares table
  IF p_shared_coupon_id IS NOT NULL THEN
    INSERT INTO shares (sharer_id, coupon_id, share_method, shared_at)
    VALUES (auth.uid(), p_shared_coupon_id, 'message', now())
    ON CONFLICT DO NOTHING;
  END IF;
  
  IF p_shared_deal_id IS NOT NULL THEN
    INSERT INTO shares (sharer_id, offer_id, share_method, shared_at)
    VALUES (auth.uid(), p_shared_deal_id, 'message', now())
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN v_message_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### **Task 2: Implement mark_message_as_read Function** ⏱️ 3 hours

```sql
CREATE OR REPLACE FUNCTION mark_message_as_read(
  p_message_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_message messages%ROWTYPE;
BEGIN
  -- Get message details
  SELECT * INTO v_message FROM messages WHERE id = p_message_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Message not found';
  END IF;
  
  -- Verify user is in conversation
  IF NOT EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = v_message.conversation_id 
      AND auth.uid() = ANY(c.participants)
  ) THEN
    RAISE EXCEPTION 'User not in conversation';
  END IF;
  
  -- Don't mark own messages as read
  IF v_message.sender_id = auth.uid() THEN
    RETURN false;
  END IF;
  
  -- Update read receipt
  UPDATE message_read_receipts
  SET read_at = now()
  WHERE message_id = p_message_id 
    AND user_id = auth.uid() 
    AND read_at IS NULL;
  
  -- Update message status if all recipients have read
  UPDATE messages m
  SET status = 'read', updated_at = now()
  WHERE m.id = p_message_id
    AND m.status != 'read'
    AND NOT EXISTS (
      SELECT 1 FROM message_read_receipts mrr
      WHERE mrr.message_id = m.id AND mrr.read_at IS NULL
    );
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### **Task 3: Implement get_unread_message_count Function** ⏱️ 2 hours

```sql
CREATE OR REPLACE FUNCTION get_unread_message_count()
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(DISTINCT m.id)
    FROM messages m
    JOIN conversations c ON c.id = m.conversation_id
    LEFT JOIN message_read_receipts mrr ON mrr.message_id = m.id AND mrr.user_id = auth.uid()
    WHERE auth.uid() = ANY(c.participants)
      AND m.sender_id != auth.uid()
      AND mrr.read_at IS NULL
      AND m.is_deleted = false
  )::INTEGER;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
```

### **Task 4: Implement create_or_get_conversation Function** ⏱️ 4 hours

```sql
CREATE OR REPLACE FUNCTION create_or_get_conversation(p_participant_id UUID)
RETURNS UUID AS $$
DECLARE
  v_conversation_id UUID;
  v_participants UUID[];
BEGIN
  -- Check if conversation already exists
  SELECT id INTO v_conversation_id
  FROM conversations
  WHERE type = 'direct'
    AND participants @> ARRAY[auth.uid(), p_participant_id]
    AND array_length(participants, 1) = 2
  LIMIT 1;
  
  IF FOUND THEN
    RETURN v_conversation_id;
  END IF;
  
  -- Verify users are friends
  IF NOT EXISTS (
    SELECT 1 FROM friendships f
    WHERE (
      (f.user1_id = auth.uid() AND f.user2_id = p_participant_id) OR
      (f.user2_id = auth.uid() AND f.user1_id = p_participant_id)
    )
  ) THEN
    RAISE EXCEPTION 'Users must be friends to create conversation';
  END IF;
  
  -- Verify no blocking
  IF EXISTS (
    SELECT 1 FROM blocked_users b
    WHERE (
      (b.blocker_id = auth.uid() AND b.blocked_id = p_participant_id) OR
      (b.blocker_id = p_participant_id AND b.blocked_id = auth.uid())
    )
  ) THEN
    RAISE EXCEPTION 'Cannot create conversation with blocked user';
  END IF;
  
  -- Create conversation
  v_participants := ARRAY[auth.uid(), p_participant_id];
  
  INSERT INTO conversations (type, participants)
  VALUES ('direct', v_participants)
  RETURNING id INTO v_conversation_id;
  
  -- Create participant entries
  INSERT INTO conversation_participants (conversation_id, user_id)
  VALUES 
    (v_conversation_id, auth.uid()),
    (v_conversation_id, p_participant_id);
  
  RETURN v_conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### **Task 5: Create Conversation Timestamp Trigger** ⏱️ 2 hours

```sql
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET 
    last_message_at = NEW.created_at,
    updated_at = now()
  WHERE id = NEW.conversation_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER messages_update_conversation_trigger
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_timestamp();
```

### **Task 6: Extend Notification Types** ⏱️ 1 hour
- Add 4 new enum values
- Verify enum extension
- Update notifications table integration

### **Task 7: Unit Testing** ⏱️ 6 hours
- Test each function with valid inputs
- Test error cases
- Test edge cases
- Test concurrent operations

---

## 🧪 **Testing Checklist**

### **send_message Function Tests**
- [ ] Creates message with all parameters
- [ ] Auto-generates read receipts for participants
- [ ] Updates conversation timestamp
- [ ] Integrates with shares table for coupons
- [ ] Integrates with shares table for deals
- [ ] Validates sender is participant
- [ ] Handles missing conversation gracefully

### **mark_message_as_read Function Tests**
- [ ] Marks message as read correctly
- [ ] Updates message status when all read
- [ ] Prevents marking own messages as read
- [ ] Validates user is in conversation
- [ ] Handles already-read messages

### **get_unread_message_count Function Tests**
- [ ] Returns accurate count
- [ ] Excludes own messages
- [ ] Excludes deleted messages
- [ ] Performance acceptable with large dataset

### **create_or_get_conversation Function Tests**
- [ ] Creates new conversation
- [ ] Returns existing conversation (no duplicates)
- [ ] Validates friendship requirement
- [ ] Prevents conversation with blocked user
- [ ] Creates participant entries

### **Trigger Tests**
- [ ] Conversation timestamp updates on new message
- [ ] Trigger fires for all message types

---

## 📊 **Success Metrics**

| Metric | Target | How to Measure |
|--------|--------|----------------|
| **Function Atomicity** | 100% | No partial failures |
| **Receipt Generation** | 100% | All messages have receipts |
| **Share Integration** | 100% | All shares tracked |
| **Unread Count Accuracy** | 100% | Matches manual count |
| **Duplicate Prevention** | 100% | No duplicate conversations |
| **Test Coverage** | > 85% | Function test coverage |

---

## 🔗 **Dependencies**

**Requires:**
- ✅ Story 8.1.1 (All tables)
- ✅ Story 8.1.2 (RLS policies)
- ✅ Existing friendships table
- ✅ Existing shares table
- ✅ Existing notifications table with enum

**Enables:**
- All Epic 8.2 frontend messaging features
- Message sending UI
- Unread badge display
- Conversation list

---

## 📦 **Deliverables**

1. **Migration File**: `supabase/migrations/20250204_create_messaging_functions.sql`
2. **Function Documentation**: `docs/messaging/DATABASE_FUNCTIONS.md`
3. **Unit Tests**: `tests/database/messaging_functions.test.sql`
4. **Integration Examples**: Sample frontend code for calling functions

---

## 🚨 **Edge Cases & Error Handling**

1. **Concurrent message sends**: Function handles atomically
2. **Missing conversation**: Raises exception with clear message
3. **User not participant**: Validates before operation
4. **Blocked user attempt**: Validates blocking status
5. **Non-friend conversation**: Validates friendship
6. **Duplicate conversation race**: Uses LIMIT 1 for safety
7. **Share table conflict**: Uses ON CONFLICT DO NOTHING

---

## ✅ **Definition of Done**

- [ ] All 5 functions implemented
- [ ] Trigger created and tested
- [ ] Notification types extended
- [ ] All unit tests passing
- [ ] Integration with shares table verified
- [ ] Error handling tested
- [ ] Performance acceptable
- [ ] Documentation complete
- [ ] Code reviewed and approved

---

**Story Status:** 📋 Ready for Implementation  
**Next Story:** [STORY 8.1.5 - Optimized Database Views](./STORY_8.1.5_Optimized_Database_Views.md)
