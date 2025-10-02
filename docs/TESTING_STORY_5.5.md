# Story 5.5: Enhanced Sharing Limits - Integration Testing Guide

**Date**: October 2, 2025  
**Status**: Ready for Testing  
**Test Environment**: Local Development + Supabase Dashboard

---

## 🎯 Testing Overview

This document outlines comprehensive integration tests for the enhanced sharing limits system implemented in Story 5.5.

### **What We're Testing:**
1. ✅ Database layer (Supabase functions & tables)
2. ✅ Service layer (TypeScript service functions)
3. ✅ React hooks (useSharingLimits)
4. ✅ UI components (SharingStatsCard, LimitExceededModal)
5. ✅ End-to-end sharing flow with limits enforcement

---

## 📋 Test Checklist

### **Database Layer Tests** ✅ (Already verified)

- [x] Tables created successfully
- [x] Functions exist and are callable
- [x] Indexes created for performance
- [x] RLS policies active and correct
- [x] Default configurations loaded

---

## 🧪 **Manual Integration Tests**

### **Test Environment Setup**

**Prerequisites:**
1. Local dev server running (`npm run dev`)
2. Supabase connected
3. At least 2 test users created
4. At least 3 mock coupons/deals available

---

### **TEST SUITE 1: Regular User Limits**

#### **Test 1.1: Initial Stats Load**
**Objective:** Verify sharing stats load correctly for a fresh user

**Steps:**
1. Log in as a regular user (not a Driver)
2. Navigate to share dialog with any friend
3. Observe the `SharingStatsCard` (compact view)

**Expected Results:**
```
✓ Stats card displays: "20/20 shares left today"
✓ No Driver badge shown
✓ No loading spinner (after initial load)
✓ Green progress bar (0% usage)
```

---

#### **Test 1.2: First Share to Friend**
**Objective:** Test successful share with limits validation

**Steps:**
1. Select a deal/coupon
2. Add a message
3. Click "Share Deal 🚀"
4. Wait for confirmation

**Expected Results:**
```
✓ No limit exceeded modal appears
✓ "Deal Shared! 🎉" success message shown
✓ Share logged in database
✓ Stats update: "19/20 shares left today"
✓ Console logs the share action
```

**Database Verification:**
```sql
SELECT * FROM coupon_sharing_log 
WHERE sender_id = 'YOUR-USER-ID'
ORDER BY shared_at DESC LIMIT 1;
```
Should show 1 new entry.

---

#### **Test 1.3: Multiple Shares to Same Friend**
**Objective:** Test per-friend daily limit (3 shares max)

**Steps:**
1. Share coupon #1 to Friend A ✓
2. Share coupon #2 to Friend A ✓
3. Share coupon #3 to Friend A ✓
4. Attempt to share coupon #4 to Friend A

**Expected Results After 3rd Share:**
```
✓ Stats show: "17/20 shares left today"
✓ Per-friend limit reached for Friend A
```

**Expected Results on 4th Attempt:**
```
✓ LimitExceededModal appears
✓ Title: "Per-Friend Limit Reached"
✓ Message: "You've already shared 3 coupons with this friend today"
✓ Shows: "To This Friend: 3/3"
✓ Shows: "Today's Total: 3/20"
✓ Suggestions shown:
  - Share with different friend
  - Come back tomorrow
✓ Driver upgrade CTA visible (non-Drivers only)
✓ Share NOT logged to database
```

---

#### **Test 1.4: Shares to Different Friends**
**Objective:** Verify per-friend limits are independent

**Steps:**
1. After Test 1.3 (Friend A at 3/3 limit)
2. Select Friend B
3. Share coupon #1 to Friend B

**Expected Results:**
```
✓ Share succeeds (Friend B has 0/3 so far)
✓ Stats show: "16/20 shares left today"
✓ Friend A still at 3/3 limit
✓ Friend B now at 1/3
```

---

