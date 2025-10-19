# Story 4.11: Follow Business - User Testing Guide

**Testing Date:** January 19, 2025  
**Dev Server:** http://localhost:5173  
**Test Account:** testuser1@gmail.com

---

## 🎯 Testing Objective

Verify that all Follow Business System features work correctly with **real business data** (not mock/dummy data).

---

## ✅ Pre-Testing Checklist

### Server Status:
- [x] Dev server running on port 5173
- [ ] Logged in as testuser1@gmail.com (has real businesses)
- [ ] Browser DevTools console open (F12) to catch any errors

---

## 📋 Test Scenarios

### Test 1: Business Discovery Page
**URL:** `http://localhost:5173/discovery` or `/search`

**Expected Behavior:**
- ✅ Shows real businesses from database (not dummy data)
- ✅ Business cards display actual business names, logos, addresses
- ✅ Clicking on a business card navigates to that business's profile page
- ✅ Each business card shows real follower count (if any)

**Steps:**
1. Navigate to discovery/search page
2. Verify businesses shown are real (match database)
3. Click on any business card
4. Verify it navigates to: `/business/{business_id}`
5. Verify the business profile page loads with correct data

**What to Check:**
- Business cards are clickable
- Business names are from real database
- Navigation works correctly
- No "dummy" or "mock" text visible

---

### Test 2: Follow Button on Business Profile
**URL:** `http://localhost:5173/business/{business_id}`

