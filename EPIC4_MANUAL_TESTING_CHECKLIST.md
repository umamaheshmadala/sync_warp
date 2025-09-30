# Epic 4 E2E Manual Testing Checklist

**Date**: January 2025  
**Tester**: _____________  
**Environment**: Local Development  
**Base URL**: http://localhost:5173

---

## 🎯 Testing Instructions

This checklist provides a structured approach to manually test all Epic 4 features as a real user would interact with the application.

### Prerequisites:
- [ ] Dev server running (`npm run dev`)
- [ ] Supabase backend accessible
- [ ] Browser: Chrome/Edge/Firefox
- [ ] Test user account credentials ready

---

## ✅ Story 4.1: Business Registration & Profiles

### Test 1: Complete Business Registration Workflow

**Objective**: Verify a user can register a new business through the 4-step wizard.

**Steps**:
1. [ ] Navigate to http://localhost:5173
2. [ ] Sign up or log in as a test user
3. [ ] Navigate to Business Registration (`/business/register`)
4. [ ] **Step 1 - Basic Information**:
   - [ ] Fill Business Name: "Test Cafe"
   - [ ] Fill Description: "A wonderful local business"
   - [ ] Select Category: "Restaurant"
   - [ ] Click "Next"
   - [ ] Verify step 2 appears

5. [ ] **Step 2 - Location Details**:
   - [ ] Fill Street: "123 Main Street"
   - [ ] Fill City: "New York"
   - [ ] Fill State: "NY"
   - [ ] Fill ZIP: "10001"
   - [ ] Fill Phone: "(555) 123-4567"
   - [ ] Click "Next"
   - [ ] Verify step 3 appears

6. [ ] **Step 3 - Operating Hours**:
   - [ ] Check "Monday"
   - [ ] Set Open: "09:00"
   - [ ] Set Close: "17:00"
   - [ ] Click "Next"
   - [ ] Verify step 4 appears

7. [ ] **Step 4 - Media & Details**:
   - [ ] Fill Website: "https://testcafe.com"
   - [ ] Fill Tags: "local, organic, fresh"
   - [ ] Click "Submit" or "Register"
   - [ ] Verify success toast appears
   - [ ] Verify redirect to `/business/dashboard`
   - [ ] Verify business appears in dashboard

**Result**: ⬜ PASS / ⬜ FAIL  
**Notes**: _______________________________________  
**Screenshot**: _______________________________________

---

### Test 2: View and Edit Business Profile

**Steps**:
1. [ ] Navigate to `/business/dashboard`
2. [ ] Click on the registered business card
3. [ ] Verify business profile page loads
4. [ ] Verify business details displayed correctly
5. [ ] Click "Edit" button
6. [ ] Update Description: "Updated business description"
7. [ ] Click "Save"
8. [ ] Verify success toast: "Profile updated"
9. [ ] Verify changes persisted (refresh page)

**Result**: ⬜ PASS / ⬜ FAIL  
**Notes**: _______________________________________

---

## ✅ Story 4.2: Product/Service Catalog

### Test 1: Create Product

**Steps**:
1. [ ] Navigate to `/business/products`
2. [ ] Click "Add Product" or "New Product"
3. [ ] Fill Product Name: "Premium Coffee"
4. [ ] Fill Description: "Delicious and fresh product"
5. [ ] Fill Price: "15.99"
6. [ ] Fill Stock/Quantity: "100"
7. [ ] Click "Save" or "Create"
8. [ ] Verify success toast: "Product created"
9. [ ] Verify product appears in catalog

**Result**: ⬜ PASS / ⬜ FAIL  
**Notes**: _______________________________________

---

### Test 2: Edit and Delete Product

**Steps**:
1. [ ] In product catalog, click on first product
2. [ ] Click "Edit"
3. [ ] Change Price to: "25.99"
4. [ ] Click "Save"
5. [ ] Verify success toast
6. [ ] Verify price updated in list
7. [ ] Click "Delete" on the product
8. [ ] Confirm deletion
9. [ ] Verify product removed from list

**Result**: ⬜ PASS / ⬜ FAIL  
**Notes**: _______________________________________

---

## ✅ Story 4.3: Coupon Creation & Management

### Test 1: Create Coupon Through 6-Step Wizard

**Steps**:
1. [ ] Navigate to coupon creation page
2. [ ] **Step 1 - Basic Info**:
   - [ ] Fill Title: "50% Off Special"
   - [ ] Fill Description: "Amazing discount"
   - [ ] Click "Next"

3. [ ] **Step 2 - Discount Details**:
   - [ ] Select Type: "Percentage"
   - [ ] Fill Value: "50"
   - [ ] Click "Next"

