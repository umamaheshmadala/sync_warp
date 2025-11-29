/**
 * Router Mocking Utilities
 * Story 9.8.3: Component Tests - Friends UI
 * 
 * Utilities for mocking React Router in tests
 */

import { vi } from 'vitest';

/**
 * Mock useNavigate hook
 */
export function mockUseNavigate() {
    const navigate = vi.fn();
    vi.mock('react-router-dom', async () => {
        const actual = await vi.importActual('react-router-dom');
        return {
            ...actual,
            useNavigate: () => navigate,
        };
    });
    return navigate;
}

/**
 * Mock useParams hook
 */
export function mockUseParams(params: Record<string, string>) {
    vi.mock('react-router-dom', async () => {
        const actual = await vi.importActual('react-router-dom');
        return {
            ...actual,
            useParams: () => params,
        };
    });
}

/**
 * Mock useLocation hook
 */
export function mockUseLocation(location: { pathname: string; search?: string; state?: any }) {
    vi.mock('react-router-dom', async () => {
        const actual = await vi.importActual('react-router-dom');
        return {
            ...actual,
            useLocation: () => ({
                pathname: location.pathname,
                search: location.search || '',
                state: location.state || null,
                hash: '',
                key: 'default',
            }),
        };
    });
}

/**
 * Mock useSearchParams hook
 */
export function mockUseSearchParams(initialParams: Record<string, string> = {}) {
    const searchParams = new URLSearchParams(initialParams);
    const setSearchParams = vi.fn((params) => {
        Object.entries(params).forEach(([key, value]) => {
            searchParams.set(key, value as string);
        });
    });

    vi.mock('react-router-dom', async () => {
        const actual = await vi.importActual('react-router-dom');
        return {
            ...actual,
            useSearchParams: () => [searchParams, setSearchParams],
        };
    });

    return { searchParams, setSearchParams };
}

/**
 * Reset all router mocks
 */
export function resetRouterMocks() {
    vi.clearAllMocks();
}
