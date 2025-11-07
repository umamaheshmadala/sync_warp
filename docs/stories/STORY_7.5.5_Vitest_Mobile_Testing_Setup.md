# Story 7.5.5: Vitest Mobile Testing Setup ⚪ PLANNED

**Feature:** Mobile App Setup & Deployment  
**Epic:** 7. Cross-Platform Mobile App (iOS & Android)  
**Story ID:** 7.5.5  
**Branch:** `mobile-app-setup`

---

## 📋 Overview

Configure Vitest for comprehensive unit and integration testing of the mobile app, including Capacitor plugin mocks, mobile viewport simulation, and testing utilities specifically tailored for mobile features like camera, geolocation, and push notifications.

---

## 🎯 Acceptance Criteria

- [ ] Vitest configured with mobile-specific settings
- [ ] Capacitor plugins mocked for all native features
- [ ] Test setup file created with global mocks
- [ ] Mobile viewport simulation implemented
- [ ] Testing utilities created for common mobile scenarios
- [ ] Sample tests written for key mobile features
- [ ] Test coverage reports configured
- [ ] CI/CD integration for automated testing
- [ ] Documentation created for writing mobile tests
- [ ] All tests passing with good coverage (>80%)

---

## 🛠️ Implementation Steps

### **Step 1: Install Vitest Dependencies**

```bash
npm install -D vitest @vitest/ui @vitest/coverage-v8
npm install -D @testing-library/react @testing-library/jest-dom @testing-library/user-event
npm install -D jsdom happy-dom
npm install -D @types/testing-library__jest-dom
```

---

### **Step 2: Configure Vitest**

#### **File:** `vitest.config.ts`

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'dist', 'ios', 'android', 'e2e'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData/',
        'dist/',
      ],
      lines: 80,
      functions: 80,
      branches: 80,
      statements: 80,
    },
    mockReset: true,
    restoreMocks: true,
    clearMocks: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@test': path.resolve(__dirname, './src/test'),
    },
  },
});
```

---

### **Step 3: Create Test Setup File**

#### **File:** `src/test/setup.ts`

```typescript
import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers);

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
  takeRecords() {
    return [];
  }
} as any;

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
} as any;

// Set up mobile viewport dimensions
Object.defineProperty(window, 'innerWidth', {
  writable: true,
  configurable: true,
  value: 375, // iPhone SE width
});

Object.defineProperty(window, 'innerHeight', {
  writable: true,
  configurable: true,
  value: 667, // iPhone SE height
});

// Mock touch events
window.ontouchstart = vi.fn();
window.ontouchmove = vi.fn();
window.ontouchend = vi.fn();

// Console suppression for tests (optional)
global.console = {
  ...console,
  error: vi.fn(),
  warn: vi.fn(),
};
```

---

### **Step 4: Create Capacitor Mocks**

#### **File:** `src/test/mocks/capacitor.ts`

```typescript
import { vi } from 'vitest';

// Mock Capacitor Core
export const mockCapacitor = {
  getPlatform: vi.fn(() => 'web'),
  isNativePlatform: vi.fn(() => false),
  isPluginAvailable: vi.fn(() => true),
  convertFileSrc: vi.fn((path: string) => path),
};

// Mock Camera Plugin
export const mockCamera = {
  getPhoto: vi.fn(() =>
    Promise.resolve({
      webPath: 'data:image/jpeg;base64,mockImageData',
      format: 'jpeg',
      saved: false,
    })
  ),
  checkPermissions: vi.fn(() =>
    Promise.resolve({
      camera: 'granted',
      photos: 'granted',
    })
  ),
  requestPermissions: vi.fn(() =>
    Promise.resolve({
      camera: 'granted',
      photos: 'granted',
    })
  ),
};

