# Story 10.1.4: Offer Sharing

**Epic:** [Epic 10.1: Unified Sharing Ecosystem](../epics/EPIC_10.1_Unified_Sharing_Ecosystem.md)  
**Status:** COMPLETE  
**Priority:** 🔴 Critical  
**Effort:** 2 days  
**Dependencies:** Story 10.1.1 (Share Infrastructure)

---

## 📋 Overview

Implement comprehensive share functionality for Offers (Deals/Coupons), enabling users to share offers from both Offer Cards and Offer Details views via in-app chat, external apps, and social media.

---

## 🎯 Acceptance Criteria

### AC-1: Share Button on Offer Card
**Given** I am viewing an Offer Card (in Offers tab, feed, or favorites)  
**When** I look at the card  
**Then** I see a Share icon button  
**And** it does not conflict with existing Favorite button

**Location:** `src/components/business/FeaturedOffers.tsx` or `OfferCard.tsx`

**UI Specification:**
```tsx
// In the offer card (alongside favorite button)
<div className="flex items-center gap-1">
  <FavoriteOfferButton offerId={offer.id} iconOnly />
  <button
    onClick={(e) => {
      e.stopPropagation();
      setShowShareModal(true);
    }}
    className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
    title="Share this offer"
  >
    <Share2 className="w-4 h-4 text-gray-600" />
  </button>
</div>
```

---

### AC-2: Share Button on Offer Details Modal
**Given** I am viewing an Offer's details (modal or expanded view)  
**When** I look at the action area  
**Then** I see a prominent Share button

**Location:** `src/components/offers/OfferModal.tsx` or within `FeaturedOffers.tsx`

---

### AC-3: Share Button in Favorites List
**Given** I am viewing my favorited offers  
**When** I look at an offer in the list  
**Then** I can share it without opening the details

**Location:** `src/components/favorites/FavoriteOfferCard.tsx`

---

### AC-4: Share Data Preparation
**Given** I am sharing an offer  
**When** the share data is prepared  
**Then** it includes:

| Field | Value |
|-------|-------|
| Title | Offer title |
| Description | `${discountValue}% off at ${businessName} - Expires in ${daysRemaining} days` |
| Image | Offer image OR business logo |
| URL | `/offer/${offerId}` or `/business/${slug}/offer/${offerId}` |

**Share Text Examples:**
```
20% Off All Coffee - Cafe Delight
Save 20% on your next purchase! Expires in 5 days.
https://syncwarp.app/business/cafe-delight/offer/abc123?ref=xxx
```

---

### AC-5: Expiration in Share Text
**Given** offers have expiration dates  
**When** preparing share text  
**Then** calculate and display days remaining:

```typescript
function getDaysRemaining(validUntil: string): number {
  const now = new Date();
  const expiry = new Date(validUntil);
  const diffTime = expiry.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

// Usage in share text:
const daysRemaining = getDaysRemaining(offer.valid_until);
const expiryText = daysRemaining === 0 
  ? 'Expires today!' 
  : daysRemaining === 1 
    ? 'Expires tomorrow!' 
    : `Expires in ${daysRemaining} days`;
```

---

### AC-6: Share to Chat Flow
**Given** I select friends and send  
**When** the message is sent  
**Then** the chat message contains a `sync-offer` link preview with:
- Offer image (or Gift icon)
- Offer title
- Discount badge (e.g., "25% OFF")
- Expiration info
- Business name
- Orange/red urgency gradient

**Message Structure:**
```typescript
await messagingService.sendMessage({
  conversationId: conversationId,
  content: customMessage || `Check out this deal at ${businessName}!`,
  type: 'link',
  linkPreviews: [{
    url: shareUrl,
    title: offer.title,
    description: offer.description,
    image: offer.image_url || businessLogo,
    type: 'sync-offer',
    metadata: {
      entityType: 'offer',
      entityId: offer.id,
      offerId: offer.id,
      discountValue: offer.discount_value,
      discountType: offer.discount_type,
      validUntil: offer.valid_until,
      businessId: offer.business_id,
      businessName: businessName
    }
  }]
});
```

---

### AC-7: OfferShareButton Component
**Given** the need for a reusable share button  
**When** this story is complete  
**Then** `src/components/sharing/OfferShareButton.tsx` exists:

```tsx
interface OfferShareButtonProps {
  offerId: string;
  offerTitle: string;
  offerDescription?: string;
  discountValue?: number;
  discountType?: 'percentage' | 'fixed' | 'bogo';
  validUntil: string;
  offerImage?: string;
  businessId: string;
  businessName: string;
  businessSlug?: string;
  variant?: 'icon' | 'button';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function OfferShareButton({
  offerId,
  offerTitle,
  offerDescription,
  discountValue,
  discountType,
  validUntil,
  offerImage,
  businessId,
  businessName,
  businessSlug,
  variant = 'icon',
  size = 'md',
  className
}: OfferShareButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const daysRemaining = useMemo(() => getDaysRemaining(validUntil), [validUntil]);
  
  const discountText = useMemo(() => {
    if (!discountValue) return '';
    if (discountType === 'percentage') return `${discountValue}% off`;
    if (discountType === 'fixed') return `$${discountValue} off`;
    if (discountType === 'bogo') return 'Buy One Get One';
    return `${discountValue}% off`;
  }, [discountValue, discountType]);

  const shareData = useMemo(() => ({
    entityType: 'offer' as const,
    entityId: offerId,
    title: offerTitle,
    description: `${discountText} at ${businessName} - ${daysRemaining === 0 ? 'Expires today!' : `Expires in ${daysRemaining} days`}`,
    imageUrl: offerImage,
    url: `${window.location.origin}/business/${businessSlug || businessId}/offer/${offerId}`
  }), [offerId, offerTitle, discountText, businessName, daysRemaining, offerImage, businessSlug, businessId]);

  // ... render implementation
}
```

