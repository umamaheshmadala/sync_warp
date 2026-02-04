# Story 12.9: Tags System

**EPIC**: [EPIC 12 - Instagram-Style Products](../epics/EPIC_12_Instagram_Style_Products.md)  
**Status**: ✅ Done Pending  
**Priority**: P0  
**Estimate**: 5 points  

---

## User Story

**As a** business owner  
**I want to** assign status tags to my products  
**So that** customers can quickly understand product availability and promotions  

---

## Scope

### In Scope
- Tag assignment (up to 3 per product)
- Pill button UI for selection
- Tag colors and emojis
- Mutual exclusivity rules
- Auto-assign "New Arrival" on creation
- Auto-expire "New Arrival" after 14 days
- "Featured" tag shows product on Overview tab
- "Sold Out" grays out product but keeps visible
- Tags visible in modal only (not on grid cards)

### Out of Scope
- Custom tags created by business
- Tag search/filter on storefront

---

## Tag Definitions

| Tag | Emoji | Color (Hex) | Tailwind Class | Behavior |
|-----|-------|-------------|----------------|----------|
| Available | 🟢 | #10B981 | `bg-green-500` | Default if no status tag |
| Featured | ⭐ | #F59E0B | `bg-amber-500` | Shows on Overview tab |
| Hot | 🔥 | #EF4444 | `bg-red-500` | Manual |
| New Arrival | 🆕 | #3B82F6 | `bg-blue-500` | Auto-assigned, expires 14d |
| Pre-Order | 📦 | #8B5CF6 | `bg-purple-500` | Manual |
| Back Order | ⏳ | #EAB308 | `bg-yellow-500` | Manual |
| Low Stock | ⚠️ | #F97316 | `bg-orange-500` | Manual |
| Sale | 🏷️ | #DC2626 | `bg-red-600` | Manual |
| Sold Out | ❌ | #6B7280 | `bg-gray-500` | Grays out product |

---

## Technical Specifications

### Database Schema

```sql
-- Tags stored as TEXT array on products
ALTER TABLE products 
  ADD COLUMN tags TEXT[] DEFAULT '{}',
  ADD COLUMN new_arrival_expires_at TIMESTAMPTZ;

-- Index for featured product queries
CREATE INDEX idx_products_featured ON products USING GIN (tags) WHERE 'featured' = ANY(tags);
```

### Tag Validation

```typescript
const VALID_TAGS = [
  'available', 'featured', 'hot', 'new_arrival',
  'pre_order', 'back_order', 'low_stock', 'sale', 'sold_out'
] as const;

const MUTUALLY_EXCLUSIVE = ['available', 'sold_out', 'back_order'];

const MAX_TAGS = 3;

const validateTags = (tags: string[]): { valid: boolean; error?: string } => {
  // Check max count
  if (tags.length > MAX_TAGS) {
    return { valid: false, error: 'Maximum 3 tags allowed' };
  }
  
  // Check mutual exclusivity
  const exclusiveCount = tags.filter(t => MUTUALLY_EXCLUSIVE.includes(t)).length;
  if (exclusiveCount > 1) {
    return { valid: false, error: 'Available, Sold Out, and Back Order are mutually exclusive' };
  }
  
  // Check valid tags
  const invalid = tags.filter(t => !VALID_TAGS.includes(t as any));
  if (invalid.length > 0) {
    return { valid: false, error: `Invalid tags: ${invalid.join(', ')}` };
  }
  
  return { valid: true };
};
```

---

## UI/UX Specifications

### Tag Selection UI (Business Owner)

```
┌─────────────────────────────────────────────────────────┐
│  Status Tags (select up to 3)                           │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ╭────────────╮  ╭────────────╮  ╭────────────╮        │
│  │ 🟢 Available │  │ ⭐ Featured │  │ 🔥 Hot      │        │
│  ╰────────────╯  ╰────────────╯  ╰────────────╯        │
│       ✓               ✓                                 │
│  ╭─────────────╮  ╭────────────╮  ╭─────────────╮       │
│  │ 🆕 New Arrival│  │ 📦 Pre-Order│  │ ⏳ Back Order│       │
│  ╰─────────────╯  ╰────────────╯  ╰─────────────╯       │
│                                                         │
│  ╭─────────────╮  ╭────────────╮  ╭────────────╮        │
│  │ ⚠️ Low Stock │  │ 🏷️ Sale     │  │ ❌ Sold Out │        │
│  ╰─────────────╯  ╰────────────╯  ╰────────────╯        │
│                                                         │
│  ℹ️ Available, Sold Out, and Back Order cannot be       │
│     combined with each other.                           │
└─────────────────────────────────────────────────────────┘
```

### Tag Display in Modal