// Mock Geolocation Plugin
export const mockGeolocation = {
  getCurrentPosition: vi.fn(() =>
    Promise.resolve({
      coords: {
        latitude: 37.7749,
        longitude: -122.4194,
        accuracy: 10,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
      },
      timestamp: Date.now(),
    })
  ),
  watchPosition: vi.fn(() => Promise.resolve('mock-watch-id')),
  clearWatch: vi.fn(() => Promise.resolve()),
  checkPermissions: vi.fn(() =>
    Promise.resolve({
      location: 'granted',
      coarseLocation: 'granted',
    })
  ),
  requestPermissions: vi.fn(() =>
    Promise.resolve({
      location: 'granted',
      coarseLocation: 'granted',
    })
  ),
};

// Mock Push Notifications Plugin
export const mockPushNotifications = {
  register: vi.fn(() => Promise.resolve()),
  checkPermissions: vi.fn(() =>
    Promise.resolve({
      receive: 'granted',
    })
  ),
  requestPermissions: vi.fn(() =>
    Promise.resolve({
      receive: 'granted',
    })
  ),
  addListener: vi.fn(() => ({
    remove: vi.fn(),
  })),
  removeAllListeners: vi.fn(() => Promise.resolve()),
};

// Mock App Plugin
export const mockApp = {
  getInfo: vi.fn(() =>
    Promise.resolve({
      name: 'SyncWarp Dev',
      id: 'com.syncwarp.app.dev',
      build: '1',
      version: '1.0.0',
    })
  ),
  getState: vi.fn(() =>
    Promise.resolve({
      isActive: true,
    })
  ),
  addListener: vi.fn(() => ({
    remove: vi.fn(),
  })),
  removeAllListeners: vi.fn(() => Promise.resolve()),
};

// Mock Device Plugin
export const mockDevice = {
  getInfo: vi.fn(() =>
    Promise.resolve({
      model: 'iPhone 14 Pro',
      platform: 'ios',
      operatingSystem: 'ios',
      osVersion: '17.0',
      manufacturer: 'Apple',
      isVirtual: false,
      webViewVersion: '17.0',
    })
  ),
  getBatteryInfo: vi.fn(() =>
    Promise.resolve({
      batteryLevel: 0.85,
      isCharging: false,
    })
  ),
};

// Mock Network Plugin
export const mockNetwork = {
  getStatus: vi.fn(() =>
    Promise.resolve({
      connected: true,
      connectionType: 'wifi',
    })
  ),
  addListener: vi.fn(() => ({
    remove: vi.fn(),
  })),
  removeAllListeners: vi.fn(() => Promise.resolve()),
};

// Mock Preferences (Storage) Plugin
export const mockPreferences = {
  get: vi.fn(({ key }: { key: string }) =>
    Promise.resolve({
      value: null,
    })
  ),
  set: vi.fn(() => Promise.resolve()),
  remove: vi.fn(() => Promise.resolve()),
  clear: vi.fn(() => Promise.resolve()),
  keys: vi.fn(() => Promise.resolve({ keys: [] })),
};

// Mock Haptics Plugin
export const mockHaptics = {
  impact: vi.fn(() => Promise.resolve()),
  notification: vi.fn(() => Promise.resolve()),
  vibrate: vi.fn(() => Promise.resolve()),
  selectionStart: vi.fn(() => Promise.resolve()),
  selectionChanged: vi.fn(() => Promise.resolve()),
  selectionEnd: vi.fn(() => Promise.resolve()),
};

// Export all mocks
export const capacitorMocks = {
  Capacitor: mockCapacitor,
  Camera: mockCamera,
  Geolocation: mockGeolocation,
  PushNotifications: mockPushNotifications,
  App: mockApp,
  Device: mockDevice,
  Network: mockNetwork,
  Preferences: mockPreferences,
  Haptics: mockHaptics,
};
```

---

### **Step 5: Create Mock Setup**

#### **File:** `src/test/mocks/setup.ts`

```typescript
import { vi } from 'vitest';
import { capacitorMocks } from './capacitor';

// Mock Capacitor modules
vi.mock('@capacitor/core', () => ({
  Capacitor: capacitorMocks.Capacitor,
}));

vi.mock('@capacitor/camera', () => ({
  Camera: capacitorMocks.Camera,
}));

