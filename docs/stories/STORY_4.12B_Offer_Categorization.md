# Story 4.12B: Offer Categorization & Enhanced UX

**Epic**: Epic 4 - Business Features  
**Parent Story**: Story 4.12 - Business Offers Management  
**Status**: 📝 FULLY SPECIFIED  
**Priority**: 🔴 HIGH - Significantly improves merchant and customer experience  
**Effort Estimate**: 5-7 days  

---

## Overview

Transform the current "blank canvas" offer creation flow into a **guided, categorized selection system** based on 86 standardized Indian market offer types across 16 categories.

### Goals
1. **For Merchants**: Creating an offer becomes like selecting from a menu — pick a category, pick an offer type, and the system auto-selects the appropriate category icon. "Cake walk."
2. **For Customers**: Seeing an offer card with a recognizable category icon and offer type badge gives instant clarity without reading fine print.

---

## User Stories

### Merchant Experience
- 📝 As a business owner, I want to select an offer category from a dropdown (e.g., "Product-based / BOGO")
- 📝 As a business owner, I want to select an offer type from a filtered dropdown (e.g., "Buy One Get One Free")
- 📝 As a business owner, I want the system to automatically assign the correct category icon to my offer
- 📝 As a business owner, I want to see "Popular" tags on frequently-used offer types
- 📝 As a business owner, I want my offer creation to be quick and intuitive with pre-defined options
- 📝 As a business owner, I can only create offers from the catalog (no custom types)

### Customer Experience
- 📝 As a customer, I want to see a category icon on each offer card for quick identification
- 📝 As a customer, I want to see an offer type badge (e.g., "BOGO", "Flash Sale") on offer cards
- 📝 As a customer, I want to see a "Trending" badge on popular offers
- 📝 As a customer, I do NOT see expired offers (only the merchant sees them for management)

### Admin Experience
- 📝 As an admin, I want to manage offer categories and types via an admin panel
- 📝 As an admin, I want to add new categories/types without code changes
- 📝 As an admin, I want to toggle categories/types active/inactive

---

## Data Model

### New Table: `offer_categories`

```sql
CREATE TABLE offer_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,           -- e.g., "Product-based / BOGO"
  icon_name TEXT NOT NULL,             -- Lucide icon name, e.g., "gift"
  display_order INT DEFAULT 0,         -- For sorting in dropdowns
  is_active BOOLEAN DEFAULT true,      -- Allow disabling without deletion
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS Policies
ALTER TABLE offer_categories ENABLE ROW LEVEL SECURITY;

-- Everyone can read active categories
CREATE POLICY "Anyone can view active categories"
  ON offer_categories FOR SELECT
  USING (is_active = true);

-- Only admins can manage categories
CREATE POLICY "Admins can manage categories"
  ON offer_categories FOR ALL
  USING (auth.jwt() ->> 'role' = 'admin');
```

### New Table: `offer_types`

```sql
CREATE TABLE offer_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES offer_categories(id) ON DELETE CASCADE,
  offer_name TEXT NOT NULL,            -- e.g., "Buy One Get One Free"
  description TEXT,                    -- Explanation of the mechanic
  example TEXT,                        -- Indian market context example
  frequency TEXT,                      -- "Very frequently", "Frequently", "Less frequently", "Almost never"
  display_order INT DEFAULT 0,         -- For sorting (popular first)
  is_active BOOLEAN DEFAULT true,      -- Allow disabling without deletion
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookup
CREATE INDEX idx_offer_types_category ON offer_types(category_id);
CREATE INDEX idx_offer_types_frequency ON offer_types(frequency);

-- RLS Policies
ALTER TABLE offer_types ENABLE ROW LEVEL SECURITY;

-- Everyone can read active offer types
CREATE POLICY "Anyone can view active offer types"
  ON offer_types FOR SELECT
  USING (is_active = true);

-- Only admins can manage offer types
CREATE POLICY "Admins can manage offer types"
  ON offer_types FOR ALL
  USING (auth.jwt() ->> 'role' = 'admin');
```

### Modified Table: `offers` (Add Foreign Key)

```sql
ALTER TABLE offers
ADD COLUMN offer_type_id UUID REFERENCES offer_types(id);

-- Backfill existing offers with NULL (legacy offers)
-- These will display with a generic icon/badge
```

---

## Category-to-Icon Mapping (Lucide Icons)

| Category | Lucide Icon | Reasoning |
|----------|-------------|-----------|
| Product-based / BOGO | `repeat` | Represents "get another" concept |
| Bundles & Combos | `package` | Bundle/package imagery |
| Quantity / Volume | `layers` | Multiple layers = bulk |
| Price-based | `percent` | Direct discount association |
| Cashback & Wallet | `wallet` | Wallet/money back |
| Cart / Order-based | `shopping-cart` | Cart-related offers |
| Customer Segment | `users` | Target audience |
| Time-based | `clock` | Time-limited offers |
| Coupon / Promo-based | `ticket` | Coupon/voucher imagery |
| Psychological Pricing | `tag` | Price tag manipulation |
| Channel / Payment-based | `credit-card` | Payment method |
| Gifts & Freebies | `gift` | Free gifts |
| Subscription | `calendar` | Recurring payments |
| Value-added | `plus-circle` | Added value |
| Special / Risk-Free | `shield` | Trust/safety |
| Gamified / Engagement | `zap` | Energy/engagement |

---

## Trending Badge Logic

