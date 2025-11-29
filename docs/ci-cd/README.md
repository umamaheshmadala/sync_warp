# CI/CD Integration - README

# Story 9.8.10: Test Infrastructure & CI/CD Integration

## Overview

Automated testing infrastructure for the Friends Module, ensuring all tests run automatically on every PR.

## GitHub Actions Workflows

### Unit Tests (`unit-tests.yml`)

- **Trigger:** Every PR and push to main
- **Duration:** ~2-3 minutes
- **Coverage:** Uploads to Codecov
- **Notifications:** PR comments with test results

### E2E Tests (`e2e-tests.yml`)

- **Trigger:** Push to main, PRs, daily schedule
- **Duration:** ~5-10 minutes
- **Browsers:** Chrome, Firefox, Safari
- **Artifacts:** Test reports and screenshots

## Code Coverage

### Thresholds

- **Project:** 70% target
- **Patch:** 60% target

### Reporting

- Automated upload to Codecov
- PR comments with coverage diff
- Coverage trends tracked over time

## Running Tests Locally

```bash
# Unit tests
npm test

# Unit tests with coverage
npm test -- --coverage

# E2E tests
npx playwright test

# E2E tests in headed mode
npx playwright test --headed

# E2E tests on specific browser
npx playwright test --project=chromium
```

## CI/CD Best Practices

1. **Fast Feedback:** Unit tests run on every PR
2. **Comprehensive Coverage:** E2E tests run daily
3. **Automated Reporting:** Coverage and test results posted to PRs
4. **Artifact Retention:** Test reports kept for 7 days
5. **Fail Fast:** Tests block PR merges if failing

## Troubleshooting

### Tests Failing in CI but Passing Locally

- Check Node.js version (should be 18)
- Verify environment variables
- Check for timezone/locale differences

### E2E Tests Flaky

- Increase timeouts in `playwright.config.ts`
- Add explicit waits for dynamic content
- Check for race conditions

### Coverage Not Uploading

- Verify Codecov token in repository secrets
- Check coverage file paths
- Ensure coverage is generated before upload

## Maintenance

- Review and update workflows quarterly
- Monitor test execution times
- Optimize slow tests
- Update browser versions regularly
