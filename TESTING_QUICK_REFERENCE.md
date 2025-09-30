# Testing Quick Reference Guide

**Last Updated**: January 30, 2025  
**Test Count**: 149 tests (100% passing)

---

## Quick Commands

### Run All Tests
```bash
npm test
```

### Run Tests in Watch Mode
```bash
npm test -- --watch
```

### Run Specific Test File
```bash
npm test rateLimitService
npm test authStore
npm test ErrorBoundary.integration
```

### Run Tests with Coverage
```bash
npm test -- --coverage
```

### Run Tests Once (No Watch)
```bash
npm test -- --run
```

---

## Test File Locations

### Unit Tests
```
src/services/__tests__/
├── rateLimitService.test.ts        (18 tests)
├── searchAnalyticsService.test.ts  (26 tests)
└── couponService.test.ts           (27 tests)

src/store/__tests__/
└── authStore.test.ts               (28 tests)

src/hooks/__tests__/
└── useRateLimit.test.ts            (21 tests)
```

### Integration Tests
```
src/components/error/__tests__/
└── ErrorBoundary.integration.test.tsx  (29 tests)
```

---

## Test Categories

### Services (71 tests)
- **rateLimitService**: Rate limiting logic
- **searchAnalyticsService**: Search tracking and analytics
- **couponService**: Coupon CRUD and management

### State Management (28 tests)
- **authStore**: Authentication and user management

### Hooks (21 tests)
- **useRateLimit**: Rate limit enforcement hook

### Integration (29 tests)
- **ErrorBoundary**: Error handling and recovery

---

## Common Test Patterns

### Running Tests for a Feature
```bash
# Search-related tests
npm test search

# Auth-related tests
npm test auth

# Coupon-related tests
npm test coupon
```

### Debugging Test Failures
1. Run specific test file:
   ```bash
   npm test fileName
   ```

2. Check console output for errors

3. Use `console.log()` in tests for debugging

4. Check mock setup in test file

---

## Test Coverage Goals

### Current Coverage
- ✅ Services: Comprehensive
- ✅ State Management: Complete
- ✅ Custom Hooks: Complete
- ✅ Error Boundaries: Complete

### Future Opportunities
- ⏳ Component workflows (CouponCreator, BusinessRegistration)
- ⏳ E2E authentication flows
- ⏳ Full user journeys

---

## Writing New Tests

### Unit Test Template
```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('MyService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('myMethod', () => {
    it('should do something correctly', () => {
      // Arrange
      const input = 'test';
      
      // Act
      const result = myService.myMethod(input);
      
      // Assert
      expect(result).toBe('expected');
    });
  });
});
```

### Integration Test Template
```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('MyComponent Integration', () => {
  it('should handle user interaction', async () => {
    const user = userEvent.setup();
    
    render(<MyComponent />);
    
    const button = screen.getByRole('button', { name: /click me/i });
    await user.click(button);
    
    expect(screen.getByText(/success/i)).toBeInTheDocument();
  });
});
```

---

## Troubleshooting

### "Tests are Failing"
1. Check if all dependencies are installed:
   ```bash
   npm install
   ```

2. Clear test cache:
   ```bash
   npm test -- --clearCache
   ```

3. Check for TypeScript errors:
   ```bash
   npm run type-check
   ```

### "Tests are Slow"
1. Run specific test file instead of all tests
2. Check for unnecessary `waitFor` calls
3. Ensure proper test isolation

### "Mock Not Working"
1. Check mock is defined before test runs
2. Verify mock return values
3. Use `vi.clearAllMocks()` in `beforeEach`

---

## CI/CD Integration

### GitHub Actions (Example)
```yaml
- name: Run Tests
  run: npm test -- --run

- name: Generate Coverage
  run: npm test -- --coverage --run
```

### Pre-commit Hook (Example)
```bash
#!/bin/sh
npm test -- --run --changed
```

---

## Key Test Files to Know

### Most Important Tests
1. **authStore.test.ts** - Authentication flows
2. **couponService.test.ts** - Core business logic
3. **ErrorBoundary.integration.test.tsx** - Error handling

### High-Value Tests
- **rateLimitService.test.ts** - API protection
- **searchAnalyticsService.test.ts** - User behavior tracking

---

## Documentation References

### Detailed Documentation
- `EPIC4_STORY5_FINAL_SUMMARY.md` - Complete project summary
- `PHASE_2_COMPLETION_SUMMARY.md` - Unit test details
- `PHASE_3_PROGRESS_SUMMARY.md` - Integration test progress

### Testing Libraries
- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Library User Events](https://testing-library.com/docs/user-event/intro)

---

## Success Indicators

### Healthy Test Suite
✅ All tests passing  
✅ Tests run in < 10 seconds  
✅ No flaky tests  
✅ Clear test descriptions  
✅ Good error messages  

### When to Add Tests
- ✅ Before fixing a bug (regression test)
- ✅ When adding new features
- ✅ When refactoring code
- ✅ For critical business logic
- ✅ For complex edge cases

---

## Getting Help

### Test Not Passing?
1. Read the error message carefully
2. Check the test file for comments
3. Review the component/service implementation
4. Check similar passing tests for patterns

### Need to Write a New Test?
1. Find similar test in the codebase
2. Copy the pattern
3. Adapt to your use case
4. Ensure proper mocking

### Questions?
- Check existing test files for examples
- Review documentation files
- Run tests in watch mode for faster feedback

---

**Quick Tip**: Keep tests simple, focused, and readable. A good test should clearly show what's being tested and why it matters.

**Remember**: Tests are documentation - write them for the next developer (which might be you in 6 months)!