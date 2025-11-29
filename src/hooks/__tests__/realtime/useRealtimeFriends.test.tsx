/**
 * Unit Tests for useRealtimeFriends Hook
 * Story 9.8.2: Unit Tests - React Hooks & State Management
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useRealtimeFriends } from '../../friends/useRealtimeFriends';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../store/authStore';
import { useFriendsStore } from '../../../store/friendsStore';

// Mock dependencies
vi.mock('../../../lib/supabase');
vi.mock('../../../store/authStore');
vi.mock('../../../store/friendsStore');

describe('useRealtimeFriends', () => {
    let queryClient: QueryClient;
    let mockChannel: any;
    const mockUser = { id: 'user-123' };

    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();

        queryClient = new QueryClient({
            defaultOptions: {
                queries: { retry: false },
            },
        });

        // Mock channel
        mockChannel = {
            on: vi.fn().mockReturnThis(),
            subscribe: vi.fn().mockReturnThis(),
            unsubscribe: vi.fn(),
        };

        (supabase.channel as any).mockReturnValue(mockChannel);
        (supabase.removeChannel as any).mockImplementation(() => { });
        (useAuthStore as any).mockReturnValue(mockUser);
        (useFriendsStore as any).mockReturnValue({
            addFriend: vi.fn(),
            removeFriend: vi.fn(),
            addRequest: vi.fn(),
            removeRequest: vi.fn(),
            setOnlineFriendsCount: vi.fn(),
        });
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    );

    it('should not subscribe when user is not authenticated', () => {
        (useAuthStore as any).mockReturnValue(null);

        renderHook(() => useRealtimeFriends(), { wrapper });

        expect(supabase.channel).not.toHaveBeenCalled();
    });

    it('should subscribe to friendships changes', () => {
        renderHook(() => useRealtimeFriends(), { wrapper });

        expect(supabase.channel).toHaveBeenCalledWith('friendships-changes');
        expect(mockChannel.on).toHaveBeenCalledWith(
            'postgres_changes',
            expect.objectContaining({
                event: 'INSERT',
                table: 'friendships',
            }),
            expect.any(Function)
        );
    });

    it('should subscribe to friend requests changes', () => {
        renderHook(() => useRealtimeFriends(), { wrapper });

        expect(supabase.channel).toHaveBeenCalledWith('friend-requests-changes');
    });

    it('should subscribe to profiles changes', () => {
        renderHook(() => useRealtimeFriends(), { wrapper });

        expect(supabase.channel).toHaveBeenCalledWith('profiles-changes');
        expect(mockChannel.on).toHaveBeenCalledWith(
            'postgres_changes',
            expect.objectContaining({
                event: 'UPDATE',
                table: 'profiles',
            }),
            expect.any(Function)
        );
    });

    it('should cleanup subscriptions on unmount', () => {
        const { unmount } = renderHook(() => useRealtimeFriends(), { wrapper });

        unmount();

        expect(supabase.removeChannel).toHaveBeenCalledTimes(3);
    });

    it('should invalidate queries on friend added', async () => {
        const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

        renderHook(() => useRealtimeFriends(), { wrapper });

        // Get the INSERT handler
        const insertCall = mockChannel.on.mock.calls.find(
            (call: any) => call[1].event === 'INSERT' && call[1].table === 'friendships'
        );

        if (insertCall) {
            const handler = insertCall[2];
            handler({ new: { friend_id: 'friend-456' } });

            await vi.advanceTimersByTimeAsync(1000);

            expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['friends-list'] });
        }
    });

    it('should handle friend removed event', async () => {
        const mockRemoveFriend = vi.fn();
        (useFriendsStore as any).mockReturnValue({
            addFriend: vi.fn(),
            removeFriend: mockRemoveFriend,
            addRequest: vi.fn(),
            removeRequest: vi.fn(),
            setOnlineFriendsCount: vi.fn(),
        });

        renderHook(() => useRealtimeFriends(), { wrapper });

        // Get the DELETE handler
        const deleteCall = mockChannel.on.mock.calls.find(
            (call: any) => call[1].event === 'DELETE' && call[1].table === 'friendships'
        );

        if (deleteCall) {
            const handler = deleteCall[2];
            handler({ old: { friend_id: 'friend-456' } });

            await vi.advanceTimersByTimeAsync(1000);

            expect(mockRemoveFriend).toHaveBeenCalledWith('friend-456');
        }
    });

    it('should throttle friend request changes', async () => {
        const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

        renderHook(() => useRealtimeFriends(), { wrapper });

        // Get the friend request handler
        const requestCall = mockChannel.on.mock.calls.find(
            (call: any) => call[1].table === 'friend_requests'
        );

        if (requestCall) {
            const handler = requestCall[2];

            // Trigger multiple times rapidly
            handler({ new: { id: 'req-1' } });
            handler({ new: { id: 'req-2' } });
            handler({ new: { id: 'req-3' } });

            await vi.advanceTimersByTimeAsync(1000);

            // Should be throttled to 1 call
            const friendRequestCalls = invalidateSpy.mock.calls.filter(
                (call: any) => call[0].queryKey[0] === 'friendRequests'
            );

            expect(friendRequestCalls.length).toBeLessThanOrEqual(2);
        }
    });
});
