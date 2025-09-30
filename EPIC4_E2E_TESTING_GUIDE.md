# Epic 4 E2E Testing Guide

## Overview

This guide covers end-to-end testing for all Epic 4 stories, simulating real user interactions with the application.

---

## 🎯 Test Coverage

### Stories Tested

✅ **Story 4.1**: Business Registration & Profiles
- 4-step registration wizard
- Profile viewing and editing
- Dashboard navigation

✅ **Story 4.2**: Product/Service Catalog
- Product creation (CRUD operations)
- Multi-image uploads
- Catalog management

✅ **Story 4.3**: Coupon Creation & Management
- 6-step coupon wizard
- Status management
- Analytics viewing

✅ **Story 4.4**: Search & Discovery + Favorites
- Advanced search with filters
- Location-based discovery
- Favorites add/remove/sync

✅ **Story 4.5**: Storefront Pages
- Business storefront viewing
- Responsive design testing
- Tab navigation

✅ **Story 4.6**: GPS Check-in System
- Location permissions
- Check-in flow
- Rewards and analytics

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

Playwright is already installed with the project.

### 2. Run All E2E Tests

```bash
# Run all tests in headed mode (see browser)
npm run test:e2e

# Run tests in headless mode (CI)
npm run test:e2e:headless

# Run specific story tests
npm run test:e2e:story4.1
npm run test:e2e:story4.2
npm run test:e2e:story4.3
npm run test:e2e:story4.4
npm run test:e2e:story4.5
npm run test:e2e:story4.6
```

### 3. View Test Report

```bash
# Generate and open HTML report
npm run test:e2e:report
```

---

## 📋 Test Scenarios

### Story 4.1: Business Registration

**Test**: Complete business registration workflow - 4 step wizard

1. User signs up with new account
2. Navigates to business registration
3. Fills Step 1: Basic Information
   - Business name
   - Description
   - Category
4. Fills Step 2: Location Details
   - Street address
   - City, state, zip
   - Phone number
5. Fills Step 3: Operating Hours
   - Sets hours for each day
6. Fills Step 4: Media & Final Details
   - Website URL
   - Tags
7. Submits registration
8. Verifies redirect to dashboard
9. Confirms business appears in dashboard

**Expected Result**: Business successfully registered and visible in dashboard

---

### Story 4.2: Product Catalog

**Test**: Create, view, and manage products

1. User logs in
2. Navigates to product management
3. Clicks "Add Product"
4. Fills product details:
   - Name
   - Description
   - Price
   - Stock quantity
5. Saves product
6. Verifies product appears in catalog
7. Edits product price
8. Deletes product
9. Confirms deletion

**Expected Result**: Product CRUD operations work correctly

---

### Story 4.3: Coupon Creation

**Test**: Create coupon through 6-step wizard

1. User logs in
2. Navigates to coupon creation
3. Fills Step 1: Basic Info (title, description)
4. Fills Step 2: Discount Details (type, value)
5. Fills Step 3: Validity Period (dates)
6. Fills Step 4: Usage Limits
7. Fills Step 5: Conditions (min purchase)
8. Step 6: Review & Submit
9. Verifies coupon created
10. Tests coupon status toggle
11. Views coupon analytics

**Expected Result**: Coupon creation wizard completes successfully

---

### Story 4.4: Search & Discovery

**Test 1**: Search for businesses with filters

1. User navigates to search
2. Enters search query
3. Views results
4. Applies category filter
5. Verifies filtered results

**Test 2**: Add to favorites

1. User logs in
2. Searches for business
3. Adds business to favorites
4. Navigates to favorites page
5. Verifies business in favorites list

**Test 3**: Location-based discovery

1. Grants geolocation permissions
2. Navigates to discover page
3. Views nearby businesses
4. Verifies map display

**Expected Result**: Search, filters, and favorites work correctly

---

### Story 4.5: Storefront Pages

**Test 1**: View business storefront

1. User searches for businesses
2. Clicks on business
3. Views storefront page
4. Verifies tabs (About, Products, Coupons)
5. Switches between tabs
6. Checks all content loads

**Test 2**: Responsive design

1. Tests mobile viewport (375px)
2. Tests tablet viewport (768px)
3. Tests desktop viewport (1280px)
4. Verifies layout adjusts correctly

**Expected Result**: Storefront pages display correctly on all devices

---

### Story 4.6: GPS Check-in System

**Test 1**: Check-in to nearby business

1. User logs in
2. Grants geolocation permissions
3. Navigates to check-ins page
4. Views nearby businesses
5. Clicks "Check In"
6. Verifies location validation
7. Confirms check-in success

**Test 2**: View rewards

1. User logs in
2. Navigates to rewards page
3. Views points, achievements, level
4. Verifies rewards data displays

**Test 3**: Business analytics

1. Business owner logs in
2. Navigates to analytics
3. Views check-in statistics
4. Verifies charts and data

**Expected Result**: Check-in system and rewards work correctly

---

## 🧪 Complete Integration Test

**Epic 4 Full User Journey**

This comprehensive test simulates a complete user journey through all Epic 4 features:

