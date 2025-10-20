# Favorites vs Business Followers - Table Separation

## Overview
There are **TWO separate systems** for different purposes:

1. **`favorites`** table - For favoriting products, coupons, events
2. **`business_followers`** table - For following businesses

---

## 📊 Table 1: `favorites` (General Favoriting)

### Purpose
Store user favorites for **products**, **coupons**, and **events** (NOT businesses)

### Schema
```sql
CREATE TABLE favorites (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  entity_type TEXT CHECK (entity_type IN ('product', 'coupon', 'event')),
  entity_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  priority INTEGER DEFAULT 0,
  UNIQUE(user_id, entity_type, entity_id)
);
```

### Used For
- ✅ Favoriting products from catalog
- ✅ Saving coupons for later
- ✅ Marking events as favorites
- ❌ **NOT** for following businesses

### Frontend Access
**Service**: `simpleFavoritesService.ts`
```typescript
import { simpleFavoritesService } from '../services/simpleFavoritesService';

// Add product to favorites
await simpleFavoritesService.addToFavorites('product', productId);

// Check if product is favorited
const isFavorited = await simpleFavoritesService.isFavorited('product', productId);

// Toggle favorite
const added = await simpleFavoritesService.toggleFavorite('product', productId);
```

**Hook**: `useSimpleProductSocial.ts`
```typescript
import { useSimpleProductSocial } from '../hooks/useSimpleProductSocial';

const { toggleFavorite, isFavorited } = useSimpleProductSocial();

// In product component
<button onClick={() => toggleFavorite(product)}>
  {isFavorited(product.id) ? '❤️' : '🤍'}
</button>
```

### Database Functions
```sql
-- Toggle favorite
SELECT toggle_favorite('product', 'product-uuid');

-- Check if favorited
SELECT is_favorited('product', 'product-uuid');
```

---

## 📊 Table 2: `business_followers` (Business Following)

### Purpose
Store user follows for **businesses** with notification preferences

### Schema
```sql
CREATE TABLE business_followers (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  business_id UUID REFERENCES businesses(id),
  followed_at TIMESTAMPTZ DEFAULT NOW(),
  notification_preferences JSONB DEFAULT '{
    "new_posts": true,
    "promotions": true,
    "events": true,
    "important": true
  }',
  is_active BOOLEAN DEFAULT true,
  UNIQUE(user_id, business_id)
);
```

### Used For
- ✅ Following businesses to get updates
- ✅ Managing notification preferences per business
- ✅ Business owner analytics (follower demographics)
- ✅ Sending updates to followers
- ❌ **NOT** for favoriting products/coupons

### Frontend Access
**Hook**: `useBusinessFollowing.ts`
```typescript
import { useBusinessFollowing } from '../hooks/useBusinessFollowing';

const { 
  toggleFollow, 
  isFollowing, 
  followedBusinesses,
  updateNotificationPreferences 
} = useBusinessFollowing();

// Follow a business
await toggleFollow(businessId);

// Check if following
const following = isFollowing(businessId);

// Update notification preferences
await updateNotificationPreferences(businessId, {
  new_posts: true,
  promotions: false,
  events: true,
  important: true
});
```

**Component**: `FollowButton.tsx`
```typescript
import { FollowButton } from '../components/following/FollowButton';

<FollowButton businessId={business.id} />
```

### Related Tables
```sql
-- Updates from businesses
CREATE TABLE follower_updates (
  id UUID PRIMARY KEY,
  business_id UUID REFERENCES businesses(id),
  update_type TEXT,
  title TEXT,
  content TEXT,
  created_at TIMESTAMPTZ
);

-- Notifications to followers
CREATE TABLE follower_notifications (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  update_id UUID REFERENCES follower_updates(id),
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ
);
```

---

## 🔄 Key Differences

| Feature | `favorites` | `business_followers` |
|---------|-------------|---------------------|
| **Purpose** | Save items for later | Follow for updates |
| **Entity Types** | product, coupon, event | business only |
| **Notifications** | ❌ No | ✅ Yes (customizable) |
| **Owner Analytics** | ❌ No | ✅ Yes (demographics) |
| **Feed/Updates** | ❌ No | ✅ Yes (follower feed) |
| **Priority/Notes** | ✅ Yes | ❌ No |
| **Trigger on Insert** | ❌ No | ✅ Yes (increment follower_count) |

---

## 🛠️ When to Use Which?

### Use `favorites` for:
```typescript
// Product pages
<FavoriteButton 
  onClick={() => simpleFavoritesService.toggleFavorite('product', productId)} 
/>

// Coupon cards
<SaveCouponButton
  onClick={() => simpleFavoritesService.toggleFavorite('coupon', couponId)}
/>

// Event cards
<FavoriteEventButton
  onClick={() => simpleFavoritesService.toggleFavorite('event', eventId)}
/>
```

