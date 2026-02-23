# 💬 SynC Messaging System - Epic Implementation Guide

**Version:** 1.0 (Complete)  
**Last Updated:** 2025-01-12  
**Status:** 🚀 **Production Ready** - All 9 Epics Complete

---

## 📋 Overview

This directory contains **9 comprehensive epics** documenting the complete implementation of SynC's messaging system. These epics were created from your original plan, refined with your clarifications, and audited for completeness.

**Total Scope:**
- **6,526 lines** of detailed specifications
- **89 days** of implementation work (~11 weeks + 2 days)
- **50+ stories** broken down across 9 epics
- **100% coverage** of your original messaging plan

---

## 🗂️ Epic Files

### **Epic 8.1: Messaging Foundation & Database** (Week 1-3, 18 days)
**File:** `EPIC_8.1_Messaging_Foundation_Database.md` (1,467 lines)

**Scope:**
- 9 database tables (conversations, messages, participants, receipts, edits, typing, blocks, reports, admin_logs)
- Complete RLS policies (friendship-based security)
- Storage bucket setup (message-attachments, 25MB, private)
- Database functions and triggers
- Materialized views for performance
- Partition strategy for scale

**Key Deliverables:**
- Full database schema
- Row-level security policies
- Media storage infrastructure
- 90-day retention function (automated in Epic 8.9)

---

### **Epic 8.2: Core Messaging Implementation** (Week 3-6, 21 days)
**File:** `EPIC_8.2_Core_Messaging_Implementation.md` (1,314 lines)

**Scope:**
- messagingService.ts (send, fetch, pagination)
- realtimeService.ts (Supabase Realtime, typing, presence)
- Zustand store with devtools
- Custom React hooks (useMessages, useConversation, etc.)
- Complete UI components (MessageList, ChatInput, ConversationList)

**Key Deliverables:**
- 1:1 messaging functionality
- Real-time updates
- Typing indicators
- Online/offline presence

---

### **Epic 8.3: Media & Rich Content** (Week 6-8, 14 days)
**File:** `EPIC_8.3_Media_Rich_Content.md` (551 lines)

**Scope:**
- Image/video upload with compression (1MB, 1920px)
- Thumbnail generation (300px, 0.1MB)
- Coupon/deal sharing integration (crucial USP)
- Link preview service
- Rich preview cards

**Key Deliverables:**
- Media messaging
- Product sharing (coupons/deals)
- Link previews
- Signed URLs (1-hour expiration)

---

### **Epic 8.4: Offline Support** (Week 8-9, 7 days)
**File:** `EPIC_8.4_Offline_Support.md` (556 lines)

**Scope:**
- IndexedDB queue with Dexie.js
- Retry logic (3 attempts, 2s delay)
- Conflict resolution
- Optimistic UI updates
- Sync status indicators
- Caching strategy

**Key Deliverables:**
- Offline message queue
- Automatic sync on reconnect
- Cache management (50 convos, 200 msgs per)

---

### **Epic 8.5: Advanced Features** (Week 9-10, 10 days)
**File:** `EPIC_8.5_Advanced_Features.md` (605 lines)

**Scope:**
- Read receipts (real-time)
- Message editing (15-minute window, tracked in message_edits)
- Message deletion (soft delete)
- Full-text search (GIN index)
- Message reactions (emoji)

**Key Deliverables:**
- Edit/delete functionality (game-changing feature)
- Search capability
- Reactions system

---

### **Epic 8.6: Push Notifications** (Week 10, 5 days)
**File:** `EPIC_8.6_Push_Notifications.md` (445 lines)

**Scope:**
- Capacitor Push Notifications plugin
- FCM (Android) and APNs (iOS) integration
- Token management (user_push_tokens table)
- Notification preferences
- Deep linking to conversations

**Key Deliverables:**
- Cross-platform push notifications
- Smart notification batching
- Deep linking

---

### **Epic 8.7: Moderation & Safety** (Week 10-11, 5 days)
**File:** `EPIC_8.7_Moderation_Safety.md` (515 lines)

