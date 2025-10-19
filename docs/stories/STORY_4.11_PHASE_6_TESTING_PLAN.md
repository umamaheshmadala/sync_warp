# Story 4.11 Phase 6: Testing & Deployment Plan

**Start Date:** January 19, 2025  
**Target Completion:** January 20-21, 2025

---

## Overview

Phase 6 focuses on comprehensive testing, security auditing, performance optimization, and deployment preparation for the Follow Business System. This ensures production-ready code that is secure, performant, and reliable.

---

## Testing Infrastructure

### Already Available:
- ✅ **Vitest** - Unit and integration testing
- ✅ **@testing-library/react** - Component testing
- ✅ **Playwright** - E2E testing
- ✅ **MSW (Mock Service Worker)** - API mocking
- ✅ **@vitest/coverage-v8** - Code coverage reporting

### Test Commands:
```bash
npm test                    # Run unit tests
npm run test:ui             # Open Vitest UI
npm run test:coverage       # Generate coverage report
npm run test:e2e            # Run E2E tests (Playwright)
npm run test:e2e:ui         # Open Playwright UI
```

---

## Phase 6.1: Unit Tests - Custom Hooks

### Test Files to Create:

#### 1. `useBusinessFollowing.test.ts`
**Location:** `src/hooks/__tests__/useBusinessFollowing.test.ts`

**Test Cases:**
- ✅ Hook initializes with correct default state
- ✅ `followBusiness()` sends correct Supabase insert
- ✅ `unfollowBusiness()` sends correct Supabase update
- ✅ `isFollowing()` returns correct boolean
- ✅ `updatePreferences()` updates notification settings
- ✅ Real-time subscription updates state correctly
- ✅ Optimistic UI updates work before API response
- ✅ Error handling for failed follow/unfollow
- ✅ Cleanup on unmount (subscription cleanup)

**Mocking Strategy:**
- Mock Supabase client responses
- Mock real-time subscription channels
- Test loading states, success, and error states

---

#### 2. `useFollowerUpdates.test.ts`
**Location:** `src/hooks/__tests__/useFollowerUpdates.test.ts`

**Test Cases:**
- ✅ Hook fetches updates on mount
- ✅ Infinite scroll loads more updates
- ✅ Filter by update type works correctly
- ✅ Real-time subscription adds new updates
- ✅ Updates grouped by date correctly
- ✅ Error handling for failed fetch
- ✅ Empty state handling
- ✅ hasMore flag updates correctly

---

#### 3. `useFollowerAnalytics.test.ts`
**Location:** `src/hooks/__tests__/useFollowerAnalytics.test.ts`

**Test Cases:**
- ✅ Hook fetches analytics data
- ✅ Demographics data structured correctly
- ✅ Growth trends calculated properly
- ✅ Engagement rates calculated
- ✅ Follower counts (total, weekly, monthly) correct
- ✅ Error handling for failed analytics fetch
- ✅ Loading state management

---

#### 4. `useFollowerNotifications.test.ts`
**Location:** `src/hooks/__tests__/useFollowerNotifications.test.ts`

**Test Cases:**
- ✅ Hook fetches notifications
- ✅ Unread count calculated correctly
- ✅ `markAsRead()` updates state optimistically
- ✅ `markAllAsRead()` marks all notifications
- ✅ Real-time subscription adds new notifications
- ✅ Badge count updates in real-time
- ✅ Error handling

---

## Phase 6.2: Unit Tests - Components

### Test Files to Create:

#### 1. `FollowButton.test.tsx`
**Location:** `src/components/following/__tests__/FollowButton.test.tsx`

**Test Cases:**
- ✅ Renders with correct initial state (following/not following)
- ✅ Shows correct icon (UserPlus vs UserCheck)
- ✅ Click triggers follow/unfollow
- ✅ Shows loading spinner during API call
- ✅ Different variants render correctly
- ✅ Different sizes render correctly
- ✅ Disabled state works
- ✅ Hover state shows "Unfollow" when following

---

#### 2. `FollowingPage.test.tsx`
**Location:** `src/components/following/__tests__/FollowingPage.test.tsx`

**Test Cases:**
- ✅ Renders list of followed businesses
- ✅ Search filters businesses correctly
- ✅ Sort options work (recent, alphabetical, active)
- ✅ Settings button opens preferences modal
- ✅ Empty state shows when no businesses followed
- ✅ Navigate to business profile on click
- ✅ Unfollow button works

---

#### 3. `NotificationPreferencesModal.test.tsx`
**Location:** `src/components/following/__tests__/NotificationPreferencesModal.test.tsx`

**Test Cases:**
- ✅ Modal opens and closes correctly
- ✅ Displays current preferences
- ✅ Toggle switches work for each notification type
- ✅ Channel selection works
- ✅ Warning shows when no preferences selected
- ✅ Save button updates preferences
- ✅ Close button dismisses without saving

---

