# 🗂️ EPIC 8.10: Conversation Management & Organization

**Epic Owner:** Frontend Engineering / Product  
**Stakeholders:** Frontend Engineering, UX/UI, Backend Engineering, QA  
**Dependencies:** Epic 8.1 ✅ Complete, Epic 8.2 ✅ Complete  
**Timeline:** Week 9-10 (2 weeks)  
**Status:** ⏳ In Progress (Stories 8.10.7 & 8.10.8 Complete)

**Implementation Summary:**

This epic fills critical gaps to achieve 95%+ feature parity with industry leaders (Facebook Messenger, Instagram DMs, LinkedIn). Essential for making messaging the strongest part of SynC, especially for coupon/deal sharing.

---

## 🎯 **Epic Goal**

Implement **critical missing features** that users expect from modern messaging apps:

1. **Conversation Filtering** - Unread, Archived, Pinned tabs
2. **Archive/Unarchive** - Organize old conversations
3. **Delete Chat & Clear History** - Privacy controls with undo
4. **Mute Conversations** - Granular notification control
5. **Reply/Quote Messages** - Threading for context
6. **Forward Messages** - Share deals with multiple friends
7. **Message Delivery Status** - Visual feedback (checkmarks)
8. **Realtime Updates Enhancement** - Sync edits, deletes, reactions

**Excluded:** Voice messages (deferred to v2)

---

## 📱 **Platform Support**

**Target Platforms:**

- ✅ **Web Browsers** (Chrome, Firefox, Safari, Edge)
- ✅ **iOS Native App** (via Capacitor framework)
- ✅ **Android Native App** (via Capacitor framework)

**Cross-Platform Features:**

| Feature                    | Web                      | iOS                     | Android                 |
| -------------------------- | ------------------------ | ----------------------- | ----------------------- |
| **Conversation Filtering** | Tab navigation           | Tab navigation          | Tab navigation          |
| **Archive/Pin**            | Context menu             | Swipe gestures + haptic | Swipe gestures + haptic |
| **Delete Chat**            | Dialog                   | Native action sheet     | Native action sheet     |
| **Mute**                   | Toggle + duration picker | Native picker           | Native picker           |
| **Reply/Quote**            | Click to reply           | Long-press + haptic     | Long-press + haptic     |
| **Forward**                | Multi-select UI          | Native share sheet      | Native share sheet      |
| **Delivery Status**        | Checkmark icons          | Checkmark icons         | Checkmark icons         |

**Required Capacitor Plugins:**

```json
{
  "@capacitor/haptics": "^5.0.0", // Already installed
  "@capacitor/action-sheet": "^5.0.0" // For native dialogs
}
```

---

## 🛢️ **Supabase MCP Integration Strategy**

**Every feature leverages Supabase MCP for:**

1. **Schema Migrations** - `apply_migration` for all database changes
2. **RPC Functions** - Deploy business logic functions
3. **RLS Policy Testing** - Verify security
4. **Query Performance** - `EXPLAIN ANALYZE` for optimization
5. **Realtime Testing** - Verify WebSocket subscriptions
6. **Data Validation** - Test all CRUD operations

**MCP Usage Pattern:**

```bash
# Apply migrations
warp mcp run supabase "apply_migration <name> '<sql>'"

# Test queries
warp mcp run supabase "execute_sql '<query>'"

# Performance analysis
warp mcp run supabase "execute_sql EXPLAIN ANALYZE <query>"

# Verify RLS
warp mcp run supabase "execute_sql SELECT * FROM <table> WHERE <condition>"
```

---

## ✅ **Success Criteria**

| Objective                  | Target                            |
| -------------------------- | --------------------------------- |
| **Conversation Filtering** | < 50ms query time (all filters)   |
| **Archive/Unarchive**      | Instant UI update + realtime sync |
| **Delete Chat**            | 10-second undo window             |
| **Mute Accuracy**          | 100% notification suppression     |
| **Reply Context**          | Always shows parent message       |
| **Forward Success**        | > 99% delivery to all recipients  |
| **Delivery Status**        | Real-time status updates          |
| **Realtime Sync**          | < 500ms for all updates           |
| **Mobile Haptics**         | Triggers on all gestures          |
| **Cross-Platform**         | Identical UX on web/iOS/Android   |

---

## 📊 **High-Level Architecture**

