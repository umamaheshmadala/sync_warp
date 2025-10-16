# Story 4.9: Social Sharing Actions - COMPLETE SPECIFICATION

**Epic:** 4 - Business Features  
**Priority:** 🟡 **MEDIUM** (Post-MVP Enhancement)  
**Effort:** 2 days  
**Dependencies:** Story 4.7 (Product Display), Story 5.3 (Share Framework)

---

## 📋 Overview

This story completes the social sharing ecosystem by adding Web Share API integration for storefronts and products. While offer sharing exists (Story 5.3), customers cannot currently share business storefronts or individual products with friends, limiting organic discovery and viral growth.

---

## 🎯 Mermaid Nodes Covered (6/6)

| Node ID | Node Name | Description | Status |
|---------|-----------|-------------|--------|
| `n15` | Share Storefront Link | Share business page | ✅ Specified |
| `T_Storefront_Shared` | Storefront link shared | Success notification | ✅ Specified |
| `n12` | Share Product Link | Share individual product | ✅ Specified |
| `T_Product_Shared` | Product link shared | Success notification | ✅ Specified |
| `n31` | Offer Shared (system) | System tracking node | ✅ Existing (5.3) |
| `n34` | Shared to Friend (system) | Friend notification flow | ✅ Existing (5.3) |

**Coverage:** 6/6 nodes (100%)  
**Note:** Nodes `n31` and `n34` are already implemented in Story 5.3 for offer sharing. This story extends the pattern to storefronts and products.

---

## 💡 User Stories

### Primary User Story
**As a** customer who discovers a great business or product  
**I want to** share it with my friends easily  
**So that** they can benefit from my discovery

### Secondary User Stories
1. **As a** customer, **I want to** share a business storefront **so that** my friends can see all offers and products
2. **As a** customer, **I want to** share a specific product **so that** my friends know exactly what I recommend
3. **As a** customer, **I want to** use my phone's native share menu **so that** I can share via any app I choose
4. **As a** business owner, **I want to** track shares **so that** I can measure organic reach

---

## 🎨 UI Components

### 1. StorefrontShareButton Component (`StorefrontShareButton.tsx`)

**Location:** `src/components/social/StorefrontShareButton.tsx`

**Purpose:** Share button for business storefront page

**Props:**
```typescript
interface StorefrontShareButtonProps {
  businessId: string;
  businessName: string;
  businessDescription?: string;
  businessImage?: string;
  variant?: 'icon' | 'button'; // Default: icon
}
```

**Features:**
- Web Share API for native sharing
- Fallback to copy-to-clipboard
- Share data includes:
  - Title: Business name
  - Text: Short description
  - URL: Storefront link
- Toast notification on success
- Analytics tracking

**Placement:**
- Business profile header (top-right corner)
- Mobile: Floating action button
- Desktop: Header toolbar

**Layout:**
```
┌─────────────────────────────────────────┐
│  Business Name                    [🔗]  │ ← Share button
│  ⭐ 4.5 (128 reviews)                   │
└─────────────────────────────────────────┘
```

---

### 2. ProductShareButton Component (`ProductShareButton.tsx`)

**Location:** `src/components/social/ProductShareButton.tsx`

**Purpose:** Share button for individual products

**Props:**
```typescript
interface ProductShareButtonProps {
  productId: string;
  productName: string;
  productPrice: number;
  productCurrency: string;
  businessId: string;
  businessName: string;
  productImage?: string;
  variant?: 'icon' | 'button'; // Default: icon
}
```

**Features:**
- Web Share API integration
- Fallback to copy-to-clipboard
- Share data includes:
  - Title: Product name
  - Text: Price + business name
  - URL: Product detail link
- Toast notification on success
- Analytics tracking

**Placement:**
- Product cards (action buttons)
- Product details page (header)
- Wishlist items

**Layout (Product Card):**
```
┌─────────────────────────────────────────┐
│  [Product Image]                        │
│  Product Name                           │
│  ₹999                                   │
│  [❤️ Favorite] [🔗 Share] [📋 Wishlist] │ ← Share button
└─────────────────────────────────────────┘
```

