# 🔧 MCP Integration Fixes - Implementation Plan

**Date:** 2025-01-13  
**Status:** Ready to Apply  
**Target:** Epics 8.2-8.9

---

## 📋 Fix Summary

| Epic | Fix Type | Priority | Status |
|------|----------|----------|--------|
| 8.2 | Overview + Story Commands | 🔴 Critical | ⏳ Pending |
| 8.3 | Overview Section | 🟡 Important | ⏳ Pending |
| 8.4 | Overview Section | 🟡 Important | ⏳ Pending |
| 8.5 | Overview Section | 🟡 Important | ⏳ Pending |
| 8.6 | Overview Section | 🟡 Important | ⏳ Pending |
| 8.7 | Overview Section | 🟡 Important | ⏳ Pending |
| 8.8 | Overview Section | 🟡 Important | ⏳ Pending |
| 8.9 | Overview Section | 🟡 Important | ⏳ Pending |

---

## 🎯 Standard MCP Overview Section Template

**Insert after "Success Criteria" section, before component details:**

```markdown
---

## 🎯 **MCP Integration Strategy**

**This epic follows the global MCP routing rule** to maximize development efficiency:

### **Primary MCP Servers Used:**

1. **🛢 Supabase MCP** (Heavy usage)
   - Execute SQL queries directly: `warp mcp run supabase "execute_sql ..."`
   - Apply migrations: `warp mcp run supabase "apply_migration ..."`
   - Test realtime subscriptions and RLS policies
   - Deploy edge functions

2. **🧠 Context7 MCP** (Medium usage)
   - Analyze code patterns and architecture
   - Find security vulnerabilities
   - Suggest performance optimizations
   - Identify untested code paths

3. **🌐 Chrome DevTools MCP** (Medium usage)
   - Debug UI rendering issues
   - Monitor network requests and performance
   - Check console errors in real-time
   - Test responsive design

4. **🤖 Puppeteer MCP** (For testing)
   - Automate E2E test flows
   - Test user journeys end-to-end
   - Verify cross-browser compatibility

5. **🎨 Shadcn MCP** (UI scaffolding)
   - Scaffold UI components: `warp mcp run shadcn "getComponent ..."`
   - Maintain design system consistency

**🔄 Automatic Routing:** Per the global MCP rule (`rule:yCm2e9oHOnrU5qbhrGa2IE`), these commands automatically route to the appropriate MCP server based on keywords.

**📖 Each story below includes specific MCP commands for implementation.**

---
```

---

## 🔧 Epic-Specific Customizations

### Epic 8.2 (Core Messaging)
**Primary MCPs:** Supabase (Heavy), Context7 (Heavy), Chrome DevTools (Medium), Shadcn (Medium)

**Custom Note:**
```markdown
**Key MCP Usage:**
- Use Supabase MCP extensively for testing realtime message delivery
- Use Context7 MCP to analyze React hooks and state management patterns
- Use Chrome DevTools MCP to debug message rendering performance
- Use Shadcn MCP to scaffold chat UI components
```

### Epic 8.3 (Media & Rich Content)
**Primary MCPs:** Supabase (Heavy), Chrome DevTools (Heavy), Puppeteer (Medium)

**Custom Note:**
```markdown
**Key MCP Usage:**
- Use Supabase MCP for storage bucket operations and media URL testing
- Use Chrome DevTools MCP to debug upload progress and file compression
- Use Puppeteer MCP to test media upload flows end-to-end
```

### Epic 8.4 (Offline Support)
**Primary MCPs:** Chrome DevTools (Heavy), Context7 (Medium), Puppeteer (Medium)

**Custom Note:**
```markdown
**Key MCP Usage:**
- Use Chrome DevTools MCP with network throttling to test offline scenarios
- Use Context7 MCP to analyze IndexedDB queue logic
- Use Puppeteer MCP to simulate offline/online transitions
```

### Epic 8.5 (Advanced Features)
**Primary MCPs:** Supabase (Heavy), Context7 (Medium), Puppeteer (Medium)

**Custom Note:**
```markdown
**Key MCP Usage:**
- Use Supabase MCP to test edit/delete time windows and full-text search
- Use Context7 MCP to analyze reaction system architecture
- Use Puppeteer MCP to test edit/delete flows
```

### Epic 8.6 (Push Notifications)
**Primary MCPs:** Supabase (Heavy), Context7 (Medium), Puppeteer (Low)

**Custom Note:**
```markdown
**Key MCP Usage:**
- Use Supabase MCP to deploy notification edge functions
- Use Context7 MCP to analyze Capacitor plugin integration
- Note: Real device testing required (Puppeteer limited for push notifications)
```

