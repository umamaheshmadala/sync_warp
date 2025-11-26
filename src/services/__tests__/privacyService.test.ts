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

describe('privacyService', () => {
    const mockUser = { id: 'user-123' };

    beforeEach(() => {
        vi.resetAllMocks();
        (supabase.auth.getUser as any).mockResolvedValue({
            data: { user: mockUser },
        });
    });

    describe('updatePrivacySettings', () => {
        it('should call update_privacy_settings RPC', async () => {
            const mockResponse = { data: { friend_requests: 'friends' }, error: null };
            (supabase.rpc as any).mockResolvedValue(mockResponse);

            const result = await privacyService.updatePrivacySettings('friend_requests', 'friends');

            expect(supabase.rpc).toHaveBeenCalledWith('update_privacy_settings', {
                setting_key: 'friend_requests',
                setting_value: 'friends',
            });
            expect(result).toEqual({ success: true, data: mockResponse.data });
        });

        it('should handle errors', async () => {
            const mockError = { message: 'Update failed' };
            (supabase.rpc as any).mockResolvedValue({ data: null, error: mockError });

            const result = await privacyService.updatePrivacySettings('friend_requests', 'friends');

            expect(result).toEqual({ success: false, error: expect.any(String) });
        });
    });

    describe('canViewProfile', () => {
        it('should call can_view_profile RPC', async () => {
            (supabase.rpc as any).mockResolvedValue({ data: true, error: null });

            const result = await privacyService.canViewProfile('profile-id');

            expect(supabase.rpc).toHaveBeenCalledWith('can_view_profile', {
                viewer_id: mockUser.id,
                target_id: 'profile-id', // Changed from profile_id to target_id to match service
            });
            expect(result.data).toBe(true);
        });
    });

    describe('canSeeOnlineStatus', () => {
        it('should call can_see_online_status RPC', async () => {
            (supabase.rpc as any).mockResolvedValue({ data: false, error: null });

            const result = await privacyService.canSeeOnlineStatus('target-id');

            expect(supabase.rpc).toHaveBeenCalledWith('can_see_online_status', {
                viewer_id: mockUser.id,
                target_id: 'target-id',
            });
            expect(result.data).toBe(false);
        });
    });

    describe('exportUserData', () => {
        it('should fetch user data from multiple tables', async () => {
            const mockProfile = { id: mockUser.id, username: 'test' };
            const mockFriends = [{ id: 'friend-1' }];
            const mockPrivacyLogs = [{ id: 'log-1' }];

            // Mock chainable calls properly
            const mockSelect = vi.fn();
            const mockSingle = vi.fn();
            const mockEq = vi.fn();

            // Setup mock implementation for supabase.from
            (supabase.from as any).mockImplementation((table: string) => {
                const chain = {
                    select: mockSelect,
                    eq: mockEq,
                    single: mockSingle,
                };

                mockSelect.mockReturnValue(chain);
                mockEq.mockReturnValue(chain);

                if (table === 'profiles') {
                    mockSingle.mockResolvedValue({ data: mockProfile, error: null });
                } else if (table === 'friendships') {
                    chain.eq = vi.fn().mockResolvedValue({ data: mockFriends, error: null });
                } else if (table === 'privacy_audit_log') {
                    chain.eq = vi.fn().mockResolvedValue({ data: mockPrivacyLogs, error: null });
                }

                return chain;
            });

            // We need to mock Promise.all responses effectively by ensuring the chain returns promises
            // But since we are mocking supabase.from, we need to ensure it returns what Promise.all expects
            // The service calls:
            // supabase.from('profiles').select('*').eq('id', user.id).single()
            // supabase.from('friendships').select('*').eq('user_id', user.id)
            // supabase.from('privacy_audit_log').select('*').eq('user_id', user.id)

            // Let's simplify the mock for this specific test
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
    });
});
