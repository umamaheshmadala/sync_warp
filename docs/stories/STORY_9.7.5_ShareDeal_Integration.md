# Story 9.7.5: Integration with ShareDeal Component

**Epic:** [EPIC 9.7: Friends & Deal Sharing Integration](../epics/EPIC_9.7_Friends_Deal_Sharing.md)  
**Priority:** 🔴 Critical  
**Estimated Time:** 3 days (actual)  
**MCP Usage:** 🧠 Context7 MCP (Heavy)  
**Dependencies:** Story 9.7.1 (Share Deal with Friends)  
**Status:** ✅ Complete (with pending items)
**Completion Date:** 2025-11-28

---

## 📋 Story Description

Update the existing `ShareDeal.tsx` component to include a "Friends" option alongside Email and Link sharing. This integrates the friend picker modal from Story 9.7.1 into the existing share flow.

---

## ✅ Acceptance Criteria

### UI Components
- [x] Add "Friends" tab/option to ShareDeal component
- [x] Reuse friend picker modal from Story 9.7.1
- [x] Maintain existing Email and Link functionality
- [x] Consistent design with existing share UI
- [x] Loading states for all share methods
- [x] **BONUS:** Collapsible message input for space efficiency
- [x] **BONUS:** Icon-based share method selection
- [x] **BONUS:** Fixed "All Friends" section to show actual friends

### Functionality
- [x] Integrate FriendPickerModal component
- [x] Track share method analytics (friends vs email vs link)
- [x] Backward compatible with existing code
- [x] No breaking changes to existing share functionality
- [x] Integrated into Business Page Offer Modal
- [ ] **PENDING:** "Recently Shared With" section (debugging required)

### Analytics
- [x] Track which share method is used most
- [x] Track conversion rate per share method
- [x] Log share events to analytics service

---

## 🎨 Component Implementation

### File: `src/components/ShareDeal.tsx` (Updated)

```typescript
import { useState } from 'react';
import { Share2, Mail, Link as LinkIcon, Users } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShareDealWithFriends } from './deals/ShareDealWithFriends';
import { trackEvent } from '@/lib/analytics';
import toast from 'react-hot-toast';

interface ShareDealProps {
  deal: Deal;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export function ShareDeal({ deal, variant = 'outline', size = 'default' }: ShareDealProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  const dealUrl = `${window.location.origin}/deals/${deal.id}`;

  // Copy link to clipboard
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(dealUrl);
      toast.success('Link copied to clipboard');
      trackEvent('deal_shared', { method: 'link', deal_id: deal.id });
    } catch (error) {
      toast.error('Failed to copy link');
    }
  };

  // Share via email
  const handleEmailShare = async () => {
    if (!email) {
      toast.error('Please enter an email address');
      return;
    }

    setIsSendingEmail(true);
    try {
      // Call email sharing service
      await shareViaEmail(deal.id, email);
      toast.success('Email sent successfully');
      setEmail('');
      trackEvent('deal_shared', { method: 'email', deal_id: deal.id });
    } catch (error) {
      toast.error('Failed to send email');
    } finally {
      setIsSendingEmail(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size}>
          <Share2 className="mr-2 h-4 w-4" />
          Share
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Share Deal</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="friends" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="friends">
              <Users className="mr-2 h-4 w-4" />
              Friends
            </TabsTrigger>
            <TabsTrigger value="link">
              <LinkIcon className="mr-2 h-4 w-4" />
              Link
            </TabsTrigger>
            <TabsTrigger value="email">
              <Mail className="mr-2 h-4 w-4" />
              Email
            </TabsTrigger>
          </TabsList>

          {/* Friends Tab */}
          <TabsContent value="friends" className="space-y-4">
            <ShareDealWithFriends 
              deal={deal} 
              onClose={() => setIsOpen(false)}
              embedded={true}
            />
          </TabsContent>

          {/* Link Tab */}
          <TabsContent value="link" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="deal-link">Deal Link</Label>
              <div className="flex space-x-2">
                <Input
                  id="deal-link"
                  value={dealUrl}
                  readOnly
                  className="flex-1"
                />
                <Button onClick={handleCopyLink}>
                  Copy
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Anyone with this link can view the deal
              </p>
            </div>
          </TabsContent>

          {/* Email Tab */}
          <TabsContent value="email" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="friend@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <Button
              onClick={handleEmailShare}
              disabled={isSendingEmail || !email}
              className="w-full"
            >
              {isSendingEmail ? 'Sending...' : 'Send Email'}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// Email sharing service
async function shareViaEmail(dealId: string, email: string) {
  const response = await fetch('/api/share-deal-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dealId, email }),
  });

  if (!response.ok) {
    throw new Error('Failed to send email');
  }

  return response.json();
}
```

### Updated ShareDealWithFriends Component

