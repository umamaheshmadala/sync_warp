# Story 12.3: Product Modal Redesign (Mobile)

**EPIC**: [EPIC 12 - Instagram-Style Products](../epics/EPIC_12_Instagram_Style_Products.md)  
**Status**: ✅ Complete  
**Priority**: P0  
**Estimate**: 8 points  

---

## User Story

**As a** mobile user  
**I want to** view products in a full-screen Instagram-style experience  
**So that** I can immerse myself in product imagery and engage socially  

---

## Scope

### In Scope
- Full-screen modal (not bottom sheet)
- Swipe down to close
- Image carousel with swipe and dots
- Social actions bar (like, comment, share, favorite)
- Comments section below image (scroll to view)
- Description with "Read more"
- Tags display
- Notification toggle (business owner only)
- Native share integration

### Out of Scope
- Web modal (covered in Story 12.2)
- Editing within modal

---

## UI/UX Specifications

### Modal Layout

```
┌─────────────────────────────────┐
│ ← Back              ⋮ Options   │  ← Header (fixed)
├─────────────────────────────────┤
│  🏢 Business Name               │
│     @username • Follow          │
├─────────────────────────────────┤
│                                 │
│                                 │
│      IMAGE CAROUSEL             │
│         (Full width)            │
│          (4:5 ratio)            │
│                                 │
│                                 │
│         ● ● ○ ○ ○              │
├─────────────────────────────────┤
│  ❤️ 24   💬 5   🔗   ⭐         │  ← Actions bar
├─────────────────────────────────┤
│  Product Name                   │
│  🆕 New  ⭐ Featured            │
│                                 │
│  Description text here that     │
│  can span multiple lines...     │
│  [Read more]                    │
├─────────────────────────────────┤
│  💬 5 comments                  │
│  ──────────────────────────     │
│  👤 John: Great product!        │
│  👤 Sarah: Is this available?   │
│  [View all 5 comments]          │
├─────────────────────────────────┤
│  ┌───────────────────────────┐  │
│  │ Add a comment...          │  │
│  └───────────────────────────┘  │
├─────────────────────────────────┤
│  (Owner Only)                   │
│  🔔 Notifications [ON/OFF]      │
└─────────────────────────────────┘
```

### Swipe Gestures

| Gesture | Action |
|---------|--------|
| Swipe left on image | Next image |
| Swipe right on image | Previous image |
| Swipe down (from top) | Close modal |
| Tap image | Pause/resume (if video) |
| Double-tap image | Like |

### Options Menu (⋮)

**For all users:**
- Share
- Report

**For business owner:**
- Edit Product
- Archive Product
- Delete Product

---

## Acceptance Criteria

### Modal Opening/Closing
- [ ] Tap product card opens full-screen modal
- [ ] Modal slides up with animation
- [ ] Back button (←) closes modal
- [ ] Swipe down gesture closes modal
- [ ] Threshold: 100px swipe distance to trigger close
- [ ] Smooth 250ms close animation

### Image Carousel
- [ ] Full-width images maintain 4:5 ratio
- [ ] Swipe left/right navigates images
- [ ] Dot indicators show current position
- [ ] Smooth transition animation
- [ ] Double-tap to like works

### Social Actions Bar
- [ ] ❤️ toggles like state
- [ ] 💬 scrolls to comment input
- [ ] 🔗 opens native share sheet
- [ ] ⭐ toggles favorite state
- [ ] Counts update in real-time

### Content Section
- [ ] Business name links to storefront
- [ ] Product name displayed prominently
- [ ] Tags shown with correct styling
- [ ] Description truncated with "Read more"
- [ ] URLs in description are tappable

### Comments Section
- [ ] Shows 2-3 comments preview
- [ ] "View all X comments" expands list
- [ ] Comment input at bottom
- [ ] Keyboard pushes content up
- [ ] After posting, scroll to new comment

### Business Owner Features
- [ ] Notification toggle visible only to owner
- [ ] Options menu has Edit/Archive/Delete
- [ ] Confirmation for destructive actions

---

## Native Integration

### Share Sheet
```typescript
import { Share } from '@capacitor/share';

const shareProduct = async (product: Product, business: Business) => {
  await Share.share({
    title: product.name,
    text: `Check out ${product.name} from ${business.name}`,
    url: `https://sync.app/b/${business.slug}/products/${product.id}`,
    dialogTitle: 'Share Product'
  });
};
```

### Haptics
```typescript
import { Haptics, ImpactStyle } from '@capacitor/haptics';

// On like
await Haptics.impact({ style: ImpactStyle.Light });

// On double-tap like
await Haptics.impact({ style: ImpactStyle.Medium });
```

---

## Component Structure

```
src/components/products/mobile/
├── MobileProductModal.tsx        # Full-screen container
├── MobileProductHeader.tsx       # Back button + options
├── MobileProductCarousel.tsx     # Swipeable images
├── MobileProductActions.tsx      # Like, comment, share, save
├── MobileProductDetails.tsx      # Name, tags, description
├── MobileProductComments.tsx     # Comments preview + input
├── MobileProductOwnerMenu.tsx    # Options for owner
└── hooks/
    └── useMobileProductModal.ts  # Gesture handling
```

---

## Testing Checklist

- [ ] Open modal from product grid
- [ ] Swipe images left/right
- [ ] Double-tap to like
- [ ] Swipe down to close
- [ ] Back button closes
- [ ] Like/unlike product
- [ ] Add comment
- [ ] Native share sheet opens
- [ ] Save to favorites
- [ ] Read more expands description
- [ ] View all comments expands
- [ ] Owner sees notification toggle
- [ ] Owner menu works (edit/archive/delete)
- [ ] Keyboard handling works correctly

---

## Dependencies

- [ ] Story 12.5 (Likes)
- [ ] Story 12.6 (Comments)
- [ ] Story 12.7 (Share)
- [ ] Story 12.8 (Favorites)
- [ ] Story 12.9 (Tags)
- [ ] Story 12.11 (Notification Toggle)
- [ ] Capacitor Share plugin
- [ ] Capacitor Haptics plugin
