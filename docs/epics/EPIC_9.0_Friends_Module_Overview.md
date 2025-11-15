# 👥 EPIC 9.x: Facebook-Level Friends Module - Complete Roadmap

**Epic Series Owner:** Product / Engineering  
**Overall Timeline:** 8-10 weeks  
**Status:** 📋 Planning  
**Integration with:** Epic 8.x (Messaging), Epic 2 (Authentication)

---

## 🎯 **Series Overview**

Build a **Facebook-level friends system** for SynC that includes:
- ✅ Bidirectional friend relationships (mutual friendships)
- ✅ Friend request workflow (send → accept/reject → notification)
- ✅ Friend search & discovery ("People You May Know")
- ✅ One-way follow system (Instagram/Twitter-style)
- ✅ User blocking for privacy and safety
- ✅ Online/offline status tracking
- ✅ Friend recommendations engine
- ✅ Privacy controls & settings
- ✅ **Cross-platform: Web + iOS + Android (Capacitor)**
- ✅ **Full MCP integration** following `rule:yCm2e9oHOnrU5qbhrGa2IE`

---

## 📋 **Epic Series Structure**

### **EPIC 9.1: Friends Foundation - Database Schema & Core Infrastructure** 🔴 CRITICAL
**Timeline:** Week 1-2 (2 weeks)  
**Status:** ✅ **COMPLETE** - Documentation created  
**File:** `EPIC_9.1_Friends_Foundation_Database.md`

**What it includes:**
- Audit & migrate existing friends schema
- Bidirectional friendships table (Facebook-style)
- Friend requests with auto-expiry (30 days)
- Follow system (Instagram-style one-way relationships)
- User blocking system
- Profiles extension (online status, friend counts)
- Database functions (unfriend, mutual friends, search)
- Notifications integration
- **Integration with Epic 8.x messaging** (only friends can message)

**Key Deliverables:**
- 9 database migration files
- Complete RLS policies
- Database functions for all friend operations
- Integration with messaging module

**MCP Usage:** 🛢 Supabase MCP (Heavy), 🧠 Context7 MCP (Medium), 🐙 GitHub MCP

---

### **EPIC 9.2: Friend Discovery & Search** 🔴 CRITICAL
**Timeline:** Week 3-4 (2 weeks)  
**Status:** 📋 Planning  
**File:** `EPIC_9.2_Friend_Discovery_Search.md` (to be created)

**What it includes:**
- **Global friend search** with fuzzy matching and ranking
- **"People You May Know" (PYMK)** recommendation engine
  - Based on mutual friends
  - Location proximity
  - Shared groups/interests
  - Contact sync matching
- **Friend suggestions** in deal sharing flows
- **Search filters** (location, mutual friends, etc.)
- **Search history** and recent searches
- **Contact sync integration** (iOS Contacts, Android Contacts)

**Stories:**
1. STORY 9.2.1: Global Friend Search with Fuzzy Matching
2. STORY 9.2.2: "People You May Know" Recommendation Engine
3. STORY 9.2.3: Contact Sync Integration (iOS/Android)
4. STORY 9.2.4: Search Filters & Advanced Search
5. STORY 9.2.5: Search Performance Optimization (< 50ms)
6. STORY 9.2.6: Friend Suggestions in Deal Sharing

**MCP Usage:** 🛢 Supabase MCP (Edge Functions), 🧠 Context7 MCP, 🤖 Puppeteer MCP (E2E tests)

---

### **EPIC 9.3: Friends UI Components (Web + Mobile)** 🔴 CRITICAL
**Timeline:** Week 5-6 (2 weeks)  
**Status:** 📋 Planning  
**File:** `EPIC_9.3_Friends_UI_Components.md` (to be created)

**What it includes:**
- **Friends List UI** with online status indicators
- **Friend Requests UI** (received/sent tabs)
- **Friend Profile Modal** (view friend details, mutual friends)
- **Friend Actions Menu** (unfriend, block, follow/unfollow, message)
- **Search Results UI** with infinite scroll
- **People You May Know** cards
- **Contact Sync Permission Flow** (native iOS/Android)
- **Platform-specific optimizations**:
  - Web: Mouse/keyboard interactions
  - iOS: Native gestures, haptic feedback, safe areas
  - Android: Material Design, back button support

