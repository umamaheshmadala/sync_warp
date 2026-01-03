/**
 * Hook Testing Helpers
 * Story 9.8.2: Unit Tests - React Hooks & State Management
 * 
 * Utilities for testing React hooks with proper providers and context
 */

import { renderHook, RenderHookOptions, RenderHookResult } from '@testing-library/react';
import { ReactNode } from 'react';
import { vi } from 'vitest';

/**
 * Wrapper component that provides necessary context for hooks
 */
export function createWrapper(options: { providers?: ReactNode[] } = {}) {
    return ({ children }: { children: ReactNode }) => {
        let wrapped = children;

        // Wrap with providers in reverse order (innermost first)
        if (options.providers) {
            for (let i = options.providers.length - 1; i >= 0; i--) {
                const Provider = options.providers[i];
                wrapped = <>{ Provider }{ wrapped } </>;
            }
        }

        return <>{ wrapped } </>;
    };
}

/**
 * Render a hook with optional providers
 */
export function renderHookWithProviders<TProps, TResult>(
    hook: (props: TProps) => TResult,
    options?: RenderHookOptions<TProps> & { providers?: ReactNode[] }
): RenderHookResult<TResult, TProps> {
    const { providers, ...renderOptions } = options || {};

    return renderHook(hook, {
        ...renderOptions,
        wrapper: providers ? createWrapper({ providers }) : undefined,
    });
}

/**
 * Wait for a hook to finish loading
 */
export async function waitForHookToSettle<T extends { isLoading?: boolean }>(
    result: { current: T },
    timeout = 5000
): Promise<void> {
    const startTime = Date.now();

    while (result.current.isLoading && Date.now() - startTime < timeout) {
        await new Promise(resolve => setTimeout(resolve, 50));
    }

    if (result.current.isLoading) {
        throw new Error('Hook did not settle within timeout');
    }
}

/**
 * Mock a successful async operation
 */
export function mockAsyncSuccess<T>(data: T, delay = 0): Promise<T> {
    return new Promise(resolve => {
        setTimeout(() => resolve(data), delay);
    });
}

/**
 * Mock a failed async operation
 */
export function mockAsyncError(error: Error | string, delay = 0): Promise<never> {
    return new Promise((_, reject) => {
        setTimeout(() => {
            reject(typeof error === 'string' ? new Error(error) : error);
        }, delay);
    });
}

/**
 * Create a mock function that tracks calls and returns
 */
export function createMockFunction<T extends (...args: any[]) => any>(
    implementation?: T
): T & { calls: Parameters<T>[][]; returns: ReturnType<T>[] } {
    const calls: Parameters<T>[][] = [];
    const returns: ReturnType<T>[] = [];

    const mockFn = vi.fn((...args: Parameters<T>) => {
        calls.push(args);
        const result = implementation ? implementation(...args) : undefined;
        returns.push(result);
        return result;
    }) as any;

    mockFn.calls = calls;
    mockFn.returns = returns;

    return mockFn;
}

/**
 * Trigger a state update in a hook
 */
export async function triggerHookUpdate<T>(
    result: { current: T },
    updater: (current: T) => void
): Promise<void> {
    updater(result.current);
    await new Promise(resolve => setTimeout(resolve, 0));
}

/**
 * Mock localStorage for testing
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
        get length() {
            return Object.keys(storage).length;
        },
        key: vi.fn((index: number) => Object.keys(storage)[index] || null),
    };
}

/**
 * Wait for a condition to be true
 */
export async function waitForCondition(
    condition: () => boolean,
    timeout = 5000,
    interval = 50
): Promise<void> {
    const startTime = Date.now();

    while (!condition() && Date.now() - startTime < timeout) {
        await new Promise(resolve => setTimeout(resolve, interval));
    }

    if (!condition()) {
        throw new Error('Condition not met within timeout');
    }
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
