# Story 10.1.2: Storefront Sharing

**Epic:** [Epic 10.1: Unified Sharing Ecosystem](../epics/EPIC_10.1_Unified_Sharing_Ecosystem.md)  
**Status:** ✅ COMPLETE  
**Priority:** 🔴 Critical  
**Effort:** 2 days  
**Dependencies:** Story 10.1.1 (Share Infrastructure)

---

## 📋 Overview

Implement comprehensive share functionality for Business Storefronts (Business Profile pages), enabling users to share businesses via in-app chat, external apps, and social media.

---

## 🎯 Acceptance Criteria

### AC-1: Share Button in Business Profile Header (Desktop)
**Given** I am viewing a Business Profile page  
**When** I look at the header area  
**Then** I see a Share button (Share2 icon from lucide-react)  
**And** it is positioned near the Favorite/Follow button  
**And** it has a tooltip "Share this business"

**Location:** `src/components/business/BusinessProfile.tsx`

**UI Specification:**
```tsx
// Desktop header actions (near existing favorite button)
<button
  onClick={() => setShowShareModal(true)}
  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
  title="Share this business"
>
  <Share2 className="w-5 h-5 text-gray-600" />
</button>
```

---

### AC-2: Share Button in Mobile View
**Given** I am viewing a Business Profile on mobile  
**When** I look at the action bar/floating buttons  
**Then** I see a Share button that is easily tappable  
**And** it follows mobile touch target guidelines (min 44x44px)

**Location:** Mobile action bar or floating action buttons in `BusinessProfile.tsx`

---

### AC-3: Share Modal/Sheet Component
**Given** I click the Share button  
**When** the share modal opens  
**Then** I see the following options in this order:

| Option | Icon | Description |
|--------|------|-------------|
| Send to Friend | `MessageCircle` | Opens friend picker for in-app chat |
| Copy Link | `Link` | Copies URL to clipboard |
| Facebook | FB icon | Opens Facebook share dialog |
| Twitter/X | Twitter icon | Opens Twitter share dialog |
| WhatsApp | WA icon | Opens WhatsApp with message |
| Email | `Mail` | Opens email client |
| More... | `MoreHorizontal` | Triggers native share sheet (mobile only) |

**Component:** `src/components/sharing/ShareModal.tsx`

```tsx
interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: 'storefront' | 'product' | 'offer' | 'profile';
  entityId: string;
  title: string;
  description: string;
  imageUrl?: string;
  url: string;
}

export function ShareModal({ isOpen, onClose, ...props }: ShareModalProps) {
  const [showFriendPicker, setShowFriendPicker] = useState(false);
  const { shareToChat, shareClipboard, shareToPlatform, shareNative, isNativeShareSupported } = useUnifiedShare();
  const { platform } = usePlatform();

  // ... implementation
}
```

---

### AC-4: Friend Picker for In-App Chat Sharing
**Given** I click "Send to Friend" in the share modal  
**When** the friend picker opens  
**Then** I see:
- Search input to filter friends by name
- List of my friends with avatars and names
- Checkboxes for multi-select
- Selected count indicator: "Send to X friends"
- Optional message input field
- "Send" button (disabled if no friends selected)

**Component:** Reuse/extend `src/components/sharing/FriendPickerModal.tsx` from Epic 9.7

```tsx
interface FriendPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (friendIds: string[], message?: string) => Promise<void>;
  title?: string;
  entityPreview?: React.ReactNode; // Shows preview of what's being shared
}
```

---

### AC-5: Share to Chat Flow
**Given** I select friends and click "Send"  
**When** the share is processed  
**Then**:
1. A message is sent to each selected friend's conversation
2. The message contains a `sync-storefront` link preview
3. Toast notification: "Shared with X friend(s)"
4. Share modal closes
5. Share event is tracked in the database

**Message Structure:**
```typescript
await messagingService.sendMessage({
  conversationId: await getOrCreateConversation(friendId),
  content: customMessage || `Check out ${businessName}!`,
  type: 'link',
  linkPreviews: [{
    url: shareUrl,
    title: businessName,
    description: businessDescription,
    image: businessLogo,
    type: 'sync-storefront',
    metadata: {
      entityType: 'storefront',
      entityId: businessId,
      businessId: businessId,
      businessSlug: slug
    }
  }]
});
```

---

