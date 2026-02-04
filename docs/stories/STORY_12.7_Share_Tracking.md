# Story 12.7: Share & Tracking

**EPIC**: [EPIC 12 - Instagram-Style Products](../epics/EPIC_12_Instagram_Style_Products.md)  
**Status**: ✅ Done  
**Priority**: P1  
**Estimate**: 3 points  

---

## User Story

**As a** user  
**I want to** share products with friends via various platforms  
**So that** I can recommend products I like  

---

## Scope

### In Scope
- Reuse existing share sheet component
- Share to: WhatsApp, Copy Link, Facebook, Twitter, Email
- Track share counts per product
- Native share on mobile
- Deep link generation

### Out of Scope
- In-app messaging share (separate feature)
- Share analytics dashboard

---

## Technical Specifications

### Database

```sql
-- Already created in Story 12.13
CREATE TABLE product_shares (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id), -- NULL for anonymous
  platform TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Denormalized count trigger already exists
```

### Share Platforms

| Platform | Code | Icon |
|----------|------|------|
| Copy Link | `copy_link` | 🔗 |
| WhatsApp | `whatsapp` | WhatsApp icon |
| Facebook | `facebook` | Facebook icon |
| Twitter/X | `twitter` | X icon |
| Email | `email` | ✉️ |
| Native | `native` | Share icon |

### Deep Link Format

```
Web: https://sync.app/b/{business_slug}/products/{product_id}
App: sync://product/{product_id}
```

---

## UI/UX Specifications

### Share Sheet (Web)

```
┌───────────────────────────────────┐
│  Share Product              [X]   │
├───────────────────────────────────┤
│                                   │
│  ┌─────┐  Product Name            │
│  │ 📷  │  by Business Name        │
│  └─────┘                          │
│                                   │
├───────────────────────────────────┤
│                                   │
│  ┌─────┐  ┌─────┐  ┌─────┐       │
│  │ 🔗  │  │ 💬  │  │ 📘  │       │
│  │Copy │  │WhApp│  │ FB  │       │
│  └─────┘  └─────┘  └─────┘       │
│                                   │
│  ┌─────┐  ┌─────┐                │
│  │ 𝕏  │  │ ✉️  │                │
│  │Twitter│  │Email│                │
│  └─────┘  └─────┘                │
│                                   │
└───────────────────────────────────┘
```

### Share Sheet (Mobile)

Use native share sheet via Capacitor:

```typescript
import { Share } from '@capacitor/share';

await Share.share({
  title: product.name,
  text: `Check out ${product.name} from ${business.name}`,
  url: shareUrl,
  dialogTitle: 'Share Product'
});
```

---

## Acceptance Criteria

### Share Button
- [ ] Share button visible in product modal
- [ ] Clicking opens share sheet (web) or native share (mobile)
- [ ] Share count increments on successful share

### Web Share Sheet
- [ ] Shows product preview (image, name, business)
- [ ] Copy Link copies URL and shows success toast
- [ ] WhatsApp opens wa.me with pre-filled message
- [ ] Facebook opens share dialog
- [ ] Twitter opens tweet composer
- [ ] Email opens mailto with subject/body

### Mobile Native Share
- [ ] Opens OS share sheet
- [ ] Works on iOS and Android
- [ ] Pre-fills share text and URL

### Tracking
- [ ] Each share records platform used
- [ ] Anonymous shares allowed (user_id NULL)
- [ ] Share count on products table updates
- [ ] No duplicate tracking for rapid shares (debounce)

---

## Service Layer

### productShareService.ts

```typescript
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';

export const productShareService = {
  async share(product: Product, business: Business) {
    const shareUrl = `https://sync.app/b/${business.slug}/products/${product.id}`;
    const shareText = `Check out ${product.name} from ${business.name}`;
    
    if (Capacitor.isNativePlatform()) {
      await Share.share({
        title: product.name,
        text: shareText,
        url: shareUrl,
        dialogTitle: 'Share Product'
      });
      await this.trackShare(product.id, 'native');
    } else {
      // Return data for web share sheet
      return { url: shareUrl, text: shareText };
    }
  },
  
  async trackShare(productId: string, platform: string) {
    const { data: { user } } = await supabase.auth.getUser();
    
    await supabase.from('product_shares').insert({
      product_id: productId,
      user_id: user?.id || null,
      platform
    });
  },
  
  async copyLink(productId: string, url: string) {
    await navigator.clipboard.writeText(url);
    await this.trackShare(productId, 'copy_link');
  },
  
  shareToWhatsApp(text: string, url: string) {
    window.open(`https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`);
  },
  
  shareToFacebook(url: string) {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`);
  },
  
  shareToTwitter(text: string, url: string) {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`);
  },
  
  shareViaEmail(subject: string, body: string) {
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }
};
```

---

## Component Structure

```
src/components/products/
├── ProductShareButton.tsx      # Button that triggers share
├── ProductShareSheet.tsx       # Web share modal (reuse existing)
└── hooks/
    └── useProductShare.ts      # Share logic
```

---

## Testing Checklist

- [ ] Click share button in modal
- [ ] Web: Share sheet opens
- [ ] Web: Copy link works
- [ ] Web: WhatsApp link opens
- [ ] Web: Facebook share works
- [ ] Web: Twitter share works
- [ ] Web: Email opens mail client
- [ ] Mobile: Native share sheet opens
- [ ] Share count increments
- [ ] Share tracked in database
- [ ] Rapid shares debounced

---

## Dependencies

- [ ] Existing share sheet component
- [ ] Story 12.13 (Database Migration) for product_shares table
- [ ] @capacitor/share plugin
