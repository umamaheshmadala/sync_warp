# Story 5.2: Review System - Testing Checklist

**Date:** December 2024  
**Status:** 🟡 In Progress - Integration Complete, Testing Required

---

## Implementation Status: ✅ COMPLETE

### Completed Items:
1. ✅ **Reviews Tab Added** - BusinessProfile now includes Reviews tab
2. ✅ **BusinessReviews Component Integrated** - Properly imported from `../reviews/BusinessReviews`
3. ✅ **Tab Rendering Logic Updated** - Reviews tab renders BusinessReviews component
4. ✅ **/businesses Route Added** - Route configured to BusinessDiscoveryPage
5. ✅ **Database Schema Verified** - `business_reviews` and `business_review_responses` tables exist
6. ✅ **RLS Policies Confirmed** - Row-level security policies in place

---

## Testing Checklist

### Phase 1: Visual Verification ✅ READY TO TEST

- [ ] **Navigate to /businesses**
  - Route should load BusinessDiscoveryPage
  - Should not show 404 error
  
- [ ] **Navigate to a Business Profile**
  - Click on any business from the discovery page
  - Business profile should load successfully
  
- [ ] **Reviews Tab Visibility**
  - Reviews tab should appear alongside Overview and Statistics tabs
  - Review count badge should display (may be 0 if no reviews yet)
  
- [ ] **Click Reviews Tab**
  - Clicking should switch to reviews section
  - Should display BusinessReviews component
  - Should show "No reviews yet" message if no reviews exist

---

### Phase 2: Functional Testing (Non-Owner User)

**Prerequisites:**
- Have at least 2 test accounts (one business owner, one regular user)
- Have at least one test business registered
- Regular user should have an active check-in at the test business

#### Test Case 1: View Reviews
- [ ] Navigate to business profile as non-owner
- [ ] Click Reviews tab
- [ ] Verify reviews list displays (or "No reviews" message)
- [ ] Verify "Write Review" button is visible

#### Test Case 2: Check-in Requirement
- [ ] User WITHOUT check-in attempts to write review
- [ ] Should see "You must check in to write a review" message
- [ ] Check-in at the business
- [ ] Verify "Write Review" button becomes enabled