### Use `business_followers` for:
```typescript
// Business profiles
<FollowButton businessId={businessId} />

// Business cards in discovery
<BusinessCard>
  <FollowButton businessId={business.id} />
</BusinessCard>

// Following page
<FollowingPage /> // Shows all followed businesses

// Business owner dashboard
<FollowerAnalyticsDashboard businessId={businessId} />
```

---

## 📁 File Organization

### Favorites System
```
src/
├── services/
│   └── simpleFavoritesService.ts        # Main service
├── hooks/
│   └── useSimpleProductSocial.ts        # Product favoriting hook
└── components/
    └── product/
        └── FavoriteButton.tsx           # Generic favorite button
```

### Business Following System
```
src/
├── hooks/
│   ├── useBusinessFollowing.ts          # Following logic
│   ├── useFollowerAnalytics.ts          # Analytics
│   ├── useFollowerUpdates.ts            # Feed
│   └── useFollowerNotifications.ts      # Notifications
└── components/
    ├── following/
    │   ├── FollowButton.tsx             # Follow button
    │   ├── FollowingPage.tsx            # Following list
    │   ├── NotificationPreferencesModal.tsx
    │   └── FollowerFeed.tsx
    └── business/
        ├── FollowerAnalyticsDashboard.tsx
        └── FollowerList.tsx
```

---

## 🔐 RLS Policies

### `favorites` Table Policies
```sql
-- Users manage their own favorites
CREATE POLICY "own_favorites" ON favorites
  FOR ALL USING (auth.uid() = user_id);
```

### `business_followers` Table Policies
```sql
-- Users manage their own follows
CREATE POLICY "own_follows" ON business_followers
  FOR ALL USING (auth.uid() = user_id);

-- Business owners view their followers
CREATE POLICY "business_owners_view_followers" ON business_followers
  FOR SELECT USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );
```

---

## 🚀 Migration Path

### Step 1: Apply Migration
```bash
# Apply the new favorites table migration
supabase db push
```

### Step 2: Verify Tables Exist
```sql
-- Check favorites table
SELECT * FROM favorites LIMIT 1;

-- Check business_followers table
SELECT * FROM business_followers LIMIT 1;
```

### Step 3: Test Frontend
```typescript
// Test favorites
await simpleFavoritesService.addToFavorites('product', 'uuid');

// Test following
await toggleFollow('business-uuid');
```

---

## 📊 Data Flow Examples

### Example 1: User Favorites a Product
```
User clicks favorite on product page
  ↓
useSimpleProductSocial.toggleFavorite(product)
  ↓
simpleFavoritesService.addToFavorites('product', productId)
  ↓
INSERT INTO favorites (user_id, entity_type='product', entity_id)
  ↓
RLS check: auth.uid() = user_id ✓
  ↓
Row inserted
  ↓
UI updates: Heart icon fills ❤️
```

### Example 2: User Follows a Business
```
User clicks follow on business profile
  ↓
FollowButton → useBusinessFollowing.toggleFollow(businessId)
  ↓
INSERT INTO business_followers (user_id, business_id, notification_preferences)
  ↓
RLS check: auth.uid() = user_id ✓
  ↓
Row inserted
  ↓
TRIGGER: increment businesses.follower_count
  ↓
Realtime broadcast to all subscribers
  ↓
UI updates everywhere:
  - Follow button: "Follow" → "Following"
  - Following page: business card appears
  - Business profile: follower count +1
  - Analytics dashboard: metrics update (if open)
```

---

## ⚠️ Common Mistakes to Avoid

### ❌ Wrong: Using business_followers for products
```typescript
// DON'T DO THIS
await supabase
  .from('business_followers')
  .insert({ user_id, business_id: productId }); // Wrong table!
```

### ✅ Correct: Use favorites for products
```typescript
await simpleFavoritesService.addToFavorites('product', productId);
```

### ❌ Wrong: Using favorites for businesses
```typescript
// DON'T DO THIS
await simpleFavoritesService.addToFavorites('business', businessId); // Wrong!
```

### ✅ Correct: Use business_followers for businesses
```typescript
await toggleFollow(businessId); // From useBusinessFollowing hook
```

---

## 🔍 Debugging

### Check which table should be used:
```typescript
if (type === 'product' || type === 'coupon' || type === 'event') {
  // Use favorites table
  simpleFavoritesService.toggleFavorite(type, id);
} else if (type === 'business') {
  // Use business_followers table
  useBusinessFollowing().toggleFollow(id);
}
```

### Verify data in correct table:
```sql
-- Check favorites (should have products/coupons/events)
SELECT entity_type, COUNT(*) FROM favorites GROUP BY entity_type;

-- Check business_followers (should only have business follows)
SELECT COUNT(*) FROM business_followers;
```

---

## Summary

✅ **Two separate tables for two separate purposes**
✅ **`favorites`** = products, coupons, events (simple saving)
✅ **`business_followers`** = businesses (complex following with notifications)
✅ **Use the right service/hook for the right entity type**
✅ **Clear separation prevents confusion and bugs**
