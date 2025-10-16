# Story 5.5: End-to-End Testing Guide

**Date**: October 2, 2025  
**Tester**: [Your Name]  
**Environment**: Local Development  

---

## 🎯 **Testing Objective**

Validate that the enhanced sharing limits system works correctly from database through UI, ensuring limits are enforced and users receive appropriate feedback.

---

## 📋 **Pre-Test Checklist**

- [ ] Database migration deployed successfully
- [ ] Development server running (`npm run dev`)
- [ ] Logged in as a test user
- [ ] Supabase Dashboard accessible
- [ ] Browser console open (F12)

---

## 🧪 **Test Execution Plan**

### **Phase 1: Database Verification** (5 min)

1. Open Supabase Dashboard → SQL Editor
2. Run this query to verify setup:

```sql
-- Verify tables and functions exist
SELECT 
  'Tables' as type,
  COUNT(*) as count
FROM information_schema.tables
WHERE table_name IN ('sharing_limits_config', 'coupon_sharing_log')

UNION ALL

SELECT
  'Functions' as type,
  COUNT(*) as count
FROM information_schema.routines
WHERE routine_name LIKE '%sharing%';
```

**Expected**: 2 tables, 4 functions

3. Verify default limits:

```sql
SELECT * FROM sharing_limits_config ORDER BY limit_type;
```

**Expected**: 4 rows with correct values (3/20 for regular, 5/30 for drivers)

---

### **Phase 2: Get Test Data** (3 min)

1. Get your user ID:

```sql
SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';
```

**Copy your user ID**: `_________________`

2. Get a friend's user ID (or create one):

```sql
SELECT id, email FROM auth.users WHERE id != 'YOUR-USER-ID' LIMIT 5;
```

**Copy friend's user ID**: `_________________`

3. Get some coupon IDs:

```sql
SELECT id, name FROM coupons LIMIT 5;
```

**Copy 3 coupon IDs**:
- Coupon 1: `_________________`
- Coupon 2: `_________________`
- Coupon 3: `_________________`

---

### **Phase 3: Test Page Setup** (2 min)

1. Start your dev server (if not running):
   ```bash
   npm run dev
   ```

2. Navigate to: `http://localhost:5173/test-sharing-limits`

3. Verify the page loads with:
   - Current Sharing Stats section
   - Compact View section
   - Test Controls
   - Debug Information
   - How to Test guide

---

### **Phase 4: Initial Stats Test** (2 min)

**Test 4.1: Stats Load**

1. Page should automatically load stats on mount
2. Check "Current Sharing Stats" section