4. [ ] **Step 3 - Validity Period**:
   - [ ] Set Valid From: Tomorrow's date
   - [ ] Set Valid Until: +7 days
   - [ ] Click "Next"

5. [ ] **Step 4 - Usage Limits**:
   - [ ] Fill Total Uses: "100"
   - [ ] Fill Per User: "1"
   - [ ] Click "Next"

6. [ ] **Step 5 - Conditions**:
   - [ ] Fill Min Purchase: "25"
   - [ ] Click "Next"

7. [ ] **Step 6 - Review & Submit**:
   - [ ] Review all details
   - [ ] Click "Submit" or "Create Coupon"
   - [ ] Verify success toast
   - [ ] Verify coupon appears in list

**Result**: ⬜ PASS / ⬜ FAIL  
**Notes**: _______________________________________

---

### Test 2: Manage Coupon Status

**Steps**:
1. [ ] Navigate to coupons page
2. [ ] Click on first coupon
3. [ ] Click "Activate" or "Deactivate" button
4. [ ] Verify status changed
5. [ ] Click "Analytics" tab
6. [ ] Verify analytics display (Views, Uses)

**Result**: ⬜ PASS / ⬜ FAIL  
**Notes**: _______________________________________

---

## ✅ Story 4.4: Search & Discovery + Favorites

### Test 1: Search with Filters

**Steps**:
1. [ ] Navigate to home page
2. [ ] Click "Search" link/button
3. [ ] Enter search term: "coffee"
4. [ ] Press Enter or click Search
5. [ ] Verify results display
6. [ ] Click "Filters" button
7. [ ] Select category: "Restaurant"
8. [ ] Verify results filtered

**Result**: ⬜ PASS / ⬜ FAIL  
**Notes**: _______________________________________

---

### Test 2: Add to Favorites

**Steps**:
1. [ ] From search results, find a business
2. [ ] Click favorite/heart icon
3. [ ] Verify toast: "Added to favorites"
4. [ ] Navigate to `/favorites`
5. [ ] Verify business appears in favorites list
6. [ ] Click favorite icon again to remove
7. [ ] Verify removed from favorites

**Result**: ⬜ PASS / ⬜ FAIL  
**Notes**: _______________________________________

---

### Test 3: Location-Based Discovery

**Steps**:
1. [ ] Navigate to `/discover`
2. [ ] Allow location permissions when prompted
3. [ ] Verify "Nearby" or "Near you" text appears
4. [ ] Verify map displays
5. [ ] Verify business markers on map
6. [ ] Click on a business marker
7. [ ] Verify business info popup

**Result**: ⬜ PASS / ⬜ FAIL  
**Notes**: _______________________________________

---

## ✅ Story 4.5: Storefront Pages

### Test 1: View Business Storefront

**Steps**:
1. [ ] Navigate to search or discover page
2. [ ] Click on any business
3. [ ] Verify storefront page loads
4. [ ] Verify tabs visible: About, Products, Coupons
5. [ ] Click "Products" tab
6. [ ] Verify products display
7. [ ] Click "Coupons" tab
8. [ ] Verify coupons display
9. [ ] Click "About" tab
10. [ ] Verify business info displays

**Result**: ⬜ PASS / ⬜ FAIL  
**Notes**: _______________________________________

---

### Test 2: Responsive Design

**Steps**:
1. [ ] Open browser DevTools (F12)
2. [ ] Toggle device toolbar (Ctrl+Shift+M)
3. [ ] **Mobile (375px × 667px)**:
   - [ ] Set viewport to iPhone SE
   - [ ] Verify layout adapts
   - [ ] Verify mobile menu works
   - [ ] Verify content readable

4. [ ] **Tablet (768px × 1024px)**:
   - [ ] Set viewport to iPad
   - [ ] Verify layout adapts
   - [ ] Verify navigation works

5. [ ] **Desktop (1280px × 720px)**:
   - [ ] Set viewport to responsive
   - [ ] Verify full layout
   - [ ] Verify all elements visible

**Result**: ⬜ PASS / ⬜ FAIL  
**Notes**: _______________________________________

---

## ✅ Story 4.6: GPS Check-in System

### Test 1: Check-in Flow

**Steps**:
1. [ ] Navigate to `/checkins`
2. [ ] Allow location permissions
3. [ ] Wait for nearby businesses to load
4. [ ] Verify "Nearby" businesses display
5. [ ] Click "Check In" on a business
6. [ ] Verify location validation message
7. [ ] If within 100m: Verify success
8. [ ] If not nearby: Verify error message
9. [ ] Verify points awarded (if successful)

**Result**: ⬜ PASS / ⬜ FAIL  
**Notes**: _______________________________________

---

### Test 2: View Rewards

