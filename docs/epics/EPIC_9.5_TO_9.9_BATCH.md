# 📋 EPIC 9.5 - 9.9: Final Friends Module Epics

This document contains epics 9.5 through 9.9. Each will be split into separate files after review.

---

# 🔒 EPIC 9.5: Privacy Controls & Settings

**Timeline:** Week 7 (1 week)  
**Dependencies:** Epic 9.1, 9.3, 9.4

## 🎯 Goal
Implement comprehensive privacy controls for friends module matching Facebook's privacy features.

## 🗂️ Stories (6 total)

### **STORY 9.5.1: Privacy Settings Schema** ⏱️ 1 day
- Add `privacy_settings` JSONB column to `profiles`
- Default privacy settings on signup
- Database functions to validate privacy rules

### **STORY 9.5.2: Friend Request Privacy** ⏱️ 1 day
- Settings: Everyone, Friends of Friends, No one
- RLS policies enforce privacy rules
- "Who can send you friend requests?" UI

### **STORY 9.5.3: Profile & Search Visibility** ⏱️ 1 day
- Settings: Public, Friends only, Friends of friends
- "Who can see your profile?" UI
- "Can people find you in search?" toggle

### **STORY 9.5.4: Online Status Visibility** ⏱️ 1 day
- Settings: Everyone, Friends only, No one
- Hide last active timestamp per setting
- Real-time respect for visibility rules

### **STORY 9.5.5: Block List Management** ⏱️ 1 day
- View blocked users list
- Unblock button with confirmation
- Search within blocked list

### **STORY 9.5.6: Privacy Dashboard** ⏱️ 1 day
- Settings page: "Friends & Privacy"
- All privacy controls in one place
- Privacy audit log (who viewed your profile)

---

# 🔔 EPIC 9.6: Friend Activity Feed & Notifications

**Timeline:** Week 7 (1 week, parallel with 9.5)  
**Dependencies:** Epic 9.1, 9.4

## 🎯 Goal
Build activity feed and push notifications for friend events.

## 🗂️ Stories (6 total)

### **STORY 9.6.1: Activity Feed Schema** ⏱️ 1 day
- `friend_activities` table (if not exists)
- Activity types: friend_added, friend_joined, deal_liked
- Database triggers for auto-logging

### **STORY 9.6.2: Activity Feed UI** ⏱️ 1 day
- Timeline component
- Activity cards with icons
- "See all activity" link

### **STORY 9.6.3: Push Notifications (FCM/APNs)** ⏱️ 2 days
- Setup FCM (Android) and APNs (iOS)
- Device token registration
- Notification triggers:
  - New friend request
  - Friend request accepted
  - Friend's birthday
  - Friend shared deal

### **STORY 9.6.4: In-App Notification Center** ⏱️ 1 day
- Bell icon in header with badge count
- Dropdown notification list
- Mark as read functionality

### **STORY 9.6.5: Notification Preferences** ⏱️ 1/2 day
- Settings page: "Notifications"
- Toggle for each notification type
- Mute notifications temporarily

### **STORY 9.6.6: Email Notifications** ⏱️ 1/2 day
- Resend integration (or SendGrid)
- Email templates for friend events
- Unsubscribe link

---

# 🤝 EPIC 9.7: Friends & Deal Sharing Integration

**Timeline:** Week 8 (1 week)  
**Dependencies:** Epic 9.3, 9.4

## 🎯 Goal
Integrate friends module with deal/offer features for social deal sharing.

## 🗂️ Stories (6 total)

### **STORY 9.7.1: Share Deal with Friends UI** ⏱️ 2 days
- "Share with friends" button on deal page
- Friend picker modal (multi-select)
- Add custom message
- Send as message OR notification

### **STORY 9.7.2: Friend Tags in Deal Comments** ⏱️ 1 day
- @mention autocomplete in comments
- Tag friends with "@username"
- Notification on tag

### **STORY 9.7.3: Friend-Based Deal Recommendations** ⏱️ 1 day
- "Deals your friends liked" section
- Algorithm: friends' recent likes/saves
- Display friend avatars on deals

### **STORY 9.7.4: Friend Leaderboard** ⏱️ 1 day
- "Top Deal Hunters Among Friends"
- Sort by deals found this month
- Gamification: badges for milestones

