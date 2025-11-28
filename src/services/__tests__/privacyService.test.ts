/**
 * Enhanced Unit Tests for privacyService
 * Story 9.8.1: Unit Tests - Services & Database Functions
 * 
 * Comprehensive coverage for privacy settings, profile visibility,
 * search visibility, online status visibility, and GDPR compliance
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { privacyService } from '../privacyService';
import { supabase } from '../../lib/supabase';

// Mock Supabase
vi.mock('../../lib/supabase', () => ({
    supabase: {
        rpc: vi.fn(),
        from: vi.fn(),
        auth: {
            getUser: vi.fn(),
        },
    },
}));

// Mock error handler
vi.mock('../../utils/errorHandler', () => ({
    logError: vi.fn(),
    getUserFriendlyErrorMessage: vi.fn((error: any) => error?.message || 'An error occurred'),
}));

describe('privacyService', () => {
    const mockUser = { id: 'user-123' };

    beforeEach(() => {
        vi.resetAllMocks();
        (supabase.auth.getUser as any).mockResolvedValue({
            data: { user: mockUser },
            error: null,
        });
    });

    describe('updatePrivacySettings', () => {
        it('should update privacy settings successfully', async () => {
            const mockResponse = { friend_requests: 'friends' };
            (supabase.rpc as any).mockResolvedValue({ data: mockResponse, error: null });

            const result = await privacyService.updatePrivacySettings('friend_requests', 'friends');

            expect(supabase.rpc).toHaveBeenCalledWith('update_privacy_settings', {
                setting_key: 'friend_requests',
                setting_value: 'friends',
            });
            expect(result).toEqual({ success: true, data: mockResponse });
        });

        it('should handle different privacy settings', async () => {
            (supabase.rpc as any).mockResolvedValue({ data: { profile_visibility: 'everyone' }, error: null });

            const result = await privacyService.updatePrivacySettings('profile_visibility', 'everyone');

            expect(result.success).toBe(true);
            expect(supabase.rpc).toHaveBeenCalledWith('update_privacy_settings', {
                setting_key: 'profile_visibility',
                setting_value: 'everyone',
            });
        });

        it('should handle errors', async () => {
            const mockError = { message: 'Update failed' };
            (supabase.rpc as any).mockResolvedValue({ data: null, error: mockError });

            const result = await privacyService.updatePrivacySettings('friend_requests', 'friends');

            expect(result).toEqual({ success: false, error: expect.any(String) });
        });

        it('should handle authentication errors', async () => {
            (supabase.auth.getUser as any).mockResolvedValue({
                data: { user: null },
                error: null,
            });

            const result = await privacyService.updatePrivacySettings('friend_requests', 'friends');

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });
    });

    describe('canViewProfile', () => {
        it('should return true when viewer can view profile', async () => {
            (supabase.rpc as any).mockResolvedValue({ data: true, error: null });

            const result = await privacyService.canViewProfile('profile-id');

            expect(supabase.rpc).toHaveBeenCalledWith('can_view_profile', {
                viewer_id: mockUser.id,
                target_id: 'profile-id',
            });
            expect(result.success).toBe(true);
            expect(result.data).toBe(true);
        });

        it('should return false when viewer cannot view profile', async () => {
            (supabase.rpc as any).mockResolvedValue({ data: false, error: null });

            const result = await privacyService.canViewProfile('private-profile-id');

            expect(result.success).toBe(true);
            expect(result.data).toBe(false);
        });

        it('should handle RPC errors', async () => {
            (supabase.rpc as any).mockResolvedValue({
                data: null,
                error: { message: 'RPC failed' },
            });

            const result = await privacyService.canViewProfile('profile-id');

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });

        it('should handle authentication errors', async () => {
            (supabase.auth.getUser as any).mockResolvedValue({
                data: { user: null },
                error: null,
            });

            const result = await privacyService.canViewProfile('profile-id');

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });
    });

    describe('searchUsers', () => {
        it('should search users with privacy enforcement', async () => {
            const mockUsers = [
                { id: 'user-1', full_name: 'John Doe', username: 'johndoe' },
                { id: 'user-2', full_name: 'Jane Smith', username: 'janesmith' },
            ];
            (supabase.rpc as any).mockResolvedValue({ data: mockUsers, error: null });

            const result = await privacyService.searchUsers('john', 20);

            expect(supabase.rpc).toHaveBeenCalledWith('search_users_secure', {
                search_query: 'john',
                limit_count: 20,
            });
            expect(result.success).toBe(true);
            expect(result.data).toEqual(mockUsers);
        });

        it('should use default limit of 20', async () => {
            (supabase.rpc as any).mockResolvedValue({ data: [], error: null });

            await privacyService.searchUsers('test');

            expect(supabase.rpc).toHaveBeenCalledWith('search_users_secure', {
                search_query: 'test',
                limit_count: 20,
            });
        });

        it('should return empty array when no results', async () => {
            (supabase.rpc as any).mockResolvedValue({ data: null, error: null });

            const result = await privacyService.searchUsers('nonexistent');

            expect(result.success).toBe(true);
            expect(result.data).toEqual([]);
        });

        it('should handle search errors', async () => {
            (supabase.rpc as any).mockResolvedValue({
                data: null,
                error: { message: 'Search failed' },
            });

            const result = await privacyService.searchUsers('test');

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });

        it('should handle authentication errors', async () => {
            (supabase.auth.getUser as any).mockResolvedValue({
                data: { user: null },
                error: null,
            });

            const result = await privacyService.searchUsers('test');

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });
    });

    describe('canSeeOnlineStatus', () => {
        it('should return true when viewer can see online status', async () => {
            (supabase.rpc as any).mockResolvedValue({ data: true, error: null });

            const result = await privacyService.canSeeOnlineStatus('target-id');

            expect(supabase.rpc).toHaveBeenCalledWith('can_see_online_status', {
                viewer_id: mockUser.id,
                target_id: 'target-id',
            });
            expect(result.success).toBe(true);
            expect(result.data).toBe(true);
        });

        it('should return false when viewer cannot see online status', async () => {
            (supabase.rpc as any).mockResolvedValue({ data: false, error: null });

            const result = await privacyService.canSeeOnlineStatus('private-user-id');

            expect(result.success).toBe(true);
            expect(result.data).toBe(false);
        });

        it('should handle RPC errors', async () => {
            (supabase.rpc as any).mockResolvedValue({
                data: null,
                error: { message: 'RPC failed' },
            });

            const result = await privacyService.canSeeOnlineStatus('target-id');

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });

        it('should handle authentication errors', async () => {
            (supabase.auth.getUser as any).mockResolvedValue({
                data: { user: null },
                error: null,
            });

            const result = await privacyService.canSeeOnlineStatus('target-id');

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });
    });

    describe('getVisibleOnlineStatus', () => {
        it('should get visible online status when allowed', async () => {
            const mockStatus = {
                is_online: true,
                last_active: '2024-01-01T12:00:00Z',
                visible: true,
            };
            (supabase.rpc as any).mockResolvedValue({ data: mockStatus, error: null });

            const result = await privacyService.getVisibleOnlineStatus('target-id');

            expect(supabase.rpc).toHaveBeenCalledWith('get_visible_online_status', {
                viewer_id: mockUser.id,
                target_id: 'target-id',
            });
            expect(result.success).toBe(true);
            expect(result.data).toEqual(mockStatus);
        });

        it('should return hidden status when not allowed', async () => {
            const mockStatus = {
                is_online: null,
                last_active: null,
                visible: false,
            };
            (supabase.rpc as any).mockResolvedValue({ data: mockStatus, error: null });

            const result = await privacyService.getVisibleOnlineStatus('private-user-id');

            expect(result.success).toBe(true);
            expect(result.data?.visible).toBe(false);
            expect(result.data?.is_online).toBeNull();
        });

        it('should handle RPC errors', async () => {
            (supabase.rpc as any).mockResolvedValue({
                data: null,
                error: { message: 'RPC failed' },
            });

            const result = await privacyService.getVisibleOnlineStatus('target-id');

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });

        it('should handle authentication errors', async () => {
            (supabase.auth.getUser as any).mockResolvedValue({
                data: { user: null },
                error: null,
            });

            const result = await privacyService.getVisibleOnlineStatus('target-id');

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });
    });

    describe('exportUserData', () => {
        it('should export user data successfully', async () => {
            const mockProfile = { id: mockUser.id, username: 'testuser', email: 'test@example.com' };
            const mockFriends = [{ id: 'friend-1', friend_id: 'user-456' }];
            const mockPrivacyLogs = [{ id: 'log-1', action: 'privacy_updated' }];

            (supabase.from as any).mockImplementation((table: string) => {
                if (table === 'profiles') {
                    return {
                        select: () => ({
                            eq: () => ({
                                single: () => Promise.resolve({ data: mockProfile, error: null })
                            })
                        })
                    };
                }
                if (table === 'friendships') {
                    return {
                        select: () => ({
                            eq: () => Promise.resolve({ data: mockFriends, error: null })
                        })
                    };
                }
                if (table === 'privacy_audit_log') {
                    return {
                        select: () => ({
                            eq: () => Promise.resolve({ data: mockPrivacyLogs, error: null })
                        })
                    };
                }
                return { select: () => ({ eq: () => ({}) }) };
            });

            const result = await privacyService.exportUserData();

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                profile: mockProfile,
                friends: mockFriends,
                privacy_history: mockPrivacyLogs,
                exported_at: expect.any(String),
            });
        });

        it('should handle export errors', async () => {
            (supabase.from as any).mockImplementation(() => ({
                select: () => ({
                    eq: () => ({
                        single: () => Promise.reject(new Error('Database error'))
                    })
                })
            }));

            const result = await privacyService.exportUserData();

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });

        it('should handle authentication errors', async () => {
            (supabase.auth.getUser as any).mockResolvedValue({
                data: { user: null },
                error: null,
            });

            const result = await privacyService.exportUserData();

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });
    });
});
