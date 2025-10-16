# Frontend Testing Guide

## 🎯 Overview

This guide covers frontend testing for the Targeted Campaigns system, including component tests, hook tests, service tests, and E2E tests.

---

## 📚 Table of Contents

1. [Quick Start](#quick-start)
2. [Testing Philosophy](#testing-philosophy)
3. [Component Testing](#component-testing)
4. [Hook Testing](#hook-testing)
5. [Service Testing](#service-testing)
6. [E2E Testing](#e2e-testing)
7. [Best Practices](#best-practices)
8. [Troubleshooting](#troubleshooting)

---

## 🚀 Quick Start

### Run Tests

```powershell
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with UI
npm run test:ui

# Run specific test file
npm test Campaign

# Generate coverage report
npm run test:coverage
```

### Test Structure

```
src/
├── components/
│   └── __tests__/
│       └── CampaignCard.test.tsx
├── hooks/
│   └── __tests__/
│       └── useDrivers.test.ts
├── services/
│   └── __tests__/
│       └── driverService.test.ts
└── test/
    ├── setup.ts
    ├── utils.tsx
    └── mocks/
        ├── data.ts
        └── handlers.ts
```

---

## 🎓 Testing Philosophy

### The Testing Trophy

We follow the testing trophy approach:

1. **E2E Tests** (10%) - Critical user flows
2. **Integration Tests** (20%) - Component + hook integration
3. **Unit Tests** (70%) - Individual components, hooks, utils

### Key Principles

1. **Test Behavior, Not Implementation**
   ```typescript
   ✅ test('shows success message after form submission', ...)
   ❌ test('calls useState hook', ...)
   ```

2. **User-Centric Testing**
   - Query by what users see: text, labels, roles
   - Avoid implementation details: test IDs, class names

3. **Maintainable Tests**
   - Use mock data factories
   - Keep tests DRY with helper functions
   - Clear test names that describe behavior

---

## 🧩 Component Testing

### Basic Component Test

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '../../test/utils';
import { CampaignCard } from '../CampaignCard';
import { mockCampaign } from '../../test/mocks/data';

describe('CampaignCard', () => {
  it('renders campaign name', () => {
    render(<CampaignCard campaign={mockCampaign} />);
    
    expect(screen.getByText('Test Campaign')).toBeInTheDocument();
  });
});
```

### Testing User Interactions

```typescript
import { fireEvent } from '@testing-library/react';
import { vi } from 'vitest';

it('calls onClick when button is clicked', () => {
  const handleClick = vi.fn();
  render(<Button onClick={handleClick}>Click me</Button>);
  
  fireEvent.click(screen.getByText('Click me'));
  
  expect(handleClick).toHaveBeenCalledTimes(1);
});
```

### Testing Async Components

```typescript
import { waitFor } from '@testing-library/react';

it('loads data and displays it', async () => {
  render(<CampaignList />);
  
  // Wait for loading to finish
  await waitFor(() => {
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
  });
  
  // Check data is displayed
  expect(screen.getByText('Test Campaign')).toBeInTheDocument();
});
```

### Testing Forms

```typescript
import userEvent from '@testing-library/user-event';

it('submits form with valid data', async () => {
  const handleSubmit = vi.fn();
  render(<CampaignForm onSubmit={handleSubmit} />);
  
  // Fill form
  await userEvent.type(screen.getByLabelText('Campaign Name'), 'New Campaign');
  await userEvent.type(screen.getByLabelText('Budget'), '5000');
  
  // Submit
  await userEvent.click(screen.getByText('Create Campaign'));
  
  // Check submission
  expect(handleSubmit).toHaveBeenCalledWith({
    name: 'New Campaign',
    budget: 5000
  });
});
```

### Testing Conditional Rendering

```typescript
it('shows pause button for active campaigns', () => {
  render(<CampaignCard campaign={{ ...mockCampaign, status: 'active' }} />);
  expect(screen.getByTitle('Pause')).toBeInTheDocument();
});

it('shows resume button for paused campaigns', () => {
  render(<CampaignCard campaign={{ ...mockCampaign, status: 'paused' }} />);
  expect(screen.getByTitle('Resume')).toBeInTheDocument();
});
```

---

## 🪝 Hook Testing

### Basic Hook Test

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { useDriverProfile } from '../useDrivers';
import { mockDriverProfile } from '../../test/mocks/data';

describe('useDriverProfile', () => {
  it('fetches driver profile', async () => {
    const { result } = renderHook(() => 
      useDriverProfile('user-123', 'city-456')
    );
    
    // Initially loading
    expect(result.current.isLoading).toBe(true);
    
    // Wait for data
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    
    // Check data
    expect(result.current.profile).toEqual(mockDriverProfile);
  });
});
```

### Testing Hook State Changes

```typescript
it('updates profile when refresh is called', async () => {
  const { result } = renderHook(() => useDriverProfile('user-123'));
  
  // Wait for initial load
  await waitFor(() => expect(result.current.profile).toBeTruthy());
  
  // Call refresh
  act(() => {
    result.current.refresh();
  });
  
  // Check loading state
  expect(result.current.isLoading).toBe(true);
  
  // Wait for refresh to complete
  await waitFor(() => expect(result.current.isLoading).toBe(false));
});
```

### Testing Hook Errors

```typescript
import { server } from '../../test/setup';
import { http, HttpResponse } from 'msw';

it('handles fetch errors', async () => {
  // Mock error response
  server.use(
    http.get('*/driver_profiles/*', () => {
      return HttpResponse.json({ error: 'Not found' }, { status: 404 });
    })
  );
  
  const { result } = renderHook(() => useDriverProfile('invalid-id'));
  
  await waitFor(() => {
    expect(result.current.error).toBe('Failed to fetch driver profile');
  });
});
```

---

## 🔧 Service Testing

### Basic Service Test

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { driverService } from '../driverService';
import { mockDriverProfile } from '../../test/mocks/data';

describe('driverService', () => {
  it('calculates driver score correctly', async () => {
    const score = driverService.calculateScore({
      avgRating: 4.8,
      completionRate: 95,
      acceptanceRate: 90
    });
    
    expect(score).toBeGreaterThan(80);
    expect(score).toBeLessThanOrEqual(100);
  });
});
```

### Testing Service with Mocked API

```typescript
it('fetches driver profile from API', async () => {
  const profile = await driverService.getDriverProfile('user-123', 'city-456');
  
  expect(profile).toEqual(mockDriverProfile);
});
```

### Testing Service Error Handling

```typescript
it('throws error for invalid user ID', async () => {
  await expect(
    driverService.getDriverProfile('invalid')
  ).rejects.toThrow('Failed to fetch driver profile');
});
```

---

## 🎭 E2E Testing

### Setup Playwright (Optional)

```powershell
npm install -D @playwright/test
npx playwright install
```

### Basic E2E Test

```typescript
import { test, expect } from '@playwright/test';

test('user can create a campaign', async ({ page }) => {
  // Navigate to app
  await page.goto('http://localhost:5173');
  
  // Click create button
  await page.click('text=New Campaign');
  
  // Fill form
  await page.fill('[name="name"]', 'Test Campaign');
  await page.fill('[name="budget"]', '5000');
  
  // Submit
  await page.click('text=Create Campaign');
  
  // Check success
  await expect(page.locator('text=Campaign created')).toBeVisible();
});
```

---

## ✅ Best Practices

### 1. Use Data Factories

```typescript
// Good: Create factory for reusable mock data
export const createMockCampaign = (overrides = {}) => ({
  ...mockCampaign,
  ...overrides
});

// Usage
const activeCampaign = createMockCampaign({ status: 'active' });
const draftCampaign = createMockCampaign({ status: 'draft' });
```

### 2. Use Descriptive Test Names

```typescript
✅ it('shows error message when budget is negative', ...)
❌ it('test budget', ...)
```

### 3. Arrange-Act-Assert Pattern

```typescript
it('updates campaign when form is submitted', async () => {
  // Arrange
  const mockUpdate = vi.fn();
  render(<CampaignForm onUpdate={mockUpdate} />);
  
  // Act
  await userEvent.type(screen.getByLabelText('Name'), 'New Name');
  await userEvent.click(screen.getByText('Save'));
  
  // Assert
  expect(mockUpdate).toHaveBeenCalledWith({ name: 'New Name' });
});
```

### 4. Test Accessibility

```typescript
it('has proper aria labels', () => {
  render(<CampaignCard campaign={mockCampaign} />);
  
  expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
});
```

### 5. Clean Up After Tests

```typescript
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
});
```

### 6. Mock External Dependencies

```typescript
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({ data: mockCampaigns, error: null })
    })
  }
}));
```

---

## 🐛 Troubleshooting

### Common Issues

#### Issue: Tests timeout

```typescript
// Solution: Increase timeout
test('slow test', async () => {
  // test code
}, 10000); // 10 second timeout
```

#### Issue: Element not found

```typescript
// Solution: Use waitFor
await waitFor(() => {
  expect(screen.getByText('Loading...')).not.toBeInTheDocument();
});
```

#### Issue: Mock not working

```typescript
// Solution: Reset mocks in setup
afterEach(() => {
  server.resetHandlers();
  vi.clearAllMocks();
});
```

#### Issue: Act warnings

```typescript
// Solution: Wrap state updates in act()
import { act } from '@testing-library/react';