```
┌───────────────────────────────────────────────────┐
│  Product Name                                      │
│                                                    │
│  🆕 New Arrival  ⭐ Featured                       │
│  ^^^^^^^^^^^^^^^^^^^^^^^^^^                        │
│  (Tags appear below product name, before desc)    │
└───────────────────────────────────────────────────┘
```

### Selected Tag Pill Style

```css
/* Selected */
.tag-pill-selected {
  @apply px-3 py-1.5 rounded-full text-white font-medium;
  /* Background color varies by tag */
}

/* Unselected */
.tag-pill-unselected {
  @apply px-3 py-1.5 rounded-full bg-gray-100 text-gray-600 border;
}

/* Disabled (mutual exclusion) */
.tag-pill-disabled {
  @apply px-3 py-1.5 rounded-full bg-gray-50 text-gray-300 cursor-not-allowed;
}
```

---

## Acceptance Criteria

### Tag Selection
- [ ] Tags displayed as pill buttons
- [ ] Tapping a pill toggles selection
- [ ] Maximum 3 tags can be selected
- [ ] 4th selection shows error toast
- [ ] If "Sold Out" selected, "Available" and "Back Order" are disabled
- [ ] If "Available" selected, "Sold Out" and "Back Order" are disabled
- [ ] If "Back Order" selected, "Available" and "Sold Out" are disabled
- [ ] Visual distinction: selected vs unselected vs disabled

### Auto "New Arrival"
- [ ] New products auto-assigned "New Arrival" tag
- [ ] `new_arrival_expires_at` set to 14 days from creation
- [ ] Background job removes "New Arrival" after expiry
- [ ] Business owner can manually remove before expiry
- [ ] Business owner can manually re-add "New Arrival"

### Featured Integration
- [ ] Products with "Featured" tag appear on Overview tab
- [ ] Featured products ordered by most recent
- [ ] Max 6 featured products shown on Overview
- [ ] "See all products" link if >6

### Sold Out Behavior
- [ ] Product with "Sold Out" tag is grayed out in grid
- [ ] Product is still clickable/viewable
- [ ] Modal shows full details
- [ ] "Sold Out" badge shown prominently

### Tag Display
- [ ] Tags NOT shown on product grid cards
- [ ] Tags shown in product modal (for all users)
- [ ] Tag pills show emoji + text
- [ ] Tags use correct colors

---

## API Design

### Update Tags
```typescript
const updateTags = async (productId: string, tags: string[]) => {
  const validation = validateTags(tags);
  if (!validation.valid) {
    throw new Error(validation.error);
  }
  
  return supabase
    .from('products')
    .update({ tags })
    .eq('id', productId);
};
```

### Get Featured Products
```typescript
const getFeaturedProducts = async (businessId: string, limit = 6) => {
  return supabase
    .from('products')
    .select('*')
    .eq('business_id', businessId)
    .eq('status', 'published')
    .contains('tags', ['featured'])
    .order('created_at', { ascending: false })
    .limit(limit);
};
```

### Expire New Arrival (Supabase Function)

```sql
-- Run daily via pg_cron
CREATE OR REPLACE FUNCTION expire_new_arrival_tags()
RETURNS void AS $$
BEGIN
  UPDATE products
  SET tags = array_remove(tags, 'new_arrival'),
      new_arrival_expires_at = NULL
  WHERE 'new_arrival' = ANY(tags)
    AND new_arrival_expires_at IS NOT NULL
    AND new_arrival_expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Schedule daily at midnight
SELECT cron.schedule('expire-new-arrivals', '0 0 * * *', 'SELECT expire_new_arrival_tags()');
```

---

## Component Structure

```
src/components/products/
├── ProductTagSelector.tsx     # Pill buttons for selection
├── ProductTagDisplay.tsx      # Read-only tag display in modal
├── ProductTagPill.tsx         # Single tag pill component
└── hooks/
    └── useProductTags.ts      # Tag validation and state
```

---

## Testing Checklist

- [ ] Select up to 3 tags
- [ ] Try to select 4th (blocked with error)
- [ ] Select "Sold Out" (Available and Back Order disabled)
- [ ] Select "Available" (Sold Out and Back Order disabled)
- [ ] New product has "New Arrival" auto-assigned
- [ ] Remove "New Arrival" manually
- [ ] Add "Featured" tag → product on Overview
- [ ] Add "Sold Out" tag → product grayed in grid
- [ ] Tags NOT visible on grid cards
- [ ] Tags visible in modal
- [ ] Tag colors and emojis correct
- [ ] Expiry job removes "New Arrival" after 14 days

---

## Dependencies

- [ ] pg_cron extension for scheduled expiry
- [ ] Products table `tags` column
- [ ] Overview tab component (for Featured display)
