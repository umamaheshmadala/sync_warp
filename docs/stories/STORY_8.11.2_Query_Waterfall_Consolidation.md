# 📖 STORY 8.11.2: Query Waterfall Consolidation

**Status:** 📋 Planned  
**Epic:** [EPIC 8.11: Messaging Performance & Scalability](../epics/EPIC_8.11_Messaging_Performance_Scalability.md)  
**Priority:** 🟠 High (Audit Finding #2)

---

## 🙋‍♂️ **User Story**

**As a** SynC User opening a conversation,  
**I want** my messages to load in a single request,  
**So that** I don't see a long loading spinner, especially on slow networks.

---

## 🎯 **Acceptance Criteria**

### **1. Single RPC for Message Context**
- **GIVEN** a user opens conversation `uuid-1234`
- **WHEN** the `useMessages` hook fetches data
- **THEN** it MUST make a **single** database call (via RPC `get_messages_v2` or equivalent)
- **AND** the response MUST include: `messages[]`, `read_receipts[]`, `report_status`, `is_hidden` per message.

### **2. Elimination of Sequential Fetches**
- **GIVEN** the new RPC is implemented
- **WHEN** developer inspects the Network tab in DevTools
- **THEN** there MUST be only **1 Supabase request** for the initial message load (excluding auth/realtime handshake).
- **AND** the separate calls to `message_read_receipts`, `message_reports`, and `hidden_message_ids` MUST be removed from the frontend.

### **3. Performance Target**
- **GIVEN** a conversation with 200 messages
- **WHEN** the user opens it on a "Fast 3G" simulated connection
- **THEN** TTI (Time to Interactive) for the message list MUST be under **1.5 seconds**.

---

## 🛠️ **Technical Implementation Plan**

### **Backend (Supabase RPC)**
Create a new PostgreSQL function:
```sql
CREATE OR REPLACE FUNCTION get_messages_v2(p_conversation_id UUID, p_limit INT DEFAULT 50)
RETURNS TABLE (
  id UUID,
  content TEXT,
  sender_id UUID,
  created_at TIMESTAMPTZ,
  is_deleted BOOLEAN,
  read_by UUID[], -- Array of user IDs who have read
  is_reported BOOLEAN,
  is_hidden_for_current_user BOOLEAN
  -- ... other fields
) AS $$
BEGIN
  -- Join messages with read_receipts, reports, hidden status
  RETURN QUERY ...;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### **Frontend (`src/services/messagingService.ts`)**
- Replace the multi-query `fetchMessages` logic with a single `supabase.rpc('get_messages_v2', ...)` call.

### **Frontend (`src/hooks/useMessages.ts`)**
- Remove the separate `fetchHiddenMessageIds` call.
- Consume the unified response shape from the new RPC.

---

## 🛑 **Risks & Mitigation**
- **Risk**: Large JSON payloads for conversations with 1000+ messages.
- **Mitigation**: Implement cursor-based pagination in the RPC (`p_before_id`, `p_limit`).
