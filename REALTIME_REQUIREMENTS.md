# Supabase Realtime Requirements

## Overview
This document lists all modules in the SynC project that use Supabase Realtime subscriptions and which database tables must have Realtime enabled.

---

## 📋 Tables That MUST Have Realtime Enabled

### ✅ Priority 1: Critical Features (Enable These First)

#### 1. **`favorites`** table
- **Status**: ⚠️ **CURRENTLY BROKEN** - Must enable ASAP
- **Used by**: Favorites system (most important)
- **Modules**:
  - `src/hooks/useUnifiedFavorites.ts`
  - `src/hooks/useFavorites.ts`
- **Events**: INSERT, UPDATE, DELETE
- **Purpose**: Sync favorite businesses, coupons, and products across tabs/devices
- **Impact**: 
  - Multi-tab sync for favorites
  - Instant favorite button updates
  - Cross-device synchronization

#### 2. **`notifications`** table
- **Status**: ⚠️ Should be enabled
- **Used by**: Notification system
- **Modules**:
  - `src/hooks/useNotifications.ts`
- **Events**: INSERT, UPDATE, DELETE
- **Purpose**: Real-time notification delivery
- **Impact**:
  - Instant notification badges
  - Live notification center updates
  - No need to refresh for new notifications

#### 3. **`business_reviews`** table
- **Status**: ⚠️ Should be enabled
- **Used by**: Review and rating system
- **Modules**:
  - `src/hooks/useReviews.ts`
  - `src/components/reviews/BusinessReviews.tsx`
  - `src/components/reviews/UserReviewsList.tsx`
- **Events**: INSERT, UPDATE, DELETE
- **Purpose**: Live review updates on business pages
- **Impact**:
  - Users see new reviews immediately
  - Rating averages update in real-time
  - Collaborative review experience

---

### ✅ Priority 2: Social Features

#### 4. **`friend_connections`** table
- **Status**: ⚠️ Should be enabled
- **Used by**: Friend management system
- **Modules**:
  - `src/hooks/useNewFriends.ts`
  - `src/hooks/useFriends.ts`
  - `src/services/friendService.ts`
- **Events**: INSERT, UPDATE, DELETE
- **Purpose**: Real-time friend list updates
- **Impact**:
  - Friend accepts appear instantly
  - Removed friends update live
  - Online status changes

#### 5. **`friend_requests`** table
- **Status**: ⚠️ Should be enabled
- **Used by**: Friend request system
- **Modules**:
  - `src/hooks/useNewFriends.ts`
  - `src/hooks/useFriends.ts`
- **Events**: INSERT, UPDATE, DELETE
- **Purpose**: Instant friend request notifications
- **Impact**:
  - See incoming requests immediately
  - Request status updates live

#### 6. **`profiles`** table
- **Status**: ⚠️ Should be enabled (for online status only)
- **Used by**: Friend online status tracking
- **Modules**:
  - `src/hooks/useNewFriends.ts`
- **Events**: UPDATE (specifically `is_online` and `last_active` fields)
- **Purpose**: Track when friends come online/offline
- **Impact**:
  - Live online indicators
  - Last seen timestamps

---

### ⚙️ Priority 3: Optional (Can Enable Later)

#### 7. **`user_wishlist_items`** table
- **Status**: ℹ️ Optional
- **Used by**: Product wishlist feature
- **Modules**:
  - `src/hooks/useFavorites.ts`
- **Events**: INSERT, UPDATE, DELETE
- **Purpose**: Sync wishlist across devices
- **Impact**:
  - Cross-device wishlist sync
  - Multi-tab wishlist updates

---

## 📊 Module Breakdown

### 1. `useUnifiedFavorites.ts` (NEW - Most Important)
**Status**: ⚠️ **BROKEN WITHOUT REALTIME**

```typescript
// Line 271-305
const channel = supabase
  .channel(`favorites_${userId}`)
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'favorites',  // ← NEEDS REALTIME ENABLED
    filter: `user_id=eq.${userId}`
  })
```

**Tables needed**:
- ✅ **`favorites`** (INSERT, UPDATE, DELETE)

**Purpose**: Primary favorites system used throughout the app

---

### 2. `useFavorites.ts` (LEGACY - Still in use)
**Status**: ⚠️ Should enable realtime

```typescript
// Line 753-789
const unifiedFavoritesChannel = supabase
  .channel('favorites')
  .on('postgres_changes', {
    table: 'favorites',  // ← NEEDS REALTIME ENABLED
    filter: `user_id=eq.${user.id}`
  })

const wishlistChannel = supabase
  .channel('user_wishlist_items')
  .on('postgres_changes', {
    table: 'user_wishlist_items',  // ← OPTIONAL
    filter: `user_id=eq.${user.id}`
  })
```

**Tables needed**:
- ✅ **`favorites`** (INSERT, UPDATE, DELETE)
- ℹ️ **`user_wishlist_items`** (optional)

**Purpose**: Legacy favorites hook, still used by some components

---

### 3. `useNotifications.ts`
**Status**: ⚠️ Should enable realtime

```typescript
// Line 203-273
const channel = supabase
  .channel('notifications')
  .on('postgres_changes', {
    event: 'INSERT',
    table: 'notifications',  // ← NEEDS REALTIME ENABLED
    filter: `user_id=eq.${user.id}`
  })
  .on('postgres_changes', {
    event: 'UPDATE',
    table: 'notifications'
  })
  .on('postgres_changes', {
    event: 'DELETE',
    table: 'notifications'
  })
```

**Tables needed**:
- ✅ **`notifications`** (INSERT, UPDATE, DELETE)

