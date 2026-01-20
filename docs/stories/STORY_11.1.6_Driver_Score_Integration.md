# Story 11.1.6: Verify Driver Score Integration Works

**Epic:** [EPIC 11.1 - Reviews Core Fixes](../epics/EPIC_11.1_Reviews_Core_Fixes.md)  
**Priority:** 🟢 P2 - LOW  
**Effort:** 0.5 days  
**Dependencies:** None  
**Status:** 📋 Ready for Implementation

---

## Overview

Verify that reviews correctly contribute to the existing Driver Score system. The Driver system already exists and includes `reviews_score` as a scoring factor. This story ensures the integration works correctly and reviews are properly weighted in the algorithm.

---

## Background: Existing Driver System

### What Already Exists
The Driver system is fully implemented:

| Component | Location | Status |
|-----------|----------|--------|
| `DriverProfile` interface | `src/types/campaigns.ts` | ✅ Exists |
| `DriverAlgorithmConfig` | `src/types/campaigns.ts` | ✅ Exists |
| `DriverBadge` (gold ring) | `src/types/campaigns.ts` | ✅ Exists |
| `driver_profiles` DB table | `supabase/migrations/` | ✅ Exists |
| Admin algorithm config | Platform settings | ✅ Exists |

### Current Scoring Factors
- `coupons_collected_score`
- `coupons_shared_score`
- `coupons_redeemed_score`
- `checkins_score`
- `reviews_score` ← **This is what we're verifying**
- `social_interactions_score`

### Driver Badge
- Top 10% of users by driver score receive a gold ring badge
- Badge displayed on profile cards and avatars

---

## User Stories

### US-11.1.6.1: Verify Score Calculation
**As a** platform engineer  
**I want to** verify reviews contribute to driver score  
**So that** active reviewers are recognized as drivers

**Acceptance Criteria:**
- [ ] Submitting a review increments user's `reviews_score`
- [ ] Editing a review does NOT add additional points
- [ ] Deleting a review decrements `reviews_score`
- [ ] Score calculation matches algorithm config weights
- [ ] Real-time update after review submission

---

### US-11.1.6.2: Score Weight Configuration
**As a** platform admin  
**I want to** configure the weight of reviews in driver score  
**So that** I can balance review activity with other factors

**Acceptance Criteria:**
- [ ] `reviews_weight` configurable in admin settings
- [ ] Default weight is appropriate (document recommended value)
- [ ] Changing weight recalculates all user scores
- [ ] Weight is a multiplier (e.g., 2.0 = double points)

---

### US-11.1.6.3: Driver Badge Consideration
**As a** user who writes many reviews  
**I want to** have my reviews contribute to driver badge eligibility  
**So that** I can earn recognition for my contributions

**Acceptance Criteria:**
- [ ] High review count increases driver score
- [ ] Top 10% by driver score get gold ring badge
- [ ] Badge visible on profile card and avatar
- [ ] Badge recalculates periodically (or on score change)

---

## Technical Requirements

### Verify Database Trigger/Function

#### Check existing trigger in database
```sql
-- Find the trigger that updates driver scores
SELECT 
  trigger_name, 
  event_manipulation, 
  action_statement 
FROM information_schema.triggers 
WHERE event_object_table = 'business_reviews';

-- Check driver_profiles table structure
SELECT column_name, data_type, column_default
FROM information_schema.columns 
WHERE table_name = 'driver_profiles';

-- Check current scoring function
SELECT prosrc FROM pg_proc 
WHERE proname = 'update_driver_score' 
   OR proname = 'calculate_driver_score'
   OR proname LIKE '%driver%';
```

---

### Expected Database Function (Verify Exists)

