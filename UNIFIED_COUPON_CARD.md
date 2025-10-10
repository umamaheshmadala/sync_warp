# Unified Coupon Card Design

## Overview
This document describes the unified coupon card design system implemented across the entire application. All coupon displays now use a single, consistent card design based on the simple, minimal layout from the search page.

## Design Philosophy
- **Single Source of Truth**: One card design for all coupon displays
- **Simple & Minimal**: Clean, easy-to-read layout
- **Consistent UX**: Same look and feel everywhere
- **Easy Maintenance**: Change design once, affects entire app
- **No Inline Actions**: All actions (Redeem, Share, Remove) handled in modal

## Component Location
**Main Component**: `src/components/common/UnifiedCouponCard.tsx`

## Card Structure

### Visual Layout
```
┌─────────────────────────────────────────┐
│  [20% OFF]              [⏰ in 5 days]  │
│                                         │
│  Test Fixed Coupon                      │
│  Testing the database field fixes       │
│                                         │
│  ──────────────────────────────────────  │
│  📍 Test Business          ⭐ 4.5       │
│  (status badge if applicable)           │
└─────────────────────────────────────────┘
```

### Key Features
1. **Discount Badge** (Top Left): Prominent display of discount value
2. **Time Remaining** (Top Right): Shows urgency with color coding
   - Red: Expired
   - Orange: Expiring soon (< 3 days)
   - Gray: Normal expiry
3. **Title & Description**: 2-line clamp for clean layout
4. **Business Info** (Bottom): Business name, rating, and optional status badge
5. **Status Indicators**: Visual grayscale + opacity for expired/redeemed coupons
6. **Collected Badge**: Heart icon with "Saved" text (top right corner)

## Usage Across Application

### 1. Search Page (`src/components/search/CouponCard.tsx`)
- **Variant**: Default
- **Shows**: isCollected badge
- **Props**: 
  - `highlightedTitle` and `highlightedDescription` for search results
  - `onClick` opens coupon details modal

### 2. Wallet Page (`src/components/user/CouponWallet.tsx`)
- **Shows**: Status badge (Active, Expired, Redeemed, Expiring)
- **Props**:
  - `showStatusBadge={true}`
  - `statusText`: Calculated status
  - `isExpired`, `isRedeemed` flags

### 3. Coupon Browser (`src/components/user/CouponBrowser.tsx`)
- **Shows**: isCollected badge
- **Props**:
  - `isCollected` flag
  - `isExpired` calculation

### 4. Favorites Page (`src/components/favorites/FavoritesPage.tsx`)
- **Shows**: isCollected badge
- **Props**:
  - `isCollected` from favorite data
  - `isExpired` calculation

## Component Props

```typescript
interface UnifiedCouponCardProps {
  coupon: UnifiedCouponData;     // Coupon data
  onClick: () => void;            // Click handler (opens modal)
  isExpired?: boolean;            // Manual expired override
  isRedeemed?: boolean;           // Shows redeemed status
  showStatusBadge?: boolean;      // Show status badge
  statusText?: string;            // Status text (Active/Expired/etc)
}
```

## Coupon Data Interface

```typescript
interface UnifiedCouponData {
  id: string;
  title: string;
  description?: string;
  discount_type?: string;         // percentage, fixed_amount, buy_x_get_y, free_item
  discount_value?: number;
  type?: string;                  // Alternative field name
  value?: number;                 // Alternative field name
  valid_until?: string;           // ISO date string
  expires_at?: string;            // Alternative field name
  business_name: string;
  business?: {                    // Optional nested business info
    id?: string;
    business_name: string;
    rating?: number;
  };
  business_rating?: number;       // Alternative field
  isCollected?: boolean;          // Show "Saved" badge
  status?: string;                // Optional status
  highlightedTitle?: string;      // For search results (HTML)
  highlightedDescription?: string; // For search results (HTML)
}
```

## Visual States

### 1. Normal (Active) Coupon
- Full color
- Border: `border-gray-200 hover:border-blue-300`
- Shadow: `hover:shadow-md`
- Time text: Orange (< 3 days) or Gray (normal)

### 2. Expired Coupon
- Grayscale filter applied
- Reduced opacity (60%)
- Time text: Red
- No hover effects

### 3. Redeemed Coupon
- Grayscale filter applied
- Reduced opacity (60%)
- Blue status badge
- No hover effects

### 4. Collected Coupon (Search/Browse)
- Shows green "Saved" badge with heart icon
- Top right corner
- Small rounded badge

### 5. Wallet Status Badge
- Shows current status: ACTIVE, EXPIRED, REDEEMED, EXPIRING
- Color coded:
  - Active: Green
  - Expired: Red
  - Redeemed: Blue
  - Other: Gray

## Action Handling

### All Actions in Modal
- **No inline action buttons** on cards
- Clicking card opens `CouponDetailsModal`
- Modal contains all actions:
  - **Search/Browse**: Collect button
  - **Wallet**: Redeem, Share, Remove buttons
  - Status indicators
  - Full coupon details

### Modal Actions by Context
1. **Search Flow**:
   - `showCollectButton={true}`
   - `showShareButton={true}`
   - `onCollect` handler

2. **Wallet Flow**:
   - `showRedeemButton={true}`
   - `showRemoveButton={true}`
   - `showShareButton={true}`
   - `onRedeem`, `onRemove`, `onShare` handlers

## Benefits

### For Users
- ✅ Consistent experience across app
- ✅ Clear visual hierarchy
- ✅ Easy to scan multiple coupons
- ✅ Status immediately visible
- ✅ No accidental actions (buttons in modal only)

### For Developers
- ✅ Single component to maintain
- ✅ Easy to update design globally
- ✅ Predictable prop interface
- ✅ Type-safe coupon data
- ✅ Handles field name variations (type/discount_type, value/discount_value)

## Future Modifications

To change the coupon card design across the entire app:

1. Edit only: `src/components/common/UnifiedCouponCard.tsx`
2. All pages automatically updated
3. Props interface remains stable
4. No breaking changes needed

## Migration Notes

### Old Components (Deprecated)
- ❌ Custom `CouponWalletCard` in CouponWallet.tsx (removed)
- ❌ Custom `CouponCard` in CouponBrowser.tsx (removed)
- ❌ Custom `CouponCard` in FavoritesPage.tsx (removed)

### New Component
- ✅ `UnifiedCouponCard` from `components/common/`

### Import Statement
```typescript
import { UnifiedCouponCard } from '../common/UnifiedCouponCard';
// or
import { UnifiedCouponCard } from '@/components/common';
```

## Testing Checklist

When modifying the unified card:

- [ ] Test in Search page
- [ ] Test in Wallet page (active, expired, redeemed states)
- [ ] Test in Coupon Browser
- [ ] Test in Favorites page
- [ ] Verify expired styling (grayscale, opacity)
- [ ] Verify status badges
- [ ] Verify time remaining colors
- [ ] Verify onClick opens modal
- [ ] Verify responsive layout
- [ ] Test with/without business rating
- [ ] Test with/without description

## Related Files

- `src/components/common/UnifiedCouponCard.tsx` - Main component
- `src/components/modals/CouponDetailsModal.tsx` - Action modal
- `src/components/search/CouponCard.tsx` - Search wrapper
- `src/components/user/CouponWallet.tsx` - Wallet usage
- `src/components/user/CouponBrowser.tsx` - Browser usage
- `src/components/favorites/FavoritesPage.tsx` - Favorites usage