### AC-6: Copy Link Functionality
**Given** I click "Copy Link" in the share modal  
**When** the clipboard write succeeds  
**Then**:
1. The URL with UTM params is copied to clipboard
2. Toast notification: "Link copied to clipboard!"
3. Share event is tracked with method 'copy_link'

**URL Format:**
```
https://syncwarp.app/business/cafe-delight?utm_source=sync&utm_medium=share&utm_campaign=storefront_abc12345&utm_content=copy_link&ref=xxxxx
```

---

### AC-7: Social Media Share Buttons
**Given** I click a social media button (Facebook/Twitter/WhatsApp/Email)  
**When** the action completes  
**Then**:
1. The appropriate app/dialog opens with pre-filled content
2. Share event is tracked with the specific method

**Platform URLs:**

| Platform | Action |
|----------|--------|
| Facebook | `window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`, '_blank')` |
| Twitter | `window.open(`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`, '_blank')` |
| WhatsApp | `window.open(`https://api.whatsapp.com/send?text=${encodedMessage}`, '_blank')` |
| Email | `window.location.href = `mailto:?subject=${encodedSubject}&body=${encodedBody}`` |

---

### AC-8: Native Share Sheet (Mobile)
**Given** I am on a mobile device (iOS/Android app)  
**When** I click "More..." or the primary share button  
**Then** the native share sheet opens via `@capacitor/share`

```typescript
import { Share } from '@capacitor/share';

await Share.share({
  title: businessName,
  text: `Check out ${businessName} on SynC!`,
  url: shareUrl,
  dialogTitle: 'Share this business'
});
```

---

### AC-9: Share Data Preparation
**Given** I am sharing a storefront  
**When** the share data is prepared  
**Then** it includes:

| Field | Value |
|-------|-------|
| Title | Business name |
| Description | Business tagline OR first 100 chars of description |
| Image | Business logo URL |
| URL | `/business/${businessSlug}` |

**Component Props:**
```typescript
const shareData = {
  entityType: 'storefront' as const,
  entityId: business.id,
  title: business.name,
  description: business.tagline || business.description?.substring(0, 100) || `Check out ${business.name} on SynC!`,
  imageUrl: business.logo_url,
  url: `${window.location.origin}/business/${business.slug || business.id}`
};
```

---

### AC-10: StorefrontShareButton Component
**Given** the need for a reusable share button  
**When** this story is complete  
**Then** `src/components/sharing/StorefrontShareButton.tsx` exists:

```tsx
interface StorefrontShareButtonProps {
  businessId: string;
  businessName: string;
  businessDescription?: string;
  businessTagline?: string;
  businessLogo?: string;
  businessSlug: string;
  variant?: 'icon' | 'button' | 'menu-item';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showLabel?: boolean;
}

export function StorefrontShareButton({
  businessId,
  businessName,
  businessDescription,
  businessTagline,
  businessLogo,
  businessSlug,
  variant = 'icon',
  size = 'md',
  className,
  showLabel = false
}: StorefrontShareButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const shareData = useMemo(() => ({
    entityType: 'storefront' as const,
    entityId: businessId,
    title: businessName,
    description: businessTagline || businessDescription?.substring(0, 100) || `Check out ${businessName} on SynC!`,
    imageUrl: businessLogo,
    url: `${window.location.origin}/business/${businessSlug}`
  }), [businessId, businessName, businessDescription, businessTagline, businessLogo, businessSlug]);

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  if (variant === 'icon') {
    return (
      <>
        <button
          onClick={() => setIsModalOpen(true)}
          className={cn(
            'p-2 hover:bg-gray-100 rounded-full transition-colors',
            className
          )}
          title="Share this business"
          aria-label="Share this business"
        >
          <Share2 className={cn(iconSizes[size], 'text-gray-600')} />
        </button>
        <ShareModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          {...shareData}
        />
      </>
    );
  }

  // ... other variants
}
```

---

### AC-11: Full ShareModal Implementation
**Given** ShareModal is the core sharing component  
**When** this story is complete  
**Then** `src/components/sharing/ShareModal.tsx` has full implementation:

```tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import { 
  MessageCircle, Link, Mail, MoreHorizontal, X, Facebook, Twitter, 
  Loader2, Check, AlertCircle 
} from 'lucide-react';
import { useState } from 'react';
import { FaFacebook, FaTwitter, FaWhatsapp } from 'react-icons/fa';
import { useUnifiedShare, usePlatform } from '@/hooks';
import { toast } from 'sonner';
import { FriendPickerModal } from './FriendPickerModal';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: 'storefront' | 'product' | 'offer' | 'profile';
  entityId: string;
  title: string;
  description: string;
  imageUrl?: string;
  url: string;
}

