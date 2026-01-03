/**
 * Component Test Utilities
 * Story 9.8.3: Component Tests - Friends UI
 * 
 * Reusable utilities for rendering components with all necessary providers
 */

import { ReactElement, ReactNode } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

/**
 * Custom render function that wraps components with all necessary providers
 */
export function renderWithProviders(
    ui: ReactElement,
    {
        initialRoute = '/',
        queryClient = new QueryClient({
            defaultOptions: {
                queries: { retry: false },
                mutations: { retry: false },
            },
        }),
        ...renderOptions
    }: {
        initialRoute?: string;
        queryClient?: QueryClient;
    } & Omit<RenderOptions, 'wrapper'> = {}
) {
    function Wrapper({ children }: { children: ReactNode }) {
        return (
            <QueryClientProvider client={queryClient}>
                <MemoryRouter initialEntries={[initialRoute]}>
                    {children}
                </MemoryRouter>
            </QueryClientProvider>
        );
    }

    return {
        ...render(ui, { wrapper: Wrapper, ...renderOptions }),
        queryClient,
    };
}

/**
 * Render component with custom route setup
 */
export function renderWithRouter(
    ui: ReactElement,
    {
        route = '/',
        path = '/',
        ...renderOptions
    }: {
        route?: string;
        path?: string;
    } & Omit<RenderOptions, 'wrapper'> = {}
) {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: { retry: false },
            mutations: { retry: false },
        },
    });

    function Wrapper({ children }: { children: ReactNode }) {
        return (
            <QueryClientProvider client={queryClient}>
                <MemoryRouter initialEntries={[route]}>
                    <Routes>
                        <Route path={path} element={children} />
                    </Routes>
                </MemoryRouter>
            </QueryClientProvider>
        );
    }

    return {
        ...render(ui, { wrapper: Wrapper, ...renderOptions }),
        queryClient,
    };
}

/**
 * Wait for component to finish loading
 */
export async function waitForLoadingToFinish() {
    const { waitForElementToBeRemoved, queryByText } = await import('@testing-library/react');
    const loadingElement = queryByText(/loading/i);
    if (loadingElement) {
        await waitForElementToBeRemoved(loadingElement);
    }
}

/**
 * Create mock friend data
 */
export function createMockFriend(overrides = {}) {
    return {
        id: 'friend-123',
        full_name: 'John Doe',
        username: 'johndoe',
        avatar_url: 'https://example.com/avatar.jpg',
        is_online: true,
        last_active: new Date().toISOString(),
        mutual_friends_count: 5,
        ...overrides,
    };
}

/**
 * Create mock friend request data
 */
export function createMockFriendRequest(overrides = {}) {
    return {
        id: 'request-123',
        sender_id: 'user-456',
        receiver_id: 'user-789',
        status: 'pending',
        message: 'Hey, let\'s be friends!',
        created_at: new Date().toISOString(),
        sender: createMockFriend({ id: 'user-456' }),
        ...overrides,
    };
}

/**
 * Create multiple mock friends
 */
export function createMockFriends(count: number, overrides = {}) {
    return Array.from({ length: count }, (_, i) => 
        createMockFriend({
            id: `friend-${i + 1}`,
            full_name: `User ${i + 1}`,
            username: `user${i + 1}`,
            ...overrides,
        })
    );
}

/**
 * Create multiple mock friend requests
 */
export function createMockFriendRequests(count: number, overrides = {}) {
    return Array.from({ length: count }, (_, i) =>
        createMockFriendRequest({
            id: `request-${i + 1}`,
            sender_id: `user-${i + 1}`,
            ...overrides,
        })
    );
}
