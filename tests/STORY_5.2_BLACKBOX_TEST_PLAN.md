# Story 5.2: Binary Review System - Black-Box Test Plan

**Test Plan Version**: 1.0  
**Created**: January 30, 2025  
**Story**: 5.2 - Binary Review System  
**Testing Type**: Black-Box (Functional Testing)

---

## 📋 Test Plan Overview

### Objectives
1. Verify all user-facing features work as specified
2. Test all user workflows and edge cases
3. Validate data integrity and security constraints
4. Ensure proper error handling and user feedback
5. Confirm UI/UX meets acceptance criteria

### Scope
- ✅ Binary recommendation system
- ✅ 30-word text limit enforcement
- ✅ GPS check-in gating
- ✅ Photo upload functionality
- ✅ Tags/categories selection
- ✅ Edit reviews (24-hour window)
- ✅ Delete reviews
- ✅ Business owner responses
- ✅ My Reviews page
- ✅ Real-time updates

### Out of Scope
- Performance/load testing
- Security penetration testing
- Cross-browser compatibility (focus on Chrome/Edge)
- Mobile app testing (focus on web)

---

## 🎯 Test Environment Setup

### Prerequisites
1. **Database**: Supabase project with Story 5.2 migration applied
2. **Users**: 
   - Test User 1: Regular user (test1@example.com)
   - Test User 2: Regular user (test2@example.com)
   - Business Owner: Owner account (owner@example.com)
3. **Test Data**:
   - At least 2 test businesses with GPS coordinates
   - GPS check-ins created for test users
   - Sample photos (< 5MB, various formats)
4. **Browser**: Chrome or Edge (latest version)
5. **Environment**: Development or staging environment

### Test Data Setup

```sql
-- Create test users (if not exists)
-- Use Supabase Auth UI to create:
-- test1@example.com / Test123!
-- test2@example.com / Test123!
-- owner@example.com / Test123!

-- Create test business
INSERT INTO businesses (id, name, owner_id, latitude, longitude, address)
VALUES 
  ('test-business-1', 'Test Restaurant', 'owner-user-id', 40.7128, -74.0060, '123 Test St'),
  ('test-business-2', 'Test Cafe', 'owner-user-id', 40.7580, -73.9855, '456 Test Ave');

-- Create test check-ins
INSERT INTO business_checkins (user_id, business_id, latitude, longitude)
VALUES
  ('test-user-1-id', 'test-business-1', 40.7128, -74.0060),
  ('test-user-2-id', 'test-business-1', 40.7128, -74.0060);
```

---

## 🧪 Test Cases

### Test Suite 1: Binary Recommendation System

#### TC-1.1: Submit Positive Review
**Priority**: High  
**Precondition**: User logged in, has GPS check-in at business

| Step | Action | Expected Result | Status |
|------|--------|----------------|--------|
| 1 | Navigate to business page | Business details displayed | ⬜ |
| 2 | Click "Write Review" button | Review form opens | ⬜ |
| 3 | Click "👍 Recommend" button | Button highlighted, checkmark shown | ⬜ |
| 4 | Enter text "Great food and service!" | Text appears, word count shows "4/30" | ⬜ |
| 5 | Click "Submit Review" | Success message shown | ⬜ |
| 6 | Check business page | Review appears with thumbs up badge | ⬜ |

**Test Data**:
- User: test1@example.com
- Business: Test Restaurant
- Review text: "Great food and service!"

---

#### TC-1.2: Submit Negative Review
**Priority**: High  
**Precondition**: User logged in, has GPS check-in at business

| Step | Action | Expected Result | Status |
|------|--------|----------------|--------|
| 1 | Navigate to business page | Business details displayed | ⬜ |
| 2 | Click "Write Review" button | Review form opens | ⬜ |
| 3 | Click "👎 Don't Recommend" button | Button highlighted, checkmark shown | ⬜ |
| 4 | Enter text "Poor service and overpriced" | Text appears, word count shows "4/30" | ⬜ |
| 5 | Click "Submit Review" | Success message shown | ⬜ |
| 6 | Check business page | Review appears with thumbs down badge | ⬜ |

---

#### TC-1.3: Attempt Submit Without Recommendation
**Priority**: High  
**Precondition**: User logged in, has GPS check-in

