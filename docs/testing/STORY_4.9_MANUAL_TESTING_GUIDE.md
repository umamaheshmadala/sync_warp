# Story 4.9 - Manual Testing Guide 🧪

**Feature:** Social Sharing Actions & Analytics  
**Version:** 1.0  
**Date:** 2025-10-18  
**Testing Type:** Manual / Exploratory  
**Estimated Time:** 60-90 minutes

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Test Environment Setup](#test-environment-setup)
3. [Test Data Preparation](#test-data-preparation)
4. [Testing Scenarios](#testing-scenarios)
5. [Device-Specific Testing](#device-specific-testing)
6. [Database Verification](#database-verification)
7. [Bug Reporting Template](#bug-reporting-template)
8. [Sign-off Checklist](#sign-off-checklist)

---

## Prerequisites

### Required Accounts
- [ ] Test user account with authentication
- [ ] Business owner account (to see analytics)
- [ ] Regular customer account (non-owner)

### Required Access
- [ ] Local development environment running
- [ ] Supabase database access (via Supabase Studio or SQL Editor)
- [ ] Browser DevTools access
- [ ] Network inspection capability

### Browsers to Test
- [ ] **Chrome/Edge** (Chromium) - Primary
- [ ] **Firefox** - Secondary
- [ ] **Safari** (macOS/iOS) - Mobile testing
- [ ] **Mobile browsers** (Chrome/Safari on phone)

### Tools Needed
- [ ] Browser DevTools (Console, Network, Application tabs)
- [ ] Clipboard manager (to verify copy operations)
- [ ] Second device or emulator (for mobile testing)
- [ ] Screenshot tool (for bug reports)

---

## Test Environment Setup

### 1. Start Dev Server

```powershell
# Navigate to project root
cd C:\Users\umama\Documents\GitHub\sync_warp

# Start development server
npm run dev

# Verify server is running
# Expected: Server running on http://localhost:5173 (or similar)
```

### 2. Open Browser DevTools

**Chrome/Edge:**
- Press `F12` or `Ctrl+Shift+I`
- Go to **Console** tab

**Firefox:**
- Press `F12`
- Go to **Console** tab

### 3. Clear Browser Cache

```
Settings > Privacy > Clear browsing data
- Cached images and files
- Cookies and site data
```

### 4. Open Supabase Studio

```powershell
# Open Supabase project in browser
# URL: https://supabase.com/dashboard/project/YOUR_PROJECT_ID
```

Navigate to:
- **Table Editor** → `share_tracking` table
- **SQL Editor** (for queries)

---

## Test Data Preparation

### Create Test Business

1. **Login as business owner**
   - Email: `owner@test.com`
   - Password: `[your test password]`

2. **Navigate to Business Profile**
   - URL: `/business/[business-id]`
   - Verify business exists and loads

3. **Add Test Products** (if needed)
   - Create 2-3 products with:
     - Name, description
     - Price
     - Images
     - Published status

### Verify Initial State

```sql
-- Run in Supabase SQL Editor
-- Check if any shares exist for your test business
SELECT * FROM share_tracking 
WHERE entity_type = 'storefront' 
  AND entity_id = 'YOUR_BUSINESS_ID'
ORDER BY created_at DESC;

-- Check for product shares
SELECT * FROM share_tracking 
WHERE entity_type = 'product'
ORDER BY created_at DESC;
```

**Expected:** Empty or minimal share data initially.

---

## Testing Scenarios

### 🧪 Test Suite 1: Storefront Share Button

**Location:** BusinessProfile header (top-right corner)

#### Test 1.1: Share Button Visibility
- [ ] **Action:** Navigate to any business profile
- [ ] **Verify:** Share button visible in header
- [ ] **Verify:** Button shows "Share" text + share icon
- [ ] **Verify:** Button styled correctly (secondary variant)

#### Test 1.2: Desktop Share (Copy Link)
- [ ] **Action:** Click "Share" button on desktop
- [ ] **Verify:** Toast notification appears: "Link copied!"
- [ ] **Verify:** Toast has green success styling
- [ ] **Action:** Open clipboard manager or paste in notepad
- [ ] **Verify:** URL copied: `http://localhost:5173/business/[id]?utm_source=share&utm_medium=copy&utm_campaign=storefront_share`
- [ ] **Verify:** UTM parameters present

#### Test 1.3: Mobile Share (Native Share API)
- [ ] **Device:** iPhone/Android (real device or simulator)
- [ ] **Action:** Click "Share" button
- [ ] **Verify:** Native share sheet opens
- [ ] **Verify:** Share options visible (Messages, WhatsApp, Email, etc.)
- [ ] **Action:** Select "Messages" and send to yourself
- [ ] **Verify:** Link in message works and includes UTM parameters
- [ ] **Action:** Cancel share sheet
- [ ] **Verify:** No errors in console

#### Test 1.4: Loading State
- [ ] **Action:** Click share button
- [ ] **Verify:** Button shows loading spinner briefly
- [ ] **Verify:** Button disabled during loading
- [ ] **Verify:** Button returns to normal after ~1 second

#### Test 1.5: Error Handling
- [ ] **Action:** Disconnect internet, click share
- [ ] **Verify:** Error toast appears
- [ ] **Verify:** Console shows error (check DevTools)
- [ ] **Action:** Reconnect internet, click again
- [ ] **Verify:** Works normally

---

### 🧪 Test Suite 2: Product Share Button

**Location:** ProductCard & ProductDetails

#### Test 2.1: Share Button in Product Card
- [ ] **Action:** Navigate to business storefront with products
- [ ] **Verify:** Each product card has share button
- [ ] **Verify:** Button position: top-right corner overlay
- [ ] **Verify:** Button has icon only (no text on cards)
- [ ] **Action:** Hover over share button
- [ ] **Verify:** Button background changes (hover effect)
- [ ] **Verify:** Tooltip appears: "Share this product"

#### Test 2.2: Share Button in Product Details
- [ ] **Action:** Click on a product to view details
- [ ] **Verify:** Share button visible in product header
- [ ] **Verify:** Button shows "Share" text + icon
- [ ] **Action:** Click share button
- [ ] **Verify:** Copy/native share works (same as storefront)
- [ ] **Verify:** URL includes product ID: `/product/[id]?utm_...`

#### Test 2.3: Multiple Product Shares
- [ ] **Action:** Share 3 different products in succession
- [ ] **Verify:** Each share records separately
- [ ] **Verify:** Each has unique product ID in URL
- [ ] **Verify:** Toast appears for each share
- [ ] **Verify:** No duplicate shares recorded

---

### 🧪 Test Suite 3: Share Tracking Database

**Location:** Supabase `share_tracking` table

#### Test 3.1: Storefront Share Recording
- [ ] **Action:** Share a business storefront
- [ ] **Action:** Run query in Supabase SQL Editor:
```sql
SELECT * FROM share_tracking 
WHERE entity_type = 'storefront' 
ORDER BY created_at DESC 
LIMIT 1;
```
- [ ] **Verify:** New row created
- [ ] **Verify:** `entity_type` = `'storefront'`
- [ ] **Verify:** `entity_id` = correct business ID
- [ ] **Verify:** `share_method` = `'copy'` (desktop) or `'web_share'` (mobile)
- [ ] **Verify:** `user_id` = current user ID (if authenticated)
- [ ] **Verify:** `utm_source` = `'share'`
- [ ] **Verify:** `utm_medium` = `'copy'` or `'web_share'`
- [ ] **Verify:** `utm_campaign` = `'storefront_share'`
- [ ] **Verify:** `created_at` = recent timestamp

#### Test 3.2: Product Share Recording
- [ ] **Action:** Share a product
- [ ] **Action:** Run query:
```sql
SELECT * FROM share_tracking 
WHERE entity_type = 'product' 
ORDER BY created_at DESC 
LIMIT 1;
```
- [ ] **Verify:** `entity_type` = `'product'`
- [ ] **Verify:** `entity_id` = correct product ID
- [ ] **Verify:** `utm_campaign` = `'product_share'`
- [ ] **Verify:** All other fields correct

#### Test 3.3: Anonymous User Shares
- [ ] **Action:** Logout (clear session)
- [ ] **Action:** Share a storefront or product
- [ ] **Action:** Check database:
```sql
SELECT user_id FROM share_tracking 
ORDER BY created_at DESC 
LIMIT 1;
```
- [ ] **Verify:** `user_id` = `NULL` (anonymous)
- [ ] **Verify:** Share still recorded

#### Test 3.4: Row-Level Security (RLS)
- [ ] **Action:** Try to query shares from different user account:
```sql
-- Login as different user in Supabase Studio
SELECT * FROM share_tracking 
WHERE user_id != auth.uid();
```
- [ ] **Verify:** Only see own shares (or none if no shares yet)
- [ ] **Verify:** Cannot see other users' shares
- [ ] **Verify:** Business owners can see all shares for their entities

---

### 🧪 Test Suite 4: Share Analytics Dashboard

**Location:** BusinessProfile → Statistics Tab

#### Test 4.1: Analytics Component Visibility
- [ ] **Action:** Login as business owner
- [ ] **Action:** Navigate to your business profile
- [ ] **Action:** Click "Statistics" tab
- [ ] **Verify:** Share Analytics card visible
- [ ] **Verify:** Card title: "Storefront Share Analytics"
- [ ] **Verify:** Card positioned after metrics, before performance overview

#### Test 4.2: Analytics - No Data State
- [ ] **Prerequisite:** Delete all shares for this business (via SQL):
```sql
DELETE FROM share_tracking 
WHERE entity_type = 'storefront' 
  AND entity_id = 'YOUR_BUSINESS_ID';
```
- [ ] **Action:** Refresh Statistics tab
- [ ] **Verify:** Empty state message: "No shares yet"
- [ ] **Verify:** Illustration or icon shown
- [ ] **Verify:** Helpful text: "Share your storefront to start tracking"

#### Test 4.3: Analytics - Loading State
- [ ] **Action:** Refresh page and watch Statistics tab load
- [ ] **Verify:** Loading skeletons appear
- [ ] **Verify:** 3 skeleton cards (summary stats)
- [ ] **Verify:** Method breakdown skeleton
- [ ] **Verify:** Recent shares skeleton
- [ ] **Verify:** Skeletons pulse/animate
- [ ] **Verify:** Data appears after ~0.5-2 seconds

#### Test 4.4: Analytics - Summary Cards
- [ ] **Prerequisite:** Have at least 5 shares recorded
- [ ] **Action:** View Statistics tab
- [ ] **Verify:** "Total Shares" card shows correct count
- [ ] **Verify:** Blue gradient background
- [ ] **Verify:** Badge with number prominent
- [ ] **Verify:** "Share Methods" card shows method count (e.g., "2 methods")
- [ ] **Verify:** Green gradient background
- [ ] **Verify:** "Recent Activity" card shows last 5 shares count
- [ ] **Verify:** Purple gradient background

#### Test 4.5: Analytics - Method Breakdown
- [ ] **Prerequisite:** Have shares via both copy and web_share methods
- [ ] **Action:** View method breakdown section
- [ ] **Verify:** Each method shows:
  - Name (e.g., "Link Copy", "Native Share")
  - Count
  - Percentage (e.g., "40%")
  - Progress bar
- [ ] **Verify:** Progress bars are color-coded:
  - Blue: Native Share
  - Green: Link Copy
- [ ] **Verify:** Progress bar width matches percentage
- [ ] **Verify:** Progress bars animate on load
- [ ] **Verify:** Percentages add up to 100%

#### Test 4.6: Analytics - Recent Shares
- [ ] **Action:** View recent shares section
- [ ] **Verify:** Last 5 shares listed
- [ ] **Verify:** Each share shows:
  - Share method name
  - Timestamp (e.g., "2 hours ago")
- [ ] **Verify:** Shares ordered by date (newest first)
- [ ] **Verify:** Hover effect on each row
- [ ] **Action:** Make a new share
- [ ] **Action:** Refresh Statistics tab
- [ ] **Verify:** New share appears at top of list

#### Test 4.7: Analytics - Pro Tips
- [ ] **Verify:** "Pro Tips" section visible at bottom
- [ ] **Verify:** Contains UTM tracking explanation
- [ ] **Verify:** Contains analytics integration tips
- [ ] **Verify:** Styled with info/lightbulb icon

#### Test 4.8: Analytics - Non-Owner View
- [ ] **Action:** Logout and login as different user (non-owner)
- [ ] **Action:** Navigate to the business profile
- [ ] **Action:** Click Statistics tab
- [ ] **Verify:** Share Analytics section NOT visible
- [ ] **Verify:** Only owner can see share analytics
- [ ] **Verify:** Other stats still visible (reviews, ratings, etc.)

---

### 🧪 Test Suite 5: Share Count Badge

**Location:** Anywhere ShareCount component is used

#### Test 5.1: Basic Display
- [ ] **Note:** ShareCount not yet integrated into UI (future enhancement)
- [ ] **Action:** Test by temporarily adding to ProductCard:
```tsx
import { ShareCount } from '@/components/analytics';

// In ProductCard component:
<ShareCount
  entityId={product.id}
  entityType="product"
  showIcon
  variant="secondary"
/>
```
- [ ] **Verify:** Badge displays share count
- [ ] **Verify:** Icon shown when `showIcon={true}`
- [ ] **Verify:** Badge hidden when count = 0

#### Test 5.2: Clickable Badge
- [ ] **Action:** Add onClick handler:
```tsx
<ShareCount
  entityId={product.id}
  entityType="product"
  onClick={() => alert('Clicked!')}
/>
```
- [ ] **Verify:** Cursor changes to pointer
- [ ] **Verify:** Click handler fires
- [ ] **Verify:** Badge has hover effect

#### Test 5.3: Different Variants
- [ ] **Action:** Test each variant:
```tsx
<ShareCount variant="default" />
<ShareCount variant="secondary" />
<ShareCount variant="outline" />
```
- [ ] **Verify:** Each has distinct styling
- [ ] **Verify:** Colors match badge component styles

---

### 🧪 Test Suite 6: UTM Parameter Validation

**Location:** Shared URLs

#### Test 6.1: Storefront UTM Parameters
- [ ] **Action:** Share a storefront (copy link)
- [ ] **Action:** Paste URL and inspect
- [ ] **Verify:** Contains `?utm_source=share`
- [ ] **Verify:** Contains `&utm_medium=copy` (desktop) or `&utm_medium=web_share` (mobile)
- [ ] **Verify:** Contains `&utm_campaign=storefront_share`
- [ ] **Verify:** No extra or missing parameters

#### Test 6.2: Product UTM Parameters
- [ ] **Action:** Share a product
- [ ] **Verify:** Contains `?utm_source=share`
- [ ] **Verify:** Contains `&utm_medium=copy` or `&utm_medium=web_share`
- [ ] **Verify:** Contains `&utm_campaign=product_share`

#### Test 6.3: URL Encoding
- [ ] **Action:** Share a URL with special characters in path
- [ ] **Verify:** URL properly encoded
- [ ] **Verify:** Special characters don't break URL
- [ ] **Verify:** URL works when clicked

#### Test 6.4: UTM Tracking in Analytics
- [ ] **Action:** Click a shared link with UTM parameters
- [ ] **Action:** Check browser URL bar
- [ ] **Verify:** UTM parameters present in URL
- [ ] **Future:** Verify Google Analytics captures UTM data (if integrated)

---

### 🧪 Test Suite 7: Edge Cases & Error Handling

#### Test 7.1: Network Failures
- [ ] **Action:** Open DevTools → Network tab
- [ ] **Action:** Set throttling to "Offline"
- [ ] **Action:** Try to share
- [ ] **Verify:** Error toast appears
- [ ] **Verify:** Console error logged
- [ ] **Verify:** Button returns to normal state
- [ ] **Action:** Restore network
- [ ] **Action:** Try share again
- [ ] **Verify:** Works successfully

#### Test 7.2: Rapid Clicking
- [ ] **Action:** Click share button 10 times rapidly
- [ ] **Verify:** Only 1 toast notification appears
- [ ] **Verify:** Button disabled during operation
- [ ] **Verify:** No duplicate shares in database
- [ ] **Verify:** No console errors

#### Test 7.3: Missing Entity ID
- [ ] **Action:** Test share with invalid ID:
```tsx
<StorefrontShareButton businessId="invalid-id" />
```
- [ ] **Verify:** Share still copies URL
- [ ] **Verify:** Error logged in console
- [ ] **Verify:** Database record not created (or fails gracefully)

#### Test 7.4: Permission Errors
- [ ] **Action:** Revoke RLS policy temporarily (in Supabase):
```sql
DROP POLICY IF EXISTS "Users can insert their own shares" ON share_tracking;
```
- [ ] **Action:** Try to share
- [ ] **Verify:** Share URL copied (client-side still works)
- [ ] **Verify:** Database insert fails silently
- [ ] **Verify:** User still gets success toast (copy worked)
- [ ] **Action:** Restore RLS policy:
```sql
CREATE POLICY "Users can insert their own shares" 
ON share_tracking FOR INSERT 
WITH CHECK (true);
```

#### Test 7.5: Long URLs
- [ ] **Action:** Share a business with very long ID
- [ ] **Verify:** URL copied fully
- [ ] **Verify:** URL works when clicked
- [ ] **Verify:** No truncation issues

#### Test 7.6: Special Characters in Entity Data
- [ ] **Action:** Create product with special chars in name: `Test & Co. <Script>`
- [ ] **Action:** Share the product
- [ ] **Verify:** URL properly encoded
- [ ] **Verify:** No XSS vulnerabilities
- [ ] **Verify:** URL works correctly

---

## Device-Specific Testing

### 📱 Mobile Testing (iOS)

#### Setup
- [ ] Open Safari on iPhone/iPad
- [ ] Navigate to `http://YOUR_IP:5173` (use local network IP)
- [ ] Login as test user

#### Tests
- [ ] **Native Share:** Tap share button → native sheet opens
- [ ] **Share Methods:** Can share via Messages, WhatsApp, Email, AirDrop
- [ ] **Share Tracking:** Shares recorded as `web_share` method
- [ ] **UI Responsiveness:** Buttons properly sized for touch
- [ ] **Toast Notifications:** Visible and readable on mobile

### 📱 Mobile Testing (Android)

#### Setup
- [ ] Open Chrome on Android device
- [ ] Navigate to dev server
- [ ] Login as test user

#### Tests
- [ ] **Native Share:** Tap share → Android share sheet opens
- [ ] **Share Methods:** Can share via Telegram, WhatsApp, Gmail, etc.
- [ ] **Share Tracking:** Recorded correctly
- [ ] **UI:** No layout issues

### 💻 Desktop Testing (Windows)

#### Tests
- [ ] **Copy Fallback:** Share button copies to clipboard
- [ ] **Toast Position:** Toast appears in correct corner
- [ ] **Keyboard Nav:** Can tab to share button and press Enter
- [ ] **Accessibility:** Screen reader announces button

### 💻 Desktop Testing (macOS)

#### Tests
- [ ] **Safari:** Share button works
- [ ] **Chrome:** Copy to clipboard works
- [ ] **Firefox:** All features functional

---

## Database Verification

### Queries to Run

#### Total Shares by Entity Type
```sql
SELECT 
  entity_type,
  COUNT(*) as total_shares
FROM share_tracking
GROUP BY entity_type;
```

**Expected:**
```
entity_type  | total_shares
-------------|-------------
storefront   | 10
product      | 15
```

#### Shares by Method
```sql
SELECT 
  share_method,
  COUNT(*) as count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER(), 1) as percentage
FROM share_tracking
GROUP BY share_method;
```

**Expected:**
```
share_method | count | percentage
-------------|-------|------------
copy         | 20    | 66.7
web_share    | 10    | 33.3
```

#### Recent Shares
```sql
SELECT 
  entity_type,
  share_method,
  created_at
FROM share_tracking
ORDER BY created_at DESC
LIMIT 10;
```

**Expected:** 10 most recent shares listed

#### Shares by User
```sql
SELECT 
  user_id,
  COUNT(*) as share_count
FROM share_tracking
WHERE user_id IS NOT NULL
GROUP BY user_id
ORDER BY share_count DESC;
```

**Expected:** Share counts per user

---

## Bug Reporting Template

When you find a bug, document it using this template:

```markdown
### Bug Report: [Brief Description]

**Severity:** Critical / High / Medium / Low

**Environment:**
- Browser: [Chrome 120 / Firefox 121 / Safari 17]
- Device: [Desktop / iPhone 15 / Samsung Galaxy S23]
- OS: [Windows 11 / macOS Sonoma / iOS 17]

**Steps to Reproduce:**
1. Navigate to...
2. Click on...
3. Observe that...

**Expected Behavior:**
[What should happen]

**Actual Behavior:**
[What actually happens]

**Screenshots:**
[Attach screenshots]

**Console Errors:**
```
[Paste console errors here]
```

**Database State:**
```sql
-- Query to show issue
SELECT * FROM share_tracking WHERE ...
```

**Additional Context:**
[Any other relevant information]
```

---

## Sign-off Checklist

### Functional Requirements
- [ ] All share buttons visible and functional
- [ ] Copy to clipboard works on desktop
- [ ] Native share works on mobile
- [ ] Share tracking records created
- [ ] UTM parameters generated correctly
- [ ] Analytics dashboard displays data
- [ ] Share counts accurate
- [ ] Loading states work
- [ ] Error handling works
- [ ] Empty states display correctly

### Non-Functional Requirements
- [ ] Performance: Share action completes in <1 second
- [ ] UI/UX: Buttons styled consistently
- [ ] Accessibility: Keyboard navigation works
- [ ] Mobile: Touch targets ≥44x44px
- [ ] Browser: Works in Chrome, Firefox, Safari
- [ ] Security: RLS policies enforced
- [ ] Database: Queries optimized and indexed

### Documentation
- [ ] All tests completed
- [ ] Bugs documented and reported
- [ ] Test results recorded
- [ ] Screenshots captured

### Final Approval
- [ ] **QA Lead:** ___________________ Date: _______
- [ ] **Product Owner:** ___________________ Date: _______
- [ ] **Tech Lead:** ___________________ Date: _______

---

## Test Results Log

### Test Session 1
**Date:** __________  
**Tester:** __________  
**Duration:** ______ minutes

**Summary:**
- Tests Passed: _____ / _____
- Tests Failed: _____ / _____
- Bugs Found: _____
- Severity: _____ Critical, _____ High, _____ Medium, _____ Low

**Notes:**
[Add any observations or recommendations]

---

### Test Session 2
**Date:** __________  
**Tester:** __________  
**Duration:** ______ minutes

**Summary:**
- Tests Passed: _____ / _____
- Tests Failed: _____ / _____
- Bugs Found: _____
- Severity: _____ Critical, _____ High, _____ Medium, _____ Low

**Notes:**
[Add any observations or recommendations]

---

## Appendix: Useful Commands

### Reset Test Data
```sql
-- Delete all shares for testing
DELETE FROM share_tracking 
WHERE created_at > NOW() - INTERVAL '1 day';
```

### Generate Test Shares
```sql
-- Manually insert test shares (for analytics testing)
INSERT INTO share_tracking (entity_id, entity_type, share_method, utm_source, utm_medium, utm_campaign, user_id)
VALUES 
  ('business-id-1', 'storefront', 'copy', 'share', 'copy', 'storefront_share', auth.uid()),
  ('business-id-1', 'storefront', 'web_share', 'share', 'web_share', 'storefront_share', auth.uid()),
  ('product-id-1', 'product', 'copy', 'share', 'copy', 'product_share', auth.uid());
```

### Check Share Stats
```sql
-- Get share stats for a specific entity
SELECT 
  COUNT(*) as total,
  COUNT(DISTINCT share_method) as methods,
  json_agg(json_build_object(
    'method', share_method,
    'time', created_at
  ) ORDER BY created_at DESC) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as recent
FROM share_tracking
WHERE entity_id = 'YOUR_ENTITY_ID' 
  AND entity_type = 'storefront';
```

---

**Happy Testing! 🧪✅**
