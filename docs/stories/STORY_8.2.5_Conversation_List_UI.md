# 📋 STORY 8.2.5: Conversation List UI

**Parent Epic:** [EPIC 8.2 - Core 1:1 Messaging Implementation](../epics/EPIC_8.2_Core_Messaging_Implementation.md)  
**Story Owner:** Frontend Engineering / UX  
**Estimated Effort:** 3 days  
**Priority:** P0 - Critical  
**Status:** ✅ **COMPLETE** - Implemented 2025-02-01

**Implementation Files:**

- `src/components/messaging/ConversationListPage.tsx`
- `src/components/messaging/ConversationCard.tsx`
- Search functionality with instant filtering
- Loading skeletons and empty states
- Responsive design (320px-1920px)

---

## 🎯 **Story Goal**

Build the **conversation list page** UI that displays all user conversations sorted by recent activity, with search/filter capabilities, unread badges, last message previews, and responsive design across all devices.

---

## 📱 **Platform Support (Web + iOS + Android)**

### **Mobile UI Patterns**

The conversation list must adapt to mobile-specific UI patterns for optimal user experience.

#### **1. Pull-to-Refresh (Mobile)**

```typescript
import { Capacitor } from '@capacitor/core'
import { IonRefresher, IonRefresherContent } from '@ionic/react' // Optional

export function ConversationListPage() {
  const handleRefresh = async (event?: CustomEvent) => {
    await fetchConversations()
    event?.detail.complete() // Ionic API
  }

  return (
    <div>
      {Capacitor.isNativePlatform() && (
        <IonRefresher onIonRefresh={handleRefresh}>
          <IonRefresherContent />
        </IonRefresher>
      )}
      {/* Rest of UI */}
    </div>
  )
}
```

#### **2. Safe Area Insets (iOS)**

```css
/* src/components/messaging/ConversationListPage.css */
.conversation-list-header {
  padding-top: env(safe-area-inset-top);
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
}

.conversation-list-container {
  padding-bottom: env(safe-area-inset-bottom);
}
```

#### **3. Haptic Feedback on Tap (Mobile)**

```typescript
import { Haptics, ImpactStyle } from '@capacitor/haptics'
import { Capacitor } from '@capacitor/core'

export function ConversationCard({ conversation, onClick }: ConversationCardProps) {
  const handleClick = async () => {
    // Provide haptic feedback on mobile
    if (Capacitor.isNativePlatform()) {
      await Haptics.impact({ style: ImpactStyle.Light })
    }

    onClick()
  }

  return (
    <div onClick={handleClick}>
      {/* Card content */}
    </div>
  )
}
```

#### **4. Native Scrolling Optimization**

```css
/* Enable momentum scrolling on iOS */
.conversation-list-scroll {
  -webkit-overflow-scrolling: touch; /* iOS smooth scrolling */
  overflow-y: auto;
}
```

#### **5. Long-Press Context Menu (Mobile)**

```typescript
import { Haptics, ImpactStyle } from '@capacitor/haptics'

export function ConversationCard({ conversation }: ConversationCardProps) {
  const [pressTimer, setPressTimer] = useState<NodeJS.Timeout | null>(null)

  const handleTouchStart = () => {
    if (Capacitor.isNativePlatform()) {
      const timer = setTimeout(() => {
        Haptics.impact({ style: ImpactStyle.Medium })
        showContextMenu(conversation) // Archive, Delete, etc.
      }, 500) // Long-press after 500ms

      setPressTimer(timer)
    }
  }

  const handleTouchEnd = () => {
    if (pressTimer) {
      clearTimeout(pressTimer)
      setPressTimer(null)
    }
  }

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Card content */}
    </div>
  )
}
```

### **Required Capacitor Plugins**

```json
{
  "dependencies": {
    "@capacitor/haptics": "^5.0.0", // Haptic feedback
    "@ionic/react": "^7.0.0" // Pull-to-refresh (optional)
  }
}
```

### **Platform-Specific Testing Checklist**

#### **Web Testing**

- [ ] Scroll is smooth on mouse wheel
- [ ] Search filters instantly
- [ ] Hover states work correctly

#### **iOS Testing**

- [ ] Pull-to-refresh works (if implemented)
- [ ] Safe area insets respected (notch devices)
- [ ] Haptic feedback on conversation tap
- [ ] Momentum scrolling feels native
- [ ] Long-press context menu works

#### **Android Testing**

- [ ] Pull-to-refresh works
- [ ] Haptic feedback on tap (if supported)
- [ ] Scrolling is smooth on all device sizes
- [ ] No UI clipping on small screens

### **Performance Targets**

| Metric                | Web     | iOS                  | Android |
| --------------------- | ------- | -------------------- | ------- |
| **List Load Time**    | < 500ms | < 800ms              | < 800ms |
| **Search Latency**    | < 50ms  | < 100ms              | < 100ms |
| **Scroll FPS**        | 60fps   | 60fps                | 60fps   |
| **Tap Response Time** | Instant | < 50ms (with haptic) | < 50ms  |

