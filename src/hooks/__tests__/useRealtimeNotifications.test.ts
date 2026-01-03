import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useRealtimeNotifications } from '../useRealtimeNotifications';
import { supabase } from '@/lib/supabase';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';

// Mock dependencies
vi.mock('@/lib/supabase', () => ({
    supabase: {
        channel: vi.fn(),
        removeChannel: vi.fn(),
    },
}));

vi.mock('@tanstack/react-query', () => ({
    useQueryClient: vi.fn(),
}));

vi.mock('@/store/authStore', () => ({
    useAuthStore: vi.fn(),
}));

vi.mock('react-hot-toast', () => ({
    default: vi.fn(),
}));

describe('useRealtimeNotifications', () => {
    const mockUserId = 'user-123';
    const mockQueryClient = {
        invalidateQueries: vi.fn(),
    };
    const mockChannel = {
        on: vi.fn(),
        subscribe: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();

        // Mock console methods
        vi.spyOn(console, 'log').mockImplementation(() => { });
        vi.spyOn(console, 'error').mockImplementation(() => { });

        // Setup default mocks
        (useQueryClient as any).mockReturnValue(mockQueryClient);
        (useAuthStore as any).mockReturnValue({ user: { id: mockUserId } });

        // Setup channel mock to return itself for chaining
        mockChannel.on.mockReturnValue(mockChannel);
        mockChannel.subscribe.mockReturnValue(mockChannel);
        (supabase.channel as any).mockReturnValue(mockChannel);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should not subscribe without user ID', () => {
        (useAuthStore as any).mockReturnValue({ user: null });

        renderHook(() => useRealtimeNotifications());

        expect(supabase.channel).not.toHaveBeenCalled();
    });

    it('should create channel with correct name', () => {
        renderHook(() => useRealtimeNotifications());

        expect(supabase.channel).toHaveBeenCalledWith('notifications_changes');
    });

    it('should subscribe to INSERT events', () => {
        renderHook(() => useRealtimeNotifications());

        expect(mockChannel.on).toHaveBeenCalledWith(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'notifications',
                filter: `user_id=eq.${mockUserId}`,
            },
            expect.any(Function)
        );
    });

    it('should subscribe to UPDATE events', () => {
        renderHook(() => useRealtimeNotifications());

        expect(mockChannel.on).toHaveBeenCalledWith(
            'postgres_changes',
            {
                event: 'UPDATE',
                schema: 'public',
                table: 'notifications',
                filter: `user_id=eq.${mockUserId}`,
            },
            expect.any(Function)
        );
    });

    it('should call subscribe on channel', () => {
        renderHook(() => useRealtimeNotifications());

        expect(mockChannel.subscribe).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should invalidate queries on INSERT event', () => {
        let insertCallback: any;
        mockChannel.on.mockImplementation((type: string, config: any, callback: any) => {
            if (config.event === 'INSERT') {
                insertCallback = callback;
            }
            return mockChannel;
        });

        renderHook(() => useRealtimeNotifications());

        expect(insertCallback).toBeDefined();

        // Simulate INSERT event
        const mockPayload = {
            new: {
                id: 'notif-1',
                message: 'New friend request',
                user_id: mockUserId,
            },
        };
        insertCallback(mockPayload);

        expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
            queryKey: ['notifications'],
        });
        expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
            queryKey: ['all-notifications'],
        });
    });

    it('should show toast on INSERT event', () => {
        let insertCallback: any;
        mockChannel.on.mockImplementation((type: string, config: any, callback: any) => {
            if (config.event === 'INSERT') {
                insertCallback = callback;
            }
            return mockChannel;
        });

        renderHook(() => useRealtimeNotifications());

        const mockPayload = {
            new: {
                id: 'notif-1',
                message: 'New friend request',
                user_id: mockUserId,
            },
        };
        insertCallback(mockPayload);

        expect(toast).toHaveBeenCalledWith('New friend request', {
            icon: '🔔',
            duration: 4000,
        });
    });

    it('should invalidate queries on UPDATE event', () => {
        let updateCallback: any;
        mockChannel.on.mockImplementation((type: string, config: any, callback: any) => {
            if (config.event === 'UPDATE') {
                updateCallback = callback;
            }
            return mockChannel;
        });

        renderHook(() => useRealtimeNotifications());

        expect(updateCallback).toBeDefined();

        // Simulate UPDATE event
        const mockPayload = {
            old: { is_read: false },
            new: { is_read: true },
        };
        updateCallback(mockPayload);

        expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
            queryKey: ['notifications'],
        });
        expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
            queryKey: ['all-notifications'],
        });
    });

    it('should handle foreground push notification events', () => {
        renderHook(() => useRealtimeNotifications());

        // Simulate foreground push event
        const event = new CustomEvent('foreground-notification', {
            detail: { title: 'Test', body: 'Test notification' },
        });
        window.dispatchEvent(event);

        expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
            queryKey: ['notifications'],
        });
        expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
            queryKey: ['all-notifications'],
        });
    });

    it('should remove channel on unmount', () => {
        const { unmount } = renderHook(() => useRealtimeNotifications());

        unmount();

        expect(supabase.removeChannel).toHaveBeenCalledWith(mockChannel);
    });

    it('should remove event listener on unmount', () => {
        const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

        const { unmount } = renderHook(() => useRealtimeNotifications());

        unmount();

        expect(removeEventListenerSpy).toHaveBeenCalledWith(
            'foreground-notification',
            expect.any(Function)
        );
    });

    it('should re-subscribe when user ID changes', () => {
        const { rerender } = renderHook(() => useRealtimeNotifications());

        expect(supabase.channel).toHaveBeenCalledTimes(1);

        // Change user
        (useAuthStore as any).mockReturnValue({ user: { id: 'user-456' } });
        rerender();

        expect(supabase.removeChannel).toHaveBeenCalled();
        expect(supabase.channel).toHaveBeenCalledTimes(2);
    });
});