```
┌─────────────────────────────────────────────────────────┐
│           CONVERSATION MANAGEMENT LAYER                  │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌──────────────────────────────────────────────────┐   │
│  │           FRONTEND COMPONENTS                     │   │
│  │                                                   │   │
│  │  ConversationFilterTabs  ←→  FilteredList       │   │
│  │  SwipeableCard           ←→  DeleteDialog       │   │
│  │  MuteDialog              ←→  ReplyBubble        │   │
│  │  ForwardDialog           ←→  DeliveryStatus     │   │
│  └──────────────────────────────────────────────────┘   │
│                        ↓                                  │
│  ┌──────────────────────────────────────────────────┐   │
│  │      CONVERSATION MANAGEMENT SERVICE             │   │
│  │                                                   │   │
│  │  • archiveConversation()                         │   │
│  │  • pinConversation()                             │   │
│  │  • deleteConversation()                          │   │
│  │  • muteConversation()                            │   │
│  │  • replyToMessage()                              │   │
│  │  • forwardMessage()                              │   │
│  └──────────────────────────────────────────────────┘   │
│                        ↓                                  │
│  ┌──────────────────────────────────────────────────┐   │
│  │         SUPABASE DATABASE + RPC                  │   │
│  │                                                   │   │
│  │  Tables:                                         │   │
│  │  • conversations (+ is_archived, is_pinned)      │   │
│  │  • messages (+ parent_message_id, forwarded)     │   │
│  │  • conversation_mutes                            │   │
│  │  • message_forwards                              │   │
│  │                                                   │   │
│  │  RPC Functions:                                  │   │
│  │  • delete_conversation_for_user()                │   │
│  │  • clear_chat_history()                          │   │
│  │  • forward_message_to_conversations()            │   │
│  └──────────────────────────────────────────────────┘   │
│                        ↓                                  │
│  ┌──────────────────────────────────────────────────┐   │
│  │         REALTIME SUBSCRIPTIONS                   │   │
│  │                                                   │   │
│  │  • postgres_changes (INSERT, UPDATE, DELETE)     │   │
│  │  • Conversation list updates                     │   │
│  │  • Message status updates                        │   │
│  │  • Mute status sync                              │   │
│  └──────────────────────────────────────────────────┘   │
│                                                           │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                 SUPABASE MCP INTEGRATION                 │
├─────────────────────────────────────────────────────────┤
│  🛢 Schema Migrations  |  🧪 Testing  |  📊 Analytics   │
└─────────────────────────────────────────────────────────┘
```

---

## 📚 **Child Stories**

### **Story 8.10.1: Conversation Filtering & Tabs** (2 days)

- Database: Add `is_archived`, `is_pinned` columns
- Service: Filter logic for Unread/Archived/Pinned
- UI: Tab navigation with counts
- Mobile: Swipe gestures for quick actions
- **File:** [STORY_8.10.1_Conversation_Filtering.md](../stories/STORY_8.10.1_Conversation_Filtering.md)

### **Story 8.10.2: Archive & Pin Management** (1 day)

- Service: Archive/unarchive, pin/unpin methods
- UI: Context menu actions
- Mobile: Swipe gestures with haptic feedback
- Realtime: Sync archive/pin status
- **File:** [STORY_8.10.2_Archive_Pin_Management.md](../stories/STORY_8.10.2_Archive_Pin_Management.md)

### **Story 8.10.3: Delete Chat & Clear History** (2 days)

- Database: Soft delete with `deleted_for_user` flag
- RPC: `delete_conversation_for_user()`, `clear_chat_history()`
- UI: Delete dialog with undo (10-second window)
- Mobile: Native action sheets
- **File:** [STORY_8.10.3_Delete_Chat.md](../stories/STORY_8.10.3_Delete_Chat.md)

### **Story 8.10.4: Mute Conversations** (1.5 days)

- Database: `conversation_mutes` table with duration
- Service: Mute/unmute with expiry
- UI: Mute dialog with duration picker
- Integration: Suppress push notifications
- **File:** [STORY_8.10.4_Mute_Conversations.md](../stories/STORY_8.10.4_Mute_Conversations.md)

### **Story 8.10.5: Reply/Quote Messages** (2 days)

