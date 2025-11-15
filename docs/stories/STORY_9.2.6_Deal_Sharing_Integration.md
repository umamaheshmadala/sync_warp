# 🔗 STORY 9.2.6: Deal Sharing Integration

**Epic:** [EPIC 9.2 - Friend Discovery & Search](../epics/EPIC_9.2_Friend_Discovery_Search.md)  
**Story ID:** 9.2.6  
**Priority:** 🟢 Low  
**Estimate:** 1 day  
**Status:** 📋 Ready for Development  
**Dependencies:** Story 9.2.1, 9.2.2

---

## 📋 **Story Description**

As a SynC user, I want to **easily select friends to share deals with** using an integrated friend picker that suggests relevant connections (People You May Know), so I can quickly share deals with friends who might be interested.

**User Value:**  
Streamlined deal sharing flow with intelligent friend suggestions increases engagement and helps users share deals with the right people.

---

## 🎯 **Acceptance Criteria**

### UI Components
- [ ] **AC 9.2.6.1**: `FriendPickerModal` component created
- [ ] **AC 9.2.6.2**: Modal displays:
  - Search bar for finding friends
  - "Suggested friends" section (from PYMK)
  - "All friends" section (with search)
  - Multi-select with checkboxes
- [ ] **AC 9.2.6.3**: Selected friends displayed as chips
- [ ] **AC 9.2.6.4**: "Share" button sends deal via message or notification

### Integration
- [ ] **AC 9.2.6.5**: Friend picker integrates with existing search (Story 9.2.1)
- [ ] **AC 9.2.6.6**: PYMK suggestions displayed at top (Story 9.2.2)
- [ ] **AC 9.2.6.7**: Friend picker opens from:
  - Deal detail page "Share" button
  - Deal card context menu
  - Profile page "Share deal" action

### Functionality
- [ ] **AC 9.2.6.8**: Multi-select allows selecting multiple friends at once
- [ ] **AC 9.2.6.9**: Search filters suggestions in real-time
- [ ] **AC 9.2.6.10**: Shared deal appears in recipient's notifications/messages
- [ ] **AC 9.2.6.11**: "Recently shared with" section remembers last 5 friends

### Testing
- [ ] **AC 9.2.6.12**: E2E test: Open picker → search → select → share

---

## 🛠️ **Technical Specification**

### UI Component: `src/components/sharing/FriendPickerModal.tsx`