#### **Test 1.5: Total Daily Limit**
**Objective:** Test total daily limit (20 shares max for regular users)

**Setup:** Need to share 20 coupons total across multiple friends

**Steps:**
1. Continue sharing until total reaches 20
2. Attempt share #21

**Expected Results on Share #20:**
```
✓ Stats show: "0/20 shares left today"
✓ Progress bar at 100% (red)
✓ "Limit reached" warning shown
```

**Expected Results on Share #21:**
```
✓ LimitExceededModal appears
✓ Title: "Daily Limit Reached"
✓ Message: "You've reached your daily sharing limit of 20 coupons"
✓ Shows: "Today's Total: 20/20"
✓ Suggestion: "Come back tomorrow"
✓ Driver upgrade CTA visible
✓ Share NOT logged
```

---

### **TEST SUITE 2: Driver User Limits**

#### **Test 2.1: Driver Stats Display**
**Objective:** Verify Drivers see higher limits

**Setup:** 
- Manually update user to Driver status in database (or use Driver test account)

```sql
-- Temporarily mark user as Driver for testing
-- (In real app, this would be handled by your Driver detection logic)
```

**Steps:**
1. Log in as Driver user
2. Open share dialog

**Expected Results:**
```
✓ Stats card shows: "30/30 shares left today"
✓ Blue "Driver" badge visible
✓ Higher limits reflected in UI
```

---

#### **Test 2.2: Driver Per-Friend Limit**
**Objective:** Test Driver's 5 shares per friend limit

**Steps:**
1. Share 5 coupons to Friend A
2. Attempt share #6 to Friend A

**Expected Results After 5th Share:**
```
✓ Stats show: "25/30 shares left today"
✓ Friend A: 5/5
```

**Expected Results on 6th Attempt:**
```
✓ LimitExceededModal appears
✓ Title: "Per-Friend Limit Reached"
✓ Message: "You've already shared 5 coupons with this friend today"
✓ Shows: "To This Friend: 5/5"
✓ Driver badge shown in modal
✓ Message: "You already have the highest sharing limits available!"
✓ NO Driver upgrade CTA (already a Driver)
```

---

#### **Test 2.3: Driver Total Daily Limit**
**Objective:** Test Driver's 30 shares total limit

**Steps:**
1. Share 30 coupons total
2. Attempt share #31

**Expected Results on Share #30:**
```
✓ Stats: "0/30 shares left today"
✓ Progress bar at 100% (red)
```

**Expected Results on Share #31:**
```
✓ LimitExceededModal appears
✓ Title: "Daily Limit Reached"
✓ Message: "You've reached your daily sharing limit of 30 coupons"
✓ Driver badge and message shown
✓ NO upgrade CTA
```

---

### **TEST SUITE 3: Edge Cases & Error Handling**

#### **Test 3.1: Network Error During Check**
**Objective:** Test error handling when permission check fails

**Steps:**
1. Disconnect internet or block Supabase requests
2. Attempt to share a coupon

**Expected Results:**
```
✓ Error caught gracefully
✓ User-friendly error message shown
✓ Share does not proceed
✓ No modal crash
```

---

#### **Test 3.2: Concurrent Shares**
**Objective:** Test race conditions with rapid sharing

**Steps:**
1. Rapidly click "Share" multiple times
2. Observe behavior

**Expected Results:**
```
✓ Only one share processed
✓ Button disabled during processing
✓ No duplicate shares logged
✓ Stats update correctly once
```

---

#### **Test 3.3: Midnight Rollover**
**Objective:** Verify limits reset at midnight

**Note:** This test requires waiting for midnight or manipulating server time.

**Steps:**
1. Reach daily limit before midnight
2. Wait until after midnight
3. Attempt a new share

**Expected Results:**
```
✓ Limits reset to: 20/20 (or 30/30 for Drivers)
✓ Share succeeds
✓ Previous day's shares still in log but not counted
```

