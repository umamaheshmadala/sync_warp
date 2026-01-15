# Story 10.1.6: Rich Link Previews in Chat

**Epic:** [Epic 10.1: Unified Sharing Ecosystem](../epics/EPIC_10.1_Unified_Sharing_Ecosystem.md)  
**Status:** 🔴 NOT STARTED  
**Priority:** 🔴 Critical  
**Effort:** 3 days  
**Dependencies:** Stories 10.1.1-5 (All entity sharing stories)

---

## 📋 Overview

Enhance the chat link preview system to show rich, branded preview cards for all SynC entity types (Storefront, Product, Offer, Profile) with entity-specific styling, metadata display, and click handlers.

---

## 🎯 Acceptance Criteria

### AC-1: New Preview Type - sync-storefront
**Given** a user receives a storefront link in chat  
**When** the message is rendered  
**Then** the preview card shows:

| Element | Specification |
|---------|---------------|
| Layout | Horizontal card (logo left, content right) |
| Logo | Business logo, 40x40px, rounded |
| Title | Business name, bold, 16px |
| Description | Tagline or description, 2 lines max, muted color |
| Badge | "Business" label, subtle |
| CTA | "Visit Storefront →" link |
| Background | Light purple/blue gradient accent |
| Click Action | Navigate to `/business/${slug}` |

**Preview Card:**
```
┌─────────────────────────────────────┐
│ ┌────┐                              │
│ │Logo│  Coffee House NYC            │
│ │    │  Fresh roasted coffee daily  │
│ └────┘  🏪 Business                 │
│         Visit Storefront →          │
└─────────────────────────────────────┘
```

---

### AC-2: New Preview Type - sync-product
**Given** a user receives a product link in chat  
**When** the message is rendered  
**Then** the preview card shows:

| Element | Specification |
|---------|---------------|
| Layout | Square image layout |
| Image | Product image, 60x60px, rounded corners |
| Title | Product name, bold, 16px |
| Price | Price, highlighted in green, larger font |
| Business | Business name, muted, smaller |
| Badge | "Product" label |
| Click Action | Navigate to product details |

**Preview Card:**
```
┌─────────────────────────────────────┐
│ ┌──────┐                            │
│ │ Img  │  Organic Coffee Beans      │
│ │      │  $24.99                    │
│ └──────┘  at Cafe Delight           │
│           🛍️ Product                 │
└─────────────────────────────────────┘
```

---

### AC-3: New Preview Type - sync-offer
**Given** a user receives an offer link in chat  
**When** the message is rendered  
**Then** the preview card shows:

| Element | Specification |
|---------|---------------|
| Layout | Card with urgency styling |
| Image/Icon | Offer image or Gift icon |
| Title | Offer title, bold |
| Discount | Large discount badge ("25% OFF", red/orange) |
| Expiration | "Expires in X days" or "Expires today!" |
| Business | Business name |
| Background | Orange/red gradient for urgency |
| Click Action | Navigate to offer details |

**Preview Card:**
```
┌─────────────────────────────────────┐
│ ┌──────┐  ┌────────────────────┐    │
│ │ 🎁   │  │ 25% OFF           │    │
│ │      │  └────────────────────┘    │
│ └──────┘  Summer Special Sale       │
│           ⏱️ Expires in 5 days       │
│           at Cafe Delight           │
└─────────────────────────────────────┘
```

---

### AC-4: New Preview Type - sync-profile
**Given** a user receives a profile link in chat  
**When** the message is rendered  
**Then** the preview card shows:

| Element | Specification |
|---------|---------------|
| Layout | Horizontal, avatar-focused |
| Avatar | User avatar, 48x48px, circular |
| Title | Full name, bold |
| Subtitle | "Connect on SynC" |
| Badge | "Profile" label |
| Background | Neutral gray |
| Click Action | Navigate to profile |

**For private profiles:**
- Show "SynC User" instead of name
- Show default avatar
- Subtitle: "Private Profile"

**Preview Card:**
```
┌─────────────────────────────────────┐
│ ┌────┐                              │
│ │ 👤 │  John Doe                    │
│ │    │  Connect on SynC             │
│ └────┘  👤 Profile                  │
└─────────────────────────────────────┘
```

---

### AC-5: LinkPreview Type Update
**Given** the messaging system needs new preview types  
**When** this story is complete  
**Then** update `src/types/messaging.ts`:

