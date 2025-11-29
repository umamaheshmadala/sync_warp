/**
 * Unit Tests for useFriendRequests Hook
 * Story 9.8.2: Unit Tests - React Hooks & State Management
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFriendRequests, useReceivedFriendRequests, useSentFriendRequests } from '../../friends/useFriendRequests';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../store/authStore';

// Mock dependencies
vi.mock('../../../lib/supabase');
vi.mock('../../../store/authStore');

describe('useFriendRequests', () => {
    let queryClient: QueryClient;

    beforeEach(() => {
        vi.clearAllMocks();

        queryClient = new QueryClient({
            defaultOptions: {
                queries: {
                    retry: false,
                },
            },
        });

        // Mock authenticated user
        (useAuthStore as any).mockReturnValue({ id: 'user-123' });
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient} >
            {children}
        </QueryClientProvider>
    );

    describe('useReceivedFriendRequests', () => {
        it('should fetch received friend requests', async () => {
            const mockRequests = [
                { id: 'req-1', sender_id: 'user-456', receiver_id: 'user-123', status: 'pending', created_at: '2024-01-01' },
                { id: 'req-2', sender_id: 'user-789', receiver_id: 'user-123', status: 'pending', created_at: '2024-01-02' },
            ];

            const mockProfiles = [
                { id: 'user-456', full_name: 'John Doe', email: 'john@example.com', avatar_url: null },
                { id: 'user-789', full_name: 'Jane Smith', email: 'jane@example.com', avatar_url: null },
            ];

            // Mock Supabase query chain for requests
            const requestsQuery = {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                order: vi.fn().mockResolvedValue({ data: mockRequests, error: null }),
            };

            // Mock Supabase query chain for profiles
            const profilesQuery = {
                select: vi.fn().mockReturnThis(),
                in: vi.fn().mockResolvedValue({ data: mockProfiles, error: null }),
            };

            (supabase.from as any)
                .mockReturnValueOnce(requestsQuery)
                .mockReturnValueOnce(profilesQuery);

            const { result } = renderHook(() => useReceivedFriendRequests(), { wrapper });

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });

            expect(result.current.data).toHaveLength(2);
            expect(result.current.data?.[0]).toMatchObject({
                id: 'req-1',
                sender: mockProfiles[0],
            });
        });

        it('should handle empty requests', async () => {
            const requestsQuery = {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                order: vi.fn().mockResolvedValue({ data: [], error: null }),
            };

            (supabase.from as any).mockReturnValue(requestsQuery);

            const { result } = renderHook(() => useReceivedFriendRequests(), { wrapper });

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });

            expect(result.current.data).toEqual([]);
        });

        it('should handle fetch errors', async () => {
            const requestsQuery = {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                order: vi.fn().mockResolvedValue({ data: null, error: { message: 'Database error' } }),
            };

            (supabase.from as any).mockReturnValue(requestsQuery);

            const { result } = renderHook(() => useReceivedFriendRequests(), { wrapper });

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });

            expect(result.current.error).toBeTruthy();
        });

        it('should not fetch when user is not authenticated', () => {
            (useAuthStore as any).mockReturnValue(null);

            const { result } = renderHook(() => useReceivedFriendRequests(), { wrapper });

            expect(result.current.isLoading).toBe(false);
            expect(supabase.from).not.toHaveBeenCalled();
        });
    });

    describe('useSentFriendRequests', () => {
        it('should fetch sent friend requests', async () => {
            const mockRequests = [
                { id: 'req-1', sender_id: 'user-123', receiver_id: 'user-456', status: 'pending', created_at: '2024-01-01' },
            ];

            const mockProfiles = [
                { id: 'user-456', full_name: 'John Doe', email: 'john@example.com', avatar_url: null },
            ];

            const requestsQuery = {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                order: vi.fn().mockResolvedValue({ data: mockRequests, error: null }),
            };

            const profilesQuery = {
                select: vi.fn().mockReturnThis(),
                in: vi.fn().mockResolvedValue({ data: mockProfiles, error: null }),
            };

            (supabase.from as any)
                .mockReturnValueOnce(requestsQuery)
                .mockReturnValueOnce(profilesQuery);

            const { result } = renderHook(() => useSentFriendRequests(), { wrapper });

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });

            expect(result.current.data).toHaveLength(1);
            expect(result.current.data?.[0]).toMatchObject({
                id: 'req-1',
                receiver: mockProfiles[0],
            });
        });

        it('should handle errors with console.error', async () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

            const requestsQuery = {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                order: vi.fn().mockResolvedValue({ data: null, error: { message: 'Database error' } }),
            };

            (supabase.from as any).mockReturnValue(requestsQuery);

            const { result } = renderHook(() => useSentFriendRequests(), { wrapper });

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });

            expect(consoleSpy).toHaveBeenCalledWith('Sent requests error:', { message: 'Database error' });
            consoleSpy.mockRestore();
        });
    });

    describe('useFriendRequests wrapper', () => {
        it('should return received requests when type is "received"', async () => {
            const mockRequests = [
                { id: 'req-1', sender_id: 'user-456', receiver_id: 'user-123', status: 'pending', created_at: '2024-01-01' },
            ];

            const requestsQuery = {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                order: vi.fn().mockResolvedValue({ data: mockRequests, error: null }),
            };

            const profilesQuery = {
                select: vi.fn().mockReturnThis(),
                in: vi.fn().mockResolvedValue({ data: [], error: null }),
            };

            (supabase.from as any)
                .mockReturnValueOnce(requestsQuery)
                .mockReturnValueOnce(profilesQuery);

            const { result } = renderHook(() => useFriendRequests('received'), { wrapper });

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });

            expect(result.current.requests).toBeDefined();
            expect(result.current.hasNextPage).toBe(false);
            expect(result.current.isFetchingNextPage).toBe(false);
        });

        it('should return sent requests when type is "sent"', async () => {
            const mockRequests = [
                { id: 'req-1', sender_id: 'user-123', receiver_id: 'user-456', status: 'pending', created_at: '2024-01-01' },
            ];

            const requestsQuery = {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                order: vi.fn().mockResolvedValue({ data: mockRequests, error: null }),
            };

            const profilesQuery = {
                select: vi.fn().mockReturnThis(),
                in: vi.fn().mockResolvedValue({ data: [], error: null }),
            };

            (supabase.from as any)
                .mockReturnValueOnce(requestsQuery)
                .mockReturnValueOnce(profilesQuery);

            const { result } = renderHook(() => useFriendRequests('sent'), { wrapper });

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });

            expect(result.current.requests).toBeDefined();
        });

        it('should return empty array when no data', () => {
            (useAuthStore as any).mockReturnValue(null);

            const { result } = renderHook(() => useFriendRequests('received'), { wrapper });

            expect(result.current.requests).toEqual([]);
            expect(result.current.isLoading).toBe(false);
        });

        it('should have fetchNextPage function (no-op)', () => {
            (useAuthStore as any).mockReturnValue(null);

            const { result } = renderHook(() => useFriendRequests('received'), { wrapper });

            expect(result.current.fetchNextPage).toBeDefined();
            expect(typeof result.current.fetchNextPage).toBe('function');

            // Should not throw
            result.current.fetchNextPage();
        });
    });
});
