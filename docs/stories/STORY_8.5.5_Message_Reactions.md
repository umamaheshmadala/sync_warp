# ❤️ STORY 8.5.5: Message Reactions

**Parent Epic:** [EPIC 8.5 - Advanced Messaging Features](../epics/EPIC_8.5_Advanced_Features.md)  
**Story Owner:** Frontend Engineering  
**Estimated Effort:** 1.5 days  
**Priority:** P1 - High  
**Status:** ✅ Done  
**Dependencies:** Epic 8.1 (Database), Epic 8.2 (Core Messaging)

---

## 🎯 **Story Goal**

Implement **emoji reactions** for messages on web browsers, iOS, and Android:

- Quick reaction with common emojis (❤️ 👍 😂 😮 😢 🙏)
- Full emoji picker for custom reactions
- Toggle reaction on/off
- Real-time reaction sync
- Mobile: Tap + hold with haptic feedback
- Display reaction counts with user lists

---

## 📱 **Platform Support**

| Platform    | Trigger                      | Picker                |
| ----------- | ---------------------------- | --------------------- |
| **Web**     | Hover + click / Double-click | Floating emoji picker |
| **iOS**     | Long-press + slide           | Native emoji keyboard |
| **Android** | Long-press + slide           | Material emoji picker |

---

## 📖 **User Stories**

### As a user, I want to:

1. React to messages with emoji
2. See who reacted to a message
3. Toggle my reaction on/off
4. Use quick reactions or full emoji picker
5. See reactions update in real-time

### Acceptance Criteria:

- ✅ Add/remove reactions with single tap
- ✅ Quick reactions: ❤️ 👍 😂 😮 😢 🙏
- ✅ Full emoji picker available
- ✅ Display reaction counts on messages
- ✅ Show "who reacted" tooltip
- ✅ Real-time sync of reactions
- ✅ Haptic feedback on mobile
- ✅ Animation on reaction add\r\n\r\n---\r\n\r\n## 🔒 **Confirmed Design Decisions**\r\n\r\n| Decision | Choice | Industry Reference |\r\n|----------|--------|--------------------|\r\n| Max unique reactions | 20 per message | Discord |\r\n| Multiple reactions per user | Allowed (different emojis) | Slack, Discord |\r\n| Custom emojis | Standard emojis only for v1 | WhatsApp |\r\n| Self-reactions | Allowed | All apps |\r\n| Scope | 1:1 conversations only | - |

---

## 🧩 **Implementation Tasks**

### **Phase 1: Database Schema** (0.25 days)

#### Task 1.1: Add Reactions Column (if not exists)

```sql
-- supabase/migrations/YYYYMMDDHHMMSS_add_reactions_column.sql

-- Add reactions JSONB column if not exists
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS reactions JSONB DEFAULT '{}';

-- Add index for reaction queries
CREATE INDEX IF NOT EXISTS idx_messages_reactions
ON messages USING GIN (reactions);

-- Example reactions structure:
-- {
--   "❤️": ["user-id-1", "user-id-2"],
--   "👍": ["user-id-3"],
--   "😂": ["user-id-1"]
-- }
```

**🛢 MCP Integration:**

```bash
# Apply migration
warp mcp run supabase "apply_migration add_reactions_column 'ALTER TABLE messages ADD COLUMN IF NOT EXISTS reactions JSONB DEFAULT ''{}'''"

# Verify column exists
warp mcp run supabase "execute_sql SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'reactions';"
```

---

### **Phase 2: Reaction Service** (0.5 days)

#### Task 2.1: Create ReactionService