**Expected Behavior:**
- ✅ "Follow" button visible in business profile header (next to Share button)
- ✅ Follow button shows correct state (Following vs Follow)
- ✅ Clicking Follow adds business to following list
- ✅ Button updates optimistically (doesn't require page refresh)
- ✅ Toast notification appears confirming action

**Steps:**
1. Open any real business profile
2. Look for "Follow" button in the header section
3. Note current state (Follow / Following)
4. Click the button
5. Watch for:
   - Button text change (Follow → Following or vice versa)
   - Toast notification
   - Loading state (brief spinner)

**What to Check:**
- ✅ Follow button is present and visible
- ✅ Clicking works without errors
- ✅ State updates immediately (optimistic UI)
- ✅ Changes persist after page refresh

---

### Test 3: Following Page
**URL:** `http://localhost:5173/following`

**Expected Behavior:**
- ✅ Shows all businesses you're following
- ✅ Each business card shows real business data
- ✅ Search and filter work
- ✅ Settings icon opens notification preferences
- ✅ Unfollow button works

**Steps:**
1. Navigate to Following page
2. Verify all followed businesses are real (not dummy)
3. Try search functionality
4. Click settings icon (⚙️) on any business
5. Verify notification preferences modal opens
6. Try unfollowing a business

**What to Check:**
- List shows only real followed businesses
- Business data is accurate
- Interactive elements work
- No dummy/mock data visible

---

### Test 4: Notification Preferences Modal
**Triggered from:** Following page or Business profile

**Expected Behavior:**
- ✅ Modal opens when clicking settings
- ✅ Shows current notification preferences
- ✅ Checkboxes for: Products, Offers, Coupons, Announcements
- ✅ Channel selection (In-app, Push, Email)
- ✅ Save button updates preferences in database

**Steps:**
1. From Following page, click ⚙️ icon on any business
2. OR from business profile, access notification settings
3. Toggle different notification types
4. Change notification channel
5. Click "Save Preferences"
6. Refresh page and check settings persisted

**What to Check:**
- Modal opens without errors
- All toggles work
- Preferences save correctly
- Changes persist after refresh

---

### Test 5: Follower Feed (Updates)
**URL:** `http://localhost:5173/following/feed`

**Expected Behavior:**
- ✅ Shows recent updates from followed businesses
- ✅ Updates grouped by time (Today, Yesterday, etc.)
- ✅ Filter by type works (All, Products, Offers, etc.)
- ✅ Clicking update navigates to relevant page
- ✅ Real-time: New updates appear without refresh

**Steps:**
1. Navigate to Following Feed
2. Check if any updates are visible
3. Try different filter options
4. Click on an update
5. Verify navigation works

**What to Check:**
- Feed shows real updates (if any)
- Filters work correctly
- Clickable items navigate properly
- Time grouping is accurate

---

### Test 6: Notification Bell (If Implemented)
**Location:** Top navigation bar

**Expected Behavior:**
- ✅ Bell icon with badge showing unread count
- ✅ Clicking opens dropdown with notifications
- ✅ Notifications are real (not dummy)
- ✅ Clicking notification navigates to business
- ✅ "Mark as read" functionality works

**Steps:**
1. Look for bell icon in navigation
2. Check unread count badge
3. Click bell to open dropdown
4. View notifications
5. Click a notification
6. Click "Mark all as read"

**What to Check:**
- Bell visible and functional
- Count is accurate
- Notifications link correctly
- Mark as read works

---

### Test 7: Business Owner - Follower Analytics
**URL:** `http://localhost:5173/business/{your_business_id}/followers/analytics`

**Expected Behavior:**
- ✅ Shows follower statistics (total, weekly, monthly)
- ✅ Demographics charts display (age, gender, city)
- ✅ Growth trend chart visible
- ✅ Top cities and interests listed
- ✅ CTA buttons work (Create Campaign, View List)

**Steps:**
1. Login as business owner
2. Go to Business Dashboard
3. Click "Follower Analytics" button
4. Verify all metrics load
5. Check charts render correctly
6. Click "View Follower List"

**What to Check:**
- All metrics show real data
- Charts render without errors
- Navigation buttons work
- Data matches actual followers

---

### Test 8: Business Owner - Follower List
**URL:** `http://localhost:5173/business/{your_business_id}/followers/list`

**Expected Behavior:**
- ✅ Shows detailed list of real followers
- ✅ Search and filters work
- ✅ Sort options functional
- ✅ Follower cards show profile data
- ✅ Remove follower button works
- ✅ Report button opens modal

**Steps:**
1. Navigate to Follower List
2. Verify followers are real users
3. Try search functionality
4. Test age, gender, city filters
5. Change sort options
6. Click "Report" flag icon
7. Try "Remove" follower action

**What to Check:**
- List shows real followers
- Filters work correctly
- Actions open proper modals
- Data is accurate

---

### Test 9: Suspicious Activity Reporter
**Triggered from:** Follower List → Flag icon

**Expected Behavior:**
- ✅ Modal opens with report form
- ✅ 5 report types selectable
- ✅ Description field required
- ✅ Character counter shows
- ✅ Warning message displays
- ✅ Submit creates report in database

**Steps:**
1. From Follower List, click Flag icon
2. Select a report type
3. Enter description
4. Submit report
5. Verify success message
6. Check database for report entry

**What to Check:**
- All report types available
- Form validation works
- Submit successful
- Modal closes after success

---

## 🔧 Troubleshooting Common Issues

### Issue: "Cannot find Follow button"
**Solution:** 
- Verify you're on a real business profile (not your own)
- Business owners don't see Follow button on their own business
- Check browser console for errors

### Issue: "Discovery page shows no businesses"
**Solution:**
- Check if logged in correctly
- Verify database has businesses in your area
- Check console for API errors

### Issue: "Following page is empty"
**Solution:**
- You haven't followed any businesses yet
- Follow some businesses first
- Refresh the page

### Issue: "Feed has no updates"
**Solution:**
- Followed businesses haven't posted updates yet
- This is normal for new/inactive businesses
- Updates appear when businesses add products/offers

### Issue: "TypeScript errors in console"
**Solution:**
- TypeScript errors are pre-existing and don't affect functionality
- Can be ignored for testing purposes
- Focus on functional testing

---

## ✅ Success Criteria

**All Tests Pass If:**
- ✅ Real business data displayed (no dummy/mock)
- ✅ Follow/Unfollow works on real businesses
- ✅ Navigation between pages works
- ✅ Notifications (if any) are real
- ✅ Business owner features show real followers
- ✅ All buttons and forms functional
- ✅ No critical JavaScript errors in console

---

## 📝 Bug Reporting Template

If you find issues, please report using this format:

```
**Bug Title:** Brief description

**Steps to Reproduce:**
1. Go to...
2. Click on...
3. Expected: ...
4. Actual: ...

**Screenshots:** (if applicable)

**Console Errors:** (copy from F12 DevTools)

**Test Account:** testuser1@gmail.com

**URL:** http://localhost:5173/...
```

---

## 🚀 Next Steps After Testing

### If All Tests Pass:
1. ✅ Story 4.11 is ready for staging deployment
2. ✅ Can proceed with production deployment
3. ✅ Mark story as 100% complete

### If Issues Found:
1. Report bugs using template above
2. Agent will fix critical issues
3. Re-test after fixes
4. Repeat until all tests pass

---

## 📞 Quick Reference

**Dev Server:** http://localhost:5173  
**Test Account:** testuser1@gmail.com  
**Story Docs:** `docs/stories/STORY_4.11_*.md`  

**Key URLs:**
- Discovery: `/discovery` or `/search`
- Following: `/following`
- Feed: `/following/feed`
- Business Profile: `/business/{id}`
- Follower Analytics: `/business/{id}/followers/analytics`
- Follower List: `/business/{id}/followers/list`

---

**Happy Testing! 🎉**

*Let's make sure everything works perfectly with real data!*
