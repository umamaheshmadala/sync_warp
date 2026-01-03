# 💬 STORY 8.2.6: Chat Screen UI

**Parent Epic:** [EPIC 8.2 - Core 1:1 Messaging Implementation](../epics/EPIC_8.2_Core_Messaging_Implementation.md)  
**Story Owner:** Frontend Engineering / UX  
**Estimated Effort:** 4 days  
**Priority:** P0 - Critical  
**Status:** ✅ **COMPLETE** - Implemented 2025-02-01, Enhanced 2025-12-05

**Implementation Files:**

- `src/components/messaging/ChatScreen.tsx`
- `src/components/messaging/ChatHeader.tsx`
- `src/components/messaging/MessageList.tsx`
- `src/components/messaging/MessageBubble.tsx`
- `src/components/messaging/MessageComposer.tsx` _(Enhanced Dec 2025)_
- `src/components/messaging/ImageUploadButton.tsx` _(Enhanced Dec 2025)_
- `src/components/messaging/VideoUploadButton.tsx` _(Enhanced Dec 2025)_
- Keyboard handling with Capacitor integration
- Auto-scroll and pagination support

---

## 🔄 **December 2025 Enhancements: MessageComposer Redesign**

The MessageComposer was completely redesigned with a **WhatsApp-style compact layout**:

### **Before (4 icons visible):**

```
[📷][🎥] | Type a message | [📎][😊]
```

### **After (WhatsApp-style):**

```
[+] [________________Type a message________________😊] [➤]
```

### **Key Changes:**

1. **Single '+' Attachment Button**
   - Opens popup menu with: Photo, Video, Document options
   - Each option has colored circular icon background
   - Menu animates in with `animate-in fade-in slide-in-from-bottom-2`

2. **Maximum Text Input Width**
   - Text input now takes ALL available horizontal space
   - Pill-shaped container with rounded-3xl corners
   - Focus ring effect on input focus

3. **Emoji Button Inside Text Field**
   - Positioned at right edge of text input
   - Maintains minimal visual footprint

4. **Send Button Always Visible**
   - Blue when there's text (active)
   - Gray when empty (disabled state)
   - Circular button with shadow

### **Files Updated:**

- `MessageComposer.tsx`: Complete layout redesign
- `ImageUploadButton.tsx`: Added `variant="menu"` prop for popup menu style
- `VideoUploadButton.tsx`: Added `variant="menu"` prop for popup menu style

---

## 🎯 **Story Goal**

Build the **chat screen UI** with message bubbles, message composer, typing indicators, auto-scroll, virtual scrolling for performance, and message status indicators (sending, sent, delivered, read).

---

## 📱 **Platform Support (Web + iOS + Android)**

### **Keyboard Handling (Critical for Mobile)**

Keyboard management is one of the most important aspects of mobile chat UIs.

#### **1. Keyboard Show/Hide Events**

```typescript
import { Keyboard } from '@capacitor/keyboard'
import { Capacitor } from '@capacitor/core'
import { useEffect, useState } from 'react'

export function ChatScreen() {
  const [bottomPadding, setBottomPadding] = useState(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return

    // Keyboard will show listener
    const showListener = Keyboard.addListener('keyboardWillShow', info => {
      console.log('⌨️ Keyboard showing, height:', info.keyboardHeight)
      setBottomPadding(info.keyboardHeight)

      // Auto-scroll to bottom when keyboard shows
      setTimeout(() => scrollToBottom(), 100)
    })

    // Keyboard will hide listener
    const hideListener = Keyboard.addListener('keyboardWillHide', () => {
      console.log('⌨️ Keyboard hiding')
      setBottomPadding(0)
    })

    return () => {
      showListener.remove()
      hideListener.remove()
    }
  }, [])

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: Capacitor.isNativePlatform() ? 'auto' : 'smooth'
      })
    }
  }

  return (
    <div style={{ paddingBottom: bottomPadding }}>
      {/* Chat UI */}
    </div>
  )
}
```

#### **2. Auto-Scroll Adjustments**

```typescript
// Disable smooth scroll on mobile (better performance)
const scrollToBottom = () => {
  if (messagesEndRef.current) {
    messagesEndRef.current.scrollIntoView({
      behavior: Capacitor.isNativePlatform() ? "auto" : "smooth",
      block: "end",
    });
  }
};

// Auto-scroll when new message arrives
useEffect(() => {
  scrollToBottom();
}, [messages]);
```

