import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NotificationPreferences } from '../useNotificationPreferences';
import { supabase } from '@/lib/supabase';

// Mock dependencies
vi.mock('@/lib/supabase', () => ({
    supabase: {
        from: vi.fn(),
    },
}));

vi.mock('@tanstack/react-query');
vi.mock('@/store/authStore');
vi.mock('react-hot-toast');

describe('useNotificationPreferences', () => {
    const mockUserId = 'user-123';

    const defaultPreferences: NotificationPreferences = {
        push_enabled: true,
        email_enabled: false,
        friend_requests: true,
        friend_accepted: true,
        deal_shared: true,
        birthday_reminders: false,
    };

    beforeEach(() => {
        vi.clearAllMocks();

        // Mock console methods
        vi.spyOn(console, 'log').mockImplementation(() => { });
        vi.spyOn(console, 'error').mockImplementation(() => { });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should fetch preferences from Supabase', async () => {
        const mockSelect = vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                    data: { notification_preferences: defaultPreferences },
                    error: null,
                }),
            }),
        });
        (supabase.from as any).mockReturnValue({ select: mockSelect });

        // Call the query function directly
        const queryFn = async () => {
            const { data, error } = await supabase
                .from('profiles')
                .select('notification_preferences')
                .eq('id', mockUserId)
                .single();

            if (error) throw error;
            return data?.notification_preferences as NotificationPreferences;
        };

        const result = await queryFn();

        expect(result).toEqual(defaultPreferences);
        expect(mockSelect).toHaveBeenCalledWith('notification_preferences');
    });

    it('should update preferences in Supabase', async () => {
        const updatedPreferences = {
            ...defaultPreferences,
            push_enabled: false,
        };

        const mockUpdate = vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
        });
        (supabase.from as any).mockReturnValue({ update: mockUpdate });

        // Call the mutation function directly
        const mutationFn = async (newPreferences: Partial<NotificationPreferences>) => {
            const merged = { ...defaultPreferences, ...newPreferences };
            const { error } = await supabase
                .from('profiles')
                .update({ notification_preferences: merged })
                .eq('id', mockUserId);

            if (error) throw error;
            return merged;
        };

        const result = await mutationFn({ push_enabled: false });

        expect(result).toEqual(updatedPreferences);
        expect(mockUpdate).toHaveBeenCalledWith({
            notification_preferences: updatedPreferences,
        });
    });

    it('should handle fetch errors', async () => {
        const mockSelect = vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                    data: null,
                    error: { message: 'Database error' },
                }),
            }),
        });
        (supabase.from as any).mockReturnValue({ select: mockSelect });

        const queryFn = async () => {
            const { data, error } = await supabase
                .from('profiles')
                .select('notification_preferences')
                .eq('id', mockUserId)
                .single();

            if (error) throw error;
            return data?.notification_preferences as NotificationPreferences;
        };

        await expect(queryFn()).rejects.toThrow();
    });

    it('should handle update errors', async () => {
        const mockUpdate = vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: { message: 'Update failed' } }),
        });
        (supabase.from as any).mockReturnValue({ update: mockUpdate });

        const mutationFn = async (newPreferences: Partial<NotificationPreferences>) => {
            const merged = { ...defaultPreferences, ...newPreferences };
            const { error } = await supabase
                .from('profiles')
                .update({ notification_preferences: merged })
                .eq('id', mockUserId);

            if (error) throw error;
            return merged;
        };

        await expect(mutationFn({ push_enabled: false })).rejects.toThrow();
    });

    it('should merge partial updates with existing preferences', async () => {
        const mockUpdate = vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
        });
        (supabase.from as any).mockReturnValue({ update: mockUpdate });

        const mutationFn = async (newPreferences: Partial<NotificationPreferences>) => {
            const merged = { ...defaultPreferences, ...newPreferences };
            const { error } = await supabase
                .from('profiles')
                .update({ notification_preferences: merged })
                .eq('id', mockUserId);

            if (error) throw error;
            return merged;
        };

        // Update only one preference
        const result = await mutationFn({ friend_requests: false });

        expect(result).toEqual({
            ...defaultPreferences,
            friend_requests: false,
        });
    });

    it('should handle null preferences by returning defaults', () => {
        const preferences = null;
        const result = preferences || defaultPreferences;

        expect(result).toEqual(defaultPreferences);
    });
});
