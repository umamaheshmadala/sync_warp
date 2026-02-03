# Story 12.12: Product Card Grid Update

**EPIC**: [EPIC 12 - Instagram-Style Products](../epics/EPIC_12_Instagram_Style_Products.md)  
**Status**: 📋 Ready for Development  
**Priority**: P0  
**Estimate**: 3 points  

---

## User Story

**As a** user browsing a storefront  
**I want to** see products in a clean Instagram-style grid  
**So that** I can quickly scan and find products I like  

---

## Scope

### In Scope
- 4:5 aspect ratio product cards
- Image + name only (no counts on card per Q83)
- Featured products first, then newest
- "Sold Out" visual treatment
- Responsive grid (3 cols desktop, 2 cols mobile)
- Click to open modal

### Out of Scope
- Like/comment/share counts on cards (moved to modal only)
- Manual sorting/filtering
- Infinite scroll (use pagination)

---

## UI/UX Specifications

### Grid Layout

**Desktop (3 columns):**
```
┌──────────┐  ┌──────────┐  ┌──────────┐
│          │  │          │  │          │
│  IMAGE   │  │  IMAGE   │  │  IMAGE   │
│  (4:5)   │  │  (4:5)   │  │  (4:5)   │
│          │  │          │  │          │
├──────────┤  ├──────────┤  ├──────────┤
│ Prod Name│  │ Prod Name│  │ Prod Name│
└──────────┘  └──────────┘  └──────────┘

┌──────────┐  ┌──────────┐  ┌──────────┐
│          │  │██████████│  │          │
│  IMAGE   │  │ SOLD OUT │  │  IMAGE   │
│  (4:5)   │  │██████████│  │  (4:5)   │
│          │  │          │  │          │
├──────────┤  ├──────────┤  ├──────────┤
│ Prod Name│  │ Prod Name│  │ Prod Name│
└──────────┘  └──────────┘  └──────────┘
```

**Mobile (2 columns):**
```
┌───────┐  ┌───────┐
│       │  │       │
│ IMAGE │  │ IMAGE │
│       │  │       │
├───────┤  ├───────┤
│ Name  │  │ Name  │
└───────┘  └───────┘
```

### Card Spacing
- Gap between cards: 12px mobile, 16px desktop
- Padding around grid: 16px

### Product Name
- Single line, truncated with ellipsis
- Font: 14px medium (mobile), 16px medium (desktop)
- Below image, left-aligned

### Sold Out Treatment
- 50% opacity overlay on image
- "SOLD OUT" badge centered on image
- Product name still visible

---

## Acceptance Criteria

### Grid Display
- [ ] Products display in 4:5 aspect ratio cards
- [ ] 3 columns on desktop (>768px)
- [ ] 2 columns on mobile (≤768px)
- [ ] Gap: 12px mobile, 16px desktop
- [ ] First image of product shown

### Card Content
- [ ] Image fills card (object-fit: cover)
- [ ] Product name below image
- [ ] Name truncated if too long
- [ ] NO like/comment/share counts on card

### Ordering
- [ ] Featured products shown first
- [ ] Then sorted by newest (created_at DESC)
- [ ] Sold out products NOT hidden

### Sold Out Products
- [ ] 50% dark overlay on image
- [ ] "SOLD OUT" badge visible
- [ ] Card still clickable
- [ ] Opens modal normally

### Interactions
- [ ] Hover: subtle scale (1.02) on desktop
- [ ] Click: opens product modal
- [ ] Keyboard: Enter opens modal

### Empty State
- [ ] "No products yet" message
- [ ] For owner: "Add your first product" CTA

---

## Component Structure

```
src/components/products/
├── ProductGrid.tsx           # Grid container
├── ProductCard.tsx           # Single card
├── ProductCardImage.tsx      # 4:5 image with sold out overlay
├── ProductCardName.tsx       # Truncated name
└── ProductEmptyState.tsx     # No products message
```

---

## Styling

```css
/* Grid */
.product-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  padding: 16px;
}

@media (min-width: 768px) {
  .product-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
  }
}

/* Card */
.product-card {
  cursor: pointer;
  transition: transform 0.2s ease;
}

.product-card:hover {
  transform: scale(1.02);
}

/* Image container */
.product-card-image {
  position: relative;
  aspect-ratio: 4 / 5;
  overflow: hidden;
  border-radius: 8px;
}

.product-card-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* Sold out overlay */
.sold-out-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
}

.sold-out-badge {
  background: rgba(255, 255, 255, 0.9);
  color: #374151;
  padding: 8px 16px;
  border-radius: 4px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* Name */
.product-card-name {
  margin-top: 8px;
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

@media (min-width: 768px) {
  .product-card-name {
    font-size: 16px;
  }
}
```

---

## Data Fetching

```typescript
const getProductsForGrid = async (businessId: string) => {
  const { data } = await supabase
    .from('products')
    .select('id, name, images, tags, status')
    .eq('business_id', businessId)
    .eq('status', 'published')
    .order('created_at', { ascending: false });
  
  // Sort: featured first, then by date
  return data?.sort((a, b) => {
    const aFeatured = a.tags?.includes('featured') ? 1 : 0;
    const bFeatured = b.tags?.includes('featured') ? 1 : 0;
    return bFeatured - aFeatured;
  });
};
```

---

## Testing Checklist

- [ ] Grid displays correctly on desktop (3 cols)
- [ ] Grid displays correctly on mobile (2 cols)
- [ ] Cards have 4:5 aspect ratio
- [ ] Product name shown, truncated if long
- [ ] No social counts on cards
- [ ] Featured products appear first
- [ ] Sold out products show overlay
- [ ] Click opens modal
- [ ] Hover effect works
- [ ] Empty state displays correctly

---

## Dependencies

- [ ] Story 12.2/12.3 (Modal) for click handler
- [ ] Story 12.9 (Tags) for featured/sold out detection