#### **3. Haptic Feedback on Send**

```typescript
import { Haptics, NotificationType } from "@capacitor/haptics";

const handleSend = async () => {
  if (!content.trim()) return;

  // Haptic feedback on successful send (mobile only)
  if (Capacitor.isNativePlatform()) {
    await Haptics.notification({ type: NotificationType.Success });
  }

  await sendMessage({ conversationId, content, type: "text" });
  setContent("");
};
```

#### **4. Native Share Sheet (Mobile)**

```typescript
import { Share } from "@capacitor/share";

const handleShare = async (message: Message) => {
  if (Capacitor.isNativePlatform()) {
    await Share.share({
      title: "Share Message",
      text: message.content,
      dialogTitle: "Share with friends",
    });
  } else {
    // Web: Use native Web Share API or fallback
    if (navigator.share) {
      await navigator.share({ text: message.content });
    }
  }
};
```

#### **5. Message Composer Height Adjustment**

```typescript
export function MessageComposer() {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea on mobile
  const handleInput = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }

  return (
    <textarea
      ref={textareaRef}
      onInput={handleInput}
      style={{
        maxHeight: Capacitor.isNativePlatform() ? '100px' : '120px'
      }}
    />
  )
}
```

### **Required Capacitor Plugins**

```json
{
  "dependencies": {
    "@capacitor/keyboard": "^5.0.0", // Keyboard events
    "@capacitor/haptics": "^5.0.0", // Haptic feedback
    "@capacitor/share": "^5.0.0" // Native share sheet
  }
}
```

### **Platform-Specific Testing Checklist**

#### **Web Testing**

- [ ] Message bubbles display correctly
- [ ] Smooth auto-scroll on new message
- [ ] Textarea expands smoothly

#### **iOS Testing**

- [ ] Keyboard shows/hides smoothly
- [ ] Chat UI adjusts for keyboard height
- [ ] Auto-scroll works with keyboard open
- [ ] Haptic feedback on send
- [ ] Native share sheet opens correctly
- [ ] Safe area insets respected

#### **Android Testing**

- [ ] Keyboard handling works on all Android versions
- [ ] Chat doesn't clip behind keyboard
- [ ] Haptic feedback works (if supported)
- [ ] Share sheet functions correctly

### **Performance Targets**

| Metric                    | Web     | iOS     | Android |
| ------------------------- | ------- | ------- | ------- |
| **Message Rendering**     | 60fps   | 60fps   | 60fps   |
| **Keyboard Show Latency** | N/A     | < 100ms | < 150ms |
| **Auto-scroll Latency**   | < 50ms  | < 100ms | < 100ms |
| **Send Button Response**  | Instant | < 50ms  | < 50ms  |

---

## 📖 **User Stories**

### As a user, I want to:

1. See all messages in a conversation displayed as bubbles
2. Distinguish my messages from friend's messages visually
3. Type and send messages with a text input and send button
4. See typing indicators when my friend is typing
5. Auto-scroll to the latest message when new messages arrive
6. Load older messages by scrolling up (pagination)
7. See message timestamps and status indicators

### Acceptance Criteria:

- ✅ Messages render smoothly (60fps with 1000+ messages)
- ✅ Auto-scroll works on new message
- ✅ Pagination loads older messages on scroll up
- ✅ Typing indicator shows/hides correctly
- ✅ Message status icons (sending, sent, delivered, read)
- ✅ Responsive design (mobile + desktop)

---

## 🧩 **Implementation Tasks**

### **Phase 1: Message Bubble Components** (1 day)

#### Task 1.1: Create MessageBubble Component