---

### 3. ShareModal Component (Enhancement) (`ShareModal.tsx`)

**Location:** `src/components/social/ShareModal.tsx`

**Purpose:** Fallback modal for browsers without Web Share API

**Props:**
```typescript
interface ShareModalProps {
  title: string;
  text: string;
  url: string;
  onClose: () => void;
  isOpen: boolean;
}
```

**Features:**
- Copy link to clipboard
- Share via common platforms (WhatsApp, Facebook, Twitter)
- QR code generation for link
- Email share option
- Close button

**Layout:**
```
┌─────────────────────────────────────────┐
│  Share                            [✕]   │
├─────────────────────────────────────────┤
│  [Copy Link]  ✓ Copied!                │
├─────────────────────────────────────────┤
│  Share via:                             │
│  [WhatsApp] [Facebook] [Twitter] [Email]│
├─────────────────────────────────────────┤
│  [QR Code]                              │
│   ┌───────┐                             │
│   │ ▓▓▓▓▓ │                             │
│   │ ▓▓▓▓▓ │                             │
│   └───────┘                             │
└─────────────────────────────────────────┘
```

---

### 4. ShareTracker Service (`shareTracker.ts`)

**Location:** `src/services/shareTracker.ts`

**Purpose:** Track share events for analytics

**Features:**
- Log share events to database
- Track share method (native, copy, platform)
- Count shares per business/product
- Generate referral links with tracking params

---

## 🔧 Technical Implementation

### Web Share API Integration

**Core Share Function:**
```typescript
import { useToast } from '@/hooks/use-toast';

interface ShareData {
  title: string;
  text: string;
  url: string;
}

export function useWebShare() {
  const { toast } = useToast();

  async function share(data: ShareData): Promise<boolean> {
    // Check if Web Share API is supported
    if (navigator.share) {
      try {
        await navigator.share({
          title: data.title,
          text: data.text,
          url: data.url
        });
        
        toast({
          title: 'Shared successfully!',
          description: 'Your link has been shared.',
          variant: 'success'
        });
        
        return true;
      } catch (err) {
        // User cancelled share - not an error
        if ((err as Error).name === 'AbortError') {
          return false;
        }
        
        // Fall through to clipboard fallback
        return await copyToClipboard(data.url);
      }
    } else {
      // Fallback: Copy to clipboard
      return await copyToClipboard(data.url);
    }
  }

  async function copyToClipboard(url: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(url);
      
      toast({
        title: 'Link copied!',
        description: 'Share link has been copied to clipboard.',
        variant: 'success'
      });
      
      return true;
    } catch {
      toast({
        title: 'Failed to copy',
        description: 'Please copy the link manually.',
        variant: 'destructive'
      });
      
      return false;
    }
  }

  return { share, copyToClipboard };
}
```

---

### Storefront Share Implementation

**StorefrontShareButton.tsx:**
```typescript
import { useWebShare } from '@/hooks/useWebShare';
import { Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { trackShare } from '@/services/shareTracker';

interface StorefrontShareButtonProps {
  businessId: string;
  businessName: string;
  businessDescription?: string;
  businessImage?: string;
  variant?: 'icon' | 'button';
}

export function StorefrontShareButton({
  businessId,
  businessName,
  businessDescription,
  businessImage,
  variant = 'icon'
}: StorefrontShareButtonProps) {
  const { share } = useWebShare();

  async function handleShare() {
    const url = `${window.location.origin}/business/${businessId}`;
    
    const success = await share({
      title: businessName,
      text: businessDescription || `Check out ${businessName} on SynC!`,
      url: url
    });

    if (success) {
      // Track share event
      await trackShare({
        type: 'storefront',
        entity_id: businessId,
        method: 'web_share'
      });
    }
  }

  if (variant === 'icon') {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={handleShare}
        aria-label="Share storefront"
      >
        <Share2 className="h-5 w-5" />
      </Button>
    );
  }

  return (
    <Button onClick={handleShare} variant="outline">
      <Share2 className="mr-2 h-4 w-4" />
      Share
    </Button>
  );
}
```