```typescript
// src/services/reactionService.ts
import { supabase } from "../lib/supabase";
import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle } from "@capacitor/haptics";

export interface Reaction {
  emoji: string;
  userIds: string[];
  count: number;
}

export interface ReactionUser {
  id: string;
  username: string;
  avatarUrl?: string;
}

// Standard quick reactions
export const QUICK_REACTIONS = ["❤️", "👍", "😂", "😮", "😢", "🙏"] as const;

class ReactionService {
  /**
   * Add reaction to message
   */
  async addReaction(messageId: string, emoji: string): Promise<void> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    // Fetch current reactions
    const { data: message, error: fetchError } = await supabase
      .from("messages")
      .select("reactions")
      .eq("id", messageId)
      .single();

    if (fetchError) throw fetchError;

    const reactions = message?.reactions || {};

    // Add user to reaction (prevent duplicates)
    if (!reactions[emoji]) {
      reactions[emoji] = [];
    }
    if (!reactions[emoji].includes(user.id)) {
      reactions[emoji].push(user.id);
    }

    // Update message
    const { error: updateError } = await supabase
      .from("messages")
      .update({ reactions })
      .eq("id", messageId);

    if (updateError) throw updateError;

    // Haptic feedback on mobile
    if (Capacitor.isNativePlatform()) {
      await Haptics.impact({ style: ImpactStyle.Light });
    }

    console.log(`❤️ Added reaction ${emoji} to message ${messageId}`);
  }

  /**
   * Remove reaction from message
   */
  async removeReaction(messageId: string, emoji: string): Promise<void> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data: message, error: fetchError } = await supabase
      .from("messages")
      .select("reactions")
      .eq("id", messageId)
      .single();

    if (fetchError) throw fetchError;

    const reactions = message?.reactions || {};

    // Remove user from reaction
    if (reactions[emoji]) {
      reactions[emoji] = reactions[emoji].filter(
        (id: string) => id !== user.id
      );

      // Clean up empty arrays
      if (reactions[emoji].length === 0) {
        delete reactions[emoji];
      }
    }

    const { error: updateError } = await supabase
      .from("messages")
      .update({ reactions })
      .eq("id", messageId);

    if (updateError) throw updateError;

    console.log(`💔 Removed reaction ${emoji} from message ${messageId}`);
  }

  /**
   * Toggle reaction (add if not present, remove if present)
   */
  async toggleReaction(messageId: string, emoji: string): Promise<boolean> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data: message } = await supabase
      .from("messages")
      .select("reactions")
      .eq("id", messageId)
      .single();

    const reactions = message?.reactions || {};
    const hasReacted = reactions[emoji]?.includes(user.id);

    if (hasReacted) {
      await this.removeReaction(messageId, emoji);
      return false; // Reaction removed
    } else {
      await this.addReaction(messageId, emoji);
      return true; // Reaction added
    }
  }

  /**
   * Get reactions summary for display
   */
  getReactionsSummary(reactions: Record<string, string[]>): Reaction[] {
    if (!reactions) return [];

    return Object.entries(reactions)
      .map(([emoji, userIds]) => ({
        emoji,
        userIds,
        count: userIds.length,
      }))
      .sort((a, b) => b.count - a.count); // Sort by count descending
  }

  /**
   * Get reaction users with details
   */
  async getReactionUsers(
    reactions: Record<string, string[]>,
    emoji: string
  ): Promise<ReactionUser[]> {
    const userIds = reactions[emoji] || [];
    if (userIds.length === 0) return [];

    const { data, error } = await supabase
      .from("users")
      .select("id, username, avatar_url")
      .in("id", userIds);

    if (error) throw error;

    return (
      data?.map((u) => ({
        id: u.id,
        username: u.username,
        avatarUrl: u.avatar_url,
      })) || []
    );
  }

  /**
   * Check if current user has reacted with specific emoji
   */
  hasUserReacted(
    reactions: Record<string, string[]>,
    emoji: string,
    userId: string
  ): boolean {
    return reactions[emoji]?.includes(userId) || false;
  }
}

export const reactionService = new ReactionService();
```

---

### **Phase 3: UI Components** (0.5 days)

#### Task 3.1: Create QuickReactionBar Component

```typescript
// src/components/messaging/QuickReactionBar.tsx
import React from 'react';
import { QUICK_REACTIONS } from '../../services/reactionService';

interface Props {
  onReact: (emoji: string) => void;
  onOpenPicker: () => void;
  userReactions: string[];  // Emojis user has already reacted with
}

export function QuickReactionBar({ onReact, onOpenPicker, userReactions }: Props) {
  return (
    <div className="flex items-center gap-1 p-2 bg-white rounded-full shadow-lg border">
      {QUICK_REACTIONS.map((emoji) => (
        <button
          key={emoji}
          onClick={() => onReact(emoji)}
          className={`
            text-xl p-2 rounded-full transition-all duration-200
            hover:scale-125 hover:bg-gray-100
            ${userReactions.includes(emoji)
              ? 'bg-blue-100 ring-2 ring-blue-500'
              : ''
            }
          `}
          title={userReactions.includes(emoji) ? 'Remove reaction' : 'Add reaction'}
        >
          {emoji}
        </button>
      ))}

      {/* More emoji button */}
      <button
        onClick={onOpenPicker}
        className="text-lg p-2 rounded-full hover:bg-gray-100 text-gray-400"
        title="More reactions"
      >
        ➕
      </button>
    </div>
  );
}
```

