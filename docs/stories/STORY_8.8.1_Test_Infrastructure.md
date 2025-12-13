# 🧪 STORY 8.8.1: Test Infrastructure Setup

**Parent Epic:** [EPIC 8.8 - Testing & QA](../epics/EPIC_8.8_Testing_QA.md)
**Priority:** P0 - Critical
**Estimated Effort:** 1.5 Days
**Dependencies:** None
**Status:** ✅ Complete

---

## 🎯 **Goal**
Establish a robust, industry-standard testing infrastructure to support unit, integration, and E2E testing. This includes setting up MSW for mocking, configuring a dedicated test database environment, and ensuring CI-ready test scripts.

---

## 📋 **Acceptance Criteria**

### 1. Unit Test Infrastructure
- [ ] **MSW Scaffolding**: `MockServiceWorker` setup for effective network mocking.
- [ ] **Test Utils**: `test-utils.tsx` created exporting a custom `render` function that wraps components with:
  - `QueryClientProvider` (with retry=0 for tests)
  - `AuthProvider` (mocked state)
  - `MemoryRouter`
- [ ] **Vitest Config**: Updated to include `setupTests.ts` which cleans up MSW handlers after each test.

### 2. Integration Test Infrastructure
- [ ] **Test Database**: Docker Compose or script to spin up a *clean* Supabase instance (or dedicated cloud project) for testing.
- [ ] **Seeding Scripts**: `npm run db:seed:test` script to populate reliable test data (User A, User B, Blocked User).
- [ ] **Global Setup/Teardown**: Scripts to wipe the database before/after test runs.

### 3. Accessibility & Visual Testing
- [ ] **jest-axe Setup**: Configure `jest-axe` in test utils for accessibility assertions.
- [ ] **Snapshot Testing**: Enable Vitest inline snapshots for component UI regression.

### 4. CI/CD Prep
- [ ] **Headless Config**: Ensure all tests run in headless mode via `npm test`.
- [ ] **Playwright Trace on Failure**: Configure Playwright to save traces/videos on test failure.

---

## 🧩 **Implementation Details**

### `src/test/test-utils.tsx`
```typescript
import { render } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const customRender = (ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(ui, { wrapper: ({ children }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>, ...options })
}

export * from '@testing-library/react'
export { customRender as render }
```

### `src/setupTests.ts`
```typescript
import { server } from './mocks/server'

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
```

---

## 🤖 **MCP Integration Strategy**

### Context7 MCP
- **Code Gen**: `warp mcp run context7 "generate MSW handler boilerplate for standard CRUD operations"`
- **Config Review**: `warp mcp run context7 "review vitest.config.ts for best practices"`

---

## 🧪 **Testing Plan**
1. Run `npm test` and verify the simple "App renders" test uses the new infrastructure without errors.
