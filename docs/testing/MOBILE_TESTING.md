# Mobile Testing Guide

Complete guide to unit testing mobile-specific code with Vitest, including Capacitor plugin mocks and mobile-specific test scenarios.

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Setup](#setup)
3. [Running Tests](#running-tests)
4. [Capacitor Mocks](#capacitor-mocks)
5. [Writing Mobile Tests](#writing-mobile-tests)
6. [Test Examples](#test-examples)
7. [Best Practices](#best-practices)
8. [Troubleshooting](#troubleshooting)

---

## Overview

### What's Included

✅ **Vitest Configuration** - Optimized for mobile testing with jsdom  
✅ **Capacitor Plugin Mocks** - All core and custom plugins mocked  
✅ **Mobile Viewport Simulation** - Test responsive mobile layouts  
✅ **React Hooks Testing** - Test custom hooks that use Capacitor  
✅ **Sample Tests** - Complete test suite for `useNotificationHandler`  

### Testing Stack

- **Test Runner**: Vitest 0.34.6
- **Test Environment**: jsdom (simulates browser DOM)
- **React Testing**: @testing-library/react
- **Mocking**: Vitest vi mocks
- **Coverage**: v8 provider

---

## Setup

### Prerequisites

```bash
# Install dependencies (should already be installed)
npm install
```

### Configuration Files

#### 1. `vitest.config.ts`

Already configured with:
- jsdom environment
- Setup files reference
- Coverage settings
- Path aliases

#### 2. `src/test/setup.ts`

Global test setup with:
- Capacitor mocks
- Window APIs mocks
- Mobile viewport simulation
- MSW server (for API mocking)

---

## Running Tests

### NPM Scripts

```bash
# Run all tests (watch mode)
npm run test:mobile:watch

# Run tests once
npm run test:mobile:unit

# Run tests with UI
npm run test:mobile:ui

# Run pre-build checks (tests + type-check + lint)
npm run test:mobile:pre-build

# Run with coverage
npm run test:coverage
```

### Vitest CLI Options

```bash
# Run specific test file
npx vitest src/hooks/useNotificationHandler.test.ts

# Run tests matching pattern
npx vitest --grep "Foreground Notifications"

# Run tests in watch mode with filter
npx vitest --watch src/hooks/

# Generate coverage report
npx vitest run --coverage
```

---

## Capacitor Mocks

### Available Mocks

All Capacitor plugins are automatically mocked in `src/test/setup.ts`:

#### `@capacitor/core`

```typescript
Capacitor: {
  isNativePlatform: () => false,
  getPlatform: () => 'web',
  isPluginAvailable: () => false,
  convertFileSrc: (path: string) => path,
}
```

#### `@capacitor/preferences`

```typescript
Preferences: {
  get: vi.fn().mockResolvedValue({ value: null }),
  set: vi.fn().mockResolvedValue(undefined),
  remove: vi.fn().mockResolvedValue(undefined),
  clear: vi.fn().mockResolvedValue(undefined),
  keys: vi.fn().mockResolvedValue({ keys: [] }),
}
```

#### `@capacitor/push-notifications`

```typescript
PushNotifications: {
  requestPermissions: vi.fn().mockResolvedValue({ receive: 'granted' }),
  register: vi.fn().mockResolvedValue(undefined),
  addListener: vi.fn((eventName, callback) => ({
    remove: vi.fn(),
  })),
  removeAllListeners: vi.fn().mockResolvedValue(undefined),
  // ... and more
}
```

#### `@capacitor/network`

```typescript
Network: {
  getStatus: vi.fn().mockResolvedValue({
    connected: true,
    connectionType: 'wifi',
  }),
  addListener: vi.fn((eventName, callback) => ({
    remove: vi.fn(),
  })),
}
```

### Mobile Viewport Mock

```typescript
window.matchMedia = vi.fn().mockImplementation(query => ({
  matches: query === '(max-width: 768px)', // Simulates mobile
  media: query,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
}))
```

---

## Writing Mobile Tests

### Testing React Hooks

#### Basic Hook Test Structure

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { YourHook } from './YourHook'
import { Capacitor } from '@capacitor/core'

describe('YourHook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should work on native platform', () => {
    // Mock native platform
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true)
    
    const { result } = renderHook(() => YourHook())
    
    expect(result.current).toBeDefined()
  })

  it('should skip on web platform', () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false)
    
    const { result } = renderHook(() => YourHook())
    
    // Assert web-specific behavior
  })
})
```

### Testing Capacitor Plugin Usage

#### Testing Push Notifications

```typescript
import { PushNotifications } from '@capacitor/push-notifications'

it('should register for push notifications', async () => {
  vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true)
  
  // Mock successful registration
  vi.mocked(PushNotifications.register).mockResolvedValue(undefined)
  
  const { result } = renderHook(() => useYourHook())
  
  await act(async () => {
    await result.current.registerPush()
  })
  
  expect(PushNotifications.register).toHaveBeenCalled()
})
```

#### Testing Event Listeners

```typescript
it('should add and remove listeners', () => {
  let callback: any
  
  // Capture the callback
  vi.mocked(PushNotifications.addListener).mockImplementation((event, cb) => {
    callback = cb
    return { remove: vi.fn() }
  })
  
  const { unmount } = renderHook(() => useYourHook())
  
  // Simulate event
  act(() => {
    callback({ data: 'test' })
  })
  
  // Verify cleanup
  unmount()
  expect(PushNotifications.addListener).toHaveBeenCalled()
})
```

### Testing with React Router

```typescript
import * as ReactRouter from 'react-router-dom'

vi.mock('react-router-dom', () => ({
  useNavigate: vi.fn(),
}))

it('should navigate on action', () => {
  const mockNavigate = vi.fn()
  vi.mocked(ReactRouter.useNavigate).mockReturnValue(mockNavigate)
  
  const { result } = renderHook(() => useYourHook())
  
  act(() => {
    result.current.handleAction()
  })
  
  expect(mockNavigate).toHaveBeenCalledWith('/expected-route')
})
```

---

## Test Examples

### Example 1: Testing Platform Detection

```typescript
import { Capacitor } from '@capacitor/core'

describe('Platform Detection', () => {
  it('should detect native platform', () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true)
    vi.mocked(Capacitor.getPlatform).mockReturnValue('android')
    
    const platform = Capacitor.getPlatform()
    
    expect(platform).toBe('android')
    expect(Capacitor.isNativePlatform()).toBe(true)
  })

  it('should detect web platform', () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false)
    vi.mocked(Capacitor.getPlatform).mockReturnValue('web')
    
    expect(Capacitor.getPlatform()).toBe('web')
  })
})
```

### Example 2: Testing Preferences Storage

```typescript
import { Preferences } from '@capacitor/preferences'

