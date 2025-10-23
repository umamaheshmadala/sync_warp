# E2E Notification Flow Testing Guide

**Test Suite:** Story 4.11 - Follow Business Notifications  
**Priority:** 🔴 CRITICAL  
**Estimated Time:** 1 hour  
**Prerequisites:** Local dev server running, 2 test accounts (customer + business owner)

---

## 🎯 Test Objectives

Verify that the complete notification system works end-to-end:
1. Notifications are created when businesses post content
2. Users see notifications in the bell icon
3. Notification preferences are respected
4. Real-time updates work correctly
5. Mark as read functionality works

---

## 📋 Pre-Test Setup

### 1. Start Development Server
```bash
cd C:\Users\umama\Documents\GitHub\sync_warp
npm run dev
```

### 2. Test Accounts Needed
- **Customer Account:** `test-customer@example.com` / password
- **Business Owner Account:** `test-business@example.com` / password

### 3. Browser Setup
- **Primary Browser:** Chrome/Edge (for customer)
- **Secondary Browser:** Chrome Incognito or Firefox (for business owner)
- Clear cache and cookies before starting

### 4. Database Access (Optional)
- Supabase Dashboard: https://app.supabase.com
- Project: sync_warp
- Access SQL Editor for verification queries

---

## 🧪 Test Scenario A: New Product Notification Flow

### Objective
Verify that when a business posts a new product, followers receive a notification.

### Steps

#### Part 1: Customer Follows Business (Primary Browser)

1. **Navigate to login page**
   ```
   URL: http://localhost:5173/auth/login
   ```

2. **Login as customer**
   - Email: `test-customer@example.com`
   - Password: `[your-password]`
   - Click "Sign In"

3. **Navigate to business profile**
   ```
   URL: http://localhost:5173/business/[business-id]
   ```
   *Note: Replace [business-id] with actual test business ID*

4. **Click "Follow" button**
   - ✅ **Expected:** Button changes to "Following"
   - ✅ **Expected:** Button changes color (e.g., blue to gray)
   - ✅ **Expected:** Notification bell shows no badge yet

5. **Verify Following page**
   ```
   URL: http://localhost:5173/following
   ```
   - ✅ **Expected:** Business appears in the followed businesses list
   - ✅ **Expected:** Business name, image, and stats are visible

#### Part 2: Business Owner Posts Product (Secondary Browser/Incognito)

6. **Open incognito/private browser window**

7. **Navigate to login page**
   ```
   URL: http://localhost:5173/auth/login
   ```

8. **Login as business owner**
   - Email: `test-business@example.com`
   - Password: `[your-password]`
   - Click "Sign In"

9. **Navigate to products page**
   ```
   URL: http://localhost:5173/business/dashboard
   ```
   - Click "Products" or navigate to product management

10. **Create new product**
    - Click "Add New Product" button
    - Fill in product details:
      ```
      Name: Test Product E2E
      Description: This is a test product for E2E notification testing
      Price: ₹999
      Category: [Select any]
      Stock: 10
      ```
    - Click "Create Product" or "Save"
    - ✅ **Expected:** Product created successfully
    - ✅ **Expected:** Success message appears

#### Part 3: Customer Receives Notification (Primary Browser)

11. **Switch back to customer browser** (keep it on Following page)

12. **Check notification bell** (top right header)
    - ✅ **Expected:** Red badge appears with number "1"
    - ✅ **Expected:** Badge is visible and animated

13. **Click notification bell icon**
    - ✅ **Expected:** Dropdown opens showing notifications
    - ✅ **Expected:** Notification shows:
      ```
      [Business Name] added a new product
      "Test Product E2E"
      [Timestamp: "Just now" or "1 minute ago"]
      ```

14. **Click on the notification**
    - ✅ **Expected:** Navigates to the product page or business page
    - ✅ **Expected:** Notification badge decreases to "0"
    - ✅ **Expected:** Notification marked as read (appears in different style)

### Database Verification (Optional)

```sql
-- Check follower_updates table
SELECT * FROM follower_updates 
WHERE business_id = '[business-uuid]' 
AND update_type = 'new_product'
ORDER BY created_at DESC LIMIT 1;
-- Expected: 1 row with product details

-- Check follower_notifications table
SELECT * FROM follower_notifications 
WHERE user_id = '[customer-uuid]' 
AND business_id = '[business-uuid]'
ORDER BY created_at DESC LIMIT 1;
-- Expected: 1 row with notification details
-- is_read should be TRUE after clicking
```

