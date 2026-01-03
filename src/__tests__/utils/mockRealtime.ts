/**
 * Mock Realtime Utilities
 * Story 9.8.2: Unit Tests - React Hooks & State Management
 * 
 * Utilities for mocking Supabase realtime subscriptions and events
 */

import { vi } from 'vitest';

export type RealtimeEventType = 'INSERT' | 'UPDATE' | 'DELETE';

export interface RealtimeEvent<T = any> {
    eventType: RealtimeEventType;
    new: T | null;
    old: T | null;
    errors: any[] | null;
}

export interface RealtimeCallback<T = any> {
    (event: RealtimeEvent<T>): void;
}

/**
 * Create a mock Supabase realtime channel
 */
export function createMockChannel() {
    const callbacks: Map<string, RealtimeCallback[]> = new Map();
    let subscribed = false;

    const channel = {
        on: vi.fn((event: string, filter: any, callback: RealtimeCallback) => {
            const key = typeof filter === 'function' ? 'broadcast' : `${event}:${JSON.stringify(filter)}`;

            if (!callbacks.has(key)) {
                callbacks.set(key, []);
            }
            callbacks.get(key)!.push(typeof filter === 'function' ? filter : callback);

            return channel;
        }),

        subscribe: vi.fn((callback?: (status: string) => void) => {
            subscribed = true;
            if (callback) {
                setTimeout(() => callback('SUBSCRIBED'), 0);
            }
            return channel;
        }),

        unsubscribe: vi.fn(() => {
            subscribed = false;
            callbacks.clear();
            return Promise.resolve({ error: null });
        }),

        // Test helpers
        _trigger: (event: string, filter: any, payload: RealtimeEvent) => {
            const key = `${event}:${JSON.stringify(filter)}`;
            const handlers = callbacks.get(key) || [];
            handlers.forEach(handler => handler(payload));
        },

        _triggerBroadcast: (payload: any) => {
            const handlers = callbacks.get('broadcast') || [];
            handlers.forEach(handler => handler(payload));
        },

        _isSubscribed: () => subscribed,

        _getCallbacks: () => callbacks,
    };

    return channel;
}

/**
 * Create a mock realtime subscription
 */
export function createMockRealtimeSubscription() {
    const channel = createMockChannel();

    return {
        channel,
        subscribe: () => channel.subscribe(),
        unsubscribe: () => channel.unsubscribe(),
    };
}

/**
 * Mock a realtime INSERT event
 */
export function mockRealtimeInsert<T>(data: T): RealtimeEvent<T> {
    return {
        eventType: 'INSERT',
        new: data,
        old: null,
        errors: null,
    };
}

/**
 * Mock a realtime UPDATE event
 */
export function mockRealtimeUpdate<T>(oldData: T, newData: T): RealtimeEvent<T> {
    return {
        eventType: 'UPDATE',
        new: newData,
        old: oldData,
        errors: null,
    };
}

/**
 * Mock a realtime DELETE event
 */
export function mockRealtimeDelete<T>(data: T): RealtimeEvent<T> {
    return {
        eventType: 'DELETE',
        new: null,
        old: data,
        errors: null,
    };
}

/**
 * Trigger a realtime event on a channel
 */
export function triggerRealtimeEvent<T>(
    channel: ReturnType<typeof createMockChannel>,
    event: 'INSERT' | 'UPDATE' | 'DELETE',
    table: string,
    payload: T,
    oldPayload?: T
) {
    let realtimeEvent: RealtimeEvent<T>;

    switch (event) {
        case 'INSERT':
            realtimeEvent = mockRealtimeInsert(payload);
            break;
        case 'UPDATE':
            realtimeEvent = mockRealtimeUpdate(oldPayload || payload, payload);
            break;
        case 'DELETE':
            realtimeEvent = mockRealtimeDelete(payload);
            break;
    }

    channel._trigger('postgres_changes', { event, schema: 'public', table }, realtimeEvent);
}

/**
 * Mock Supabase client with realtime support
 */
export function createMockSupabaseWithRealtime() {
    const channels = new Map<string, ReturnType<typeof createMockChannel>>();

    return {
        channel: vi.fn((name: string) => {
            if (!channels.has(name)) {
                channels.set(name, createMockChannel());
            }
            return channels.get(name)!;
        }),

        removeChannel: vi.fn((channel: any) => {
            for (const [name, ch] of channels.entries()) {
                if (ch === channel) {
                    channels.delete(name);
                    break;
                }
            }
            return Promise.resolve({ error: null });
        }),

        // Test helpers
        _getChannel: (name: string) => channels.get(name),
        _getAllChannels: () => Array.from(channels.values()),
        _clearChannels: () => channels.clear(),
    };
}

/**
 * Wait for a realtime subscription to be established
 */
export async function waitForSubscription(
    channel: ReturnType<typeof createMockChannel>,
    timeout = 1000
): Promise<void> {
    const startTime = Date.now();

    while (!channel._isSubscribed() && Date.now() - startTime < timeout) {
        await new Promise(resolve => setTimeout(resolve, 50));
    }

    if (!channel._isSubscribed()) {
        throw new Error('Subscription not established within timeout');
    }
}

/**
 * Mock presence state
 */
export function createMockPresence() {
    const state: Map<string, any> = new Map();

    return {
        track: vi.fn((payload: any) => {
            state.set('self', payload);
            return Promise.resolve({ error: null });
        }),

        untrack: vi.fn(() => {
            state.delete('self');
            return Promise.resolve({ error: null });
        }),

        state: () => Object.fromEntries(state),

        // Test helpers
        _setState: (key: string, value: any) => state.set(key, value),
        _clearState: () => state.clear(),
    };
}