vi.mock('@capacitor/geolocation', () => ({
  Geolocation: capacitorMocks.Geolocation,
}));

vi.mock('@capacitor/push-notifications', () => ({
  PushNotifications: capacitorMocks.PushNotifications,
}));

vi.mock('@capacitor/app', () => ({
  App: capacitorMocks.App,
}));

vi.mock('@capacitor/device', () => ({
  Device: capacitorMocks.Device,
}));

vi.mock('@capacitor/network', () => ({
  Network: capacitorMocks.Network,
}));

vi.mock('@capacitor/preferences', () => ({
  Preferences: capacitorMocks.Preferences,
}));

vi.mock('@capacitor/haptics', () => ({
  Haptics: capacitorMocks.Haptics,
}));

export { capacitorMocks };
```

---

### **Step 6: Create Test Utilities**

#### **File:** `src/test/utils/mobile.ts`

```typescript
import { vi } from 'vitest';

/**
 * Simulate mobile viewport size
 */
export function setMobileViewport(width: number = 375, height: number = 667) {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });

  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: height,
  });

  // Trigger resize event
  window.dispatchEvent(new Event('resize'));
}

/**
 * Simulate tablet viewport
 */
export function setTabletViewport() {
  setMobileViewport(768, 1024);
}

/**
 * Simulate iOS platform
 */
export function mockIOSPlatform() {
  vi.mocked(window.navigator).platform = 'iPhone';
  vi.mocked(window.navigator).userAgent =
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)';
}

/**
 * Simulate Android platform
 */
export function mockAndroidPlatform() {
  vi.mocked(window.navigator).platform = 'Linux armv8l';
  vi.mocked(window.navigator).userAgent =
    'Mozilla/5.0 (Linux; Android 13; Pixel 5)';
}

/**
 * Simulate touch event
 */
export function createTouchEvent(
  type: 'touchstart' | 'touchmove' | 'touchend',
  touches: { clientX: number; clientY: number }[]
) {
  return new TouchEvent(type, {
    bubbles: true,
    cancelable: true,
    touches: touches.map(
      (touch) =>
        ({
          clientX: touch.clientX,
          clientY: touch.clientY,
          screenX: touch.clientX,
          screenY: touch.clientY,
          pageX: touch.clientX,
          pageY: touch.clientY,
        }) as Touch
    ) as any,
  });
}

/**
 * Simulate network status change
 */
export function mockNetworkStatus(connected: boolean, type: string = 'wifi') {
  const mockNetwork = {
    getStatus: vi.fn(() =>
      Promise.resolve({
        connected,
        connectionType: type,
      })
    ),
  };

  return mockNetwork;
}

/**
 * Simulate app state change (background/foreground)
 */
export function mockAppState(isActive: boolean) {
  const mockApp = {
    getState: vi.fn(() =>
      Promise.resolve({
        isActive,
      })
    ),
  };

  return mockApp;
}

/**
 * Wait for async operations
 */
