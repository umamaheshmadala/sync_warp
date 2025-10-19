# Story 4.11: Follow Business System - User Guide

**Welcome!** This guide will help you experience all the amazing features of the new Follow Business System.

---

## 🎯 What's New in Story 4.11?

The Follow Business System transforms how customers engage with businesses on SynC:

### For Customers:
- 💙 **Follow businesses** to stay updated
- 🔔 **Real-time notifications** for new products, offers, and coupons
- 🎛️ **Customize notifications** per business
- 📰 **Live feed** of updates from followed businesses
- 🔕 **Manage all following** in one place

### For Business Owners:
- 📊 **Analytics dashboard** with follower demographics
- 📈 **Growth trends** over 30 days
- 👥 **Detailed follower list** with search & filters
- 🚫 **Remove followers** when needed
- 🚨 **Report suspicious activity** to admins

---

## 🚀 Getting Started

### Step 1: Start the Development Server

```powershell
# Make sure you're in the project directory
cd C:\Users\umama\Documents\GitHub\sync_warp

# Start the dev server
npm run dev
```

The app will be available at: `http://localhost:5173`

---

## 👤 Testing as a Customer

### Feature 1: Follow a Business 💙

**Where:** Any business profile page

**Steps:**
1. Navigate to `/dashboard` or `/discovery`
2. Click on any business card
3. On the business profile, look for the **"Follow"** button
4. Click it - the button will animate and change to **"Following"**

**What to Notice:**
- ✨ Smooth animation
- ✅ Instant feedback (optimistic UI)
- 🎨 Button changes color and icon

**Try Different Variants:**
- Default button (filled)
- Outline button (border only)
- Ghost button (transparent)

---

### Feature 2: View Your Following List 📋

**Where:** `/following`

**Steps:**
1. Click your profile/menu
2. Select "Following" (or navigate to `/following`)
3. See all businesses you follow

**What You'll See:**
- List of all followed businesses
- Business cards with:
  - Name, type, address
  - Follower count
  - When you followed them
  - Settings button (⚙️)
  - Unfollow button

**Try These Actions:**
- 🔍 **Search** for a business by name
- 📊 **Sort** by: Recent, Alphabetical, Most Active
- ⚙️ **Click Settings** to customize notifications
- ❌ **Unfollow** a business

---

### Feature 3: Customize Notifications per Business 🎛️

**Where:** `/following` → Click settings (⚙️) on any business

**Steps:**
1. Go to `/following`
2. Find a business you follow
3. Click the **⚙️ Settings** button
4. A modal will open

**What You Can Customize:**
- ✅ **Products** - Get notified about new products
- ✅ **Offers** - Get notified about special offers
- ✅ **Coupons** - Get notified about new coupons
- ✅ **Announcements** - Get notified about general updates

**Channel (Future):**
- 📱 In-App (currently active)
- 🔔 Push Notifications (coming soon)
- 📧 Email (coming soon)

**Try This:**
- Toggle different notification types on/off
- Notice the warning if you disable all
- Click "Save" to update preferences

---

### Feature 4: View Your Updates Feed 📰

**Where:** `/following/feed`

**Steps:**
1. Navigate to `/following/feed`
2. See updates from all businesses you follow

**What You'll See:**
- **Time-grouped updates:**
  - 📅 Today
  - 🕐 Yesterday
  - 📆 This Week
  - 📜 Older

**Update Types (Color-Coded):**
- 🟦 **Products** - New products added
- 🟩 **Offers** - Special offers created
- 🟨 **Coupons** - New coupons available
- 🟪 **Announcements** - General updates

**Try These Actions:**
- 🔍 **Filter** by update type (All, Products, Offers, etc.)
- 📜 **Scroll down** for infinite scroll
- 🖱️ **Click any update** to navigate to that business/product/offer
- ⏰ **Watch for real-time updates** (if a business posts something new)

---

### Feature 5: Notification Bell 🔔

**Where:** Top navigation bar (anywhere in the app)

**Steps:**
1. Look for the 🔔 bell icon in the top navigation
2. Notice the **red badge** showing unread count
3. Click the bell to open dropdown

**What You'll See:**
- Last 10 notifications
- Each notification shows:
  - Business name
  - Update type & title
  - Time (relative)
  - Read/unread status

**Try These Actions:**
- 🔔 **Click a notification** to mark as read and navigate to business
- ✅ **Mark all as read** button at bottom
- 📰 **"View all updates"** link to go to feed
- 👀 **Watch the badge** update in real-time

**Badge Features:**
- Shows count up to 99
- Shows "99+" for 100 or more
- Animates when new notifications arrive
- Clears when you mark as read

---

## 👔 Testing as a Business Owner

### Feature 6: View Follower Analytics Dashboard 📊

**Where:** `/business/:businessId/followers/analytics`

