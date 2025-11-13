# Icon Differentiation Guide: Favorites vs Follow

## Overview
This guide ensures clear visual distinction between **favoriting** (products/coupons/events) and **following** (businesses).

---

## 🎨 Icon Standards

### ❤️ Favorites (Products, Coupons, Events)
**Table**: `favorites`

| Context | Icon | State | Color | Lucide Icon |
|---------|------|-------|-------|-------------|
| **Products** | ❤️ | Active | Red `#EF4444` | `Heart` (filled) |
| **Products** | 🤍 | Inactive | Gray `#9CA3AF` | `Heart` (outline) |
| **Coupons** | ⭐ | Active | Yellow `#FCD34D` | `Star` (filled) |
| **Coupons** | ☆ | Inactive | Gray `#9CA3AF` | `Star` (outline) |
| **Events** | 📌 | Active | Blue `#3B82F6` | `Bookmark` (filled) |
| **Events** | 📌 | Inactive | Gray `#9CA3AF` | `Bookmark` (outline) |

### 👥 Follow (Businesses)
**Table**: `business_followers`

| Context | Icon | State | Color | Lucide Icon |
|---------|------|-------|-------|-------------|
| **Business** | ✓ | Following | Green `#10B981` | `UserPlus` or `Check` |
| **Business** | + | Not Following | Gray `#9CA3AF` | `UserPlus` (outline) |

---

## 📋 Implementation Examples

### React Components with Lucide Icons

```typescript path=null start=null
import { Heart, Star, Bookmark, UserPlus, Check } from 'lucide-react';

// ❤️ Product Favorite Button
<button onClick={() => toggleFavorite(product)}>
  {isFavorited(product.id) ? (
    <Heart className="fill-red-500 text-red-500" />
  ) : (
    <Heart className="text-gray-400" />
  )}
</button>

// ⭐ Coupon Save Button
<button onClick={() => toggleFavorite(coupon)}>
  {isFavorited(coupon.id) ? (
    <Star className="fill-yellow-400 text-yellow-400" />
  ) : (
    <Star className="text-gray-400" />
  )}
</button>

// 📌 Event Bookmark Button
<button onClick={() => toggleFavorite(event)}>
  {isFavorited(event.id) ? (
    <Bookmark className="fill-blue-500 text-blue-500" />
  ) : (
    <Bookmark className="text-gray-400" />
  )}
</button>

// 👥 Business Follow Button
<button onClick={() => toggleFollow(business.id)}>
  {isFollowing(business.id) ? (
    <>
      <Check className="text-green-500" />
      <span>Following</span>
    </>
  ) : (
    <>
      <UserPlus className="text-gray-400" />
      <span>Follow</span>
    </>
  )}
</button>
```

---

## 🔧 Component Naming Conventions

### Favorites Components
```
src/components/
├── product/
│   └── FavoriteButton.tsx        # ❤️ Heart icon
├── coupon/
│   └── SaveCouponButton.tsx       # ⭐ Star icon
└── event/
    └── BookmarkEventButton.tsx   # 📌 Bookmark icon
```

### Follow Components
```
src/components/
└── following/
    └── FollowButton.tsx          # 👥 UserPlus/Check icon
```

---

## 📊 Button States & Labels

### Favorites (No Text, Icon Only)
```typescript path=null start=null
// Products
<IconButton icon={isFavorited ? "❤️" : "🤍"} aria-label="Favorite" />

// Coupons
<IconButton icon={isFavorited ? "⭐" : "☆"} aria-label="Save coupon" />

// Events
<IconButton icon={isFavorited ? "📌" : "📍"} aria-label="Bookmark event" />
```

### Follow (Icon + Text)
```typescript path=null start=null
// Businesses
<Button>
  {isFollowing ? (
    <>
      <Check className="mr-2" />
      Following
    </>
  ) : (
    <>
      <UserPlus className="mr-2" />
      Follow
    </>
  )}
</Button>
```

---

##  ✅ Function Mapping

### ❤️ Favorites Functions → `favorites` Table

```typescript path=null start=null
// Service
import { simpleFavoritesService } from '@/services/simpleFavoritesService';

// Products
simpleFavoritesService.toggleFavorite('product', productId);
simpleFavoritesService.isFavorited('product', productId);

// Coupons
simpleFavoritesService.toggleFavorite('coupon', couponId);
simpleFavoritesService.isFavorited('coupon', couponId);

// Events
simpleFavoritesService.toggleFavorite('event', eventId);
simpleFavoritesService.isFavorited('event', eventId);
```

### 👥 Follow Functions → `business_followers` Table

```typescript path=null start=null
// Hook
import { useBusinessFollowing } from '@/hooks/useBusinessFollowing';

const { toggleFollow, isFollowing } = useBusinessFollowing();

// Businesses
toggleFollow(businessId);
isFollowing(businessId);
```

---

## 🚫 Common Mistakes to Avoid

### ❌ Wrong: Using Follow icon for favorites
```typescript path=null start=null
// DON'T DO THIS
<UserPlus onClick={() => toggleFavorite(product)} />  // Wrong icon!
```

### ✅ Correct: Use Heart for product favorites
```typescript path=null start=null
<Heart onClick={() => toggleFavorite(product)} />
```

### ❌ Wrong: Using Heart for business following
```typescript path=null start=null
// DON'T DO THIS
<Heart onClick={() => toggleFollow(businessId)} />  // Wrong icon!
```

### ✅ Correct: Use UserPlus for business following
```typescript path=null start=null
<UserPlus onClick={() => toggleFollow(businessId)} />
```