**Stories:**
1. STORY 9.3.1: Friends List Component (Web + Mobile)
2. STORY 9.3.2: Friend Requests UI (Received/Sent)
3. STORY 9.3.3: Friend Profile Modal & Actions Menu
4. STORY 9.3.4: Friend Search UI with Filters
5. STORY 9.3.5: People You May Know Cards
6. STORY 9.3.6: Contact Sync Permission Flow (iOS/Android)
7. STORY 9.3.7: Online Status Indicators & Badges
8. STORY 9.3.8: Empty States & Loading Skeletons

**MCP Usage:** 🎨 Shadcn MCP (Heavy), 🌐 Chrome DevTools MCP, 🤖 Puppeteer MCP

---

### **EPIC 9.4: Friends Service Layer & Business Logic** 🟡 MEDIUM
**Timeline:** Week 5-6 (runs parallel with 9.3)  
**Status:** 📋 Planning  
**File:** `EPIC_9.4_Friends_Service_Layer.md` (to be created)

**What it includes:**
- **friendsService.ts** - Complete rewrite using new schema
  - `getFriends()` - With online status
  - `sendFriendRequest()` - With validation
  - `acceptFriendRequest()` - Calls database function
  - `rejectFriendRequest()`
  - `unfriend()` - With confirmation
  - `blockUser()` - Removes friendship + follows
  - `unblockUser()`
  - `searchFriends()` - Full-text search
  - `getMutualFriends()`
  - `getOnlineFriendsCount()`
- **React hooks** - `useFriends`, `useFriendRequests`, `useFriendSearch`
- **Zustand store** - `friendsStore` for global state
- **Real-time subscriptions** - Live friend status updates
- **Error handling** & retry logic
- **Offline support** - Queue friend requests when offline

**Stories:**
1. STORY 9.4.1: Friends Service Rewrite (TypeScript)
2. STORY 9.4.2: React Hooks (useFriends, useFriendRequests, useFriendSearch)
3. STORY 9.4.3: Zustand Store for Friends State
4. STORY 9.4.4: Real-time Subscriptions (Supabase Realtime)
5. STORY 9.4.5: Error Handling & Retry Logic
6. STORY 9.4.6: Offline Support & Queue Management

**MCP Usage:** 🧠 Context7 MCP (Heavy), 🛢 Supabase MCP (Testing)

---

### **EPIC 9.5: Privacy Controls & Settings** 🟡 MEDIUM
**Timeline:** Week 7 (1 week)  
**Status:** 📋 Planning  
**File:** `EPIC_9.5_Privacy_Settings.md` (to be created)

**What it includes:**
- **Friend request privacy** - Who can send you requests?
  - Everyone
  - Friends of friends only
  - No one (disable requests)
- **Profile visibility** - Who can see your profile?
  - Public
  - Friends only
  - Friends of friends
- **Search visibility** - Can people find you in search?
- **Online status visibility** - Show online status to:
  - Everyone
  - Friends only
  - No one
- **Follower controls** - Who can follow you?
- **Block list management** UI
- **Privacy dashboard** in settings

**Stories:**
1. STORY 9.5.1: Privacy Settings Database Schema
2. STORY 9.5.2: Friend Request Privacy Controls
3. STORY 9.5.3: Profile & Search Visibility Settings
4. STORY 9.5.4: Online Status Visibility Controls
5. STORY 9.5.5: Block List Management UI
6. STORY 9.5.6: Privacy Dashboard in Settings

**MCP Usage:** 🛢 Supabase MCP, 🎨 Shadcn MCP, 🌐 Chrome DevTools MCP

---

### **EPIC 9.6: Friend Activity Feed & Notifications** 🟡 MEDIUM
**Timeline:** Week 7 (1 week, parallel with 9.5)  
**Status:** 📋 Planning  
**File:** `EPIC_9.6_Friend_Activity_Notifications.md` (to be created)