| Step | Action | Expected Result | Status |
|------|--------|----------------|--------|
| 1 | Navigate to business page | Business details displayed | ⬜ |
| 2 | Click "Write Review" button | Review form opens | ⬜ |
| 3 | Enter text "This is a test review" | Text appears in text area | ⬜ |
| 4 | Click "Submit Review" | Error: "Please select recommend or don't recommend" | ⬜ |
| 5 | Verify review not submitted | No new review on business page | ⬜ |

---

### Test Suite 2: 30-Word Text Limit

#### TC-2.1: Submit Review Within Limit
**Priority**: High  
**Precondition**: User logged in, has GPS check-in

| Step | Action | Expected Result | Status |
|------|--------|----------------|--------|
| 1 | Open review form | Form displayed | ⬜ |
| 2 | Select recommendation (👍) | Button highlighted | ⬜ |
| 3 | Enter 20-word text | Word counter shows "20/30" in green | ⬜ |
| 4 | Click Submit | Review submitted successfully | ⬜ |

**Test Data**:
```
"The ambiance was perfect for a romantic dinner. Staff were attentive and the food was absolutely delicious. Will definitely return soon!"
(20 words)
```

---

#### TC-2.2: Word Count Warning (25-30 words)
**Priority**: Medium  
**Precondition**: User logged in, has GPS check-in

| Step | Action | Expected Result | Status |
|------|--------|----------------|--------|
| 1 | Open review form | Form displayed | ⬜ |
| 2 | Select recommendation (👍) | Button highlighted | ⬜ |
| 3 | Enter 28-word text | Word counter shows "28/30" in yellow/amber | ⬜ |
| 4 | Add 2 more words (30 total) | Word counter shows "30/30" in yellow/amber | ⬜ |
| 5 | Click Submit | Review submitted successfully | ⬜ |

**Test Data**:
```
"Excellent restaurant with amazing food quality and presentation. The service was outstanding and the atmosphere was cozy and welcoming. Prices were reasonable for the quality. Highly recommended for special occasions."
(30 words exactly)
```

---

#### TC-2.3: Exceed Word Limit (Block Submission)
**Priority**: High  
**Precondition**: User logged in, has GPS check-in

| Step | Action | Expected Result | Status |
|------|--------|----------------|--------|
| 1 | Open review form | Form displayed | ⬜ |
| 2 | Select recommendation (👍) | Button highlighted | ⬜ |
| 3 | Enter 35-word text | Word counter shows "35/30" in RED | ⬜ |
| 4 | Verify submit button | Submit button DISABLED or shows error | ⬜ |
| 5 | Attempt to click Submit | Nothing happens OR error message | ⬜ |
| 6 | Remove 6 words (now 29) | Counter shows "29/30" in green, button enabled | ⬜ |
| 7 | Click Submit | Review submitted successfully | ⬜ |

**Test Data (31 words - should fail)**:
```
"This restaurant exceeded all my expectations with its incredible food, impeccable service, and wonderful atmosphere. Every dish was perfectly prepared and beautifully presented. I will absolutely return and recommend to everyone I know."
(31 words)
```

---

#### TC-2.4: Real-time Word Counter
**Priority**: Medium  
**Precondition**: User logged in, has GPS check-in

| Step | Action | Expected Result | Status |
|------|--------|----------------|--------|
| 1 | Open review form | Counter shows "0/30" | ⬜ |
| 2 | Type "Great" | Counter shows "1/30" | ⬜ |
| 3 | Type " food and" | Counter shows "3/30" | ⬜ |
| 4 | Type " service here" | Counter shows "5/30" | ⬜ |
| 5 | Delete " here" | Counter shows "4/30" | ⬜ |
| 6 | Verify color changes | Green → Yellow (at 25) → Red (at 31) | ⬜ |

---

### Test Suite 3: GPS Check-in Gating

#### TC-3.1: Attempt Review Without Check-in
**Priority**: Critical  
**Precondition**: User logged in, NO check-in at business