describe('Storage Hook', () => {
  it('should save data to preferences', async () => {
    vi.mocked(Preferences.set).mockResolvedValue(undefined)
    
    const { result } = renderHook(() => useStorage())
    
    await act(async () => {
      await result.current.save('key', 'value')
    })
    
    expect(Preferences.set).toHaveBeenCalledWith({
      key: 'key',
      value: 'value',
    })
  })

  it('should retrieve data from preferences', async () => {
    vi.mocked(Preferences.get).mockResolvedValue({ value: 'stored-value' })
    
    const { result } = renderHook(() => useStorage())
    
    await act(async () => {
      const value = await result.current.get('key')
      expect(value).toBe('stored-value')
    })
  })
})
```

### Example 3: Testing Network Status

```typescript
import { Network } from '@capacitor/network'

describe('Network Status Hook', () => {
  it('should detect online status', async () => {
    vi.mocked(Network.getStatus).mockResolvedValue({
      connected: true,
      connectionType: 'wifi',
    })
    
    const { result } = renderHook(() => useNetworkStatus())
    
    await waitFor(() => {
      expect(result.current.isOnline).toBe(true)
      expect(result.current.connectionType).toBe('wifi')
    })
  })

  it('should detect offline status', async () => {
    vi.mocked(Network.getStatus).mockResolvedValue({
      connected: false,
      connectionType: 'none',
    })
    
    const { result } = renderHook(() => useNetworkStatus())
    
    await waitFor(() => {
      expect(result.current.isOnline).toBe(false)
    })
  })
})
```

### Example 4: Complete Hook Test (useNotificationHandler)

See `src/hooks/useNotificationHandler.test.ts` for a comprehensive example covering:
- ✅ Initialization and cleanup
- ✅ Foreground notifications
- ✅ Background/killed state notifications
- ✅ Toast interactions
- ✅ Error handling
- ✅ All notification types
- ✅ 21 test cases total

---

## Best Practices

### 1. Clear Mocks Between Tests

```typescript
beforeEach(() => {
  vi.clearAllMocks()
})
```

### 2. Test Both Native and Web Platforms

```typescript
describe('Cross-Platform', () => {
  it('should work on native', () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true)
    // Test native behavior
  })

  it('should work on web', () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false)
    // Test web fallback
  })
})
```

### 3. Test Error Scenarios

```typescript
it('should handle errors gracefully', async () => {
  vi.mocked(SomePlugin.method).mockRejectedValue(new Error('Failed'))
  
  const { result } = renderHook(() => useYourHook())
  
  await expect(result.current.action()).rejects.toThrow('Failed')
})
```

### 4. Test Cleanup

```typescript
it('should cleanup on unmount', () => {
  const removeFn = vi.fn()
  vi.mocked(Plugin.addListener).mockReturnValue({ remove: removeFn })
  
  const { unmount } = renderHook(() => useYourHook())
  
  unmount()
  
  expect(removeFn).toHaveBeenCalled()
})
```

### 5. Use Descriptive Test Names

```typescript
// ✅ Good
it('should navigate to business page when business notification is tapped')

