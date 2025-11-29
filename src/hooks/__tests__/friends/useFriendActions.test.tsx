/**
 * Unit Tests for useFriendActions Hook
 * Story 9.8.2: Unit Tests - React Hooks & State Management
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFriendActions } from '../../friends/useFriendActions';
import { friendsService } from '../../../services/friendsService';
import { useAuthStore } from '../../../store/authStore';
import { toast } from 'react-hot-toast';

// Mock dependencies
vi.mock('../../../services/friendsService');
vi.mock('../../../store/authStore');
vi.mock('react-hot-toast');

describe('useFriendActions', () => {
    let queryClient: QueryClient;
    const mockUser = { id: 'user-123' };

    beforeEach(() => {
        vi.clearAllMocks();

        queryClient = new QueryClient({
            defaultOptions: {
                mutations: {
                    retry: false,
                },
            },
        });

        (useAuthStore as any).mockReturnValue(mockUser);
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    );

    describe('sendRequest', () => {
        it('should send friend request successfully', async () => {
            (friendsService.sendFriendRequest as any).mockResolvedValue({
                success: true,
                data: { id: 'request-123' },
            });

            const { result } = renderHook(() => useFriendActions(), { wrapper });

            await act(async () => {
                await result.current.sendRequest.mutateAsync('user-456');
            });

            expect(friendsService.sendFriendRequest).toHaveBeenCalledWith('user-456');
            expect(toast.success).toHaveBeenCalledWith('Friend request sent!');
        });

        it('should handle send request errors', async () => {
            (friendsService.sendFriendRequest as any).mockRejectedValue(
                new Error('Failed to send')
            );

            const { result } = renderHook(() => useFriendActions(), { wrapper });

            await act(async () => {
                try {
                    await result.current.sendRequest.mutateAsync('user-456');
                } catch (e) {
                    // Expected to throw
                }
            });

            expect(toast.error).toHaveBeenCalledWith('Failed to send friend request');
        });
    });

    describe('acceptRequest', () => {
        it('should accept friend request successfully', async () => {
            (friendsService.acceptFriendRequest as any).mockResolvedValue({
                success: true,
            });

            const { result } = renderHook(() => useFriendActions(), { wrapper });

            await act(async () => {
                await result.current.acceptRequest.mutateAsync('request-123');
            });

            expect(friendsService.acceptFriendRequest).toHaveBeenCalledWith('request-123');
            expect(toast.success).toHaveBeenCalledWith('Friend request accepted!');
        });

        it('should invalidate queries after accepting', async () => {
            (friendsService.acceptFriendRequest as any).mockResolvedValue({
                success: true,
            });

            const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

            const { result } = renderHook(() => useFriendActions(), { wrapper });

            await act(async () => {
                await result.current.acceptRequest.mutateAsync('request-123');
            });

            expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['friends', mockUser.id] });
            expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['friendRequests'] });
        });

        it('should handle accept request errors', async () => {
            (friendsService.acceptFriendRequest as any).mockRejectedValue(
                new Error('Failed to accept')
            );

            const { result } = renderHook(() => useFriendActions(), { wrapper });

            await act(async () => {
                try {
                    await result.current.acceptRequest.mutateAsync('request-123');
                } catch (e) {
                    // Expected to throw
                }
            });

            expect(toast.error).toHaveBeenCalledWith('Failed to accept friend request');
        });
    });

    describe('rejectRequest', () => {
        it('should reject friend request successfully', async () => {
            (friendsService.rejectFriendRequest as any).mockResolvedValue({
                success: true,
            });

            const { result } = renderHook(() => useFriendActions(), { wrapper });

            await act(async () => {
                await result.current.rejectRequest.mutateAsync('request-123');
            });

            expect(friendsService.rejectFriendRequest).toHaveBeenCalledWith('request-123');
            expect(toast.success).toHaveBeenCalledWith('Friend request rejected');
        });

        it('should handle reject request errors', async () => {
            (friendsService.rejectFriendRequest as any).mockRejectedValue(
                new Error('Failed to reject')
            );

            const { result } = renderHook(() => useFriendActions(), { wrapper });

            await act(async () => {
                try {
                    await result.current.rejectRequest.mutateAsync('request-123');
                } catch (e) {
                    // Expected to throw
                }
            });

            expect(toast.error).toHaveBeenCalledWith('Failed to reject friend request');
        });
    });

    describe('cancelRequest', () => {
        it('should cancel friend request successfully', async () => {
            (friendsService.cancelFriendRequest as any).mockResolvedValue({
                success: true,
            });

            const { result } = renderHook(() => useFriendActions(), { wrapper });

            await act(async () => {
                await result.current.cancelRequest.mutateAsync('request-123');
            });

            expect(friendsService.cancelFriendRequest).toHaveBeenCalledWith('request-123');
            expect(toast.success).toHaveBeenCalledWith('Friend request cancelled');
        });

        it('should handle cancel request errors', async () => {
            (friendsService.cancelFriendRequest as any).mockRejectedValue(
                new Error('Failed to cancel')
            );

            const { result } = renderHook(() => useFriendActions(), { wrapper });

            await act(async () => {
                try {
                    await result.current.cancelRequest.mutateAsync('request-123');
                } catch (e) {
                    // Expected to throw
                }
            });

            expect(toast.error).toHaveBeenCalledWith('Failed to cancel friend request');
        });
    });

    describe('unfriend', () => {
        it('should unfriend user successfully', async () => {
            (friendsService.unfriend as any).mockResolvedValue({
                success: true,
            });

            const { result } = renderHook(() => useFriendActions(), { wrapper });

            await act(async () => {
                await result.current.unfriend.mutateAsync('friend-456');
            });

            expect(friendsService.unfriend).toHaveBeenCalledWith('friend-456');
            expect(toast.success).toHaveBeenCalledWith('Friend removed');
        });

        it('should perform optimistic update', async () => {
            const mockFriendsData = {
                success: true,
                data: [
                    { friend: { id: 'friend-456', full_name: 'John Doe' } },
                    { friend: { id: 'friend-789', full_name: 'Jane Smith' } },
                ],
            };

            queryClient.setQueryData(['friends', mockUser.id], mockFriendsData);

            (friendsService.unfriend as any).mockImplementation(
                () => new Promise(resolve => setTimeout(() => resolve({ success: true }), 100))
            );

            const { result } = renderHook(() => useFriendActions(), { wrapper });

            act(() => {
                result.current.unfriend.mutate('friend-456');
            });

            // Check optimistic update happened
            await waitFor(() => {
                const data = queryClient.getQueryData(['friends', mockUser.id]) as any;
                expect(data?.data).toHaveLength(1);
                expect(data?.data[0].friend.id).toBe('friend-789');
            });
        });

        it('should revert optimistic update on error', async () => {
            const mockFriendsData = {
                success: true,
                data: [
                    { friend: { id: 'friend-456', full_name: 'John Doe' } },
                ],
            };

            queryClient.setQueryData(['friends', mockUser.id], mockFriendsData);

            (friendsService.unfriend as any).mockRejectedValue(
                new Error('Failed to unfriend')
            );

            const { result } = renderHook(() => useFriendActions(), { wrapper });

            await act(async () => {
                try {
                    await result.current.unfriend.mutateAsync('friend-456');
                } catch (e) {
                    // Expected to throw
                }
            });

            // Check data was reverted
            const data = queryClient.getQueryData(['friends', mockUser.id]);
            expect(data).toEqual(mockFriendsData);
            expect(toast.error).toHaveBeenCalledWith('Failed to unfriend user');
        });
    });

    describe('blockUser', () => {
        it('should block user successfully', async () => {
            (friendsService.blockUser as any).mockResolvedValue({
                success: true,
            });

            const { result } = renderHook(() => useFriendActions(), { wrapper });

            await act(async () => {
                await result.current.blockUser.mutateAsync({
                    userId: 'user-456',
                    reason: 'spam',
                });
            });

            expect(friendsService.blockUser).toHaveBeenCalledWith('user-456', 'spam');
            expect(toast.success).toHaveBeenCalledWith('User blocked');
        });

        it('should block user without reason', async () => {
            (friendsService.blockUser as any).mockResolvedValue({
                success: true,
            });

            const { result } = renderHook(() => useFriendActions(), { wrapper });

            await act(async () => {
                await result.current.blockUser.mutateAsync({
                    userId: 'user-456',
                });
            });

            expect(friendsService.blockUser).toHaveBeenCalledWith('user-456', undefined);
        });

        it('should handle block user errors', async () => {
            (friendsService.blockUser as any).mockRejectedValue(
                new Error('Failed to block')
            );

            const { result } = renderHook(() => useFriendActions(), { wrapper });

            await act(async () => {
                try {
                    await result.current.blockUser.mutateAsync({
                        userId: 'user-456',
                    });
                } catch (e) {
                    // Expected to throw
                }
            });

            expect(toast.error).toHaveBeenCalledWith('Failed to block user');
        });
    });
});
