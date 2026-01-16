# Epic 10.1: Unified Sharing Ecosystem

**Status:** 🟡 IN PROGRESS (7/10 stories complete)
**Priority:** 🔴 Critical  
**Effort Estimate:** 15-20 days  
**Dependencies:**  
- Epic 8.x (Messaging) - Chat infrastructure
- Epic 9.x (Friends) - Friend picker, friend list
- Epic 4 (Business Features) - Storefront, Products, Offers

**Consolidates/Supersedes:**
- **Story 4.9**: Social Sharing Actions (StorefrontShareButton, ProductShareButton, Web Share API)
- **Story 5.3**: Coupon Sharing System (ShareDeal component, friend picker)
- **Epic 8.3.3-8.3.5**: Mobile Native Sharing (@capacitor/share integration)
- **Epic 8.10**: Conversation Management (Forward Messages feature)

**Native Mobile Plugin:**
- `@capacitor/share` - For iOS/Android native share sheet integration
- Falls back to Web Share API on supported browsers
- Falls back to clipboard copy on unsupported browsers

---

## 🔗 Social Share Button URL Specifications

| Platform | URL Format | Notes |
|----------|------------|-------|
| **Facebook** | `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}` | Opens share dialog |
| **Twitter/X** | `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}` | Opens tweet composer |
| **WhatsApp** | `https://api.whatsapp.com/send?text=${encodeURIComponent(message + ' ' + url)}` | Opens WA with pre-filled message |
| **Email** | `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body + '\n\n' + url)}` | Opens email client |
| **LinkedIn** | `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}` | Optional, for business sharing |

> **Note on Instagram:** Instagram does not support URL-based sharing like Facebook/Twitter. Users can share to Instagram via the "More..." option which triggers the native share sheet, allowing them to select Instagram Stories or Direct Messages.

---

## 📋 Executive Summary

This epic creates a **unified, comprehensive sharing system** that enables users to share Storefronts, Products, Offers, and User Profiles across multiple channels. It includes in-app chat sharing, external sharing via native share sheets, social media buttons, and rich link previews with inline action buttons.

### Key Deliverables
1. **Share UI Components** for all entity types
2. **In-App Chat Sharing** with friend picker
3. **External Sharing** via Web Share API / Native Share Sheet
4. **Rich Link Previews** with inline Favorite/Follow buttons
5. **Multi-Friend Forwarding** in chat
6. **Share Analytics** with UTM tracking
7. **Business Owner Dashboard** for share metrics

---

## 🎯 Success Criteria

| Metric | Target |
|--------|--------|
| Share Button Visibility | 100% of Storefronts, Products, Offers, User Profiles have Share button |
| In-Chat Share Rate | >25% of shares go via in-app chat |
| External Share Rate | >50% of shares use native share sheet |
| Inline Action CTR | >15% click Favorite/Follow from chat preview |
| Forward Success Rate | >95% of forwards complete successfully |
| Analytics Accuracy | 100% of shares tracked with method |

---

## 📦 Shareable Entity Matrix

| Entity | Share Button Location | In-App Chat | External Share | Link Preview Type | In-Chat Actions |
|--------|----------------------|-------------|----------------|-------------------|-----------------|
| **Storefront** | Business Profile Header | ✅ | ✅ | `sync-storefront` | Follow Button |
| **Product** | Product Card + Details | ✅ | ✅ | `sync-product` | Favorite Button |
| **Offer** | Offer Card + Details | ✅ | ✅ | `sync-offer` | Favorite Button |
| **User Profile** | Profile Header/Card | ✅ | ✅ | `sync-profile` | Add Friend Button |

---

## 🗂️ Stories Overview

| Story | Title | Priority | Effort | Dependencies |
|-------|-------|----------|--------|--------------|
| 10.1.1 | Share Infrastructure & Service Layer | ✅ COMPLETE | 3 days | - |
| 10.1.2 | Storefront Sharing | ✅ COMPLETE | 2 days | 10.1.1 |
| 10.1.3 | Product Sharing | ✅ COMPLETE | 2 days | 10.1.1 |
| 10.1.4 | Offer Sharing | ✅ COMPLETE | 2 days | 10.1.1 |
| 10.1.5 | User Profile Sharing | ✅ COMPLETE | 1 day | 10.1.1 |
| 10.1.6 | Rich Link Previews in Chat | ✅ COMPLETE | 3 days | 10.1.1-5 |
| 10.1.7 | In-Chat Action Buttons | ✅ COMPLETE | 2 days | 10.1.6 |
| 10.1.8 | Multi-Friend Chat Forwarding | 🟡 Medium | 2 days | 10.1.6 |
| 10.1.9 | Share Analytics & Tracking | 🟡 Medium | 2 days | 10.1.1-5 |
| 10.1.10 | Business Owner Share Dashboard | 🟢 Low | 1 day | 10.1.9 |

**Total Effort:** ~20 days

---

## 📖 Detailed Story Specifications

---

### STORY 10.1.1: Share Infrastructure & Service Layer
**Priority:** 🔴 Critical  
**Effort:** 3 days  
**Dependencies:** None

#### Description
Create the foundational sharing infrastructure including the unified share service, database schema for tracking, UTM parameter generation, and platform detection.

#### Acceptance Criteria

##### Database Schema
- [ ] Create `share_events` table with columns:
  - `id` (UUID, primary key)
  - `user_id` (UUID, nullable for anonymous shares)
  - `entity_type` (ENUM: 'storefront', 'product', 'offer', 'profile')
  - `entity_id` (UUID)
  - `share_method` (ENUM: 'chat', 'native_share', 'copy_link', 'facebook', 'twitter', 'whatsapp', 'email')
  - `recipient_user_id` (UUID, nullable - for in-app chat shares)
  - `utm_source`, `utm_medium`, `utm_campaign` (TEXT)
  - `shared_url` (TEXT)
  - `created_at` (TIMESTAMPTZ)
- [ ] Create `share_clicks` table:
  - `id` (UUID)
  - `share_event_id` (UUID, FK)
  - `clicked_at` (TIMESTAMPTZ)
  - `ip_hash` (TEXT, for deduplication)
  - `user_agent` (TEXT)