**Scope:**
- Block/unblock users (RLS integration)
- Report messages (message_reports table)
- Spam detection (rate limiting)
- Link validation
- Content moderation hooks

**Key Deliverables:**
- User blocking system
- Report functionality
- Spam prevention
- Safety features

---

### **Epic 8.8: Testing & QA** (Week 11, 7 days)
**File:** `EPIC_8.8_Testing_QA.md` (581 lines)

**Scope:**
- Unit tests with Vitest (50+ tests)
- Integration tests for RLS (20-30 tests)
- E2E tests with Puppeteer MCP (5 critical flows)
- Load testing strategy (optional)
- Coverage target: > 85%

**Key Deliverables:**
- Comprehensive test suite
- No-coder friendly testing approach
- MCP-powered E2E tests

---

### **Epic 8.9: Message Retention Automation** (Week 11, 1-2 days)
**File:** `EPIC_8.9_Message_Retention_Automation.md` (492 lines)

**Scope:**
- Supabase Edge Function: cleanup-old-messages
- pg_cron OR edge function cron trigger (daily at 2 AM UTC)
- Storage cleanup (90-day-old media)
- Admin dashboard (RetentionMonitor component)
- Logging (admin_logs table)
- Manual cleanup button

**Key Deliverables:**
- Automated 90-day retention (Instagram/WhatsApp standard)
- Admin monitoring dashboard
- Cleanup operation logs

---

## ✅ Your Clarifications Implemented

| # | Clarification | Implementation |
|---|---------------|----------------|
| 1 | MVP: No group chats | ✅ Epics focus on 1:1, schema ready for v2 |
| 2 | No B2C messaging | ✅ No business-to-customer features |
| 3 | Coupon/deal sharing crucial | ✅ Epic 8.3 dedicates Story 8.3.4 to integration |
| 4 | Encryption deferred | ✅ No end-to-end encryption |
| 5 | 90-day retention | ✅ Epic 8.9: Automated cleanup |
| 6 | Images/videos only | ✅ No PDF/doc support |
| 7 | Voice messages v2 | ✅ Not in MVP |
| 8 | Edit/delete feature | ✅ Epic 8.5: 15-min window, full tracking |
| 9 | Testing for no-coder | ✅ Epic 8.8: Unit + Integration + E2E (MCP) |
| 10 | 11-week timeline | ✅ 89 days = 11 weeks + 2 days |

---

## 🎯 MCP Integration

All epics include extensive **MCP (Model Context Protocol)** integration for rapid development:

| MCP Server | Usage | Key Commands |
|------------|-------|--------------|
| **Supabase MCP** | 🔥 Heavy | `warp mcp run supabase "execute_sql ..."` |
| **Context7 MCP** | 🔥 Heavy | `warp mcp run context7 "analyze codebase"` |
| **Chrome DevTools MCP** | ✅ Medium | `warp mcp run chrome-devtools "inspect UI"` |
| **Puppeteer MCP** | ✅ Medium | `warp mcp run puppeteer "run e2e test"` |
| **Shadcn MCP** | ✅ Medium | `warp mcp run shadcn "getComponent card"` |
| **GitHub MCP** | ✅ Low | `warp mcp run github "create pr"` |

---

## 📊 Database Schema Summary

**Core Tables:**
1. `conversations` - Conversation metadata, participants
2. `messages` - Message content, sender, attachments, shares
3. `message_read_receipts` - Read tracking
4. `conversation_participants` - Join table (for future groups)
5. `message_edits` - Edit history tracking
6. `typing_indicators` - Real-time typing status
7. `blocked_users` - User blocking
8. `message_reports` - Content reporting
9. `user_push_tokens` - Push notification tokens
10. `admin_logs` - System operation logs

**Storage:**
- `message-attachments` bucket (private, 25MB limit)

**Indexes:**
- GIN index for full-text search
- B-tree indexes on foreign keys
- Composite indexes for common queries

---

## 🚀 Implementation Order

### **Phase 1: Foundation (Weeks 1-3)**
1. Epic 8.1: Database Foundation
   - Set up tables, RLS, storage
   - Deploy via Supabase MCP

