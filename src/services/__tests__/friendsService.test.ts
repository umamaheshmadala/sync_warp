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

// Mock Supabase
vi.mock('../../lib/supabase', () => ({
    supabase: {
        from: vi.fn(),
        rpc: vi.fn(),
        auth: {
            getUser: vi.fn(),
        },
    },
}));

describe('friendsService', () => {
    beforeEach(() => {
        vi.resetAllMocks();
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

            (supabase.auth.getUser as any).mockResolvedValue({
                data: { user: mockUser },
            });

            (supabase.from as any).mockReturnValue({
                insert: vi.fn().mockReturnThis(),
                select: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ data: mockRequest, error: null }),
            });

            const result = await friendsService.sendFriendRequest('user-456', 'Hello!');

            expect(result.success).toBe(true);
            expect(result.data?.id).toBe('request-1');
        });

        it('should handle unauthenticated user', async () => {
            (supabase.auth.getUser as any).mockResolvedValue({
                data: { user: null },
            });

            const result = await friendsService.sendFriendRequest('user-