### Epic 8.7 (Moderation & Safety)
**Primary MCPs:** Supabase (Heavy), Context7 (Heavy), Puppeteer (Medium)

**Custom Note:**
```markdown
**Key MCP Usage:**
- Use Supabase MCP to test blocking RLS policies
- Use Context7 MCP to analyze spam detection algorithms
- Use Puppeteer MCP to test report/block flows
```

### Epic 8.8 (Testing & QA)
**Primary MCPs:** ALL (This is the testing epic!)

**Custom Note:**
```markdown
**Key MCP Usage:**
- Use Supabase MCP for integration and RLS testing
- Use Context7 MCP to find untested code and coverage gaps
- Use Puppeteer MCP as primary E2E testing tool
- Use Chrome DevTools MCP for debugging failing tests
```

### Epic 8.9 (Message Retention Automation)
**Primary MCPs:** Supabase (Heavy), Context7 (Low), Shadcn (Low)

**Custom Note:**
```markdown
**Key MCP Usage:**
- Use Supabase MCP to deploy and test cleanup edge functions
- Use Supabase MCP to verify cron jobs and admin logs
- Use Shadcn MCP for admin dashboard components
```

---

## 📝 Epic 8.2 Story Breakdown (NEW - MUST CREATE)

**Epic 8.2 is missing the entire story breakdown section!**

Here's the complete story breakdown to add:

```markdown
---

## 📋 **Story Breakdown for Epic 8.2**

### **Story 8.2.1: Messaging Service Implementation** (3 days)
**Tasks:**
- [ ] Create `src/services/messagingService.ts`
- [ ] Implement `createOrGetConversation()` method
- [ ] Implement `sendMessage()` method with validation
- [ ] Implement `fetchMessages()` with cursor-based pagination
- [ ] Implement `fetchConversations()` using conversation_list view
- [ ] Add comprehensive error handling
- [ ] Add TypeScript types for all methods

**🛢 MCP Integration (Supabase MCP):**
```bash
# Test createOrGetConversation function
warp mcp run supabase "execute_sql SELECT create_or_get_conversation('{friend-uuid-here}');"

# Test sending a message
warp mcp run supabase "execute_sql SELECT send_message('conv-id', 'Test message', 'text');"

# Verify conversation_list view
warp mcp run supabase "execute_sql SELECT * FROM conversation_list LIMIT 5;"
```

**🧠 MCP Integration (Context7 MCP):**
```bash
# Analyze service architecture
warp mcp run context7 "analyze messagingService.ts and identify potential error handling gaps"

# Check for race conditions
warp mcp run context7 "review messagingService.ts for potential race conditions in async operations"
```

**Acceptance Criteria:**
- ✅ All service methods work reliably
- ✅ Error handling covers all edge cases
- ✅ Messages sent successfully via RPC
- ✅ Pagination works smoothly

**Estimated Effort:** 3 days

---

### **Story 8.2.2: Realtime Service Implementation** (3 days)
**Tasks:**
- [ ] Create `src/services/realtimeService.ts`
- [ ] Implement `subscribeToMessages()` with postgres_changes
- [ ] Implement `subscribeToConversations()` for list updates
- [ ] Implement typing indicators via broadcast channel
- [ ] Implement presence tracking for online/offline status
- [ ] Add channel cleanup and unsubscribe logic
- [ ] Handle reconnection scenarios

**🛢 MCP Integration (Supabase MCP):**
```bash
# Test realtime subscription manually
warp mcp run supabase "execute_sql INSERT INTO messages (conversation_id, sender_id, content) VALUES ('test-conv', auth.uid(), 'Test realtime');"

# Verify realtime is enabled
warp mcp run supabase "execute_sql SELECT schemaname, tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime';"
```

**🌐 MCP Integration (Chrome DevTools MCP):**
```bash
# Monitor realtime connections
warp mcp run chrome-devtools "open devtools, monitor WebSocket connections while sending messages"
```

**Acceptance Criteria:**
- ✅ Messages appear instantly for recipients
- ✅ Typing indicators work in real-time
- ✅ Presence status updates correctly
- ✅ Reconnection logic handles network drops

**Estimated Effort:** 3 days

---

### **Story 8.2.3: Zustand Store Setup** (2 days)
**Tasks:**
- [ ] Create `src/store/messagingStore.ts`
- [ ] Define store schema (conversations, messages maps, etc.)
- [ ] Implement actions for conversations (set, add, update)
- [ ] Implement actions for messages (add, remove, prepend)
- [ ] Implement actions for unread counts
- [ ] Implement actions for typing indicators
- [ ] Add Zustand devtools integration
- [ ] Optimize re-render performance

**🧠 MCP Integration (Context7 MCP):**
```bash
# Analyze state management patterns
warp mcp run context7 "analyze messagingStore.ts and suggest performance optimizations for large message lists"