---

### Product Share Implementation

**ProductShareButton.tsx:**
```typescript
import { useWebShare } from '@/hooks/useWebShare';
import { Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { trackShare } from '@/services/shareTracker';

interface ProductShareButtonProps {
  productId: string;
  productName: string;
  productPrice: number;
  productCurrency: string;
  businessId: string;
  businessName: string;
  productImage?: string;
  variant?: 'icon' | 'button';
}

export function ProductShareButton({
  productId,
  productName,
  productPrice,
  productCurrency,
  businessId,
  businessName,
  productImage,
  variant = 'icon'
}: ProductShareButtonProps) {
  const { share } = useWebShare();

  async function handleShare() {
    const url = `${window.location.origin}/business/${businessId}/product/${productId}`;
    
    const success = await share({
      title: productName,
      text: `Check out ${productName} at ${businessName} - ${productCurrency}${productPrice}`,
      url: url
    });

    if (success) {
      // Track share event
      await trackShare({
        type: 'product',
        entity_id: productId,
        method: 'web_share'
      });
    }
  }

  if (variant === 'icon') {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={handleShare}
        aria-label={`Share ${productName}`}
      >
        <Share2 className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <Button onClick={handleShare} variant="outline" size="sm">
      <Share2 className="mr-2 h-3 w-3" />
      Share
    </Button>
  );
}
```

---

### Share Tracking Database Schema

**New Table: shares**
```sql
CREATE TABLE shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  type VARCHAR(50) NOT NULL, -- 'storefront', 'product', 'offer'
  entity_id UUID NOT NULL, -- ID of shared item
  method VARCHAR(50) NOT NULL, -- 'web_share', 'copy', 'whatsapp', 'facebook', etc.
  referral_code VARCHAR(20) UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_shares_user ON shares(user_id);
CREATE INDEX idx_shares_entity ON shares(entity_id, type);
CREATE INDEX idx_shares_created ON shares(created_at);
CREATE INDEX idx_shares_referral ON shares(referral_code);

-- RLS Policies
ALTER TABLE shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own shares"
  ON shares FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can create shares"
  ON shares FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Function to track shares
CREATE OR REPLACE FUNCTION track_share(
  p_user_id UUID,
  p_type VARCHAR,
  p_entity_id UUID,
  p_method VARCHAR
)
RETURNS UUID AS $$
DECLARE
  v_share_id UUID;
  v_referral_code VARCHAR(20);
BEGIN
  -- Generate referral code
  v_referral_code := encode(gen_random_bytes(10), 'hex');
  
  INSERT INTO shares (user_id, type, entity_id, method, referral_code)
  VALUES (p_user_id, p_type, p_entity_id, p_method, v_referral_code)
  RETURNING id INTO v_share_id;
  
  RETURN v_share_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

### Share Tracker Service

**shareTracker.ts:**
```typescript
import { supabase } from '@/lib/supabase';

interface ShareEvent {
  type: 'storefront' | 'product' | 'offer';
  entity_id: string;
  method: 'web_share' | 'copy' | 'whatsapp' | 'facebook' | 'twitter' | 'email';
}

export async function trackShare(event: ShareEvent): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  
  try {
    const { data, error } = await supabase
      .rpc('track_share', {
        p_user_id: user?.id || null,
        p_type: event.type,
        p_entity_id: event.entity_id,
        p_method: event.method
      });

    if (error) throw error;
    
    return data; // Returns share ID
  } catch (err) {
    console.error('Failed to track share:', err);
    return null;
  }
}