**Database Verification:**
```sql
SELECT 
  sharing_day,
  COUNT(*) as shares
FROM coupon_sharing_log
WHERE sender_id = 'YOUR-USER-ID'
GROUP BY sharing_day
ORDER BY sharing_day DESC;
```
Should show separate counts for each day.

---

#### **Test 3.4: Invalid Friend ID**
**Objective:** Test behavior with non-existent recipient

**Steps:**
1. Try to share with invalid UUID
2. Observe error handling

**Expected Results:**
```
✓ Permission check fails gracefully
✓ Error logged to console
✓ User-friendly message shown
✓ Share does not proceed
```

---

### **TEST SUITE 4: UI/UX Tests**

#### **Test 4.1: Stats Card Visual States**
**Objective:** Verify correct visual feedback at different usage levels

**Test Cases:**

| Usage | Progress Bar | Warning Message | Color |
|-------|-------------|-----------------|-------|
| 0% | Empty | None | Green |
| 50% | Half-filled | None | Green |
| 80% | 80% filled | "Near limit" | Amber |
| 100% | Full | "Limit reached" | Red |

**Steps:**
1. Start at 0 shares
2. Share incrementally
3. Observe stats card at each milestone

**Expected Results:**
```
✓ Colors change appropriately
✓ Warning messages appear at 80% and 100%
✓ Progress animation smooth
```

---

#### **Test 4.2: Modal Responsiveness**
**Objective:** Test modal on different screen sizes

**Steps:**
1. Trigger limit exceeded modal
2. Resize browser window (mobile, tablet, desktop)

**Expected Results:**
```
✓ Modal scales appropriately
✓ All content visible at all sizes
✓ No text overflow
✓ Buttons remain accessible
```

---

#### **Test 4.3: Loading States**
**Objective:** Verify loading indicators work correctly

**Steps:**
1. Open share dialog
2. Observe stats card during initial load
3. Click share button
4. Observe loading state

**Expected Results:**
```
✓ Stats card shows skeleton/pulse loader initially
✓ Share button shows spinner when processing
✓ Share button disabled during loading
✓ No UI flickering
```

---

### **TEST SUITE 5: Database Integrity**

#### **Test 5.1: Sharing Log Immutability**
**Objective:** Verify logs cannot be modified or deleted

**Steps:**
1. Share a coupon (creates log entry)
2. Attempt to update the log entry via SQL
3. Attempt to delete the log entry via SQL

**SQL Tests:**
```sql
-- Try to update a log entry
UPDATE coupon_sharing_log 
SET shared_at = NOW() 
WHERE id = 'LOG-ENTRY-ID';

-- Try to delete a log entry
DELETE FROM coupon_sharing_log 
WHERE id = 'LOG-ENTRY-ID';
```

**Expected Results:**
```
✓ UPDATE blocked by RLS policy
✓ DELETE blocked by RLS policy
✓ Error: "new row violates row-level security policy"
✓ Logs remain immutable
```

---

#### **Test 5.2: RLS Policy Enforcement**
**Objective:** Verify users can only see their own logs

**Steps:**
1. Create shares as User A
2. Log in as User B
3. Attempt to query User A's logs

**SQL Test (as User B):**
```sql
SELECT * FROM coupon_sharing_log 
WHERE sender_id = 'USER-A-ID';
```

**Expected Results:**
```
✓ Query returns 0 rows (User B can't see User A's logs)
✓ User B can only see logs where they are sender or recipient
```

---

#### **Test 5.3: Function Performance**
**Objective:** Verify database functions execute quickly

**Steps:**
1. Run performance tests on all 4 functions

**SQL Performance Tests:**
```sql
-- Test get_sharing_limits
EXPLAIN ANALYZE 
SELECT get_sharing_limits('USER-ID'::UUID, false);

-- Test can_share_to_friend
EXPLAIN ANALYZE 
SELECT can_share_to_friend('SENDER-ID'::UUID, 'RECIPIENT-ID'::UUID, false);

-- Test get_sharing_stats_today
EXPLAIN ANALYZE 
SELECT get_sharing_stats_today('USER-ID'::UUID);
```