| Step | Action | Expected Result | Status |
|------|--------|----------------|--------|
| 1 | Navigate to business (no check-in) | Business page shown | ⬜ |
| 2 | Click "Write Review" button | Review form opens | ⬜ |
| 3 | Notice displayed at top | "⚠️ GPS check-in required to review" | ⬜ |
| 4 | Fill form with valid data | Form accepts input | ⬜ |
| 5 | Click Submit | ERROR: "Must check-in first to review" | ⬜ |
| 6 | Verify review not created | No review on business page | ⬜ |

---

#### TC-3.2: Review After Valid Check-in
**Priority**: Critical  
**Precondition**: User logged in

| Step | Action | Expected Result | Status |
|------|--------|----------------|--------|
| 1 | Navigate to business page | Business shown | ⬜ |
| 2 | Perform GPS check-in | Check-in success message | ⬜ |
| 3 | Click "Write Review" | Review form opens | ⬜ |
| 4 | Verify notice | "✅ You can review (checked in)" | ⬜ |
| 5 | Fill and submit review | Review created successfully | ⬜ |

---

#### TC-3.3: One Review Per User Per Business
**Priority**: High  
**Precondition**: User already has a review for business

| Step | Action | Expected Result | Status |
|------|--------|----------------|--------|
| 1 | Navigate to business page | Existing review shown | ⬜ |
| 2 | Attempt to write another review | "Write Review" button disabled OR shows "Already reviewed" | ⬜ |
| 3 | Click existing review | Shows edit/delete options instead | ⬜ |

---

### Test Suite 4: Photo Upload

#### TC-4.1: Upload Valid Photo (JPG)
**Priority**: High  
**Precondition**: User logged in, has check-in

| Step | Action | Expected Result | Status |
|------|--------|----------------|--------|
| 1 | Open review form | Form displayed | ⬜ |
| 2 | Click "Upload Photo" or drag-drop area | File picker opens | ⬜ |
| 3 | Select JPG image (< 5MB) | Upload starts, progress shown | ⬜ |
| 4 | Wait for upload | Photo preview displayed | ⬜ |
| 5 | Fill rest of form and submit | Review created with photo | ⬜ |
| 6 | View review on business page | Photo thumbnail shown | ⬜ |
| 7 | Click photo | Full-size modal opens | ⬜ |

**Test File**: `test-image.jpg` (2MB, 1920x1080)

---

#### TC-4.2: Upload Valid Photo (PNG)
**Priority**: High  
**Precondition**: User logged in, has check-in

| Step | Action | Expected Result | Status |
|------|--------|----------------|--------|
| 1 | Open review form | Form displayed | ⬜ |
| 2 | Upload PNG image (< 5MB) | Upload succeeds, preview shown | ⬜ |
| 3 | Submit review | Review created with PNG photo | ⬜ |

**Test File**: `test-image.png` (3MB, 1200x800)

---

#### TC-4.3: Reject Invalid File Type (PDF)
**Priority**: High  
**Precondition**: User logged in, has check-in

| Step | Action | Expected Result | Status |
|------|--------|----------------|--------|
| 1 | Open review form | Form displayed | ⬜ |
| 2 | Attempt upload PDF file | ERROR: "Only images allowed (JPG, PNG, WEBP)" | ⬜ |
| 3 | Verify no preview | No photo preview shown | ⬜ |

**Test File**: `test-document.pdf`

---

#### TC-4.4: Reject Oversized Image
**Priority**: High  
**Precondition**: User logged in, has check-in

| Step | Action | Expected Result | Status |
|------|--------|----------------|--------|
| 1 | Open review form | Form displayed | ⬜ |
| 2 | Attempt upload 10MB image | ERROR: "File too large (max 5MB)" | ⬜ |
| 3 | Verify no upload | No photo uploaded | ⬜ |

**Test File**: `large-image.jpg` (10MB+)

---

#### TC-4.5: Remove Uploaded Photo
**Priority**: Medium  
**Precondition**: User logged in, has check-in

| Step | Action | Expected Result | Status |
|------|--------|----------------|--------|
| 1 | Open review form | Form displayed | ⬜ |
| 2 | Upload valid photo | Photo preview shown | ⬜ |
| 3 | Click "Remove" or "X" button | Photo removed, upload area shown again | ⬜ |
| 4 | Submit review without photo | Review created without photo | ⬜ |

---

#### TC-4.6: Review Without Photo (Optional)
**Priority**: High  
**Precondition**: User logged in, has check-in

