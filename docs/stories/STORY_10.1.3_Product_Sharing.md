# Story 10.1.3: Product Sharing

**Epic:** [Epic 10.1: Unified Sharing Ecosystem](../epics/EPIC_10.1_Unified_Sharing_Ecosystem.md)  
**Status:** 🔴 NOT STARTED  
**Priority:** 🔴 Critical  
**Effort:** 2 days  
**Dependencies:** Story 10.1.1 (Share Infrastructure)

---

## 📋 Overview

Implement comprehensive share functionality for individual Products, enabling users to share products from both Product Cards and Product Details views via in-app chat, external apps, and social media.

---

## 🎯 Acceptance Criteria

### AC-1: Share Button on Product Card
**Given** I am viewing a Product Card (in Products tab or elsewhere)  
**When** I look at the card's action row  
**Then** I see a Share icon button  
**And** it does not conflict with existing Favorite button

**Location:** `src/components/products/ProductCard.tsx`

**UI Specification:**
```tsx
// In the product card overlay/action area
<div className="absolute top-2 right-2 flex gap-1">
  <FavoriteProductButton productId={product.id} iconOnly />
  <button
    onClick={(e) => {
      e.stopPropagation(); // Prevent card click
      setShowShareModal(true);
    }}
    className="p-1.5 bg-white/90 hover:bg-white rounded-full shadow-sm"
    title="Share product"
  >
    <Share2 className="w-4 h-4 text-gray-600" />
  </button>
</div>
```

---

### AC-2: Share Button on Product Details Page/Modal
**Given** I am viewing a Product's details (modal or page)  
**When** I look at the header/action area  
**Then** I see a Share button  
**And** it is clearly visible and accessible

**Location:** `src/components/products/ProductView.tsx` or `ProductDetails.tsx`

**UI Specification:**
```tsx
// In the product details header
<div className="flex items-center gap-2">
  <FavoriteProductButton productId={product.id} />
  <ProductShareButton
    productId={product.id}
    productName={product.name}
    productPrice={product.price}
    productCurrency={product.currency || 'USD'}
    productImage={product.images?.[0]}
    businessId={business.id}
    businessName={business.name}
    businessSlug={business.slug}
    variant="button"
  />
</div>
```

---

### AC-3: Share Modal Behavior
**Given** I click the Share button on a product  
**When** the share modal opens  
**Then** I see the same share options as storefront sharing:
- Send to Friend (in-app chat)
- Copy Link
- Social media buttons (Facebook, Twitter, WhatsApp, Email)
- More... (native share sheet on mobile)

**And** the product preview shows:
- Product image
- Product name
- Price
- Business name

---

### AC-4: Share Data Preparation
**Given** I am sharing a product  
**When** the share data is prepared  
**Then** it includes:

| Field | Value |
|-------|-------|
| Title | Product name |
| Description | `${productName} at ${businessName} - ${formattedPrice}` |
| Image | First product image URL |
| URL | `/business/${businessSlug}/product/${productId}` |

**Example Share Text:**
```
Organic Coffee Beans at Cafe Delight - $24.99
Check out this product on SynC!
https://syncwarp.app/business/cafe-delight/product/abc123?ref=xxx
```

---

### AC-5: Share to Chat Flow
**Given** I select friends and send  
**When** the message is sent  
**Then** the chat message contains a `sync-product` link preview with:
- Product image
- Product name
- Price (highlighted)
- Business name
- "View Product" CTA

**Message Structure:**
```typescript
await messagingService.sendMessage({
  conversationId: conversationId,
  content: customMessage || `Check out ${productName}!`,
  type: 'link',
  linkPreviews: [{
    url: shareUrl,
    title: productName,
    description: `${formatPrice(price, currency)} at ${businessName}`,
    image: productImage,
    type: 'sync-product',
    metadata: {
      entityType: 'product',
      entityId: productId,
      productId: productId,
      price: price,
      currency: currency,
      businessId: businessId,
      businessName: businessName,
      businessSlug: businessSlug
    }
  }]
});
```

---

### AC-6: ProductShareButton Component
**Given** the need for a reusable share button  
**When** this story is complete  
**Then** `src/components/sharing/ProductShareButton.tsx` exists:

