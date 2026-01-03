/**
 * Unit Tests for presenceStore (Zustand)
 * Story 9.8.2: Unit Tests - React Hooks & State Management
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { usePresenceStore } from '../../store/presenceStore';
import { supabase } from '../../lib/supabase';

// Mock dependencies
vi.mock('../../lib/supabase', () => ({
    supabase: {
        channel: vi.fn(),
        removeChannel: vi.fn(),
        from: vi.fn(() => ({
            update: vi.fn(() => ({
                eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
            })),
        })),
    },
}));

vi.mock('@capacitor/core', () => ({
    Capacitor: {
        getPlatform: vi.fn(() => 'web'),
        isNativePlatform: vi.fn(() => false),
    },
}));

vi.mock('@capacitor/app', () => ({
    App: {
        addListener: vi.fn(() => ({ remove: vi.fn() })),
    },
}));

describe('presenceStore', () => {
    let mockChannel: any;

    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();

        // Reset store
        const { getState } = usePresenceStore;
        act(() => {
            getState().cleanup();
        });

        // Setup mock channel
        mockChannel = {
            on: vi.fn().mockReturnThis(),
            subscribe: vi.fn((callback) => {
                setTimeout(() => callback('SUBSCRIBED'), 0);
                return mockChannel;
            }),
            track: vi.fn(() => Promise.resolve()),
            untrack: vi.fn(() => Promise.resolve()),
            presenceState: vi.fn(() => ({})),
        };

        (supabase.channel as any).mockReturnValue(mockChannel);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('Initial State', () => {
        it('should have empty online users map initially', () => {
            const { result } = renderHook(() => usePresenceStore());
            expect(result.current.onlineUsers.size).toBe(0);
        });

        it('should not be initialized initially', () => {
            const { result } = renderHook(() => usePresenceStore());
            expect(result.current.isInitialized).toBe(false);
        });
    });

    describe('initialize', () => {
        it('should initialize presence tracking', async () => {
            const { result } = renderHook(() => usePresenceStore());

            await act(async () => {
                await result.current.initialize('user-123');
                await vi.runAllTimersAsync();
            });

            expect(supabase.channel).toHaveBeenCalledWith('online-users', {
                config: {
                    presence: {
                        key: 'user-123',
                    },
                },
            });

            expect(result.current.isInitialized).toBe(true);
        });

        it('should not reinitialize if already initialized', async () => {
            const { result } = renderHook(() => usePresenceStore());

            await act(async () => {
                await result.current.initialize('user-123');
                await vi.runAllTimersAsync();
            });

            const callCount = (supabase.channel as any).mock.calls.length;

            await act(async () => {
                await result.current.initialize('user-123');
            });

            expect((supabase.channel as any).mock.calls.length).toBe(callCount);
        });

        it('should subscribe to presence events', async () => {
            const { result } = renderHook(() => usePresenceStore());

            await act(async () => {
                await result.current.initialize('user-123');
                await vi.runAllTimersAsync();
            });

            expect(mockChannel.on).toHaveBeenCalledWith(
                'presence',
                { event: 'sync' },
                expect.any(Function)
            );

            expect(mockChannel.on).toHaveBeenCalledWith(
                'presence',
                { event: 'join' },
                expect.any(Function)
            );

            expect(mockChannel.on).toHaveBeenCalledWith(
                'presence',
                { event: 'leave' },
                expect.any(Function)
            );
        });

        it('should track presence after subscription', async () => {
            const { result } = renderHook(() => usePresenceStore());

            await act(async () => {
                await result.current.initialize('user-123');
                await vi.runAllTimersAsync();
            });

            expect(mockChannel.track).toHaveBeenCalledWith(
                expect.objectContaining({
                    user_id: 'user-123',
                    platform: 'web',
                })
            );
        });

        it('should update database on track', async () => {
            const { result } = renderHook(() => usePresenceStore());

            await act(async () => {
                await result.current.initialize('user-123');
                await vi.runAllTimersAsync();
            });

            expect(supabase.from).toHaveBeenCalledWith('profiles');
        });
    });

    describe('presence sync event', () => {
        it('should update online users on sync', async () => {
            mockChannel.presenceState.mockReturnValue({
                'user-456': [
                    {
                        user_id: 'user-456',
                        online_at: '2025-01-01T00:00:00Z',
                    },
                ],
            });

            const { result } = renderHook(() => usePresenceStore());

            await act(async () => {
                await result.current.initialize('user-123');
                await vi.runAllTimersAsync();
            });

            // Trigger sync event
            const syncHandler = mockChannel.on.mock.calls.find(
                (call: any) => call[1].event === 'sync'
            )?.[2];

            if (syncHandler) {
                act(() => {
                    syncHandler();
                });
            }

            expect(result.current.onlineUsers.size).toBeGreaterThan(0);
        });
    });

    describe('presence join event', () => {
        it('should add user to online users on join', async () => {
            const { result } = renderHook(() => usePresenceStore());

            await act(async () => {
                await result.current.initialize('user-123');
                await vi.runAllTimersAsync();
            });

            // Trigger join event
            const joinHandler = mockChannel.on.mock.calls.find(
                (call: any) => call[1].event === 'join'
            )?.[2];

            if (joinHandler) {
                act(() => {
                    joinHandler({
                        key: 'user-456',
                        newPresences: [
                            {
                                user_id: 'user-456',
                                online_at: '2025-01-01T00:00:00Z',
                            },
                        ],
                    });
                });
            }

            expect(result.current.onlineUsers.has('user-456')).toBe(true);
        });
    });

    describe('presence leave event', () => {
        it('should remove user from online users on leave', async () => {
            const { result } = renderHook(() => usePresenceStore());

            await act(async () => {
                await result.current.initialize('user-123');
                await vi.runAllTimersAsync();
            });

            // First add a user
            const joinHandler = mockChannel.on.mock.calls.find(
                (call: any) => call[1].event === 'join'
            )?.[2];

            if (joinHandler) {
                act(() => {
                    joinHandler({
                        key: 'user-456',
                        newPresences: [
                            {
                                user_id: 'user-456',
                                online_at: '2025-01-01T00:00:00Z',
                            },
                        ],
                    });
                });
            }

            // Then trigger leave
            const leaveHandler = mockChannel.on.mock.calls.find(
                (call: any) => call[1].event === 'leave'
            )?.[2];

            if (leaveHandler) {
                act(() => {
                    leaveHandler({
                        key: 'user-456',
                        leftPresences: [
                            {
                                user_id: 'user-456',
                            },
                        ],
                    });
                });
            }

            expect(result.current.onlineUsers.has('user-456')).toBe(false);
        });
    });

    describe('cleanup', () => {
        it('should cleanup presence tracking', async () => {
            const { result } = renderHook(() => usePresenceStore());

            await act(async () => {
                await result.current.initialize('user-123');
                await vi.runAllTimersAsync();
            });

            expect(result.current.isInitialized).toBe(true);

            await act(async () => {
                await result.current.cleanup();
            });

            expect(result.current.isInitialized).toBe(false);
            expect(result.current.onlineUsers.size).toBe(0);
        });

        it('should untrack and remove channel on cleanup', async () => {
            const { result } = renderHook(() => usePresenceStore());

            await act(async () => {
                await result.current.initialize('user-123');
                await vi.runAllTimersAsync();
            });

            await act(async () => {
                await result.current.cleanup();
            });

            expect(mockChannel.untrack).toHaveBeenCalled();
            expect(supabase.removeChannel).toHaveBeenCalledWith(mockChannel);
        });
    });
});