- [ ] Create `share_conversions` table:
  - `id` (UUID)
  - `share_event_id` (UUID, FK)
  - `conversion_type` (ENUM: 'favorite', 'follow', 'purchase', 'signup')
  - `converted_user_id` (UUID)
  - `converted_at` (TIMESTAMPTZ)
- [ ] RLS policies for all tables

##### Unified Share Service
- [ ] Create `src/services/unifiedShareService.ts`:
  ```typescript
  interface ShareOptions {
    entityType: 'storefront' | 'product' | 'offer' | 'profile';
    entityId: string;
    entityData: {
      title: string;
      description: string;
      imageUrl?: string;
      url: string;
    };
  }

  interface ShareResult {
    success: boolean;
    method: ShareMethod;
    shareEventId?: string;
  }

  class UnifiedShareService {
    // Generate share URL with UTM params
    generateShareUrl(options: ShareOptions): string;
    
    // Track share event
    trackShare(options: ShareOptions, method: ShareMethod): Promise<string>;
    
    // Track click on shared link
    trackClick(shareEventId: string): Promise<void>;
    
    // Track conversion (favorite, follow, etc.)
    trackConversion(shareEventId: string, type: string, userId: string): Promise<void>;
    
    // Share via native share sheet (mobile)
    shareNative(options: ShareOptions): Promise<ShareResult>;
    
    // Share via clipboard
    shareClipboard(options: ShareOptions): Promise<ShareResult>;
    
    // Share to specific platform
    shareToPlatform(options: ShareOptions, platform: 'facebook' | 'twitter' | 'whatsapp' | 'email'): Promise<ShareResult>;
    
    // Share via in-app chat
    shareToChat(options: ShareOptions, friendIds: string[]): Promise<ShareResult>;
    
    // Check if native share is available
    isNativeShareSupported(): boolean;
    
    // Get share statistics for entity
    getShareStats(entityType: string, entityId: string): Promise<ShareStats>;
  }
  ```

##### UTM Parameter Generation
- [ ] Generate unique UTM params for each share:
  - `utm_source=sync`
  - `utm_medium=share`
  - `utm_campaign=${entityType}_${entityId.substring(0,8)}`
  - `utm_content=${shareMethod}`
  - `ref=${shareEventId}` (for tracking)

##### Platform Detection
- [ ] Create `usePlatform` hook:
  - Detect iOS, Android, Desktop
  - Return `isNativeShareSupported`, `platform`

##### Share URL Resolver
- [ ] Create Edge Function or API route to resolve `ref` param and track clicks
- [ ] Redirect to actual entity page after tracking

#### Technical Notes
```sql
-- share_events table
CREATE TABLE share_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('storefront', 'product', 'offer', 'profile')),
  entity_id UUID NOT NULL,
  share_method TEXT NOT NULL CHECK (share_method IN ('chat', 'native_share', 'copy_link', 'facebook', 'twitter', 'whatsapp', 'email')),
  recipient_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  shared_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_share_events_entity ON share_events(entity_type, entity_id);
CREATE INDEX idx_share_events_user ON share_events(user_id);
CREATE INDEX idx_share_events_created ON share_events(created_at);

-- RLS
ALTER TABLE share_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own shares"
  ON share_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone can create shares"
  ON share_events FOR INSERT
  WITH CHECK (true);

-- Business owners can view shares of their entities
CREATE POLICY "Business owners can view entity shares"
  ON share_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.owner_id = auth.uid()
      AND (
        (entity_type = 'storefront' AND entity_id = b.id) OR
        (entity_type = 'product' AND entity_id IN (SELECT id FROM products WHERE business_id = b.id)) OR
        (entity_type = 'offer' AND entity_id IN (SELECT id FROM offers WHERE business_id = b.id))
      )
    )
  );
```

#### Testing Checklist
- [ ] Unit tests for UTM generation
- [ ] Unit tests for share URL generation
- [ ] Integration test for tracking share event
- [ ] Integration test for tracking click
- [ ] Integration test for tracking conversion
- [ ] E2E test for native share on mobile
- [ ] E2E test for clipboard fallback on desktop

---

### STORY 10.1.2: Storefront Sharing
**Priority:** 🔴 Critical  
**Effort:** 2 days  
**Dependencies:** 10.1.1

#### Description
Implement share functionality for Business Storefronts (Business Profile pages).

#### Acceptance Criteria

##### Share Button Placement
- [ ] Share button in Business Profile header (desktop)
- [ ] Share button in mobile action bar
- [ ] Share button in storefront card (if displayed in lists)

##### Share Modal/Sheet
- [ ] On click, show share options:
  - **In-App Chat** (opens friend picker)
  - **Copy Link** (copies to clipboard)
  - **Facebook** (opens FB share dialog)
  - **Twitter/X** (opens Twitter share)
  - **WhatsApp** (opens WA with pre-filled message)
  - **Email** (opens mailto: link)
  - **More...** (triggers native share sheet on mobile)

##### Friend Picker for Chat Sharing
- [ ] Reuse/extend `FriendPickerModal` from Epic 9.7
- [ ] Multi-select friends
- [ ] Optional message input
- [ ] Show confirmation after sending
- [ ] Send message with `sync-storefront` link preview

##### Share Data
- [ ] Title: Business name
- [ ] Description: Business tagline or first 100 chars of description
- [ ] Image: Business logo
- [ ] URL: `${APP_URL}/business/${businessSlug}?ref=${shareEventId}`