---

## 🎨 Tailwind CSS Classes

```typescript path=null start=null
// Favorites - Heart (Product)
const favoriteClasses = isFavorited
  ? "fill-red-500 text-red-500 hover:scale-110 transition-transform"
  : "text-gray-400 hover:text-red-300 transition-colors";

// Favorites - Star (Coupon)
const saveClasses = isFavorited
  ? "fill-yellow-400 text-yellow-400 hover:scale-110 transition-transform"
  : "text-gray-400 hover:text-yellow-300 transition-colors";

// Favorites - Bookmark (Event)
const bookmarkClasses = isFavorited
  ? "fill-blue-500 text-blue-500 hover:scale-110 transition-transform"
  : "text-gray-400 hover:text-blue-300 transition-colors";

// Follow - UserPlus (Business)
const followClasses = isFollowing
  ? "text-green-500 hover:text-green-600"
  : "text-gray-400 hover:text-green-400";
```

---

## 📱 Mobile vs Desktop

| Feature | Mobile | Desktop |
|---------|--------|---------|
| **Product Favorite** | Icon only (32px) | Icon only (24px) |
| **Coupon Save** | Icon only (32px) | Icon only (24px) |
| **Event Bookmark** | Icon only (32px) | Icon only (24px) |
| **Business Follow** | Icon + Text | Icon + Text |

---

## 🔍 Accessibility

### ARIA Labels
```typescript path=null start=null
// Favorites
<button
  onClick={() => toggleFavorite(product)}
  aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
  aria-pressed={isFavorited}
>
  <Heart />
</button>

// Follow
<button
  onClick={() => toggleFollow(businessId)}
  aria-label={isFollowing ? "Unfollow business" : "Follow business"}
  aria-pressed={isFollowing}
>
  <UserPlus /> {isFollowing ? "Following" : "Follow"}
</button>
```

---

## 🧪 Testing Checklist

- [ ] Product favorite uses ❤️ Heart icon
- [ ] Coupon save uses ⭐ Star icon
- [ ] Event bookmark uses 📌 Bookmark icon
- [ ] Business follow uses 👥 UserPlus icon
- [ ] Product favorites call `simpleFavoritesService.toggleFavorite('product', id)`
- [ ] Coupon favorites call `simpleFavoritesService.toggleFavorite('coupon', id)`
- [ ] Event favorites call `simpleFavoritesService.toggleFavorite('event', id)`
- [ ] Business follows call `useBusinessFollowing().toggleFollow(id)`
- [ ] Icons change state correctly on toggle
- [ ] Correct colors applied (red/yellow/blue for favorites, green for follow)
- [ ] ARIA labels present and correct
- [ ] Mobile and desktop sizes appropriate

---

## 📦 Quick Reference Card

```
┌─────────────────────────────────────────────┐
│  Favorites (favorites table)                │
│  ❤️ Product    → simpleFavoritesService     │
│  ⭐ Coupon     → simpleFavoritesService     │
│  📌 Event      → simpleFavoritesService     │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│  Follow (business_followers table)          │
│  👥 Business   → useBusinessFollowing hook  │
└─────────────────────────────────────────────┘
```

---

## 🚀 Current Implementation (2025-01-20)

### ✅ Products - Favorite Button
**Component**: `<FavoriteProductButton productId={id} variant="icon" />`
- **File**: `src/components/products/FavoriteProductButton.tsx`
- **Hook**: `useFavoriteProduct(productId)` → `src/hooks/useFavoriteProduct.ts`
- **Icon**: `Heart` (Lucide)
- **Color**: Red `#EF4444` when active
- **Table**: `favorites` table (entity_type='product')
- **States**:
  - Inactive: Outline heart, gray `text-gray-400`
  - Active: Filled heart, red `fill-red-500 text-red-500`
  - Loading: Spinner (`Loader2`)
- **Usage Location**: ProductCard.tsx line 226-231

### ✅ Coupons - Collect Button
**Component**: `<CouponCollectButton couponId={id} variant="icon" />`
- **File**: `src/components/coupon/CouponCollectButton.tsx`
- **Hook**: `useUserCoupons().collectCoupon(couponId)`
- **Icon**: `Star` (uncollected) / `Check` (collected)
- **Color**: Yellow `#F59E0B` when collected
- **Table**: `user_coupon_collections` table
- **States**:
  - Inactive: Star icon, gray `text-gray-400`
  - Active: Check icon, yellow `text-yellow-500`
  - Loading: Spinner (`Loader2`)
  - Disabled: When already collected
- **Usage Location**: UnifiedCouponCard.tsx line 157-166

### ✅ Businesses - Follow Button
**Component**: `<FollowButton businessId={id} variant="ghost" showLabel={false} />`
- **File**: `src/components/following/FollowButton.tsx`
- **Hook**: `useBusinessFollowing()` → followBusiness() / unfollowBusiness()
- **Icon**: `UserPlus` (unfollowed) / `UserCheck` (followed)
- **Color**: Indigo `#4F46E5` when following
- **Table**: `business_followers` table (separate from favorites)
- **States**:
  - Unfollowed: `UserPlus` icon, gray
  - Followed: `UserCheck` icon, indigo `text-indigo-600`
  - Loading: Animated spinner
  - Hover (when followed): Shows "Unfollow" text
- **Usage Location**: BusinessCard.tsx line 50-56

---

**Last Updated**: 2025-01-20  
**Status**: ✅ Implemented & Working
