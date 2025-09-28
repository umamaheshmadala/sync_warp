# Story 4.4 Testing Guide

## Overview
This guide will help you test all the new features implemented for Story 4.4: Search & Discovery + Favorites/Wishlist Management.

## Prerequisites
- App should be running on `http://localhost:5174/` (or 5173)
- You should be logged in to test protected routes
- Browser dev tools open to monitor console for errors

## Test Categories

### 1. 🔍 Advanced Search Features
### 2. 🏢 Business Discovery
### 3. 📂 Category Browser
### 4. 🔥 Trending Coupons
### 5. ❤️ Enhanced Favorites
### 6. 🧭 Navigation & Routing
### 7. 📱 Responsive Design

---

## 1. 🔍 Advanced Search Features

### Test Location: `/search/advanced`

**Test Cases:**

#### A. Basic Search Interface
- [ ] Page loads without errors
- [ ] Search bar is visible and functional
- [ ] Filter button shows/hides filter panel
- [ ] View mode toggle (grid/list) works
- [ ] "Near Me" button is present

#### B. Search Functionality
- [ ] Enter text in search bar - suggestions should appear (if data exists)
- [ ] Trending search terms display when search bar is focused (empty)
- [ ] Submit search with Enter key
- [ ] Click search button works
- [ ] Search results display (may be empty if no data)

#### C. Filter Panel
- [ ] Open filters - panel slides down
- [ ] Category checkboxes are present
- [ ] Price range inputs work
- [ ] Rating filter inputs work
- [ ] Distance/radius selector
- [ ] "Only Open" and "With Offers" checkboxes
- [ ] Sort by dropdown
- [ ] Apply Filters button
- [ ] Clear Filters button

**Expected Console Behavior:**
- ✅ No 404 errors for database functions
- ⚠️ May see warnings about functions not existing (expected until migration)

---

## 2. 🏢 Business Discovery

### Test Location: `/discovery`

**Test Cases:**

#### A. Page Structure
- [ ] Page loads with header and description
- [ ] Location permission banner (if location not enabled)
- [ ] Stats cards showing discovery metrics
- [ ] Browse by Category section at bottom

#### B. Location Features
- [ ] Click "Enable Location" - browser asks for permission
- [ ] If location enabled: shows current location info
- [ ] Radius selector dropdown (5km, 10km, 25km, 50km)
- [ ] "Search Nearby" button functionality
- [ ] Map toggle button (Map/List icons)

#### C. Business Sections
- [ ] Recommended for You section (if data exists)
- [ ] Discovery sections display with icons
- [ ] Each section has "View All" button
- [ ] Business cards show properly
- [ ] Save buttons on business cards work

#### D. Map Integration (if location enabled)
- [ ] Map toggle shows/hides map view
- [ ] Map displays at correct location
- [ ] Map shows business markers (if any exist)

---

## 3. 📂 Category Browser

### Test Location: `/categories`

**Test Cases:**

#### A. Category Grid
- [ ] Page loads with category explanation
- [ ] Visual category cards display
- [ ] Each category has icon, name, and business count
- [ ] Hover effects on category cards
- [ ] Click category navigates to filtered search

#### B. Category Filtering
- [ ] Search bar filters categories in real-time
- [ ] Sort dropdown changes category order
- [ ] Business count per category updates
- [ ] "All Categories" shows total count

#### C. Category Interaction
- [ ] Click category card goes to `/search/advanced?category=CategoryName`
- [ ] Category filtering works in search
- [ ] Back navigation works properly

---

## 4. 🔥 Trending Coupons

### Test Location: `/coupons/trending` or `/trending`

**Test Cases:**

#### A. Trending Display
- [ ] Page loads with trending explanation
- [ ] Filter tabs: All, Nearby, Expiring, High-Value
- [ ] Sort dropdown: Popularity, Discount, Expiry
- [ ] Coupon cards display properly

#### B. Filter Functionality
- [ ] Filter tabs change content
- [ ] Sort options reorder results
- [ ] Each filter shows appropriate count
- [ ] Loading states during filter changes