### **STORY 9.7.5: Integration with ShareDeal** ⏱️ 1 day
- Update existing `ShareDeal.tsx` component
- Add friends option alongside email/link
- Analytics tracking

### **STORY 9.7.6: Deal Sharing Analytics** ⏱️ 1 day
- Track: share events, click-through rate
- Dashboard: "Your most shared deals"

---

# ✅ EPIC 9.8: Testing, Performance & QA

**Timeline:** Week 9 (1 week)  
**Dependencies:** All previous epics

## 🎯 Goal
Comprehensive testing and performance optimization for production readiness.

## 🗂️ Stories (7 total)

### **STORY 9.8.1: Unit Tests** ⏱️ 2 days
- Services: 80%+ coverage
- Hooks: 80%+ coverage
- Database functions: 100% coverage
- Vitest + React Testing Library

### **STORY 9.8.2: Integration Tests** ⏱️ 1 day
- Friend request flow (send → receive → accept)
- Block user flow
- Search flow

### **STORY 9.8.3: E2E Tests (Puppeteer)** ⏱️ 2 days
- Complete user journey:
  1. Signup → Search friends → Send request
  2. Receive request → Accept → Message
  3. Block user → Unblock
- Cross-browser: Chrome, Firefox, Safari

### **STORY 9.8.4: Performance Benchmarks** ⏱️ 1 day
- Friends list load (target: < 300ms)
- Search response (target: < 50ms)
- PYMK generation (target: < 100ms)
- Lighthouse score > 90

### **STORY 9.8.5: RLS Security Audit** ⏱️ 1 day
- Verify no data leaks
- Test all RLS policies
- Penetration testing

### **STORY 9.8.6: Load Testing** ⏱️ 1 day
- Simulate 1000+ friends per user
- Test concurrent requests
- Database query optimization

### **STORY 9.8.7: Cross-Platform Testing** ⏱️ 1 day
- Web: All browsers
- iOS: Simulator + real device
- Android: Emulator + real device

---

# 📚 EPIC 9.9: Documentation & Developer Experience

**Timeline:** Week 10 (1 week)  
**Dependencies:** All previous epics

## 🎯 Goal
Complete documentation for developers and end-users.

## 🗂️ Stories (7 total)

### **STORY 9.9.1: API Documentation** ⏱️ 1 day
- JSDoc for all services and hooks
- TypeDoc-generated reference
- Code examples for common patterns

### **STORY 9.9.2: Component Storybook** ⏱️ 1 day
- Storybook for all UI components
- Interactive component playground
- Accessibility audit in Storybook

### **STORY 9.9.3: Migration Guide** ⏱️ 1 day
- Step-by-step from old to new
- Breaking changes list
- Rollback plan

### **STORY 9.9.4: Developer Onboarding** ⏱️ 1 day
- README for friends module
- Architecture overview
- How to add new features

### **STORY 9.9.5: Troubleshooting Guide** ⏱️ 1/2 day
- Common errors and solutions
- FAQ section
- Debug tips

### **STORY 9.9.6: Architecture Diagrams** ⏱️ 1 day
- Mermaid diagrams for:
  - Database schema
  - Service layer flow
  - Component hierarchy
  - Realtime subscriptions

### **STORY 9.9.7: Code Examples** ⏱️ 1/2 day
- Cookbook-style examples:
  - How to add a friend
  - How to search friends
  - How to handle friend requests
  - How to check online status

---

## 📦 **Summary**

| Epic | Stories | Timeline | Status |
|------|---------|----------|--------|
| 9.5 Privacy | 6 | Week 7 | 📋 Planning |
| 9.6 Notifications | 6 | Week 7 | 📋 Planning |
| 9.7 Deal Integration | 6 | Week 8 | 📋 Planning |
| 9.8 Testing & QA | 7 | Week 9 | 📋 Planning |
| 9.9 Documentation | 7 | Week 10 | 📋 Planning |

**Total Stories:** 32 across 5 epics

---

## 🚀 **Implementation Order**

1. **Week 7**: Parallel implementation of Privacy (9.5) and Notifications (9.6)
2. **Week 8**: Deal Integration (9.7) - requires 9.3 and 9.4 complete
3. **Week 9**: Comprehensive testing (9.8)
4. **Week 10**: Documentation finalization (9.9)

---

**All epics integrate with:** Epic 8.x (Messaging), Epic 9.1-9.4 (Friends Foundation)