| Step | Action | Expected Result | Status |
|------|--------|----------------|--------|
| 1 | Open review form | Form displayed | ⬜ |
| 2 | Skip photo upload | No error shown | ⬜ |
| 3 | Fill form and submit | Review created successfully (no photo) | ⬜ |
| 4 | View review | No photo shown, text only | ⬜ |

---

### Test Suite 5: Tags/Categories

#### TC-5.1: Select Tags (1-5 tags)
**Priority**: High  
**Precondition**: User logged in, has check-in

| Step | Action | Expected Result | Status |
|------|--------|----------------|--------|
| 1 | Open review form | Form with tag section shown | ⬜ |
| 2 | Click "Food Quality" tag | Tag highlighted/selected | ⬜ |
| 3 | Click "Service" tag | Tag highlighted, counter shows "2 selected" | ⬜ |
| 4 | Click "Atmosphere" tag | 3 tags selected | ⬜ |
| 5 | Click "Value" and "Cleanliness" | 5 tags selected | ⬜ |
| 6 | Submit review | Review created with 5 tags | ⬜ |
| 7 | View review | All 5 tags displayed as badges | ⬜ |

---

#### TC-5.2: Max 5 Tags Enforcement
**Priority**: High  
**Precondition**: User logged in, has check-in

| Step | Action | Expected Result | Status |
|------|--------|----------------|--------|
| 1 | Open review form | Tag section shown | ⬜ |
| 2 | Select 5 tags | All 5 highlighted | ⬜ |
| 3 | Attempt to select 6th tag | ERROR or disabled: "Max 5 tags allowed" | ⬜ |
| 4 | Deselect 1 tag | Can now select another tag | ⬜ |

---

#### TC-5.3: Deselect Tags
**Priority**: Medium  
**Precondition**: User logged in, has check-in

| Step | Action | Expected Result | Status |
|------|--------|----------------|--------|
| 1 | Open review form | Tag section shown | ⬜ |
| 2 | Select 3 tags | 3 tags highlighted | ⬜ |
| 3 | Click one selected tag again | Tag deselected, count shows "2 selected" | ⬜ |
| 4 | Submit with 2 tags | Review created with 2 tags | ⬜ |

---

#### TC-5.4: Review Without Tags (Optional)
**Priority**: High  
**Precondition**: User logged in, has check-in

| Step | Action | Expected Result | Status |
|------|--------|----------------|--------|
| 1 | Open review form | Form displayed | ⬜ |
| 2 | Don't select any tags | No error shown | ⬜ |
| 3 | Submit review | Review created (no tags) | ⬜ |
| 4 | View review | No tags shown | ⬜ |

---

### Test Suite 6: Edit Reviews (24-Hour Window)

#### TC-6.1: Edit Review Within 24 Hours
**Priority**: Critical  
**Precondition**: User has review created < 24h ago

| Step | Action | Expected Result | Status |
|------|--------|----------------|--------|
| 1 | Navigate to My Reviews page | List of user's reviews shown | ⬜ |
| 2 | Find recent review (< 24h) | Review card shows "Edit" option | ⬜ |
| 3 | Click "Edit" button | Edit modal opens with current data | ⬜ |
| 4 | Change recommendation from 👍 to 👎 | Selection updates | ⬜ |
| 5 | Modify text | New text appears | ⬜ |
| 6 | Add/remove tags | Tags update | ⬜ |
| 7 | Click "Save Changes" | Success message shown | ⬜ |
| 8 | View updated review | Changes reflected, "(edited)" label shown | ⬜ |

---

#### TC-6.2: Cannot Edit After 24 Hours
**Priority**: Critical  
**Precondition**: User has review created > 24h ago

| Step | Action | Expected Result | Status |
|------|--------|----------------|--------|
| 1 | Navigate to My Reviews page | Reviews shown | ⬜ |
| 2 | Find old review (> 24h) | "Edit" button disabled OR not shown | ⬜ |
| 3 | Attempt to edit via menu | Error: "Can only edit within 24 hours" | ⬜ |
| 4 | Verify review unchanged | Original review intact | ⬜ |

---

#### TC-6.3: Edit Tracking (is_edited flag)
**Priority**: Medium  
**Precondition**: User has review