1. **User Registration**: Sign up as business owner
2. **Business Registration**: Complete 4-step wizard
3. **Product Creation**: Add products to catalog
4. **Coupon Creation**: Create coupons with 6-step wizard
5. **Storefront Verification**: View public storefront
6. **Search Testing**: Find business via search
7. **Check-in Testing**: Test location features

**Duration**: ~5-10 minutes
**Expected Result**: All Epic 4 features work end-to-end

---

## 📊 Test Execution

### Running Tests

```bash
# Run all Epic 4 tests
npx playwright test e2e/epic4-complete.spec.ts

# Run specific test suite
npx playwright test e2e/epic4-complete.spec.ts --grep "Story 4.1"

# Run with UI mode (interactive)
npx playwright test --ui

# Run in debug mode
npx playwright test --debug
```

### Viewing Results

```bash
# Open last HTML report
npx playwright show-report

# Generate report
npx playwright show-report playwright-report
```

---

## 🎬 Test Artifacts

### Screenshots
- Captured on test failure
- Location: `test-results/` directory
- Format: PNG

### Videos
- Recorded for failed tests
- Location: `test-results/` directory
- Format: WebM

### Traces
- Captured on first retry
- View with: `npx playwright show-trace trace.zip`

---

## 🔧 Configuration

### Playwright Config
File: `playwright.config.ts`

Key Settings:
```typescript
baseURL: 'http://127.0.0.1:5173'
timeout: 30000
geolocation: { longitude: -74.006, latitude: 40.7128 } // NYC
permissions: ['geolocation']
```

### Test Helpers
File: `e2e/helpers/testHelpers.ts`

Available Helpers:
- `login()` - Login with test credentials
- `signup()` - Create new user account
- `goto()` - Navigate to route
- `fillField()` - Fill form field
- `clickButton()` - Click button by text
- `waitForToast()` - Wait for notification
- `grantGeolocation()` - Grant location permissions
- `takeScreenshot()` - Capture screenshot

---

## 🐛 Troubleshooting

### Common Issues

**Issue**: Tests fail with "Timeout waiting for element"
```bash
Solution: Increase timeout in playwright.config.ts or specific test
```

**Issue**: Geolocation tests fail
```bash
Solution: Ensure permissions are granted in config
geolocation: { longitude: -74.006, latitude: 40.7128 }
permissions: ['geolocation']
```

**Issue**: Login fails
```bash
Solution: Verify test user exists in database or use signup instead
```

**Issue**: Dev server not starting
```bash
Solution: Check if port 5173 is available
Kill existing processes: npx kill-port 5173
```

---

## 📝 Test Maintenance

### Adding New Tests

1. Open `e2e/epic4-complete.spec.ts`
2. Add new `test()` block to appropriate `test.describe()` section
3. Use `TestHelpers` for common operations
4. Add assertions with `expect()`

Example:
```typescript
test('New test scenario', async ({ page }) => {
  await helpers.login();
  await helpers.goto('/new-feature');
  
  await page.click('button:has-text("Action")');
  await expect(page.locator('text=Success')).toBeVisible();
  
  console.log('✅ New test passed');
});
```

### Updating Test Data

File: `e2e/helpers/testHelpers.ts`

Update `TestDataGenerator` methods:
```typescript
static randomBusinessName(): string {
  // Add more variety
  const prefixes = ['Sunny', 'Happy', 'Golden', 'Fresh', 'Urban'];
  const suffixes = ['Cafe', 'Shop', 'Store', 'Market', 'Deli'];
  return `${prefixes[...]} ${suffixes[...]}`;
}
```

---

## 📈 CI/CD Integration

### GitHub Actions

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e:headless
      
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

---

## ✅ Test Checklist

Before considering Epic 4 E2E testing complete:

- [ ] All Story 4.1 tests passing
- [ ] All Story 4.2 tests passing
- [ ] All Story 4.3 tests passing
- [ ] All Story 4.4 tests passing
- [ ] All Story 4.5 tests passing
- [ ] All Story 4.6 tests passing
- [ ] Complete integration test passing
- [ ] Tests run in CI/CD
- [ ] Test report generated
- [ ] Screenshots/videos captured on failures
- [ ] Documentation updated

---

## 🎉 Success Criteria

Epic 4 E2E testing is considered successful when:

1. **All 16+ tests pass** in the complete test suite
2. **Integration test completes** the full user journey
3. **No flaky tests** - consistent pass rate
4. **Report generated** with detailed results
5. **Artifacts captured** for debugging
6. **Performance acceptable** - test suite completes in <15 minutes

---

## 📚 Additional Resources

### Playwright Documentation
- [Playwright Docs](https://playwright.dev)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Selectors](https://playwright.dev/docs/selectors)

### Project Documentation
- `EPIC_4_COMPLETE_STATUS.md` - Epic 4 status
- `CHECKIN_TESTING_GUIDE.md` - GPS testing guide
- `README.md` - Project overview

---

## 🚀 Next Steps

After E2E testing is complete:

1. **Run tests locally** to verify setup
2. **Review test report** for any failures
3. **Fix any issues** found during testing
4. **Integrate with CI/CD** for automated testing
5. **Monitor test results** over time
6. **Expand coverage** to other epics

---

**Date**: January 2025  
**Status**: Ready for execution  
**Test Count**: 16+ tests covering all Epic 4 stories  
**Estimated Runtime**: 10-15 minutes