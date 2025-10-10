# Story 4B.4: Enhanced Business Onboarding - Frontend Experience Guide

**Version:** 1.0  
**Date:** 2025-01-10  
**Environment:** Windows Development  
**Prerequisites:** Node.js, npm/yarn, Supabase account

---

## 🎯 Quick Start Overview

This guide will walk you through:
1. Setting up your development environment
2. Running the application locally
3. Experiencing the enhanced business onboarding flow
4. Testing the profile completion widget
5. Verifying data persistence and validation

**Estimated Time:** 30-45 minutes

---

## 📋 Table of Contents

1. [Prerequisites Check](#prerequisites-check)
2. [Environment Setup](#environment-setup)
3. [Database Setup](#database-setup)
4. [Starting the Application](#starting-the-application)
5. [Experiencing the Onboarding Flow](#experiencing-the-onboarding-flow)
6. [Testing Profile Completion Widget](#testing-profile-completion-widget)
7. [Advanced Testing Scenarios](#advanced-testing-scenarios)
8. [Troubleshooting](#troubleshooting)

---

## 1. Prerequisites Check

### Step 1.1: Verify Node.js Installation

Open PowerShell and run:

```powershell
node --version
npm --version
```

**Expected Output:**
```
v18.0.0 or higher
8.0.0 or higher
```

If not installed, download from: https://nodejs.org/

### Step 1.2: Verify Git Installation

```powershell
git --version
```

**Expected Output:**
```
git version 2.x.x or higher
```

### Step 1.3: Verify Project Location

```powershell
cd C:\Users\umama\Documents\GitHub\sync_warp
pwd
```

**Expected Output:**
```
C:\Users\umama\Documents\GitHub\sync_warp
```

---

## 2. Environment Setup

### Step 2.1: Install Project Dependencies

```powershell
# From project root
npm install
```

**Expected Output:**
```
added XXX packages in XXs
```

### Step 2.2: Verify Environment Variables

Check if `.env.local` exists:

```powershell
Test-Path .\.env.local
```

**If False:** Create the file:

```powershell
# Copy from example
Copy-Item .env.example .env.local

# Or create manually
New-Item -Path .\.env.local -ItemType File
```

### Step 2.3: Configure Supabase Credentials

Edit `.env.local` with your Supabase credentials:

```powershell
notepad .\.env.local
```

Add the following:

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

**To get your credentials:**
1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to Settings → API
4. Copy `URL` and `anon` key

---

## 3. Database Setup

### Step 3.1: Verify Database Schema

Ensure the database migration from Story 4B.4 has been applied.

**Check via Supabase Dashboard:**
1. Go to https://supabase.com/dashboard
2. Select your project → SQL Editor
3. Run this check:

```sql
-- Verify new tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'business_customer_profiles',
    'business_metrics',
    'business_marketing_goals',
    'business_onboarding_progress'
  );
```

**Expected Output:** 4 rows (all 4 tables)

### Step 3.2: Apply Migration (If Not Applied)

If tables don't exist, apply the migration:

```powershell
# From project root
npm run supabase:migrate
```

**Or manually via Supabase Dashboard:**
1. Go to SQL Editor
2. Copy contents from: `supabase/migrations/20250110_enhanced_onboarding.sql`
3. Paste and run

### Step 3.3: Create Test Business Account

Create a test business user via SQL Editor:

```sql
-- Create a test business owner
INSERT INTO profiles (id, email, role, full_name)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'testbiz@example.com',
  'business_owner',
  'Test Business Owner'
)
ON CONFLICT (id) DO NOTHING;

-- Create a test business
INSERT INTO businesses (
  id,
  owner_id,
  name,
  category,
  address,
  phone,
  email
)
VALUES (
  '10000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'Test Coffee Shop',
  'food_beverage',
  '123 Main Street, Seattle, WA 98101',
  '555-0100',
  'info@testcoffeeshop.com'
)
ON CONFLICT (id) DO NOTHING;
```

**Note:** Save these IDs for later testing.

---

## 4. Starting the Application

### Step 4.1: Start Development Server

```powershell
# From project root
npm run dev
```

**Expected Output:**
```
> sync_warp@1.0.0 dev
> next dev

  ▲ Next.js 14.x.x
  - Local:        http://localhost:3000
  - Network:      http://192.168.x.x:3000

 ✓ Ready in XXXXms
```

**✅ Checkpoint:** Browser should open automatically to `http://localhost:3000`

### Step 4.2: Verify Server is Running

Open a new PowerShell window and run:

```powershell
# Check if port 3000 is listening
netstat -ano | Select-String ":3000"
```

**Expected Output:**
```
TCP    0.0.0.0:3000           0.0.0.0:0              LISTENING       XXXXX
```

---

## 5. Experiencing the Onboarding Flow

### Step 5.1: Navigate to Onboarding Page

**Option A: Direct URL**
```
http://localhost:3000/business/onboarding
```

**Option B: Via Dashboard**
1. Go to `http://localhost:3000`
2. Log in as business owner
3. Click "Complete Your Profile" banner/button
4. Click "Start Onboarding"

### Step 5.2: Welcome Screen (Step 1)

**What You Should See:**
- ✅ Welcome message
- ✅ Overview of onboarding steps
- ✅ Progress indicator showing "Step 1 of 5"
- ✅ "Let's Get Started" button

**Action:**
```
Click "Let's Get Started" button
```

**Expected Result:**
- Navigate to Step 2 (Customer Profile)
- Progress bar updates to 20%

---

### Step 5.3: Customer Profile (Step 2)

**What You Should See:**
- ✅ Section title: "Tell us about your customers"
- ✅ Age range checkboxes
- ✅ Income level checkboxes
- ✅ Gender distribution sliders
- ✅ Interest categories multi-select
- ✅ Customer behavior notes textarea
- ✅ "Back" and "Continue" buttons
- ✅ Auto-save indicator

#### 5.3.1: Select Age Ranges

**Action:**
```
1. Check "18-24"
2. Check "25-34"
3. Check "35-44"
```

**Expected Result:**
- ✅ Checkboxes turn blue when selected
- ✅ Auto-save indicator shows "Saving..." after 2 seconds
- ✅ Auto-save indicator shows "✓ Saved" when complete

**Screenshot Location:** Top-right corner for save indicator

#### 5.3.2: Select Income Levels

**Action:**
```
1. Check "Middle Income ($50k-$100k)"
2. Check "Upper Middle Income ($100k-$200k)"
```

**Expected Result:**
- ✅ Multiple selections allowed
- ✅ Auto-save triggered

#### 5.3.3: Adjust Gender Distribution

**What You Should See:**
- Three sliders: Male, Female, Other
- Default values: 33% each

**Action:**
```
1. Move "Male" slider to 60%
2. Move "Female" slider to 35%
3. Move "Other" slider to 5%
```

**Expected Result:**
- ✅ Percentages update in real-time
- ✅ Visual bar chart updates
- ✅ Total adds up to 100%
- ✅ Auto-save triggered

#### 5.3.4: Select Interest Categories

**Action:**
```
1. Click dropdown "Select categories..."
2. Select "Food & Dining"
3. Select "Shopping & Retail"
4. Select "Entertainment"
```

**Expected Result:**
- ✅ Selected items show as tags
- ✅ Tags can be removed with X button
- ✅ Dropdown closes after selection

#### 5.3.5: Add Behavior Notes (Optional)

**Action:**
```
Type: "Our typical customer is a young professional who values quality coffee and a comfortable workspace. They often stay for 1-2 hours working on laptops."
```

**Expected Result:**
- ✅ Character count updates
- ✅ Max 500 characters enforced
- ✅ Auto-save triggered

#### 5.3.6: Validation Test - Try to Continue with Missing Data

**Action:**
```
1. Uncheck all age ranges
2. Click "Continue"
```

**Expected Result:**
- ❌ Error message appears: "Please select at least one age range"
- ❌ Cannot proceed to next step
- ✅ Error message is red and prominent

**Action to Fix:**
```
1. Re-check "25-34"
2. Click "Continue"
```

**Expected Result:**
- ✅ Navigate to Step 3
- ✅ Progress bar updates to 40%

---

### Step 5.4: Business Metrics (Step 3)

**What You Should See:**
- ✅ Section title: "Share your business metrics"
- ✅ Input fields with dollar signs and number formatting
- ✅ Helpful tooltips (i icons)
- ✅ Back and Continue buttons

#### 5.4.1: Enter Transaction Value

**Action:**
```
1. Click "Average Transaction Value" field
2. Type: 12.50
```

**Expected Result:**
- ✅ Shows as "$12.50"
- ✅ Currency formatting applied automatically
- ✅ Auto-save triggered

#### 5.4.2: Enter Customer Base Size

**Action:**
```
1. Click "Current Customer Base" field
2. Type: 500
```

**Expected Result:**
- ✅ Number formatting with commas if needed
- ✅ Tooltip explains what counts as a "customer"

#### 5.4.3: Enter Monthly Revenue

**Action:**
```
1. Click "Monthly Revenue" field
2. Type: 45000
```

**Expected Result:**
- ✅ Shows as "$45,000.00"
- ✅ Thousands separator applied

#### 5.4.4: Enter Monthly Marketing Spend (Optional)

**Action:**
```
1. Click "Current Marketing Spend" field
2. Type: 2000
```

**Expected Result:**
- ✅ Shows as "$2,000.00"
- ✅ Marked as optional (lighter label)

#### 5.4.5: Validation - Negative Numbers

**Action:**
```
1. Clear "Average Transaction Value"
2. Type: -10
3. Click "Continue"
```

**Expected Result:**
- ❌ Error: "Value must be greater than 0"
- ❌ Cannot proceed

**Action to Fix:**
```
1. Change to: 12.50
2. Click "Continue"
```

**Expected Result:**
- ✅ Navigate to Step 4
- ✅ Progress bar updates to 60%

---

### Step 5.5: Marketing Goals (Step 4)

**What You Should See:**
- ✅ Section title: "What are your marketing goals?"
- ✅ Primary goal selector (radio buttons)
- ✅ Secondary goals (checkboxes)
- ✅ Monthly budget input
- ✅ Target customer acquisition input

#### 5.5.1: Select Primary Goal

**Action:**
```
Click "Increase Sales" radio button
```

**Expected Result:**
- ✅ Radio button selected (blue)
- ✅ Other options deselected
- ✅ Visual highlight on selected card

#### 5.5.2: Select Secondary Goals

**Action:**
```
1. Check "Build Brand Awareness"
2. Check "Customer Retention"
```

**Expected Result:**
- ✅ Multiple selections allowed
- ✅ Checkboxes remain checked
- ✅ Auto-save triggered

#### 5.5.3: Enter Monthly Budget

**Action:**
```
1. Click "Monthly Marketing Budget" field
2. Type: 5000
```

**Expected Result:**
- ✅ Shows as "$5,000.00"
- ✅ Helpful message: "Based on your revenue, we recommend 5-10%"

#### 5.5.4: Enter Target Acquisition

**Action:**
```
1. Click "Target New Customers per Month" field
2. Type: 50
```

**Expected Result:**
- ✅ Number formatted
- ✅ Calculator icon showing "Cost per acquisition: $100"

#### 5.5.5: Continue to Review

**Action:**
```
Click "Continue" button
```

**Expected Result:**
- ✅ Navigate to Step 5 (Review)
- ✅ Progress bar updates to 80%

---

### Step 5.6: Review & Submit (Step 5)

**What You Should See:**
- ✅ Section title: "Review your information"
- ✅ Summary cards for each section:
  - Customer Profile
  - Business Metrics
  - Marketing Goals
- ✅ Edit buttons for each section
- ✅ "Submit Onboarding" button

#### 5.6.1: Review Customer Profile Card

**What You Should See:**
```
👥 Customer Profile
━━━━━━━━━━━━━━━━━━━━
Age Ranges: 25-34, 35-44
Income: Middle, Upper Middle
Gender: 60% Male, 35% Female, 5% Other
Interests: Food & Dining, Shopping & Retail, Entertainment
Notes: "Our typical customer is..."

[Edit] button
```

#### 5.6.2: Test Edit Functionality

**Action:**
```
1. Click "Edit" button on Customer Profile card
```

**Expected Result:**
- ✅ Navigate back to Step 2
- ✅ All previous data pre-filled
- ✅ Can make changes

**Action:**
```
1. Add "45-54" age range
2. Click "Continue" to return to Review
```

**Expected Result:**
- ✅ Return to Step 5
- ✅ Updated data shown
- ✅ New age range visible

#### 5.6.3: Review Business Metrics Card

**What You Should See:**
```
📊 Business Metrics
━━━━━━━━━━━━━━━━━━━━
Avg Transaction: $12.50
Customer Base: 500 customers
Monthly Revenue: $45,000.00
Marketing Spend: $2,000.00

[Edit] button
```

#### 5.6.4: Review Marketing Goals Card

**What You Should See:**
```
🎯 Marketing Goals
━━━━━━━━━━━━━━━━━━━━
Primary Goal: Increase Sales
Secondary Goals: Brand Awareness, Customer Retention
Monthly Budget: $5,000.00
Target Acquisitions: 50/month

[Edit] button
```

#### 5.6.5: Submit Onboarding

**Action:**
```
Click "Submit Onboarding" button
```

**Expected Result:**
- ✅ Loading spinner appears
- ✅ Button text changes to "Submitting..."
- ✅ Button disabled during submission

**After Submission (2-3 seconds):**
- ✅ Success message appears
- ✅ Confetti animation (optional)
- ✅ Redirect to Business Dashboard
- ✅ Progress bar shows 100%

---

## 6. Testing Profile Completion Widget

### Step 6.1: Navigate to Business Dashboard

**URL:**
```
http://localhost:3000/business/dashboard
```

**What You Should See:**
- ✅ Dashboard with sidebar
- ✅ Profile Completion Widget in top-right corner

### Step 6.2: Examine Widget Components

**Profile Completion Widget Should Show:**

```
┌─────────────────────────────────┐
│   Profile Completion            │
│                                 │
│      ╭─────────────╮            │
│      │             │            │
│      │     100%    │  ← Circular │
│      │   Complete  │    Progress │
│      │             │            │
│      ╰─────────────╯            │
│                                 │
│   ✅ Basics: 100%               │
│   ✅ Customer Profile: 100%     │
│   ✅ Metrics: 100%              │
│   ✅ Marketing Goals: 100%      │
│                                 │
│   🎉 Your profile is complete!  │
│                                 │
│   [View Details] button         │
└─────────────────────────────────┘
```

### Step 6.3: Test Incomplete Profile

To test the widget with incomplete data, we'll edit the business profile:

#### 6.3.1: Remove Some Data via SQL

Open Supabase SQL Editor and run:

```sql
-- Remove marketing goals
DELETE FROM business_marketing_goals 
WHERE business_id = '10000000-0000-0000-0000-000000000001';
```

#### 6.3.2: Refresh Dashboard

**Action:**
```
Press F5 or Ctrl+R to refresh the page
```

**Expected Result - Widget Should Now Show:**

```
┌─────────────────────────────────┐
│   Profile Completion            │
│                                 │
│      ╭─────────────╮            │
│      │             │            │
│      │     75%     │  ← Updated │
│      │  Complete   │    Percentage │
│      │             │            │
│      ╰─────────────╯            │
│                                 │
│   ✅ Basics: 100%               │
│   ✅ Customer Profile: 100%     │
│   ✅ Metrics: 100%              │
│   ⚠️  Marketing Goals: 0%       │  ← Warning │
│                                 │
│   📋 Missing Information:       │
│   • Primary marketing goal      │
│   • Monthly marketing budget    │
│                                 │
│   💡 Recommendations:           │
│   • Complete marketing goals    │
│     to unlock advanced features │
│                                 │
│   [Complete Profile] button     │
└─────────────────────────────────┘
```

#### 6.3.3: Click "Complete Profile" Button

**Action:**
```
Click "Complete Profile" button in widget
```

**Expected Result:**
- ✅ Navigate to onboarding page
- ✅ Start at Step 4 (Marketing Goals) - the incomplete section
- ✅ Can complete missing data
- ✅ After saving, redirect to dashboard
- ✅ Widget updates to 100%

---

## 7. Advanced Testing Scenarios

### Scenario 7.1: Exit and Resume Onboarding

#### 7.1.1: Start Fresh Onboarding

1. Delete onboarding progress:
```sql
DELETE FROM business_onboarding_progress 
WHERE business_id = '10000000-0000-0000-0000-000000000001';
```

2. Navigate to onboarding: `http://localhost:3000/business/onboarding`

#### 7.1.2: Partially Complete Step 2

**Action:**
```
1. Complete Step 1 (Welcome)
2. On Step 2, fill in:
   - Age ranges: 25-34
   - Income: Middle
3. Wait for auto-save (2 seconds)
4. Click browser back button or close tab
```

#### 7.1.3: Return to Onboarding

**Action:**
```
1. Navigate back to: http://localhost:3000/business/onboarding
```

**Expected Result:**
- ✅ Modal appears: "Resume Onboarding?"
- ✅ Shows: "You have progress saved from [date/time]"
- ✅ Two buttons: "Start Fresh" | "Resume"

**Action:**
```
Click "Resume" button
```

**Expected Result:**
- ✅ Navigate to Step 2 (where you left off)
- ✅ Previous data is pre-filled:
  - Age ranges: 25-34 ✓
  - Income: Middle ✓
- ✅ Can continue from where you left off

---

### Scenario 7.2: Exit Confirmation Modal

#### 7.2.1: Trigger Exit Modal

**Action:**
```
1. While on any onboarding step (e.g., Step 2)
2. Click the "X" close button in top-right corner
```

**Expected Result - Modal Appears:**

```
┌─────────────────────────────────────┐
│  Save Your Progress?                │
│                                     │
│  You have unsaved changes. Your     │
│  progress will be saved             │
│  automatically.                     │
│                                     │
│  [Exit & Save]    [Stay Here]      │
└─────────────────────────────────────┘
```

#### 7.2.2: Test "Stay Here" Button

**Action:**
```
Click "Stay Here" button
```

**Expected Result:**
- ✅ Modal closes
- ✅ Remain on current step
- ✅ No data lost

#### 7.2.3: Test "Exit & Save" Button

**Action:**
```
1. Click "X" button again
2. Click "Exit & Save" button
```

**Expected Result:**
- ✅ Loading indicator briefly shows
- ✅ Redirect to business dashboard
- ✅ Progress is saved (verify by returning)

---

### Scenario 7.3: Real-Time Validation

#### 7.3.1: Test Age Range Validation

**Action:**
```
1. Go to Step 2 (Customer Profile)
2. Uncheck all age ranges
3. Click "Continue"
```

**Expected Result:**
- ❌ Red error message under age ranges section
- ❌ "Please select at least one age range"
- ❌ Cannot proceed
- ✅ Focus moves to error section
- ✅ Error icon (!) appears

#### 7.3.2: Test Income Level Validation

**Action:**
```
1. Uncheck all income levels
2. Click "Continue"
```

**Expected Result:**
- ❌ Error: "Please select at least one income level"
- ❌ Multiple errors can show simultaneously

#### 7.3.3: Test Numeric Validation

**Action:**
```
1. Go to Step 3 (Business Metrics)
2. In "Average Transaction Value", type: "abc"
```

**Expected Result:**
- ✅ Non-numeric characters not accepted
- ✅ Only numbers and decimal point allowed

**Action:**
```
In "Average Transaction Value", type: "0"
Click "Continue"
```

**Expected Result:**
- ❌ Error: "Value must be greater than 0"

---

### Scenario 7.4: Mobile Responsive Testing

#### 7.4.1: Test on Mobile Viewport

**Action:**
```
1. Press F12 to open DevTools
2. Click device toggle (Ctrl+Shift+M)
3. Select "iPhone 12 Pro" or similar
```

**Expected Result:**
- ✅ Layout adjusts to mobile viewport
- ✅ All elements visible without horizontal scroll
- ✅ Buttons are tap-friendly (min 44x44px)
- ✅ Text is readable (min 16px)
- ✅ Sliders work with touch
- ✅ Progress indicator remains visible

#### 7.4.2: Test Tablet View

**Action:**
```
Select "iPad" or similar tablet viewport
```

**Expected Result:**
- ✅ Layout uses available space efficiently
- ✅ Two-column layouts where appropriate
- ✅ Navigation remains accessible

---

### Scenario 7.5: Performance Testing

#### 7.5.1: Measure Auto-Save Performance

**Action:**
```
1. Press F12 → Network tab
2. Go to Step 2
3. Type in "Customer Behavior Notes"
4. Watch Network tab
```

**Expected Result:**
- ✅ No network request while typing
- ✅ After 2 seconds of inactivity, one request fires
- ✅ Request completes in < 500ms
- ✅ No duplicate requests

#### 7.5.2: Measure Page Load Time

**Action:**
```
1. Press F12 → Performance tab
2. Click record
3. Navigate to onboarding page
4. Stop recording
```

**Expected Result:**
- ✅ Page interactive in < 2 seconds
- ✅ No layout shifts (CLS < 0.1)
- ✅ Smooth animations (60fps)

---

## 8. Troubleshooting

### Issue 8.1: "Cannot connect to Supabase"

**Symptoms:**
- Loading spinners don't stop
- No data appears
- Console errors about network

**Solution:**
```powershell
# Check .env.local
Get-Content .\.env.local

# Verify URLs are correct (no trailing slashes)
# Restart dev server
npm run dev
```

### Issue 8.2: "Profile completion not updating"

**Symptoms:**
- Widget shows 0% after completing onboarding
- Percentages don't change

**Solution:**
```sql
-- Manually trigger recalculation
SELECT calculate_profile_completion('your-business-id');

-- Check if triggers are enabled
SELECT * FROM pg_trigger 
WHERE tgname LIKE '%profile_completion%';
```

### Issue 8.3: "Auto-save not working"

**Symptoms:**
- No "Saving..." indicator appears
- Data lost when navigating away

**Checks:**
1. Open DevTools → Console
2. Look for errors
3. Check Network tab for failed requests

**Solution:**
```javascript
// Check if hook is properly initialized
// In browser console:
console.log('Auto-save enabled:', localStorage.getItem('autosave-enabled'));
```

### Issue 8.4: "Validation errors not showing"

**Symptoms:**
- Can proceed with invalid data
- No red error messages

**Solution:**
```
1. Clear browser cache (Ctrl+Shift+Del)
2. Hard refresh (Ctrl+F5)
3. Check browser console for JavaScript errors
```

### Issue 8.5: "Modal not appearing"

**Symptoms:**
- Exit confirmation doesn't show
- Resume prompt doesn't appear

**Solution:**
```
1. Check if modals are blocked by browser
2. Disable any ad-blockers
3. Check z-index in DevTools
```

---

## 🎯 Success Criteria Checklist

After completing this guide, you should have:

### Functional Testing
- ✅ Completed full onboarding flow (5 steps)
- ✅ Verified auto-save functionality
- ✅ Tested validation on all required fields
- ✅ Tested exit and resume functionality
- ✅ Verified profile completion calculation
- ✅ Tested edit functionality from review step

### Data Persistence
- ✅ Data persists across page refreshes
- ✅ Data persists when exiting and resuming
- ✅ Database updates reflect in widget
- ✅ Timestamps update correctly

### UI/UX Testing
- ✅ All animations work smoothly
- ✅ Loading states appear appropriately
- ✅ Error messages are clear and helpful
- ✅ Success messages confirm actions
- ✅ Responsive design works on all viewports

### Performance
- ✅ Page loads in < 2 seconds
- ✅ Auto-save debounces properly (2s)
- ✅ No network request spam
- ✅ Smooth 60fps animations

---

## 📸 Screenshot Checklist

Document your testing with screenshots of:

1. ✅ Welcome screen (Step 1)
2. ✅ Customer Profile form (Step 2) - filled
3. ✅ Validation error messages
4. ✅ Auto-save indicator
5. ✅ Business Metrics form (Step 3)
6. ✅ Marketing Goals form (Step 4)
7. ✅ Review page (Step 5)
8. ✅ Profile completion widget at 100%
9. ✅ Profile completion widget at < 100% (with warnings)
10. ✅ Exit confirmation modal
11. ✅ Resume onboarding prompt
12. ✅ Mobile responsive view

---

## 📊 Test Results Template

Use this template to document your testing:

```markdown
## Test Results - Story 4B.4 Frontend

**Tester:** [Your Name]
**Date:** [Date]
**Browser:** Chrome/Firefox/Safari [Version]
**Device:** Desktop/Mobile/Tablet

### Onboarding Flow
- [ ] Step 1: Welcome - PASS/FAIL
- [ ] Step 2: Customer Profile - PASS/FAIL
- [ ] Step 3: Business Metrics - PASS/FAIL
- [ ] Step 4: Marketing Goals - PASS/FAIL
- [ ] Step 5: Review & Submit - PASS/FAIL

### Features
- [ ] Auto-save functionality - PASS/FAIL
- [ ] Validation messages - PASS/FAIL
- [ ] Exit confirmation - PASS/FAIL
- [ ] Resume functionality - PASS/FAIL
- [ ] Profile completion widget - PASS/FAIL

### Issues Found
1. [Issue description]
2. [Issue description]

### Overall Rating: ⭐⭐⭐⭐⭐
```

---

## 🚀 Next Steps

After completing this guide:

1. **Document Issues:** Report any bugs found using the bug template in `STORY_4B.4_TEST_PLAN.md`

2. **Share Feedback:** Provide UX feedback on:
   - Clarity of instructions
   - Ease of navigation
   - Visual design
   - Mobile experience

3. **Performance Testing:** Run Lighthouse audit:
   ```
   F12 → Lighthouse tab → Generate report
   ```

4. **Accessibility Testing:** Check with screen reader (NVDA/JAWS)

5. **Cross-Browser Testing:** Test on:
   - Chrome
   - Firefox
   - Safari
   - Edge

---

## 📞 Support

**Issues?** Contact:
- Development Team: [team@example.com]
- Slack Channel: #sync-warp-dev
- GitHub Issues: [repository-url]/issues

**Documentation:**
- Technical Spec: `docs/STORY_4B.4_IMPLEMENTATION_PLAN.md`
- Test Plan: `docs/STORY_4B.4_TEST_PLAN.md`
- API Docs: `docs/API_REFERENCE.md`

---

**Status:** ✅ Ready for Testing  
**Last Updated:** 2025-01-10  
**Version:** 1.0

Happy Testing! 🎉