| Step | Action | Expected Result | Status |
|------|--------|----------------|--------|
| 1 | View original review | No "(edited)" label | ⬜ |
| 2 | Edit review within 24h | Changes saved | ⬜ |
| 3 | View updated review | "(edited)" label appears | ⬜ |
| 4 | Edit again (2nd time) | Edit count increments | ⬜ |

---

#### TC-6.4: Edit Review Photo
**Priority**: Medium  
**Precondition**: User has review with photo (< 24h)

| Step | Action | Expected Result | Status |
|------|--------|----------------|--------|
| 1 | Edit review | Modal opens with current photo | ⬜ |
| 2 | Click "Remove Photo" | Photo removed | ⬜ |
| 3 | Upload new photo | New photo uploaded | ⬜ |
| 4 | Save changes | Review updated with new photo | ⬜ |

---

### Test Suite 7: Delete Reviews

#### TC-7.1: Delete Own Review
**Priority**: High  
**Precondition**: User has at least one review

| Step | Action | Expected Result | Status |
|------|--------|----------------|--------|
| 1 | Navigate to My Reviews page | User's reviews shown | ⬜ |
| 2 | Click "Delete" on a review | Confirmation dialog appears | ⬜ |
| 3 | Click "Cancel" | Dialog closes, review NOT deleted | ⬜ |
| 4 | Click "Delete" again | Confirmation dialog | ⬜ |
| 5 | Click "Confirm Delete" | Review deleted, success message | ⬜ |
| 6 | Check My Reviews page | Review no longer appears | ⬜ |
| 7 | Check business page | Review no longer on business | ⬜ |

---

#### TC-7.2: Delete Review from Business Page
**Priority**: Medium  
**Precondition**: User has review on business

| Step | Action | Expected Result | Status |
|------|--------|----------------|--------|
| 1 | Navigate to business page | Reviews shown | ⬜ |
| 2 | Find own review | Menu with "Delete" option | ⬜ |
| 3 | Click "Delete" | Confirmation dialog | ⬜ |
| 4 | Confirm deletion | Review deleted | ⬜ |
| 5 | Verify removal | Review gone from list | ⬜ |

---

#### TC-7.3: Cannot Delete Other User's Review
**Priority**: Critical (Security)  
**Precondition**: View business with other users' reviews

| Step | Action | Expected Result | Status |
|------|--------|----------------|--------|
| 1 | Login as test1@example.com | Logged in | ⬜ |
| 2 | View business with test2's review | Review visible | ⬜ |
| 3 | Check for delete option | No delete option on other user's review | ⬜ |
| 4 | Attempt API call to delete | 403 Forbidden OR error | ⬜ |

---

### Test Suite 8: Business Owner Responses

#### TC-8.1: Business Owner Creates Response
**Priority**: High  
**Precondition**: Business owner logged in, business has reviews

| Step | Action | Expected Result | Status |
|------|--------|----------------|--------|
| 1 | Login as business owner | Dashboard shown | ⬜ |
| 2 | Navigate to owned business page | Reviews shown | ⬜ |
| 3 | Find review without response | "Respond" button shown | ⬜ |
| 4 | Click "Respond" | Response form opens | ⬜ |
| 5 | Enter response (< 50 words) | Text accepted, word count shown | ⬜ |
| 6 | Click "Submit Response" | Response created, success message | ⬜ |
| 7 | View review | Response shown with owner badge | ⬜ |

**Test Data**:
```
"Thank you for your feedback! We're glad you enjoyed your visit. We hope to see you again soon!"
(17 words)
```

---

#### TC-8.2: 50-Word Response Limit
**Priority**: High  
**Precondition**: Business owner logged in

| Step | Action | Expected Result | Status |
|------|--------|----------------|--------|
| 1 | Open response form | Form displayed | ⬜ |
| 2 | Enter 55-word response | Word counter shows "55/50" in RED | ⬜ |
| 3 | Attempt submit | ERROR: "Response must be 50 words or less" | ⬜ |
| 4 | Reduce to 48 words | Counter green, submit enabled | ⬜ |
| 5 | Submit response | Response created successfully | ⬜ |

---

#### TC-8.3: Edit Response
**Priority**: Medium  
**Precondition**: Business owner has existing response