await act(async () => {
  result.current.refresh();
});
```

---

## 📊 Coverage Goals

- **Overall**: 80%+
- **Components**: 85%+
- **Hooks**: 90%+
- **Services**: 95%+
- **Utils**: 100%

### Check Coverage

```powershell
npm run test:coverage
```

### View Coverage Report

```powershell
# Opens HTML report in browser
start coverage/index.html
```

---

## 🎯 Testing Checklist

### Component Tests
- ✅ Renders without crashing
- ✅ Displays correct data
- ✅ Handles user interactions
- ✅ Shows/hides conditional elements
- ✅ Handles loading states
- ✅ Handles error states
- ✅ Validates form inputs
- ✅ Calls callbacks correctly

### Hook Tests
- ✅ Fetches data successfully
- ✅ Handles loading state
- ✅ Handles error state
- ✅ Refetches on demand
- ✅ Updates state correctly
- ✅ Cleans up on unmount

### Service Tests
- ✅ Calls API correctly
- ✅ Transforms data properly
- ✅ Handles errors gracefully
- ✅ Validates inputs
- ✅ Returns correct types

---

## 📚 Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [MSW Documentation](https://mswjs.io/)
- [Playwright Documentation](https://playwright.dev/)

---

## 🎉 Next Steps

1. **Run Setup**
   ```powershell
   npm install -D vitest @vitest/ui @testing-library/react @testing-library/jest-dom @testing-library/user-event msw happy-dom
   ```

2. **Run Tests**
   ```powershell
   npm test
   ```

3. **Write More Tests**
   - Cover all critical user flows
   - Test edge cases
   - Aim for 80%+ coverage

4. **Set Up CI/CD**
   - Run tests on every PR
   - Block merge if tests fail
   - Generate coverage reports

---

**Happy Testing! 🧪**