**Steps:**
1. Navigate to `/business/dashboard`
2. Click on one of your businesses
3. Click **"Follower Analytics"** button (cyan/teal color)

**What You'll See:**

**📈 Key Metrics (4 Cards):**
1. **Total Followers** - All-time follower count
2. **New This Week** - Followers gained in last 7 days
3. **Active Followers** - Engaged followers (90-day window)
4. **New This Month** - Followers gained in last 30 days

**📊 Charts:**
1. **30-Day Growth Trend** (Line Chart)
   - See follower growth over time
   - Hover for exact counts per day

2. **Gender Distribution** (Pie Chart)
   - Male/Female/Other breakdown
   - Interactive segments

3. **Age Distribution** (Bar Chart)
   - Age ranges (18-24, 25-34, 35-44, etc.)
   - See which age groups follow you most

**📍 Additional Insights:**
- **Top 5 Cities** - Where your followers are located
- **Top Interests** - What your followers are interested in

**🎯 Call-to-Actions:**
- **"Create Campaign"** - Target your followers (future)
- **"View Follower List"** - See detailed list

---

### Feature 7: Detailed Follower List 👥

**Where:** `/business/:businessId/followers/list`

**Steps:**
1. From analytics dashboard, click **"View Follower List"**
2. Or navigate directly to `/business/:businessId/followers/list`

**What You'll See:**
- Complete list of all your followers
- Each follower card shows:
  - Username & avatar (initial)
  - Age & gender
  - City with 📍 icon
  - When they followed you (relative time)
  - Driver score (if available)
  - Top 2 interests + count

**🔍 Search & Filter:**

**Search Bar:**
- Search by username or city
- Real-time filtering

**Advanced Filters (Click "Filters" button):**
- 📅 **Age Range** - Min/Max age
- 👤 **Gender** - Male, Female, Other, All
- 🏙️ **City** - Filter by city name

**📊 Sort Options:**
- **Recently Followed** - Most recent first
- **Most Active** - By engagement (future)
- **Highest Driver Score** - Best drivers first

**Try This:**
1. Search for a follower by name
2. Open filters and set age range (e.g., 25-35)
3. Filter by gender
4. Filter by city
5. Change sort order
6. Watch the list update instantly!

---

### Feature 8: Remove a Follower 🚫

**Where:** Follower List page

**Steps:**
1. Go to your follower list
2. Find a follower
3. Click the **❌ Remove** button (UserX icon, red on hover)

**What Happens:**
1. **Confirmation dialog** appears
2. Shows follower's username
3. Explains they won't receive updates anymore
4. Two buttons:
   - **Cancel** - Close dialog
   - **Remove** - Confirm removal (red button)

**Try This:**
- Click Remove on a test follower
- See the confirmation dialog
- Click "Remove" to confirm
- Watch the follower disappear from list
- Notice optimistic UI (instant removal)

**Note:** This sets `is_active = false` - doesn't delete data

---

### Feature 9: Report Suspicious Activity 🚨

**Where:** Follower List page

**Steps:**
1. Go to your follower list
2. Find a follower
3. Click the **🚩 Report** button (Flag icon, yellow on hover)

**What Happens:**
1. **Beautiful modal** opens with animated entrance
2. Shows follower's username you're reporting

**Report Form:**

**Select Report Type:**
1. 🎭 **Fake Reviews** - Posting fake or paid reviews
2. 🤖 **Spam/Bot Behavior** - Automated activity
3. 😠 **Harassment** - Harassing or abusive behavior
4. 🎪 **Competitor Sabotage** - Damaging reputation
5. ❓ **Other** - Other suspicious activity

**Description:**
- Required text area (max 500 characters)
- Character counter shows remaining
- Placeholder text guides you

**⚠️ Warning Notice:**
- Yellow box with important notice
- Reminds about false report consequences

**Try This:**
1. Click report on a test follower
2. Select "Spam/Bot Behavior"
3. Write a description (e.g., "Posting automated messages")
4. Notice character counter
5. Click "Submit Report"
6. See **success animation**
7. Modal auto-closes after 2 seconds

**What Happens After:**
- Report stored in `follower_reports` table
- Admin can review (future admin panel)
- Follower doesn't know they were reported
- Audit trail maintained

---

## 🎨 Real-Time Features (Test These!)

### Feature 10: Real-Time Notifications ⚡

**Test Scenario:**
1. Open app in **two browser windows/tabs**
2. Window 1: Login as **Customer**, go to `/following/feed`
3. Window 2: Login as **Business Owner**
4. In Window 2: Add a new product/offer/coupon to your business
5. **Watch Window 1** - The feed should update instantly!

**What You'll Experience:**
- ⚡ Instant notification appears
- 🔔 Bell badge increments
- 📰 Feed shows new update
- 🎨 Smooth animation

---

### Feature 11: Real-Time Following Updates ⚡