export function waitFor(ms: number = 0) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
```

---

### **Step 7: Create Sample Tests**

#### **File:** `src/utils/__tests__/permissions.test.ts`

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { requestCameraPermission, requestLocationPermission } from '../permissions';
import { mockCamera, mockGeolocation } from '@test/mocks/capacitor';

// Import mock setup
import '@test/mocks/setup';

describe('Permission Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('requestCameraPermission', () => {
    it('should return granted when permission is already granted', async () => {
      mockCamera.checkPermissions.mockResolvedValueOnce({
        camera: 'granted',
        photos: 'granted',
      });

      const result = await requestCameraPermission();

      expect(result.granted).toBe(true);
      expect(mockCamera.checkPermissions).toHaveBeenCalled();
    });

    it('should request permission when not granted', async () => {
      mockCamera.checkPermissions.mockResolvedValueOnce({
        camera: 'prompt',
        photos: 'prompt',
      });

      mockCamera.requestPermissions.mockResolvedValueOnce({
        camera: 'granted',
        photos: 'granted',
      });

      const result = await requestCameraPermission();

      expect(result.granted).toBe(true);
      expect(mockCamera.requestPermissions).toHaveBeenCalled();
    });

    it('should return denied with message when permission is denied', async () => {
      mockCamera.checkPermissions.mockResolvedValueOnce({
        camera: 'prompt',
        photos: 'prompt',
      });

      mockCamera.requestPermissions.mockResolvedValueOnce({
        camera: 'denied',
        photos: 'denied',
      });

      const result = await requestCameraPermission();

      expect(result.granted).toBe(false);
      expect(result.message).toContain('Camera access is required');
    });

    it('should handle errors gracefully', async () => {
      mockCamera.checkPermissions.mockRejectedValueOnce(
        new Error('Permission check failed')
      );

      const result = await requestCameraPermission();

      expect(result.granted).toBe(false);
      expect(result.message).toContain('Unable to request camera permission');
    });
  });

  describe('requestLocationPermission', () => {
    it('should return granted when location permission is granted', async () => {
      mockGeolocation.checkPermissions.mockResolvedValueOnce({
        location: 'granted',
        coarseLocation: 'granted',
      });

      const result = await requestLocationPermission();

      expect(result.granted).toBe(true);
    });

    it('should request location permission', async () => {
      mockGeolocation.checkPermissions.mockResolvedValueOnce({
        location: 'prompt',
        coarseLocation: 'prompt',
      });

      mockGeolocation.requestPermissions.mockResolvedValueOnce({
        location: 'granted',
        coarseLocation: 'granted',
      });

      const result = await requestLocationPermission();

      expect(result.granted).toBe(true);
      expect(mockGeolocation.requestPermissions).toHaveBeenCalled();
    });
  });
});
```

#### **File:** `src/components/__tests__/PermissionPrompt.test.tsx`

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PermissionPrompt from '../PermissionPrompt';
import { openAppSettings } from '../../utils/permissions';

vi.mock('../../utils/permissions', () => ({
  openAppSettings: vi.fn(),
}));

