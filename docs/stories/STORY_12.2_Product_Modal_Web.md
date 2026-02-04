# Story 12.2: Product Modal Redesign (Web)

**EPIC**: [EPIC 12 - Instagram-Style Products](../epics/EPIC_12_Instagram_Style_Products.md)  
**Status**: ✅ Complete  
**Priority**: P0  
**Estimate**: 8 points  

---

## User Story

**As a** user  
**I want to** view products in an Instagram-style modal  
**So that** I can see high-quality images and engage with social features  

---

## Scope

### In Scope
- Split-view modal: 65% image, 35% details
- Image carousel with dots and arrows
- Like, comment, share, favorite buttons
- Comments section (scrollable)
- Description with "Read more"
- Tags display (visible to all)
- Notification toggle (business owner only)
- ESC key and click-outside to close
- Keyboard navigation for carousel

### Out of Scope
- Mobile modal (separate story 12.3)
- Image editing within modal
- Product editing (use separate edit flow)

---

## Technical Specifications

### Modal Dimensions
| Property | Value |
|----------|-------|
| Max Width | 1200px |
| Max Height | 90vh |
| Left Panel | 65% (image carousel) |
| Right Panel | 35% (details + comments) |
| Border Radius | 12px |
| Backdrop | rgba(0,0,0,0.8) |

### Image Carousel
| Feature | Implementation |
|---------|----------------|
| Aspect Ratio | 4:5 |
| Navigation | Dots + hover arrows |
| Swipe | Touch swipe on desktop |
| Keyboard | Arrow keys |
| Animation | 200ms slide transition |

---

## UI/UX Specifications

### Modal Layout

```
┌───────────────────────────────────────────────────────────────────────────┐
│                                                                     [X]   │
├───────────────────────────────────────┬───────────────────────────────────┤
│                                       │  ┌─────┐                          │
│                                       │  │ 🏢 │ BusinessName              │
│                                       │  └─────┘ @username • Follow       │
│                                       ├───────────────────────────────────┤
│      ┌──────────────────────────┐     │  Product Name                     │
│      │                          │     │                                   │
│      │                          │     │  🆕 New  ⭐ Featured              │
│  ◄   │      IMAGE CAROUSEL      │  ►  │                                   │
│      │         (4:5)            │     │  Description text goes here and   │
│      │                          │     │  can span multiple lines...       │
│      │                          │     │  [Read more]                      │
│      │                          │     ├───────────────────────────────────┤
│      └──────────────────────────┘     │  ❤️ 24   💬 5   🔗 Share   ⭐ Save │
│               ● ● ○ ○ ○               ├───────────────────────────────────┤
│                                       │  COMMENTS (scrollable)            │
│                                       │  ─────────────────────────────    │
│                                       │  👤 John: Great product!          │
│                                       │  👤 Sarah: Is it available?       │
│                                       │  [Load more...]                   │
│                                       ├───────────────────────────────────┤
│                                       │  [Add a comment...]        [Post] │
├───────────────────────────────────────┴───────────────────────────────────┤
│  (Business Owner Only)                                                    │
│  🔔 Notifications for this product: [ON/OFF]                              │
└───────────────────────────────────────────────────────────────────────────┘
```

### Carousel Navigation

**Dots:**
```
● ● ○ ○ ○
│ │ │ │ └── Image 5 (inactive)
│ │ │ └──── Image 4 (inactive)
│ │ └────── Image 3 (inactive)
│ └──────── Image 2 (active current)
└────────── Image 1 (already viewed)
```

**Arrows:**
- Left arrow: `◄` - appears on hover (left side of image)
- Right arrow: `►` - appears on hover (right side of image)
- Hidden on first/last image respectively
- Keyboard: ← → arrow keys

### Social Actions Bar

```
❤️ 24   💬 5   🔗 Share   ⭐ Save
│       │      │          │
│       │      │          └── Favorite (gold when saved)
│       │      └───────────── Opens share sheet
│       └──────────────────── Opens comment input (scroll to bottom)
└──────────────────────────── Like (red when liked)
```

### Description "Read More"

```
Before:
"This is a product description that is quite long and would
take up too much space if shown fully..."  [Read more]

After (expanded):
"This is a product description that is quite long and would
take up too much space if shown fully. Here is the rest of
the description that was previously hidden from view."
[Show less]
```

