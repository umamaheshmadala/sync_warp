# 🚀 EPIC 8.11: Messaging Performance & Scalability (Post-Audit Refactor)

**Epic Owner:** Frontend Engineering / Architecture  
**Stakeholders:** Frontend Engineering, Backend Engineering, QA, UX/UI  
**Dependencies:** Epic 8.2 ✅ Complete, Epic 8.10 ⏳ In Progress  
**Timeline:** Week 11-12 (2 weeks)  
**Status:** 📋 Planning (Initiated from Feb 2026 Audit)

---

## 🎯 **Epic Goal**

Address critical performance bottlenecks and architectural deficiencies identified in the **Messaging System Audit (Feb 4, 2026)**. The focus is on moving from a functional prototype to a production-scale messaging architecture that supports 10,000+ messages per conversation without UI lag or excessive battery drain.

### **Core Objectives:**
1.  **Eliminate the "Firehose" Problem**: Replace global realtime subscriptions with granular, filtered subscriptions.
2.  **Consolidate Database Query Waterfalls**: Replace multiple sequential frontend fetches with high-performance Supabase RPC functions.
3.  **Implement High-Performance Optimistic UI**: Rebuild message sending logic to follow the "Comments Pattern" (immediate local update with background retry).
4.  **Optimize Mobile Resource Usage**: Refine background lifecycle management to prevent unnecessary battery drain while maintaining responsiveness.

---

## ✅ **Success Criteria**

| Metric | Target | Current (Post-Audit) |
| :--- | :--- | :--- |
| **Message Sync Latency** | < 200ms | ~800ms (Client-filtered) |
| **Initial Load Time** | < 400ms | > 2.5s (Query Waterfall) |
| **Optimistic Feedback** | < 16ms (Instant) | ~450ms (Server-awaited) |
| **Battery Impact** | < 2% / hour | ~8% / hour (Wakelocks) |
| **Memory Usage** | < 150MB | ~400MB (Redundant state) |

---

## 📊 **Architectural Refactoring Plan**

### **1. Realtime Subscription Refactor**
- **Current**: App-wide subscription to all `messages` table inserts (`INSERT` event).
- **Target**: Filtered subscription per active conversation using `filter: conversation_id=eq.<uuid>`.
- **Reason**: Reduces client-side CPU usage and network traffic by 90%+ in multi-user environments.

### **2. Server-Side Data Consolidation (RPC)**
- **Current**: Frontend fetches conversations, then participants, then last messages in parallel/sequence.
- **Target**: A single RPC function `get_conversation_context(p_conversation_id)` returning a unified JSON structure.
- **Reason**: Eliminates RTT (Round Trip Time) penalties for sequential queries.

### **3. Optimistic Context Strategy**
- **Target**: Move `tempId` generation to the store layer. 
- **Pattern**: `addOptimisticMessage` → `broadcast` → `persist` → `resolve`.
- **Reason**: Perception of speed is more important than raw server speed for user satisfaction.

---

## 📋 **Stories Breakdown**

### **Story 8.11.1: Realtime "Firehose" De-escalation** (3 days)
- **Goal**: Implement granular subscriptions in `realtimeService.ts`.
- **Changes**: 
    - Modify `subscribeToMessages` to use Supabase filters.
    - Implement fallback logic for filter failures.
    - Optimize message deduplication in `messagingStore.ts`.
- **File:** `docs/stories/STORY_8.11.1_Realtime_Firehose_Fix.md`

### **Story 8.11.2: Server-Side Context Consolidation** (2 days)
- **Goal**: Replace frontend waterfalls with optimized RPC/Views.
- **Changes**: 
    - Create `get_conversation_bundle` RPC.
    - Update `messagingService.ts` to use new RPC.
    - Simplify `useConversation` hook logic.
- **File:** `docs/stories/STORY_8.11.2_Query_Consolidation.md`

### **Story 8.11.3: Advanced Optimistic UI & Retry Logic** (3 days)
- **Goal**: Decouple UI updates from server confirmation.
- **Changes**: 
    - Implement state-based message status (SENDING, SENT, FAILED).
    - Add automated retry logic for failed messages.
    - Implement "Pull-to-Refresh" force sync for broken states.
- **File:** `docs/stories/STORY_8.11.3_Optimistic_Messaging.md`

### **Story 8.11.4: Mobile Battery & Lifecycle Optimization** (2 days)
- **Goal**: Reduce background activity and connection churn.
- **Changes**: 
    - Refine `backgroundDisconnectTimer` logic based on network type.
    - Implement adaptive polling for low-power modes.
    - Optimize presence tracking for battery-conscious delivery.
- **File:** `docs/stories/STORY_8.11.4_Battery_Optimization.md`

---

## 🧪 **Verification Strategy (Performance-First)**

- **Load Testing**: Use K6 to simulate 50 concurrent users in the same conversation.
- **Profile Analysis**: Chrome Performance tab audit on "fast 3G" with 4x CPU throttling.
- **Power Monitoring**: Xcode Energy Gauge for iOS native profiling.
- **Network Audit**: Inspect WebSocket frame volume per minute.

---

## ✅ **Definition of Done**

- [ ] Realtime filters verified in production logs.
- [ ] Query waterfall reduction confirmed (DevTools Network tab).
- [ ] Optimistic sending under 16ms visually.
- [ ] Battery drain reduced by 50% in background tests.
- [ ] Zero "duplicate message" or "missing message" reports in stress tests.
- [ ] **Audit Review**: Verified by the original Auditor.
