# Story 9.7.1: Share Deal with Friends UI

**Epic:** [EPIC 9.7: Friends & Deal Sharing Integration](../epics/EPIC_9.7_Friends_Deal_Sharing.md)  
**Priority:** 🔴 Critical  
**Estimated Time:** 2 days  
**MCP Usage:** 🧠 Context7 MCP (Heavy), 🎨 Shadcn MCP (Medium)  
**Dependencies:** Epic 9.3 (Friends Module), Epic 9.4 (Deal Services)  
**Status:** ✅ Completed

---

## 📋 Story Description

Build a comprehensive "Share with friends" flow that allows users to share deals directly with their friends. This includes a friend picker modal with multi-select, search functionality, custom message input, and choice between sending as a message or notification.

---

## ✅ Acceptance Criteria

### UI Components
- [ ] "Share with Friends" button on deal detail page
- [ ] Friend picker modal with multi-select checkboxes
- [ ] Search functionality to filter friends
- [ ] Deal preview card in modal
- [ ] Custom message textarea (optional)
- [ ] Share method selector (message vs notification)
- [ ] Loading states during share operation
- [ ] Success confirmation with count

### Functionality
- [ ] Load user's friends list
- [ ] Search/filter friends by name
- [ ] Select multiple friends (checkboxes)
- [ ] Add optional custom message
- [ ] Choose share method: message OR notification
- [ ] Send deal share to selected friends
- [ ] Track share events for analytics
- [ ] Show success toast: "Shared with X friends"
- [ ] Close modal after successful share

### Integration
- [ ] Integrate with existing messaging system (if share as message)
- [ ] Integrate with notification system (if share as notification)
- [ ] Create `deal_shares` database table
- [ ] Track share metadata (sender, recipients, timestamp)

### Responsive Design
- [ ] Mobile-friendly modal (full-screen on small devices)
- [ ] Touch-friendly checkboxes and buttons
- [ ] Keyboard navigation support

---

## 🎨 Component Implementation

### File: `src/components/deals/ShareDealWithFriends.tsx`

```typescript
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, Search, MessageSquare, Bell } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { DealCard } from './DealCard';
import { useFriends } from '@/hooks/useFriends';
import { shareDealWithFriends } from '@/services/dealSharingService';
import toast from 'react-hot-toast';

interface ShareDealWithFriendsProps {
  deal: Deal;
}

export function ShareDealWithFriends({ deal }: ShareDealWithFriendsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [shareMethod, setShareMethod] = useState<'message' | 'notification'>('notification');
  const [searchQuery, setSearchQuery] = useState('');
  const queryClient = useQueryClient();

  // Fetch friends
  const { data: friends, isLoading: friendsLoading } = useFriends();

  // Filter friends based on search
  const filteredFriends = friends?.filter((friend) =>
    friend.profile?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    friend.profile?.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Share mutation
  const shareMutation = useMutation({
    mutationFn: async () => {
      return await shareDealWithFriends({
        dealId: deal.id,
        recipientIds: selectedFriends,
        message: message || undefined,
        shareMethod,
      });
    },
    onSuccess: () => {
      toast.success(`Shared with ${selectedFriends.length} ${selectedFriends.length === 1 ? 'friend' : 'friends'}`);
      setIsOpen(false);
      setSelectedFriends([]);
      setMessage('');
      setSearchQuery('');
      queryClient.invalidateQueries({ queryKey: ['deal-shares'] });
    },
    onError: (error) => {
      toast.error('Failed to share deal');
      console.error('Share error:', error);
    },
  });

  const handleToggleFriend = (friendId: string) => {
    setSelectedFriends((prev) =>
      prev.includes(friendId)
        ? prev.filter((id) => id !== friendId)
        : [...prev, friendId]
    );
  };

  const handleShare = () => {
    if (selectedFriends.length === 0) {
      toast.error('Please select at least one friend');
      return;
    }
    shareMutation.mutate();
  };

  return (
    <>
      <Button onClick={() => setIsOpen(true)} variant="outline">
        <Users className="mr-2 h-4 w-4" />
        Share with Friends
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Share with Friends</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex flex-col space-y-4">
            {/* Deal Preview */}
            <DealCard deal={deal} compact />

            {/* Search Friends */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search friends..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Friend List */}
            <ScrollArea className="flex-1 min-h-[200px] max-h-[300px] border rounded-lg p-2">
              {friendsLoading ? (
                <div className="p-4 text-center text-muted-foreground">
                  Loading friends...
                </div>
              ) : filteredFriends?.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  {searchQuery ? 'No friends found' : 'No friends yet'}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredFriends?.map((friend) => (
                    <label
                      key={friend.friend_id}
                      className="flex items-center space-x-3 p-2 hover:bg-muted rounded cursor-pointer"
                    >
                      <Checkbox
                        checked={selectedFriends.includes(friend.friend_id)}
                        onCheckedChange={() => handleToggleFriend(friend.friend_id)}
                      />
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={friend.profile?.avatar_url} />
                        <AvatarFallback>
                          {friend.profile?.full_name?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="font-medium text-sm">
                          {friend.profile?.full_name || friend.profile?.username}
                        </div>
                        {friend.profile?.username && (
                          <div className="text-xs text-muted-foreground">
                            @{friend.profile.username}
                          </div>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </ScrollArea>

            {/* Custom Message */}
            <Textarea
              placeholder="Add a message (optional)"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              maxLength={500}
            />

            {/* Share Method */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Share as:</Label>
              <RadioGroup
                value={shareMethod}
                onValueChange={(value) => setShareMethod(value as 'message' | 'notification')}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="notification" id="notification" />
                  <Label htmlFor="notification" className="flex items-center cursor-pointer">
                    <Bell className="mr-2 h-4 w-4" />
                    Notification (instant)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="message" id="message" />
                  <Label htmlFor="message" className="flex items-center cursor-pointer">
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Message (in chat)
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleShare}
              disabled={selectedFriends.length === 0 || shareMutation.isPending}
            >
              {shareMutation.isPending ? 'Sharing...' : `Share with ${selectedFriends.length} ${selectedFriends.length === 1 ? 'friend' : 'friends'}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