```typescript
// src/components/deals/ShareDealWithFriends.tsx (Updated)

interface ShareDealWithFriendsProps {
  deal: Deal;
  onClose?: () => void;
  embedded?: boolean;  // New prop for embedded mode
}

export function ShareDealWithFriends({ 
  deal, 
  onClose,
  embedded = false 
}: ShareDealWithFriendsProps) {
  // ... existing state and logic ...

  const handleShare = () => {
    if (selectedFriends.length === 0) {
      toast.error('Please select at least one friend');
      return;
    }
    
    shareMutation.mutate();
    trackEvent('deal_shared', { 
      method: 'friends', 
      deal_id: deal.id,
      friend_count: selectedFriends.length 
    });
  };

  // If embedded, render without Dialog wrapper
  if (embedded) {
    return (
      <div className="space-y-4">
        {/* Deal Preview */}
        <DealCard deal={deal} compact />

        {/* Friend picker and other content */}
        {/* ... rest of the component ... */}

        <Button
          onClick={handleShare}
          disabled={selectedFriends.length === 0 || shareMutation.isPending}
          className="w-full"
        >
          {shareMutation.isPending ? 'Sharing...' : `Share with ${selectedFriends.length} ${selectedFriends.length === 1 ? 'friend' : 'friends'}`}
        </Button>
      </div>
    );
  }

  // Original standalone version
  return (
    <>
      <Button onClick={() => setIsOpen(true)} variant="outline">
        <Users className="mr-2 h-4 w-4" />
        Share with Friends
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        {/* ... original dialog content ... */}
      </Dialog>
    </>
  );
}
```

---

## 📊 Analytics Implementation

### File: `src/lib/analytics.ts`

```typescript
export function trackEvent(
  eventName: string,
  properties?: Record<string, any>
) {
  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log('[Analytics]', eventName, properties);
  }

  // Send to analytics service (e.g., PostHog, Mixpanel, GA4)
  if (window.analytics) {
    window.analytics.track(eventName, properties);
  }

  // Also log to database for internal analytics
  logEventToDatabase(eventName, properties);
}

async function logEventToDatabase(
  eventName: string,
  properties?: Record<string, any>
) {
  try {
    await supabase.from('analytics_events').insert({
      event_name: eventName,
      properties,
      user_id: (await supabase.auth.getUser()).data.user?.id,
    });
  } catch (error) {
    console.error('Failed to log event:', error);
  }
}
```

---

## 🧪 Testing Plan

### Manual Testing
1. **Open Share Dialog**
   - Click "Share" button on deal
   - Verify dialog opens with 3 tabs

2. **Friends Tab**
   - Select Friends tab
   - Verify friend picker appears
   - Share with friends
   - Verify success

3. **Link Tab**
   - Select Link tab
   - Click "Copy" button
   - Verify link copied

4. **Email Tab**
   - Select Email tab
   - Enter email address
   - Click "Send Email"
   - Verify email sent

5. **Analytics**
   - Share via each method
   - Verify events tracked

### Integration Testing
- [ ] Existing ShareDeal functionality still works
- [ ] No breaking changes
- [ ] All share methods functional
- [ ] Analytics tracking working

---

## 🎯 MCP Integration

### Context7 MCP Usage

```bash
# Analyze existing ShareDeal component
warp mcp run context7 "analyze src/components/ShareDeal.tsx"

# Find all usages of ShareDeal
warp mcp run context7 "find usage of ShareDeal component"

# Understand deal detail page structure
warp mcp run context7 "analyze src/pages/DealDetailPage.tsx"
```

---

## ✅ Definition of Done

- [x] ShareDeal component updated
- [x] Friends tab integrated
- [x] Existing functionality preserved
- [x] Analytics tracking implemented
- [x] Manual testing completed
- [x] No breaking changes
- [x] Code reviewed
- [x] **BONUS:** UI revamp for better UX
- [x] Integrated into Business Page
- [ ] **PENDING:** Recently Shared With debugging

## 🎉 Additional Features Implemented

### UI Revamp (Completed 2025-11-28)
- **Collapsible Message Input**: Starts collapsed as "+ Add a message" button, saving ~120px vertical space
- **Icon-Based Share Method**: Compact horizontal icons (Bell/MessageSquare) instead of large cards, saving ~80px
- **Fixed All Friends Section**: Now uses `useFriends()` hook to display actual friends instead of "No friends" message
- **Total Space Savings**: ~200px vertical space reduction

### Integration Points
- **Business Page**: Integrated into `FeaturedOffers.tsx` offer detail modal
- **Demo Page**: Created `/test/share-deal` for testing
- **DevMenu**: Added quick access link

### Technical Improvements
- Fixed `dealService.ts` to use `offers` table instead of `deals`
- Fixed notification type enum compatibility
- Added comprehensive error handling
- Implemented real-time notifications

---

**Next Story:** [Story 9.7.6: Deal Sharing Analytics](./STORY_9.7.6_Deal_Analytics.md)