##### UI Component
```typescript
// src/components/Sharing/StorefrontShareButton.tsx
interface StorefrontShareButtonProps {
  businessId: string;
  businessName: string;
  businessDescription?: string;
  businessLogo?: string;
  businessSlug: string;
  variant?: 'icon' | 'button' | 'dropdown';
  className?: string;
}

export function StorefrontShareButton({
  businessId,
  businessName,
  businessDescription,
  businessLogo,
  businessSlug,
  variant = 'icon',
  className
}: StorefrontShareButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showFriendPicker, setShowFriendPicker] = useState(false);
  const { shareNative, shareClipboard, shareToPlatform, shareToChat, isNativeShareSupported } = useUnifiedShare();
  
  const shareData = {
    entityType: 'storefront' as const,
    entityId: businessId,
    entityData: {
      title: businessName,
      description: businessDescription || `Check out ${businessName} on SynC!`,
      imageUrl: businessLogo,
      url: `${window.location.origin}/business/${businessSlug}`
    }
  };

  const handleShareToChat = async (friendIds: string[], message?: string) => {
    await shareToChat(shareData, friendIds, message);
    toast.success(`Shared with ${friendIds.length} friend${friendIds.length > 1 ? 's' : ''}`);
    setShowFriendPicker(false);
  };

  // ... render share menu/sheet
}
```

#### Integration Points
- [ ] `BusinessProfile.tsx` - Add to header
- [ ] `BusinessCard.tsx` - Add to card actions (if exists)
- [ ] Mobile business profile view

#### Testing Checklist
- [ ] Share button visible on all business profiles
- [ ] Share to chat sends correct link preview
- [ ] Copy link copies correct URL with UTM
- [ ] Social share buttons open correct dialogs
- [ ] Native share sheet works on mobile
- [ ] Share event tracked in database
- [ ] Multi-friend chat share works

---

### STORY 10.1.3: Product Sharing
**Priority:** 🔴 Critical  
**Effort:** 2 days  
**Dependencies:** 10.1.1

#### Description
Implement share functionality for individual Products.

#### Acceptance Criteria

##### Share Button Placement
- [ ] Share button on Product Card (icon in action row)
- [ ] Share button on Product Details page (in header)
- [ ] Share button in Product modal/drawer

##### Share Modal/Sheet
- [ ] Same options as Storefront (Chat, Copy, Social, Native)

##### Share Data
- [ ] Title: Product name
- [ ] Description: `${productName} at ${businessName} - ${formattedPrice}`
- [ ] Image: First product image
- [ ] URL: `${APP_URL}/business/${businessSlug}/product/${productId}?ref=${shareEventId}`

##### UI Component
```typescript
// src/components/Sharing/ProductShareButton.tsx
interface ProductShareButtonProps {
  productId: string;
  productName: string;
  productPrice: number;
  productCurrency: string;
  productImage?: string;
  businessId: string;
  businessName: string;
  businessSlug: string;
  variant?: 'icon' | 'button';
  className?: string;
}
```

#### Integration Points
- [ ] `ProductCard.tsx` - Add share icon to actions
- [ ] `ProductDetails.tsx` - Add share button to header
- [ ] `ProductView.tsx` / modal variant

#### Testing Checklist
- [ ] Share button visible on all product cards
- [ ] Share button visible on product details
- [ ] Share to chat sends correct link preview
- [ ] Copy link includes product URL with UTM
- [ ] Share event tracked with product entity type

---

### [x] STORY 10.1.4: Offer Sharing COMPLETE
**Priority:** 🔴 Critical  
**Effort:** 2 days  
**Dependencies:** 10.1.1

#### Description
Implement share functionality for Offers (Deals/Coupons).

#### Acceptance Criteria

##### Share Button Placement
- [ ] Share button on Offer Card (icon)
- [ ] Share button on Offer Details modal
- [ ] Share button in Favorites list (for saved offers)

##### Share Modal/Sheet
- [ ] Same options as Storefront/Product

##### Share Data
- [ ] Title: Offer title
- [ ] Description: `${discount}% off at ${businessName} - Expires in ${daysRemaining} days`
- [ ] Image: Offer image or business logo
- [ ] URL: `${APP_URL}/offer/${offerId}?ref=${shareEventId}` (or `/business/${slug}/offer/${offerId}`)

##### UI Component
```typescript
// src/components/Sharing/OfferShareButton.tsx
interface OfferShareButtonProps {
  offerId: string;
  offerTitle: string;
  offerDescription?: string;
  discountValue?: number;
  validUntil: string;
  offerImage?: string;
  businessId: string;
  businessName: string;
  variant?: 'icon' | 'button';
  className?: string;
}
```

#### Integration Points
- [ ] `OfferCard.tsx` - Add share icon
- [ ] `FeaturedOffers.tsx` - Ensure share works in detail view
- [ ] `FavoriteOfferCard.tsx` - Add share option

#### Testing Checklist
- [ ] Share button visible on offer cards
- [ ] Share to chat sends correct offer preview
- [ ] Expiration date included in share text
- [ ] Share event tracked

---

### [x] STORY 10.1.5: User Profile Sharing COMPLETE
**Priority:** ✅ COMPLETE  
**Effort:** 1 day  
**Dependencies:** 10.1.1

#### Description
Implement share functionality for User Profiles.

#### Acceptance Criteria

##### Share Button Placement
- [ ] Share button on User Profile page (own profile)
- [ ] Share button on Friend Profile modal
- [ ] "Share Profile" option in profile settings

##### Share Data
- [ ] Title: User's full name
- [ ] Description: `${fullName} is on SynC - Connect with them!`
- [ ] Image: User's avatar
- [ ] URL: `${APP_URL}/profile/${userId}?ref=${shareEventId}`

##### Privacy Consideration
- [ ] Only share if user allows profile sharing (check privacy settings)
- [ ] Show "Private Profile" message if sharing disabled

#### Integration Points
- [ ] User Profile page
- [ ] Friend Profile modal
- [ ] Profile settings

#### Testing Checklist
- [ ] Share own profile works
- [ ] Share friend profile works
- [ ] Private profiles cannot be shared externally
- [ ] In-app chat share of private profile shows limited preview

---

### STORY 10.1.6: Rich Link Previews in Chat
**Priority:** 🔴 Critical  
**Effort:** 3 days  
**Dependencies:** 10.1.1-5

#### Description
Enhance chat link previews to show rich, branded preview cards for all shareable entities.

#### Acceptance Criteria

##### New Preview Types
- [ ] `sync-storefront` preview type:
  - Business logo (40x40)
  - Business name (bold)
  - Tagline/description (2 lines max)
  - "Visit Storefront" CTA
  - Purple/blue gradient background