```

---

## 🛢 Database Schema

### File: `supabase/migrations/20250126_deal_shares.sql`

```sql
-- Table: deal_shares
CREATE TABLE IF NOT EXISTS deal_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message TEXT,
  share_method TEXT NOT NULL CHECK (share_method IN ('message', 'notification')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent duplicate shares
  UNIQUE(deal_id, sender_id, recipient_id, created_at::date)
);

-- Indexes
CREATE INDEX idx_deal_shares_deal_id ON deal_shares(deal_id);
CREATE INDEX idx_deal_shares_sender_id ON deal_shares(sender_id);
CREATE INDEX idx_deal_shares_recipient_id ON deal_shares(recipient_id);
CREATE INDEX idx_deal_shares_created_at ON deal_shares(created_at DESC);

-- RLS Policies
ALTER TABLE deal_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view shares they sent or received"
  ON deal_shares FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can create shares"
  ON deal_shares FOR INSERT
  WITH CHECK (auth.uid() = sender_id);
```

---

## 🔧 Service Implementation

### File: `src/services/dealSharingService.ts`

```typescript
import { supabase } from '@/lib/supabase';
import { createOrGetConversation, sendMessage } from './messagingService';
import { createNotification } from './notificationService';

interface ShareDealParams {
  dealId: string;
  recipientIds: string[];
  message?: string;
  shareMethod: 'message' | 'notification';
}

export async function shareDealWithFriends({
  dealId,
  recipientIds,
  message,
  shareMethod,
}: ShareDealParams) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Get deal details
  const { data: deal, error: dealError } = await supabase
    .from('deals')
    .select('*')
    .eq('id', dealId)
    .single();

  if (dealError) throw dealError;

  // Share with each friend
  const sharePromises = recipientIds.map(async (recipientId) => {
    // Log share in database
    const { error: shareError } = await supabase
      .from('deal_shares')
      .insert({
        deal_id: dealId,
        sender_id: user.id,
        recipient_id: recipientId,
        message,
        share_method: shareMethod,
      });

    if (shareError) {
      console.error('Error logging share:', shareError);
    }

    // Send via chosen method
    if (shareMethod === 'message') {
      const conversationId = await createOrGetConversation(recipientId);
      await sendMessage(conversationId, {
        type: 'deal',
        content: message || `Check out this deal: ${deal.title}`,
        shared_deal_id: dealId,
      });
    } else {
      await createNotification({
        user_id: recipientId,
        type: 'deal_shared',
        title: 'Deal Shared',
        message: message || `${user.user_metadata?.full_name || 'A friend'} shared a deal with you`,
        data: {
          deal_id: dealId,
          sender_id: user.id,
        },
        route_to: `/deals/${dealId}`,
      });
    }
  });

  await Promise.all(sharePromises);

  return { success: true, count: recipientIds.length };
}
```

---

## 🧪 Testing Plan

### Manual Testing
1. **Open Share Modal**
   - Navigate to deal detail page
   - Click "Share with Friends" button
   - Verify modal opens with deal preview

2. **Search Friends**
   - Type in search box
   - Verify friends filter correctly
   - Test with partial names

3. **Select Friends**
   - Select single friend
   - Select multiple friends
   - Deselect friends
   - Verify count updates

4. **Add Message**
   - Type custom message
   - Verify character limit (500)
   - Test with empty message

5. **Choose Share Method**
   - Select "Notification"
   - Select "Message"
   - Verify radio button behavior

6. **Share Deal**
   - Click share button
   - Verify loading state
   - Verify success toast
   - Verify modal closes
   - Check recipient received notification/message

### Edge Cases
- [ ] No friends (show empty state)
- [ ] Network error during share
- [ ] Share with 0 friends selected
- [ ] Very long friend list (scroll performance)
- [ ] Special characters in message

---

## 🎯 MCP Integration

### Context7 MCP Usage

```bash
# Find existing ShareDeal component
warp mcp run context7 "find usage of ShareDeal component"

# Analyze deal detail page structure
warp mcp run context7 "analyze src/pages/DealDetailPage.tsx"

# Find messaging integration points
warp mcp run context7 "find messaging service functions"
```

### Shadcn MCP Usage

```bash
# Generate Dialog component (if not exists)
npx shadcn-ui@latest add dialog

# Generate Checkbox component
npx shadcn-ui@latest add checkbox

# Generate Radio Group component
npx shadcn-ui@latest add radio-group
```

---

## 📦 Integration Points

### With Existing Systems
1. **Friends Module** (Epic 9.3)
   - Use `useFriends()` hook
   - Access friend profiles

2. **Messaging System** (Epic 8.x)
   - `createOrGetConversation()`
   - `sendMessage()`

3. **Notification System** (Epic 9.6)
   - `createNotification()`
   - Notification preferences

4. **Analytics**
   - Track share events
   - Track share method preference

---

## ✅ Definition of Done

- [ ] Component implemented and styled
- [ ] Database migration applied
- [ ] Service functions created
- [ ] Integration with friends module working
- [ ] Integration with messaging/notifications working
- [ ] Manual testing completed
- [ ] Responsive design verified
- [ ] Code reviewed
- [ ] Documentation updated

---

**Next Story:** [Story 9.7.2: Friend Tags in Deal Comments](./STORY_9.7.2_Friend_Tags_Comments.md)