```typescript
/**
 * Friend Picker Modal - Deal Sharing Integration
 * Story 9.2.6: Deal Sharing Integration
 */

import React, { useState } from 'react';
import { X, Search, Check, Users, Clock } from 'lucide-react';
import { useSearch } from '@/hooks/useSearch';
import { usePYMK } from '@/hooks/usePYMK';
import { searchUsers } from '@/services/searchService';
import { shareDealWithFriends } from '@/services/dealService';

interface FriendPickerModalProps {
  dealId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (friendIds: string[]) => void;
}

export function FriendPickerModal({
  dealId,
  isOpen,
  onClose,
  onSuccess,
}: FriendPickerModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [isSharing, setIsSharing] = useState(false);

  // Use search hook (from Story 9.2.1)
  const { data: searchResults = [], isLoading: isSearching } = useSearch(searchQuery);

  // Use PYMK hook (from Story 9.2.2)
  const { data: pymkSuggestions = [], isLoading: isLoadingPYMK } = usePYMK();

  // Load recently shared with (from localStorage)
  const recentlySharedWith = JSON.parse(
    localStorage.getItem('recently_shared_with') || '[]'
  ).slice(0, 5);

  const handleToggleFriend = (userId: string) => {
    setSelectedFriends((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleShare = async () => {
    if (selectedFriends.length === 0) return;

    setIsSharing(true);
    try {
      await shareDealWithFriends(dealId, selectedFriends);

      // Update recently shared with
      const updated = [
        ...selectedFriends,
        ...recentlySharedWith.filter((id: string) => !selectedFriends.includes(id)),
      ].slice(0, 5);
      localStorage.setItem('recently_shared_with', JSON.stringify(updated));

      onSuccess?.(selectedFriends);
      onClose();
    } catch (error) {
      console.error('Failed to share deal:', error);
      alert('Failed to share deal. Please try again.');
    } finally {
      setIsSharing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end md:items-center justify-center">
      <div className="bg-white w-full md:max-w-lg md:rounded-lg rounded-t-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Share Deal</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search friends..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Selected Friends */}
          {selectedFriends.length > 0 && (
            <div className="p-4 bg-blue-50 border-b">
              <p className="text-sm font-medium text-gray-700 mb-2">
                {selectedFriends.length} friend{selectedFriends.length > 1 ? 's' : ''} selected
              </p>
            </div>
          )}

          {/* PYMK Suggestions */}
          {!searchQuery && pymkSuggestions.length > 0 && (
            <div className="p-4 border-b">
              <h3 className="flex items-center text-sm font-semibold text-gray-900 mb-3">
                <Users className="w-4 h-4 mr-2" />
                Suggested Friends
              </h3>
              <div className="space-y-2">
                {pymkSuggestions.slice(0, 5).map((suggestion) => (
                  <FriendRow
                    key={suggestion.userId}
                    userId={suggestion.userId}
                    name={suggestion.fullName}
                    username={suggestion.username}
                    avatarUrl={suggestion.avatarUrl}
                    subtitle={`${suggestion.mutualFriendsCount} mutual friends`}
                    isSelected={selectedFriends.includes(suggestion.userId)}
                    onToggle={() => handleToggleFriend(suggestion.userId)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Recently Shared With */}
          {!searchQuery && recentlySharedWith.length > 0 && (
            <div className="p-4 border-b">
              <h3 className="flex items-center text-sm font-semibold text-gray-900 mb-3">
                <Clock className="w-4 h-4 mr-2" />
                Recently Shared With
              </h3>
              <div className="space-y-2">
                {recentlySharedWith.map((userId: string) => (
                  <FriendRowSkeleton key={userId} userId={userId} />
                ))}
              </div>
            </div>
          )}

          {/* Search Results or All Friends */}
          <div className="p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              {searchQuery ? 'Search Results' : 'All Friends'}
            </h3>
            {isSearching || isLoadingPYMK ? (
              <div className="text-center py-8 text-gray-500">Loading...</div>
            ) : searchResults.length > 0 ? (
              <div className="space-y-2">
                {searchResults.map((result) => (
                  <FriendRow
                    key={result.userId}
                    userId={result.userId}
                    name={result.fullName}
                    username={result.username}
                    avatarUrl={result.avatarUrl}
                    subtitle={result.location || ''}
                    isSelected={selectedFriends.includes(result.userId)}
                    onToggle={() => handleToggleFriend(result.userId)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                {searchQuery ? 'No friends found' : 'No friends yet'}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-white">
          <button
            onClick={handleShare}
            disabled={selectedFriends.length === 0 || isSharing}
            className="w-full bg-primary-600 text-white py-3 rounded-lg font-medium hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {isSharing
              ? 'Sharing...'
              : `Share with ${selectedFriends.length || ''} friend${selectedFriends.length !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Friend Row Component
 */
interface FriendRowProps {
  userId: string;
  name: string;
  username: string;
  avatarUrl?: string;
  subtitle?: string;
  isSelected: boolean;
  onToggle: () => void;
}

function FriendRow({
  name,
  username,
  avatarUrl,
  subtitle,
  isSelected,
  onToggle,
}: FriendRowProps) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition"
    >
      {/* Avatar */}
      <img
        src={avatarUrl || '/default-avatar.png'}
        alt={name}
        className="w-12 h-12 rounded-full object-cover"
      />

      {/* Info */}
      <div className="flex-1 text-left">
        <p className="font-medium text-gray-900">{name}</p>
        <p className="text-sm text-gray-500">
          @{username}
          {subtitle && ` · ${subtitle}`}
        </p>
      </div>

      {/* Checkbox */}
      <div
        className={`w-6 h-6 rounded border-2 flex items-center justify-center ${
          isSelected
            ? 'bg-primary-600 border-primary-600'
            : 'border-gray-300'
        }`}
      >
        {isSelected && <Check className="w-4 h-4 text-white" />}
      </div>
    </button>
  );
}

/**
 * Skeleton for recently shared with (loads user data)
 */
function FriendRowSkeleton({ userId }: { userId: string }) {
  // In a real implementation, you'd fetch user data here
  return <div className="h-16 bg-gray-100 rounded-lg animate-pulse" />;
}
```

### Service Layer: Update `src/services/dealService.ts`

```typescript
/**
 * Deal Service - Share with Friends
 * Story 9.2.6: Deal Sharing Integration
 */