An offer is marked as "Trending" if:

```sql
-- Trending = (views + shares * 2) in last 7 days > threshold
-- Shares are weighted 2x because they indicate stronger engagement

CREATE OR REPLACE FUNCTION is_offer_trending(offer_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  recent_views INT;
  recent_shares INT;
  trending_score INT;
  threshold INT := 50; -- Configurable
BEGIN
  -- Get views in last 7 days (from offer's view_count or a views table)
  SELECT COALESCE(view_count, 0) INTO recent_views
  FROM offers
  WHERE id = offer_id;
  
  -- Get shares in last 7 days
  SELECT COALESCE(share_count, 0) INTO recent_shares
  FROM offers
  WHERE id = offer_id;
  
  trending_score := recent_views + (recent_shares * 2);
  
  RETURN trending_score > threshold;
END;
$$ LANGUAGE plpgsql;
```

---

## UI Component Changes

### 1. CreateOfferForm.tsx - Category/Type Selection

**Current Flow**: Merchant types everything manually.

**New Flow**:
1. **Step 0 (New)**: Category Selection
   - Dropdown showing all 16 categories
   - Each category shows its Lucide icon
   - Categories sorted by `display_order`

2. **Step 1 (New)**: Offer Type Selection
   - Dropdown filtered by selected category
   - Shows offer types with "Popular" badge for high-frequency items
   - Offer types sorted: "Very frequently" → "Frequently" → "Less frequently" → "Almost never"

3. **Step 2 (Existing)**: Offer Details
   - Title (pre-filled from offer_type.offer_name, editable)
   - Description (optional, can reference offer_type.description)
   - Valid dates

4. **Step 3 (Existing)**: Review & Publish

### 2. OfferCard.tsx - Enhanced Display

**Current Display**: Title, Description, Code, Validity, Status.

**New Display**:
- **Category Icon**: Lucide icon in top-left corner (from offer_type → offer_category → icon_name)
- **Offer Type Badge**: Chip/badge below title (e.g., "BOGO", "Flash Sale")
- **Trending Badge**: Flame or trending icon if `is_offer_trending()` returns true
- **Remove expired offers from consumer view**: Only merchant sees expired offers

### 3. FeaturedOffers.tsx - Consumer View Filtering

```tsx
// Filter out expired offers for consumers
const visibleOffers = isOwner 
  ? sortedOffers // Merchants see all
  : sortedOffers.filter(o => !isOfferExpired(o)); // Consumers see active only
```

---

## Seed Data

Import all 86 rows from `docs/site_data_imports/indian_market_offers_catalog.csv` into `offer_types` table, grouped by the 16 categories in `offer_categories`.

---

## Migration Strategy for Existing Offers

1. **Legacy Offers** (existing offers without `offer_type_id`):
   - Display with a generic icon (e.g., `tag`)
   - Display with badge "Special Offer"
   - Merchant can optionally edit offer to assign a category

2. **No Data Loss**: All existing offers remain functional.

---

## Implementation Phases

### Phase 1: Database Setup (1 day)
- [ ] Create `offer_categories` table
- [ ] Create `offer_types` table
- [ ] Add `offer_type_id` column to `offers` table
- [ ] Seed data from CSV
- [ ] Create `is_offer_trending()` function
- [ ] Apply RLS policies

### Phase 2: CreateOfferForm Enhancement (2 days)
- [ ] Add category dropdown (Step 0)
- [ ] Add offer type dropdown (Step 1, filtered by category)
- [ ] Update progression logic (4 steps instead of 3)
- [ ] Pre-fill title from selected offer type
- [ ] Add "Popular" badges to frequently-used types

### Phase 3: OfferCard Enhancement (1 day)
- [ ] Add category icon display
- [ ] Add offer type badge
- [ ] Implement trending badge logic
- [ ] Hide expired offers from consumer view

### Phase 4: Admin Panel (Optional, Phase II) (2+ days)
- [ ] Category management CRUD
- [ ] Offer type management CRUD
- [ ] Activation/deactivation toggles
- [ ] Display order management

---

## Dependencies

- ✅ Story 4.12: Business Offers Management (base implementation exists)
- ✅ Lucide icons already integrated in project
- ✅ `offers` table already has `view_count` and `share_count` columns

---

## Out of Scope (Phase II)

- Terms & Conditions auto-suggestions
- Business category filtering for offer types
- Multi-language support

---

## Acceptance Criteria

1. ✅ Merchant can create an offer by selecting category → offer type in < 30 seconds
2. ✅ Category icon automatically appears on offer card
3. ✅ Offer type badge appears on offer card
4. ✅ "Popular" tags shown on frequently-used offer types
5. ✅ Trending badge appears on high-engagement offers
6. ✅ Expired offers hidden from consumer view
7. ✅ Legacy offers display with generic icon/badge
8. ✅ No data loss during migration

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/offers/CreateOfferForm.tsx` | Add category/type selection steps |
| `src/components/offers/OfferCard.tsx` | Add icon, badge, trending UI |
| `src/components/business/FeaturedOffers.tsx` | Filter expired for consumers |
| `src/hooks/useOffers.ts` | Fetch offer types, join with category |
| `src/types/offers.ts` | Add `OfferCategory`, `OfferType` interfaces |
| `supabase/migrations/` | New migration for tables |

---

## Document History

| Date | Author | Changes |
|------|--------|---------|
| 2026-01-07 | AI Assistant | Initial specification based on user requirements |

