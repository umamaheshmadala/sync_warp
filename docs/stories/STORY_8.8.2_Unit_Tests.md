# 🧪 STORY 8.8.2: Unit Testing Implementation

**Parent Epic:** [EPIC 8.8 - Testing & QA](../epics/EPIC_8.8_Testing_QA.md)
**Priority:** P1 - High
**Estimated Effort:** 2 Days
**Dependencies:** Story 8.8.1 (Test Infrastructure)
**Status:** ✅ Complete

---

## 🎯 **Goal**
Achieve >85% code coverage by implementing comprehensive unit tests for all core services and custom hooks using the infrastructure from Story 8.8.1.

---

## 📋 **Acceptance Criteria**

### 1. Service Tests (using MSW)
- [x] `messagingService.test.ts`: Test network success/failure using MSW handlers (no manual `vi.mock` for fetch).
- [x] `spamDetectionService.test.ts`: Test local logic.
- [x] `linkValidationService.test.ts`: Test regex and Safe Browsing API (mocked via MSW).

### 2. Hook Tests (using custom render)
- [x] `useMessages.test.ts`: Verify data loading states using `renderHook` with `wrapper` from `test-utils`.
- [x] `useSendMessage.test.ts`: Verify optimistic updates.

### 3. Code Coverage
- [x] >85% Coverage for `src/services` and `src/hooks`.

---

## 🧩 **Implementation Details**

### Using `test-utils`
```typescript
import { render, screen } from '../../test/test-utils' // Import from custom utils
// ...
render(<MyComponent />) // Automatically wrapped with Providers
```

### Mocking Network with MSW
```typescript
import { server } from '../../mocks/server'
import { http, HttpResponse } from 'msw'

it('handles error state', async () => {
    server.use(
        http.get('*/messages', () => {
           return new HttpResponse(null, { status: 500 })
        })
    )
    // Test that hook/service handles 500 error gracefully
})
```

---

## 🤖 **MCP Integration Strategy**

### Context7 MCP
- **Coverage Gap Analysis**: `warp mcp run context7 "find untested code paths in src/services"`
- **Test Scaffolding**: `warp mcp run context7 "generate vitest test file for useMessages hook"`

---

## 🧪 **Testing Plan**
1. Run `npm test` to execute the unit test suite.
2. Run `npm run test:coverage` and verify >85% coverage for `src/services` and `src/hooks`.