- [ ] `sync-product` preview type:
  - Product image (square, 60x60)
  - Product name (bold)
  - Price (highlighted)
  - Business name (muted)
  - Green accent for products
- [ ] `sync-offer` preview type:
  - Offer image or Gift icon
  - Offer title (bold)
  - Discount badge (e.g., "25% OFF")
  - Expiration (e.g., "Exp in 5 days")
  - Business name
  - Orange/red gradient for urgency
- [ ] `sync-profile` preview type:
  - User avatar (circular, 48x48)
  - Full name (bold)
  - "View Profile" CTA
  - Neutral gray background

##### Link Preview Service Enhancement
- [ ] Update `linkPreviewService.ts`:
  ```typescript
  // Add new preview generators
  private async fetchSyncStorefrontPreview(businessId: string): Promise<LinkPreview | null>;
  private async fetchSyncProductPreview(productId: string): Promise<LinkPreview | null>;
  private async fetchSyncProfilePreview(userId: string): Promise<LinkPreview | null>;
  
  // Update URL detection
  private detectSyncUrlType(url: string): 'storefront' | 'product' | 'offer' | 'profile' | null;
  ```

##### LinkPreviewCard Enhancement
- [ ] Update `LinkPreviewCard.tsx` to render all 4 types
- [ ] Add click handler to navigate to entity
- [ ] Pass entity data to parent for action buttons (next story)

##### Database Fetch for Previews
- [ ] Storefront: Fetch from `businesses` table
- [ ] Product: Fetch from `products` table with business info
- [ ] Offer: Fetch from `offers` table with business info
- [ ] Profile: Fetch from `profiles` table (respecting privacy)

#### Technical Notes
```typescript
// Updated LinkPreview interface
interface LinkPreview {
  url: string;
  title: string;
  description: string;
  image?: string;
  favicon?: string;
  type: 'generic' | 'sync-coupon' | 'sync-deal' | 'sync-storefront' | 'sync-product' | 'sync-offer' | 'sync-profile' | 'coupon_shared' | 'coupon_share_failed';
  metadata?: {
    // Storefront
    businessId?: string;
    businessSlug?: string;
    
    // Product
    productId?: string;
    price?: number;
    currency?: string;
    businessName?: string;
    
    // Offer
    offerId?: string;
    discountValue?: number;
    validUntil?: string;
    
    // Profile
    userId?: string;
    isPrivate?: boolean;
    
    // Common
    entityType?: 'storefront' | 'product' | 'offer' | 'profile';
    entityId?: string;
  };
}
```

#### Testing Checklist
- [ ] Storefront URL generates correct preview
- [ ] Product URL generates correct preview
- [ ] Offer URL generates correct preview
- [ ] Profile URL generates correct preview
- [ ] Private profile shows limited preview
- [ ] Click on preview navigates correctly
- [ ] Preview images load correctly

---

### STORY 10.1.7: In-Chat Action Buttons
**Priority:** 🔴 Critical  
**Effort:** 2 days  
**Dependencies:** 10.1.6

#### Description
Add inline action buttons (Favorite, Follow, Add Friend) to link preview cards in chat.

#### Acceptance Criteria

##### Action Buttons by Entity Type
| Preview Type | Actions |
|--------------|---------|
| `sync-storefront` | **Follow** button (subscribe to business updates) |
| `sync-product` | **Favorite** button (add to favorites) |
| `sync-offer` | **Favorite** button (add to favorites) |
| `sync-profile` | **Add Friend** button (send friend request) |

##### UI Requirements
- [ ] Buttons appear at bottom of preview card
- [ ] Toggle state (e.g., "Following" / "Follow")
- [ ] Loading state during API call
- [ ] Success toast on action completion
- [ ] Actions work **inline** (no navigation required)

##### Follow Business Implementation
- [ ] Create `business_follows` table (if not exists):
  ```sql
  CREATE TABLE business_follows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, business_id)
  );
  ```
- [ ] Create `useBusinessFollow` hook:
  ```typescript
  function useBusinessFollow(businessId: string) {
    const [isFollowing, setIsFollowing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    
    const toggleFollow = async () => { ... };
    
    return { isFollowing, isLoading, toggleFollow };
  }
  ```
- [ ] **IMPORTANT**: Remove any "Favorite Business" functionality if exists
- [ ] Follow = Subscribe to business updates (offers, products, announcements)

##### LinkPreviewCard Enhancement
```typescript
interface LinkPreviewCardProps {
  preview: LinkPreview;
  onRemove?: () => void;
  showRemoveButton?: boolean;
  showActions?: boolean; // NEW - show Favorite/Follow buttons
  currentUserId?: string; // NEW - for checking existing state
}

function LinkPreviewCard({ preview, showActions = false, currentUserId }: Props) {
  // ... existing code
  
  if (showActions && preview.metadata?.entityType) {
    return (
      <div className="...">
        {/* Preview content */}
        
        {/* Action buttons */}
        <div className="flex gap-2 mt-2 pt-2 border-t">
          {preview.metadata.entityType === 'storefront' && (
            <FollowBusinessButton businessId={preview.metadata.businessId!} />
          )}
          {preview.metadata.entityType === 'product' && (
            <FavoriteProductButton productId={preview.metadata.productId!} iconOnly />
          )}
          {preview.metadata.entityType === 'offer' && (
            <FavoriteOfferButton offerId={preview.metadata.offerId!} iconOnly />
          )}
          {preview.metadata.entityType === 'profile' && (
            <AddFriendButton userId={preview.metadata.userId!} compact />
          )}
        </div>
      </div>
    );
  }
  
  // ... existing return
}
```

##### Conversion Tracking
- [ ] When user clicks Favorite/Follow from chat preview:
  - Track conversion in `share_conversions` table
  - Link to original share event via `ref` param in URL

#### Testing Checklist
- [ ] Follow button appears on storefront previews
- [ ] Follow toggles correctly (Follow/Following)
- [ ] Favorite button appears on product previews
- [ ] Favorite button appears on offer previews
- [ ] Add Friend button appears on profile previews
- [ ] Actions work inline without navigation
- [ ] Conversion tracked in database
- [ ] Already-followed/favorited shows correct state