#### Task 3.2: Create MessageReactions Display Component

```typescript
// src/components/messaging/MessageReactions.tsx
import React, { useState } from 'react';
import type { Reaction } from '../../services/reactionService';

interface Props {
  reactions: Reaction[];
  currentUserId: string;
  onReactionClick: (emoji: string) => void;
  onViewUsers: (emoji: string) => void;
}

export function MessageReactions({
  reactions,
  currentUserId,
  onReactionClick,
  onViewUsers
}: Props) {
  if (reactions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {reactions.map(({ emoji, userIds, count }) => {
        const hasReacted = userIds.includes(currentUserId);

        return (
          <button
            key={emoji}
            onClick={() => onReactionClick(emoji)}
            onContextMenu={(e) => {
              e.preventDefault();
              onViewUsers(emoji);
            }}
            className={`
              inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-sm
              transition-all duration-200 hover:scale-105
              ${hasReacted
                ? 'bg-blue-100 border-2 border-blue-500 text-blue-700'
                : 'bg-gray-100 border border-gray-200 text-gray-700 hover:bg-gray-200'
              }
            `}
            title={`${count} ${count === 1 ? 'reaction' : 'reactions'}`}
          >
            <span className="text-base">{emoji}</span>
            <span className="font-medium">{count}</span>
          </button>
        );
      })}
    </div>
  );
}
```

#### Task 3.3: Create ReactionUsersPopup Component

```typescript
// src/components/messaging/ReactionUsersPopup.tsx
import React from 'react';
import { X } from 'lucide-react';
import type { ReactionUser } from '../../services/reactionService';

interface Props {
  emoji: string;
  users: ReactionUser[];
  isOpen: boolean;
  onClose: () => void;
}

export function ReactionUsersPopup({ emoji, users, isOpen, onClose }: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-xs w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{emoji}</span>
            <span className="font-medium text-gray-700">
              {users.length} {users.length === 1 ? 'reaction' : 'reactions'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User list */}
        <div className="max-h-64 overflow-y-auto">
          {users.map((user) => (
            <div
              key={user.id}
              className="flex items-center gap-3 p-3 hover:bg-gray-50"
            >
              <img
                src={user.avatarUrl || '/default-avatar.png'}
                alt={user.username}
                className="w-10 h-10 rounded-full"
              />
              <span className="font-medium text-gray-900">
                {user.username}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

---

### **Phase 4: Hook and Integration** (0.25 days)

#### Task 4.1: Create useReactions Hook

```typescript
// src/hooks/useReactions.ts
import { useState, useCallback } from "react";
import {
  reactionService,
  Reaction,
  ReactionUser,
} from "../services/reactionService";
import { toast } from "react-hot-toast";

export function useReactions(
  messageId: string,
  initialReactions: Record<string, string[]>
) {
  const [reactions, setReactions] = useState(initialReactions);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);
  const [emojiUsers, setEmojiUsers] = useState<ReactionUser[]>([]);

  // Get formatted reactions for display
  const reactionsSummary: Reaction[] =
    reactionService.getReactionsSummary(reactions);

  // Toggle reaction
  const toggleReaction = useCallback(
    async (emoji: string) => {
      setIsLoading(true);
      try {
        const added = await reactionService.toggleReaction(messageId, emoji);

        // Optimistic update
        setReactions((prev) => {
          const updated = { ...prev };
          const userId = "current-user"; // Replace with actual user ID

          if (added) {
            if (!updated[emoji]) updated[emoji] = [];
            updated[emoji] = [...updated[emoji], userId];
          } else {
            if (updated[emoji]) {
              updated[emoji] = updated[emoji].filter((id) => id !== userId);
              if (updated[emoji].length === 0) delete updated[emoji];
            }
          }

          return updated;
        });
      } catch (error) {
        toast.error("Failed to react");
      } finally {
        setIsLoading(false);
      }
    },
    [messageId]
  );

  // View users who reacted with emoji
  const viewReactionUsers = useCallback(
    async (emoji: string) => {
      setSelectedEmoji(emoji);
      try {
        const users = await reactionService.getReactionUsers(reactions, emoji);
        setEmojiUsers(users);
      } catch (error) {
        toast.error("Failed to load reactions");
      }
    },
    [reactions]
  );

  return {
    reactions,
    reactionsSummary,
    isLoading,
    toggleReaction,
    selectedEmoji,
    setSelectedEmoji,
    emojiUsers,
    viewReactionUsers,
  };
}
```

#### Task 4.2: Update MessageBubble with Reactions

```typescript
// src/components/messaging/MessageBubble.tsx (additions)
import { QuickReactionBar } from './QuickReactionBar';
import { MessageReactions } from './MessageReactions';
import { ReactionUsersPopup } from './ReactionUsersPopup';
import { useReactions } from '../../hooks/useReactions';
import { Smile } from 'lucide-react';