---

## 📖 **User Stories**

### As a user, I want to:

1. See all my conversations in one place, sorted by most recent
2. Search for specific conversations by friend name
3. See unread message counts at a glance
4. View the last message preview for each conversation
5. Navigate smoothly to any conversation with a single tap/click
6. Experience fast, responsive UI on mobile and desktop

### Acceptance Criteria:

- ✅ List loads in < 500ms
- ✅ Search filters instantly (no lag)
- ✅ Scroll performance is 60fps
- ✅ Unread badges update in realtime
- ✅ Responsive design: 320px to 1920px screens
- ✅ Empty state guidance when no conversations exist

---

## 🧩 **Implementation Tasks**

### **Phase 1: Scaffold UI Components with Shadcn MCP** (0.5 days)

#### Task 1.1: Install Required Shadcn Components

```bash
# Scaffold components using Shadcn MCP
warp mcp run shadcn "getComponent badge"
warp mcp run shadcn "getComponent avatar"
warp mcp run shadcn "getComponent input"
warp mcp run shadcn "getComponent skeleton"
```

---

### **Phase 2: ConversationCard Component** (1 day)

#### Task 2.1: Create ConversationCard Component

```typescript
// src/components/messaging/ConversationCard.tsx
import React from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar'
import { Badge } from '../ui/badge'
import { formatDistanceToNow } from 'date-fns'
import type { ConversationWithDetails } from '../../types/messaging'
import { cn } from '../../lib/utils'

interface ConversationCardProps {
  conversation: ConversationWithDetails
  onClick: () => void
  isActive?: boolean
}

export function ConversationCard({
  conversation,
  onClick,
  isActive = false
}: ConversationCardProps) {
  const {
    other_participant_name,
    other_participant_avatar,
    last_message_content,
    last_message_at,
    unread_count
  } = conversation

  const initials = other_participant_name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase() || '?'

  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 p-4 hover:bg-gray-50 cursor-pointer transition-colors border-b",
        isActive && "bg-blue-50 hover:bg-blue-100"
      )}
    >
      {/* Avatar */}
      <Avatar className="h-12 w-12 flex-shrink-0">
        <AvatarImage src={other_participant_avatar || undefined} alt={other_participant_name} />
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold text-gray-900 truncate">
            {other_participant_name}
          </h3>
          {last_message_at && (
            <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
              {formatDistanceToNow(new Date(last_message_at), { addSuffix: true })}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600 truncate">
            {last_message_content || 'No messages yet'}
          </p>
          {unread_count > 0 && (
            <Badge variant="default" className="ml-2 flex-shrink-0">
              {unread_count > 99 ? '99+' : unread_count}
            </Badge>
          )}
        </div>
      </div>
    </div>
  )
}
```

**🌐 Chrome DevTools MCP Testing:**

```bash
# Test rendering performance
warp mcp run chrome-devtools "open DevTools Performance tab, record rendering 100 ConversationCards, check for layout shifts"
```

---

### **Phase 3: SearchBar Component** (0.5 days)

#### Task 3.1: Create SearchBar Component

```typescript
// src/components/ui/SearchBar.tsx
import React from 'react'
import { Search, X } from 'lucide-react'
import { Input } from './input'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function SearchBar({ value, onChange, placeholder = 'Search...' }: SearchBarProps) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
      <Input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pl-10 pr-10"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
```

---

### **Phase 4: ConversationListPage Component** (1 day)

#### Task 4.1: Create ConversationListPage Component