### **Phase 2: Core Messaging (Weeks 3-6)**
2. Epic 8.2: Core Implementation
   - Services, stores, hooks, UI
   - Test 1:1 messaging

### **Phase 3: Rich Features (Weeks 6-9)**
3. Epic 8.3: Media & Rich Content
4. Epic 8.4: Offline Support

### **Phase 4: Advanced & Polish (Weeks 9-11)**
5. Epic 8.5: Advanced Features
6. Epic 8.6: Push Notifications
7. Epic 8.7: Moderation & Safety
8. Epic 8.8: Testing & QA

### **Phase 5: Automation (Week 11, Final)**
9. Epic 8.9: Message Retention Automation
   - Deploy edge function
   - Configure cron
   - Test cleanup

---

## 🧪 Testing Strategy

**Coverage Target:** > 85%

1. **Unit Tests (Vitest):**
   - Services: messagingService, realtimeService
   - Hooks: useMessages, useConversation, etc.
   - Utilities: compression, validation

2. **Integration Tests:**
   - RLS policies (20-30 tests)
   - Database functions
   - Storage bucket permissions

3. **E2E Tests (Puppeteer MCP):**
   - Send/receive messages
   - Media upload flow
   - Offline queue & sync
   - Edit/delete messages
   - Block user flow

---

## 🔧 Key Technologies

- **Frontend:** React, TypeScript, Zustand, TanStack Query
- **Backend:** Supabase (Postgres, Realtime, Storage, Edge Functions)
- **Offline:** IndexedDB (Dexie.js)
- **Media:** browser-image-compression
- **Testing:** Vitest, Puppeteer MCP
- **UI:** Shadcn components
- **Notifications:** Capacitor Push Notifications

---

## 📖 How to Use These Epics

1. **Start with Epic 8.1** - Set up database foundation
2. **Follow the order** - Each epic builds on previous ones
3. **Use MCP commands** - Speed up development with automation
4. **Check off stories** - Track progress as you complete tasks
5. **Test incrementally** - Don't wait until the end
6. **Deploy Epic 8.9 last** - Ensure message retention automation is active

---

## 📁 File Structure

```
docs/epics/
├── README.md                                      (This file)
├── EPIC_AUDIT_REPORT.md                           (Complete audit)
├── EPIC_8.1_Messaging_Foundation_Database.md      (1,467 lines)
├── EPIC_8.2_Core_Messaging_Implementation.md      (1,314 lines)
├── EPIC_8.3_Media_Rich_Content.md                 (551 lines)
├── EPIC_8.4_Offline_Support.md                    (556 lines)
├── EPIC_8.5_Advanced_Features.md                  (605 lines)
├── EPIC_8.6_Push_Notifications.md                 (445 lines)
├── EPIC_8.7_Moderation_Safety.md                  (515 lines)
├── EPIC_8.8_Testing_QA.md                         (581 lines)
└── EPIC_8.9_Message_Retention_Automation.md       (492 lines)
```

---

## ✅ Audit Results

**Status:** 🎉 **100% Complete** (No gaps remaining)

See `EPIC_AUDIT_REPORT.md` for detailed verification of:
- ✅ All 10 user clarifications addressed
- ✅ Integration with existing SynC infrastructure
- ✅ Complete database schema
- ✅ Realtime architecture
- ✅ Offline strategy
- ✅ Media strategy
- ✅ Testing coverage
- ✅ MCP integration
- ✅ **Message retention automation** (Epic 8.9 resolves final gap)

---

## 🎯 Next Steps

1. **Review Audit:** Read `EPIC_AUDIT_REPORT.md` for complete verification
2. **Begin Implementation:** Start with Epic 8.1
3. **Use MCP Servers:** Leverage automation throughout
4. **Track Progress:** Check off stories as you complete them
5. **Ask Questions:** If anything is unclear, revisit the epic or ask for clarification

---

**🔥 Your SynC messaging system is fully documented and ready to build!**

**Questions?** Review the audit report or open an issue if you find any gaps.

**Let's build! 🚀**