---

### STORY 10.1.8: Multi-Friend Chat Forwarding
**Priority:** 🟡 Medium  
**Effort:** 2 days  
**Dependencies:** 10.1.6

#### Description
Enhance chat forwarding to support multi-friend selection and all message types.

#### Acceptance Criteria

##### Forward Message Dialog Enhancement
- [ ] Multi-select friend picker (checkboxes)
- [ ] Search friends by name
- [ ] Show selected count: "Forward to 3 friends"
- [ ] Confirmation step showing recipients
- [ ] Progress indicator during send
- [ ] Success toast with friend count

##### Forwardable Message Types
- [ ] Text messages ✅
- [ ] Image messages ✅
- [ ] Video messages ✅
- [ ] Audio messages ✅
- [ ] File messages ✅
- [ ] Link preview messages (including all SynC entity types) ✅

##### Forward Behavior
- [ ] Create new message in each selected conversation
- [ ] Preserve original content
- [ ] Mark as `is_forwarded = true`
- [ ] Store `original_message_id`
- [ ] Show "Forwarded" label on forwarded messages

##### UI Component Update
```typescript
// src/components/messaging/ForwardMessageDialog.tsx
interface ForwardMessageDialogProps {
  message: Message;
  onClose: () => void;
  onForwarded: () => void;
}

function ForwardMessageDialog({ message, onClose, onForwarded }: Props) {
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isForwarding, setIsForwarding] = useState(false);
  const { friends } = useFriends();
  
  const filteredFriends = useMemo(() => 
    friends?.filter(f => 
      f.friend_profile.full_name.toLowerCase().includes(searchQuery.toLowerCase())
    ), [friends, searchQuery]
  );
  
  const handleForward = async () => {
    setIsForwarding(true);
    
    // Get or create conversations for each friend
    const conversationIds = await Promise.all(
      selectedFriendIds.map(friendId => 
        messagingService.getOrCreateConversation(friendId)
      )
    );
    
    // Forward message to all conversations
    await messagingService.forwardMessage(message.id, conversationIds);
    
    toast.success(`Forwarded to ${selectedFriendIds.length} friend${selectedFriendIds.length > 1 ? 's' : ''}`);
    setIsForwarding(false);
    onForwarded();
  };
  
  return (
    <Dialog>
      {/* Search input */}
      {/* Friend list with checkboxes */}
      {/* Selected count indicator */}
      {/* Forward button */}
    </Dialog>
  );
}
```

##### Messaging Service Enhancement
```typescript
// src/services/messagingService.ts

async forwardMessage(messageId: string, conversationIds: string[]): Promise<void> {
  const originalMessage = await this.getMessage(messageId);
  
  for (const conversationId of conversationIds) {
    await this.sendMessage({
      conversationId,
      content: originalMessage.content,
      type: originalMessage.type,
      mediaUrls: originalMessage.media_urls,
      linkPreviews: originalMessage.link_previews,
      isForwarded: true,
      originalMessageId: messageId
    });
  }
  
  // Increment forward count on original
  await this.incrementForwardCount(messageId);
}
```

#### Testing Checklist
- [ ] Single friend forward works
- [ ] Multi-friend forward (2+ friends) works
- [ ] All message types forward correctly
- [ ] Link previews preserved in forwarded messages
- [ ] "Forwarded" label appears on forwarded messages
- [ ] Forward count increments on original
- [ ] Search filters friends correctly
- [ ] Progress indicator shown during multi-forward

---

### STORY 10.1.9: Share Analytics & Tracking
**Priority:** 🟡 Medium  
**Effort:** 2 days  
**Dependencies:** 10.1.1-5

#### Description
Implement comprehensive share analytics with UTM tracking, click tracking, and conversion attribution.

#### Acceptance Criteria

##### UTM Parameter Generation
- [ ] All shared links include:
  - `utm_source=sync`
  - `utm_medium=share`
  - `utm_campaign=${entityType}`
  - `utm_content=${shareMethod}`
  - `ref=${shareEventId}` (unique tracking ID)

##### Click Tracking
- [ ] Create click tracking endpoint/Edge Function:
  ```typescript
  // /api/track/click?ref=xxx
  async function trackClick(shareEventId: string, request: Request) {
    const ipHash = hashIP(request.headers.get('x-forwarded-for'));
    const userAgent = request.headers.get('user-agent');
    
    // Deduplicate by IP hash within 24 hours
    const existing = await supabase
      .from('share_clicks')
      .select()
      .eq('share_event_id', shareEventId)
      .eq('ip_hash', ipHash)
      .gte('clicked_at', new Date(Date.now() - 24 * 60 * 60 * 1000));
    
    if (existing.data?.length === 0) {
      await supabase.from('share_clicks').insert({
        share_event_id: shareEventId,
        ip_hash: ipHash,
        user_agent: userAgent
      });
    }
    
    // Redirect to actual URL
    const shareEvent = await getShareEvent(shareEventId);
    return Response.redirect(shareEvent.actual_url);
  }
  ```

##### Conversion Tracking
- [ ] Track when recipient takes action after clicking shared link:
  - Favorited the product/offer
  - Followed the business
  - Signed up (new user)
  - Made purchase (future)
- [ ] Store in `share_conversions` table
- [ ] Link via `ref` param in session/localStorage

