# Story 12.5: Likes System

**EPIC**: [EPIC 12 - Instagram-Style Products](../epics/EPIC_12_Instagram_Style_Products.md)  
**Status**: ✅ Done  
**Priority**: P0  
**Estimate**: 5 points  

---

## User Story

**As a** user  
**I want to** like products that interest me  
**So that** I can show appreciation and businesses can see engagement  

---

## Scope

### In Scope
- Like/unlike toggle on product modal
- Like count display (public)
- "Liked by [friend names] and X others" format
- Like animation (heart burst)
- Business owner notification on new like
- Database schema for likes
- Real-time count updates

### Out of Scope
- Like count on product grid cards (per Q83)
- "See all who liked" page
- Unlike confirmation

---

## Technical Specifications

### Database Schema

```sql
CREATE TABLE product_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, user_id)
);

-- Index for fast lookup
CREATE INDEX idx_product_likes_product ON product_likes(product_id);
CREATE INDEX idx_product_likes_user ON product_likes(user_id);

-- Denormalized count on products table
ALTER TABLE products ADD COLUMN like_count INTEGER DEFAULT 0;
```

### Like Count Update Trigger

```sql
CREATE OR REPLACE FUNCTION update_product_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE products SET like_count = like_count + 1 WHERE id = NEW.product_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE products SET like_count = like_count - 1 WHERE id = OLD.product_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER product_likes_count_trigger
AFTER INSERT OR DELETE ON product_likes
FOR EACH ROW EXECUTE FUNCTION update_product_like_count();
```

---

## UI/UX Specifications

### Like Button States

| State | Icon | Text |
|-------|------|------|
| Not liked | ♡ (outline) | — |
| Liked | ❤️ (filled red) | — |
| Loading | Spinner | — |

### Like Count Display

```
❤️ 24 likes

Liked by John, Sarah, and 22 others
         ^^^^^^^^^^^^^^^
         (only friends shown)
```

### Animation
- On like: Heart "burst" animation (scale up 1.2x → 1.0x with particles)
- Duration: 300ms
- Consider using Lottie or CSS keyframes

---

## Acceptance Criteria

### Like Action
- [ ] Tapping ♡ adds a like (heart fills red)
- [ ] Tapping ❤️ removes the like (heart empties)
- [ ] Like action is optimistic (instant UI update)
- [ ] If action fails, revert UI and show toast error
- [ ] Animation plays on like (not unlike)

### Like Count
- [ ] Count displays below product image in modal
- [ ] Count updates in real-time when others like
- [ ] Format: "24 likes" (no comma for <1000)
- [ ] Format: "1.2K likes" for >999
- [ ] Count NOT shown on product grid cards

### Friends Who Liked
- [ ] Show "Liked by [friend1], [friend2], and X others"
- [ ] Only show friends (from `friendships` table)
- [ ] If no friends liked, show just count: "24 likes"
- [ ] Max 2 friend names shown + count
- [ ] Friend names are clickable (go to profile)

### Notifications
- [ ] Business owner receives notification when product is liked
- [ ] Notification respects per-product toggle (Story 12.11)
- [ ] Notification format: "{User} liked your product {Name}"
- [ ] Notification includes product thumbnail

### Double-Tap to Like
- [ ] Double-tap on product image triggers like
- [ ] Only works if not already liked
- [ ] Shows heart overlay animation on image

---

## API Design

### Like a Product
```typescript
// POST /rest/v1/product_likes
const like = async (productId: string) => {
  const { error } = await supabase
    .from('product_likes')
    .insert({ product_id: productId, user_id: userId });
};
```

### Unlike a Product
```typescript
// DELETE /rest/v1/product_likes
const unlike = async (productId: string) => {
  const { error } = await supabase
    .from('product_likes')
    .delete()
    .match({ product_id: productId, user_id: userId });
};
```

### Check if Liked
```typescript
// GET /rest/v1/product_likes?product_id=eq.{id}&user_id=eq.{id}
const checkLiked = async (productId: string) => {
  const { data } = await supabase
    .from('product_likes')
    .select('id')
    .match({ product_id: productId, user_id: userId })
    .single();
  return !!data;
};
```

### Get Friends Who Liked
```typescript
// Custom RPC for efficiency
const getFriendsWhoLiked = async (productId: string) => {
  const { data } = await supabase.rpc('get_friends_who_liked_product', {
    p_product_id: productId,
    p_user_id: userId,
    p_limit: 2
  });
  return data; // [{ id, full_name, avatar_url }]
};
```

---

## Service Layer

### productLikeService.ts

```typescript
export const productLikeService = {
  like(productId: string): Promise<ServiceResponse<void>>;
  unlike(productId: string): Promise<ServiceResponse<void>>;
  isLiked(productId: string): Promise<boolean>;
  getLikeCount(productId: string): Promise<number>;
  getFriendsWhoLiked(productId: string, limit?: number): Promise<Friend[]>;
  toggleLike(productId: string): Promise<{ liked: boolean; count: number }>;
};
```

---

## Component Structure

```
src/components/products/
├── ProductLikeButton.tsx      # Heart button with animation
├── ProductLikeCount.tsx       # "24 likes" display
├── ProductLikedBy.tsx         # "Liked by John and 22 others"
└── hooks/
    └── useProductLike.ts      # Like state management
```

---

## Testing Checklist

- [ ] Like a product (heart fills, count increments)
- [ ] Unlike a product (heart empties, count decrements)
- [ ] Like animation plays
- [ ] Like persists after page refresh
- [ ] Like count shows correctly
- [ ] Friends who liked shows friend names
- [ ] Non-friends are hidden from liked-by list
- [ ] Business owner receives notification
- [ ] Double-tap to like works
- [ ] Optimistic update reverts on error
- [ ] Cannot like when logged out (show login prompt)

---

## Dependencies

- [ ] Friendship service (`friendsService.ts`)
- [ ] Notification service (for business owner alerts)
- [ ] Products table `like_count` column
- [ ] Story 12.11 for notification toggle