```tsx
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
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showLabel?: boolean;
}

export function ProductShareButton({
  productId,
  productName,
  productPrice,
  productCurrency,
  productImage,
  businessId,
  businessName,
  businessSlug,
  variant = 'icon',
  size = 'md',
  className,
  showLabel = false
}: ProductShareButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const formattedPrice = useMemo(() => 
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: productCurrency
    }).format(productPrice),
    [productPrice, productCurrency]
  );

  const shareData = useMemo(() => ({
    entityType: 'product' as const,
    entityId: productId,
    title: productName,
    description: `${productName} at ${businessName} - ${formattedPrice}`,
    imageUrl: productImage,
    url: `${window.location.origin}/business/${businessSlug}/product/${productId}`
  }), [productId, productName, businessName, productImage, businessSlug, formattedPrice]);

  // ... implementation similar to StorefrontShareButton
}
```

---

### AC-7: Click Event Propagation
**Given** the product card is clickable (to open details)  
**When** I click the share button on the card  
**Then** the card click event is NOT triggered  
**And** only the share modal opens

```tsx
onClick={(e) => {
  e.stopPropagation();
  e.preventDefault();
  setShowShareModal(true);
}}
```

---

### AC-8: Share URL Structure
**Given** I share a product  
**When** the URL is generated  
**Then** it follows this structure:
```
https://syncwarp.app/business/[businessSlug]/product/[productId]?utm_source=sync&utm_medium=share&utm_campaign=product_[id8]&utm_content=[method]&ref=[shareEventId]
```

**Alternative URL (if product has dedicated route):**
```
https://syncwarp.app/product/[productId]?ref=[shareEventId]
```

---

### AC-9: Products Without Images
**Given** a product has no images  
**When** sharing  
**Then** use the business logo as fallback  
**Or** use a generic product placeholder

```tsx
const imageUrl = productImage || businessLogo || '/images/product-placeholder.png';
```

---

### AC-10: Price Formatting
**Given** products have different currencies  
**When** displaying the price in share text  
**Then** format according to currency:

```typescript
function formatPrice(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD'
  }).format(amount);
}

// Examples:
// USD: $24.99
// EUR: €24.99
// INR: ₹1,999.00
```

---

## 📁 Files to Create/Modify

### New Files
| File | Purpose |
|------|---------|
| `src/components/sharing/ProductShareButton.tsx` | Product-specific share button |

### Modified Files
| File | Changes |
|------|---------|
| `src/components/products/ProductCard.tsx` | Add share button to card overlay |
| `src/components/products/ProductView.tsx` | Add share button to details header |
| `src/components/products/ProductDetails.tsx` | Add share button (if separate) |

---

## 🎨 UI Mockup Description

### Product Card with Share Button
```
┌─────────────────────────────┐
│        [Product Image]       │
│  ┌─────┐            ┌───┐   │
│  │ ❤️  │            │ ↗️ │   │ <- Share button
│  └─────┘            └───┘   │
├─────────────────────────────┤
│  Product Name               │
│  $24.99                     │
│  Business Name              │
└─────────────────────────────┘
```

### Share Modal with Product Preview
```
┌─────────────────────────────────────┐
│  Share Product                [X]   │
├─────────────────────────────────────┤
│  ┌──────┐                           │
│  │[Img] │ Product Name              │
│  │      │ $24.99 at Business Name   │
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
- [ ] Share button visible on Product Card
- [ ] Share button visible on Product Details
- [ ] Product preview shows in share modal
- [ ] Price formatted correctly

### Functional Tests
- [ ] Share to chat sends correct preview
- [ ] Copy link contains product URL
- [ ] Social shares include price in text
- [ ] Native share works on mobile
- [ ] Card click not triggered when share clicked

### Edge Cases
- [ ] Product with no image
- [ ] Product with very long name
- [ ] Product with zero price (free)
- [ ] Product with different currency
- [ ] Multiple images (should use first)

---

## ✅ Definition of Done

- [ ] ProductShareButton component created
- [ ] Share button integrated into ProductCard
- [ ] Share button integrated into ProductView/Details
- [ ] Product preview shows in share modal
- [ ] All share methods working
- [ ] Click propagation handled correctly
- [ ] Price formatting working
- [ ] Image fallback working
- [ ] All tests passing
- [ ] Code reviewed and merged

---

## 📝 Notes

- Consider batch sharing multiple products (future enhancement)
- Product URL routing: verify `/business/[slug]/product/[id]` is a valid route
- If product is sold out/unavailable, still allow sharing but maybe indicate status
- Share button visibility: consider hiding for business owners on their own products