**Purpose**: Live notification delivery system

---

### 4. `useReviews.ts`
**Status**: ⚠️ Should enable realtime

```typescript
// Line 158-180
const channel = supabase
  .channel(`business_reviews_${businessId}`)
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'business_reviews',  // ← NEEDS REALTIME ENABLED
    filter: `business_id=eq.${businessId}`
  })
```

**Tables needed**:
- ✅ **`business_reviews`** (INSERT, UPDATE, DELETE)

**Purpose**: Live review updates on business detail pages

---

### 5. `useNewFriends.ts` (NEW Friend System)
**Status**: ⚠️ Should enable realtime

```typescript
// Line 176-220
const friendConnectionsSubscription = supabase
  .channel('friend_connections_changes')
  .on('postgres_changes', {
    event: '*',
    table: 'friend_connections',  // ← NEEDS REALTIME ENABLED
    filter: `user_a_id=eq.${user.id},user_b_id=eq.${user.id}`
  })

const profilesSubscription = supabase
  .channel('profiles_changes')
  .on('postgres_changes', {
    event: 'UPDATE',
    table: 'profiles'  // ← NEEDS REALTIME ENABLED
  })
```

**Tables needed**:
- ✅ **`friend_connections`** (INSERT, UPDATE, DELETE)
- ✅ **`profiles`** (UPDATE - for online status)

**Purpose**: Friend management and online status tracking

---

### 6. `useFriends.ts` (LEGACY Friend System)
**Status**: ⚠️ Should enable realtime (if still in use)

Similar to `useNewFriends.ts` but legacy implementation.

**Tables needed**:
- ✅ **`friend_connections`**
- ✅ **`friend_requests`**

---

### 7. `BusinessReviews.tsx` Component
**Status**: ⚠️ Should enable realtime

```typescript
// Direct realtime subscription in component
const reviewsSubscription = supabase
  .channel(`reviews_${businessId}`)
  .on('postgres_changes', {
    table: 'business_reviews'  // ← NEEDS REALTIME ENABLED
  })
```

**Tables needed**:
- ✅ **`business_reviews`**

---

## 🚀 Quick Enable Checklist

### Step 1: Log into Supabase Dashboard
https://supabase.com/dashboard

### Step 2: Navigate to Replication
Database → Replication

### Step 3: Enable Realtime on These Tables

**Must enable now**:
- [ ] `favorites` ← **CRITICAL** (fixes current issue)
- [ ] `notifications`
- [ ] `business_reviews`

**Should enable soon**:
- [ ] `friend_connections`
- [ ] `friend_requests`
- [ ] `profiles` (for online status)

**Optional (can wait)**:
- [ ] `user_wishlist_items`

---

## 💰 Cost Estimate

### Current Usage Projection:
```
Assumptions:
- 1,000 active users
- Favorites: 10 ops/user/day = 10,000 events/day
- Notifications: 5 ops/user/day = 5,000 events/day
- Reviews: 2 ops/user/day = 2,000 events/day
- Friends: 3 ops/user/day = 3,000 events/day
- Total: ~20,000 events/day

Monthly: 20,000 × 30 = 600,000 events/month
```

**Supabase Limits**:
- Free tier: 2,000,000 events/month ✅ **Well within limit!**
- Pro tier: 5,000,000 events/month

**Verdict**: You can safely enable ALL tables and still stay well within free tier limits.

---

## 🧪 Testing Each Module

### Test Favorites (Priority 1)
```bash
1. Enable `favorites` table realtime
2. Open app in two tabs
3. Favorite a business in Tab 1
4. Tab 2 should update within 1-2 seconds
```

### Test Notifications (Priority 2)
```bash
1. Enable `notifications` table realtime
2. Have another user send you a notification
3. Should appear instantly without refresh
```

### Test Reviews (Priority 2)
```bash
1. Enable `business_reviews` table realtime
2. Open business page in two tabs
3. Post review in Tab 1
4. Tab 2 should show new review immediately
```

### Test Friends (Priority 2)
```bash
1. Enable `friend_connections` and `profiles` realtime
2. Send friend request
3. Accept in another tab/device
4. Should update instantly
```

---

## 📝 Summary

### Tables to Enable (in order of priority):

1. ✅ **`favorites`** - **DO THIS FIRST** (currently broken)
2. ✅ **`notifications`** - Important for UX
3. ✅ **`business_reviews`** - Live review updates
4. ✅ **`friend_connections`** - Friend management
5. ✅ **`friend_requests`** - Friend requests
6. ✅ **`profiles`** - Online status
7. ℹ️ **`user_wishlist_items`** - Optional

### Modules Affected:
- `useUnifiedFavorites.ts` ← **Most Important**
- `useFavorites.ts`
- `useNotifications.ts`
- `useReviews.ts`
- `useNewFriends.ts`
- `useFriends.ts`
- `BusinessReviews.tsx`

### Expected Benefits:
- ✅ Instant cross-tab synchronization
- ✅ Real-time notifications
- ✅ Live review updates
- ✅ Friend online status
- ✅ No manual refresh needed
- ✅ Professional, modern UX

### Cost:
- **FREE** - Well within Supabase free tier limits

---

## 🎯 Recommendation

**Enable all 6 critical tables now** (`favorites`, `notifications`, `business_reviews`, `friend_connections`, `friend_requests`, `profiles`)

**Why?**
1. Takes only 5 minutes total
2. Completely free (within limits)
3. Dramatically improves UX
4. All code already in place
5. No downside

**How long?**
- Per table: ~30 seconds
- Total: ~3-5 minutes

**Just flip the switches and you're done!** 🚀