**Expected Results**:
- ✅ Stats card displays
- ✅ Shows "20/20 shares left today" (or current remaining)
- ✅ Progress bar is green (if < 80% used)
- ✅ No Driver badge (unless you're a Driver)
- ✅ "3 coupons per friend/day" shown

**Actual Result**: ☐ PASS ☐ FAIL  
**Notes**: _________________

---

### **Phase 5: Permission Check Test** (5 min)

**Test 5.1: Fresh User Permission Check**

1. Enter a **friend ID** in the "Friend ID" input
2. Click **"Check Permission"**

**Expected Results**:
- ✅ Alert shows: "✅ Can share! 20 shares remaining today"
- ✅ Console logs permission check result
- ✅ No modal appears

**Actual Result**: ☐ PASS ☐ FAIL  
**Notes**: _________________

**Test 5.2: First Share**

1. Enter the **friend ID**
2. Enter a **coupon ID**
3. Click **"Log Share"**

**Expected Results**:
- ✅ Alert: "✅ Share logged successfully!"
- ✅ Stats refresh automatically
- ✅ "19/20 shares left today" now shown
- ✅ Progress bar updates
- ✅ "Shared with 1 friend today" section appears

**Actual Result**: ☐ PASS ☐ FAIL  
**Notes**: _________________

---

### **Phase 6: Per-Friend Limit Test** (10 min)

**Test 6.1: Share 2nd Coupon to Same Friend**

1. Keep same friend ID
2. Change coupon ID (use Coupon 2)
3. Click "Check Permission" → should allow
4. Click "Log Share"

**Expected Results**:
- ✅ Share succeeds
- ✅ Stats show "18/20 shares left"
- ✅ Friend badge shows "2/3"

**Actual Result**: ☐ PASS ☐ FAIL

**Test 6.2: Share 3rd Coupon to Same Friend**

1. Keep same friend ID
2. Change coupon ID (use Coupon 3)
3. Click "Check Permission" → should allow
4. Click "Log Share"

**Expected Results**:
- ✅ Share succeeds
- ✅ Stats show "17/20 shares left"
- ✅ Friend badge shows "3/3" in **red**

**Actual Result**: ☐ PASS ☐ FAIL

**Test 6.3: Try 4th Share to Same Friend (Should Fail)**

1. Keep same friend ID
2. Click "Check Permission"

**Expected Results**:
- ✅ NO alert appears
- ✅ **Modal appears** with title: "Per-Friend Limit Reached"
- ✅ Message: "You've already shared 3 coupons with this friend today"
- ✅ Shows "To This Friend: 3/3"
- ✅ Shows "Today's Total: 3/20"
- ✅ Suggestions include:
  - Share with different friend
  - Come back tomorrow
- ✅ Driver upgrade CTA visible (if not a Driver)

**Actual Result**: ☐ PASS ☐ FAIL  
**Notes**: _________________

**Test 6.4: Share to Different Friend (Should Succeed)**

1. Enter a **DIFFERENT friend ID**
2. Click "Check Permission"

**Expected Results**:
- ✅ Alert: "✅ Can share! 17 shares remaining today"
- ✅ No modal

**Actual Result**: ☐ PASS ☐ FAIL

---

### **Phase 7: Total Daily Limit Test** (15 min)

**Test 7.1: Approach Limit**

Continue sharing to different friends until you have 18-19 total shares today.

**Fast Method** (SQL):
```sql
-- Manually insert shares to speed up testing
INSERT INTO coupon_sharing_log (sender_id, recipient_id, coupon_id, is_driver)
SELECT 
  'YOUR-USER-ID'::UUID,
  'FRIEND-ID'::UUID,
  'COUPON-ID'::UUID,
  false
FROM generate_series(1, 15);  -- Adjust number as needed

-- Check total
SELECT COUNT(*) FROM coupon_sharing_log 
WHERE sender_id = 'YOUR-USER-ID' 
AND sharing_day = CURRENT_DATE;
```

2. Click "Refresh Stats" in test page

**Expected Results**:
- ✅ Stats update to show correct total
- ✅ Progress bar turns **amber** at 80% (16+ shares)
- ✅ "Near limit" warning appears

**Actual Result**: ☐ PASS ☐ FAIL

**Test 7.2: Hit Total Daily Limit**

1. Share until you reach exactly 20 total shares
2. Click "Refresh Stats"

**Expected Results**:
- ✅ "0/20 shares left today"
- ✅ Progress bar at 100% (**red**)
- ✅ "Limit reached" warning
- ✅ Warning box: "Daily sharing limit reached"

**Actual Result**: ☐ PASS ☐ FAIL

**Test 7.3: Try to Share When at Limit**

1. Enter any friend ID
2. Click "Check Permission"

**Expected Results**:
- ✅ **Modal appears** with title: "Daily Limit Reached"
- ✅ Message: "You've reached your daily sharing limit of 20 coupons"
- ✅ Shows "Today's Total: 20/20"
- ✅ Suggestion: "Come back tomorrow"
- ✅ Driver upgrade CTA visible

**Actual Result**: ☐ PASS ☐ FAIL

---

### **Phase 8: Database Integrity Test** (5 min)

**Test 8.1: Verify Logs Are Immutable**

1. In Supabase SQL Editor, try to update a log:

```sql
-- Try to update (should fail)
UPDATE coupon_sharing_log 
SET shared_at = NOW() 
WHERE sender_id = 'YOUR-USER-ID' 
LIMIT 1;
```

**Expected**: ❌ Error: "new row violates row-level security policy"

**Actual Result**: ☐ PASS ☐ FAIL

**Test 8.2: Verify RLS Prevents Viewing Other Users' Logs**

1. Try to query another user's logs:

```sql
-- Try to view (should return 0 rows if not your logs)
SELECT * FROM coupon_sharing_log 
WHERE sender_id != 'YOUR-USER-ID' 
AND recipient_id != 'YOUR-USER-ID';
```

**Expected**: 0 rows returned

**Actual Result**: ☐ PASS ☐ FAIL

---

### **Phase 9: UI Component Test** (5 min)

**Test 9.1: Stats Card Compact Mode**

1. Scroll to "Compact View" section
2. Observe the inline stats display

**Expected Results**:
- ✅ Single line display
- ✅ Shows: "X/20 shares left today"
- ✅ Driver badge if applicable
- ✅ Compact, space-efficient

**Actual Result**: ☐ PASS ☐ FAIL

**Test 9.2: Modal Responsiveness**

1. Trigger limit exceeded modal
2. Resize browser window (mobile, tablet, desktop sizes)

**Expected Results**:
- ✅ Modal scales appropriately
- ✅ All content visible
- ✅ No text overflow
- ✅ Buttons accessible

**Actual Result**: ☐ PASS ☐ FAIL

**Test 9.3: Driver Upgrade CTA (if not a Driver)**

1. Trigger any limit exceeded modal
2. Locate Driver upgrade section
3. Click "Learn About Driving" button

**Expected Results**:
- ✅ Console logs: "User clicked to learn about Drivers"
- ✅ Modal closes
- ✅ No errors

**Actual Result**: ☐ PASS ☐ FAIL

---

### **Phase 10: Real Sharing Flow Test** (10 min)

**Test 10.1: ShareDealSimple Integration**

1. Navigate to a page with the ShareDealSimple component
2. Click to share a deal with a friend
3. Observe the share dialog

**Expected Results**:
- ✅ Compact stats card appears at top
- ✅ Shows current sharing status
- ✅ Select deal works
- ✅ Share button works
- ✅ After share, stats update
- ✅ If limit hit, modal appears

**Actual Result**: ☐ PASS ☐ FAIL  
**Notes**: _________________

---

### **Phase 11: Edge Cases Test** (10 min)

**Test 11.1: Network Error Handling**

1. Disconnect internet
2. Try to check permission

**Expected**: Error handled gracefully, no crash

**Actual Result**: ☐ PASS ☐ FAIL

**Test 11.2: Invalid UUID**

1. Enter invalid UUID: "not-a-uuid"
2. Click "Check Permission"

**Expected**: Error caught, user-friendly message

**Actual Result**: ☐ PASS ☐ FAIL

**Test 11.3: Rapid Clicking**

1. Click "Log Share" multiple times rapidly

**Expected**: 
- ✅ Button disables during processing
- ✅ Only one share logged
- ✅ No duplicate entries

**Actual Result**: ☐ PASS ☐ FAIL

---

## 📊 **Test Results Summary**

### **Completion Stats**

| Phase | Tests | Passed | Failed | Blocked |
|-------|-------|--------|--------|---------|
| 1. Database | 2 | __ | __ | __ |
| 2. Test Data | 3 | __ | __ | __ |
| 3. Page Setup | 1 | __ | __ | __ |
| 4. Initial Stats | 1 | __ | __ | __ |
| 5. Permission | 2 | __ | __ | __ |
| 6. Per-Friend | 4 | __ | __ | __ |
| 7. Total Limit | 3 | __ | __ | __ |
| 8. DB Integrity | 2 | __ | __ | __ |
| 9. UI Components | 3 | __ | __ | __ |
| 10. Real Flow | 1 | __ | __ | __ |
| 11. Edge Cases | 3 | __ | __ | __ |
| **TOTAL** | **25** | **__** | **__** | **__** |

### **Critical Issues Found**

1. ____________________________
2. ____________________________
3. ____________________________

### **Minor Issues Found**

1. ____________________________
2. ____________________________

---

## ✅ **Sign-Off**

**Tested By**: ________________  
**Date**: ________________  
**Time Spent**: _______ minutes  

**Overall Result**: ☐ PASS ☐ CONDITIONAL PASS ☐ FAIL

**Ready for Production**: ☐ YES ☐ NO

**Reviewer**: ________________  
**Review Date**: ________________  

---

## 📝 **Notes & Observations**

_____________________________________________________
_____________________________________________________
_____________________________________________________
_____________________________________________________

---

**Test Complete!** 🎉