describe('PermissionPrompt', () => {
  it('should render permission message', () => {
    render(<PermissionPrompt message="Camera access is required" />);

    expect(screen.getByText('Permission Required')).toBeInTheDocument();
    expect(screen.getByText('Camera access is required')).toBeInTheDocument();
  });

  it('should show retry button when onRetry is provided', () => {
    const onRetry = vi.fn();

    render(<PermissionPrompt message="Test message" onRetry={onRetry} />);

    const retryButton = screen.getByText('Retry');
    expect(retryButton).toBeInTheDocument();

    fireEvent.click(retryButton);
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('should call openAppSettings when Settings button is clicked', () => {
    render(<PermissionPrompt message="Test message" />);

    const settingsButton = screen.getByText('Settings');
    fireEvent.click(settingsButton);

    expect(openAppSettings).toHaveBeenCalledOnce();
  });

  it('should not show retry button when onRetry is not provided', () => {
    render(<PermissionPrompt message="Test message" />);

    expect(screen.queryByText('Retry')).not.toBeInTheDocument();
  });
});
```

---

### **Step 8: Update Package.json Scripts**

**File:** `package.json`

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage",
    "test:watch": "vitest --watch"
  }
}
```

---

### **Step 9: Configure GitHub Actions for Testing**

#### **File:** `.github/workflows/test.yml`

```yaml
name: Run Tests

on:
  push:
    branches:
      - main
      - develop
      - mobile-app-setup
  pull_request:
    branches:
      - main
      - develop

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm run test:run

      - name: Generate coverage report
        run: npm run test:coverage

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
          flags: unittests
          name: codecov-umbrella

      - name: Comment coverage on PR
        if: github.event_name == 'pull_request'
        uses: romeovs/lcov-reporter-action@v0.3.1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          lcov-file: ./coverage/lcov.info
```

---

### **Step 10: Create Testing Documentation**

#### **File:** `docs/testing-guide.md`

```markdown
# Mobile Testing Guide

## Overview
SyncWarp uses Vitest for unit and integration testing with comprehensive mocks for Capacitor plugins and mobile-specific features.

## Running Tests

### Basic Commands
```bash
npm test              # Run tests in watch mode
npm run test:run      # Run tests once
npm run test:ui       # Open Vitest UI
npm run test:coverage # Generate coverage report
```

## Writing Tests

### Test File Structure
```
src/
├── components/
│   ├── Button.tsx
│   └── __tests__/
│       └── Button.test.tsx
├── utils/
│   ├── permissions.ts
│   └── __tests__/
│       └── permissions.test.ts
└── test/
    ├── setup.ts
    ├── mocks/
    │   ├── capacitor.ts
    │   └── setup.ts
    └── utils/
        └── mobile.ts
```

### Basic Test Example
```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import MyComponent from '../MyComponent';

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

### Testing with Capacitor Mocks
```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockCamera } from '@test/mocks/capacitor';
import { takePicture } from '../camera';

describe('Camera Functionality', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should take a photo', async () => {
    mockCamera.getPhoto.mockResolvedValueOnce({
      webPath: 'mock-photo.jpg',
      format: 'jpeg',
    });

    const photo = await takePicture();
    
    expect(mockCamera.getPhoto).toHaveBeenCalled();
    expect(photo.webPath).toBe('mock-photo.jpg');
  });
});
```

### Testing Mobile Viewport
```typescript
import { setMobileViewport, setTabletViewport } from '@test/utils/mobile';

describe('Responsive Component', () => {
  it('should render mobile layout', () => {
    setMobileViewport(375, 667);
    render(<ResponsiveComponent />);
    expect(screen.getByTestId('mobile-view')).toBeInTheDocument();
  });

  it('should render tablet layout', () => {
    setTabletViewport();
    render(<ResponsiveComponent />);
    expect(screen.getByTestId('tablet-view')).toBeInTheDocument();
  });
});
```

### Testing User Interactions
```typescript
import { fireEvent } from '@testing-library/react';

it('should handle button click', () => {
  const handleClick = vi.fn();
  render(<Button onClick={handleClick}>Click me</Button>);
  
  const button = screen.getByText('Click me');
  fireEvent.click(button);
  
  expect(handleClick).toHaveBeenCalledOnce();
});
```

## Coverage Requirements

- **Minimum Coverage:** 80% for lines, functions, branches, and statements
- **Coverage Reports:** Available in `coverage/` directory
- **View Coverage:** Open `coverage/index.html` in browser

## Best Practices

1. ✅ Write tests alongside your code
2. ✅ Mock external dependencies (APIs, Capacitor plugins)
3. ✅ Test user interactions and edge cases
4. ✅ Keep tests focused and isolated
5. ✅ Use descriptive test names
6. ✅ Avoid testing implementation details
7. ✅ Test accessibility (aria labels, roles)

## Common Patterns

### Testing Async Operations
```typescript
it('should fetch data', async () => {
  const { result } = renderHook(() => useData());
  
  await waitFor(() => {
    expect(result.current.loading).toBe(false);
  });
  
  expect(result.current.data).toBeDefined();
});
```

### Testing Error States
```typescript
it('should handle errors', async () => {
  mockApi.getData.mockRejectedValueOnce(new Error('Failed'));
  
  render(<DataComponent />);
  
  await waitFor(() => {
    expect(screen.getByText('Error loading data')).toBeInTheDocument();
  });
});
```

### Testing Forms
```typescript
it('should submit form', async () => {
  const handleSubmit = vi.fn();
  render(<Form onSubmit={handleSubmit} />);
  
  fireEvent.change(screen.getByLabelText('Name'), {
    target: { value: 'John Doe' },
  });
  
  fireEvent.click(screen.getByText('Submit'));
  
  await waitFor(() => {
    expect(handleSubmit).toHaveBeenCalledWith({ name: 'John Doe' });
  });
});
```

## Troubleshooting

### Tests Failing
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`
- Clear Vitest cache: `npx vitest --clearCache`
- Check mock implementations are correct

### Coverage Not Generated
- Ensure all test files match the pattern `**/*.{test,spec}.{ts,tsx}`
- Check vitest.config.ts coverage settings
- Run `npm run test:coverage` explicitly

### Slow Tests
- Use `vi.mock()` to avoid real API calls
- Mock heavy dependencies
- Run specific test files: `npm test -- Button.test.tsx`
```

---

## 🧪 Testing Steps

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Run all tests:**
   ```bash
   npm test
   ```

3. **Generate coverage report:**
   ```bash
   npm run test:coverage
   ```

4. **Open coverage report:**
   ```bash
   # Windows
   start coverage/index.html
   
   # macOS
   open coverage/index.html
   
   # Linux
   xdg-open coverage/index.html
   ```

5. **Run Vitest UI:**
   ```bash
   npm run test:ui
   ```

6. **Verify all sample tests pass:**
   - Permission tests
   - Component tests
   - Mobile viewport tests

---

## 📚 Additional Files to Create

### **File:** `src/test/mocks/mockData.ts`

```typescript
export const mockUser = {
  id: '123',
  email: 'test@example.com',
  name: 'Test User',
  avatar: 'https://example.com/avatar.jpg',
};

export const mockPost = {
  id: '1',
  userId: '123',
  content: 'Test post content',
  createdAt: '2024-01-01T00:00:00Z',
  likes: 10,
  comments: 5,
};

export const mockLocation = {
  coords: {
    latitude: 37.7749,
    longitude: -122.4194,
    accuracy: 10,
    altitude: null,
    altitudeAccuracy: null,
    heading: null,
    speed: null,
  },
  timestamp: Date.now(),
};
```

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| "Cannot find module '@test/mocks'" | Check tsconfig.json paths alias configuration |
| Tests hang indefinitely | Check for unresolved promises, add timeout to async tests |
| Mocks not working | Ensure mock setup is imported before the code under test |
| Coverage below threshold | Add tests for uncovered code or adjust thresholds |
| "window is not defined" | Ensure vitest.config.ts has `environment: 'jsdom'` |
| Touch events not working | Use createTouchEvent utility from test/utils/mobile.ts |

---

## 📝 Git Commit

```bash
# Ensure you're on the mobile-app-setup branch
git checkout mobile-app-setup

# Stage test configuration files
git add vitest.config.ts
git add src/test/setup.ts
git add src/test/mocks/
git add src/test/utils/
git add src/utils/__tests__/
git add src/components/__tests__/
git add .github/workflows/test.yml
git add docs/testing-guide.md
git add package.json

# Commit with descriptive message
git commit -m "feat: configure Vitest for mobile testing

- Set up Vitest with jsdom environment
- Create Capacitor plugin mocks (Camera, Geolocation, etc.)
- Add test setup file with global mocks
- Create mobile testing utilities (viewport, touch events)
- Write sample tests for permissions and components
- Configure coverage reporting (80% threshold)
- Add GitHub Actions workflow for CI/CD testing
- Document testing patterns and best practices

Story: 7.5.5
Status: Completed"

# Push to remote
git push origin mobile-app-setup
```

---

## ✅ Definition of Done

- [x] Vitest configured with mobile-specific settings
- [x] All Capacitor plugins mocked
- [x] Test setup file created
- [x] Mobile viewport simulation utilities created
- [x] Testing utilities implemented
- [x] Sample tests written and passing
- [x] Coverage reporting configured (80% threshold)
- [x] CI/CD pipeline integrated
- [x] Mock data helpers created
- [x] Comprehensive documentation written
- [x] Code committed to `mobile-app-setup` branch
- [x] Story marked as completed in project tracker

---

**Story Status:** ✅ Ready for Implementation  
**Estimated Time:** 5-7 hours  
**Dependencies:** None (can run parallel with other stories)  
**Next Story:** 7.5.6 (Playwright Mobile Device Testing)