```sql
-- This function should exist or be created:
CREATE OR REPLACE FUNCTION update_reviews_driver_score()
RETURNS TRIGGER AS $$
DECLARE
  reviews_weight FLOAT;
  reviews_count INTEGER;
BEGIN
  -- Get weight from config (default 1.0)
  SELECT COALESCE(
    (SELECT value::FLOAT FROM platform_config WHERE key = 'driver_reviews_weight'),
    1.0
  ) INTO reviews_weight;
  
  -- Count user's active reviews
  SELECT COUNT(*) INTO reviews_count
  FROM business_reviews
  WHERE user_id = COALESCE(NEW.user_id, OLD.user_id)
    AND deleted_at IS NULL;
  
  -- Update driver profile
  INSERT INTO driver_profiles (user_id, reviews_score, last_calculated_at)
  VALUES (
    COALESCE(NEW.user_id, OLD.user_id),
    reviews_count * reviews_weight,
    NOW()
  )
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    reviews_score = reviews_count * reviews_weight,
    total_score = driver_profiles.coupons_collected_score 
                + driver_profiles.coupons_shared_score
                + driver_profiles.coupons_redeemed_score
                + driver_profiles.checkins_score
                + (reviews_count * reviews_weight)
                + driver_profiles.social_interactions_score,
    last_calculated_at = NOW();
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger on reviews table
DROP TRIGGER IF EXISTS trigger_update_reviews_driver_score ON business_reviews;
CREATE TRIGGER trigger_update_reviews_driver_score
AFTER INSERT OR UPDATE OF deleted_at OR DELETE ON business_reviews
FOR EACH ROW
EXECUTE FUNCTION update_reviews_driver_score();
```

---

### Verification Script

**File:** `scripts/verify_driver_integration.sql`

```sql
-- ============================================
-- VERIFICATION: Driver Score Integration
-- Story: 11.1.6
-- Run this script to verify integration works
-- ============================================

-- Test 1: Check trigger exists
SELECT 'Trigger Check' AS test_name, 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.triggers 
      WHERE event_object_table = 'business_reviews'
        AND trigger_name LIKE '%driver%'
    ) THEN 'PASS ✅'
    ELSE 'FAIL ❌ - No driver trigger on business_reviews'
  END AS result;

-- Test 2: Check driver_profiles has reviews_score column
SELECT 'Column Check' AS test_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'driver_profiles' 
        AND column_name = 'reviews_score'
    ) THEN 'PASS ✅'
    ELSE 'FAIL ❌ - reviews_score column missing'
  END AS result;

-- Test 3: Check a sample user's scores
SELECT 
  'Sample User Score' AS test_name,
  dp.user_id,
  dp.reviews_score,
  (SELECT COUNT(*) FROM business_reviews br 
   WHERE br.user_id = dp.user_id AND br.deleted_at IS NULL) AS actual_review_count,
  CASE 
    WHEN dp.reviews_score >= 0 THEN 'PASS ✅'
    ELSE 'FAIL ❌'
  END AS result
FROM driver_profiles dp
LIMIT 3;

-- Test 4: Simulate review insert and check score update
-- (Run manually in a transaction with ROLLBACK)
/*
BEGIN;
  -- Get user's current score
  SELECT reviews_score FROM driver_profiles WHERE user_id = 'test-user-id';
  
  -- Insert a review
  INSERT INTO business_reviews (user_id, business_id, recommendation, text)
  VALUES ('test-user-id', 'test-business-id', true, 'Test review');
  
  -- Check score updated
  SELECT reviews_score FROM driver_profiles WHERE user_id = 'test-user-id';
  
ROLLBACK;
*/
```

---

### Frontend Verification (Optional Display)

#### Check score in user profile hook
**Location:** `src/hooks/useDriverScore.ts` (if exists)

```typescript
// Verify this hook/function exists and includes reviews_score
export function useDriverScore(userId: string) {
  return useQuery({
    queryKey: ['driver-score', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('driver_profiles')
        .select(`
          total_score,
          reviews_score,
          checkins_score,
          coupons_collected_score,
          coupons_shared_score,
          coupons_redeemed_score,
          social_interactions_score,
          percentile,
          badge_tier
        `)
        .eq('user_id', userId)
        .single();
      
      if (error) throw error;
      return data;
    }
  });
}
```

---

### Service Layer Verification

#### Check `reviewService.ts` triggers score update
**Location:** `src/services/reviewService.ts`