**Steps**:
1. [ ] Navigate to `/checkins/rewards`
2. [ ] Verify page loads
3. [ ] Verify points display
4. [ ] Verify achievements list
5. [ ] Verify level progress
6. [ ] Verify rewards history

**Result**: ⬜ PASS / ⬜ FAIL  
**Notes**: _______________________________________

---

### Test 3: Business Analytics

**Steps**:
1. [ ] Log in as business owner
2. [ ] Navigate to `/business/analytics`
3. [ ] Verify analytics page loads
4. [ ] Verify check-in statistics visible
5. [ ] Verify "Check-ins" or "Visitors" metrics
6. [ ] Verify charts/graphs display

**Result**: ⬜ PASS / ⬜ FAIL  
**Notes**: _______________________________________

---

## 🎯 Integration Test: Complete User Journey

### Full Epic 4 Workflow

**Steps**:
1. [ ] **User Registration**: Sign up as business owner
2. [ ] **Business Registration**: Complete 4-step wizard
3. [ ] **Add Products**: Create 2-3 products
4. [ ] **Create Coupons**: Complete 6-step coupon wizard
5. [ ] **View Storefront**: Navigate to public storefront
6. [ ] **Search Testing**: Search for your own business
7. [ ] **Favorites**: Add business to favorites
8. [ ] **Check-in**: Test location features
9. [ ] **Analytics**: View business analytics

**Result**: ⬜ PASS / ⬜ FAIL  
**Time Taken**: _______ minutes  
**Notes**: _______________________________________

---

## 📊 Test Summary

### Overall Results:

| Story | Test | Result | Notes |
|-------|------|--------|-------|
| 4.1 | Business Registration | ⬜ PASS / ⬜ FAIL | |
| 4.1 | Profile Edit | ⬜ PASS / ⬜ FAIL | |
| 4.2 | Create Product | ⬜ PASS / ⬜ FAIL | |
| 4.2 | Edit/Delete Product | ⬜ PASS / ⬜ FAIL | |
| 4.3 | Create Coupon | ⬜ PASS / ⬜ FAIL | |
| 4.3 | Manage Coupon | ⬜ PASS / ⬜ FAIL | |
| 4.4 | Search & Filter | ⬜ PASS / ⬜ FAIL | |
| 4.4 | Favorites | ⬜ PASS / ⬜ FAIL | |
| 4.4 | Location Discovery | ⬜ PASS / ⬜ FAIL | |
| 4.5 | Storefront | ⬜ PASS / ⬜ FAIL | |
| 4.5 | Responsive Design | ⬜ PASS / ⬜ FAIL | |
| 4.6 | Check-in | ⬜ PASS / ⬜ FAIL | |
| 4.6 | Rewards | ⬜ PASS / ⬜ FAIL | |
| 4.6 | Analytics | ⬜ PASS / ⬜ FAIL | |
| Integration | Complete Journey | ⬜ PASS / ⬜ FAIL | |

### Statistics:
- **Total Tests**: 15
- **Passed**: _______
- **Failed**: _______
- **Pass Rate**: _______%

---

## 🐛 Issues Found

### Issue 1:
**Story**: _______  
**Severity**: ⬜ Critical / ⬜ Major / ⬜ Minor  
**Description**: _______________________________________  
**Steps to Reproduce**: _______________________________________  
**Expected**: _______________________________________  
**Actual**: _______________________________________  
**Screenshot**: _______________________________________

### Issue 2:
**Story**: _______  
**Severity**: ⬜ Critical / ⬜ Major / ⬜ Minor  
**Description**: _______________________________________

---

## 📝 Additional Notes

### Performance:
- Page load times: _______
- Form submission speed: _______
- Navigation responsiveness: _______

### Usability:
- User experience: _______
- UI clarity: _______
- Error messages: _______

### Browser Compatibility:
- Chrome: ⬜ Tested / ⬜ Not Tested
- Firefox: ⬜ Tested / ⬜ Not Tested  
- Edge: ⬜ Tested / ⬜ Not Tested
- Safari: ⬜ Tested / ⬜ Not Tested

---

## ✅ Sign-off

**Tester Name**: _______________________  
**Date**: _______________________  
**Signature**: _______________________

**Status**: ⬜ All Tests Passed / ⬜ Tests Failed - Issues Logged

---

**Next Steps**:
- [ ] Address any failed tests
- [ ] Fix reported issues
- [ ] Re-test failed scenarios
- [ ] Update documentation
- [ ] Deploy to production

---

**For Automated Testing**:
Once dev server is running, execute:
```bash
npm run dev              # Terminal 1
npm run test:e2e:headed  # Terminal 2
```

---

**Date Created**: January 2025  
**Version**: 1.0  
**Epic**: Epic 4 - Business Features  
**Total Test Cases**: 15