- Truncate at 100 characters by default
- "Read more" only if description > 100 chars
- Auto-link URLs in description

---

## Acceptance Criteria

### Modal Opening/Closing
- [ ] Click product card opens modal
- [ ] Modal overlay darkens background
- [ ] [X] button closes modal
- [ ] Click outside modal closes it
- [ ] ESC key closes modal
- [ ] URL updates with product ID for deep linking
- [ ] Back button navigates away from modal

### Image Carousel
- [ ] First image shown on open
- [ ] Dot indicators show current position
- [ ] Clicking dot jumps to that image
- [ ] Arrow buttons appear on hover
- [ ] Left arrow hidden on first image
- [ ] Right arrow hidden on last image
- [ ] Swipe left/right works on touch screens
- [ ] Arrow keys navigate carousel
- [ ] Smooth 200ms slide animation

### Business Header
- [ ] Business avatar shown
- [ ] Business name clickable (goes to storefront)
- [ ] @username shown if available
- [ ] "Follow" button if not already following

### Social Actions
- [ ] ❤️ Like button shows count, toggles fill
- [ ] 💬 Comment button shows count, scrolls to input
- [ ] 🔗 Share opens share sheet
- [ ] ⭐ Save toggles favorite state

### Comments Section
- [ ] Shows up to 10 comments initially
- [ ] Scrollable within fixed height
- [ ] "Load more" if additional comments
- [ ] Comment input at bottom
- [ ] Real-time new comments appear

### Description
- [ ] Truncated at 100 chars with "Read more"
- [ ] Full description shown on expand
- [ ] "Show less" to collapse
- [ ] URLs are clickable links

### Tags
- [ ] Tags displayed below product name
- [ ] Correct colors and emojis
- [ ] Not editable in view mode

### Business Owner Features
- [ ] Notification toggle shown only to owner
- [ ] Toggle state persists
- [ ] Edit button visible to owner (links to edit page)

### Accessibility
- [ ] Focus trapped within modal
- [ ] Tab navigates through interactive elements
- [ ] Screen reader announces modal title
- [ ] Alt text on images

---

## Component Structure

```
src/components/products/
├── ProductModal.tsx              # Main modal container
├── ProductModalCarousel.tsx      # Image carousel with dots/arrows
├── ProductModalHeader.tsx        # Business info + follow
├── ProductModalDetails.tsx       # Name, tags, description
├── ProductModalActions.tsx       # Like, comment, share, save
├── ProductModalComments.tsx      # Comments section
├── ProductModalOwnerControls.tsx # Notification toggle (owner only)
└── hooks/
    └── useProductModal.ts        # Modal state, keyboard handling
```

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| ESC | Close modal |
| ← | Previous image |
| → | Next image |
| L | Toggle like |
| S | Toggle save/favorite |
| Tab | Navigate elements |

---

## Deep Linking

```
URL: /business/{slug}/products/{productId}

// On modal open
router.push(`/business/${businessSlug}/products/${productId}`, undefined, { shallow: true });

// On modal close
router.back() or router.push(`/business/${businessSlug}`, undefined, { shallow: true });
```

---

## Testing Checklist

- [ ] Open modal from product grid
- [ ] Navigate carousel with arrows
- [ ] Navigate carousel with dots
- [ ] Navigate carousel with keyboard
- [ ] Swipe on touch screen
- [ ] Close with X button
- [ ] Close with ESC key
- [ ] Close by clicking outside
- [ ] Like/unlike product
- [ ] Add comment
- [ ] Share product
- [ ] Save to favorites
- [ ] Read more / show less
- [ ] Business owner sees notification toggle
- [ ] Non-owner doesn't see toggle
- [ ] Deep link opens correct product
- [ ] Back button closes modal
- [ ] Tab navigation works
- [ ] Screen reader compatibility

---

## Dependencies

- [ ] Story 12.1 (Image Upload) for image data
- [ ] Story 12.5 (Likes) for like functionality
- [ ] Story 12.6 (Comments) for comments
- [ ] Story 12.7 (Share) for share sheet
- [ ] Story 12.8 (Favorites) for save button
- [ ] Story 12.9 (Tags) for tag display
- [ ] Story 12.11 (Notification Toggle)