**Expected Results:**
```
✓ All queries execute in < 50ms
✓ Indexes used effectively
✓ No sequential scans on large tables
```

---

## 📊 **Test Results Template**

Use this template to document test results:

```markdown
## Test Run: [Date/Time]
**Tester:** [Name]
**Environment:** [Local/Staging/Production]
**Build:** [Commit SHA or version]

### Test Suite 1: Regular User Limits
- [ ] Test 1.1: Initial Stats Load - PASS/FAIL
  - Notes: ___________
- [ ] Test 1.2: First Share to Friend - PASS/FAIL
  - Notes: ___________
- [ ] Test 1.3: Multiple Shares to Same Friend - PASS/FAIL
  - Notes: ___________
- [ ] Test 1.4: Shares to Different Friends - PASS/FAIL
  - Notes: ___________
- [ ] Test 1.5: Total Daily Limit - PASS/FAIL
  - Notes: ___________

### Test Suite 2: Driver User Limits
- [ ] Test 2.1: Driver Stats Display - PASS/FAIL
- [ ] Test 2.2: Driver Per-Friend Limit - PASS/FAIL
- [ ] Test 2.3: Driver Total Daily Limit - PASS/FAIL

### Test Suite 3: Edge Cases
- [ ] Test 3.1: Network Error - PASS/FAIL
- [ ] Test 3.2: Concurrent Shares - PASS/FAIL
- [ ] Test 3.3: Midnight Rollover - PASS/FAIL (or SKIPPED)
- [ ] Test 3.4: Invalid Friend ID - PASS/FAIL

### Test Suite 4: UI/UX
- [ ] Test 4.1: Stats Card Visual States - PASS/FAIL
- [ ] Test 4.2: Modal Responsiveness - PASS/FAIL
- [ ] Test 4.3: Loading States - PASS/FAIL

### Test Suite 5: Database Integrity
- [ ] Test 5.1: Sharing Log Immutability - PASS/FAIL
- [ ] Test 5.2: RLS Policy Enforcement - PASS/FAIL
- [ ] Test 5.3: Function Performance - PASS/FAIL

### Summary
**Total Tests:** ___/___
**Passed:** ___
**Failed:** ___
**Blocked:** ___
**Skipped:** ___

### Critical Issues Found
1. ___________
2. ___________

### Recommendations
1. ___________
2. ___________
```

---

## 🐛 **Known Issues & Workarounds**

### **Issue 1: Driver Detection Stubbed**
- **Status:** Expected
- **Description:** `isUserDriver()` function currently returns `false` for all users
- **Workaround:** Manually set `is_driver` in test data or modify function temporarily
- **Fix:** Implement real Driver detection logic (post-MVP)

### **Issue 2: Mock Deals Data**
- **Status:** Expected
- **Description:** ShareDealSimple uses hardcoded mock deals
- **Impact:** Cannot test with real coupon IDs from database
- **Workaround:** Use mock deal IDs for testing
- **Fix:** Replace with real API integration (post-MVP)

---

## ✅ **Test Sign-Off**

**Tested By:** ________________  
**Date:** ________________  
**Environment:** ________________  
**Result:** PASS / FAIL / CONDITIONAL PASS  

**Approvals:**
- [ ] Developer: ________________
- [ ] QA: ________________
- [ ] Product Owner: ________________

**Ready for Production:** YES / NO

---

## 📞 **Support & Troubleshooting**

If tests fail:
1. Check Supabase connection
2. Verify migration was applied successfully
3. Check browser console for JavaScript errors
4. Check Supabase logs for database errors
5. Review `docs/DEPLOY_STORY_5.5.md` for deployment issues

**Contact:** [Your contact info]

---

**Document Version:** 1.0  
**Last Updated:** October 2, 2025  
**Status:** Ready for testing
