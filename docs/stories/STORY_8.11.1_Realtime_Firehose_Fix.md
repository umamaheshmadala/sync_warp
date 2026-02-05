# 📖 STORY 8.11.1: Realtime "Firehose" De-escalation & Granular Subscriptions

**Status:** 📋 Planned  
**Epic:** [EPIC 8.11: Messaging Performance & Scalability (Post-Audit Refactor)](../epics/EPIC_8.11_Messaging_Performance_Scalability.md)  
**Priority:** 🔴 High (Critical Performance Fix)

---

## 🙋‍♂️ **User Story**

**As a** SynC Mobile User,  
**I want** the messaging system to only process data relevant to my active conversation,  
**So that** my phone's battery doesn't drain, and the app remains responsive even when thousands of other messages are being sent globally.

---

## 🎯 **Acceptance Criteria**

### **1. Granular PostgreSQL Change Subscriptions**
- **GIVEN** a user opens a conversation with ID `uuid-1234`
- **WHEN** the `realtimeService.ts` initializes the message subscription
- **THEN** it MUST use the Supabase filter parameter: `filter: "conversation_id=eq.uuid-1234"`
- **AND** it MUST NOT subscribe to the entire `messages` table without a filter.

### **2. Fallback Reliability**
- **GIVEN** a Supabase Realtime filter fails to initialize (e.g., column not found error)
- **WHEN** the error is caught by the service
- **THEN** the system MUST log a warning and fallback to a client-side filter to ensure messages aren't lost, while alerting the technical team.

### **3. Deduplication & State Integrity**
- **GIVEN** a message is received via Realtime while a state-sync is happening
- **WHEN** the message already exists in the `messagingStore.ts`
- **THEN** it MUST be deduplicated correctly without causing UI flicker or scrolling jumps.

### **4. Performance Benchmark**
- **GIVEN** 1,000 background messages are being sent in *other* conversations
- **WHEN** a new message is sent in the *active* conversation
- **THEN** the CPU spike on the mobile device MUST remain below 5%
- **AND** the memory heap growth MUST be negligible (< 1MB).

---

## 🛠️ **Technical Implementation Plan**

### **Service Layer (`src/services/realtimeService.ts`)**
- Modify `subscribeToMessages(conversationId, ...)`:
    - Update the `.on('postgres_changes', ...)` call to include the `filter` property.
    - Remove the comment explicitly stating "NO FILTER".
    - Update `subscribeToReadReceipts` to also use granular filters.

### **Store Layer (`src/store/messagingStore.ts`)**
- Review `upsertMessage` logic to ensure robust deduplication using `message.id`.

### **Verification Commands**
```bash
# Verify RLS and filter compatibility
warp mcp run supabase "execute_sql SELECT * FROM messages WHERE conversation_id = 'uuid-1234' LIMIT 1"
```

---

## 🛑 **Risks & Mitigation**
- **Risk**: Filter parameters on non-primary-key columns can sometimes be flaky if not indexed.
- **Mitigation**: Ensure `conversation_id` has a B-tree index in Supabase (Verified in Epic 8.1).