# Check for memory leaks
warp mcp run context7 "review messagingStore.ts for potential memory leaks with Map data structures"
```

**Acceptance Criteria:**
- ✅ Store updates efficiently (no unnecessary re-renders)
- ✅ Devtools show all actions clearly
- ✅ State shape matches TypeScript types
- ✅ No memory leaks with large datasets

**Estimated Effort:** 2 days

---

### **Story 8.2.4: Custom React Hooks** (3 days)
**Tasks:**
- [ ] Create `src/hooks/useConversations.ts`
- [ ] Create `src/hooks/useMessages.ts` with pagination
- [ ] Create `src/hooks/useSendMessage.ts`
- [ ] Create `src/hooks/useTypingIndicator.ts`
- [ ] Add loading states to all hooks
- [ ] Add error handling to all hooks
- [ ] Integrate realtime subscriptions in hooks

**🧠 MCP Integration (Context7 MCP):**
```bash
# Analyze hook patterns
warp mcp run context7 "analyze all hooks in src/hooks/ and identify potential infinite loop issues"

# Check dependency arrays
warp mcp run context7 "review useEffect dependency arrays in messaging hooks for correctness"
```

**🌐 MCP Integration (Chrome DevTools MCP):**
```bash
# Profile hook performance
warp mcp run chrome-devtools "open React DevTools profiler and analyze useMessages hook performance"
```

**Acceptance Criteria:**
- ✅ Hooks follow React best practices
- ✅ No infinite render loops
- ✅ Dependency arrays are correct
- ✅ Loading and error states handled

**Estimated Effort:** 3 days

---

### **Story 8.2.5: Conversation List UI** (3 days)
**Tasks:**
- [ ] Create `ConversationListPage.tsx`
- [ ] Create `ConversationCard.tsx` component
- [ ] Add search/filter functionality
- [ ] Add unread badge indicators
- [ ] Add last message preview
- [ ] Add timestamp formatting (relative time)
- [ ] Handle empty state
- [ ] Add pull-to-refresh (mobile)

**🎨 MCP Integration (Shadcn MCP):**
```bash
# Scaffold UI components
warp mcp run shadcn "getComponent badge"
warp mcp run shadcn "getComponent avatar"
warp mcp run shadcn "getComponent input"
```

**🌐 MCP Integration (Chrome DevTools MCP):**
```bash
# Debug UI rendering
warp mcp run chrome-devtools "inspect conversation list, check for layout shifts and scroll performance"
```

**Acceptance Criteria:**
- ✅ List loads in < 500ms
- ✅ Scroll performance is 60fps
- ✅ Search/filter works instantly
- ✅ Responsive on all screen sizes

**Estimated Effort:** 3 days

---

### **Story 8.2.6: Chat Screen UI** (4 days)
**Tasks:**
- [ ] Create `ChatScreen.tsx`
- [ ] Create `MessageList.tsx` with virtual scrolling
- [ ] Create `MessageBubble.tsx` component
- [ ] Create `MessageComposer.tsx` (text input + send button)
- [ ] Add typing indicator display
- [ ] Add auto-scroll to bottom on new messages
- [ ] Add load more (pagination) on scroll up
- [ ] Add message status indicators (sending, sent, delivered, read)

**🎨 MCP Integration (Shadcn MCP):**
```bash
# Scaffold chat components
warp mcp run shadcn "getComponent textarea"
warp mcp run shadcn "getComponent button"
```

**🌐 MCP Integration (Chrome DevTools MCP):**
```bash
# Test message rendering performance
warp mcp run chrome-devtools "open performance profiler and test rendering 1000 messages"
```

**Acceptance Criteria:**
- ✅ Messages render smoothly (60fps)
- ✅ Virtual scrolling works for 1000+ messages
- ✅ Typing indicators appear in real-time
- ✅ Auto-scroll works reliably

**Estimated Effort:** 4 days

---

### **Story 8.2.7: Message Sending & Receiving** (2 days)
**Tasks:**
- [ ] Integrate sendMessage hook with UI
- [ ] Add optimistic UI updates (show message immediately)
- [ ] Handle message send failures (retry/queue)
- [ ] Mark messages as read when viewed
- [ ] Update conversation list on new message
- [ ] Show read receipts (checkmarks)
- [ ] Add message timestamp formatting

**🛢 MCP Integration (Supabase MCP):**
```bash
# Test message flow end-to-end
warp mcp run supabase "execute_sql SELECT * FROM messages WHERE conversation_id = 'test-conv' ORDER BY created_at DESC LIMIT 10;"