**What it includes:**
- **Friend activity feed** - See what friends are doing
  - Friends added other friends
  - Friends joined SynC
  - Friends' deal activity (if public)
- **Push notifications** (FCM/APNs)
  - New friend request
  - Friend request accepted
  - Friend's birthday
  - Friend shared a deal with you
- **In-app notification center** with bell icon
- **Notification preferences** - Customize what you want to receive
- **Email notifications** (optional)

**Stories:**
1. STORY 9.6.1: Friend Activity Feed Database Schema
2. STORY 9.6.2: Activity Feed UI Component
3. STORY 9.6.3: Push Notifications Setup (FCM/APNs)
4. STORY 9.6.4: In-App Notification Center
5. STORY 9.6.5: Notification Preferences UI
6. STORY 9.6.6: Email Notifications Integration

**MCP Usage:** 🛢 Supabase MCP (Edge Functions), 🎨 Shadcn MCP, 🤖 Puppeteer MCP

---

### **EPIC 9.7: Friends & Deal Sharing Integration** 🔴 CRITICAL
**Timeline:** Week 8 (1 week)  
**Status:** 📋 Planning  
**File:** `EPIC_9.7_Friends_Deal_Sharing.md` (to be created)

**What it includes:**
- **Share deal with friends** UI flow
  - Select friends to share with
  - Add custom message
  - Send as message or notification
- **Friend tags in deals** - Tag friends in deal comments
- **Deal recommendations** - Show deals your friends liked
- **Friend leaderboard** - Top deal hunters among friends
- **Group deal hunting** - Collaborative deal finding (future)

**Stories:**
1. STORY 9.7.1: Share Deal with Friends UI
2. STORY 9.7.2: Friend Tags in Deal Comments
3. STORY 9.7.3: Friend-Based Deal Recommendations
4. STORY 9.7.4: Friend Leaderboard (Top Deal Hunters)
5. STORY 9.7.5: Integration with Existing ShareDeal Component
6. STORY 9.7.6: Deal Sharing Analytics

**MCP Usage:** 🧠 Context7 MCP (Heavy), 🛢 Supabase MCP, 🎨 Shadcn MCP

---

### **EPIC 9.8: Testing, Performance & QA** 🔴 CRITICAL
**Timeline:** Week 9 (1 week)  
**Status:** 📋 Planning  
**File:** `EPIC_9.8_Testing_Performance_QA.md` (to be created)

**What it includes:**
- **Unit tests** for all friend services and hooks
- **Integration tests** for friend request workflow
- **E2E tests** for complete user flows
  - Send friend request → receive → accept → message
  - Search friends → send request
  - Block user → unblock
- **Performance benchmarks**
  - Friend list load time (< 300ms)
  - Search response time (< 50ms)
  - PYMK generation time (< 100ms)
- **RLS security audit** - Verify no data leaks
- **Load testing** - 1000+ friends per user
- **Cross-platform testing** - Web, iOS, Android

**Stories:**
1. STORY 9.8.1: Unit Tests (Services, Hooks, Functions)
2. STORY 9.8.2: Integration Tests (Friend Request Flow)
3. STORY 9.8.3: E2E Tests (Puppeteer) - Complete Flows
4. STORY 9.8.4: Performance Benchmarks & Optimization
5. STORY 9.8.5: RLS Security Audit
6. STORY 9.8.6: Load Testing (1000+ Friends)
7. STORY 9.8.7: Cross-Platform Testing (Web/iOS/Android)

**MCP Usage:** 🤖 Puppeteer MCP (Heavy), 🛢 Supabase MCP, 🧠 Context7 MCP

---

### **EPIC 9.9: Documentation & Developer Experience** 🟡 MEDIUM
**Timeline:** Week 10 (1 week)  
**Status:** 📋 Planning  
**File:** `EPIC_9.9_Documentation_DX.md` (to be created)

**What it includes:**
- **API documentation** - Complete reference for friends module
- **Component storybook** - Visual component library
- **Migration guide** - From old to new friends system
- **Developer onboarding** - How to work with friends module
- **Troubleshooting guide** - Common issues and solutions
- **Architecture diagrams** - Visual system overview
- **Code examples** - Common patterns and usage

