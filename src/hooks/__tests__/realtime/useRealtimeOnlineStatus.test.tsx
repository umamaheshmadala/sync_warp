/**
 * Unit Tests for useRealtimeOnlineStatus Hook
 * Story 9.8.2: Unit Tests - React Hooks & State Management
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useRealtimeOnlineStatus } from '../../friends/useRealtimeOnlineStatus';
import { supabase } from '../../../lib/supabase';

// Mock dependencies
vi.mock('../../../lib/supabase');

describe('useRealtimeOnlineStatus', () => {
    let queryClient: QueryClient;
    let mockChannel: any;

    beforeEach(() => {
        vi.clearAllMocks();

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
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    );

    it('should subscribe to online status changes', () => {
        renderHook(() => useRealtimeOnlineStatus(), { wrapper });

        expect(supabase.channel).toHaveBeenCalledWith('online-status-changes');
        expect(mockChannel.on).toHaveBeenCalledWith(
            'postgres_changes',
            expect.objectContaining({
                event: 'UPDATE',
                schema: 'public',
                table: 'profiles',
            }),
            expect.any(Function)
        );
        expect(mockChannel.subscribe).toHaveBeenCalled();
    });

    it('should invalidate friends list on status change', () => {
        const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

        renderHook(() => useRealtimeOnlineStatus(), { wrapper });

        // Get the handler
        const onCall = mockChannel.on.mock.calls[0];
        const handler = onCall[2];

        // Trigger status change
        handler({
            new: { id: 'user-456', is_online: true },
            old: { id: 'user-456', is_online: false },
        });

        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['friends-list'] });
    });

    it('should cleanup subscription on unmount', () => {
        const { unmount } = renderHook(() => useRealtimeOnlineStatus(), { wrapper });

        unmount();

        expect(mockChannel.unsubscribe).toHaveBeenCalled();
    });

    it('should handle multiple status changes', () => {
        const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

        renderHook(() => useRealtimeOnlineStatus(), { wrapper });

        const onCall = mockChannel.on.mock.calls[0];
        const handler = onCall[2];

        // Trigger multiple changes
        handler({ new: { id: 'user-1', is_online: true } });
        handler({ new: { id: 'user-2', is_online: false } });
        handler({ new: { id: 'user-3', is_online: true } });

        expect(invalidateSpy).toHaveBeenCalledTimes(3);
    });

    it('should subscribe with correct filter', () => {
        renderHook(() => useRealtimeOnlineStatus(), { wrapper });

        expect(mockChannel.on).toHaveBeenCalledWith(
            'postgres_changes',
            expect.objectContaining({
                filter: 'is_online=eq.true,is_online=eq.false',
            }),
            expect.any(Function)
        );
    });
});
