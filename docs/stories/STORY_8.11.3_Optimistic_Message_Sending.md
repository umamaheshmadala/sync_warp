# 📖 STORY 8.11.3: Optimistic Message Sending & Retry Logic

**Status:** 📋 Planned  
**Epic:** [EPIC 8.11: Messaging Performance & Scalability](../epics/EPIC_8.11_Messaging_Performance_Scalability.md)  
**Priority:** 🟡 Medium (Audit Phase 3)

---

## 🙋‍♂️ **User Story**

**As a** SynC User sending a message,  
**I want** my message to appear instantly in the chat,  
**So that** the conversation feels snappy and real-time, like a native app.

---

## 🎯 **Acceptance Criteria**

### **1. Immediate Local Append**
- **GIVEN** a user types a message and taps "Send"
- **WHEN** the send action is triggered
- **THEN** the message MUST appear in the message list within **16ms** (1 frame).
- **AND** the message MUST display a `status: 'sending'` indicator (e.g., a clock or single gray checkmark).

### **2. Background Confirmation**
- **GIVEN** the message was appended locally
- **WHEN** the server confirms the message was saved
- **THEN** the message status MUST update from `'sending'` → `'sent'` (single checkmark).
- **AND** this update MUST NOT cause the message list to re-sort or flicker.

### **3. Failure Handling & Retry**
- **GIVEN** a message send fails (e.g., network error)
- **WHEN** the failure is detected
- **THEN** the message MUST display a `status: 'failed'` indicator (e.g., red exclamation mark).
- **AND** a "Tap to Retry" action MUST be available on the message bubble.
- **AND** tapping retry MUST re-send the same message content.

### **4. Deduplication on Realtime Echo**
- **GIVEN** a message was sent successfully and the local store has it
- **WHEN** the Realtime subscription receives the same message from the server
- **THEN** the store MUST recognize the duplicate by `id` (or a client-generated `tempId`) and NOT add a second copy.

---

## 🛠️ **Technical Implementation Plan**

### **Store Layer (`src/store/messagingStore.ts`)**
- Create an action `addOptimisticMessage(conversationId, tempMessage)`.
- `tempMessage` should have: `id: 'TEMP-' + uuid()`, `status: 'sending'`, `content`, `sender_id`.
- Create an action `resolveOptimisticMessage(tempId, serverMessage)` that swaps the temp ID for the real server ID.
- Create an action `failOptimisticMessage(tempId, error)` that updates the status.

### **Hook Layer (`src/hooks/useSendMessage.ts`)**
- Refactor to:
  1. Call `addOptimisticMessage`.
  2. Call `await sendMessage()` in background (no `await` blocking the UI if possible, or use a non-blocking pattern).
  3. On success: `resolveOptimisticMessage`.
  4. On failure: `failOptimisticMessage`.

### **UI Layer (`MessageBubble.tsx`)**
- Display status icons based on `message.status`:
  - `'sending'` → 🕐 Clock icon
  - `'sent'` → ✓ Single checkmark
  - `'delivered'` → ✓✓ Double checkmark
  - `'read'` → ✓✓ (Cyan)
  - `'failed'` → ❌ Red exclamation + "Tap to Retry"

---

## 🛑 **Risks & Mitigation**
- **Risk**: Race conditions where server response arrives before local dispatch completes.
- **Mitigation**: Use a stable `tempId` for correlation. The `upsertMessage` logic should prioritize the server-provided `id` and merge gracefully.