| Step | Action | Expected Result | Status |
|------|--------|----------------|--------|
| 1 | View review with own response | "Edit Response" option shown | ⬜ |
| 2 | Click "Edit Response" | Edit form opens with current text | ⬜ |
| 3 | Modify text | New text accepted | ⬜ |
| 4 | Click "Save Changes" | Response updated | ⬜ |
| 5 | View review | Updated response shown | ⬜ |

---

#### TC-8.4: Delete Response
**Priority**: Medium  
**Precondition**: Business owner has response

| Step | Action | Expected Result | Status |
|------|--------|----------------|--------|
| 1 | View own response | "Delete Response" option | ⬜ |
| 2 | Click "Delete Response" | Confirmation dialog | ⬜ |
| 3 | Confirm deletion | Response deleted | ⬜ |
| 4 | View review | No response shown, "Respond" button back | ⬜ |

---

#### TC-8.5: Non-Owner Cannot Respond
**Priority**: Critical (Security)  
**Precondition**: Regular user viewing business

| Step | Action | Expected Result | Status |
|------|--------|----------------|--------|
| 1 | Login as regular user (not owner) | Logged in | ⬜ |
| 2 | View business reviews | Reviews shown | ⬜ |
| 3 | Check for "Respond" button | No "Respond" button visible | ⬜ |
| 4 | Attempt API call to respond | 403 Forbidden error | ⬜ |

---

#### TC-8.6: One Response Per Review
**Priority**: High  
**Precondition**: Business owner, review already has response

| Step | Action | Expected Result | Status |
|------|--------|----------------|--------|
| 1 | View review with response | "Respond" button not shown | ⬜ |
| 2 | Only "Edit" option available | Can edit existing response | ⬜ |
| 3 | Attempt duplicate response via API | Database constraint error | ⬜ |

---

### Test Suite 9: My Reviews Page

#### TC-9.1: View All My Reviews
**Priority**: High  
**Precondition**: User has 5+ reviews

| Step | Action | Expected Result | Status |
|------|--------|----------------|--------|
| 1 | Navigate to My Reviews page | Page loads | ⬜ |
| 2 | View statistics section | Total reviews, thumbs up/down counts shown | ⬜ |
| 3 | Scroll reviews list | All user's reviews displayed | ⬜ |
| 4 | Verify each review card | Shows business, date, recommendation, text | ⬜ |

---

#### TC-9.2: Search Reviews by Text
**Priority**: Medium  
**Precondition**: User has multiple reviews

| Step | Action | Expected Result | Status |
|------|--------|----------------|--------|
| 1 | Navigate to My Reviews | Reviews shown | ⬜ |
| 2 | Type "food" in search box | Reviews containing "food" shown | ⬜ |
| 3 | Type "service" | Results update to "service" matches | ⬜ |
| 4 | Clear search | All reviews shown again | ⬜ |

---

#### TC-9.3: Search Reviews by Tag
**Priority**: Medium  
**Precondition**: User has reviews with various tags

| Step | Action | Expected Result | Status |
|------|--------|----------------|--------|
| 1 | Navigate to My Reviews | Reviews shown | ⬜ |
| 2 | Type "Food Quality" in search | Reviews with "Food Quality" tag shown | ⬜ |
| 3 | Verify results | Only matching reviews displayed | ⬜ |

---

#### TC-9.4: Filter by Recommendation Type
**Priority**: Medium  
**Precondition**: User has both positive and negative reviews

| Step | Action | Expected Result | Status |
|------|--------|----------------|--------|
| 1 | Navigate to My Reviews | All reviews shown | ⬜ |
| 2 | Select "👍 Recommended" filter | Only positive reviews shown | ⬜ |
| 3 | Select "👎 Not Recommended" filter | Only negative reviews shown | ⬜ |
| 4 | Select "All" filter | All reviews shown again | ⬜ |

---

#### TC-9.5: User Statistics Display
**Priority**: Low  
**Precondition**: User has multiple reviews

| Step | Action | Expected Result | Status |
|------|--------|----------------|--------|
| 1 | Navigate to My Reviews | Page loads | ⬜ |
| 2 | Check statistics header | Shows total count | ⬜ |
| 3 | Verify thumbs up count | Matches number of positive reviews | ⬜ |
| 4 | Verify thumbs down count | Matches number of negative reviews | ⬜ |
| 5 | Check percentage bars | Visual bars match percentages | ⬜ |