**Stories:**
1. STORY 9.9.1: API Documentation (friends services & hooks)
2. STORY 9.9.2: Component Storybook for Friends UI
3. STORY 9.9.3: Migration Guide (Old → New System)
4. STORY 9.9.4: Developer Onboarding Documentation
5. STORY 9.9.5: Troubleshooting Guide & FAQ
6. STORY 9.9.6: Architecture Diagrams (Mermaid)
7. STORY 9.9.7: Code Examples & Best Practices

**MCP Usage:** 🧠 Context7 MCP, 🎨 Shadcn MCP (for Storybook)

---

## 🔗 **Integration with Existing Systems**

### **Epic 8.x (Messaging):**
- Only friends can create conversations (RLS policy)
- Blocked users cannot message each other
- Friend online status shown in message threads
- Start conversation from friends list
- Friend picker in new conversation flow

### **Epic 2 (Authentication):**
- Friend relationships tied to user accounts
- RLS policies use `auth.uid()`
- Profile data from `profiles` table

### **Existing Friends Code:**
```
✅ KEEP & ENHANCE:
- src/services/friendService.ts (rewrite with new schema)
- src/hooks/useFriends.ts (update queries)
- src/components/ContactsSidebar*.tsx (update UI)

❌ MIGRATE AWAY FROM:
- Old friendships schema (migrate data)
- Old friend request flow (replace with new)

✅ INTEGRATE WITH:
- Epic 8.x messaging (create_or_get_direct_conversation)
- ShareDeal component (friend selection)
- Notifications system (friend events)
```

---

## 📊 **Overall Success Criteria**

| Metric | Target |
|--------|--------|
| **Friend list load time** | < 300ms (1000 friends) |
| **Friend search response** | < 50ms |
| **Friend request flow** | < 500ms end-to-end |
| **Online status update** | < 2 seconds real-time |
| **RLS security** | 100% tables protected |
| **Test coverage** | > 80% unit + integration |
| **Cross-platform parity** | 100% feature parity |
| **User satisfaction** | > 4.5/5 stars |
| **Friend request acceptance rate** | > 60% |
| **Zero data loss** | During migration |

---

## 🎯 **MCP Integration Strategy (Series-Wide)**

Following `rule:yCm2e9oHOnrU5qbhrGa2IE`, all epics use:

### **🛢 Supabase MCP** (Heavy usage across all epics)
- Database migrations
- SQL queries and functions
- RLS policy testing
- Edge function deployment
- Real-time subscription testing

### **🧠 Context7 MCP** (Heavy usage in Epic 9.4, 9.7, 9.8)
- Code analysis and refactoring
- Find integration points
- Dependency graph analysis
- Security vulnerability scanning

### **🎨 Shadcn MCP** (Heavy usage in Epic 9.3, 9.5, 9.6)
- UI component scaffolding
- Design system consistency
- Storybook setup

### **🌐 Chrome DevTools MCP** (Medium usage in Epic 9.3, 9.5)
- UI debugging and layout
- Network request inspection
- Performance profiling

### **🤖 Puppeteer MCP** (Heavy usage in Epic 9.8)
- E2E test automation
- User flow testing
- Cross-browser testing

### **🐙 GitHub MCP** (Light usage across all epics)
- Issue tracking
- PR management
- Code review automation

---

## 📈 **Phased Rollout Strategy**

### **Phase 1: Foundation (Weeks 1-2) - EPIC 9.1**
- Database schema migration
- Core friend operations
- Integration with messaging
- **Risk:** Data migration complexity
- **Mitigation:** Branch database testing, rollback plan

### **Phase 2: Discovery & UI (Weeks 3-6) - EPIC 9.2, 9.3, 9.4**
- Friend search and recommendations
- UI components (web + mobile)
- Service layer and hooks
- **Risk:** Performance with 1000+ friends
- **Mitigation:** Database indexing, pagination, caching

### **Phase 3: Advanced Features (Weeks 7-8) - EPIC 9.5, 9.6, 9.7**
- Privacy controls
- Activity feed & notifications
- Deal sharing integration
- **Risk:** Feature complexity
- **Mitigation:** Incremental rollout with feature flags

