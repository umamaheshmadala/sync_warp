# Story 10.1.8: Multi-Friend Chat Forwarding

**Epic:** [Epic 10.1: Unified Sharing Ecosystem](../epics/EPIC_10.1_Unified_Sharing_Ecosystem.md)  
**Status:** 🟢 COMPLETED  
**Priority:** 🟡 Medium  
**Effort:** 2 days  
**Dependencies:** Story 10.1.6 (Rich Link Previews)

---

## 📋 Overview

Enhance the chat forwarding functionality to support selecting multiple friends at once, forwarding all message types (text, media, links), and displaying "Forwarded" labels on forwarded messages.

---

## 🎯 Acceptance Criteria

### AC-1: Multi-Select Friend Picker
**Given** I want to forward a message  
**When** I open the Forward Message dialog  
**Then** I see a friend picker with:
- Search input to filter friends by name
- Checkboxes for multi-selection
- Friend avatars and names
- Selected count indicator
- Recent conversations at top (optional)

---

### AC-2: Search Friends in Forward Dialog
**Given** I want to find a specific friend  
**When** I type in the search input  
**Then** the friend list filters in real-time by:
- Full name (case-insensitive)
- Username (if applicable)

---

### AC-3: Selected Friends Count
**Given** I have selected friends to forward to  
**When** viewing the dialog  
**Then** I see a count indicator:
- "Forward to 1 friend"
- "Forward to 3 friends"
- Selected friend avatars shown in a row

---

### AC-4: Forward Button with Selected Count
**Given** I have selected friends  
**When** viewing the Forward button  
**Then**:
- Button is disabled if no friends selected
- Button shows count: "Forward to 3 friends"
- Button shows loading spinner during send

---

### AC-5: Forwardable Message Types
**Given** the forward dialog  
**When** forwarding different message types  
**Then** all types are supported:

| Message Type | Forwarding Behavior |
|--------------|---------------------|
| Text | Content copied exactly |
| Image | Media URLs preserved |
| Video | Media URLs preserved |
| Audio | Media URLs preserved |
| File | File attachment preserved |
| Link Preview | Full preview with metadata preserved |
| Coupon/Deal | Offer preview preserved |
| Reaction-only | Cannot forward (invalid) |

---

### AC-6: ForwardMessageDialog Component Update
**Given** the current forward dialog needs enhancement  
**When** this story is complete  
**Then** update `src/components/messaging/ForwardMessageDialog.tsx`:

