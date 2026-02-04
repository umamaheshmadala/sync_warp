# Story 12.11: Per-Product Notification Toggle

**EPIC**: [EPIC 12 - Instagram-Style Products](../epics/EPIC_12_Instagram_Style_Products.md)  
**Status**: ⚠️ Completed (Notification Delivery Failing)  
**Priority**: P1  
**Estimate**: 3 points  

---

## User Story

**As a** business owner  
**I want to** disable notifications for specific products  
**So that** I'm not overwhelmed by notifications on viral products  

---

## Scope

### In Scope
- Toggle switch in product modal (owner only)
- Per-product notification preference
- Check preference before sending notifications
- Default: enabled

### Out of Scope
- Notification type filtering (likes vs comments)
- Scheduled quiet hours
- Notification sound customization

---

## Technical Specifications

### Database

```sql
-- Already added in Story 12.13
ALTER TABLE products 
  ADD COLUMN notifications_enabled BOOLEAN DEFAULT TRUE;
```

### Notification Check

```typescript
// Before sending any product notification
const shouldNotify = async (productId: string): Promise<boolean> => {
  const { data } = await supabase
    .from('products')
    .select('notifications_enabled')
    .eq('id', productId)
    .single();
  
  return data?.notifications_enabled ?? true;
};
```

---

## UI/UX Specifications

### Toggle Location (Modal Footer)

```
┌───────────────────────────────────────────────┐
│  (Product Modal Content)                      │
├───────────────────────────────────────────────┤
│  🔔 Notifications for this product            │
│                                               │
│     [●───] ON                                 │
│                                               │
│  When enabled, you'll receive notifications   │
│  for likes and comments on this product.      │
└───────────────────────────────────────────────┘
```

### States

| State | Display |
|-------|---------|
| Enabled (default) | Toggle ON, "ON" label |
| Disabled | Toggle OFF, "OFF" label |
| Loading | Toggle disabled, spinner |

### Visibility

- Only visible to business owner
- Hidden from other users
- Hidden on own products if not owner context

---

## Acceptance Criteria

### Toggle Display
- [ ] Toggle shown only to product owner
- [ ] Default state is ON (enabled)
- [ ] Toggling immediately saves to database
- [ ] Shows loading state during save
- [ ] Helper text explains functionality

### Notification Behavior
- [ ] When OFF: No notifications for likes on this product
- [ ] When OFF: No notifications for comments on this product
- [ ] When ON: Normal notification behavior
- [ ] Toggle state persists across sessions

### Integration
- [ ] Like notification checks toggle before sending
- [ ] Comment notification checks toggle before sending
- [ ] Reply notification still sent (not product-specific)

---

## Service Layer

### productNotificationService.ts

```typescript
export const productNotificationService = {
  async updateNotificationSetting(productId: string, enabled: boolean): Promise<void> {
    await supabase
      .from('products')
      .update({ notifications_enabled: enabled })
      .eq('id', productId);
  },
  
  async isNotificationEnabled(productId: string): Promise<boolean> {
    const { data } = await supabase
      .from('products')
      .select('notifications_enabled')
      .eq('id', productId)
      .single();
    
    return data?.notifications_enabled ?? true;
  },
  
  // Call this before sending any product notification
  async shouldSendNotification(productId: string, businessOwnerId: string): Promise<boolean> {
    // Check product-level toggle
    const enabled = await this.isNotificationEnabled(productId);
    if (!enabled) return false;
    
    // Check user's global notification settings
    const globalEnabled = await userNotificationSettingsService.isEnabled(businessOwnerId, 'product_activity');
    return globalEnabled;
  }
};
```

### Notification Trigger Update

```typescript
// In like handler
const handleProductLike = async (productId: string, likerId: string) => {
  // ... create like ...
  
  const product = await getProduct(productId);
  const shouldNotify = await productNotificationService.shouldSendNotification(
    productId, 
    product.business.owner_id
  );
  
  if (shouldNotify) {
    await sendNotification(product.business.owner_id, {
      type: 'product_like',
      title: `${likerName} liked your product`,
      body: product.name,
      data: { productId }
    });
  }
};
```

---

## Component Structure

```
src/components/products/
├── ProductNotificationToggle.tsx   # Toggle with label
└── hooks/
    └── useProductNotificationSetting.ts
```

---

## Testing Checklist

- [ ] Toggle visible to product owner
- [ ] Toggle hidden from non-owners
- [ ] Default state is ON
- [ ] Toggle saves immediately
- [ ] Loading state shown during save
- [ ] When OFF: no like notifications
- [ ] When OFF: no comment notifications
- [ ] When ON: notifications work
- [ ] Setting persists after refresh

---

## Dependencies

- [ ] Story 12.5 (Likes) for like notifications
- [ ] Story 12.6 (Comments) for comment notifications
- [ ] Notification service integration
