import { vi } from 'vitest';

/**
 * Test Helpers
 * Common utilities for testing
 */

/**
 * Wait for a specified time
 */
export function wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Create a deferred promise for testing async operations
 */
export function createDeferred<T>() {
    let resolve: (value: T) => void;
    let reject: (reason?: any) => void;

    const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
    });

    return {
        promise,
        resolve: resolve!,
        reject: reject!,
    };
}

/**
 * Mock console methods to suppress output during tests
 */
export function mockConsole() {
    const originalConsole = {
        log: console.log,
        error: console.error,
        warn: console.warn,
        info: console.info,
    };

    beforeEach(() => {
        console.log = vi.fn();
        console.error = vi.fn();
        console.warn = vi.fn();
        console.info = vi.fn();
    });

    afterEach(() => {
        console.log = originalConsole.log;
        console.error = originalConsole.error;
        console.warn = originalConsole.warn;
        console.info = originalConsole.info;
    });
}

/**
 * Assert that a function throws an error
 */
export async function expectToThrow(fn: () => Promise<any>, errorMessage?: string) {
    try {
        await fn();
        throw new Error('Expected function to throw, but it did not');
    } catch (error: any) {
        if (errorMessage) {
            expect(error.message).toContain(errorMessage);
        }
    }
}

/**
 * Create a spy on a module export
 */
export function spyOnModule(module: any, method: string) {
    return vi.spyOn(module, method);
}

/**
 * Reset all mocks
 */
export function resetAllMocks() {
    vi.clearAllMocks();
    vi.resetAllMocks();
}

/**
 * Mock localStorage
 */
export function mockLocalStorage() {
    const storage: Record<string, string> = {};

    return {
        getItem: vi.fn((key: string) => storage[key] || null),
        setItem: vi.fn((key: string, value: string) => {
            storage[key] = value;
        }),
        removeItem: vi.fn((key: string) => {
            delete storage[key];
        }),
        clear: vi.fn(() => {
            Object.keys(storage).forEach(key => delete storage[key]);
        }),
        key: vi.fn((index: number) => Object.keys(storage)[index] || null),
        get length() {
            return Object.keys(storage).length;
        },
    };
}

/**
 * Mock network online/offline status
 */
export function mockNetworkStatus(isOnline: boolean = true) {
    Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: isOnline,
    });
}

/**
 * Trigger network status change
 */
export function triggerNetworkChange(isOnline: boolean) {
    mockNetworkStatus(isOnline);
    window.dispatchEvent(new Event(isOnline ? 'online' : 'offline'));
}

/**
 * Create a mock timer for testing time-dependent code
 */
export function useFakeTimers() {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });
}

/**
 * Advance timers by specified time
 */
export async function advanceTimers(ms: number) {
    vi.advanceTimersByTime(ms);
    await Promise.resolve(); // Flush microtasks
}

/**
 * Run all pending timers
 */
export async function runAllTimers() {
    vi.runAllTimers();
    await Promise.resolve(); // Flush microtasks
}