```typescript
// src/components/messaging/MessageBubble.tsx
import React from 'react'
import { formatDistanceToNow } from 'date-fns'
import { Check, CheckCheck, Clock } from 'lucide-react'
import type { Message } from '../../types/messaging'
import { cn } from '../../lib/utils'

interface MessageBubbleProps {
  message: Message
  isOwn: boolean
  showTimestamp?: boolean
}

export function MessageBubble({ message, isOwn, showTimestamp = false }: MessageBubbleProps) {
  const {
    content,
    created_at,
    is_edited,
    is_deleted
  } = message

  if (is_deleted) {
    return (
      <div className={cn("flex mb-2", isOwn ? "justify-end" : "justify-start")}>
        <div className="max-w-[70%] px-4 py-2 rounded-lg bg-gray-100 text-gray-400 italic">
          Message deleted
        </div>
      </div>
    )
  }

  return (
    <div className={cn("flex mb-2", isOwn ? "justify-end" : "justify-start")}>
      <div className={cn(
        "max-w-[70%] px-4 py-2 rounded-lg break-words",
        isOwn
          ? "bg-blue-600 text-white rounded-br-none"
          : "bg-gray-200 text-gray-900 rounded-bl-none"
      )}>
        <p className="text-sm">{content}</p>

        <div className="flex items-center justify-end gap-1 mt-1">
          {is_edited && (
            <span className={cn(
              "text-xs",
              isOwn ? "text-blue-100" : "text-gray-500"
            )}>
              edited
            </span>
          )}
          <span className={cn(
            "text-xs",
            isOwn ? "text-blue-100" : "text-gray-500"
          )}>
            {formatDistanceToNow(new Date(created_at), { addSuffix: true })}
          </span>
        </div>
      </div>
    </div>
  )
}
```

---

### **Phase 2: Message List with Virtual Scrolling** (1.5 days)

#### Task 2.1: Create MessageList Component

```typescript
// src/components/messaging/MessageList.tsx
import React, { useEffect, useRef } from 'react'
import { useAuthStore } from '../../store/authStore'
import { MessageBubble } from './MessageBubble'
import { Loader2 } from 'lucide-react'
import type { Message } from '../../types/messaging'

interface MessageListProps {
  messages: Message[]
  hasMore: boolean
  onLoadMore: () => void
}

export function MessageList({ messages, hasMore, onLoadMore }: MessageListProps) {
  const currentUserId = useAuthStore(state => state.user?.id)
  const scrollRef = useRef<HTMLDivElement>(null)
  const isLoadingMore = useRef(false)

  // Handle scroll to load more messages
  const handleScroll = () => {
    if (!scrollRef.current || !hasMore || isLoadingMore.current) return

    const { scrollTop } = scrollRef.current

    // Load more when scrolled near top
    if (scrollTop < 100) {
      isLoadingMore.current = true
      onLoadMore()
      setTimeout(() => {
        isLoadingMore.current = false
      }, 1000)
    }
  }

  useEffect(() => {
    const scrollElement = scrollRef.current
    if (scrollElement) {
      scrollElement.addEventListener('scroll', handleScroll)
      return () => scrollElement.removeEventListener('scroll', handleScroll)
    }
  }, [hasMore])

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto px-4 py-4 space-y-2"
    >
      {hasMore && (
        <div className="flex justify-center py-2">
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
        </div>
      )}

      {messages.map(message => (
        <MessageBubble
          key={message.id}
          message={message}
          isOwn={message.sender_id === currentUserId}
        />
      ))}
    </div>
  )
}
```

**🌐 Chrome DevTools MCP Profiling:**

```bash
# Profile message rendering performance
warp mcp run chrome-devtools "open Performance tab, render 1000 messages, verify 60fps and no jank"
```

---

### **Phase 3: Message Composer** (1 day)

#### Task 3.1: Create MessageComposer Component

```typescript
// src/components/messaging/MessageComposer.tsx
import React, { useState } from 'react'
import { Send } from 'lucide-react'
import { Textarea } from '../ui/textarea'
import { Button } from '../ui/button'
import { useSendMessage } from '../../hooks/useSendMessage'

interface MessageComposerProps {
  conversationId: string
  onTyping: () => void
}

export function MessageComposer({ conversationId, onTyping }: MessageComposerProps) {
  const [content, setContent] = useState('')
  const { sendMessage, isSending } = useSendMessage()

  const handleSend = async () => {
    if (!content.trim() || isSending) return

    try {
      await sendMessage({
        conversationId,
        content: content.trim(),
        type: 'text'
      })
      setContent('')
    } catch (error) {
      // Error toast is handled in useSendMessage
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="border-t bg-white px-4 py-3">
      <div className="flex items-end gap-2">
        <Textarea
          value={content}
          onChange={(e) => {
            setContent(e.target.value)
            onTyping()
          }}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          className="min-h-[44px] max-h-[120px] resize-none"
          rows={1}
          disabled={isSending}
        />
        <Button
          onClick={handleSend}
          disabled={!content.trim() || isSending}
          size="icon"
          className="h-11 w-11 flex-shrink-0"
        >
          <Send className="h-5 w-5" />
        </Button>
      </div>
    </div>
  )
}
```