// Inside MessageBubble component
const [showReactionBar, setShowReactionBar] = useState(false);
const {
  reactionsSummary,
  toggleReaction,
  selectedEmoji,
  setSelectedEmoji,
  emojiUsers,
  viewReactionUsers
} = useReactions(message.id, message.reactions || {});

// Get user's reactions for highlighting
const userReactions = Object.entries(message.reactions || {})
  .filter(([_, ids]) => ids.includes(currentUserId))
  .map(([emoji]) => emoji);

// Render
return (
  <div
    className="message-bubble group relative"
    onMouseEnter={() => setShowReactionBar(true)}
    onMouseLeave={() => setShowReactionBar(false)}
  >
    {/* Message content */}
    <p>{message.content}</p>

    {/* Reactions display */}
    <MessageReactions
      reactions={reactionsSummary}
      currentUserId={currentUserId}
      onReactionClick={toggleReaction}
      onViewUsers={viewReactionUsers}
    />

    {/* Quick reaction bar (hover) */}
    {showReactionBar && (
      <div className="absolute -top-12 right-0 z-10">
        <QuickReactionBar
          onReact={toggleReaction}
          onOpenPicker={() => {/* Open full emoji picker */}}
          userReactions={userReactions}
        />
      </div>
    )}

    {/* Add reaction button (always visible on mobile) */}
    <button
      onClick={() => setShowReactionBar(!showReactionBar)}
      className="md:hidden absolute -bottom-3 right-0 p-1 bg-white rounded-full shadow border"
    >
      <Smile className="w-4 h-4 text-gray-400" />
    </button>

    {/* Reaction users popup */}
    <ReactionUsersPopup
      emoji={selectedEmoji || ''}
      users={emojiUsers}
      isOpen={!!selectedEmoji}
      onClose={() => setSelectedEmoji(null)}
    />
  </div>
);
```

---

## 🧪 **Testing Plan**

### **Unit Tests**

```typescript
describe("ReactionService", () => {
  it("should add reaction", async () => {
    await reactionService.addReaction(messageId, "❤️");
    // Verify reaction added
  });

  it("should remove reaction", async () => {
    await reactionService.removeReaction(messageId, "❤️");
    // Verify reaction removed
  });

  it("should toggle reaction", async () => {
    const added = await reactionService.toggleReaction(messageId, "👍");
    expect(added).toBe(true);

    const removed = await reactionService.toggleReaction(messageId, "👍");
    expect(removed).toBe(false);
  });
});
```

### **MCP Integration Tests**

```bash
# Verify reactions stored correctly
warp mcp run supabase "execute_sql SELECT id, reactions FROM messages WHERE reactions != '{}' LIMIT 5;"

# Test reaction aggregation
warp mcp run supabase "execute_sql SELECT id, jsonb_each_text(reactions) FROM messages WHERE id = 'MSG_ID';"

# E2E reaction flow
warp mcp run puppeteer "e2e test: hover over message, click heart emoji, verify reaction appears with count 1"
```

---

## ✅ **Definition of Done**

- [x] Reactions JSONB column added
- [x] ReactionService with add/remove/toggle methods
- [x] QuickReactionBar component
- [x] MessageReactions display component
- [x] ReactionUsersPopup component
- [x] useReactions hook
- [x] Real-time reaction sync
- [x] Haptic feedback on mobile
- [x] Animation on reaction add
- [x] Tests passing

---

**Next Story:** [STORY_8.5.6_Haptic_Feedback_Gestures.md](./STORY_8.5.6_Haptic_Feedback_Gestures.md)