##### Analytics Queries
```sql
-- Get share statistics for an entity
CREATE OR REPLACE FUNCTION get_share_stats(
  p_entity_type TEXT,
  p_entity_id UUID
)
RETURNS TABLE(
  total_shares BIGINT,
  unique_sharers BIGINT,
  total_clicks BIGINT,
  total_conversions BIGINT,
  share_methods JSONB,
  daily_shares JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(se.id) as total_shares,
    COUNT(DISTINCT se.user_id) as unique_sharers,
    (SELECT COUNT(*) FROM share_clicks sc WHERE sc.share_event_id IN (SELECT id FROM share_events WHERE entity_type = p_entity_type AND entity_id = p_entity_id)) as total_clicks,
    (SELECT COUNT(*) FROM share_conversions scv WHERE scv.share_event_id IN (SELECT id FROM share_events WHERE entity_type = p_entity_type AND entity_id = p_entity_id)) as total_conversions,
    jsonb_object_agg(se.share_method, method_count) as share_methods,
    (SELECT jsonb_agg(jsonb_build_object('date', d, 'count', c)) FROM (
      SELECT DATE(created_at) as d, COUNT(*) as c
      FROM share_events
      WHERE entity_type = p_entity_type AND entity_id = p_entity_id
      GROUP BY DATE(created_at)
      ORDER BY d DESC
      LIMIT 30
    ) daily) as daily_shares
  FROM share_events se
  LEFT JOIN (
    SELECT share_method, COUNT(*) as method_count
    FROM share_events
    WHERE entity_type = p_entity_type AND entity_id = p_entity_id
    GROUP BY share_method
  ) methods ON true
  WHERE se.entity_type = p_entity_type AND se.entity_id = p_entity_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### Testing Checklist
- [ ] UTM params added to all share URLs
- [ ] Click tracking records clicks
- [ ] Click deduplication works (same IP within 24h)
- [ ] Conversion tracking records favorites/follows
- [ ] Analytics query returns correct stats
- [ ] Share method breakdown is accurate

---

### STORY 10.1.10: Business Owner Share Dashboard
**Priority:** 🟢 Low  
**Effort:** 1 day  
**Dependencies:** 10.1.9

#### Description
Create a share analytics dashboard for business owners to view share metrics for their storefronts, products, and offers.

#### Acceptance Criteria

##### Dashboard Location
- [ ] Add "Shares" tab to Business Dashboard (alongside Analytics, Products, Offers)
- [ ] Or add "Shares" section within existing Analytics tab

##### Dashboard Components
- [ ] **Summary Cards:**
  - Total Shares (all time)
  - Shares This Week
  - Shares This Month
  - Click-Through Rate (clicks/shares)
  - Conversion Rate (conversions/clicks)

- [ ] **Share Method Breakdown:**
  - Pie chart showing distribution (Chat, Copy, WhatsApp, etc.)
  
- [ ] **Top Shared Items:**
  - Table showing products/offers with most shares
  - Columns: Name, Type, Shares, Clicks, CTR

- [ ] **Share Trend:**
  - Line chart of daily shares (last 30 days)

- [ ] **Recent Shares:**
  - List of recent share events
  - Show: Entity name, Share method, Time, Clicks

##### UI Component
```typescript
// src/components/analytics/ShareAnalyticsDashboard.tsx
interface ShareAnalyticsDashboardProps {
  businessId: string;
}