### ✅ Pass Criteria
- [ ] Follow button works
- [ ] Product creation succeeds
- [ ] Notification appears in real-time (within 5 seconds)
- [ ] Badge shows correct count
- [ ] Clicking notification navigates correctly
- [ ] Notification marked as read

---

## 🧪 Test Scenario B: Notification Preferences

### Objective
Verify that notification preferences are respected and users don't receive notifications they've disabled.

### Steps

#### Part 1: Disable Product Notifications (Primary Browser - Customer)

1. **Navigate to Following page**
   ```
   URL: http://localhost:5173/following
   ```

2. **Find the test business card**
   - Locate business in the list

3. **Click settings/gear icon** on the business card
   - ✅ **Expected:** Notification preferences modal opens

4. **Disable "New Products" notifications**
   - Find "New Products" toggle
   - Click to disable (OFF position)
   - ✅ **Expected:** Toggle changes to OFF/gray

5. **Keep other notifications enabled**
   - "New Offers": ON
   - "New Coupons": ON
   - "Announcements": ON

6. **Click "Save" button**
   - ✅ **Expected:** Modal closes
   - ✅ **Expected:** Success message appears

#### Part 2: Business Posts Another Product (Secondary Browser - Business Owner)

7. **Return to business owner browser**

8. **Create another product**
   - Name: `Test Product E2E #2`
   - Description: `Second test product`
   - Price: ₹1499
   - Click "Create Product"
   - ✅ **Expected:** Product created successfully

#### Part 3: Verify NO Notification (Primary Browser - Customer)

9. **Return to customer browser**

10. **Wait 10 seconds**

11. **Check notification bell**
    - ✅ **Expected:** NO new badge appears
    - ✅ **Expected:** Badge remains at "0"

12. **Click notification bell to verify**
    - ✅ **Expected:** No new notification for "Test Product E2E #2"
    - ✅ **Expected:** Previous notifications still visible

#### Part 4: Test Enabled Notification Type (Business Posts Offer)

13. **Return to business owner browser**

14. **Create new offer/coupon** (notification enabled)
    - Navigate to offers or coupons page
    - Create new offer:
      ```
      Title: Test Offer E2E
      Discount: 50% OFF
      Valid Until: [Future date]
      ```
    - Click "Create"

15. **Return to customer browser**

16. **Check notification bell**
    - ✅ **Expected:** Badge appears with "1"
    - ✅ **Expected:** Notification shows for the offer
    - ✅ **Expected:** Notification title: "[Business] created a new offer"

### Database Verification (Optional)

```sql
-- Check notification_preferences in business_followers
SELECT notification_preferences 
FROM business_followers 
WHERE user_id = '[customer-uuid]' 
AND business_id = '[business-uuid]';
-- Expected: {"new_products": false, "new_offers": true, "new_coupons": true, "announcements": true}

-- Verify no notification created for product
SELECT COUNT(*) FROM follower_notifications 
WHERE user_id = '[customer-uuid]' 
AND notification_type = 'new_product'
AND created_at > NOW() - INTERVAL '5 minutes';
-- Expected: 0

-- Verify notification created for offer
SELECT COUNT(*) FROM follower_notifications 
WHERE user_id = '[customer-uuid]' 
AND notification_type = 'new_offer'
AND created_at > NOW() - INTERVAL '5 minutes';
-- Expected: 1
```

### ✅ Pass Criteria
- [ ] Preferences modal opens and saves
- [ ] Product notification NOT received when disabled
- [ ] Offer notification IS received when enabled
- [ ] Database reflects correct preferences

---

## 🧪 Test Scenario C: Multiple Notifications

### Objective
Verify that users can receive multiple notifications from different businesses and mark all as read.

### Steps

#### Part 1: Follow Multiple Businesses (Primary Browser - Customer)

1. **Follow 2-3 additional businesses**
   - Navigate to search or business discovery
   - Follow Business A, Business B, Business C
   - ✅ **Expected:** All businesses show "Following" state