#### Test Case 3: Write a Review
- [ ] Click "Write Review" button
- [ ] WriteReviewModal should open
- [ ] Toggle recommendation (Recommend/Don't Recommend)
- [ ] Add review text (max 30 words)
- [ ] Submit review
- [ ] Verify success toast appears
- [ ] Verify modal closes
- [ ] Verify new review appears in list

#### Test Case 4: Review Display
- [ ] Verify review shows:
  - User's name and avatar
  - Recommendation badge (thumbs up/down)
  - Review text
  - Date posted
  - "Edited" badge if applicable
- [ ] Verify review actions only visible to review author

#### Test Case 5: Edit Own Review (Within 24h)
- [ ] Click edit button on own review
- [ ] Modify review text
- [ ] Submit changes
- [ ] Verify review updates
- [ ] Verify "Edited" badge appears

#### Test Case 6: Delete Own Review
- [ ] Click delete button on own review
- [ ] Confirm deletion
- [ ] Verify review disappears from list
- [ ] Verify business review count decrements

---

### Phase 3: Functional Testing (Business Owner)

#### Test Case 7: Owner Cannot Review Own Business
- [ ] Login as business owner
- [ ] Navigate to own business profile
- [ ] Click Reviews tab
- [ ] Verify "Write Review" button is NOT visible
- [ ] Verify message: "Business owners cannot review their own business"

#### Test Case 8: View All Reviews
- [ ] View all reviews on own business
- [ ] Verify can see all customer reviews
- [ ] Verify "Respond" button visible on reviews without response

#### Test Case 9: Respond to Review
- [ ] Click "Respond" button on a review
- [ ] Type response (max 50 words)
- [ ] Submit response
- [ ] Verify response appears under review
- [ ] Verify response shows business owner badge

#### Test Case 10: Edit Own Response
- [ ] Click edit on own response
- [ ] Modify response text
- [ ] Submit changes
- [ ] Verify response updates

#### Test Case 11: Delete Own Response
- [ ] Click delete on own response
- [ ] Confirm deletion
- [ ] Verify response disappears
- [ ] Verify "Respond" button reappears

---

### Phase 4: Edge Cases & Validation

#### Test Case 12: Word Limit Enforcement
- [ ] Try writing review > 30 words
- [ ] Verify character/word counter appears
- [ ] Verify submit button disabled when over limit
- [ ] Verify validation error message displays

#### Test Case 13: Duplicate Review Prevention
- [ ] User with existing review attempts to write another
- [ ] Verify error message: "You've already reviewed this business"
- [ ] Verify modal doesn't open or shows edit option instead

#### Test Case 14: 24-Hour Edit Window
- [ ] Create a review
- [ ] Wait > 24 hours (or modify database timestamp for testing)
- [ ] Verify edit button becomes disabled
- [ ] Verify tooltip/message explains 24-hour limit

#### Test Case 15: Unauthenticated User
- [ ] Logout
- [ ] Navigate to business profile
- [ ] Click Reviews tab
- [ ] Verify reviews are visible (public read)
- [ ] Verify "Write Review" button shows "Login to review"

---

### Phase 5: Data Integrity

#### Test Case 16: Business Stats Update
- [ ] Note business's total_reviews count
- [ ] Add a new review
- [ ] Verify total_reviews increments
- [ ] Delete a review
- [ ] Verify total_reviews decrements

#### Test Case 17: Average Rating Calculation
- [ ] Add multiple reviews (mix of recommend/don't recommend)
- [ ] Verify business profile shows correct recommendation percentage
- [ ] Formula: (recommend_count / total_reviews) * 100

#### Test Case 18: Review Persistence
- [ ] Create a review
- [ ] Refresh page
- [ ] Verify review still displays
- [ ] Navigate away and back
- [ ] Verify review persists

---

### Phase 6: Performance & UX

#### Test Case 19: Pagination
- [ ] Business with > 10 reviews
- [ ] Verify pagination controls appear
- [ ] Click "Load More" or page navigation
- [ ] Verify smooth loading of additional reviews

#### Test Case 20: Loading States
- [ ] Verify loading spinner while fetching reviews
- [ ] Verify loading state during review submission
- [ ] Verify optimistic UI updates where applicable

#### Test Case 21: Error Handling
- [ ] Simulate network error during review submission
- [ ] Verify error toast displays
- [ ] Verify form doesn't reset (user can retry)
- [ ] Verify graceful degradation

---

## Known Issues / Limitations

### ⚠️ Items Requiring Attention:
1. **Check-in Validation**: Ensure check-in gating is enforced server-side (RLS policy in place)
2. **Photo Upload**: Story mentions photo uploads, but UI component may not have this feature yet
3. **Tags System**: Review tags mentioned in schema, but UI may not support tag selection yet

---

## Database Verification Commands

Run these in Supabase SQL Editor to verify data:

```sql
-- Check if review tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('business_reviews', 'business_review_responses');

-- Check review count for a specific business
SELECT 
  business_id,
  COUNT(*) as total_reviews,
  COUNT(*) FILTER (WHERE recommendation = true) as recommendations,
  COUNT(*) FILTER (WHERE recommendation = false) as not_recommended
FROM business_reviews
WHERE business_id = 'YOUR_BUSINESS_ID_HERE'
GROUP BY business_id;

-- Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('business_reviews', 'business_review_responses');

-- View all RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('business_reviews', 'business_review_responses');
```

---

## Success Criteria

✅ **Story 5.2 is considered COMPLETE when:**
1. All Phase 1-3 test cases pass
2. At least 80% of Phase 4-5 test cases pass
3. No critical bugs in Phase 6
4. Reviews can be created, read, updated, and deleted successfully
5. Business owners can respond to reviews
6. Check-in gating works as expected
7. RLS policies prevent unauthorized access

---

## Next Steps After Testing

1. Document any bugs found
2. Fix critical issues
3. Create user documentation/help text
4. Add review system to onboarding tutorial
5. Consider adding:
   - Email notifications for new reviews
   - Review moderation tools
   - Photo upload functionality
   - Tag selection UI
   - Review reporting/flagging

---

**Tester:** _________  
**Date Tested:** _________  
**Result:** ⬜ PASS | ⬜ FAIL | ⬜ PASS WITH ISSUES

**Notes:**
_______________________________________________________
_______________________________________________________
_______________________________________________________