function ShareAnalyticsDashboard({ businessId }: Props) {
  const { data: stats } = useShareAnalytics(businessId);
  
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard title="Total Shares" value={stats.totalShares} />
        <StatCard title="This Week" value={stats.sharesThisWeek} />
        <StatCard title="This Month" value={stats.sharesThisMonth} />
        <StatCard title="CTR" value={`${stats.ctr}%`} />
        <StatCard title="Conversion" value={`${stats.conversionRate}%`} />
      </div>
      
      {/* Share Method Distribution */}
      <Card>
        <CardHeader>Share Methods</CardHeader>
        <CardContent>
          <PieChart data={stats.methodBreakdown} />
        </CardContent>
      </Card>
      
      {/* Top Shared Items */}
      <Card>
        <CardHeader>Top Shared Items</CardHeader>
        <CardContent>
          <Table data={stats.topItems} />
        </CardContent>
      </Card>
      
      {/* Share Trend */}
      <Card>
        <CardHeader>Share Trend (30 days)</CardHeader>
        <CardContent>
          <LineChart data={stats.dailyShares} />
        </CardContent>
      </Card>
    </div>
  );
}
```

#### Testing Checklist
- [ ] Dashboard accessible to business owners only
- [ ] Stats update when shares occur
- [ ] Pie chart renders correctly
- [ ] Top items table sorts by shares
- [ ] Line chart shows 30-day trend
- [ ] CTR calculated correctly
- [ ] Conversion rate calculated correctly

---

## 🧪 Comprehensive Testing Plan

### Manual Testing Scenarios

#### TEST 1: Storefront Sharing (Story 10.1.2)
**Location:** `/business/[slug]`
**Precondition:** Logged in as any user

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1.1 | Navigate to any Business Profile | Page loads with business info |
| 1.2 | Locate Share button in header (top-right, near Favorite heart) | Share button (Share2 icon) is visible |
| 1.3 | Click Share button | Share modal/sheet opens with options |
| 1.4 | Verify "Share via Chat" option exists | "In-App Chat" or "Send to Friend" option visible |
| 1.5 | Click "Share via Chat" | Friend picker modal opens |
| 1.6 | Select 2+ friends | Checkboxes indicate selection |
| 1.7 | Optionally add message | Text input accepts message |
| 1.8 | Click "Send" | Toast: "Shared with X friends" |
| 1.9 | Go to Messages, open one recipient's chat | `sync-storefront` preview card visible |
| 1.10 | Verify preview shows business logo, name, description | Correct data displayed |
| 1.11 | Go back to Share modal, click "Copy Link" | Toast: "Link copied!" |
| 1.12 | Paste clipboard content | URL contains `?utm_source=sync&utm_medium=share&ref=xxx` |
| 1.13 | Click Facebook share button | FB share dialog opens with correct URL |
| 1.14 | Click WhatsApp button | WhatsApp opens with pre-filled message |
| 1.15 | (Mobile) Click "More..." | Native share sheet opens |

---

#### TEST 2: Product Sharing (Story 10.1.3)
**Location:** Business Profile → Products Tab → Product Card/Details
**Precondition:** Logged in as any user

| Step | Action | Expected Result |
|------|--------|-----------------|
| 2.1 | Navigate to Business Profile → Products Tab | Products list loads |
| 2.2 | Locate Share icon on a Product Card | Share icon visible in card actions |
| 2.3 | Click Share icon on card | Share modal opens |
| 2.4 | Click "Share via Chat", select friend, send | Message sent with `sync-product` preview |
| 2.5 | Click on Product to open Details page/modal | Product details open |
| 2.6 | Locate Share button in details header | Share button visible |
| 2.7 | Click Share → Copy Link | Toast: "Link copied!" |
| 2.8 | Paste and verify URL | Contains `/business/[slug]/product/[id]?ref=xxx` |
| 2.9 | Share data contains: product name, price, business name | Correct text in share preview |

---

#### TEST 3: Offer Sharing (Story 10.1.4)
**Location:** Business Profile → Offers Tab → Offer Card/Details
**Precondition:** Logged in as any user, business has active offers

| Step | Action | Expected Result |
|------|--------|-----------------|
| 3.1 | Navigate to Business Profile → Offers Tab | Offers list loads |
| 3.2 | Locate Share icon on an Offer Card | Share icon visible |
| 3.3 | Click Share icon | Share modal opens |
| 3.4 | Share via Chat to a friend | `sync-offer` preview sent |
| 3.5 | Click on Offer to open Details modal | Offer details modal opens |
| 3.6 | Locate Share button in modal | Share button visible |
| 3.7 | Click Share → Copy Link | Toast: "Link copied!" |
| 3.8 | Verify share text contains expiration | "Expires in X days" included |
| 3.9 | Verify share text contains discount | Discount value/percentage shown |

---

#### TEST 4: User Profile Sharing (Story 10.1.5)
**Location:** Own Profile / Friend's Profile
**Precondition:** Logged in, has at least one friend

| Step | Action | Expected Result |
|------|--------|-----------------|
| 4.1 | Go to own Profile page | Profile loads |
| 4.2 | Locate Share button | Share button visible |
| 4.3 | Share own profile via Chat | `sync-profile` preview sent |
| 4.4 | Open a Friend's profile modal | Profile modal opens |
| 4.5 | Share friend's profile | Share works if profile is public |
| 4.6 | Try to share a private profile externally | Error or limited preview shown |

---

#### TEST 5: In-Chat Favorite Button (Story 10.1.7)
**Location:** Messages → Conversation with shared links
**Precondition:** Received a shared Product or Offer link in chat

| Step | Action | Expected Result |
|------|--------|-----------------|
| 5.1 | Open conversation with a shared Product link | `sync-product` preview card visible |
| 5.2 | Locate Favorite (heart) button on preview card | Heart icon visible at bottom of card |
| 5.3 | Click Favorite button | Button toggles to filled heart |
| 5.4 | Verify no navigation occurs | Still in chat, no page change |
| 5.5 | Toast shows "Added to favorites" | Success feedback |
| 5.6 | Go to Favorites page | Product appears in favorites list |
| 5.7 | Repeat for shared Offer link | Same behavior for offers |

---

#### TEST 6: In-Chat Follow Button (Story 10.1.7)
**Location:** Messages → Conversation with shared Storefront link
**Precondition:** Received a shared Storefront link in chat

| Step | Action | Expected Result |
|------|--------|-----------------|
| 6.1 | Open conversation with a shared Storefront link | `sync-storefront` preview card visible |
| 6.2 | Locate Follow button on preview card | "Follow" button visible |
| 6.3 | Click Follow button | Button toggles to "Following" |
| 6.4 | Verify no navigation occurs | Still in chat |
| 6.5 | Toast shows "Now following [Business]" | Success feedback |
| 6.6 | Verify "Favorite Business" button does NOT exist | Only Follow, no Favorite for businesses |
| 6.7 | Go to a page showing followed businesses (if exists) | Business appears in list |

---

#### TEST 7: In-Chat Add Friend Button (Story 10.1.7)
**Location:** Messages → Conversation with shared Profile link
**Precondition:** Received a shared Profile link in chat (someone not yet a friend)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 7.1 | Open conversation with a shared Profile link | `sync-profile` preview card visible |
| 7.2 | Locate "Add Friend" button | Button visible |
| 7.3 | Click Add Friend | Friend request sent |
| 7.4 | Button changes to "Request Sent" or similar | State update shown |
| 7.5 | If already friends, button shows "Friends" | Correct state |

---

#### TEST 8: Multi-Friend Chat Forwarding (Story 10.1.8)
**Location:** Messages → Any Conversation
**Precondition:** Has messages to forward, has 3+ friends

| Step | Action | Expected Result |
|------|--------|-----------------|
| 8.1 | Open a conversation with messages | Messages visible |
| 8.2 | Right-click (Desktop) or long-press (Mobile) a text message | Context menu appears |
| 8.3 | Click "Forward" option | Forward dialog opens |
| 8.4 | Search for a friend by name | Search filters list |
| 8.5 | Select 3 friends via checkboxes | Selected count: "Forward to 3 friends" |
| 8.6 | Click "Forward" button | Progress indicator shows |
| 8.7 | Toast: "Forwarded to 3 friends" | Success message |
| 8.8 | Open one recipient's conversation | Forwarded message appears |
| 8.9 | Verify "Forwarded" label on message | Label visible |
| 8.10 | Repeat with Image message | Image forwards correctly |
| 8.11 | Repeat with Link preview message | Preview preserved in forward |

---

#### TEST 9: Native Share Sheet (Mobile Only)
**Location:** Any share button on iOS/Android app
**Precondition:** Testing on physical device or emulator

| Step | Action | Expected Result |
|------|--------|-----------------|
| 9.1 | Open Business Profile on mobile device | Profile loads |
| 9.2 | Click Share → "More..." | Native share sheet opens |
| 9.3 | Verify apps shown (WhatsApp, Messages, Mail, etc.) | System apps listed |
| 9.4 | Select an app and complete share | Share completes in external app |

---

#### TEST 10: Desktop Fallback Behavior
**Location:** Any share button on Desktop browser (Chrome Windows)
**Precondition:** Browser doesn't support Web Share API

| Step | Action | Expected Result |
|------|--------|-----------------|
| 10.1 | Click Share on Business Profile | Share modal opens |
| 10.2 | Verify "Copy Link" is prominent | Copy Link button visible |
| 10.3 | Click Copy Link | Toast: "Link copied to clipboard!" |
| 10.4 | Verify social buttons (Facebook, Twitter, WhatsApp) | Buttons open new tabs/dialogs |

---

#### TEST 11: Share Analytics Tracking (Story 10.1.9)
**Location:** Database / Business Owner Dashboard
**Precondition:** Have performed several shares in previous tests

| Step | Action | Expected Result |
|------|--------|-----------------|
| 11.1 | Query `share_events` table | Rows exist for all shares |
| 11.2 | Verify `entity_type`, `entity_id`, `share_method` populated | Correct values |
| 11.3 | Open a shared link (from external source) | Page loads |
| 11.4 | Query `share_clicks` table | Click recorded |
| 11.5 | Favorite/Follow after clicking shared link | Query `share_conversions` |
| 11.6 | Verify conversion linked to share event | `share_event_id` populated |

---

#### TEST 12: Business Owner Share Dashboard (Story 10.1.10)
**Location:** Business Dashboard → Shares/Analytics Tab
**Precondition:** Logged in as business owner, some shares have occurred

| Step | Action | Expected Result |
|------|--------|-----------------|
| 12.1 | Navigate to Business Dashboard | Dashboard loads |
| 12.2 | Find "Shares" or "Share Analytics" section/tab | Section visible |
| 12.3 | Verify Total Shares count | Number > 0 |
| 12.4 | Verify Share Method Breakdown chart | Pie chart shows methods |
| 12.5 | Verify Top Shared Items table | Products/Offers listed |
| 12.6 | Verify Click-Through Rate | CTR percentage shown |

---

### Unit Tests

| Component/Service | Test Cases |
|-------------------|------------|
| `unifiedShareService` | UTM generation, URL building, platform detection |
| `linkPreviewService` | URL type detection, preview generation for all 4 types |
| `StorefrontShareButton` | Render, click handlers, state management |
| `ProductShareButton` | Render, click handlers, state management |
| `OfferShareButton` | Render, click handlers, state management |
| `ProfileShareButton` | Render, privacy check, click handlers |
| `LinkPreviewCard` | Render all preview types, action buttons |
| `ForwardMessageDialog` | Multi-select, search, forward action |
| `FollowBusinessButton` | Toggle state, API call |
| `useBusinessFollow` | Hook state management |

### Integration Tests

| Flow | Test Cases |
|------|------------|
| Share to Chat | Send share, verify message appears with preview |
| External Share | Native share triggers on mobile |
| Copy Link | Clipboard contains correct URL with UTM |
| Click Tracking | Click on shared link increments counter |
| Conversion Tracking | Favorite after share records conversion |
| Forward Message | Message appears in target conversation |
| Multi-Forward | 3+ friends receive forwarded message |

### E2E Tests (Playwright)

| Scenario | Steps |
|----------|-------|
| Share Storefront via Chat | Login → Navigate to business → Share → Pick friend → Verify message |
| Share Product via Copy | Navigate to product → Copy link → Verify clipboard → Navigate to URL → Verify product page |
| Forward Offer Link | Receive offer link in chat → Forward to 2 friends → Verify both receive |
| Favorite from Chat | Receive product link → Click Favorite → Verify in favorites |
| Follow from Chat | Receive storefront link → Click Follow → Verify followed |
| Business Owner Dashboard | Login as owner → View share analytics → Verify data |
| Add Friend from Chat | Receive profile link → Click Add Friend → Verify request sent |

### Mobile Testing

| Platform | Test Cases |
|----------|-----------|
| iOS (Capacitor) | Native share sheet opens via @capacitor/share, correct apps shown |
| Android (Capacitor) | Native share sheet opens via @capacitor/share, correct apps shown |
| Mobile Web (Safari/Chrome) | Falls back to Web Share API or copy link |
| Desktop Web | Falls back to copy link + social buttons |


---

## 📊 Database Schema Summary

```sql
-- New Tables
CREATE TABLE share_events (...);      -- Track all share actions
CREATE TABLE share_clicks (...);      -- Track link clicks
CREATE TABLE share_conversions (...); -- Track conversions
CREATE TABLE business_follows (...);  -- User follows business

