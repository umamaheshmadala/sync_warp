/**
 * Vitest Setup File
 * 
 * Global test setup and configuration
 */

import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeAll, afterAll, vi } from 'vitest';
import { setupServer } from 'msw/node';
import { handlers } from './mocks/handlers';
import * as matchers from '@testing-library/jest-dom/matchers';
import { expect } from 'vitest';
import { toHaveNoViolations } from 'jest-axe';

expect.extend(matchers);
expect.extend(toHaveNoViolations);

// Setup MSW server
export const server = setupServer(...handlers);

// Start server and suppress console errors before all tests
const originalError = console.error;
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'warn' });
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render') ||
        args[0].includes('Not implemented: HTMLFormElement.prototype.submit'))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

// Reset handlers and cleanup after each test
afterEach(() => {
  server.resetHandlers();
  cleanup();
});

// Close server and restore console after all tests
afterAll(() => {
  server.close();
  console.error = originalError;
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
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
  constructor() { }
  disconnect() { }
  observe() { }
  takeRecords() {
    return [];
  }
  unobserve() { }
} as any;

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() { }
  disconnect() { }
  observe() { }
  unobserve() { }
} as any;

// ============================================
// CAPACITOR MOCKS FOR MOBILE TESTING
// ============================================

// Mock @capacitor/core
vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => false,
    getPlatform: () => 'web',
    isPluginAvailable: () => false,
    convertFileSrc: (path: string) => path,
  },
  registerPlugin: () => ({}),
}));

// Mock @capacitor/preferences
vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: vi.fn().mockResolvedValue({ value: null }),
    set: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
    clear: vi.fn().mockResolvedValue(undefined),
    keys: vi.fn().mockResolvedValue({ keys: [] }),
    migrate: vi.fn().mockResolvedValue(undefined),
    removeOld: vi.fn().mockResolvedValue(undefined),
  },
}));

// Mock @capacitor/push-notifications
vi.mock('@capacitor/push-notifications', () => ({
  PushNotifications: {
    requestPermissions: vi.fn().mockResolvedValue({ receive: 'granted' }),
    register: vi.fn().mockResolvedValue(undefined),
    getDeliveredNotifications: vi.fn().mockResolvedValue({ notifications: [] }),
    removeDeliveredNotifications: vi.fn().mockResolvedValue(undefined),
    removeAllDeliveredNotifications: vi.fn().mockResolvedValue(undefined),
    createChannel: vi.fn().mockResolvedValue(undefined),
    deleteChannel: vi.fn().mockResolvedValue(undefined),
    listChannels: vi.fn().mockResolvedValue({ channels: [] }),
    checkPermissions: vi.fn().mockResolvedValue({ receive: 'granted' }),
    addListener: vi.fn((eventName, callback) => {
      return {
        remove: vi.fn(),
      };
    }),
    removeAllListeners: vi.fn().mockResolvedValue(undefined),
  },
}));

// Mock @capacitor/network
vi.mock('@capacitor/network', () => ({
  Network: {
    getStatus: vi.fn().mockResolvedValue({
      connected: true,
      connectionType: 'wifi',
    }),
    addListener: vi.fn((eventName, callback) => {
      return {
        remove: vi.fn(),
      };
    }),
    removeAllListeners: vi.fn().mockResolvedValue(undefined),
  },
}));

// Mock mobile viewport for testing responsive components
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: query === '(max-width: 768px)', // Simulate mobile viewport
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