export async function getShareStats(entityId: string, type: string) {
  const { data, error } = await supabase
    .from('shares')
    .select('*', { count: 'exact' })
    .eq('entity_id', entityId)
    .eq('type', type);

  if (error) {
    console.error('Failed to fetch share stats:', err);
    return { count: 0, methods: {} };
  }

  const methodCounts = data.reduce((acc, share) => {
    acc[share.method] = (acc[share.method] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return {
    count: data.length,
    methods: methodCounts
  };
}
```

---

## 🔄 Integration with Existing Components

### Update `BusinessProfile.tsx`

**Add share button to header:**
```typescript
import StorefrontShareButton from '@/components/social/StorefrontShareButton';

function BusinessProfile({ business }: Props) {
  return (
    <div>
      <div className="profile-header">
        <h1>{business.name}</h1>
        <div className="actions">
          <FavoriteButton businessId={business.id} />
          <StorefrontShareButton 
            businessId={business.id}
            businessName={business.name}
            businessDescription={business.description}
            businessImage={business.logo_url}
          />
        </div>
      </div>
      
      {/* Rest of profile */}
    </div>
  );
}
```

---

### Update `ProductCard.tsx`

**Add share button to actions:**
```typescript
import ProductShareButton from '@/components/social/ProductShareButton';

function ProductCard({ product, businessName }: Props) {
  return (
    <Card>
      <CardContent>
        <img src={product.image} alt={product.name} />
        <h3>{product.name}</h3>
        <p>{product.price} {product.currency}</p>
        
        <div className="actions">
          <FavoriteProductButton productId={product.id} />
          <ProductShareButton 
            productId={product.id}
            productName={product.name}
            productPrice={product.price}
            productCurrency={product.currency}
            businessId={product.business_id}
            businessName={businessName}
            productImage={product.images[0]}
          />
          <WishlistButton product={product} />
        </div>
      </CardContent>
    </Card>
  );
}
```

---

### Update `ProductDetails.tsx`

**Add share button to page header:**
```typescript
import ProductShareButton from '@/components/social/ProductShareButton';

function ProductDetails({ product, business }: Props) {
  return (
    <div>
      <div className="product-header">
        <Button variant="ghost" onClick={() => router.back()}>
          ← Back
        </Button>
        
        <div className="actions">
          <FavoriteProductButton productId={product.id} />
          <ProductShareButton 
            productId={product.id}
            productName={product.name}
            productPrice={product.price}
            productCurrency={product.currency}
            businessId={business.id}
            businessName={business.name}
            productImage={product.images[0]}
            variant="button"
          />
        </div>
      </div>
      
      {/* Rest of product details */}
    </div>
  );
}
```

---

## 🧪 Testing Requirements

### Unit Tests

```typescript
describe('useWebShare', () => {
  test('uses Web Share API when available', async () => {
    const mockShare = jest.fn().mockResolvedValue(undefined);
    global.navigator.share = mockShare;

    const { result } = renderHook(() => useWebShare());
    
    await result.current.share({
      title: 'Test',
      text: 'Test text',
      url: 'https://example.com'
    });

    expect(mockShare).toHaveBeenCalledWith({
      title: 'Test',
      text: 'Test text',
      url: 'https://example.com'
    });
  });

  test('falls back to clipboard when Web Share API unavailable', async () => {
    global.navigator.share = undefined;
    const mockClipboard = jest.fn().mockResolvedValue(undefined);
    global.navigator.clipboard = { writeText: mockClipboard };

    const { result } = renderHook(() => useWebShare());
    
    await result.current.share({
      title: 'Test',
      text: 'Test text',
      url: 'https://example.com'
    });

    expect(mockClipboard).toHaveBeenCalledWith('https://example.com');
  });
});

describe('shareTracker', () => {
  test('tracks share events', async () => {
    const shareId = await trackShare({
      type: 'product',
      entity_id: 'prod-123',
      method: 'web_share'
    });

    expect(shareId).toBeTruthy();
  });

  test('retrieves share statistics', async () => {
    const stats = await getShareStats('prod-123', 'product');
    
    expect(stats).toHaveProperty('count');
    expect(stats).toHaveProperty('methods');
  });
});
```

### E2E Tests (Playwright)

```typescript
test('customer can share storefront', async ({ page, context }) => {
  await page.goto('/business/test-business-id');
  
  // Mock navigator.share
  await context.addInitScript(() => {
    window.navigator.share = async (data) => {
      console.log('Shared:', data);
      return Promise.resolve();
    };
  });
  
  // Click share button
  await page.click('[aria-label="Share storefront"]');
  
  // Verify toast notification
  await expect(page.locator('[data-testid="toast"]')).toContainText('Shared successfully');
  
  // Verify share was tracked
  const shares = await page.evaluate(() => {
    return fetch('/api/shares?entity_id=test-business-id&type=storefront')
      .then(r => r.json());
  });
  
  expect(shares.count).toBeGreaterThan(0);
});

test('customer can share product', async ({ page, context }) => {
  await page.goto('/business/test-business-id/product/test-product-id');
  
  // Mock navigator.share
  await context.addInitScript(() => {
    window.navigator.share = async (data) => {
      console.log('Shared:', data);
      return Promise.resolve();
    };
  });
  
  // Click share button on product
  await page.click('[aria-label^="Share"]');
  
  // Verify toast notification
  await expect(page.locator('[data-testid="toast"]')).toContainText('Shared successfully');
});

test('fallback to clipboard when Web Share unavailable', async ({ page }) => {
  await page.goto('/business/test-business-id');
  
  // Don't mock navigator.share (simulate unsupported browser)
  await page.evaluate(() => {
    delete (window.navigator as any).share;
  });
  
  // Click share button
  await page.click('[aria-label="Share storefront"]');
  
  // Verify clipboard toast
  await expect(page.locator('[data-testid="toast"]')).toContainText('Link copied');
});
```

---

## ✅ Acceptance Criteria

### Functional Requirements
- [x] Storefront has share button in header
- [x] Product cards have share button
- [x] Product details page has share button
- [x] Web Share API used when available
- [x] Clipboard fallback works in all browsers
- [x] Toast notifications confirm success
- [x] Share events tracked in database
- [x] Share statistics retrievable

### Non-Functional Requirements
- [x] Share action completes < 500ms
- [x] Responsive on mobile and desktop
- [x] Accessible (WCAG 2.1 AA)
- [x] Works offline (clipboard fallback)
- [x] Privacy-compliant (no PII in share data)

### User Experience Requirements
- [x] Native share menu on supported devices
- [x] Clear feedback on success/failure
- [x] No page refresh required
- [x] Canceling share doesn't show error

---

## 📝 Implementation Phases

### Phase 1: Core Share Infrastructure (Day 1)
- [ ] Create `useWebShare.ts` hook
- [ ] Create `shareTracker.ts` service
- [ ] Create `shares` database table + RLS
- [ ] Create `track_share()` DB function
- [ ] Test Web Share API integration
- [ ] Test clipboard fallback

### Phase 2: Component Integration (Day 1-2)
- [ ] Create `StorefrontShareButton.tsx`
- [ ] Create `ProductShareButton.tsx`
- [ ] Integrate into `BusinessProfile.tsx`
- [ ] Integrate into `ProductCard.tsx`
- [ ] Integrate into `ProductDetails.tsx`
- [ ] Add toast notifications

### Phase 3: Analytics & Testing (Day 2)
- [ ] Implement `getShareStats()` function
- [ ] Add share count display (optional)
- [ ] Write unit tests
- [ ] Write E2E tests
- [ ] Test on multiple browsers
- [ ] Test on mobile devices

---

## 🔗 Related Documentation

- [Story 5.3: Deal Sharing](./STORY_5.3_Deal_Sharing.md) (Existing share framework)
- [Story 4.7: Product Display](./STORY_4.7_Product_Display_Details.md) (Product UI)
- [Database Schema: Shares](../database/schema_social.md)

---

**Status:** ✅ **FULLY SPECIFIED**  
**Mermaid Coverage:** 6/6 nodes (100%)  
**Ready for Implementation:** ✅ YES

---

*Last Updated: October 16, 2025*  
*Next Review: After implementation completion*