```typescript
// src/components/messaging/ConversationListPage.tsx
import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useConversations } from '../../hooks/useConversations'
import { useMessagingStore } from '../../store/messagingStore'
import { ConversationCard } from './ConversationCard'
import { SearchBar } from '../ui/SearchBar'
import { Skeleton } from '../ui/skeleton'
import { MessageSquarePlus } from 'lucide-react'

export function ConversationListPage() {
  const navigate = useNavigate()
  const { conversations, isLoading } = useConversations()
  const activeConversationId = useMessagingStore(state => state.activeConversationId)

  const [searchQuery, setSearchQuery] = useState('')

  // Filter conversations by search query
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations

    const query = searchQuery.toLowerCase()
    return conversations.filter(conv =>
      conv.other_participant_name?.toLowerCase().includes(query)
    )
  }, [conversations, searchQuery])

  // Loading skeleton
  if (isLoading && conversations.length === 0) {
    return (
      <div className="flex flex-col h-screen bg-gray-50">
        <div className="bg-white border-b px-4 py-3">
          <Skeleton className="h-8 w-32 mb-2" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="px-4 py-3 bg-white border-b">
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="flex-1 overflow-y-auto">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-4 border-b">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-4 w-32 mb-2" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
            <p className="text-sm text-gray-500">
              {filteredConversations.length} conversation{filteredConversations.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={() => navigate('/friends')}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            title="Start new conversation"
          >
            <MessageSquarePlus className="h-6 w-6 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 py-3 bg-white border-b">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search conversations..."
        />
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto">
        {filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            {searchQuery ? (
              <>
                <p className="text-lg font-medium text-gray-700 mb-2">
                  No conversations found
                </p>
                <p className="text-sm text-gray-500">
                  Try adjusting your search
                </p>
              </>
            ) : (
              <>
                <MessageSquarePlus className="h-16 w-16 text-gray-300 mb-4" />
                <p className="text-lg font-medium text-gray-700 mb-2">
                  No conversations yet
                </p>
                <p className="text-sm text-gray-500 mb-4">
                  Start chatting with your friends!
                </p>
                <button
                  onClick={() => navigate('/friends')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Browse Friends
                </button>
              </>
            )}
          </div>
        ) : (
          filteredConversations.map(conversation => (
            <ConversationCard
              key={conversation.conversation_id}
              conversation={conversation}
              onClick={() => {
                navigate(`/messages/${conversation.conversation_id}`)
              }}
              isActive={conversation.conversation_id === activeConversationId}
            />
          ))
        )}
      </div>
    </div>
  )
}
```

**🌐 Chrome DevTools MCP Performance Testing:**

```bash
# Test scroll performance
warp mcp run chrome-devtools "open http://localhost:5173/messages, record Performance profile while scrolling conversation list, verify 60fps"

# Test search performance
warp mcp run chrome-devtools "open DevTools Performance tab, type in search bar, measure input lag"
```

---

## 🧪 **Testing Checklist**

### Visual Tests

- [ ] Conversation cards display correctly
- [ ] Avatars show fallback initials
- [ ] Unread badges appear for unread conversations
- [ ] Last message timestamp formats correctly
- [ ] Search clears with X button
- [ ] Empty state displays properly

### Performance Tests

- [ ] List loads in < 500ms
- [ ] Search filters instantly (< 50ms)
- [ ] Scroll maintains 60fps
- [ ] No layout shifts during render

### Responsive Tests

```bash
# Test mobile responsiveness
warp mcp run chrome-devtools "open http://localhost:5173/messages, test on iPhone 12 (390x844), Galaxy S21 (360x800), verify UI adapts"

# Test desktop responsiveness
warp mcp run chrome-devtools "test on 1920x1080, 1366x768, verify layout scales correctly"
```

### Accessibility Tests

```bash
# Run Lighthouse audit
warp mcp run chrome-devtools "run Lighthouse accessibility audit on conversation list page, target score > 90%"
```

---

## 📊 **Success Metrics**

| Metric                    | Target            | Verification Method             |
| ------------------------- | ----------------- | ------------------------------- |
| **Load Time**             | < 500ms           | Chrome DevTools Network tab     |
| **Search Latency**        | < 50ms            | Chrome DevTools Performance     |
| **Scroll Performance**    | 60fps             | Chrome DevTools Performance     |
| **Accessibility Score**   | > 90%             | Lighthouse audit                |
| **Mobile Responsiveness** | Perfect on 320px+ | Chrome DevTools device emulator |

---

## 🔗 **Dependencies**

### Required Before Starting:

- ✅ Story 8.2.4 (useConversations hook) must be complete
- ✅ Shadcn UI components must be installed
- ✅ React Router must be configured

---

## 📦 **Deliverables**

1. ✅ `src/components/messaging/ConversationListPage.tsx`
2. ✅ `src/components/messaging/ConversationCard.tsx`
3. ✅ `src/components/ui/SearchBar.tsx`
4. ✅ Loading skeleton states
5. ✅ Empty state UI
6. ✅ Responsive design (mobile + desktop)
7. ✅ Chrome DevTools MCP performance report

---

## 🔄 **Next Story**

➡️ [STORY 8.2.6: Chat Screen UI](./STORY_8.2.6_Chat_Screen_UI.md)

---

## 📝 **MCP Command Quick Reference**

### Shadcn MCP

```bash
# Scaffold UI components
warp mcp run shadcn "getComponent badge"
warp mcp run shadcn "getComponent avatar"
warp mcp run shadcn "getComponent input"
warp mcp run shadcn "getComponent skeleton"
```

### Chrome DevTools MCP

```bash
# Test performance
warp mcp run chrome-devtools "profile conversation list scroll performance"

# Test responsiveness
warp mcp run chrome-devtools "test on mobile device emulators"

# Run accessibility audit
warp mcp run chrome-devtools "run Lighthouse audit"
```

---

**Story Status:** 📋 **Ready for Implementation**  
**Estimated Completion:** 3 days  
**Risk Level:** Low (standard UI components)