-- New Functions
CREATE FUNCTION get_share_stats(...);
CREATE FUNCTION track_share_conversion(...);

-- New Indexes
CREATE INDEX idx_share_events_entity ON share_events(entity_type, entity_id);
CREATE INDEX idx_share_events_user ON share_events(user_id);
CREATE INDEX idx_share_clicks_event ON share_clicks(share_event_id);
CREATE INDEX idx_business_follows_user ON business_follows(user_id);
CREATE INDEX idx_business_follows_business ON business_follows(business_id);
```

---

## 🔗 Migration Notes

### Existing Components to Modify
1. `StorefrontShareButton.tsx` - Enhance with unified share service
2. `ProductShareButton.tsx` - Enhance with unified share service
3. `ShareDeal.tsx` / related - Migrate to unified share service
4. `LinkPreviewCard.tsx` - Add new preview types and action buttons
5. `ForwardMessageDialog.tsx` - Add multi-friend support
6. `BusinessProfile.tsx` - Ensure share button placement
7. `ProductCard.tsx` - Add share button
8. `OfferCard.tsx` / `FeaturedOffers.tsx` - Add share button

### Deprecations
- Remove any "Favorite Business" functionality (use "Follow" instead)
- Consolidate multiple share services into `unifiedShareService.ts`

---

## 📅 Implementation Order

1. **Week 1:** Stories 10.1.1 (Infrastructure) + 10.1.2-4 (Entity sharing)
2. **Week 2:** Stories 10.1.5 (Profile) + 10.1.6 (Link previews) + 10.1.7 (Action buttons)
3. **Week 3:** Stories 10.1.8 (Forwarding) + 10.1.9-10 (Analytics)

---

## ✅ Epic Completion Checklist

- [ ] All 10 stories complete
- [ ] All unit tests passing
- [ ] All integration tests passing
- [ ] All E2E tests passing
- [ ] Mobile testing on iOS and Android
- [ ] Business owner dashboard verified
- [ ] Documentation updated
- [ ] Migration guide for existing share code
