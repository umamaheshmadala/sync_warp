# Story 12.8: Favorites Integration

**EPIC**: [EPIC 12 - Instagram-Style Products](../epics/EPIC_12_Instagram_Style_Products.md)  
**Status**: 📋 Ready for Development  
**Priority**: P1  
**Estimate**: 3 points  

---

## User Story

**As a** user  
**I want to** save products to my favorites  
**So that** I can easily find them later  

---

## Scope

### In Scope
- Favorite/unfavorite toggle on product modal
- Integration with existing favorites system
- Products appear in existing Favorites page
- Favorite count tracking (optional)

### Out of Scope
- Collections/folders for favorites (Phase 2)
- Public favorites

---

## Technical Specifications

### Existing System

The favorites system already exists:
- `FavoritesPage.tsx` - Displays user's favorites
- `favoritesService.ts` - Backend logic
- `FavoriteProductButton.tsx` - Toggle button
- `useFavorites.ts` - React hook

### Database

Use existing `user_favorites` or create product-specific table:

```sql
-- If extending existing table
-- user_favorites already supports type='product'

-- Or add specific product favorites
CREATE TABLE IF NOT EXISTS product_favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, user_id)
);

CREATE INDEX idx_product_favorites_user ON product_favorites(user_id);
CREATE INDEX idx_product_favorites_product ON product_favorites(product_id);
```

---

## UI/UX Specifications

### Favorite Button States

| State | Icon | Color |
|-------|------|-------|
| Not favorited | ☆ (outline) | Gray |
| Favorited | ⭐ (filled) | Gold/Yellow |
| Loading | Spinner | — |

### Button in Modal

```
❤️ 24   💬 5   🔗   ⭐
                     ^
                     Favorite button (right side)
```

### Animation
- On favorite: Star "pop" animation (scale 1.3x → 1.0x)
- Gold fill transition (150ms)

---

## Acceptance Criteria

### Favorite Toggle
- [ ] ☆ button adds product to favorites
- [ ] ⭐ button removes from favorites
- [ ] Action is optimistic (instant UI update)
- [ ] If action fails, revert with error toast
- [ ] Animation plays on favorite (not unfavorite)

### Favorites Page Integration
- [ ] Favorited products appear in Favorites page
- [ ] Products tab/section shows favorited products
- [ ] Product card in favorites shows image + name
- [ ] Tapping card opens product modal
- [ ] Unfavoriting from page removes immediately

### Persistence
- [ ] Favorites persist across sessions
- [ ] Favorites sync across devices
- [ ] Guest users cannot favorite (prompt login)

---

## Service Layer

### productFavoriteService.ts

```typescript
export const productFavoriteService = {
  async addFavorite(productId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Must be logged in');
    
    await supabase.from('product_favorites').insert({
      product_id: productId,
      user_id: user.id
    });
  },
  
  async removeFavorite(productId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Must be logged in');
    
    await supabase.from('product_favorites')
      .delete()
      .match({ product_id: productId, user_id: user.id });
  },
  
  async isFavorite(productId: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    
    const { data } = await supabase
      .from('product_favorites')
      .select('id')
      .match({ product_id: productId, user_id: user.id })
      .single();
    
    return !!data;
  },
  
  async getUserFavorites(): Promise<Product[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    
    const { data } = await supabase
      .from('product_favorites')
      .select(`
        product:products(*)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    return data?.map(f => f.product) || [];
  },
  
  async toggleFavorite(productId: string): Promise<boolean> {
    const isFav = await this.isFavorite(productId);
    if (isFav) {
      await this.removeFavorite(productId);
      return false;
    } else {
      await this.addFavorite(productId);
      return true;
    }
  }
};
```

---

## Component Structure

```
src/components/products/
├── ProductFavoriteButton.tsx   # Star toggle button
└── hooks/
    └── useProductFavorite.ts   # Favorite state hook

src/components/favorites/
├── FavoriteProductCard.tsx     # Card for favorites page
└── FavoriteProductsList.tsx    # List of favorited products
```

---

## Testing Checklist

- [ ] Favorite a product (star fills)
- [ ] Unfavorite a product (star empties)
- [ ] Animation plays on favorite
- [ ] Product appears in Favorites page
- [ ] Unfavorite from Favorites page
- [ ] Logged out user sees login prompt
- [ ] Favorite persists after refresh
- [ ] Error handling on failure

---

## Dependencies

- [ ] Existing favorites system
- [ ] Existing FavoritesPage.tsx
- [ ] Authentication required