export function ShareModal({
  isOpen,
  onClose,
  entityType,
  entityId,
  title,
  description,
  imageUrl,
  url
}: ShareModalProps) {
  const [showFriendPicker, setShowFriendPicker] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  
  const { 
    shareToChat, 
    shareClipboard, 
    shareToPlatform, 
    shareNative, 
    isNativeShareSupported 
  } = useUnifiedShare();
  const { isMobile } = usePlatform();
  
  const shareOptions = { entityType, entityId, entityData: { title, description, imageUrl, url } };
  
  const handleCopyLink = async () => {
    setIsSharing(true);
    setShareError(null);
    try {
      const result = await shareClipboard(shareOptions);
      if (result.success) {
        toast.success('Link copied to clipboard!');
        onClose();
      }
    } catch (error) {
      setShareError('Failed to copy link');
      toast.error('Failed to copy link');
    } finally {
      setIsSharing(false);
    }
  };
  
  const handleSocialShare = async (platform: 'facebook' | 'twitter' | 'whatsapp' | 'email') => {
    setIsSharing(true);
    setShareError(null);
    try {
      const result = await shareToPlatform(shareOptions, platform);
      if (result.success) {
        onClose();
      }
    } catch (error) {
      setShareError(`Failed to share to ${platform}`);
    } finally {
      setIsSharing(false);
    }
  };
  
  const handleNativeShare = async () => {
    setIsSharing(true);
    setShareError(null);
    try {
      const result = await shareNative(shareOptions);
      if (result.success) {
        onClose();
      }
    } catch (error) {
      setShareError('Share failed');
    } finally {
      setIsSharing(false);
    }
  };
  
  const handleChatShare = async (friendIds: string[], message?: string) => {
    setIsSharing(true);
    setShareError(null);
    try {
      const result = await shareToChat(shareOptions, friendIds, message);
      if (result.success) {
        toast.success(`Shared with ${friendIds.length} friend${friendIds.length > 1 ? 's' : ''}`);
        setShowFriendPicker(false);
        onClose();
      }
    } catch (error) {
      setShareError('Failed to share');
      toast.error('Failed to share');
    } finally {
      setIsSharing(false);
    }
  };
  
  return (
    <>
      <Dialog open={isOpen && !showFriendPicker} onOpenChange={onClose}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Share</DialogTitle>
          </DialogHeader>
          
          {/* Entity Preview */}
          <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
            {imageUrl ? (
              <img src={imageUrl} alt="" className="w-12 h-12 rounded-lg object-cover" />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-gray-200 flex items-center justify-center">
                <Share2 className="w-6 h-6 text-gray-400" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-gray-900 truncate">{title}</h4>
              <p className="text-sm text-gray-500 line-clamp-2">{description}</p>
            </div>
          </div>
          
          {/* Error Message */}
          {shareError && (
            <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-2 rounded">
              <AlertCircle className="w-4 h-4" />
              {shareError}
            </div>
          )}
          
          {/* Primary Actions */}
          <div className="space-y-2">
            <button
              onClick={() => setShowFriendPicker(true)}
              disabled={isSharing}
              className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50"
            >
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-blue-600" />
              </div>
              <span className="font-medium">Send to Friend</span>
            </button>
            
            <button
              onClick={handleCopyLink}
              disabled={isSharing}
              className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50"
            >
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                {isSharing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Link className="w-5 h-5 text-gray-600" />}
              </div>
              <span className="font-medium">Copy Link</span>
            </button>
          </div>
          
          {/* Divider */}
          <div className="border-t my-2" />
          
          {/* Social Share Buttons */}
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => handleSocialShare('facebook')}
              disabled={isSharing}
              className="w-12 h-12 rounded-full bg-[#1877F2] hover:bg-[#1877F2]/90 flex items-center justify-center disabled:opacity-50"
              title="Share on Facebook"
            >
              <FaFacebook className="w-6 h-6 text-white" />
            </button>
            
            <button
              onClick={() => handleSocialShare('twitter')}
              disabled={isSharing}
              className="w-12 h-12 rounded-full bg-black hover:bg-gray-800 flex items-center justify-center disabled:opacity-50"
              title="Share on X"
            >
              <FaTwitter className="w-6 h-6 text-white" />
            </button>
            
            <button
              onClick={() => handleSocialShare('whatsapp')}
              disabled={isSharing}
              className="w-12 h-12 rounded-full bg-[#25D366] hover:bg-[#25D366]/90 flex items-center justify-center disabled:opacity-50"
              title="Share on WhatsApp"
            >
              <FaWhatsapp className="w-6 h-6 text-white" />
            </button>
            
            <button
              onClick={() => handleSocialShare('email')}
              disabled={isSharing}
              className="w-12 h-12 rounded-full bg-gray-600 hover:bg-gray-700 flex items-center justify-center disabled:opacity-50"
              title="Share via Email"
            >
              <Mail className="w-6 h-6 text-white" />
            </button>
            
            {/* More button (mobile only) */}
            {isMobile && isNativeShareSupported && (
              <button
                onClick={handleNativeShare}
                disabled={isSharing}
                className="w-12 h-12 rounded-full bg-purple-600 hover:bg-purple-700 flex items-center justify-center disabled:opacity-50"
                title="More sharing options"
              >
                <MoreHorizontal className="w-6 h-6 text-white" />
              </button>
            )}
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Friend Picker Sub-Modal */}
      <FriendPickerModal
        isOpen={showFriendPicker}
        onClose={() => setShowFriendPicker(false)}
        onSend={handleChatShare}
        title={`Share "${title}"`}
        isLoading={isSharing}
      />
    </>
  );
}
```

---

### AC-12: Share Button Disabled States
**Given** share buttons can be disabled  
**When** certain conditions are met  
**Then** disable the button with appropriate visual feedback:

| Condition | Disabled | Visual Feedback |
|-----------|----------|-----------------|
| User not authenticated | For Chat share only | "Log in to share with friends" |
| No network (offline) | For Social shares | Tooltip: "You're offline" |
| Rate limited | All shares | Tooltip: "Wait X seconds" |
| Currently sharing | All buttons | Show spinner, disabled styling |
| Entity deleted/invalid | All shares | Hide share button entirely |

```tsx
interface ShareButtonDisabledState {
  disabled: boolean;
  reason?: string;
  tooltip?: string;
}

