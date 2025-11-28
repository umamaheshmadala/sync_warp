# Story 9.8.10: Test Infrastructure & CI/CD Integration

**Epic:** [EPIC 9.8: Testing, Performance & QA](../epics/EPIC_9.8_Testing_Performance_QA.md)  
**Priority:** 🔴 Critical  
**Estimated Time:** 1 day  
**MCP Usage:** 🧠 Context7 MCP (Medium)  
**Dependencies:** Stories 9.8.1-9.8.9, Epics 9.1-9.7  
**Status:** 📋 Planning

---

## 📋 Story Description

Set up automated testing infrastructure in the CI/CD pipeline. Configure test database, code coverage reporting, and test result notifications to ensure all tests run automatically on every PR.

---

## ✅ Acceptance Criteria

### CI/CD Pipeline
- [ ] All unit tests run on every PR
- [ ] Integration tests run on every PR
- [ ] E2E tests run on main branch commits
- [ ] Test failures block PR merges
- [ ] Automated test retries for flaky tests

### Test Database
- [ ] Test database branch automatically created
- [ ] Test data seeded before tests
- [ ] Test database cleaned up after tests
- [ ] Isolated test environments per PR

### Code Coverage
- [ ] Code coverage reports generated automatically
- [ ] Coverage thresholds enforced (80% for services, 70% for components)
- [ ] Coverage reports uploaded to Codecov/Coveralls
- [ ] Coverage trends tracked over time

### Notifications
- [ ] Slack/email notifications for test failures
- [ ] GitHub PR comments with test results
- [ ] Performance regression alerts
- [ ] Security vulnerability alerts

---

## 🎨 Implementation

### File Structure

```
.github/workflows/
├── unit-tests.yml
├── integration-tests.yml
├── e2e-tests.yml
├── performance-tests.yml
└── security-tests.yml

scripts/ci/
├── setup-test-db.sh
├── seed-test-data.ts
├── cleanup-test-db.sh
└── upload-coverage.sh

.codecov.yml
vitest.config.ts
playwright.config.ts
```

### Example: unit-tests.yml

```yaml
name: Unit Tests

on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm run test:unit -- --coverage

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
          flags: unit
          name: unit-tests

      - name: Check coverage thresholds
        run: |
          COVERAGE=$(cat coverage/coverage-summary.json | jq '.total.lines.pct')
          if (( $(echo "$COVERAGE < 80" | bc -l) )); then
            echo "Coverage is below 80%: $COVERAGE%"
            exit 1
          fi

      - name: Comment PR with test results
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v6
        with:
          script: |
            const fs = require('fs');
            const coverage = JSON.parse(fs.readFileSync('coverage/coverage-summary.json'));
            const comment = `
            ## Unit Test Results
            
            ✅ All tests passed!
            
            **Coverage:**
            - Lines: ${coverage.total.lines.pct}%
            - Branches: ${coverage.total.branches.pct}%
            - Functions: ${coverage.total.functions.pct}%
            - Statements: ${coverage.total.statements.pct}%
            `;
            
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: comment
            });
```

### Example: integration-tests.yml

```yaml
name: Integration Tests

on:
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest

    env:
      VITE_SUPABASE_URL: ${{ secrets.SUPABASE_TEST_URL }}
      VITE_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_TEST_ANON_KEY }}

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Create test database branch
        run: |
          npx supabase branches create test-${{ github.run_id }}

      - name: Run migrations on test database
        run: |
          npx supabase db push --db-url ${{ secrets.SUPABASE_TEST_URL }}

      - name: Seed test data
        run: npm run seed:test

      - name: Run integration tests
        run: npm run test:integration

      - name: Cleanup test database
        if: always()
        run: |
          npx supabase branches delete test-${{ github.run_id }}

      - name: Notify on failure
        if: failure()
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: 'Integration tests failed on PR #${{ github.event.pull_request.number }}'
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

### Example: e2e-tests.yml

```yaml
name: E2E Tests

on:
  push:
    branches: [main]
  schedule:
    - cron: '0 0 * * *' # Daily at midnight

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps

      - name: Build application
        run: npm run build

      - name: Start application
        run: npm run preview &
        env:
          PORT: 5173

      - name: Wait for application
        run: npx wait-on http://localhost:5173

      - name: Run E2E tests
        run: npx playwright test

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/

      - name: Upload screenshots
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-screenshots
          path: test-results/

      - name: Comment PR with E2E results
        if: github.event_name == 'pull_request'
        uses: daun/playwright-report-comment@v3
        with:
          report-path: playwright-report/
```

### Example: performance-tests.yml

```yaml
name: Performance Tests

on:
  pull_request:
    branches: [main]

jobs:
  lighthouse:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Build application
        run: npm run build

      - name: Start application
        run: npm run preview &

      - name: Wait for application
        run: npx wait-on http://localhost:5173

      - name: Run Lighthouse CI
        uses: treosh/lighthouse-ci-action@v9
        with:
          urls: |
            http://localhost:5173/friends
            http://localhost:5173/friends/search
          uploadArtifacts: true
          temporaryPublicStorage: true

      - name: Check performance budget
        run: |
          PERF_SCORE=$(cat .lighthouseci/lhr-*.json | jq '.categories.performance.score')
          if (( $(echo "$PERF_SCORE < 0.9" | bc -l) )); then
            echo "Performance score is below 90: $PERF_SCORE"
            exit 1
          fi
```

### Example: Codecov Configuration

```yaml
# .codecov.yml
coverage:
  status:
    project:
      default:
        target: 80%
        threshold: 1%
    patch:
      default:
        target: 70%

comment:
  layout: "reach,diff,flags,tree"
  behavior: default
  require_changes: false

ignore:
  - "**/*.test.ts"
  - "**/*.test.tsx"
  - "**/__tests__/**"
  - "**/e2e/**"
```

---

## 🎯 MCP Integration

### Context7 MCP Commands

```bash
# Analyze CI/CD configuration
warp mcp run context7 "analyze .github/workflows/"

# Find slow tests
warp mcp run context7 "find slow tests in src/__tests__/"

# Optimize test suite
warp mcp run context7 "suggest test suite optimizations"
```

---

## 📦 Deliverables

1. **CI/CD Workflows:**
   - `.github/workflows/unit-tests.yml`
   - `.github/workflows/integration-tests.yml`
   - `.github/workflows/e2e-tests.yml`
   - `.github/workflows/performance-tests.yml`
   - `.github/workflows/security-tests.yml`

2. **CI Scripts:**
   - `scripts/ci/setup-test-db.sh`
   - `scripts/ci/seed-test-data.ts`
   - `scripts/ci/cleanup-test-db.sh`
   - `scripts/ci/upload-coverage.sh`

3. **Configuration:**
   - `.codecov.yml`
   - `vitest.config.ts` (updated for CI)
   - `playwright.config.ts` (updated for CI)

---

## 📈 Success Metrics

- **CI/CD Pipeline Success Rate:** > 95%
- **Test Execution Time:** < 15 minutes total
- **Coverage Reporting:** Automated on every PR
- **Notification Delivery:** 100%

---

**Epic Complete!** All 10 stories for Epic 9.8 have been created.
