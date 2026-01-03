/**
 * Unit Tests for recommendationService
 * Story 9.8.1: Unit Tests - Services & Database Functions
 * 
 * Coverage:
 * - getPeopleYouMayKnow
 * - dismissPYMKSuggestion
 * - trackPYMKEvent
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getPeopleYouMayKnow, dismissPYMKSuggestion, trackPYMKEvent } from '../recommendationService';
import { supabase } from '../../lib/supabase';
import { createMockPymkSuggestion } from '../../__tests__/utils/mockData';

// Mock Supabase
vi.mock('../../lib/supabase', () => ({
    supabase: {
        auth: {
            getUser: vi.fn(),
        },
        rpc: vi.fn(),
    },
}));

describe('recommendationService', () => {
    const mockUser = { id: 'user-123' };

    beforeEach(() => {
        vi.resetAllMocks();
        (supabase.auth.getUser as any).mockResolvedValue({
            data: { user: mockUser },
            error: null,
        });
    });

    describe('getPeopleYouMayKnow', () => {
        it('should get PYMK recommendations successfully', async () => {
            const mockRecommendations = [
                createMockPymkSuggestion({
                    user_id: 'user-1',
                    full_name: 'John Doe',
                    mutual_friends_count: 5,
                }),
                createMockPymkSuggestion({
                    user_id: 'user-2',
                    full_name: 'Jane Smith',
                    mutual_friends_count: 3,
                }),
            ];

            (supabase.rpc as any).mockResolvedValue({
                data: mockRecommendations,
                error: null,
            });

            const result = await getPeopleYouMayKnow(20);

            expect(result).toHaveLength(2);
            expect(result[0].full_name).toBe('John Doe');
            expect(result[0].mutual_friends_count).toBe(5);
            expect(supabase.rpc).toHaveBeenCalledWith('get_people_you_may_know', {
                current_user_id: mockUser.id,
                limit_count: 20,
            });
        });

        it('should use default limit of 20', async () => {
            (supabase.rpc as any).mockResolvedValue({
                data: [],
                error: null,
            });

            await getPeopleYouMayKnow();

            expect(supabase.rpc).toHaveBeenCalledWith('get_people_you_may_know', {
                current_user_id: mockUser.id,
                limit_count: 20,
            });
        });

        it('should return empty array when no recommendations', async () => {
            (supabase.rpc as any).mockResolvedValue({
                data: null,
                error: null,
            });

            const result = await getPeopleYouMayKnow();

            expect(result).toEqual([]);
        });

        it('should throw error when user not authenticated', async () => {
            (supabase.auth.getUser as any).mockResolvedValue({
                data: { user: null },
                error: null,
            });

            await expect(getPeopleYouMayKnow()).rejects.toThrow('User not authenticated');
        });

        it('should throw error when RPC fails', async () => {
            (supabase.rpc as any).mockResolvedValue({
                data: null,
                error: { message: 'Database error' },
            });

            await expect(getPeopleYouMayKnow()).rejects.toThrow('Failed to load friend suggestions');
        });
    });

    describe('dismissPYMKSuggestion', () => {
        it('should dismiss suggestion successfully', async () => {
            (supabase.rpc as any).mockResolvedValue({
                error: null,
            });

            await dismissPYMKSuggestion('user-456');

            expect(supabase.rpc).toHaveBeenCalledWith('dismiss_pymk_suggestion', {
                p_user_id: mockUser.id,
                p_suggested_user_id: 'user-456',
            });
        });

        it('should throw error when user not authenticated', async () => {
            (supabase.auth.getUser as any).mockResolvedValue({
                data: { user: null },
                error: null,
            });

            await expect(dismissPYMKSuggestion('user-456')).rejects.toThrow('User not authenticated');
        });

        it('should throw error when RPC fails', async () => {
            (supabase.rpc as any).mockResolvedValue({
                error: { message: 'Database error' },
            });

            await expect(dismissPYMKSuggestion('user-456')).rejects.toThrow('Failed to dismiss suggestion');
        });
    });

    describe('trackPYMKEvent', () => {
        it('should track impression event', async () => {
            const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => { });

            await trackPYMKEvent('impression', 'user-456');

            expect(consoleSpy).toHaveBeenCalledWith('PYMK Analytics:', {
                eventType: 'impression',
                suggestedUserId: 'user-456',
                userId: mockUser.id,
            });

            consoleSpy.mockRestore();
        });

        it('should track click event', async () => {
            const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => { });

            await trackPYMKEvent('click', 'user-456');

            expect(consoleSpy).toHaveBeenCalledWith('PYMK Analytics:', {
                eventType: 'click',
                suggestedUserId: 'user-456',
                userId: mockUser.id,
            });

            consoleSpy.mockRestore();
        });

        it('should track friend_request event', async () => {
            const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => { });

            await trackPYMKEvent('friend_request', 'user-456');

            expect(consoleSpy).toHaveBeenCalledWith('PYMK Analytics:', {
                eventType: 'friend_request',
                suggestedUserId: 'user-456',
                userId: mockUser.id,
            });

            consoleSpy.mockRestore();
        });

        it('should track dismiss event', async () => {
            const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => { });

            await trackPYMKEvent('dismiss', 'user-456');

            expect(consoleSpy).toHaveBeenCalledWith('PYMK Analytics:', {
                eventType: 'dismiss',
                suggestedUserId: 'user-456',
                userId: mockUser.id,
            });

            consoleSpy.mockRestore();
        });

        it('should not throw when user not authenticated', async () => {
            (supabase.auth.getUser as any).mockResolvedValue({
                data: { user: null },
                error: null,
            });

            // Should not throw
            await expect(trackPYMKEvent('impression', 'user-456')).resolves.toBeUndefined();
        });
    });
});
