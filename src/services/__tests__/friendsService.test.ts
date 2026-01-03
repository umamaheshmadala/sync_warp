/**
 * Comprehensive Unit Tests for friendsService
 * Story 9.8.1: Unit Tests - Services & Database Functions
 * 
 * Fixed to properly handle Supabase query chaining and multiple calls
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { friendsService } from '../friendsService';
import { supabase } from '../../lib/supabase';
import { offlineQueue } from '../offlineQueue';
import { createMockFriend, createMockFriendRequest, createMockProfile } from '../../__tests__/utils/mockData';

// Mock Supabase
vi.mock('../../lib/supabase', () => ({
    supabase: {
        from: vi.fn(),
        rpc: vi.fn(),
        channel: vi.fn(() => ({
            on: vi.fn().mockReturnThis(),
            subscribe: vi.fn(),
            unsubscribe: vi.fn(),
        })),
        removeChannel: vi.fn(),
        auth: {
            getUser: vi.fn(),
        },
    },
}));

// Mock offline queue
vi.mock('../offlineQueue', () => ({
    offlineQueue: {
        isOnline: vi.fn(),
        add: vi.fn(),
    },
}));

// Mock error handler
vi.mock('../../utils/errorHandler', () => ({
    withRetry: vi.fn((fn) => fn()),
    friendsCircuitBreaker: {
        execute: vi.fn((fn) => fn()),
    },
    getUserFriendlyErrorMessage: vi.fn((error: any) => error?.message || 'Unable to complete the request. Please try again.'),
    logError: vi.fn(),
}));

describe('friendsService', () => {
    const mockUser = { id: 'user-123' };

    beforeEach(() => {
        vi.resetAllMocks();
        (supabase.auth.getUser as any).mockResolvedValue({
            data: { user: mockUser },
            error: null,
        });
        (offlineQueue.isOnline as any).mockResolvedValue(true);
        (offlineQueue.add as any).mockResolvedValue('queued-id');
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('getFriends', () => {
        it('should return friends list on success', async () => {
            const mockFriendships = [{ friend_id: 'friend-1' }, { friend_id: 'friend-2' }];
            const mockProfiles = [
                createMockFriend({ id: 'friend-1', full_name: 'John Doe' }),
                createMockFriend({ id: 'friend-2', full_name: 'Jane Smith' }),
            ];

            // First call: get friendships
            const friendshipsQuery = {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                order: vi.fn().mockResolvedValue({ data: mockFriendships, error: null }),
            };

            // Second call: get profiles
            const profilesQuery = {
                select: vi.fn().mockReturnThis(),
                in: vi.fn().mockResolvedValue({ data: mockProfiles, error: null }),
            };

            (supabase.from as any)
                .mockReturnValueOnce(friendshipsQuery)
                .mockReturnValueOnce(profilesQuery);

            const result = await friendsService.getFriends('user-123');

            expect(result.success).toBe(true);
            expect(result.data).toHaveLength(2);
            expect(result.data?.[0].full_name).toBe('John Doe');
        });

        it('should return empty array when no friends', async () => {
            const friendshipsQuery = {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                order: vi.fn().mockResolvedValue({ data: [], error: null }),
            };

            (supabase.from as any).mockReturnValue(friendshipsQuery);

            const result = await friendsService.getFriends('user-123');

            expect(result.success).toBe(true);
            expect(result.data).toEqual([]);
        });

        it('should handle database errors', async () => {
            const friendshipsQuery = {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                order: vi.fn().mockResolvedValue({
                    data: null,
                    error: { message: 'Database error' },
                }),
            };

            (supabase.from as any).mockReturnValue(friendshipsQuery);

            const result = await friendsService.getFriends('user-123');

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });
    });

    describe('sendFriendRequest', () => {
        it('should send friend request successfully', async () => {
            const mockRequest = createMockFriendRequest();

            // Mock privacy check
            (supabase.rpc as any).mockResolvedValueOnce({ data: true, error: null });

            // Mock insert
            const insertQuery = {
                insert: vi.fn().mockReturnThis(),
                select: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ data: mockRequest, error: null }),
            };

            (supabase.from as any).mockReturnValue(insertQuery);

            const result = await friendsService.sendFriendRequest('user-456', 'Hello!');

            expect(result.success).toBe(true);
            expect(result.data?.id).toBe(mockRequest.id);
            expect(result.queued).toBeUndefined();
        });

        it('should queue request when offline', async () => {
            (offlineQueue.isOnline as any).mockResolvedValue(false);

            const result = await friendsService.sendFriendRequest('user-456', 'Hello!');

            expect(result.success).toBe(true);
            expect(result.queued).toBe(true);
            expect(offlineQueue.add).toHaveBeenCalledWith('friend_request', {
                receiverId: 'user-456',
                message: 'Hello!',
            });
        });

        it('should handle privacy settings blocking request', async () => {
            (supabase.rpc as any).mockResolvedValueOnce({ data: false, error: null });

            const result = await friendsService.sendFriendRequest('user-456');

            expect(result.success).toBe(false);
            expect(result.error).toContain('privacy settings');
        });

        it('should handle database errors', async () => {
            (supabase.rpc as any).mockResolvedValueOnce({ data: true, error: null });

            const insertQuery = {
                insert: vi.fn().mockReturnThis(),
                select: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({
                    data: null,
                    error: { message: 'Database error' },
                }),
            };

            (supabase.from as any).mockReturnValue(insertQuery);

            const result = await friendsService.sendFriendRequest('user-456');

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });
    });

    describe('acceptFriendRequest', () => {
        it('should accept friend request successfully', async () => {
            (supabase.rpc as any).mockResolvedValue({ error: null });

            const result = await friendsService.acceptFriendRequest('request-1');

            expect(result.success).toBe(true);
            expect(supabase.rpc).toHaveBeenCalledWith('accept_friend_request', {
                request_id: 'request-1',
            });
        });

        it('should handle RPC errors', async () => {
            (supabase.rpc as any).mockResolvedValue({
                error: { message: 'Request not found' },
            });

            const result = await friendsService.acceptFriendRequest('request-1');

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });
    });

    describe('rejectFriendRequest', () => {
        it('should reject friend request successfully', async () => {
            const updateQuery = {
                update: vi.fn().mockReturnThis(),
                eq: vi.fn().mockResolvedValue({ error: null }),
            };

            (supabase.from as any).mockReturnValue(updateQuery);

            const result = await friendsService.rejectFriendRequest('request-1');

            expect(result.success).toBe(true);
        });

        it('should handle database errors', async () => {
            const updateQuery = {
                update: vi.fn().mockReturnThis(),
                eq: vi.fn().mockResolvedValue({
                    error: { message: 'Database error' },
                }),
            };

            (supabase.from as any).mockReturnValue(updateQuery);

            const result = await friendsService.rejectFriendRequest('request-1');

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });
    });

    describe('cancelFriendRequest', () => {
        it('should cancel friend request successfully', async () => {
            const deleteQuery = {
                delete: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ error: null }),
            };

            (supabase.from as any).mockReturnValue(deleteQuery);

            const result = await friendsService.cancelFriendRequest('request-1');

            expect(result.success).toBe(true);
        });

        it('should handle authentication errors', async () => {
            (supabase.auth.getUser as any).mockResolvedValue({
                data: { user: null },
                error: null,
            });

            const result = await friendsService.cancelFriendRequest('request-1');

            expect(result.success).toBe(false);
            expect(result.error).toContain('authenticated');
        });
    });

    describe('unfriend', () => {
        it('should unfriend user successfully', async () => {
            (supabase.rpc as any).mockResolvedValue({ error: null });

            const result = await friendsService.unfriend('friend-1');

            expect(result.success).toBe(true);
            expect(supabase.rpc).toHaveBeenCalledWith('unfriend_user', {
                p_friend_id: 'friend-1',
            });
        });

        it('should handle RPC errors', async () => {
            (supabase.rpc as any).mockResolvedValue({
                error: { message: 'User not found' },
            });

            const result = await friendsService.unfriend('friend-1');

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });
    });

    describe('blockUser', () => {
        it('should block user successfully', async () => {
            (supabase.rpc as any).mockResolvedValue({ error: null });

            const result = await friendsService.blockUser('user-456', 'Spam');

            expect(result.success).toBe(true);
            expect(supabase.rpc).toHaveBeenCalledWith('block_user', {
                p_blocked_user_id: 'user-456',
                p_reason: 'Spam',
            });
        });

        it('should block user without reason', async () => {
            (supabase.rpc as any).mockResolvedValue({ error: null });

            const result = await friendsService.blockUser('user-456');

            expect(result.success).toBe(true);
            expect(supabase.rpc).toHaveBeenCalledWith('block_user', {
                p_blocked_user_id: 'user-456',
                p_reason: undefined,
            });
        });
    });

    describe('unblockUser', () => {
        it('should unblock user successfully', async () => {
            const deleteQuery = {
                delete: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ error: null }),
            };

            (supabase.from as any).mockReturnValue(deleteQuery);

            const result = await friendsService.unblockUser('user-456');

            expect(result.success).toBe(true);
        });
    });

    describe('searchMyFriends', () => {
        it('should search friends successfully', async () => {
            const mockData = [
                { friend: createMockFriend({ full_name: 'John Doe' }) },
                { friend: createMockFriend({ full_name: 'Jane Doe' }) },
            ];

            const searchQuery = {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                or: vi.fn().mockResolvedValue({ data: mockData, error: null }),
            };

            (supabase.from as any).mockReturnValue(searchQuery);

            const result = await friendsService.searchMyFriends('Doe');

            expect(result.success).toBe(true);
            expect(result.data).toHaveLength(2);
        });
    });

    describe('searchUsers', () => {
        it('should search users successfully', async () => {
            const mockUsers = [createMockProfile({ full_name: 'Jane Doe' })];
            (supabase.rpc as any).mockResolvedValue({ data: mockUsers, error: null });

            const result = await friendsService.searchUsers('Jane');

            expect(result.success).toBe(true);
            expect(result.data).toHaveLength(1);
            expect(supabase.rpc).toHaveBeenCalledWith('search_users', expect.objectContaining({
                search_query: 'Jane',
                current_user_id: mockUser.id,
            }));
        });

        it('should trim search query', async () => {
            (supabase.rpc as any).mockResolvedValue({ data: [], error: null });

            await friendsService.searchUsers('  Jane  ');

            expect(supabase.rpc).toHaveBeenCalledWith('search_users', expect.objectContaining({
                search_query: 'Jane',
            }));
        });
    });

    describe('getSentRequests', () => {
        it('should get sent requests successfully', async () => {
            const mockRequests = [
                { ...createMockFriendRequest(), receiver: createMockProfile() },
            ];

            const selectQuery = {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                order: vi.fn().mockResolvedValue({ data: mockRequests, error: null }),
            };

            (supabase.from as any).mockReturnValue(selectQuery);

            const result = await friendsService.getSentRequests();

            expect(result.success).toBe(true);
            expect(result.data).toHaveLength(1);
        });
    });

    describe('getMutualFriends', () => {
        it('should get mutual friends successfully', async () => {
            const mockMutualFriends = [createMockFriend(), createMockFriend()];
            (supabase.rpc as any).mockResolvedValue({ data: mockMutualFriends, error: null });

            const result = await friendsService.getMutualFriends('user-456');

            expect(result.success).toBe(true);
            expect(result.data).toHaveLength(2);
            expect(supabase.rpc).toHaveBeenCalledWith('get_mutual_friends', {
                user_id_1: mockUser.id,
                user_id_2: 'user-456',
            });
        });
    });

    describe('getOnlineFriendsCount', () => {
        it('should get online friends count', async () => {
            const mockData = [
                { friend: { is_online: true } },
                { friend: { is_online: false } },
                { friend: { is_online: true } },
            ];

            const selectQuery = {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockResolvedValue({ data: mockData, error: null }),
            };

            (supabase.from as any).mockReturnValue(selectQuery);

            const result = await friendsService.getOnlineFriendsCount('user-123');

            expect(result.success).toBe(true);
            expect(result.data).toBe(2);
        });
    });

    describe('getFriendRequests', () => {
        it('should get received requests', async () => {
            const mockRequests = [
                { ...createMockFriendRequest(), requester: createMockProfile(), receiver: createMockProfile() },
            ];

            const selectQuery = {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                order: vi.fn().mockResolvedValue({ data: mockRequests, error: null }),
            };

            (supabase.from as any).mockReturnValue(selectQuery);

            const result = await friendsService.getFriendRequests(mockUser.id);

            expect(result.success).toBe(true);
            expect(result.data).toHaveLength(1);
        });
    });

    describe('updateOnlineStatus', () => {
        it('should update online status successfully', async () => {
            const updateQuery = {
                update: vi.fn().mockReturnThis(),
                eq: vi.fn().mockResolvedValue({ error: null }),
            };

            (supabase.from as any).mockReturnValue(updateQuery);

            const result = await friendsService.updateOnlineStatus('user-123', true);

            expect(result.success).toBe(true);
        });
    });

    describe('getFriendActivity', () => {
        it('should get friend activity successfully', async () => {
            // Mock getFriends - first call for friendships, second for profiles
            const friendshipsQuery = {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                order: vi.fn().mockResolvedValue({ data: [{ friend_id: 'friend-1' }], error: null }),
            };

            const profilesQuery = {
                select: vi.fn().mockReturnThis(),
                in: vi.fn().mockResolvedValue({ data: [createMockFriend({ id: 'friend-1' })], error: null }),
            };

            // Mock activity query
            const activityQuery = {
                select: vi.fn().mockReturnThis(),
                in: vi.fn().mockReturnThis(),
                order: vi.fn().mockReturnThis(),
                limit: vi.fn().mockResolvedValue({ data: [{ id: 'activity-1', type: 'deal_shared' }], error: null }),
            };

            (supabase.from as any)
                .mockReturnValueOnce(friendshipsQuery)
                .mockReturnValueOnce(profilesQuery)
                .mockReturnValueOnce(activityQuery);

            const result = await friendsService.getFriendActivity('user-123');

            expect(result.success).toBe(true);
            expect(result.data).toHaveLength(1);
        });
    });

    describe('createActivity', () => {
        it('should create activity successfully', async () => {
            const insertQuery = {
                insert: vi.fn().mockResolvedValue({ error: null }),
            };

            (supabase.from as any).mockReturnValue(insertQuery);

            const result = await friendsService.createActivity('user-123', 'deal_shared', {
                deal_id: 'deal-1',
                deal_title: 'Amazing Deal',
            });

            expect(result.success).toBe(true);
        });
    });

    describe('shareDeal', () => {
        it('should share deal successfully', async () => {
            const insertQuery = {
                insert: vi.fn().mockResolvedValue({ error: null }),
            };

            (supabase.from as any).mockReturnValue(insertQuery);

            const result = await friendsService.shareDeal('user-123', 'user-456', {
                title: 'Amazing Deal',
                id: 'deal-1',
            });

            expect(result.success).toBe(true);
        });
    });

    describe('areFriends', () => {
        it('should return true if users are friends', async () => {
            const selectQuery = {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'friendship-1' }, error: null }),
            };

            (supabase.from as any).mockReturnValue(selectQuery);

            const result = await friendsService.areFriends('user-123', 'user-456');

            expect(result).toBe(true);
        });

        it('should return false if users are not friends', async () => {
            const selectQuery = {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            };

            (supabase.from as any).mockReturnValue(selectQuery);

            const result = await friendsService.areFriends('user-123', 'user-456');

            expect(result).toBe(false);
        });
    });

    describe('getFriendCount', () => {
        it('should get friend count successfully', async () => {
            const selectQuery = {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockResolvedValue({ count: 10, error: null }),
            };

            (supabase.from as any).mockReturnValue(selectQuery);

            const result = await friendsService.getFriendCount('user-123');

            expect(result).toBe(10);
        });

        it('should return 0 on error', async () => {
            const selectQuery = {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockResolvedValue({ count: null, error: { message: 'Error' } }),
            };

            (supabase.from as any).mockReturnValue(selectQuery);

            const result = await friendsService.getFriendCount('user-123');

            expect(result).toBe(0);
        });
    });

    describe('getPymkSuggestions', () => {
        it('should get PYMK suggestions', async () => {
            const mockSuggestions = [{ id: 'user-3', mutual_friends_count: 2 }];
            (supabase.rpc as any).mockResolvedValue({ data: mockSuggestions, error: null });

            const result = await friendsService.getPymkSuggestions(mockUser.id);

            expect(result.success).toBe(true);
            expect(result.data).toHaveLength(1);
        });
    });

    describe('dismissPymkSuggestion', () => {
        it('should dismiss PYMK suggestion successfully', async () => {
            (supabase.rpc as any).mockResolvedValue({ error: null });

            const result = await friendsService.dismissPymkSuggestion('user-789');

            expect(result.success).toBe(true);
            expect(supabase.rpc).toHaveBeenCalledWith('dismiss_pymk_suggestion', {
                target_user_id: 'user-789',
            });
        });
    });

    describe('saveFriendSearchQuery', () => {
        it('should save search query successfully', async () => {
            (supabase.rpc as any).mockResolvedValue({ error: null });

            await friendsService.saveFriendSearchQuery('test query');

            expect(supabase.rpc).toHaveBeenCalledWith('save_search_query', {
                p_user_id: mockUser.id,
                p_query: 'test query',
            });
        });

        it('should handle errors silently', async () => {
            (supabase.rpc as any).mockResolvedValue({
                error: { message: 'Database error' },
            });

            // Should not throw
            await expect(friendsService.saveFriendSearchQuery('test')).resolves.toBeUndefined();
        });
    });

    describe('getFriendSearchHistory', () => {
        it('should get search history', async () => {
            const mockHistory = [{ query: 'test', searched_at: '2024-01-01' }];
            (supabase.rpc as any).mockResolvedValue({ data: mockHistory, error: null });

            const result = await friendsService.getFriendSearchHistory();

            expect(result.success).toBe(true);
            expect(result.data).toHaveLength(1);
        });
    });

    describe('Real-time subscriptions', () => {
        it('should subscribe to friend updates', () => {
            const callback = vi.fn();
            const mockChannel = {
                on: vi.fn().mockReturnThis(),
                subscribe: vi.fn(),
            };
            (supabase.channel as any).mockReturnValue(mockChannel);

            friendsService.subscribeToFriendUpdates('user-123', callback);

            expect(supabase.channel).toHaveBeenCalledWith('friend_updates');
            expect(mockChannel.on).toHaveBeenCalled();
            expect(mockChannel.subscribe).toHaveBeenCalled();
        });

        it('should subscribe to friendship changes', () => {
            const callback = vi.fn();
            const mockChannel = {
                on: vi.fn().mockReturnThis(),
                subscribe: vi.fn(),
            };
            (supabase.channel as any).mockReturnValue(mockChannel);

            friendsService.subscribeToFriendshipChanges('user-123', callback);

            expect(supabase.channel).toHaveBeenCalledWith('friendships_changes');
            expect(mockChannel.on).toHaveBeenCalled();
            expect(mockChannel.subscribe).toHaveBeenCalled();
        });
    });
});
