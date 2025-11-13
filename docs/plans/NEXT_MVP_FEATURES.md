# Next MVP Features - Priority List

**Updated:** January 17, 2025  
**Status:** Story 4.8 Complete ✅

---

## 🎯 Completed Stories

- ✅ **Story 4.8: Review Display Integration** - Binary reviews already fully integrated in BusinessProfile.tsx

---

## 🔴 CRITICAL MVP Blockers (Priority Order)

### 1. Story 4.7: Product Display & Detail Pages
**Status:** 🔄 **NEEDS IMPLEMENTATION**  
**Priority:** 🔴 CRITICAL  
**Effort:** 3-4 days  
**Dependencies:** Story 4.2 (Product Catalog Backend - Complete)

**What's Missing:**
- ProductGrid component (4 featured products on storefront)
- ProductDetails page (individual product view)
- AllProducts page (full catalog)
- Product favoriting, sharing, wishlist actions

**Why Critical:**
Products are core to the business model. Customers need to see what businesses offer before visiting.

**Nodes Covered:** 11/11 (100% specification ready)

**Files to Create:**
- `src/components/products/ProductGrid.tsx`
- `src/components/products/ProductCard.tsx`
- `src/components/products/ProductDetails.tsx`
- `src/components/products/AllProducts.tsx`
- `src/pages/ProductDetailPage.tsx`

---

### 2. Story 4B.1: Merchant Redemption Interface
**Status:** 🔄 **NEEDS IMPLEMENTATION**  
**Priority:** 🔴 CRITICAL  
**Effort:** 2-3 days  
**Dependencies:** Coupon System (Complete)

**What's Missing:**
- Business owner redemption page (`/business/:id/redeem`)
- QR code scanner for coupon validation
- Manual code entry fallback
- Redemption success/failure states
- Daily redemption analytics

**Why Critical:**
Without this, businesses cannot redeem coupons, breaking the core value proposition.

**Recommended Approach:**
1. Use `html5-qrcode` library for QR scanning
2. Implement manual code entry with validation
3. Add redemption history view
4. Track redemptions for analytics

---

### 3. Story 4B.3: Targeted Campaigns System
**Status:** ✅ **PARTIALLY COMPLETE** - Needs Driver Targeting  
**Priority:** 🔴 CRITICAL (for MVP differentiation)  
**Effort:** 2 days  
**Dependencies:** Driver Algorithm (needs verification)

**What's Missing:**
- Driver targeting UI in campaign creation
- "Top 10% active users" algorithm verification
- Demographics-based targeting filters
- Campaign effectiveness tracking

**Why Critical:**
This is a key differentiator for SynC - letting businesses target their most engaged customers (Drivers).

**Check First:**
- Verify Driver scoring algorithm is implemented
- Check if demographics data collection is complete
- Test if targeted campaigns can filter users correctly

---

## 🟡 Important (Post Critical MVP)

### 4. Story 4.9: Social Sharing Actions
**Priority:** 🟡 MEDIUM  
**Effort:** 2 days  
**Why Lower Priority:** Offer sharing already exists (Story 5.3). This extends to storefronts and products.

### 5. Story 4.10: Storefront Minor Enhancements
**Priority:** 🟢 LOW  
**Effort:** 1 day  
**Why Lower Priority:** Polish and UX improvements, not core functionality.

---

## 📊 Implementation Status Matrix

| Story | Priority | Status | Effort | Backend | Frontend | Integration |
|-------|----------|--------|--------|---------|----------|-------------|
| 4.8 Review Display | 🔴 CRITICAL | ✅ COMPLETE | 0 days | ✅ | ✅ | ✅ |
| 4.7 Product Display | 🔴 CRITICAL | 🔄 TODO | 3-4 days | ✅ | ❌ | ❌ |
| 4B.1 Redemption | 🔴 CRITICAL | 🔄 TODO | 2-3 days | ⚠️ Partial | ❌ | ❌ |
| 4B.3 Campaigns | 🔴 CRITICAL | ⚠️ PARTIAL | 2 days | ⚠️ Verify | ⚠️ Verify | ❌ |
| 4.9 Social Sharing | 🟡 MEDIUM | 🔄 TODO | 2 days | ✅ | ⚠️ Partial | ❌ |
| 4.10 Enhancements | 🟢 LOW | 🔄 TODO | 1 day | N/A | ❌ | ❌ |