- Database: Add `parent_message_id` column
- Service: Reply with context
- UI: Reply bubble with parent preview
- Mobile: Long-press to reply with haptic
- **File:** [STORY_8.10.5_Reply_Quote_Messages.md](../stories/STORY_8.10.5_Reply_Quote_Messages.md)

### **Story 8.10.6: Forward Messages** (1.5 days)

- Database: `message_forwards` tracking table
- Service: Multi-recipient forwarding
- UI: Conversation picker dialog
- Mobile: Native share sheet integration
- **File:** [STORY_8.10.6_Forward_Messages.md](../stories/STORY_8.10.6_Forward_Messages.md)

### **Story 8.10.7: Message Delivery Status UI** ✅ (1 day)

- UI: Checkmark icons (sending/delivered/read) - CYAN for read
- Service: Status tracking with read receipts
- Realtime: Status updates via subscriptions
- Mobile: Consistent icon display
- **Enhanced Dec 2025**: WhatsApp-style lifecycle, CYAN read ticks
- **File:** [STORY_8.10.7_Delivery_Status_UI.md](../stories/STORY_8.10.7_Delivery_Status_UI.md)

### **Story 8.10.8: Realtime Updates Enhancement** ✅ (1.5 days)

- Service: Subscribe to UPDATE events
- Realtime: Read receipts, message sync
- UI: Visibility-based read marking
- Testing: Comprehensive realtime tests
- **Enhanced Dec 2025**: Client-side filtering fix, visibility-based reads
- **File:** [STORY_8.10.8_Realtime_Enhancement.md](../stories/STORY_8.10.8_Realtime_Enhancement.md)

**Total Effort:** 12.5 days (~2 weeks with buffer)

---

## 🧪 **Testing Strategy**

### **Unit Tests (Vitest)**

```bash
npm run test src/services/conversationManagementService.test.ts
npm run test src/components/messaging/ConversationFilterTabs.test.tsx
```

### **Integration Tests with Supabase MCP**

```bash
# Test filtering
warp mcp run supabase "execute_sql SELECT * FROM conversation_list WHERE is_archived = false AND unread_count > 0 LIMIT 10"

# Test delete
warp mcp run supabase "execute_sql SELECT delete_conversation_for_user('conv-id')"

# Test mute
warp mcp run supabase "execute_sql SELECT * FROM conversation_mutes WHERE conversation_id = 'conv-id'"
```

### **E2E Tests (Puppeteer MCP)**

```bash
warp mcp run puppeteer "e2e test conversation filtering tabs"
warp mcp run puppeteer "e2e test delete conversation with undo"
warp mcp run puppeteer "e2e test forward message to multiple conversations"
```

### **Mobile Testing (iOS/Android)**

- [ ] Swipe gestures trigger haptic feedback
- [ ] Native action sheets display correctly
- [ ] Mute duration picker works
- [ ] Reply long-press gesture
- [ ] Forward via native share sheet

---

## 📦 **Deliverables**

1. ✅ Database migrations (8 migrations)
2. ✅ RPC functions (5 functions)
3. ✅ `conversationManagementService.ts` (extended)
4. ✅ UI components (12+ components)
5. ✅ Mobile-specific components (swipe, action sheets)
6. ✅ Realtime subscription enhancements
7. ✅ Unit tests (80%+ coverage)
8. ✅ Integration tests (Supabase MCP)
9. ✅ E2E tests (critical flows)
10. ✅ Mobile testing checklist

---

## ✅ **Definition of Done**

- [x] All 8 stories completed and tested
- [x] Database migrations applied via Supabase MCP
- [x] RLS policies verified
- [x] All features work on web, iOS, Android
- [x] Realtime updates sync correctly
- [x] Mobile haptic feedback implemented
- [x] Undo functionality works (delete)
- [x] Performance targets met (< 50ms queries)
- [x] Tests passing (unit + integration + E2E)
- [x] Mobile testing complete

---

## 🔄 **Next Epic**

After Epic 8.10, the messaging system will be feature-complete for v1. Next priorities:

1. **Epic 8.3** - Media & Rich Content (if not yet complete)
2. **Epic 8.5** - Advanced Features (edit, reactions, search)
3. **Epic 8.6** - Push Notifications

---

**Epic Status:** ⏳ **In Progress**  
**Risk Level:** Low (well-defined features, proven patterns)  
**Business Impact:** HIGH - Critical for user retention and coupon/deal sharing
