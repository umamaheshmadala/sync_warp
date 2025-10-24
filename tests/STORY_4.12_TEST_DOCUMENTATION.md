# Story 4.12: Business Offers Management - Test Documentation

**Last Updated:** January 24, 2025  
**Test Coverage:** Unit Tests + E2E Tests

---

## Overview

Comprehensive test suite for the Business Offers Management feature covering:
- **Unit Tests**: React hooks (useOffers, useOfferDrafts, useOfferAnalytics, useOfferShare)
- **E2E Tests**: Complete user flows using Playwright
- **Test Coverage**: Targeting 80%+ code coverage

---

## Test Structure

```
tests/
├── e2e/
│   └── story-4.12-offers.spec.ts    # E2E tests
└── STORY_4.12_TEST_DOCUMENTATION.md

src/
└── hooks/
    └── __tests__/
        └── useOffers.test.ts         # Hook unit tests
```

---

## Setup

### Prerequisites

```bash
# Install dependencies
npm install

# Install Playwright browsers (first time only)
npm run install-playwright
```

### Environment Variables

Create a `.env.test` file for test environment:

```env
VITE_SUPABASE_URL=your_test_supabase_url
VITE_SUPABASE_ANON_KEY=your_test_anon_key
```

---

## Running Tests

### Unit Tests (Vitest)

```bash
# Run all unit tests
npm test

# Run in watch mode
npm test -- --watch

# Run with UI
npm run test:ui

# Run with coverage
npm run test:coverage

# Run specific test file
npm test useOffers.test.ts
```

### E2E Tests (Playwright)

```bash
# Run all E2E tests
npm run test:e2e

# Run in headed mode (see browser)
npm run test:e2e:headed

# Run with Playwright UI
npm run test:e2e:ui

# Run Story 4.12 tests only
npm run test:e2e -- --grep "Story 4.12"

# Debug mode
npm run test:e2e:debug

# Generate HTML report
npm run test:e2e:report
```

---

## Test Coverage

### Unit Tests

#### useOffers Hook
- ✅ Initial load with autoFetch
- ✅ Filtering by status (single and multiple)
- ✅ Filtering by date range
- ✅ Sorting (created_at, view_count, etc.)
- ✅ Pagination (default and custom limit)
- ✅ CRUD operations (create, update, delete)
- ✅ Status management (activate, pause, archive)
- ✅ Duplicate offers
- ✅ Error handling
- ✅ Refresh functionality

**Total: 16 test cases**

#### useOfferDrafts Hook (To be implemented)
- Draft creation
- Auto-save with debounce
- Draft loading
- Draft update
- Draft deletion
- Convert draft to offer
- Error handling

**Total: 7 test cases (planned)**

#### useOfferAnalytics Hook (To be implemented)
- Fetch analytics for single offer
- Fetch analytics for multiple offers
- Calculate CTR and share rates
- Helper methods (getViewsOverTime, etc.)
- Empty state handling
- Error handling

**Total: 6 test cases (planned)**

#### useOfferShare Hook (To be implemented)
- Track share to database
- Track click
- Track view
- Social sharing (WhatsApp, Facebook, Twitter, Email)
- Copy link
- Error handling

**Total: 8 test cases (planned)**

### E2E Tests

#### Create Offer Flow
- ✅ Complete 4-step wizard flow
- ✅ Required field validation
- ✅ Auto-save draft functionality
- ✅ Character limits and counters
- ✅ Date validation

**5 test cases**

#### Offer List Management
- ✅ Display offers with filters
- ✅ Activate offer
- ✅ Pause offer
- ✅ Delete offer
- ✅ Status badges

**5 test cases**

#### Offer Sharing
- ✅ Open share modal
- ✅ Copy link to clipboard
- ✅ Share via WhatsApp
- ✅ Other social channels

**4 test cases**

#### Offer Analytics
- ✅ Display analytics dashboard
- ✅ View summary cards
- ✅ Display charts

**3 test cases**

#### Pagination and Sorting
- ✅ Paginate offers
- ✅ Sort by different fields
- ✅ Verify sort order

**3 test cases**

#### Other Features
- ✅ Empty state display
- ✅ Responsive design (mobile, tablet)

**3 test cases**

**Total E2E: 23 test cases**

---

## Test Data

### Mock Offers