After `submitReview()` successfully inserts a review, the database trigger should automatically update the driver score. Verify no manual score update is needed in the service layer.

If trigger doesn't exist, add service-layer update:

```typescript
// Only if database trigger doesn't exist:
async function updateDriverScoreAfterReview(userId: string) {
  // Count user's reviews
  const { count } = await supabase
    .from('business_reviews')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('deleted_at', null);
  
  // Update driver profile
  await supabase
    .from('driver_profiles')
    .upsert({
      user_id: userId,
      reviews_score: count || 0,
      last_calculated_at: new Date().toISOString()
    });
}
```

---

## Testing Plan

### Database Tests
```sql
-- Test: Review insert updates score
BEGIN;
  INSERT INTO business_reviews (user_id, business_id, recommendation)
  VALUES ('test-user', 'test-business', true);
  
  SELECT reviews_score FROM driver_profiles WHERE user_id = 'test-user';
  -- Should be > 0
ROLLBACK;

-- Test: Review delete decrements score  
BEGIN;
  UPDATE business_reviews 
  SET deleted_at = NOW() 
  WHERE id = 'existing-review-id';
  
  SELECT reviews_score FROM driver_profiles WHERE user_id = 'test-user';
  -- Should be decremented
ROLLBACK;

-- Test: Edit doesn't double-count
BEGIN;
  UPDATE business_reviews 
  SET text = 'Updated text', edit_count = edit_count + 1
  WHERE id = 'existing-review-id';
  
  SELECT reviews_score FROM driver_profiles WHERE user_id = 'test-user';
  -- Should be unchanged
ROLLBACK;
```

### Integration Tests
```typescript
describe('Driver Score Integration', () => {
  it('increments reviews_score after submitting review', async () => {
    // Get initial score
    const { data: before } = await supabase
      .from('driver_profiles')
      .select('reviews_score')
      .eq('user_id', testUserId)
      .single();
    
    // Submit review
    await submitReview({
      business_id: 'test-business',
      recommendation: true
    });
    
    // Check score increased
    const { data: after } = await supabase
      .from('driver_profiles')
      .select('reviews_score')
      .eq('user_id', testUserId)
      .single();
    
    expect(after.reviews_score).toBeGreaterThan(before.reviews_score || 0);
  });

  it('decrements score when review is deleted', async () => {
    const { data: before } = await getDriverScore(testUserId);
    
    await deleteReview('test-review-id');
    
    const { data: after } = await getDriverScore(testUserId);
    expect(after.reviews_score).toBeLessThan(before.reviews_score);
  });

  it('does not change score when review is edited', async () => {
    const { data: before } = await getDriverScore(testUserId);
    
    await updateReview('test-review-id', { text: 'Updated text' });
    
    const { data: after } = await getDriverScore(testUserId);
    expect(after.reviews_score).toBe(before.reviews_score);
  });
});
```

### Manual Testing Checklist
- [ ] Submit a new review
- [ ] Verify driver_profiles.reviews_score incremented
- [ ] Edit the review
- [ ] Verify score DID NOT change
- [ ] Delete the review
- [ ] Verify score decremented
- [ ] Check total_score includes reviews_score
- [ ] Verify user with many reviews appears higher in driver rankings
- [ ] Check if gold badge calculation includes reviews

---

## Documentation Updates

### Document Scoring Algorithm
Create or update: `docs/features/driver_score_algorithm.md`

```markdown
# Driver Score Algorithm

## Overview
The Driver Score identifies the most engaged users on the platform.

## Scoring Components

| Factor | Weight | Description |
|--------|--------|-------------|
| Coupons Collected | 1.0 | Number of coupons saved |
| Coupons Shared | 2.0 | Coupons shared with friends |
| Coupons Redeemed | 3.0 | Coupons actually used |
| Check-ins | 2.0 | GPS-verified business visits |
| **Reviews** | **2.0** | Reviews submitted |
| Social Interactions | 1.0 | Likes, comments, friend adds |

## Formula
```
total_score = (collected * 1.0) + (shared * 2.0) + (redeemed * 3.0) 
            + (checkins * 2.0) + (reviews * 2.0) + (social * 1.0)
