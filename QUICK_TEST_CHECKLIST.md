# 🚀 Quick Testing Checklist for Story 4.4

## Pre-Testing Setup

### 1. Start the Development Server
```bash
npm run dev
```
Expected: Server starts on `http://localhost:5174` or `http://localhost:5173`

### 2. Ensure You're Logged In
- Navigate to the app
- If not logged in, go through the auth flow
- Ensure you reach the dashboard or main app

---

## Core Feature Tests (10 minutes)

### ✅ Test 1: Enhanced Favorites (`/favorites`)
**What to test:**
1. Navigate to `/favorites` in browser
2. Check that page loads without console errors
3. Verify stats cards show counts (should be 0 initially)
4. Try adding favorites from other parts of the app

**Expected Results:**
- ✅ Page loads with enhanced UI
- ✅ No 404 errors in console about missing tables
- ✅ Yellow notice about advanced features coming soon
- ✅ Stats cards show accurate counts
- ✅ Search and filter tabs work

---

### ✅ Test 2: Advanced Search (`/search/advanced`)
**What to test:**
1. Navigate to `/search/advanced`
2. Type in the search bar
3. Click on filter button
4. Try "Near Me" button (will ask for location)

**Expected Results:**
- ✅ Page loads with search interface
- ✅ Trending search terms appear when search bar is focused (may be empty)
- ✅ Filter panel slides down when clicked
- ✅ All filter controls are present
- ⚠️ May see function errors in console (expected until DB migration)

---

### ✅ Test 3: Business Discovery (`/discovery`)
**What to test:**
1. Navigate to `/discovery`
2. Check if location banner appears
3. Try clicking "Enable Location" if banner is present
4. Scroll to see category section at bottom

**Expected Results:**
- ✅ Page loads with discovery interface
- ✅ Shows personalized content or empty states
- ✅ Category grid at bottom works
- ✅ Location features work (may ask for browser permission)

---

### ✅ Test 4: Category Browser (`/categories`)
**What to test:**
1. Navigate to `/categories`
2. Check category grid display
3. Try clicking on a category card
4. Test search bar for filtering categories

**Expected Results:**
- ✅ Category cards display with icons
- ✅ Click category → goes to advanced search with filter
- ✅ Search filters categories in real-time
- ✅ Business counts show (may be 0)

---

### ✅ Test 5: Trending Coupons (`/coupons/trending` or `/trending`)
**What to test:**
1. Navigate to the trending coupons page
2. Check filter tabs (All, Nearby, etc.)
3. Try sort dropdown
4. Look for coupon cards

**Expected Results:**
- ✅ Page loads with trending interface
- ✅ Filter tabs are functional
- ✅ Sort dropdown works
- ✅ Shows empty state if no coupons (expected)

---

## Advanced Feature Tests (15 minutes)

### 🧪 Test 6: Favorites Integration
**What to test:**
1. Find SimpleSaveButton (heart icon) on any business/coupon
2. Click to add to favorites
3. Go to `/favorites` to see it appear
4. Click heart again to remove
5. Check localStorage persistence (refresh page)

**Expected Results:**
- ✅ Heart button works throughout app
- ✅ Toast notifications appear
- ✅ Favorites persist after page refresh
- ✅ Counts update in real-time

---

### 🧪 Test 7: Location Features
**What to test:**
1. On discovery page, enable location when prompted
2. Check if "Current Location" section appears
3. Try different radius options
4. Click "Search Nearby"

**Expected Results:**
- ✅ Browser asks for location permission
- ✅ Shows current location after permission granted
- ✅ Radius selector works
- ✅ Map toggle appears (may not show businesses without data)

---

### 🧪 Test 8: Search & Navigation Flow
**What to test:**
1. Start at `/categories`
2. Click a category → should go to `/search/advanced`
3. From search, click "View All" or similar links
4. Test browser back/forward navigation

**Expected Results:**
- ✅ Navigation flows work correctly
- ✅ URL parameters carry over (category filters)
- ✅ Browser navigation doesn't break
- ✅ Page titles update correctly

---

## Mobile/Responsive Testing (5 minutes)

### 📱 Test 9: Mobile View
**What to test:**
1. Open browser dev tools
2. Switch to mobile device view (iPhone/Android)
3. Navigate through all pages
4. Check that buttons are touch-friendly

**Expected Results:**
- ✅ All pages adapt to mobile screen
- ✅ Navigation is usable on mobile
- ✅ Buttons are appropriately sized
- ✅ Text is readable

---

## Error Handling Testing (5 minutes)

### ⚠️ Test 10: Expected Errors
**What to test:**
1. Open browser console (F12)
2. Navigate through all pages
3. Look for error messages

**Expected vs Unexpected:**
- ✅ **Expected**: Warnings about database functions not existing
- ✅ **Expected**: Empty results for searches (no data)
- ❌ **Unexpected**: TypeScript errors or component crashes
- ❌ **Unexpected**: 404 errors for enhanced_favorites tables
- ❌ **Unexpected**: White screen/broken page loads

---

## 📋 Quick Success Criteria

After testing, you should be able to say:

- [ ] All 5 new pages (`/search/advanced`, `/discovery`, `/categories`, `/trending`, `/favorites`) load without breaking
- [ ] SimpleSaveButton (heart icon) works throughout the app
- [ ] Favorites persist in localStorage and show in `/favorites`
- [ ] No breaking JavaScript errors in console
- [ ] Pages are responsive on mobile
- [ ] Navigation between pages works smoothly
- [ ] Location services work when permissions are granted

## 🐛 Common Issues & Solutions

### Issue: "Function does not exist" errors
**Solution:** Expected until database migration is applied. Should not break functionality.

### Issue: Empty search results
**Solution:** Expected if no business/coupon data exists. UI should show appropriate empty states.

### Issue: Location not working
**Solution:** Check browser permissions. Some browsers block location on localhost.

### Issue: Console warnings about imports
**Solution:** May be due to lazy loading. Should not affect functionality.

---

## 📞 Reporting Test Results

After testing, please share:
1. ✅ **What worked well**
2. ❌ **Any broken functionality**
3. 📝 **Screenshots of interesting issues**
4. 🌐 **Browser and device used for testing**

Ready to start testing? Begin with:
1. `npm run dev`
2. Open `http://localhost:5174` (or 5173)
3. Go through the quick test checklist above!