```typescript
const mockOffers: Offer[] = [
  {
    id: '1',
    business_id: 'business-1',
    title: 'Test Offer 1',
    description: 'Test description',
    terms_conditions: 'Test terms',
    valid_from: '2025-01-01',
    valid_until: '2025-12-31',
    status: 'active',
    offer_code: 'TEST001',
    view_count: 10,
    share_count: 5,
    click_count: 3,
    // ... other fields
  },
  // ... more test offers
];
```

### Test User Credentials

```typescript
// E2E test credentials
const testUser = {
  email: 'test@business.com',
  password: 'testpassword',
};
```

---

## Writing New Tests

### Unit Test Template

```typescript
import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

describe('YourHook', () => {
  it('should do something', async () => {
    const { result } = renderHook(() => useYourHook());
    
    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });
  });
});
```

### E2E Test Template

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    // Setup
  });

  test('should do something', async ({ page }) => {
    // Test steps
    await page.goto('/path');
    await expect(page.locator('selector')).toBeVisible();
  });
});
```

---

## Continuous Integration

### GitHub Actions (Recommended)

```yaml
name: Tests

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm test
      
  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npx playwright install
      - run: npm run test:e2e
```

---

## Test Metrics

### Current Coverage

- **Unit Tests**: 
  - useOffers: ✅ Complete (16 tests)
  - useOfferDrafts: 🟡 Pending
  - useOfferAnalytics: 🟡 Pending
  - useOfferShare: 🟡 Pending

- **E2E Tests**: ✅ Complete (23 tests)
  - Create Flow: ✅ 5 tests
  - List Management: ✅ 5 tests
  - Sharing: ✅ 4 tests
  - Analytics: ✅ 3 tests
  - Pagination/Sorting: ✅ 3 tests
  - Other: ✅ 3 tests

### Coverage Goals

- Line Coverage: 80%+
- Branch Coverage: 75%+
- Function Coverage: 85%+

---

## Common Issues & Solutions

### Issue: Tests Timeout

**Solution:**
```typescript
// Increase timeout for slow operations
await waitFor(() => {
  expect(result.current.data).toBeDefined();
}, { timeout: 5000 });
```

### Issue: Mock Not Working

**Solution:**
```typescript
// Clear mocks between tests
beforeEach(() => {
  vi.clearAllMocks();
});
```

### Issue: E2E Test Flaky

**Solution:**
```typescript
// Add explicit waits
await page.waitForLoadState('networkidle');
await expect(element).toBeVisible({ timeout: 5000 });
```

### Issue: Supabase RLS Blocking Tests

**Solution:**
- Use test database with disabled RLS
- Or create test-specific policies
- Or use service key in tests (not recommended for production)

---

## Best Practices

### 1. Test Isolation
- Each test should be independent
- Clean up after tests
- Don't rely on test execution order

### 2. Descriptive Names
```typescript
// ❌ Bad
it('test 1', () => { ... });

// ✅ Good
it('should create offer with valid data', () => { ... });
```

### 3. AAA Pattern
- **Arrange**: Setup test data
- **Act**: Execute the action
- **Assert**: Verify the result

### 4. Mock External Dependencies
- Mock Supabase calls
- Mock date/time for consistency
- Mock file uploads

### 5. Test User Interactions
- Use `userEvent` instead of `fireEvent`
- Test keyboard navigation
- Test screen reader accessibility

---

## Debugging Tests

### Unit Tests

```bash
# Run specific test with debug output
npm test -- --reporter=verbose useOffers.test.ts

# Use debugger
it('test name', () => {
  debugger; // Add breakpoint
  // Test code
});
```

### E2E Tests

```bash
# Open Playwright Inspector
npm run test:e2e:debug

# Use slow motion
test.use({ slowMo: 1000 });

# Take screenshots on failure
await page.screenshot({ path: 'error.png' });
```

---

## Future Improvements

- [ ] Add component tests for UI components
- [ ] Add integration tests for API calls
- [ ] Add visual regression tests
- [ ] Add performance tests
- [ ] Implement test coverage reports in CI
- [ ] Add mutation testing
- [ ] Add load testing for analytics endpoints

---

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

---

## Support

For questions or issues with tests:
1. Check this documentation
2. Review existing tests for examples
3. Contact the QA team
4. Create an issue in the repository

---

**Last Updated:** January 24, 2025  
**Maintainer:** Development Team  
**Status:** Active Development
