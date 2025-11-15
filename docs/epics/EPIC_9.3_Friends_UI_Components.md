# 🎨 EPIC 9.3: Friends UI Components (Web + Mobile)

**Epic Owner:** Frontend Engineering / UX/UI  
**Stakeholders:** Product, Frontend Engineering, QA  
**Dependencies:** Epic 9.1 (Foundation), Epic 9.2 (Search)  
**Timeline:** Week 5-6 (2 weeks)  
**Status:** 📋 Planning

---

## 🎯 **Epic Goal**

Build **beautiful, responsive UI components** for the friends module that work seamlessly across web, iOS, and Android platforms with:
- Friends list with online status indicators
- Friend requests UI (received/sent tabs)
- Friend profile modal with actions menu
- Search UI with filters and results
- People You May Know cards
- Contact sync permission flow (mobile)
- Platform-specific optimizations and native feel

---

## 📱 **Platform Support**

**Web**: Mouse/keyboard, responsive design (320px-1920px)  
**iOS**: Native gestures, haptic feedback, safe areas, SwiftUI feel  
**Android**: Material Design 3, back button, system navigation

---

## 🎯 **MCP Integration**

1. **🎨 Shadcn MCP** (Heavy) - Component scaffolding
2. **🌐 Chrome DevTools MCP** (Medium) - UI debugging, responsive testing
3. **🤖 Puppeteer MCP** (Medium) - E2E UI flow testing

---

## ✅ **Success Criteria**

| Metric | Target |
|--------|--------|
| **Load Time** | Friends list < 300ms |
| **60fps** | Smooth scrolling, animations |
| **Responsive** | Perfect on all screen sizes |
| **Accessibility** | WCAG 2.1 AA compliant |
| **Cross-platform Parity** | 100% feature parity |

---

## 🗂️ **Stories (8 total)**

### **STORY 9.3.1: Friends List Component** ⏱️ 3 days
- Infinite scroll with virtualization (react-window)
- Online status indicators (green dot)
- Last active timestamps
- Quick actions: Message, Unfriend
- Sort: Online first, then alphabetical
- Search within friends list

### **STORY 9.3.2: Friend Requests UI** ⏱️ 2 days
- Tabs: Received (default), Sent
- Accept/Reject buttons with confirmation
- Request message preview
- Mutual friends count
- Expired requests (auto-archive after 30 days)

### **STORY 9.3.3: Friend Profile Modal** ⏱️ 2 days
- Profile header (avatar, name, location)
- Mutual friends section (avatars + count)
- Actions menu:
  - Message
  - Unfriend (with confirmation)
  - Block (with confirmation)
  - Follow/Unfollow toggle
- Recent activity (if public)

### **STORY 9.3.4: Friend Search UI** ⏱️ 2 days
- Search bar with debounce (300ms)
- Filter chips: Location, Mutual Friends
- Search results with infinite scroll
- Empty state: "No results found"
- Recent searches (last 10)

### **STORY 9.3.5: People You May Know Cards** ⏱️ 2 days
- Card design: Avatar, name, reason ("5 mutual friends")
- Add Friend button
- Dismiss button (hide suggestion)
- Horizontal scrollable carousel (mobile)
- Grid layout (web, 3-4 columns)

### **STORY 9.3.6: Contact Sync Permission Flow** ⏱️ 2 days
- Explainer modal: "Find friends from contacts"
- Permission request (iOS/Android native)
- Sync progress indicator
- Success state: "X friends found"
- Permission denied: Graceful fallback

### **STORY 9.3.7: Online Status & Badges** ⏱️ 1 day
- Green dot for online users
- Last active text ("Active 5m ago")
- Unread friend request badge (red dot)
- New friend notification badge

### **STORY 9.3.8: Empty States & Loading** ⏱️ 1 day
- Empty friends list: "Find friends to get started"
- No friend requests: "No new requests"
- Search no results: "Try different keywords"
- Loading skeletons (avoid spinners)

---

## 📦 **Deliverables**

### **Components:**
```
src/components/friends/
├── FriendsList.tsx
├── FriendCard.tsx
├── FriendRequestsList.tsx
├── FriendRequestCard.tsx
├── FriendProfileModal.tsx
├── FriendActionsMenu.tsx
├── FriendSearchBar.tsx
├── SearchResults.tsx
├── PeopleYouMayKnowCarousel.tsx
├── PYMKCard.tsx
├── ContactSyncModal.tsx
├── OnlineStatusBadge.tsx
├── EmptyState.tsx
└── LoadingSkeleton.tsx
```

### **Hooks:**
```
src/hooks/friends/
├── useFriendsList.ts
├── useFriendRequests.ts
├── useFriendActions.ts
└── useContactSyncUI.ts
```

---

## 🎨 **Design System Integration**

All components use:
- Shadcn/ui base components
- Tailwind CSS for styling
- Lucide icons
- Framer Motion for animations
- Platform detection via `usePlatform()` hook

**Example Platform-Specific Styling:**
```typescript
const buttonClass = platform === 'ios' 
  ? 'rounded-xl shadow-sm' // iOS style
  : 'rounded-md'; // Material Design
```

---

**Next Epic:** [EPIC 9.4: Friends Service Layer](./EPIC_9.4_Friends_Service_Layer.md)