function getShareButtonState(
  user: User | null,
  isOnline: boolean,
  rateLimiter: ShareRateLimiter,
  entityValid: boolean
): ShareButtonDisabledState {
  if (!entityValid) {
    return { disabled: true, reason: 'invalid_entity' };
  }
  
  if (!isOnline) {
    return { 
      disabled: false, // Copy link still works offline
      tooltip: 'Some sharing options unavailable offline'
    };
  }
  
  const rateCheck = rateLimiter.canShare(user?.id, entityId);
  if (!rateCheck.allowed) {
    return { 
      disabled: true, 
      reason: 'rate_limited',
      tooltip: `Please wait ${Math.ceil(rateCheck.retryAfter!)}s`
    };
  }
  
  return { disabled: false };
}
```

---

### AC-13: Message Type Clarification
**Given** chat messages need correct typing  
**When** sending a share via chat  
**Then** the message type IS `'link'`:

```typescript
// In messagingService.sendMessage()
// The 'type' field for shared links:
const message = {
  conversation_id: conversationId,
  sender_id: user.id,
  content: customMessage || `Check out ${title}!`,
  type: 'link', // <-- THIS IS THE CORRECT TYPE
  status: 'sending',
  link_previews: [{
    url: shareUrl,
    title: title,
    description: description,
    image: imageUrl,
    type: `sync-${entityType}`, // e.g., 'sync-storefront'
    metadata: {
      entityType,
      entityId,
      // ... entity-specific fields
    }
  }]
};
```

---

### AC-14: Error States and Retry Logic
**Given** shares can fail  
**When** an error occurs  
**Then** show appropriate feedback and retry options:

```tsx
function ShareErrorBanner({ error, onRetry }: { error: ShareError; onRetry: () => void }) {
  const messages: Record<ShareError['type'], { message: string; canRetry: boolean }> = {
    network: { message: "You're offline. Check your connection.", canRetry: true },
    cancelled: { message: '', canRetry: false }, // Don't show for cancellations
    permission: { message: 'Permission denied. Check your browser settings.', canRetry: true },
    rate_limit: { message: 'Too many shares. Please wait a moment.', canRetry: false },
    database: { message: 'Failed to save. Please try again.', canRetry: true },
    unknown: { message: 'Something went wrong. Please try again.', canRetry: true }
  };
  
  const { message, canRetry } = messages[error.type];
  
  if (!message) return null;
  
  return (
    <div className="flex items-center justify-between bg-red-50 text-red-700 p-3 rounded-lg">
      <div className="flex items-center gap-2">
        <AlertCircle className="w-4 h-4" />
        <span className="text-sm">{message}</span>
      </div>
      {canRetry && (
        <button onClick={onRetry} className="text-sm font-medium underline">
          Retry
        </button>
      )}
    </div>
  );
}
```

---

## 📁 Files to Create/Modify

### New Files
| File | Purpose |
|------|---------|
| `src/components/sharing/ShareModal.tsx` | Main share modal component |
| `src/components/sharing/StorefrontShareButton.tsx` | Storefront-specific share button |
| `src/components/sharing/SocialShareButtons.tsx` | Social media button row |

### Modified Files
| File | Changes |
|------|---------|
| `src/components/business/BusinessProfile.tsx` | Add StorefrontShareButton to header |
| `src/components/sharing/FriendPickerModal.tsx` | Enhance for multi-select if needed |

---

## 🎨 UI Mockup Description

### Share Modal Layout
```
┌─────────────────────────────────────┐
│  Share [Business Name]        [X]  │
├─────────────────────────────────────┤
│  ┌─────────────────────────────┐    │
│  │ [Logo] Business Name        │    │
│  │ Tagline/Description...      │    │
│  └─────────────────────────────┘    │
├─────────────────────────────────────┤
│  [💬] Send to Friend                │
│  [🔗] Copy Link                     │
├─────────────────────────────────────┤
│  [FB] [TW] [WA] [📧] [...]          │
└─────────────────────────────────────┘
```

### Friend Picker Layout
```
┌─────────────────────────────────────┐
│  Send to Friends              [X]   │
├─────────────────────────────────────┤
│  [🔍 Search friends...]             │
├─────────────────────────────────────┤
│  [☐] [👤] John Doe                  │
│  [☑] [👤] Jane Smith                │
│  [☑] [👤] Bob Wilson                │
│  ...                                │
├─────────────────────────────────────┤
│  [Add a message (optional)...]      │
├─────────────────────────────────────┤
│  [Cancel]    [Send to 2 friends]    │
└─────────────────────────────────────┘
```

---

## 🧪 Testing Checklist

### Visual Tests
- [ ] Share button visible on Business Profile header (desktop)
- [ ] Share button visible on mobile action bar
- [ ] Share modal opens on click
- [ ] Friend picker opens when "Send to Friend" clicked
- [ ] Social buttons display correctly
- [ ] "More..." button only shows on mobile

### Functional Tests
- [ ] Share to chat sends message with preview
- [ ] Multi-friend selection works
- [ ] Copy link copies correct URL with UTM params
- [ ] Facebook share opens correct dialog
- [ ] Twitter share opens with correct text
- [ ] WhatsApp opens with pre-filled message
- [ ] Email opens with subject and body
- [ ] Native share sheet opens on mobile
- [ ] Share events tracked in database

### Edge Cases
- [ ] Sharing with no friends available
- [ ] Business with no logo
- [ ] Very long business name/description
- [ ] Offline state handling
- [ ] Share cancel tracking (or not)

---

## ✅ Definition of Done

- [ ] StorefrontShareButton component created
- [ ] ShareModal component created
- [ ] FriendPickerModal enhanced for multi-select
- [ ] Share button integrated into BusinessProfile header
- [ ] All 4 social platforms working
- [ ] In-app chat sharing working
- [ ] Copy link working
- [ ] Native share working on mobile
- [ ] All share events tracked
- [ ] Unit tests written
- [ ] Integration tests passing
- [ ] Manual testing completed
- [ ] Code reviewed and merged

---

## 📝 Notes

- Consider adding recently shared friends at the top of the picker
- Mobile share sheet appearance varies by OS
- Track share modal opens (not just completions) for funnel analytics
- The Share button should not show for the business owner (they have other tools)