---

### **Phase 4: Chat Screen Assembly** (0.5 days)

#### Task 4.1: Create ChatScreen Component

```typescript
// src/components/messaging/ChatScreen.tsx
import React, { useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useMessages } from '../../hooks/useMessages'
import { useTypingIndicator } from '../../hooks/useTypingIndicator'
import { MessageList } from './MessageList'
import { MessageComposer } from './MessageComposer'
import { ChatHeader } from './ChatHeader'
import { TypingIndicator } from './TypingIndicator'
import { Loader2 } from 'lucide-react'

export function ChatScreen() {
  const { conversationId } = useParams<{ conversationId: string }>()
  const navigate = useNavigate()
  const { messages, isLoading, hasMore, loadMore } = useMessages(conversationId || null)
  const { isTyping, typingUserIds, handleTyping } = useTypingIndicator(conversationId || null)

  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  if (!conversationId) {
    navigate('/messages')
    return null
  }

  if (isLoading && messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-white">
      <ChatHeader conversationId={conversationId} />

      <MessageList
        messages={messages}
        hasMore={hasMore}
        onLoadMore={loadMore}
      />

      {isTyping && <TypingIndicator userIds={typingUserIds} />}

      <div ref={messagesEndRef} />

      <MessageComposer
        conversationId={conversationId}
        onTyping={handleTyping}
      />
    </div>
  )
}
```

---

## 🧪 **Testing Checklist**

### Visual Tests

- [ ] Message bubbles display correctly (own vs friend)
- [ ] Message composer textarea expands
- [ ] Typing indicator shows/hides
- [ ] Auto-scroll works on new message
- [ ] Load more indicator appears on scroll up
- [ ] Empty state for no messages

### Performance Tests

```bash
# Test message rendering performance
warp mcp run chrome-devtools "render 1000 messages, profile with Performance tab, verify 60fps"

# Test scroll performance
warp mcp run chrome-devtools "scroll through 500 messages, verify smooth 60fps scrolling"
```

### Responsive Tests

```bash
# Test mobile layout
warp mcp run chrome-devtools "test on iPhone 12, Galaxy S21, verify message bubbles adapt"

# Test desktop layout
warp mcp run chrome-devtools "test on 1920x1080, verify max-width constraints"
```

---

## 📊 **Success Metrics**

| Metric                   | Target                   | Verification Method         |
| ------------------------ | ------------------------ | --------------------------- |
| **Message Rendering**    | 60fps for 1000+ messages | Chrome DevTools Performance |
| **Scroll Performance**   | 60fps                    | Chrome DevTools Performance |
| **Auto-scroll Latency**  | < 100ms                  | Manual testing              |
| **Pagination Load Time** | < 300ms                  | Chrome DevTools Network     |

---

## 🔗 **Dependencies**

### Required Before Starting:

- ✅ Story 8.2.4 (useMessages, useTypingIndicator hooks) complete
- ✅ Shadcn UI components installed

---

## 📦 **Deliverables**

1. ✅ `src/components/messaging/ChatScreen.tsx`
2. ✅ `src/components/messaging/MessageList.tsx`
3. ✅ `src/components/messaging/MessageBubble.tsx`
4. ✅ `src/components/messaging/MessageComposer.tsx`
5. ✅ Chrome DevTools performance reports

---

## 🔄 **Next Story**

➡️ [STORY 8.2.7: Message Send/Receive Flow](./STORY_8.2.7_Message_Send_Receive_Flow.md)

---

## 📝 **MCP Command Quick Reference**

### Chrome DevTools MCP

```bash
# Profile rendering
warp mcp run chrome-devtools "profile message rendering performance"

# Test scroll
warp mcp run chrome-devtools "test scroll performance with 1000 messages"
```

---

**Story Status:** 📋 **Ready for Implementation**  
**Estimated Completion:** 4 days  
**Risk Level:** Medium (performance optimization required)