```typescript
export interface LinkPreview {
  url: string;
  title: string;
  description: string;
  image?: string;
  favicon?: string;
  type: 
    | 'generic' 
    | 'sync-coupon' 
    | 'sync-deal' 
    | 'sync-storefront'    // NEW
    | 'sync-product'       // NEW
    | 'sync-offer'         // NEW (replaces sync-deal?)
    | 'sync-profile'       // NEW
    | 'coupon_shared' 
    | 'coupon_share_failed';
  metadata?: {
    // Storefront
    businessId?: string;
    businessSlug?: string;
    businessLogo?: string;
    
    // Product
    productId?: string;
    price?: number;
    currency?: string;
    businessName?: string;
    
    // Offer
    offerId?: string;
    discountValue?: number;
    discountType?: 'percentage' | 'fixed' | 'bogo';
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

---

### AC-6: Link Preview Service Enhancement
**Given** the system needs to generate previews for SynC URLs  
**When** a SynC URL is detected  
**Then** fetch entity data and create rich preview:

**Update:** `src/services/linkPreviewService.ts`

```typescript
class LinkPreviewService {
  // Detect SynC URL type
  private detectSyncUrlType(url: string): 'storefront' | 'product' | 'offer' | 'profile' | null {
    const syncDomain = window.location.origin;
    if (!url.startsWith(syncDomain)) return null;
    
    const path = new URL(url).pathname;
    
    if (path.match(/^\/business\/[^\/]+$/)) return 'storefront';
    if (path.match(/^\/business\/[^\/]+\/product\/[^\/]+$/)) return 'product';
    if (path.match(/^\/business\/[^\/]+\/offer\/[^\/]+$/)) return 'offer';
    if (path.match(/^\/offer\/[^\/]+$/)) return 'offer';
    if (path.match(/^\/profile\/[^\/]+$/)) return 'profile';
    
    return null;
  }
  
  // Fetch and build preview for storefront
  private async fetchSyncStorefrontPreview(businessSlug: string): Promise<LinkPreview | null> {
    const { data: business } = await supabase
      .from('businesses')
      .select('id, name, description, tagline, logo_url, slug')
      .eq('slug', businessSlug)
      .single();
    
    if (!business) return null;
    
    return {
      url: `${window.location.origin}/business/${business.slug}`,
      title: business.name,
      description: business.tagline || business.description?.substring(0, 100) || '',
      image: business.logo_url,
      type: 'sync-storefront',
      metadata: {
        entityType: 'storefront',
        entityId: business.id,
        businessId: business.id,
        businessSlug: business.slug,
        businessLogo: business.logo_url
      }
    };
  }
  
