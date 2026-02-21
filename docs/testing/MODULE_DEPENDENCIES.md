# SynC App - Module Dependency Map

This document maps the relationships between modules and shared components to help understand the impact of changes.

## Core Modules

### 1. Friends Module (`/friends`)
**Location:** `src/pages/Friends.tsx`, `src/components/friends/`

**Key Components:**
- `FriendsManagementPage.tsx` - Main page
- `FriendProfileModal.tsx` - Profile modal
- `FriendActionsMenu.tsx` - Message, Unfriend, Block buttons
- `FriendCard.tsx` - Friend list cards
- `RecentActivityFeed.tsx` - Activity in profile modal

**Shared Dependencies:**
- `ui/dialog.tsx` - Profile modal
- `ui/button.tsx` - All action buttons
- `ui/dropdown-menu.tsx` - Options menu
- `ui/card.tsx` - Friend cards

**Service Dependencies:**
- `friendsService.ts` - Friend CRUD operations
- `messagingService.ts` - Start conversation

---

### 2. Messages Module (`/messages`)
**Location:** `src/pages/Messages.tsx`, `src/components/messages/`

**Key Components:**
- `ConversationList.tsx` - List of chats
- `ConversationView.tsx` - Chat window
- `MessageBubble.tsx` - Individual messages
- `MessageInput.tsx` - Text input

**Shared Dependencies:**
- `ui/button.tsx` - Send button
- `ui/input.tsx` - Message input
- `ui/scroll-area.tsx` - Message scrolling
- `ui/dialog.tsx` - Delete confirmation

**Service Dependencies:**
- `messagingService.ts` - Send/receive messages
- `friendsService.ts` - Check friend/block status

---

### 3. Profile Module (`/profile`)
**Location:** `src/pages/Profile.tsx`, `src/components/profile/`

**Key Components:**
- `ProfilePage.tsx` - Own profile view
- `ProfileHeader.tsx` - Avatar, name, bio
- `ProfileEditForm.tsx` - Edit profile

**Shared Dependencies:**
- `ui/button.tsx` - Edit, save buttons
- `ui/input.tsx` - Form fields
- `ui/dialog.tsx` - Edit modal
- `ui/avatar.tsx` - Profile pictures

---

### 4. Deals Module (`/deals`)
**Location:** `src/pages/Deals.tsx`, `src/components/deals/`

**Key Components:**
- `DealsList.tsx` - Browse deals
- `DealCard.tsx` - Deal preview
- `DealDetails.tsx` - Full deal view

**Shared Dependencies:**
- `ui/card.tsx` - Deal cards
- `ui/button.tsx` - Like, save, share
- `ui/dialog.tsx` - Deal details modal

---

## Shared UI Components Impact

### High-Risk Components (affect multiple modules)

| Component | Used By | Risk Level |
|-----------|---------|------------|
| `dialog.tsx` | Friends, Messages, Profile, Deals, Settings | 🔴 HIGH |
| `button.tsx` | ALL modules | 🔴 HIGH |
| `input.tsx` | Messages, Search, Forms | 🟡 MEDIUM |
| `card.tsx` | Friends, Deals, Business | 🟡 MEDIUM |
| `dropdown-menu.tsx` | Profile modal, Settings | 🟡 MEDIUM |
| `scroll-area.tsx` | Messages, Lists | 🟡 MEDIUM |

### Low-Risk Components (limited usage)

| Component | Used By | Risk Level |
|-----------|---------|------------|
| `avatar.tsx` | Profile headers | 🟢 LOW |
| `badge.tsx` | Status indicators | 🟢 LOW |
| `skeleton.tsx` | Loading states | 🟢 LOW |

---

## Cross-Module Interactions

```
┌─────────────┐     ┌─────────────┐
│   Friends   │────▶│  Messages   │
│   Module    │     │   Module    │
└─────────────┘     └─────────────┘
       │                   │
       ▼                   ▼
┌─────────────┐     ┌─────────────┐
│   Profile   │◀───▶│   Shared    │
│   Module    │     │   UI Lib    │
└─────────────┘     └─────────────┘
       │                   │
       ▼                   ▼
┌─────────────┐     ┌─────────────┐
│    Deals    │────▶│  Services   │
│   Module    │     │   Layer     │
└─────────────┘     └─────────────┘
```

## Best Practices

1. **Before editing shared UI components:**
   - Check which modules use them (see tables above)
   - Test all affected modules after changes

2. **Prefer composition over modification:**
   - Add props/variants instead of changing defaults
   - Pass className overrides instead of editing base styles

3. **Service layer changes:**
   - Changes to `friendsService.ts` affect Friends + Messages
   - Changes to `messagingService.ts` affect Messages + Friends

4. **Database/Supabase changes:**
   - Schema changes can break multiple modules
   - Always test RLS policies after changes