---

#### TC-9.6: Empty State
**Priority**: Low  
**Precondition**: New user with no reviews

| Step | Action | Expected Result | Status |
|------|--------|----------------|--------|
| 1 | Login as new user | Authenticated | ⬜ |
| 2 | Navigate to My Reviews | Page loads | ⬜ |
| 3 | View empty state | Message: "You haven't written any reviews yet" | ⬜ |
| 4 | Check for CTA button | "Explore Businesses" or similar | ⬜ |

---

### Test Suite 10: Real-time Updates

#### TC-10.1: New Review Appears in Real-time
**Priority**: Medium  
**Precondition**: Two browser windows/tabs open

| Step | Action | Expected Result | Status |
|------|--------|----------------|--------|
| 1 | Window A: Login as test1, view business | Reviews shown | ⬜ |
| 2 | Window B: Login as test2, same business | Reviews shown | ⬜ |
| 3 | Window B: Create new review | Review submitted | ⬜ |
| 4 | Window A: Wait 2-3 seconds | New review appears automatically | ⬜ |
| 5 | Verify no page refresh needed | Real-time update confirmed | ⬜ |

---

#### TC-10.2: Review Edit Updates in Real-time
**Priority**: Medium  
**Precondition**: Two windows, existing review

| Step | Action | Expected Result | Status |
|------|--------|----------------|--------|
| 1 | Window A & B: View same business | Same reviews shown | ⬜ |
| 2 | Window A: Edit a review | Changes saved | ⬜ |
| 3 | Window B: Observe | Updated review appears automatically | ⬜ |
| 4 | Verify "(edited)" label | Appears in Window B | ⬜ |

---

#### TC-10.3: Review Delete Updates in Real-time
**Priority**: Medium  
**Precondition**: Two windows

| Step | Action | Expected Result | Status |
|------|--------|----------------|--------|
| 1 | Windows A & B: View business | Reviews shown | ⬜ |
| 2 | Window A: Delete a review | Confirmation, deletion | ⬜ |
| 3 | Window B: Observe | Review disappears automatically | ⬜ |

---

#### TC-10.4: Response Updates in Real-time
**Priority**: Low  
**Precondition**: Two windows

| Step | Action | Expected Result | Status |
|------|--------|----------------|--------|
| 1 | Window A: Customer view | Reviews shown | ⬜ |
| 2 | Window B: Business owner responds | Response submitted | ⬜ |
| 3 | Window A: Observe | Response appears under review | ⬜ |

---

### Test Suite 11: Error Handling & Edge Cases

#### TC-11.1: Network Error During Submit
**Priority**: High  
**Precondition**: User logged in

| Step | Action | Expected Result | Status |
|------|--------|----------------|--------|
| 1 | Open review form | Form shown | ⬜ |
| 2 | Fill valid review | Data entered | ⬜ |
| 3 | Disconnect network | Offline | ⬜ |
| 4 | Click Submit | Error: "Network error, please try again" | ⬜ |
| 5 | Reconnect network | Online | ⬜ |
| 6 | Click Submit again | Review submitted successfully | ⬜ |

---

#### TC-11.2: Session Timeout
**Priority**: Medium  
**Precondition**: User logged in, idle for 30+ min

| Step | Action | Expected Result | Status |
|------|--------|----------------|--------|
| 1 | Leave browser idle (session expires) | - | ⬜ |
| 2 | Attempt to submit review | Error: "Session expired, please login" | ⬜ |
| 3 | Login again | Authenticated | ⬜ |
| 4 | Resubmit review | Review created | ⬜ |

---

#### TC-11.3: Concurrent Edit Conflict
**Priority**: Low  
**Precondition**: Two devices with same user

| Step | Action | Expected Result | Status |
|------|--------|----------------|--------|
| 1 | Device A: Edit review | Modal open | ⬜ |
| 2 | Device B: Edit same review | Modal open | ⬜ |
| 3 | Device A: Save changes | Saved | ⬜ |
| 4 | Device B: Attempt save | Error or last-write-wins (expected) | ⬜ |

