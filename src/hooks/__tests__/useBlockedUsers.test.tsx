/**
 * Unit Tests for useBlockedUsers and Related Hooks
 * Story 9.8.2: Unit Tests - React Hooks & State Management
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
    useBlockedUsers,
    useBlockedUsersCount,
    useIsBlocked,
    useBlockUser,
    useUnblockUser,
} from '../../useBlock';
import * as blockService from '../../../services/blockService';
import { useAuthStore } from '../../../store/authStore';
import toast from 'react-hot-toast';

// Mock dependencies
vi.mock('../../../services/blockService');
vi.mock('../../../store/authStore');
vi.mock('react-hot-toast');

describe('useBlock Hooks', () => {
    let queryClient: QueryClient;
    const mockUser = { id: 'user-123' };

    beforeEach(() => {
        vi.clearAllMocks();

        queryClient = new QueryClient({
            defaultOptions: {
                queries: {
                    retry: false,
                },
                mutations: {
                    retry: false,
                },
            },
        });

        (useAuthStore as any).mockReturnValue(mockUser);
        (blockService.subscribeToBlockChanges as any).mockReturnValue(() => { });
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    );

    describe('useBlockedUsers', () => {
        it('should fetch blocked users on mount', async () => {
            const mockBlockedUsers = [
                { id: 'block-1', blocked_id: 'user-456', blocked_user: { full_name: 'John Doe' } },
                { id: 'block-2', blocked_id: 'user-789', blocked_user: { full_name: 'Jane Smith' } },
            ];

            (blockService.getBlockedUsers as any).mockResolvedValue(mockBlockedUsers);

            const { result } = renderHook(() => useBlockedUsers(), { wrapper });

            expect(result.current.isLoading).toBe(true);

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });

            expect(result.current.data).toEqual(mockBlockedUsers);
            expect(blockService.getBlockedUsers).toHaveBeenCalled();
        });

        it('should not fetch when user is not authenticated', () => {
            (useAuthStore as any).mockReturnValue(null);

            const { result } = renderHook(() => useBlockedUsers(), { wrapper });

            expect(result.current.isLoading).toBe(false);
            expect(blockService.getBlockedUsers).not.toHaveBeenCalled();
        });

        it('should handle fetch errors', async () => {
            (blockService.getBlockedUsers as any).mockRejectedValue(
                new Error('Failed to fetch')
            );

            const { result } = renderHook(() => useBlockedUsers(), { wrapper });

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });

            expect(result.current.error).toBeTruthy();
        });

        it('should subscribe to realtime changes', () => {
            const mockUnsubscribe = vi.fn();
            (blockService.subscribeToBlockChanges as any).mockReturnValue(mockUnsubscribe);

            const { unmount } = renderHook(() => useBlockedUsers(), { wrapper });

            expect(blockService.subscribeToBlockChanges).toHaveBeenCalled();

            unmount();

            expect(mockUnsubscribe).toHaveBeenCalled();
        });
    });

    describe('useBlockedUsersCount', () => {
        it('should fetch blocked users count', async () => {
            (blockService.getBlockedUsersCount as any).mockResolvedValue(5);

            const { result } = renderHook(() => useBlockedUsersCount(), { wrapper });

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });

            expect(result.current.data).toBe(5);
            expect(blockService.getBlockedUsersCount).toHaveBeenCalled();
        });

        it('should not fetch when user is not authenticated', () => {
            (useAuthStore as any).mockReturnValue(null);

            const { result } = renderHook(() => useBlockedUsersCount(), { wrapper });

            expect(result.current.isLoading).toBe(false);
            expect(blockService.getBlockedUsersCount).not.toHaveBeenCalled();
        });
    });

    describe('useIsBlocked', () => {
        it('should check if user is blocked', async () => {
            (blockService.isUserBlocked as any).mockResolvedValue(true);

            const { result } = renderHook(() => useIsBlocked('user-456'), { wrapper });

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });

            expect(result.current.data).toBe(true);
            expect(blockService.isUserBlocked).toHaveBeenCalledWith('user-456');
        });

        it('should return false when user is not blocked', async () => {
            (blockService.isUserBlocked as any).mockResolvedValue(false);

            const { result } = renderHook(() => useIsBlocked('user-456'), { wrapper });

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });

            expect(result.current.data).toBe(false);
        });

        it('should not fetch when userId is empty', () => {
            const { result } = renderHook(() => useIsBlocked(''), { wrapper });

            expect(result.current.isLoading).toBe(false);
            expect(blockService.isUserBlocked).not.toHaveBeenCalled();
        });
    });

    describe('useBlockUser', () => {
        it('should block user successfully', async () => {
            const mockResult = {
                success: true,
                already_blocked: false,
                friendships_removed: 1,
                follows_removed: 0,
                requests_cancelled: 0,
            };

            (blockService.blockUser as any).mockResolvedValue(mockResult);

            const { result } = renderHook(() => useBlockUser(), { wrapper });

            await act(async () => {
                await result.current.mutateAsync({
                    userId: 'user-456',
                    reason: 'spam',
                });
            });

            expect(blockService.blockUser).toHaveBeenCalledWith('user-456', 'spam');
            expect(toast.success).toHaveBeenCalled();
        });

        it('should perform optimistic update', async () => {
            (blockService.blockUser as any).mockImplementation(
                () => new Promise(resolve => setTimeout(() => resolve({
                    success: true,
                    already_blocked: false,
                    friendships_removed: 0,
                    follows_removed: 0,
                    requests_cancelled: 0,
                }), 100))
            );

            const { result } = renderHook(() => useBlockUser(), { wrapper });

            act(() => {
                result.current.mutate({ userId: 'user-456' });
            });

            // Check optimistic update
            await waitFor(() => {
                expect(toast.loading).toHaveBeenCalledWith('Blocking user...', { id: 'block-user-456' });
            });
        });

        it('should handle already blocked user', async () => {
            const mockResult = {
                success: true,
                already_blocked: true,
                friendships_removed: 0,
                follows_removed: 0,
                requests_cancelled: 0,
            };

            (blockService.blockUser as any).mockResolvedValue(mockResult);

            const { result } = renderHook(() => useBlockUser(), { wrapper });

            await act(async () => {
                await result.current.mutateAsync({ userId: 'user-456' });
            });

            expect(toast.success).toHaveBeenCalledWith('User was already blocked');
        });

        it('should show detailed success message', async () => {
            const mockResult = {
                success: true,
                already_blocked: false,
                friendships_removed: 2,
                follows_removed: 1,
                requests_cancelled: 3,
            };

            (blockService.blockUser as any).mockResolvedValue(mockResult);

            const { result } = renderHook(() => useBlockUser(), { wrapper });

            await act(async () => {
                await result.current.mutateAsync({ userId: 'user-456' });
            });

            expect(toast.success).toHaveBeenCalledWith(
                expect.stringContaining('2 friendship(s) removed')
            );
        });

        it('should handle block errors', async () => {
            (blockService.blockUser as any).mockRejectedValue(
                new Error('Failed to block')
            );

            const { result } = renderHook(() => useBlockUser(), { wrapper });

            await act(async () => {
                try {
                    await result.current.mutateAsync({ userId: 'user-456' });
                } catch (e) {
                    // Expected to throw
                }
            });

            expect(toast.error).toHaveBeenCalledWith('Failed to block user: Failed to block');
        });
    });

    describe('useUnblockUser', () => {
        it('should unblock user successfully', async () => {
            const mockResult = {
                success: true,
            };

            (blockService.unblockUser as any).mockResolvedValue(mockResult);

            const { result } = renderHook(() => useUnblockUser(), { wrapper });

            await act(async () => {
                await result.current.mutateAsync('user-456');
            });

            expect(blockService.unblockUser).toHaveBeenCalledWith('user-456');
            expect(toast.success).toHaveBeenCalledWith(
                'User unblocked successfully. They can now see your profile again.'
            );
        });

        it('should perform optimistic update', async () => {
            (blockService.unblockUser as any).mockImplementation(
                () => new Promise(resolve => setTimeout(() => resolve({ success: true }), 100))
            );

            const { result } = renderHook(() => useUnblockUser(), { wrapper });

            act(() => {
                result.current.mutate('user-456');
            });

            // Check optimistic update
            await waitFor(() => {
                expect(toast.loading).toHaveBeenCalledWith('Unblocking user...', { id: 'unblock-user-456' });
            });
        });

        it('should handle unblock errors', async () => {
            (blockService.unblockUser as any).mockRejectedValue(
                new Error('Failed to unblock')
            );

            const { result } = renderHook(() => useUnblockUser(), { wrapper });

            await act(async () => {
                try {
                    await result.current.mutateAsync('user-456');
                } catch (e) {
                    // Expected to throw
                }
            });

            expect(toast.error).toHaveBeenCalledWith('Failed to unblock user: Failed to unblock');
        });

        it('should invalidate queries after unblocking', async () => {
            (blockService.unblockUser as any).mockResolvedValue({ success: true });

            const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

            const { result } = renderHook(() => useUnblockUser(), { wrapper });

            await act(async () => {
                await result.current.mutateAsync('user-456');
            });

            expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['blocks'] });
        });
    });
});
