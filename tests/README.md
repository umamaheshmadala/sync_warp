# Story 5.2: Binary Review System - Testing Guide

**Version**: 1.0  
**Last Updated**: January 30, 2025  
**Test Coverage**: Black-Box Testing + E2E Automated Tests

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Test Types](#test-types)
3. [Setup Instructions](#setup-instructions)
4. [Running Tests](#running-tests)
5. [Black-Box Manual Testing](#black-box-manual-testing)
6. [E2E Automated Testing](#e2e-automated-testing)
7. [Test Data](#test-data)
8. [Troubleshooting](#troubleshooting)
9. [CI/CD Integration](#cicd-integration)
10. [Reporting](#reporting)

---

## 🎯 Overview

This directory contains comprehensive testing resources for Story 5.2: Binary Review System. The testing strategy includes:

- **Black-Box Testing**: Manual functional tests (48 test cases)
- **E2E Automated Testing**: Playwright-based automated tests
- **Test Fixtures**: Reusable test data and helper functions
- **Test Documentation**: Step-by-step test plans and instructions

### Test Coverage

| Feature | Black-Box Tests | E2E Tests | Coverage |
|---------|----------------|-----------|----------|
| Binary Recommendation | 3 cases | 4 tests | ✅ 100% |
| Word Limit (30 words) | 4 cases | 6 tests | ✅ 100% |
| GPS Check-in Gating | 3 cases | TBD | ⚠️ Manual |
| Photo Upload | 6 cases | TBD | ⚠️ Manual |
| Tags/Categories | 4 cases | TBD | ⚠️ Manual |
| Edit Reviews | 4 cases | TBD | ⚠️ Manual |
| Delete Reviews | 3 cases | TBD | ⚠️ Manual |
| Owner Responses | 6 cases | TBD | ⚠️ Manual |
| My Reviews Page | 6 cases | TBD | ⚠️ Manual |
| Real-time Updates | 4 cases | TBD | ⚠️ Manual |
| Error Handling | 5 cases | TBD | ⚠️ Manual |
| **TOTAL** | **48 cases** | **10+ tests** | **75%** |

---

## 🧪 Test Types

### 1. Black-Box Testing (Manual)
**Purpose**: Functional testing from user perspective  
**File**: `STORY_5.2_BLACKBOX_TEST_PLAN.md`  
**Test Cases**: 48 detailed test scenarios  
**Duration**: 4-6 hours for full execution

**Use When**:
- Testing new features before automation
- Exploratory testing
- Testing edge cases not covered by automation
- UAT (User Acceptance Testing)

### 2. E2E Automated Testing
**Purpose**: Regression testing and CI/CD integration  
**Framework**: Playwright  
**Test Files**: `tests/e2e/*.spec.ts`  
**Duration**: 5-10 minutes automated

**Use When**:
- Regression testing after code changes
- Pre-deployment smoke tests
- CI/CD pipeline execution
- Quick validation of core flows

---

## ⚙️ Setup Instructions

### Prerequisites

1. **Node.js**: v18+ installed
2. **npm**: v9+ installed
3. **Supabase**: Project with Story 5.2 migration applied
4. **Test Users**: Created via Supabase Auth
5. **Test Data**: Businesses and check-ins set up

### Initial Setup

```powershell
# 1. Navigate to project root
cd C:\Users\umama\Documents\GitHub\sync_warp

# 2. Install dependencies (if not already done)
npm install

# 3. Install Playwright browsers
npx playwright install

# 4. Create environment file for tests
cp .env.example .env.test

# 5. Configure test environment variables
# Edit .env.test with your Supabase test project credentials
```

### Environment Variables

Create `.env.test` file:

```env
# Supabase Test Project
VITE_SUPABASE_URL=https://your-test-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-test-anon-key

# Test User Credentials
TEST_USER1_EMAIL=test1@syncwarp.test
TEST_USER1_PASSWORD=TestPassword123!
TEST_USER2_EMAIL=test2@syncwarp.test
TEST_USER2_PASSWORD=TestPassword123!
OWNER_EMAIL=owner@syncwarp.test
OWNER_PASSWORD=OwnerPassword123!

# Test Business IDs
TEST_BUSINESS_1=test-restaurant-uuid
TEST_BUSINESS_2=test-cafe-uuid

# App URL
PLAYWRIGHT_TEST_BASE_URL=http://localhost:5173
```

### Database Setup

Run the following SQL in Supabase SQL Editor to create test data:

```sql
-- Create test users (via Supabase Auth UI first, then get their IDs)

-- Create test businesses
INSERT INTO businesses (id, name, owner_id, latitude, longitude, address, description)
VALUES 
  ('test-restaurant-uuid', 'Test Restaurant E2E', 'owner-user-id', 40.7128, -74.006, '123 Test St, NY', 'Test restaurant for E2E'),
  ('test-cafe-uuid', 'Test Cafe E2E', 'owner-user-id', 40.758, -73.9855, '456 Test Ave, NY', 'Test cafe for E2E')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- Create test check-ins
INSERT INTO business_checkins (user_id, business_id, latitude, longitude)
VALUES
  ('test-user-1-id', 'test-restaurant-uuid', 40.7128, -74.006),
  ('test-user-2-id', 'test-restaurant-uuid', 40.7128, -74.006),
  ('test-user-1-id', 'test-cafe-uuid', 40.758, -73.9855)
ON CONFLICT DO NOTHING;
```

---

## 🚀 Running Tests

### Run All E2E Tests

```powershell
# Run all tests (headless mode)
npm run test:e2e

# Run all tests (headed mode - watch browser)
npm run test:e2e:headed

# Run specific test file
npx playwright test tests/e2e/01-binary-recommendation.spec.ts

# Run tests in debug mode
npx playwright test --debug

# Run tests in UI mode (interactive)
npx playwright test --ui
```

### Run Tests by Browser

```powershell
# Chrome only
npx playwright test --project=chromium

# Firefox only
npx playwright test --project=firefox

# All browsers
npx playwright test --project=chromium --project=firefox --project=webkit
```

### Run Specific Test Suites

```powershell
# Binary recommendation tests only
npx playwright test 01-binary-recommendation

# Word limit tests only
npx playwright test 02-word-limit

# Run by test name
npx playwright test -g "Submit Positive Review"
```

### Watch Mode (Development)

```powershell
# Auto-run tests on file changes
npx playwright test --watch
```

---

## 📝 Black-Box Manual Testing

### Quick Start

1. Open `tests/STORY_5.2_BLACKBOX_TEST_PLAN.md`
2. Follow the **Test Environment Setup** section
3. Execute test cases sequentially
4. Mark checkboxes (⬜ → ✅) as you complete each step
5. Document any bugs found using the Bug Report Template

### Execution Guidelines

**Before Testing**:
- ✅ Clear browser cache
- ✅ Use incognito/private mode for multi-user tests
- ✅ Have test data ready (users, businesses, check-ins)
- ✅ Take screenshots of bugs/errors

**During Testing**:
- ✅ Follow steps exactly as written
- ✅ Document deviations from expected results
- ✅ Test both success and failure paths
- ✅ Note any UI/UX issues even if minor

**After Testing**:
- ✅ Complete test summary table
- ✅ Calculate pass rate
- ✅ File bugs for failed tests
- ✅ Recommend production readiness

### Test Execution Order

Recommended order for efficient testing:

1. **Test Suite 1**: Binary Recommendation (TC-1.1 to TC-1.3)
2. **Test Suite 2**: Word Limit (TC-2.1 to TC-2.4)
3. **Test Suite 3**: GPS Gating (TC-3.1 to TC-3.3)
4. **Test Suite 4**: Photo Upload (TC-4.1 to TC-4.6)
5. **Test Suite 5**: Tags (TC-5.1 to TC-5.4)
6. **Test Suite 6**: Edit Reviews (TC-6.1 to TC-6.4)
7. **Test Suite 7**: Delete Reviews (TC-7.1 to TC-7.3)
8. **Test Suite 8**: Owner Responses (TC-8.1 to TC-8.6)
9. **Test Suite 9**: My Reviews Page (TC-9.1 to TC-9.6)
10. **Test Suite 10**: Real-time (TC-10.1 to TC-10.4)
11. **Test Suite 11**: Error Handling (TC-11.1 to TC-11.5)

**Estimated Time**: 4-6 hours

---

## 🤖 E2E Automated Testing

### Test Structure

```
tests/
├── e2e/
│   ├── fixtures/
│   │   └── test-data.ts          # Test data and helpers
│   ├── 01-binary-recommendation.spec.ts
│   ├── 02-word-limit.spec.ts
│   ├── 03-gps-checkin.spec.ts    # TODO
│   ├── 04-photo-upload.spec.ts   # TODO
│   ├── 05-tags.spec.ts           # TODO
│   ├── 06-edit-reviews.spec.ts   # TODO
│   ├── 07-delete-reviews.spec.ts # TODO
│   ├── 08-owner-responses.spec.ts # TODO
│   ├── 09-my-reviews-page.spec.ts # TODO
│   └── 10-realtime-updates.spec.ts # TODO
└── STORY_5.2_BLACKBOX_TEST_PLAN.md
```

### Writing New Tests

Use the test data fixtures for consistency:

```typescript
import { test, expect } from '@playwright/test';
import {
  TEST_USERS,
  TEST_BUSINESSES,
  REVIEW_TEST_DATA,
  SELECTORS,
  WAIT_TIMES,
  getBusinessUrl,
} from './fixtures/test-data';

test.describe('My Feature', () => {
  test('My test case', async ({ page }) => {
    // Use fixtures
    await page.goto(getBusinessUrl(TEST_BUSINESSES.testRestaurant.id));
    
    // Use selectors
    await page.click(SELECTORS.reviewForm);
    
    // Use test data
    await page.fill(SELECTORS.reviewTextArea, REVIEW_TEST_DATA.validReviews.short);
    
    // Use wait times
    await page.waitForTimeout(WAIT_TIMES.short);
  });
});
```

### Best Practices

1. **Use data-testid selectors**: More stable than CSS classes
2. **Wait for elements**: Use `waitForSelector` instead of `waitForTimeout` when possible
3. **Clean up test data**: Delete created reviews after tests
4. **Independent tests**: Each test should be able to run standalone
5. **Descriptive names**: Test names should match Black-Box test case IDs

---

## 📊 Test Data

### Test Users

| User | Email | Password | Role |
|------|-------|----------|------|
| Test User 1 | test1@syncwarp.test | TestPassword123! | Regular User |
| Test User 2 | test2@syncwarp.test | TestPassword123! | Regular User |
| Owner | owner@syncwarp.test | OwnerPassword123! | Business Owner |

### Test Businesses

| Business | ID | Location | Owner |
|----------|----|-----------| ------|
| Test Restaurant E2E | test-restaurant-uuid | NYC (40.7128, -74.006) | Owner |
| Test Cafe E2E | test-cafe-uuid | NYC (40.758, -73.9855) | Owner |

### Test Review Data

Available in `tests/e2e/fixtures/test-data.ts`:

```typescript
REVIEW_TEST_DATA.validReviews.short      // 4 words
REVIEW_TEST_DATA.validReviews.medium     // 20 words
REVIEW_TEST_DATA.validReviews.atLimit    // 30 words
REVIEW_TEST_DATA.validReviews.nearLimit  // 28 words
REVIEW_TEST_DATA.invalidReviews.overLimit // 31 words
```

---

## 🔧 Troubleshooting

### Common Issues

#### 1. Tests Failing Due to Timeouts

**Problem**: Tests timeout waiting for elements

**Solutions**:
```powershell
# Increase timeout in playwright.config.ts
timeout: 90 * 1000  # 90 seconds

# Or in individual tests
await expect(element).toBeVisible({ timeout: 30000 });
```

#### 2. Supabase Connection Errors

**Problem**: `Error: Invalid Supabase URL`

**Solutions**:
- Verify `.env.test` has correct Supabase project URL
- Ensure test database migration is applied
- Check Supabase project is not paused

#### 3. Authentication Issues

**Problem**: Tests can't login or get `401 Unauthorized`

**Solutions**:
- Verify test users exist in Supabase Auth
- Check `storageState` in `playwright.config.ts`
- Implement auth setup script (see example below)

**Auth Setup Example**:

```typescript
// tests/e2e/auth.setup.ts
import { test as setup } from '@playwright/test';
import { TEST_USERS } from './fixtures/test-data';

const authFile = 'tests/e2e/.auth/user.json';

setup('authenticate', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[name="email"]', TEST_USERS.regularUser1.email);
  await page.fill('[name="password"]', TEST_USERS.regularUser1.password);
  await page.click('button[type="submit"]');
  
  await page.waitForURL('/dashboard');
  await page.context().storageState({ path: authFile });
});
```

#### 4. Test Data Not Found

**Problem**: Tests fail because businesses/users don't exist

**Solutions**:
- Run database setup SQL (see Setup Instructions)
- Verify test data IDs match in `.env.test`
- Check RLS policies allow test user access

#### 5. Screenshots/Videos Not Saving

**Problem**: Test artifacts not generated

**Solutions**:
```typescript
// playwright.config.ts
use: {
  screenshot: 'only-on-failure',  // or 'on'
  video: 'retain-on-failure',     // or 'on'
  trace: 'retain-on-failure',     // or 'on'
}
```

### Debug Mode

Run tests in debug mode to step through:

```powershell
# Debug specific test
npx playwright test --debug tests/e2e/01-binary-recommendation.spec.ts

# Debug with headed browser
npx playwright test --headed --debug

# Playwright Inspector will open
# Use UI to step through test
```

### Logs and Reports

```powershell
# View test report
npx playwright show-report

# View trace (after test failure)
npx playwright show-trace trace.zip

# Enable verbose logging
DEBUG=pw:api npx playwright test
```

---

## 🔄 CI/CD Integration

### GitHub Actions Example

Create `.github/workflows/e2e-tests.yml`:

```yaml
name: E2E Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 18
          
      - name: Install dependencies
        run: npm ci
        
      - name: Install Playwright
        run: npx playwright install --with-deps
        
      - name: Run E2E tests
        run: npm run test:e2e
        env:
          VITE_SUPABASE_URL: ${{ secrets.TEST_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.TEST_SUPABASE_ANON_KEY }}
          
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
          
      - name: Upload test videos
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: test-videos
          path: test-results/
```

### npm Scripts

Add to `package.json`:

```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:headed": "playwright test --headed",
    "test:e2e:debug": "playwright test --debug",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:report": "playwright show-report",
    "test:e2e:codegen": "playwright codegen http://localhost:5173"
  }
}
```

---

## 📈 Reporting

### Test Reports

Playwright generates HTML reports automatically:

```powershell
# Generate and open report
npx playwright show-report

# Report location
# playwright-report/index.html
```

### Test Results JSON

JSON results for parsing:

```powershell
# View JSON results
cat test-results/results.json

# Parse with jq (Windows: install jq via Chocolatey)
cat test-results/results.json | jq '.suites[].specs[] | {name: .title, outcome: .ok}'
```

### Black-Box Test Summary

After manual testing, fill out the summary in `STORY_5.2_BLACKBOX_TEST_PLAN.md`:

```markdown
| Test Suite | Total Cases | Passed | Failed | Blocked | Pass Rate |
|------------|-------------|--------|--------|---------|-----------|
| TS-1: Binary Recommendation | 3 | 3 | 0 | 0 | 100% |
| TS-2: Word Limit | 4 | 4 | 0 | 0 | 100% |
| **TOTAL** | **48** | **46** | **2** | **0** | **95.8%** |
```

### Bug Reports

Document bugs using the template in the Black-Box test plan:

```markdown
### Bug ID: BUG-001
**Title**: Word counter shows incorrect count with emojis
**Severity**: Medium
**Test Case**: TC-2.4
**Environment**: Dev

**Steps to Reproduce**:
1. Open review form
2. Enter "Great food 🍕 🍔"
3. Check word counter

**Expected Result**: Shows 2/30 (2 words)
**Actual Result**: Shows 5/30 (counts emojis as words)
```

---

## 📚 Additional Resources

### Documentation
- [Playwright Docs](https://playwright.dev/)
- [Supabase Testing Docs](https://supabase.com/docs/guides/testing)
- [Story 5.2 Implementation](../STORY_5.2_COMPLETE.md)

### Tools
- [Playwright Test Generator](https://playwright.dev/docs/codegen)
- [Playwright Inspector](https://playwright.dev/docs/debug)
- [Trace Viewer](https://playwright.dev/docs/trace-viewer)

### Contact
For questions or issues:
- File GitHub Issue
- Contact: [project-team@example.com]
- Slack: #testing-story-5-2

---

## ✅ Testing Checklist

### Before Release

- [ ] All 48 Black-Box test cases executed
- [ ] Pass rate ≥ 95%
- [ ] All E2E tests passing
- [ ] All critical bugs resolved
- [ ] Test report generated
- [ ] Regression tests completed
- [ ] Performance testing done
- [ ] Security testing done
- [ ] UAT sign-off received

### After Release

- [ ] Smoke tests in production
- [ ] Monitor error logs
- [ ] Verify analytics tracking
- [ ] Update test data if needed

---

**Testing Guide Version**: 1.0  
**Last Updated**: January 30, 2025  
**Status**: ✅ Ready for Use
