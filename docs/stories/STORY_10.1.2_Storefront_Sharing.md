# Story 10.1.2: Storefront Sharing

**Epic:** [Epic 10.1: Unified Sharing Ecosystem](../epics/EPIC_10.1_Unified_Sharing_Ecosystem.md)  
**Status:** 🔴 NOT STARTED  
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