#### 4. `FollowerFeed.test.tsx`
**Location:** `src/components/following/__tests__/FollowerFeed.test.tsx`

**Test Cases:**
- ✅ Renders feed of updates
- ✅ Groups updates by time correctly
- ✅ Filter by type works
- ✅ Infinite scroll loads more
- ✅ Click on update navigates correctly
- ✅ Empty state renders
- ✅ Loading state shows spinner

---

#### 5. `FollowerNotificationBell.test.tsx`
**Location:** `src/components/following/__tests__/FollowerNotificationBell.test.tsx`

**Test Cases:**
- ✅ Badge shows correct unread count
- ✅ Badge shows "99+" for counts over 99
- ✅ Dropdown shows last 10 notifications
- ✅ Click on notification marks as read
- ✅ "Mark all as read" works
- ✅ Navigate to business on click
- ✅ Empty state renders when no notifications

---

#### 6. `FollowerAnalyticsDashboard.test.tsx`
**Location:** `src/components/business/__tests__/FollowerAnalyticsDashboard.test.tsx`

**Test Cases:**
- ✅ Renders all metric cards
- ✅ Charts render with correct data
- ✅ Top cities list displays correctly
- ✅ Top interests render
- ✅ CTA buttons link correctly
- ✅ Loading state shows spinner
- ✅ Error state shows error message

---

#### 7. `FollowerList.test.tsx`
**Location:** `src/components/business/__tests__/FollowerList.test.tsx`

**Test Cases:**
- ✅ Renders list of followers
- ✅ Search filters followers
- ✅ Age filter works
- ✅ Gender filter works
- ✅ City filter works
- ✅ Sort options work
- ✅ Remove follower shows confirmation
- ✅ Report button opens modal
- ✅ Empty state renders

---

#### 8. `SuspiciousActivityReporter.test.tsx`
**Location:** `src/components/business/__tests__/SuspiciousActivityReporter.test.tsx`

**Test Cases:**
- ✅ Modal opens and closes
- ✅ Form validation works
- ✅ All report types selectable
- ✅ Description required
- ✅ Character counter works
- ✅ Submit button disabled when invalid
- ✅ Success state shows after submit
- ✅ Auto-closes after success

---

## Phase 6.3: Integration Tests

### Test Files to Create:

#### 1. `FollowFlow.integration.test.tsx`
**Location:** `src/__tests__/integration/FollowFlow.integration.test.tsx`

**Test Scenario:**
1. User visits business profile
2. Clicks "Follow" button
3. Button changes to "Following"
4. User goes to Following page
5. Business appears in the list
6. User clicks settings
7. Updates notification preferences
8. Preferences saved correctly

---

#### 2. `NotificationFlow.integration.test.tsx`
**Location:** `src/__tests__/integration/NotificationFlow.integration.test.tsx`

**Test Scenario:**
1. Business posts new product
2. Notification created automatically
3. Follower receives notification
4. Bell badge increments
5. User clicks bell
6. Notification appears in dropdown
7. Click marks as read
8. Badge decrements

---

#### 3. `AnalyticsFlow.integration.test.tsx`
**Location:** `src/__tests__/integration/AnalyticsFlow.integration.test.tsx`

**Test Scenario:**
1. Business owner navigates to dashboard
2. Clicks "Follower Analytics"
3. Dashboard loads with metrics
4. Charts display correctly
5. Clicks "View Follower List"
6. Navigates to follower list
7. Filters work correctly
8. Back to analytics works

---

## Phase 6.4: E2E Tests (Playwright)

### Test Files to Create:

#### 1. `story-4.11-follow-business.spec.ts`
**Location:** `tests/e2e/story-4.11-follow-business.spec.ts`

**Complete User Flows:**

**Flow 1: Customer Following a Business**
```typescript
test('Customer can follow business and receive updates', async ({ page }) => {
  // 1. Login as customer
  // 2. Search for business
  // 3. Click Follow button
  // 4. Verify following status
  // 5. Go to Following page
  // 6. See business in list
  // 7. Business posts update
  // 8. Receive notification
});
```

**Flow 2: Manage Notification Preferences**
```typescript
test('Customer can manage notification preferences', async ({ page }) => {
  // 1. Login as customer
  // 2. Go to Following page
  // 3. Click settings for a business
  // 4. Toggle notification types
  // 5. Save preferences
  // 6. Verify saved correctly
});
```

**Flow 3: Business Owner Views Analytics**
```typescript
test('Business owner views follower analytics', async ({ page }) => {
  // 1. Login as business owner
  // 2. Go to Business Dashboard
  // 3. Click "Follower Analytics"
  // 4. Verify charts load
  // 5. Verify metrics display
  // 6. Click "View Follower List"
  // 7. Verify followers load
});
```

**Flow 4: Report Suspicious Activity**
```typescript
test('Business owner reports suspicious follower', async ({ page }) => {
  // 1. Login as business owner
  // 2. Go to Follower List
  // 3. Click report icon
  // 4. Fill report form
  // 5. Submit report
  // 6. Verify success message
});
```