// ❌ Bad
it('should work')
```

### 6. Group Related Tests

```typescript
describe('UserHook', () => {
  describe('Initialization', () => {
    // Initialization tests
  })

  describe('User Actions', () => {
    // Action tests
  })

  describe('Error Handling', () => {
    // Error tests
  })
})
```

### 7. Test Edge Cases

```typescript
it('should handle missing data', () => {
  // Test with null/undefined
})

it('should handle empty arrays', () => {
  // Test with []
})

it('should handle malformed data', () => {
  // Test with invalid structure
})
```

---

## Troubleshooting

### Issue: Tests Fail with "Cannot read property of undefined"

**Problem**: Trying to access a mock that hasn't been set up

**Solution**:
```typescript
beforeEach(() => {
  vi.mocked(YourPlugin.method).mockResolvedValue(defaultValue)
})
```

### Issue: "ReferenceError: Capacitor is not defined"

**Problem**: Capacitor mocks not loaded

**Solution**:
- Ensure `setupFiles: ['./src/test/setup.ts']` is in `vitest.config.ts`
- Check that `src/test/setup.ts` exists and has Capacitor mocks

### Issue: Async Tests Timeout

**Problem**: Async operations not completing

**Solution**:
```typescript
import { waitFor } from '@testing-library/react'

it('should complete async operation', async () => {
  const { result } = renderHook(() => useAsync Hook())
  
  await waitFor(() => {
    expect(result.current.data).toBeDefined()
  }, { timeout: 5000 })
})
```

### Issue: Tests Pass Locally but Fail in CI

**Problem**: Environment differences

**Solution**:
- Use `vi.clearAllMocks()` in `beforeEach`
- Don't rely on test execution order
- Mock all external dependencies
- Set explicit timeouts

### Issue: Mock Not Being Called

**Problem**: Wrong function is being called

**Solution**:
```typescript
// Verify the mock is set up correctly
console.log(vi.isMockFunction(YourPlugin.method)) // Should be true

// Check if mock was called
expect(YourPlugin.method).toHaveBeenCalled()
expect(YourPlugin.method).toHaveBeenCalledTimes(1)
expect(YourPlugin.method).toHaveBeenCalledWith(expectedArgs)
```

---

## Coverage Reports

### Generate Coverage

```bash
npm run test:coverage
```

### View Coverage Report

```bash
# Open HTML report
open coverage/index.html  # Mac
start coverage/index.html  # Windows
xdg-open coverage/index.html  # Linux
```

### Coverage Thresholds

Current thresholds (configured in `vitest.config.ts`):
- Lines: 60%
- Functions: 60%
- Branches: 60%
- Statements: 60%

### Excluding Files from Coverage

```typescript
// vitest.config.ts
coverage: {
  exclude: [
    'src/test/',
    '**/*.test.{ts,tsx}',
    '**/*.config.*',
  ]
}
```

---

## Continuous Integration

### GitHub Actions Example

```yaml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Node
        uses: actions/setup-node@v2
        with:
          node-version: '18'
          
      - name: Install Dependencies
        run: npm ci
        
      - name: Run Tests
        run: npm run test:mobile:unit
        
      - name: Generate Coverage
        run: npm run test:coverage
        
      - name: Upload Coverage
        uses: codecov/codecov-action@v2
        with:
          files: ./coverage/lcov.info
```

---

## Related Documentation

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library React](https://testing-library.com/docs/react-testing-library/intro/)
- [Capacitor Testing Guide](https://capacitorjs.com/docs/guides/automated-testing)
- [Environment Setup](./ENVIRONMENT_SETUP.md)

---

## ✅ Story 7.5.5 Checklist

- [✅] Vitest configured with jsdom
- [✅] Setup file created with Capacitor mocks
- [✅] All Capacitor plugins mocked
- [✅] Mobile viewport simulation
- [✅] Test scripts added to package.json
- [✅] Sample test created (useNotificationHandler)
- [✅] Comprehensive documentation

**Status**: ✅ COMPLETE

---

## Quick Reference

### Common Test Patterns

```typescript
// Test a hook
const { result } = renderHook(() => useYourHook())

// Update hook state
act(() => {
  result.current.action()
})

// Wait for async updates
await waitFor(() => {
  expect(result.current.data).toBeDefined()
})

// Unmount hook
const { unmount } = renderHook(() => useYourHook())
unmount()

// Mock a function
vi.mocked(SomeFunction).mockReturnValue('value')
vi.mocked(SomeFunction).mockResolvedValue('async value')
vi.mocked(SomeFunction).mockRejectedValue(new Error('error'))

// Verify function calls
expect(SomeFunction).toHaveBeenCalled()
expect(SomeFunction).toHaveBeenCalledWith(arg1, arg2)
expect(SomeFunction).toHaveBeenCalledTimes(2)
```

---

**Last Updated**: 2025-11-10  
**Story**: 7.5.5 - Vitest Mobile Testing Setup  
**Test Coverage**: 21 tests for useNotificationHandler (100% coverage)