```

## Badge Eligibility
- Gold Badge: Top 10% by total_score
- Recalculated daily (or on score change)
```

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `supabase/migrations/xxx_verify_driver_reviews.sql` | CREATE | Ensure trigger exists |
| `scripts/verify_driver_integration.sql` | CREATE | Verification script |
| `docs/features/driver_score_algorithm.md` | CREATE | Document algorithm |
| `src/services/reviewService.ts` | VERIFY | No changes needed if trigger works |

---

## Implementation Guidelines

> **IMPORTANT**: Follow these guidelines when implementing this story.

### 1. Pre-Implementation Codebase Analysis
Before starting implementation:
- [ ] Locate existing Driver system in `src/types/campaigns.ts`
- [ ] Review `driver_profiles` table and related triggers
- [ ] Check existing scoring functions in database
- [ ] Find `reviews_score` integration points
- [ ] Document findings in the implementation plan

### 2. Database Migration Execution
- [ ] Use **Supabase MCP tools** to execute SQL migrations when possible
- [ ] Use `mcp_supabase-mcp-server_execute_sql` for running scripts
- [ ] Only request manual SQL execution if MCP lacks required privileges
- [ ] Verify migration success with follow-up queries

### 3. Acceptance Criteria Verification
After implementation is complete:
- [ ] Go through EACH acceptance criterion one by one
- [ ] Mark each criterion as verified with evidence (screenshot, test result, or code reference)
- [ ] Document any deviations or edge cases discovered
- [ ] Get sign-off before proceeding to user testing

### 4. User Testing Plan
Once acceptance criteria are verified, execute this testing flow:

**Test Route 1: Score Integration**
1. Note user's current driver score
2. Submit a new review
3. Wait for trigger execution
4. Verify driver score increased
5. Check `reviews_score` component specifically

**Test Route 2: Score Calculation Verification**
1. Create test user with known activity
2. Submit multiple reviews
3. Verify score increments correctly each time
4. Check algorithm weights match configuration

**Test Route 3: Edge Cases**
1. Submit review then edit → Score should not double
2. Delete review → Score adjustment (if applicable)
3. Verify rejected reviews don't count

### 5. Browser Testing & Evidence Collection

> **IMPORTANT**: All features must be browser-tested with evidence collected before confirming completion.

**Test Environment:**
- Local dev server: `http://localhost:5173`
- Do NOT start the dev server (it's already running)
- Only restart if necessary

**Test Credentials:**
| User | Email | Password |
|------|-------|----------|
| Test User 1 | testuser1@gmail.com | Testuser@1 |
| Test User 3 | testuser3@gmail.com | Testuser@1 |
| Test User 4 | testuser4@gmail.com | Testuser@1 |
| Test User 5 | testuser5@gmail.com | Testuser@1 |

**Evidence Collection Requirements:**
- [ ] **Screenshot each test step** using browser automation
- [ ] **Record browser session** for key user flows
- [ ] **Save screenshots** to artifacts folder with descriptive names
- [ ] **Document actual vs expected** behavior for each test

**Completion Criteria:**
- [ ] All browser tests pass with visual evidence
- [ ] Screenshots/recordings saved as artifacts
- [ ] Only confirm implementation complete when ALL evidence collected
- [ ] Any failing tests must be fixed before marking complete

---

## Definition of Done

- [ ] Verified database trigger exists for reviews → driver score
- [ ] reviews_score column exists in driver_profiles
- [ ] New review increases user's reviews_score
- [ ] Deleted review decreases reviews_score
- [ ] Edited review does NOT change score
- [ ] total_score calculation includes reviews_score
- [ ] Integration tests passing
- [ ] Algorithm documented
- [ ] Manual verification complete
- [ ] Code reviewed (if any changes needed)

---

## Notes

This is primarily a **verification story**. If the integration already works:
- Document findings
- Add tests to prevent regression
- No code changes needed

If integration is broken or missing:
- Create database trigger
- Update as needed
- Add integration tests

---

**Story Owner:** Backend Engineering  
**Reviewer:** [TBD]