### **Phase 4: Quality Assurance (Weeks 9-10) - EPIC 9.8, 9.9**
- Comprehensive testing
- Performance optimization
- Documentation
- **Risk:** Uncaught bugs in production
- **Mitigation:** Staging environment testing, gradual rollout

---

## 🚀 **Getting Started**

### **Step 1: Review Current State**
```bash
# Analyze existing friends module
warp mcp run context7 "analyze src/services/friendService.ts"
warp mcp run context7 "find usage of useFriends hook"

# Check database schema
warp mcp run supabase "list_tables schemas=['public'] filter='friend'"
```

### **Step 2: Start with EPIC 9.1**
1. Read `EPIC_9.1_Friends_Foundation_Database.md`
2. Review all 9 stories in Epic 9.1
3. Start with STORY 9.1.1 (Audit existing schema)
4. Apply migrations incrementally
5. Test each migration thoroughly

### **Step 3: Follow Epic Order**
- Complete Epic 9.1 before starting Epic 9.2
- Epic 9.3 and 9.4 can run in parallel (different team members)
- Epic 9.5 and 9.6 can run in parallel
- Epic 9.7 requires Epic 9.3 and 9.4 to be complete
- Epic 9.8 starts once Epic 9.7 is complete
- Epic 9.9 runs throughout but finalizes in week 10

---

## 📚 **Documentation Structure**

```
docs/
├── epics/
│   ├── EPIC_9.0_Friends_Module_Overview.md (this file)
│   ├── EPIC_9.1_Friends_Foundation_Database.md ✅ COMPLETE
│   ├── EPIC_9.2_Friend_Discovery_Search.md
│   ├── EPIC_9.3_Friends_UI_Components.md
│   ├── EPIC_9.4_Friends_Service_Layer.md
│   ├── EPIC_9.5_Privacy_Settings.md
│   ├── EPIC_9.6_Friend_Activity_Notifications.md
│   ├── EPIC_9.7_Friends_Deal_Sharing.md
│   ├── EPIC_9.8_Testing_Performance_QA.md
│   └── EPIC_9.9_Documentation_DX.md
├── stories/
│   ├── STORY_9.1.1_Audit_Migrate_Schema.md
│   ├── STORY_9.1.2_Bidirectional_Friendships.md
│   ├── ... (70+ stories total across all epics)
├── schema/
│   ├── friends_database_schema.md
│   └── friends_current_state.md
├── api/
│   └── friends_api_reference.md
└── migration/
    └── friends_migration_guide.md
```

---

## ⚠️ **Known Risks & Mitigation**

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| **Data loss during migration** | 🔴 Critical | 🟡 Medium | Branch database testing, backups, rollback plan |
| **Performance degradation (1000+ friends)** | 🟡 High | 🟡 Medium | Database indexing, pagination, caching |
| **Breaking changes to Epic 8.x** | 🔴 Critical | 🟢 Low | Comprehensive integration tests, backward compatibility |
| **Cross-platform inconsistencies** | 🟡 High | 🟡 Medium | Platform abstraction layer, shared business logic |
| **RLS security vulnerabilities** | 🔴 Critical | 🟢 Low | Security audit, automated RLS tests |
| **Scope creep** | 🟡 High | 🟡 Medium | Strict epic boundaries, feature flags for v2 features |

---

## 🎓 **References**

### **Inspiration:**
- **Facebook Friends Module** - Reference document provided by user
- **Instagram Follow System** - One-way relationships
- **Twitter Social Graph** - Followers/following
- **LinkedIn Connections** - Professional network patterns

### **Technical References:**
- **Epic 8.x (Messaging)** - Integration patterns
- **Supabase RLS Best Practices** - Security patterns
- **Supabase Realtime** - Real-time subscriptions
- **Capacitor Docs** - Cross-platform patterns

---

**Ready to begin?** Start with [EPIC 9.1: Friends Foundation - Database Schema](./EPIC_9.1_Friends_Foundation_Database.md) 🚀