```tsx
interface ForwardMessageDialogProps {
  isOpen: boolean;
  message: Message;
  onClose: () => void;
  onForwarded: () => void;
}

export function ForwardMessageDialog({
  isOpen,
  message,
  onClose,
  onForwarded
}: ForwardMessageDialogProps) {
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isForwarding, setIsForwarding] = useState(false);
  const { friends } = useFriends();
  const { user } = useAuth();
  
  // Filter friends by search query
  const filteredFriends = useMemo(() => {
    if (!friends) return [];
    if (!searchQuery.trim()) return friends;
    
    const query = searchQuery.toLowerCase();
    return friends.filter(f => 
      f.friend_profile.full_name.toLowerCase().includes(query)
    );
  }, [friends, searchQuery]);
  
  // Toggle friend selection
  const toggleFriend = (friendId: string) => {
    setSelectedFriendIds(prev => 
      prev.includes(friendId)
        ? prev.filter(id => id !== friendId)
        : [...prev, friendId]
    );
  };
  
  // Handle forward action
  const handleForward = async () => {
    if (selectedFriendIds.length === 0 || isForwarding) return;
    
    setIsForwarding(true);
    
    try {
      // Get or create conversations for each friend
      const conversationIds = await Promise.all(
        selectedFriendIds.map(friendId => 
          messagingService.getOrCreateConversation(friendId)
        )
      );
      
      // Forward message to all conversations
      await messagingService.forwardMessage(message.id, conversationIds);
      
      toast.success(
        `Forwarded to ${selectedFriendIds.length} friend${selectedFriendIds.length > 1 ? 's' : ''}`
      );
      onForwarded();
      onClose();
    } catch (error) {
      console.error('Forward failed:', error);
      toast.error('Failed to forward message');
    } finally {
      setIsForwarding(false);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Forward Message</DialogTitle>
        </DialogHeader>
        
        {/* Message Preview */}
        <div className="bg-gray-50 rounded-lg p-3 max-h-32 overflow-hidden">
          <MessagePreview message={message} />
        </div>
        
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search friends..."
            className="pl-10"
          />
        </div>
        
        {/* Selected Friends Row */}
        {selectedFriendIds.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            {selectedFriendIds.slice(0, 5).map(friendId => {
              const friend = friends?.find(f => f.friend_id === friendId);
              return (
                <div
                  key={friendId}
                  className="flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-sm"
                >
                  <Avatar className="w-4 h-4">
                    <AvatarImage src={friend?.friend_profile.avatar_url} />
                    <AvatarFallback>{friend?.friend_profile.full_name[0]}</AvatarFallback>
                  </Avatar>
                  <span className="max-w-20 truncate">{friend?.friend_profile.full_name.split(' ')[0]}</span>
                  <button onClick={() => toggleFriend(friendId)}>
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
            {selectedFriendIds.length > 5 && (
              <span className="text-sm text-gray-500">+{selectedFriendIds.length - 5} more</span>
            )}
          </div>
        )}
        
        {/* Friends List */}
        <ScrollArea className="h-64">
          <div className="space-y-1">
            {filteredFriends.map(friend => (
              <button
                key={friend.friend_id}
                onClick={() => toggleFriend(friend.friend_id)}
                className={cn(
                  'w-full flex items-center gap-3 p-2 rounded-lg transition-colors',
                  selectedFriendIds.includes(friend.friend_id)
                    ? 'bg-blue-50'
                    : 'hover:bg-gray-50'
                )}
              >
                <Checkbox
                  checked={selectedFriendIds.includes(friend.friend_id)}
                  onChange={() => toggleFriend(friend.friend_id)}
                />
                <Avatar>
                  <AvatarImage src={friend.friend_profile.avatar_url} />
                  <AvatarFallback>{friend.friend_profile.full_name[0]}</AvatarFallback>
                </Avatar>
                <span className="font-medium">{friend.friend_profile.full_name}</span>
              </button>
            ))}
            
            {filteredFriends.length === 0 && (
              <div className="text-center text-gray-500 py-8">
                {searchQuery ? 'No friends found' : 'No friends yet'}
              </div>
            )}
          </div>
        </ScrollArea>
        
        {/* Footer */}
        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleForward}
            disabled={selectedFriendIds.length === 0 || isForwarding}
          >
            {isForwarding ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : null}
            Forward to {selectedFriendIds.length || ''} friend{selectedFriendIds.length !== 1 ? 's' : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

---

### AC-7: Messaging Service - forwardMessage Method
**Given** forwarding needs to work for multiple recipients  
**When** this story is complete  
**Then** update `src/services/messagingService.ts`:

```typescript
async forwardMessage(messageId: string, conversationIds: string[]): Promise<void> {
  const { user } = await getAuthUser();
  if (!user?.id) throw new Error('Not authenticated');
  
  // Fetch original message
  const { data: originalMessage, error } = await supabase
    .from('messages')
    .select('*')
    .eq('id', messageId)
    .single();
  
  if (error || !originalMessage) {
    throw new Error('Message not found');
  }
  
  // Create forwarded messages for each conversation
  const forwardedMessages = conversationIds.map(conversationId => ({
    conversation_id: conversationId,
    sender_id: user.id,
    content: originalMessage.content,
    type: originalMessage.type,
    media_urls: originalMessage.media_urls,
    link_previews: originalMessage.link_previews,
    is_forwarded: true,
    original_message_id: messageId,
    status: 'sent'
  }));
  
  // Insert all forwarded messages
  const { error: insertError } = await supabase
    .from('messages')
    .insert(forwardedMessages);
  
  if (insertError) {
    throw new Error('Failed to forward message');
  }
  
  // Optionally: Update conversation last_message_at for each
  await Promise.all(
    conversationIds.map(conversationId =>
      supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversationId)
    )
  );
}
```

---

### AC-8: Forwarded Message Label
**Given** a message is forwarded  
**When** the message is displayed  
**Then** show "Forwarded" label above the message content

**Update:** `src/components/messaging/MessageBubble.tsx`

```tsx
function MessageBubble({ message, ...props }: MessageBubbleProps) {
  return (
    <div className="...">
      {/* Forwarded Label */}
      {message.is_forwarded && (
        <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
          <Forward className="w-3 h-3" />
          <span>Forwarded</span>
        </div>
      )}
      
      {/* Message Content */}
      {/* ... existing content */}
    </div>
  );
}
```

---

### AC-9: Database Schema Check
**Given** forwarded messages need to be tracked  
**When** this story is complete  
**Then** ensure these columns exist on `messages` table:

```sql
-- Should already exist from Epic 8.10
-- If not, add them:
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_forwarded BOOLEAN DEFAULT FALSE;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS original_message_id UUID REFERENCES messages(id) ON DELETE SET NULL;
```

---

### AC-10: Forward Context Menu
**Given** I want to forward a message  
**When** I right-click (desktop) or long-press (mobile) a message  
**Then** I see "Forward" in the context menu

**Current implementation** should already exist in `MessageBubble.tsx` via the `onForward` prop.

---

### AC-11: Message Preview in Dialog
**Given** I'm forwarding a message  
**When** viewing the forward dialog  
**Then** I see a preview of the message being forwarded:

```tsx
function MessagePreview({ message }: { message: Message }) {
  return (
    <div className="text-sm">
      {/* Text content */}
      {message.content && (
        <p className="text-gray-700 line-clamp-3">{message.content}</p>
      )}
      
      {/* Media indicator */}
      {message.media_urls?.length > 0 && (
        <div className="flex items-center gap-1 text-gray-500 mt-1">
          <Image className="w-4 h-4" />
          <span>{message.media_urls.length} media file(s)</span>
        </div>
      )}
      
      {/* Link preview indicator */}
      {message.link_previews?.length > 0 && (
        <div className="flex items-center gap-1 text-gray-500 mt-1">
          <Link className="w-4 h-4" />
          <span>{message.link_previews[0].title}</span>
        </div>
      )}
    </div>
  );
}
```

---

## 📁 Files to Create/Modify

### Modified Files
| File | Changes |
|------|---------|
| `src/components/messaging/ForwardMessageDialog.tsx` | Full rewrite for multi-select |
| `src/components/messaging/MessageBubble.tsx` | Add forwarded label |
| `src/services/messagingService.ts` | Add forwardMessage method |
| `supabase/migrations/xxx_add_forward_columns.sql` | Add columns if missing |

---

## 🎨 UI Mockup Description

### Forward Dialog
```
┌─────────────────────────────────────┐
│  Forward Message              [X]   │
├─────────────────────────────────────┤
│  ┌─────────────────────────────┐    │
│  │ "Check out this deal!"     │    │ <- Message preview
│  │ [Link preview indicator]   │    │
│  └─────────────────────────────┘    │
├─────────────────────────────────────┤
│  [🔍 Search friends...]             │
├─────────────────────────────────────┤
│  [Jane ×] [Bob ×] +2 more           │ <- Selected chips
├─────────────────────────────────────┤
│  [☑] [👤] John Doe                  │
│  [☑] [👤] Jane Smith                │
│  [☐] [👤] Bob Wilson                │
│  [☐] [👤] Alice Johnson             │
├─────────────────────────────────────┤
│  [Cancel]   [Forward to 2 friends]  │
└─────────────────────────────────────┘
```

### Forwarded Message Display
```
┌─────────────────────────────────────┐
│  ↪ Forwarded                        │
│  ┌─────────────────────────────┐    │
│  │ Check out this deal at     │    │
│  │ Cafe Delight!              │    │
│  │ [Link Preview Card]        │    │
│  └─────────────────────────────┘    │
│                          10:30 AM ✓✓│
└─────────────────────────────────────┘
```

---

## 🧪 Testing Checklist

### Multi-Select
- [ ] Can select multiple friends
- [ ] Can deselect friends
- [ ] Search filters friend list
- [ ] Selected count updates correctly
- [ ] Selected chips shown in UI

### Forward Action
- [ ] Text message forwards correctly
- [ ] Image message forwards with media
- [ ] Link preview message preserves preview
- [ ] Forwarded to all selected friends
- [ ] Toast shows correct count

### Forwarded Label
- [ ] "Forwarded" label appears on forwarded messages
- [ ] Label styling is subtle/muted
- [ ] Original message content intact

### Edge Cases
- [ ] Forward with 1 friend
- [ ] Forward with 10+ friends
- [ ] Forward very long message
- [ ] Forward message with multiple media
- [ ] Friend goes offline during forward
- [ ] No friends to forward to

---

## ✅ Definition of Done

- [ ] ForwardMessageDialog supports multi-select
- [ ] Search filtering works
- [ ] Selected count and chips displayed
- [ ] All message types forward correctly
- [ ] Forwarded label on messages
- [ ] forwardMessage service method working
- [ ] Toast confirmations
- [ ] All tests passing
- [ ] Code reviewed and merged

---

## 📝 Notes

- Consider adding "Select All" option for conversations with many friends
- Recently forwarded-to friends could appear at top of list
- Forward limit: Consider max 20 friends per forward to prevent spam
- Forwarding DMs: privacy consideration - original sender not visible
- Analytics: Track forward counts for share metrics