#### C. Coupon Cards
- [ ] Coupon cards show business info
- [ ] Discount value prominently displayed
- [ ] Expiry date visible
- [ ] "Get Coupon" and "Visit Store" buttons
- [ ] Share functionality (if implemented)
- [ ] Save to favorites works

---

## 5. ❤️ Enhanced Favorites

### Test Location: `/favorites`

**Test Cases:**

#### A. Page Layout
- [ ] Page loads without console errors
- [ ] Header with title and migration notice
- [ ] Stats cards showing counts
- [ ] Search bar and filter tabs
- [ ] View mode toggle (grid/list)

#### B. Favorites Management
- [ ] Add items to favorites using SimpleSaveButton components
- [ ] Favorites appear in the list immediately
- [ ] Search favorites functionality
- [ ] Filter by type: All, Businesses, Coupons
- [ ] Bulk selection with checkboxes
- [ ] Bulk delete functionality

#### C. Statistics
- [ ] Total Favorites count updates
- [ ] Businesses count accurate
- [ ] Coupons count accurate
- [ ] "This Week" count (new favorites)

#### D. Migration Notice
- [ ] Yellow notice box visible
- [ ] Explains enhanced features coming soon
- [ ] Links to advanced search for exploration

---

## 6. 🧭 Navigation & Routing

**Test Cases:**

#### A. Navigation Menu
- [ ] All new routes accessible via navigation
- [ ] Breadcrumbs work properly
- [ ] Back/forward browser navigation
- [ ] Deep linking to specific pages

#### B. Route Protection
- [ ] Protected routes require authentication
- [ ] Redirects work for unauthenticated users
- [ ] Page titles update correctly

#### C. Lazy Loading
- [ ] Initial page load is fast
- [ ] New components load on demand
- [ ] Loading spinners show during component loading

---

## 7. 📱 Responsive Design

**Test Cases:**

#### A. Mobile View (< 768px)
- [ ] All pages adapt to mobile
- [ ] Touch-friendly buttons
- [ ] Readable text sizes
- [ ] Proper scrolling

#### B. Tablet View (768px - 1024px)
- [ ] Grid layouts adjust appropriately
- [ ] Navigation remains usable
- [ ] Cards stack properly

#### C. Desktop View (> 1024px)
- [ ] Full feature visibility
- [ ] Optimal use of screen space
- [ ] Hover states work

---

## Database Function Testing

Since the database migration hasn't been applied yet, test the fallback behavior:

### Expected Behaviors:
- ✅ **Search suggestions**: May be empty but no errors
- ✅ **Trending terms**: Gracefully returns empty results
- ✅ **Nearby businesses**: Falls back to basic location search
- ✅ **Favorites**: Uses localStorage successfully
- ✅ **Business discovery**: Shows static content appropriately

### Console Monitoring:
- ⚠️ Look for function call errors (expected)
- ❌ Should NOT see any breaking errors
- ✅ Fallback mechanisms should work silently

---

## Quick Test Checklist

### Core Functionality (10 mins)
1. [ ] Go to `/search/advanced` - page loads, can search
2. [ ] Go to `/discovery` - page loads, categories work
3. [ ] Go to `/categories` - category grid displays
4. [ ] Go to `/trending` - trending page loads
5. [ ] Go to `/favorites` - enhanced favorites works
6. [ ] Add/remove favorites throughout the app
7. [ ] Test location permission flow
8. [ ] Verify no console errors breaking functionality

### Deep Testing (30 mins)
- Follow each section above thoroughly
- Test edge cases and error scenarios
- Verify mobile responsiveness
- Check all interactive elements

---

## Reporting Issues

If you find any issues, please note:
1. **Page/Route**: Which page the issue occurs on
2. **Steps**: Exact steps to reproduce
3. **Expected vs Actual**: What should happen vs what happens
4. **Console Errors**: Any relevant console messages
5. **Browser/Device**: Your testing environment

Let's start testing! Which section would you like to begin with?