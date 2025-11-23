/**
 * Unit tests for friendsService
 * Story 9.4.1: Friends Service Layer - Core Service
 */

import { friendsService } from '../friendsService';
import { supabase } from '../../lib/supabase';

// Mock Supabase
jest.mock('../../lib/supabase', () => ({
    supabase: {
        from: jest.fn(),
        rpc: jest.fn(),
        auth: {
            getUser: jest.fn(),
        },
    },
}));

describe('friendsService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getFriends', () => {
        it('should return friends list on success', async () => {
            const mockFriends = [
                {
                    id: '1',
                    friend: {
                        id: 'friend-1',
                        full_name: 'John Doe',
                        username: 'johndoe',
                        email: 'john@example.com',
                        is_online: true,
                        last_active: '2024-01-01T00:00:00Z',
                    },
                },
            ];

            (supabase.from as jest.Mock).mockReturnValue({
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                order: jest.fn().mockResolvedValue({ data: mockFriends, error: null }),
            });

            const result = await friendsService.getFriends('user-id');

            expect(result.success).toBe(true);
            expect(result.data).toHaveLength(1);
            expect(result.data?.[0].full_name).toBe('John Doe');
        });

        it('should handle errors gracefully', async () => {
            (supabase.from as jest.Mock).mockReturnValue({
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                order: jest.fn().mockResolvedValue({
                    data: null,
                    error: new Error('Database error'),
                }),
            });

            const result = await friendsService.getFriends('user-id');

            expect(result.success).toBe(false);
            expect(result.error).toBe('Failed to load friends');
        });
    });

    describe('sendFriendRequest', () => {
        it('should send friend request successfully', async () => {
            const mockUser = { id: 'user-123' };
            const mockRequest = {
                id: 'request-1',
                sender_id: 'user-123',
                receiver_id: 'user-456',
                status: 'pending',
            };

            (supabase.auth.getUser as jest.Mock).mockResolvedValue({
                data: { user: mockUser },
            });

            (supabase.from as jest.Mock).mockReturnValue({
                insert: jest.fn().mockReturnThis(),
                select: jest.fn().mockReturnThis(),
                single: jest.fn().mockResolvedValue({ data: mockRequest, error: null }),
            });

            const result = await friendsService.sendFriendRequest('user-456', 'Hello!');

            expect(result.success).toBe(true);
            expect(result.data?.id).toBe('request-1');
        });

        it('should handle unauthenticated user', async () => {
            (supabase.auth.getUser as jest.Mock).mockResolvedValue({
                data: { user: null },
            });

            const result = await friendsService.sendFriendRequest('user-456');

            expect(result.success).toBe(false);
            expect(result.error).toContain('Not authenticated');
        });
    });

    describe('acceptFriendRequest', () => {
        it('should accept friend request via RPC', async () => {
            (supabase.rpc as jest.Mock).mockResolvedValue({ error: null });

            const result = await friendsService.acceptFriendRequest('request-123');

            expect(result.success).toBe(true);
            expect(supabase.rpc).toHaveBeenCalledWith('accept_friend_request', {
                request_id: 'request-123',
            });
        });

        it('should handle RPC errors', async () => {
            (supabase.rpc as jest.Mock).mockResolvedValue({
                error: new Error('RPC failed'),
            });

            const result = await friendsService.acceptFriendRequest('request-123');

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });
    });

    describe('rejectFriendRequest', () => {
        it('should reject friend request successfully', async () => {
            (supabase.from as jest.Mock).mockReturnValue({
                update: jest.fn().mockReturnThis(),
                eq: jest.fn().mockResolvedValue({ error: null }),
            });

            const result = await friendsService.rejectFriendRequest('request-123');

            expect(result.success).toBe(true);
        });

        it('should handle update errors', async () => {
            (supabase.from as jest.Mock).mockReturnValue({
                update: jest.fn().mockReturnThis(),
                eq: jest.fn().mockResolvedValue({ error: new Error('Update failed') }),
            });

            const result = await friendsService.rejectFriendRequest('request-123');

            expect(result.success).toBe(false);
        });
    });

    describe('unfriend', () => {
        it('should unfriend user via RPC', async () => {
            const mockUser = { id: 'user-123' };

            (supabase.auth.getUser as jest.Mock).mockResolvedValue({
                data: { user: mockUser },
            });
            (supabase.rpc as jest.Mock).mockResolvedValue({ error: null });

            const result = await friendsService.unfriend('friend-456');

            expect(result.success).toBe(true);
            expect(supabase.rpc).toHaveBeenCalledWith('unfriend_user', {
                user_id: 'user-123',
                friend_id: 'friend-456',
            });
        });
    });

    describe('blockUser', () => {
        it('should block user with reason via RPC', async () => {
            const mockUser = { id: 'user-123' };

            (supabase.auth.getUser as jest.Mock).mockResolvedValue({
                data: { user: mockUser },
            });
            (supabase.rpc as jest.Mock).mockResolvedValue({ error: null });

            const result = await friendsService.blockUser('user-456', 'Spam');

            expect(result.success).toBe(true);
            expect(supabase.rpc).toHaveBeenCalledWith('block_user', {
                blocker_id: 'user-123',
                blocked_id: 'user-456',
                block_reason: 'Spam',
            });
        });
    });

    describe('unblockUser', () => {
        it('should unblock user successfully', async () => {
            const mockUser = { id: 'user-123' };

            (supabase.auth.getUser as jest.Mock).mockResolvedValue({
                data: { user: mockUser },
            });

            (supabase.from as jest.Mock).mockReturnValue({
                delete: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis().mockResolvedValue({ error: null }),
            });

            const result = await friendsService.unblockUser('user-456');

            expect(result.success).toBe(true);
        });
    });

    describe('searchFriends', () => {
        it('should search friends by query', async () => {
            const mockUser = { id: 'user-123' };
            const mockResults = [
                {
                    friend: {
                        id: 'friend-1',
                        full_name: 'John Doe',
                        username: 'johndoe',
                    },
                },
            ];

            (supabase.auth.getUser as jest.Mock).mockResolvedValue({
                data: { user: mockUser },
            });

            (supabase.from as jest.Mock).mockReturnValue({
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                or: jest.fn().mockResolvedValue({ data: mockResults, error: null }),
            });

            const result = await friendsService.searchFriends('john');

            expect(result.success).toBe(true);
            expect(result.data).toHaveLength(1);
        });
    });

    describe('getMutualFriends', () => {
        it('should get mutual friends via RPC', async () => {
            const mockUser = { id: 'user-123' };
            const mockMutualFriends = [
                { id: 'mutual-1', full_name: 'Jane Doe' },
            ];

            (supabase.auth.getUser as jest.Mock).mockResolvedValue({
                data: { user: mockUser },
            });

            (supabase.rpc as jest.Mock).mockResolvedValue({
                data: mockMutualFriends,
                error: null,
            });

            const result = await friendsService.getMutualFriends('user-456');

            expect(result.success).toBe(true);
            expect(result.data).toHaveLength(1);
            expect(supabase.rpc).toHaveBeenCalledWith('get_mutual_friends', {
                user_id_1: 'user-123',
                user_id_2: 'user-456',
            });
        });
    });

    describe('getOnlineFriendsCount', () => {
        it('should count online friends', async () => {
            const mockData = [
                { friend: { is_online: true } },
                { friend: { is_online: true } },
                { friend: { is_online: false } },
            ];

            (supabase.from as jest.Mock).mockReturnValue({
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                order: jest.fn().mockResolvedValue({ data: mockData, error: null }),
            });

            const result = await friendsService.getOnlineFriendsCount('user-123');

            expect(result.success).toBe(true);
            expect(result.data).toBe(2);
        });
    });
});