---

### AC-8: Expired Offers Handling
**Given** an offer may be expired  
**When** trying to share  
**Then**:
- If expired within last 24 hours: Allow sharing with "Expired" label
- If expired more than 24 hours: Disable share button or show message

```tsx
const isExpired = new Date(validUntil) < new Date();
const isRecentlyExpired = isExpired && getDaysRemaining(validUntil) >= -1;

if (isExpired && !isRecentlyExpired) {
  return (
    <button disabled className="opacity-50 cursor-not-allowed" title="This offer has expired">
      <Share2 className="w-4 h-4" />
    </button>
  );
}
```

---

### AC-9: Discount Type Display
**Given** offers have different discount types  
**When** displaying in share text  
**Then** format appropriately:

| Discount Type | Display |
|---------------|---------|
| `percentage` | "25% OFF" |
| `fixed` | "$10 OFF" |
| `bogo` | "Buy One Get One" |
| (no value) | Just show title |

---

### AC-10: Existing ShareDeal Integration
**Given** there may be existing ShareDeal components from Story 5.3/9.7  
**When** implementing this story  
**Then**:
1. Audit existing components for reuse
2. Migrate to unified share service
3. Maintain backward compatibility
4. Deprecate old components after migration

**Files to audit:**
- `src/components/deals/ShareDeal.tsx`
- `src/components/sharing/ShareDealWithFriends.tsx`

---

## 📁 Files to Create/Modify

### New Files
| File | Purpose |
|------|---------|
| `src/components/sharing/OfferShareButton.tsx` | Offer-specific share button |

### Modified Files
| File | Changes |
|------|---------|
| `src/components/business/FeaturedOffers.tsx` | Add share button to offer cards |
| `src/components/favorites/FavoriteOfferCard.tsx` | Add share button |
| `src/components/offers/OfferModal.tsx` | Add share button (if exists) |

---

## 🎨 UI Mockup Description

### Offer Card with Share Button
```
┌─────────────────────────────────────┐
│  [25% OFF Badge]                    │
│                                     │
│  Offer Title                        │
│  Description...                     │
│                                     │
│  Exp in 5 days    [❤️] [↗️]         │ <- Share button
│                   Business Name     │
└─────────────────────────────────────┘
```

### Share Modal with Offer Preview
```
┌─────────────────────────────────────┐
│  Share Offer                  [X]   │
├─────────────────────────────────────┤
│  ┌──────┐                           │
│  │[🎁]  │ Offer Title               │
│  │ 25%  │ Expires in 5 days         │
│  │ OFF  │ at Business Name          │
│  └──────┘                           │
├─────────────────────────────────────┤
│  [💬] Send to Friend                │
│  [🔗] Copy Link                     │
├─────────────────────────────────────┤
│  [FB] [TW] [WA] [📧] [...]          │
└─────────────────────────────────────┘
```

---

## 🧪 Testing Checklist

### Visual Tests
- [ ] Share button visible on Offer Cards
- [ ] Share button visible on Offer Details modal
- [ ] Share button visible in Favorites list
- [ ] Offer preview shows discount badge
- [ ] Expiration displayed correctly

### Functional Tests
- [ ] Share to chat sends offer preview
- [ ] Copy link contains offer URL
- [ ] Social shares include discount in text
- [ ] Expiration calculated correctly
- [ ] Native share works on mobile

### Edge Cases
- [ ] Offer with no image
- [ ] Offer with no discount value (generic offer)
- [ ] Expired offer (within 24h)
- [ ] Expired offer (more than 24h)
- [ ] BOGO discount type
- [ ] Fixed amount discount
- [ ] Very long offer title/description

---

## ✅ Definition of Done

- [ ] OfferShareButton component created
- [ ] Share button integrated into offer cards
- [ ] Share button integrated into offer details
- [ ] Share button in favorites list
- [ ] Discount formatting working
- [ ] Expiration handling working
- [ ] Existing ShareDeal components audited
- [ ] All share methods working
- [ ] All tests passing
- [ ] Code reviewed and merged

---

## 📝 Notes

- High urgency styling for offers expiring soon (< 2 days)
- Consider "Last chance!" badge for expiring offers
- Existing Story 5.3 and 9.7 components should be migrated to use unified service
- Track which offers get shared most for analytics
- Sharing an offer from the main feed vs from business page should both work