/**
 * Share deal with multiple friends
 * Sends deal via notification or message
 */
export async function shareDealWithFriends(
  dealId: string,
  friendIds: string[]
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  // Create notification for each friend
  const notifications = friendIds.map((friendId) => ({
    user_id: friendId,
    type: 'deal_shared',
    content: {
      deal_id: dealId,
      shared_by_user_id: user.id,
      shared_by_name: user.user_metadata?.full_name || 'A friend',
    },
    created_at: new Date().toISOString(),
  }));

  const { error } = await supabase.from('notifications').insert(notifications);

  if (error) {
    console.error('Failed to share deal:', error);
    throw new Error('Failed to share deal. Please try again.');
  }

  // Optionally: Also send as message (if messaging system exists)
  // await sendDealMessage(dealId, friendIds);
}

/**
 * Get recently shared deals
 */
export async function getRecentlySharedDeals(): Promise<string[]> {
  try {
    const recent = localStorage.getItem('recently_shared_deals');
    return recent ? JSON.parse(recent) : [];
  } catch {
    return [];
  }
}
```

---

## 🎯 **MCP Integration**

### Shadcn MCP
```bash
# Generate friend picker modal components
warp mcp run shadcn "add dialog checkbox avatar"
```

### Puppeteer MCP
```bash
# Test full deal sharing flow
warp mcp run puppeteer "navigate to deal page, click share button, search for friend, select friend, click share, verify notification sent"

# Test multi-select
warp mcp run puppeteer "open friend picker, select 3 friends, verify all selected, click share"
```

### Context7 MCP
```bash
# Analyze friend picker integration points
warp mcp run context7 "analyze src/components/sharing/FriendPickerModal.tsx integration with search and PYMK"
```

---

## 📸 **UI Mockup (Friend Picker Modal)**

```
┌─────────────────────────────────────┐
│ Share Deal                        × │
├─────────────────────────────────────┤
│ 🔍 Search friends...                │
├─────────────────────────────────────┤
│ 2 friends selected                  │
├─────────────────────────────────────┤
│ 👥 Suggested Friends                │
│  ☑ Alice Johnson @alice             │
│     5 mutual friends                │
│  ☐ Bob Smith @bob                   │
│     3 mutual friends                │
├─────────────────────────────────────┤
│ 🕐 Recently Shared With             │
│  ☑ Charlie Brown @charlie           │
│  ☐ Dana White @dana                 │
├─────────────────────────────────────┤
│ All Friends                         │
│  ☐ Eve Martinez @eve                │
│  ☐ Frank Johnson @frank             │
├─────────────────────────────────────┤
│ [Share with 2 friends]              │
└─────────────────────────────────────┘
```

---

## ✅ **Definition of Done**

- [ ] All 12 acceptance criteria met
- [ ] `FriendPickerModal` component built and integrated
- [ ] Friend picker opens from deal share buttons
- [ ] Search integration working (Story 9.2.1)
- [ ] PYMK suggestions displayed (Story 9.2.2)
- [ ] Multi-select functionality works
- [ ] Recently shared with section persists
- [ ] Shared deals create notifications
- [ ] E2E tests pass
- [ ] Component is responsive (mobile + web)
- [ ] Code reviewed and approved
- [ ] Documentation updated

---

## 📚 **Related Documentation**

- [Epic 9.2 Overview](../epics/EPIC_9.2_Friend_Discovery_Search.md)
- [Story 9.2.1 - Global Friend Search](./STORY_9.2.1_Global_Friend_Search.md)
- [Story 9.2.2 - PYMK Engine](./STORY_9.2.2_PYMK_Engine.md)

---

## 🚀 **Usage Example**

```typescript
// In DealDetailPage.tsx
import { FriendPickerModal } from '@/components/sharing/FriendPickerModal';

function DealDetailPage() {
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  return (
    <>
      <button onClick={() => setIsPickerOpen(true)}>
        Share Deal
      </button>

      <FriendPickerModal
        dealId={deal.id}
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        onSuccess={(friendIds) => {
          console.log(`Shared with ${friendIds.length} friends`);
          alert('Deal shared successfully!');
        }}
      />
    </>
  );
}
```

---

**Story Complete!** 🎉  
This concludes **Epic 9.2: Friend Discovery & Search**.  

**Next Epic:** [EPIC 9.3 - Chat & Messaging System](../epics/EPIC_9.3_Chat_Messaging_System.md) (if applicable)
