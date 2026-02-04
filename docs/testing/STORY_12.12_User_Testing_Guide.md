# User Testing Guide - Story 12.12: Product Card Grid Update

## 🎯 Goal
Verify that the product list on the Business Profile has been successfully upgraded to an **Instagram-style grid layout**. This includes checking the responsive design (2 columns on mobile, 3 on desktop), the 4:5 aspect ratio images, and the "Sold Out" visual treatment.

## 📋 Prerequisites
1. **Logged in User** (Owner of a business).
2. **Business with Products**: 
   - Ensure the business has at least 5-6 products to test grid wrapping.
   - At least one product should have the `featured` tag.
   - At least one product should have status `sold_out` (or mapped from `is_available: false`).
   - Use the Mobile Creation Flow (Story 12.4) to add new products if needed.

## 🧪 Test Scenarios

### 1. Visual Layout Verification
- [ ] **Navigate to Business Profile**: Open your business profile.
- [ ] **Tab Selection**: Click on the **Products** tab.
- [ ] **Desktop View**: 
    - Verify that products are displayed in a **3-column grid**.
    - Verify that images are rectangular and vertical (**4:5 aspect ratio**).
    - Verify that **ONLY the product name** is visible below the image (no likes/comments/price).
- [ ] **Mobile View** (Use Chrome DevTools -> Toggle Device Toolbar or resize window):
    - Verify that products switch to a **2-column grid**.
    - Verify the gap between items is smaller (12px vs 16px).

### 2. Card Content & Status
- [ ] **Image Display**: Ensure images cover the card area (`object-fit: cover`) and look high-quality.
- [ ] **Sold Out Items**:
    - Find a product marked as "Sold Out".
    - Verify it has a **dark overlay** (50% opacity).
    - Verify a **"SOLD OUT" badge** is centered on the image.
    - Verify the product name is still readable.
- [ ] **Truncation**: 
    - Find a product with a very long name.
    - Verify the name is **truncated** with an ellipsis (...) on a single line.

### 3. Sorting & Ordering
- [ ] **Featured First**:
    - Identify products tagged as "Featured".
    - **Verify**: These products should appear at the **top** of the grid, regardless of creation date.
- [ ] **Newest Next**:
    - Verify that non-featured products follow the featured ones, sorted by **Date Created (Newest first)**.
    - Create a new product and verify it appears immediately after any featured items.

### 4. Interactions
- [ ] **Hover Effect (Desktop)**: Hover over a product card. Verify it scales up slightly (zoom effect).
- [ ] **Click Action**: Click a product card.
    - **Expected**: It should trigger an action (currently logs to console or prepares to open modal). 
    - *Note: The full Modal UI is part of the NEXT story (12.2/12.3).*

### 5. Empty State
- [ ] **Owner View**: 
    - Create a new dummy business or delete all products.
    - Verify "No products yet" message appears.
    - Verify "Add Product" button is visible and works (redirects to creation flow).
- [ ] **Visitor View**:
    - View the empty business as another user.
    - Verify "No products yet" message appears.
    - Verify "Add Product" button is **HIDDEN**.

## 🐛 Troubleshooting
- **Images looking squashed?** Check if `object-fit: cover` is applied and aspect ratio is `4/5`.
- **Grid not wrapping?** Check CSS grid columns (`grid-cols-2`, `grid-cols-3`).
- **"Sold Out" not showing?** Ensure the product status is correctly set to `sold_out` or `is_available: false` in the DB.
