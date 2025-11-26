/**
 * Unit tests for friendsService
 * Story 9.4.1: Friends Service Layer - Core Service
 */

/**
 * Unit tests for friendsService
 * Story 9.4.1: Friends Service Layer - Core Service
 */

/**
 * Unit tests for friendsService
 * Story 9.4.1: Friends Service Layer - Core Service
 */

/**
 * Unit tests for friendsService
 * Story 9.4.1: Friends Service Layer - Core Service
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { friendsService } from '../friendsService';
import { supabase } from '../../lib/supabase';
import { offlineQueue } from '../offlineQueue';

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

describe('friendsService', () => {
    const mockUser = { id: 'user-123' };

    beforeEach(() => {
        vi.resetAllMocks();
        (supabase.auth.getUser as any).mockResolvedValue({
            data: { user: mockUser },
        });
        vi.spyOn(offlineQueue, 'isOnline').mockResolvedValue(true);
        vi.spyOn(offlineQueue, 'add').mockResolvedValue('queued-id');
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

            (supabase.from as any).mockReturnValue({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                order: vi.fn().mockResolvedValue({ data: mockFriends, error: null }),
            });

            const result = await friendsService.getFriends('user-id');

            expect(result.success).toBe(true);
            expect(result.data).toHaveLength(1);
            expect(result.data?.[0].full_name).toBe('John Doe');
        });

        it('should handle errors gracefully', async () => {
            (supabase.from as any).mockReturnValue({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                order: vi.fn().mockResolvedValue({
                    data: null,
                    error: new Error('Database error'),
                }),
            });

            const result = await friendsService.getFriends('user-id');

            expect(result.success).toBe(false);
            expect(result.error).toBe('Unable to complete the request. Please try again.');
        });
    });

    describe('sendFriendRequest', () => {
        it('should send friend request successfully', async () => {
            const mockRequest = {
                id: 'request-1',
                sender_id: 'user-123',
                receiver_id: 'user-456',
                status: 'pending',
            };

            // Mock privacy check
            (supabase.rpc as any).mockResolvedValueOnce({ data: true, error: null });

            (supabase.from as any).mockReturnValue({
                insert: vi.fn().mockReturnThis(),
                select: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ data: mockRequest, error: null }),
            });

            const result = await friendsService.sendFriendRequest('user-456', 'Hello!');
            console.log('Test Result:', result);

            expect(result.queued).toBeUndefined();
            expect(result.success).toBe(true);
            expect(result.data?.id).toBe('request-1');
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
    });

    describe('searchUsers', () => {
        it('should search users successfully', async () => {
            const mockUsers = [{ id: 'user-2', full_name: 'Jane Doe' }];
            (supabase.rpc as any).mockResolvedValue({ data: mockUsers, error: null });

            const result = await friendsService.searchUsers('Jane');

            expect(result.success).toBe(true);
            expect(result.data).toHaveLength(1);
            expect(supabase.rpc).toHaveBeenCalledWith('search_users', expect.objectContaining({
                search_query: 'Jane',
                current_user_id: mockUser.id
            }));
        });
    });

    describe('getFriendRequests', () => {
        it('should get received requests', async () => {
            const mockRequests = [{ id: 'req-1', requester: { id: 'user-2' } }];
            (supabase.from as any).mockReturnValue({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                order: vi.fn().mockResolvedValue({ data: mockRequests, error: null }),
            });

            const result = await friendsService.getFriendRequests(mockUser.id);

            expect(result.success).toBe(true);
            expect(result.data).toHaveLength(1);
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

    describe('getFriendSearchHistory', () => {
        it('should get search history', async () => {
            const mockHistory = [{ query: 'test', searched_at: '2024-01-01' }];
            (supabase.rpc as any).mockResolvedValue({ data: mockHistory, error: null });

            const result = await friendsService.getFriendSearchHistory();

            expect(result.success).toBe(true);
            expect(result.data).toHaveLength(1);
        });
    });
});