---

## 🚀 Recommended Implementation Order

### Week 1: Product Display (Story 4.7)
**Days 1-4:** Implement product display system

**Day 1:**
- Create ProductCard component
- Create ProductGrid component
- Add to BusinessProfile.tsx (after Featured Products section)

**Day 2:**
- Create ProductDetails page
- Implement image gallery with zoom
- Add routing for `/business/:id/product/:productId`

**Day 3:**
- Create AllProducts page
- Add search/filter functionality
- Implement category filtering

**Day 4:**
- Add favoriting, sharing, wishlist actions
- Test full flow
- Add loading/empty/error states

### Week 2: Merchant Redemption (Story 4B.1)
**Days 5-7:** Implement redemption interface

**Day 5:**
- Create redemption page layout
- Implement QR code scanner
- Add manual code entry

**Day 6:**
- Build validation logic
- Add success/failure states
- Implement redemption history

**Day 7:**
- Add analytics tracking
- Test with real coupons
- Fix edge cases

### Week 3: Targeted Campaigns (Story 4B.3)
**Days 8-9:** Complete Driver targeting

**Day 8:**
- Verify Driver algorithm
- Add Driver targeting UI to campaign creator
- Test filtering logic

**Day 9:**
- Add demographics filters
- Test campaign distribution
- Verify effectiveness tracking

---

## ⚠️ Risks & Blockers

### Potential Issues

1. **Product Backend Verification Needed**
   - Verify `business_products` table schema
   - Check if product categories exist
   - Confirm image upload works

2. **Redemption Backend May Need Work**
   - QR code generation for coupons
   - Redemption validation RPC function
   - Anti-fraud measures (prevent double redemption)

3. **Driver Algorithm Uncertainty**
   - Need to verify if Driver scoring is implemented
   - Check if top 10% calculation works per city
   - Test campaign targeting filters

### Mitigation Strategy

For each story:
1. **Check database schema first** (like we did with reviews)
2. **Verify backend services exist** (grep for relevant services)
3. **Look for existing components** (avoid duplicate work)
4. **Test with real data** (seed database if needed)

---

## 📁 Story Files Reference

- ✅ [Story 4.8 - COMPLETE](./stories/STORY_4.8_IMPLEMENTATION_STATUS.md)
- 📄 [Story 4.7 - Product Display](./stories/STORY_4.7_Product_Display_Details.md)
- 📄 [Story 4B.1 - Redemption](./stories/STORY_4B.1_REDEMPTION_DETAILED.md)
- 📄 [Story 4B.3 - Campaigns](./stories/STORY_4B.3_Targeted_Campaigns_System.md)
- 📄 [Story 4.9 - Social Sharing](./stories/STORY_4.9_Social_Sharing_Actions.md)
- 📄 [Story 4.10 - Enhancements](./stories/STORY_4.10_Storefront_Minor_Enhancements.md)

---

## 💡 Quick Start: Story 4.7 (Next Up)

To begin Story 4.7 immediately:

```bash
# 1. Check if products backend is ready
# Verify database table exists
supabase db inspect business_products

# 2. Check existing product components
grep -r "product" src/components/

# 3. Verify product hooks/services
ls src/hooks/useProduct*.ts
ls src/services/product*.ts

# 4. Start implementation
# Create new component files as specified in Story 4.7
```

**Estimated Completion:**
- Story 4.7: 4 days (End of Week 1)
- Story 4B.1: 3 days (Mid Week 2)
- Story 4B.3: 2 days (End of Week 2)

**Total Time:** ~9 days (< 2 weeks)

---

**Next Action:** Begin Story 4.7 - Product Display & Detail Pages

**Command:** 
```bash
# Open the story specification
code docs/stories/STORY_4.7_Product_Display_Details.md

# Start investigation phase (like we did for 4.8)
# Check database schema and existing code first!
```

---

*Priority determined by: MVP criticality, user value, and dependency chain*  
*Updated after Story 4.8 completion investigation*