**Test Scenario:**
1. Open app in **two browser tabs**
2. Tab 1: Go to `/following` (your following list)
3. Tab 2: Navigate to a business profile
4. In Tab 2: Click "Follow" on a business
5. **Switch to Tab 1** - The business should appear instantly!

**What You'll Experience:**
- ⚡ Following list updates in real-time
- 🎨 New business card animates in
- 📊 Follower count updates

---

## 🧪 Testing Checklist

Use this checklist to test all features:

### Customer Features:
- [ ] Follow a business
- [ ] Unfollow a business
- [ ] View following list
- [ ] Search followed businesses
- [ ] Sort followed businesses
- [ ] Open notification preferences modal
- [ ] Customize notifications (toggle types)
- [ ] Save notification preferences
- [ ] View updates feed
- [ ] Filter feed by type
- [ ] Scroll feed (infinite scroll)
- [ ] Click on an update
- [ ] View notification bell
- [ ] Click notification bell
- [ ] See unread badge count
- [ ] Click a notification
- [ ] Mark all as read
- [ ] View all updates from dropdown

### Business Owner Features:
- [ ] Access follower analytics from dashboard
- [ ] View analytics metrics (4 cards)
- [ ] See growth trend chart
- [ ] See gender distribution chart
- [ ] See age distribution chart
- [ ] View top cities list
- [ ] View top interests
- [ ] Click "View Follower List"
- [ ] View detailed follower list
- [ ] Search followers by name
- [ ] Filter by age range
- [ ] Filter by gender
- [ ] Filter by city
- [ ] Sort followers (recent, active, score)
- [ ] Remove a follower (with confirmation)
- [ ] Report suspicious activity
- [ ] Submit report successfully

### Real-Time Features:
- [ ] Receive notification in real-time
- [ ] Following list updates in real-time
- [ ] Bell badge updates in real-time
- [ ] Feed updates in real-time

---

## 🎯 Pro Tips

### For Best Experience:

1. **Create Test Data:**
   - Follow 5-10 businesses
   - Set different notification preferences for each
   - Have businesses with different types of content

2. **Test Real-Time:**
   - Open multiple browser windows
   - Use incognito for different users
   - Watch updates happen live

3. **Test Edge Cases:**
   - Follow, then immediately unfollow
   - Disable all notifications (see warning)
   - Filter with no results
   - Search for non-existent business
   - Try with 0 followers
   - Try with 100+ followers

4. **Test Responsive Design:**
   - Resize browser window
   - Test on mobile (responsive)
   - Test on tablet sizes

5. **Test Performance:**
   - Scroll feed quickly
   - Apply multiple filters
   - Open/close modals repeatedly
   - Navigate between pages

---

## 🐛 What to Look For

### Things That Should Work:
- ✅ Smooth animations
- ✅ Instant feedback (optimistic UI)
- ✅ No page refreshes needed
- ✅ Real-time updates without refresh
- ✅ Loading states when appropriate
- ✅ Error handling (graceful failures)
- ✅ Proper validation (can't save empty forms)

### Report Any Issues:
- ❌ Components not rendering
- ❌ Buttons not responding
- ❌ Data not loading
- ❌ Real-time not working
- ❌ Errors in console
- ❌ Navigation broken
- ❌ Styles missing/broken

---

## 📊 Expected Behavior

### Notification Badge:
- Shows count 1-99
- Shows "99+" for 100+
- Red background when unread > 0
- Animates when new notification arrives
- Clears when all marked as read

### Following List:
- Empty state when no businesses followed
- Search updates list instantly
- Filters apply immediately
- Sort changes order instantly
- Cards animate in/out

### Analytics Dashboard:
- Charts render with data
- Hover shows tooltips
- Responsive to screen size
- Loading states while fetching
- Empty states when no data

### Follower List:
- Pagination for large lists (future)
- Search is instant
- Filters stack (all active at once)
- Sort maintains filters
- Remove shows confirmation
- Report opens modal

---

## 🎉 Enjoy the Features!

You now have a complete guide to experience every feature of Story 4.11. Take your time exploring each feature, and notice the attention to detail:

- 🎨 **Beautiful animations**
- ⚡ **Real-time updates**
- 🎯 **Optimistic UI**
- 🔒 **Secure by default**
- 📱 **Responsive design**
- ♿ **Accessible interfaces**

**Have fun testing!** 🚀

---

## 📞 Quick Navigation

**Customer Routes:**
- `/following` - Your following list
- `/following/feed` - Updates feed
- Any business profile - Follow button

**Business Owner Routes:**
- `/business/dashboard` - Business dashboard
- `/business/:id/followers/analytics` - Analytics
- `/business/:id/followers/list` - Follower list

**Key Features:**
- 🔔 Bell icon - Top navigation (global)
- 💙 Follow button - Business profiles
- ⚙️ Settings - Following list cards
- 🚩 Report - Follower list actions

---

*Enjoy exploring the Follow Business System! 🌟*