---

## Phase 6.5: Performance & Load Testing

### Scenarios to Test:

#### 1. Notification System Load Test
- Simulate 100 businesses posting updates simultaneously
- Measure notification creation time
- Verify all followers receive notifications
- Test database query performance
- Monitor real-time subscription performance

#### 2. Follower List Performance
- Test with 1,000+ followers
- Measure initial load time
- Test filtering performance
- Test sorting performance
- Verify no memory leaks

#### 3. Analytics Dashboard Performance
- Test chart rendering with large datasets
- Measure query performance for analytics view
- Test concurrent dashboard loads
- Verify efficient data aggregation

#### 4. Real-time Subscription Scalability
- Test with 100 concurrent users
- Measure WebSocket connection stability
- Test notification delivery latency
- Verify no dropped messages

### Tools:
- **k6** or **Artillery** for load testing
- **Chrome DevTools** for frontend performance profiling
- **Supabase Dashboard** for database query performance

---

## Phase 6.6: Security Audit

### Security Checks:

#### 1. RLS Policy Verification
**Tables to Audit:**
- ✅ `business_followers` - Users can only see their own relationships
- ✅ `follower_updates` - Public read for followed businesses only
- ✅ `follower_notifications` - Users see only their own notifications
- ✅ `follower_reports` - Business owners see only their reports, admins see all

**Test Cases:**
```sql
-- Test 1: User A cannot see User B's followers
-- Test 2: User cannot see notifications for other users
-- Test 3: Non-owner cannot view business reports
-- Test 4: Follower cannot see other followers of same business
```

#### 2. Input Sanitization
- Test XSS in report descriptions
- Test SQL injection attempts
- Test invalid data types
- Test extremely long inputs
- Test special characters in usernames

#### 3. API Endpoint Security
- Verify all mutations require authentication
- Test unauthorized access attempts
- Verify rate limiting (if applicable)
- Test CORS policies

#### 4. Error Message Review
- Ensure no sensitive data in error messages
- Verify stack traces not exposed in production
- Check for information disclosure

---

## Phase 6.7: Documentation & Deployment

### Documentation to Create:

#### 1. User Guide (`USER_GUIDE.md`)
- How to follow a business
- Managing notification preferences
- Viewing updates feed
- Business owner: viewing analytics
- Business owner: managing followers
- Reporting suspicious activity

#### 2. API Documentation (`API_DOCS.md`)
- Hook APIs and usage examples
- Database schema documentation
- Function signatures
- Real-time subscription setup

#### 3. Deployment Checklist (`DEPLOYMENT_CHECKLIST.md`)
- Pre-deployment verification
- Database migration steps
- Environment variables
- Rollback procedure
- Post-deployment verification

#### 4. Monitoring & Alerts (`MONITORING.md`)
- Key metrics to monitor
- Alert thresholds
- Error tracking setup
- Performance dashboards

---

## Success Criteria

### Code Quality:
- ✅ 80%+ test coverage
- ✅ All unit tests passing
- ✅ All integration tests passing
- ✅ All E2E tests passing
- ✅ No critical linting errors
- ✅ TypeScript compiles without errors

### Performance:
- ✅ Follower list loads in < 2 seconds
- ✅ Analytics dashboard loads in < 3 seconds
- ✅ Follow/unfollow completes in < 500ms
- ✅ Notifications delivered in < 1 second
- ✅ No memory leaks detected

### Security:
- ✅ All RLS policies verified
- ✅ No SQL injection vulnerabilities
- ✅ No XSS vulnerabilities
- ✅ Input validation comprehensive
- ✅ Error messages safe

### Documentation:
- ✅ User guide complete
- ✅ API docs complete
- ✅ Deployment checklist ready
- ✅ Monitoring plan documented

---

## Timeline

**Day 1 (Phase 6.1-6.3):**
- Morning: Unit tests for hooks
- Afternoon: Unit tests for components
- Evening: Integration tests

**Day 2 (Phase 6.4-6.6):**
- Morning: E2E tests with Playwright
- Afternoon: Performance & load testing
- Evening: Security audit

**Day 3 (Phase 6.7):**
- Morning: Documentation
- Afternoon: Final verification & deployment prep
- Evening: Production deployment

---

## Risk Mitigation

### Potential Risks:
1. **Real-time subscriptions fail under load**
   - Mitigation: Implement fallback polling mechanism
   
2. **Large follower lists cause performance issues**
   - Mitigation: Implement pagination and virtual scrolling
   
3. **RLS policies too restrictive**
   - Mitigation: Thorough testing with various user roles
   
4. **Notification spam**
   - Mitigation: Implement rate limiting and batching

---

## Next Steps

Once Phase 6 is complete:
1. Deploy to staging environment
2. Conduct user acceptance testing (UAT)
3. Fix any issues found
4. Deploy to production
5. Monitor for 48 hours
6. Mark Story 4.11 as 100% complete! 🎉