  // Similar methods for product, offer, profile...
  private async fetchSyncProductPreview(productId: string): Promise<LinkPreview | null>;
  private async fetchSyncOfferPreview(offerId: string): Promise<LinkPreview | null>;
  private async fetchSyncProfilePreview(userId: string): Promise<LinkPreview | null>;
}
```

---

### AC-7: LinkPreviewCard Component Update
**Given** new preview types need rendering  
**When** this story is complete  
**Then** update `src/components/messaging/LinkPreviewCard.tsx`:

```tsx
function LinkPreviewCard({ preview, onRemove, showRemoveButton, showActions, currentUserId }: Props) {
  
  // Route based on preview type
  const renderPreview = () => {
    switch (preview.type) {
      case 'sync-storefront':
        return <StorefrontPreview preview={preview} />;
      case 'sync-product':
        return <ProductPreview preview={preview} />;
      case 'sync-offer':
        return <OfferPreview preview={preview} />;
      case 'sync-profile':
        return <ProfilePreview preview={preview} />;
      case 'sync-coupon':
      case 'sync-deal':
        // Legacy support - treat as offer
        return <OfferPreview preview={preview} />;
      default:
        return <GenericPreview preview={preview} />;
    }
  };
  
  return (
    <div className={cn('rounded-lg overflow-hidden border', getPreviewStyles(preview.type))}>
      <a 
        href={preview.url} 
        onClick={handleClick}
        className="block hover:bg-gray-50 transition-colors"
      >
        {renderPreview()}
      </a>
      {showRemoveButton && onRemove && (
        <button onClick={onRemove} className="absolute top-2 right-2">
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
```

---

### AC-8: Preview-Specific Styling
**Given** each entity type has distinct styling  
**When** rendering previews  
**Then** apply type-specific styles:

```typescript
function getPreviewStyles(type: LinkPreview['type']): string {
  switch (type) {
    case 'sync-storefront':
      return 'bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200';
    case 'sync-product':
      return 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200';
    case 'sync-offer':
      return 'bg-gradient-to-r from-orange-50 to-red-50 border-orange-200';
    case 'sync-profile':
      return 'bg-gray-50 border-gray-200';
    default:
      return 'bg-white border-gray-200';
  }
}
```

---

### AC-9: Click Handler with Navigation
**Given** a user clicks on a preview card  
**When** the click is processed  
**Then** navigate to the entity page:

```typescript
const navigate = useNavigate();

const handleClick = (e: React.MouseEvent) => {
  e.preventDefault(); // Prevent default link behavior in chat
  
  const { entityType, entityId, businessSlug } = preview.metadata || {};
  
  switch (entityType) {
    case 'storefront':
      navigate(`/business/${businessSlug}`);
      break;
    case 'product':
      navigate(`/business/${businessSlug}/product/${entityId}`);
      break;
    case 'offer':
      navigate(`/business/${businessSlug}/offer/${entityId}`);
      break;
    case 'profile':
      navigate(`/profile/${entityId}`);
      break;
    default:
      // For external URLs, open in new tab
      window.open(preview.url, '_blank');
  }
};
```

---

### AC-10: Fallback for Missing Data
**Given** entity data may be missing (deleted, private)  
**When** rendering a preview  
**Then** show graceful fallback:

```tsx
function StorefrontPreview({ preview }: { preview: LinkPreview }) {
  const { title, description, image, metadata } = preview;
  
  return (
    <div className="flex items-start gap-3 p-3">
      {/* Logo with fallback */}
      <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center overflow-hidden flex-shrink-0">
        {image ? (
          <img src={image} alt="" className="w-full h-full object-cover" />
        ) : (
          <Store className="w-5 h-5 text-purple-500" />
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-gray-900 truncate">
          {title || 'Business'}
        </h4>
        <p className="text-sm text-gray-600 line-clamp-2">
          {description || 'Visit this business on SynC'}
        </p>
        <span className="inline-flex items-center gap-1 text-xs text-purple-600 mt-1">
          <Store className="w-3 h-3" />
          Business
        </span>
      </div>
    </div>
  );
}
```

---

## 📁 Files to Create/Modify

### New Files
| File | Purpose |
|------|---------|
| `src/components/messaging/previews/StorefrontPreview.tsx` | Storefront preview component |
| `src/components/messaging/previews/ProductPreview.tsx` | Product preview component |
| `src/components/messaging/previews/OfferPreview.tsx` | Offer preview component |
| `src/components/messaging/previews/ProfilePreview.tsx` | Profile preview component |
| `src/components/messaging/previews/GenericPreview.tsx` | Generic external link preview |
| `src/components/messaging/previews/index.ts` | Preview exports |

### Modified Files
| File | Changes |
|------|---------|
| `src/types/messaging.ts` | Add new preview types and metadata |
| `src/components/messaging/LinkPreviewCard.tsx` | Route to specific preview components |
| `src/services/linkPreviewService.ts` | Add SynC URL detection and fetching |

---

## 🧪 Testing Checklist

### Visual Tests
- [ ] Storefront preview renders with purple/blue gradient
- [ ] Product preview renders with green accent and price
- [ ] Offer preview renders with orange/red urgency styling
- [ ] Profile preview renders with neutral gray
- [ ] All previews have appropriate icons/badges
- [ ] Fallback renders when data is missing

### Functional Tests
- [ ] Click on storefront preview navigates to business page
- [ ] Click on product preview navigates to product view
- [ ] Click on offer preview navigates to offer details
- [ ] Click on profile preview navigates to profile
- [ ] External URLs open in new tab

### Data Tests
- [ ] Preview generates correctly for storefront URLs
- [ ] Preview generates correctly for product URLs
- [ ] Preview generates correctly for offer URLs
- [ ] Preview generates correctly for profile URLs
- [ ] Private profile shows limited info

### Edge Cases
- [ ] Deleted entity shows fallback
- [ ] Very long title/description is truncated
- [ ] Missing image shows icon fallback
- [ ] Invalid URL shows generic preview

---

## ✅ Definition of Done

- [ ] All 4 new preview components created
- [ ] LinkPreviewCard routes to correct preview
- [ ] LinkPreviewService detects and fetches SynC URLs
- [ ] Type definitions updated
- [ ] Click navigation working
- [ ] Entity-specific styling applied
- [ ] Fallbacks working
- [ ] All tests passing
- [ ] Code reviewed and merged

---

## 📝 Notes

- Consider caching preview data to avoid repeated fetches
- Legacy `sync-coupon` and `sync-deal` should map to `sync-offer`
- Preview fetching should be debounced if user is typing URL
- Real-time updates: if entity is deleted, preview may become stale
- Accessibility: ensure previews are keyboard navigable