---

#### TC-11.4: Special Characters in Review Text
**Priority**: Medium  
**Precondition**: User logged in

| Step | Action | Expected Result | Status |
|------|--------|----------------|--------|
| 1 | Open review form | Form shown | ⬜ |
| 2 | Enter text with emojis: "Great food! 🍕🍔😋" | Text accepted | ⬜ |
| 3 | Enter quotes: "Best \"pizza\" ever" | Quotes handled correctly | ⬜ |
| 4 | Submit review | Review created, special chars displayed | ⬜ |

---

#### TC-11.5: Very Long Business Name Display
**Priority**: Low  
**Precondition**: Business with 50+ character name

| Step | Action | Expected Result | Status |
|------|--------|----------------|--------|
| 1 | Navigate to business | Business name displayed | ⬜ |
| 2 | View reviews | Business name in review cards | ⬜ |
| 3 | Check My Reviews page | Long name truncated or wrapped properly | ⬜ |

---

## 📊 Test Execution Tracking

### Test Summary Template

| Test Suite | Total Cases | Passed | Failed | Blocked | Pass Rate |
|------------|-------------|--------|--------|---------|-----------|
| TS-1: Binary Recommendation | 3 | 0 | 0 | 0 | 0% |
| TS-2: Word Limit | 4 | 0 | 0 | 0 | 0% |
| TS-3: GPS Gating | 3 | 0 | 0 | 0 | 0% |
| TS-4: Photo Upload | 6 | 0 | 0 | 0 | 0% |
| TS-5: Tags | 4 | 0 | 0 | 0 | 0% |
| TS-6: Edit Reviews | 4 | 0 | 0 | 0 | 0% |
| TS-7: Delete Reviews | 3 | 0 | 0 | 0 | 0% |
| TS-8: Owner Responses | 6 | 0 | 0 | 0 | 0% |
| TS-9: My Reviews Page | 6 | 0 | 0 | 0 | 0% |
| TS-10: Real-time | 4 | 0 | 0 | 0 | 0% |
| TS-11: Error Handling | 5 | 0 | 0 | 0 | 0% |
| **TOTAL** | **48** | **0** | **0** | **0** | **0%** |

---

## 🐛 Bug Report Template

### Bug ID: BUG-001
**Title**: [Short description]  
**Severity**: Critical / High / Medium / Low  
**Test Case**: TC-X.X  
**Environment**: Dev / Staging / Production

**Steps to Reproduce**:
1. Step 1
2. Step 2
3. Step 3

**Expected Result**: [What should happen]

**Actual Result**: [What actually happened]

**Screenshots**: [Attach if available]

**Browser/OS**: Chrome 120 / Windows 11

**Additional Notes**: [Any other context]

---

## ✅ Test Completion Criteria

### Exit Criteria (When testing is complete)
- [ ] All 48 test cases executed
- [ ] Pass rate ≥ 95% (max 2 failed cases)
- [ ] All critical bugs resolved
- [ ] All high-priority bugs resolved or documented
- [ ] Test execution report created
- [ ] Regression testing completed after bug fixes

### Risk Assessment
- **High Risk**: GPS gating, security (RLS), data constraints
- **Medium Risk**: Real-time updates, word count validation
- **Low Risk**: UI animations, statistics display

---

## 📝 Notes for Testers

### Important Testing Tips
1. **Clear browser cache** between major test runs
2. **Use incognito/private mode** for multi-user tests
3. **Test on multiple screen sizes** (desktop, tablet, mobile)
4. **Use real photos** (don't use placeholder images)
5. **Test with actual GPS coordinates** if possible
6. **Document any unexpected behavior** even if minor
7. **Take screenshots** of bugs/errors
8. **Test both success and failure paths**

### Common Issues to Watch For
- ❌ Word counter not updating in real-time
- ❌ Photos not uploading (check Supabase storage settings)
- ❌ RLS policies blocking legitimate actions
- ❌ Real-time not working (check Supabase Realtime enabled)
- ❌ Edit button showing after 24 hours
- ❌ Non-owners seeing delete/edit options

---

**Test Plan Created**: January 30, 2025  
**Version**: 1.0  
**Status**: Ready for Execution  
**Total Test Cases**: 48