# Verify read receipts
warp mcp run supabase "execute_sql SELECT * FROM message_read_receipts WHERE message_id = 'msg-id';"
```

**🤖 MCP Integration (Puppeteer MCP):**
```bash
# E2E test sending messages
warp mcp run puppeteer "e2e test send message flow from user A to user B and verify delivery"
```

**Acceptance Criteria:**
- ✅ Messages send reliably
- ✅ Optimistic UI prevents perceived lag
- ✅ Read receipts work correctly
- ✅ Failed messages show retry option

**Estimated Effort:** 2 days

---

### **Story 8.2.8: Polish & Testing** (2 days)
**Tasks:**
- [ ] Add loading skeletons for all components
- [ ] Add empty states for all screens
- [ ] Add error boundaries
- [ ] Test on mobile devices (iOS + Android)
- [ ] Test accessibility (screen reader, keyboard nav)
- [ ] Performance testing (1000+ messages, 50+ conversations)
- [ ] Fix any UI bugs found

**🌐 MCP Integration (Chrome DevTools MCP):**
```bash
# Test accessibility
warp mcp run chrome-devtools "run Lighthouse accessibility audit on chat screen"

# Test mobile responsiveness
warp mcp run chrome-devtools "test on device emulator: iPhone 12, Galaxy S21"
```

**🧠 MCP Integration (Context7 MCP):**
```bash
# Find potential bugs
warp mcp run context7 "analyze messaging components and identify potential edge cases or bugs"
```

**Acceptance Criteria:**
- ✅ All components have loading states
- ✅ Error boundaries catch crashes
- ✅ Accessibility score > 90%
- ✅ Works on iOS, Android, Web

**Estimated Effort:** 2 days

---

## ✅ **Definition of Done for Epic 8.2**

- [x] All 8 stories completed and tested
- [x] messagingService fully functional
- [x] realtimeService handles all edge cases
- [x] Zustand store optimized for performance
- [x] All custom hooks tested
- [x] Conversation list loads < 500ms
- [x] Chat screen renders smoothly (60fps)
- [x] Messages send/receive reliably
- [x] Tests passing (unit + integration + E2E)
- [x] Accessibility compliant
- [x] Mobile responsive

---

## 🧪 **Testing Strategy for Epic 8.2**

### **Unit Tests (Vitest)**
```bash
# Test services
npm run test src/services/messagingService.test.ts
npm run test src/services/realtimeService.test.ts

# Test hooks
npm run test src/hooks/useMessages.test.ts
npm run test src/hooks/useSendMessage.test.ts
```

### **Integration Tests with Supabase MCP**
```bash
# Test realtime subscriptions
warp mcp run supabase "execute_sql INSERT INTO messages (...) VALUES (...); SELECT pg_sleep(1); SELECT * FROM messages WHERE id = 'new-msg-id';"
```

### **E2E Tests with Puppeteer MCP**
```bash
# Critical flow: Send message end-to-end
warp mcp run puppeteer "e2e test complete messaging flow from conversation list to sending message"

# Critical flow: Realtime message delivery
warp mcp run puppeteer "e2e test open two browsers, send message from A, verify it appears instantly for B"
```

---

**Epic 8.2 Status:** 📋 **Ready for Implementation with Full MCP Integration**  
**Next Epic:** [EPIC_8.3_Media_Rich_Content.md](./EPIC_8.3_Media_Rich_Content.md)
```

---

## ⏱️ Timeline to Apply Fixes

| Task | Time Estimate |
|------|---------------|
| Add MCP overview to Epic 8.2 | 10 minutes |
| Add story breakdown to Epic 8.2 | 15 minutes |
| Add MCP overview to Epics 8.3-8.9 (7 epics) | 35 minutes (5 min each) |
| Verify all changes | 10 minutes |
| **Total** | **~70 minutes** |

---

## 🎯 Application Order

1. ✅ Epic 8.1 - Already complete (skip)
2. **Epic 8.2** - Add overview + story breakdown (Priority 1)
3. **Epic 8.3** - Add overview section only
4. **Epic 8.4** - Add overview section only
5. **Epic 8.5** - Add overview section only
6. **Epic 8.6** - Add overview section only
7. **Epic 8.7** - Add overview section only
8. **Epic 8.8** - Add overview section only
9. **Epic 8.9** - Add overview section only

---

## ✅ Success Criteria

- [ ] All epics (8.2-8.9) have MCP Integration Strategy section
- [ ] Epic 8.2 has complete story breakdown with MCP commands
- [ ] All MCP commands follow `warp mcp run <server> "<command>"` format
- [ ] Commands align with global MCP routing rule
- [ ] Consistent formatting across all epics
- [ ] No broken references or syntax errors

---

**Ready to apply these fixes programmatically!**