2. **Verify on Following page**
   ```
   URL: http://localhost:5173/following
   ```
   - ✅ **Expected:** All 3-4 businesses listed

#### Part 2: Multiple Businesses Post Content (Use different browsers/tabs as needed)

3. **Business A posts product**
   - Create product: "Product from Business A"

4. **Business B posts offer**
   - Create offer: "Offer from Business B"

5. **Business C posts coupon**
   - Create coupon: "Coupon from Business C"

#### Part 3: Verify Multiple Notifications (Primary Browser - Customer)

6. **Check notification bell**
   - ✅ **Expected:** Badge shows "3" (or total unread count)

7. **Click notification bell**
   - ✅ **Expected:** Dropdown shows all 3 notifications
   - ✅ **Expected:** Notifications are listed newest first
   - ✅ **Expected:** Each notification shows business name and content

8. **Scroll through notifications**
   - ✅ **Expected:** All notifications visible
   - ✅ **Expected:** Scrolling works smoothly

#### Part 4: Mark All as Read

9. **Click "Mark all as read" button** (in dropdown)
   - ✅ **Expected:** Button is visible at top/bottom of dropdown
   - ✅ **Expected:** All notifications change appearance (lighter/grayed)
   - ✅ **Expected:** Badge disappears or shows "0"

10. **Close and reopen dropdown**
    - ✅ **Expected:** Notifications still marked as read
    - ✅ **Expected:** Badge remains at "0"

### Database Verification (Optional)

```sql
-- Check all notifications marked as read
SELECT is_read, COUNT(*) 
FROM follower_notifications 
WHERE user_id = '[customer-uuid]'
AND created_at > NOW() - INTERVAL '10 minutes'
GROUP BY is_read;
-- Expected: All rows have is_read = TRUE
```

### ✅ Pass Criteria
- [ ] Multiple notifications appear correctly
- [ ] Badge shows correct count
- [ ] Dropdown shows all notifications
- [ ] "Mark all as read" works
- [ ] Badge updates correctly

---

## 📊 Test Results Summary

### Record Results

| Test Scenario | Status | Issues Found | Notes |
|---------------|--------|--------------|-------|
| A: New Product Notification | ☐ Pass ☐ Fail | | |
| B: Notification Preferences | ☐ Pass ☐ Fail | | |
| C: Multiple Notifications | ☐ Pass ☐ Fail | | |

### Issues Template

If any test fails, record:
```
Issue #[number]
Scenario: [A/B/C]
Step: [Step number]
Expected: [What should happen]
Actual: [What actually happened]
Screenshot: [Attach if possible]
Console Errors: [Check browser console]
```

---

## 🐛 Troubleshooting

### Notification Not Appearing

**Check:**
1. Browser console for errors (F12 → Console tab)
2. Network tab for failed requests (F12 → Network tab)
3. Supabase Realtime connections (should show connected)
4. Database triggers are enabled:
   ```sql
   SELECT * FROM pg_trigger 
   WHERE tgname LIKE '%follower%';
   ```

### Badge Not Updating

**Check:**
1. Real-time subscription is active
2. User is logged in correctly
3. Hook `useFollowerNotifications` is being called
4. Browser console for subscription errors

### Database Verification Queries Not Working

**Possible causes:**
- UUID format incorrect (ensure proper format)
- RLS policies blocking queries (use service role key in SQL Editor)
- Tables don't exist (run migrations first)

---

## ✅ Final Checklist

After completing all scenarios:

- [ ] All 3 test scenarios passed
- [ ] No console errors observed
- [ ] Database verification queries returned expected results
- [ ] Real-time updates work within 5 seconds
- [ ] Notification bell UI is responsive and clear
- [ ] No performance issues or delays
- [ ] Test accounts cleaned up (optional)

---

## 📝 Test Report

**Tester:** ________________  
**Date:** ________________  
**Time Taken:** ________________  
**Overall Result:** ☐ PASS ☐ FAIL ☐ PARTIAL  

**Comments:**
```
[Add any additional observations, suggestions, or concerns]
```

**Ready for Production:** ☐ YES ☐ NO  

---

**Test Guide Version:** 1.0  
**Last Updated:** January 23, 2025  
**Next Review:** After fixes or before deployment
