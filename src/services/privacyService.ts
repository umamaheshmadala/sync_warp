import { supabase } from '@/lib/supabase';
import { logError, getUserFriendlyErrorMessage } from '@/utils/errorHandler';

interface ServiceResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
}

/**
 * Privacy Service
 * Handles privacy-related operations including profile visibility,
 * search visibility, and online status visibility
 */
export const privacyService = {
    /**
     * Check if viewer can view target's profile
     * @param targetId - The profile ID to check visibility for
     * @returns ServiceResponse with boolean result
     */
    async canViewProfile(targetId: string): Promise<ServiceResponse<boolean>> {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const { data, error } = await supabase.rpc('can_view_profile', {
                viewer_id: user.id,
                target_id: targetId,
            });

            if (error) throw error;

            return {
                success: true,
                data,
            };
        } catch (error: any) {
            logError('canViewProfile', error, { targetId });
            return {
                success: false,
                error: getUserFriendlyErrorMessage(error),
            };
        }
    },

    /**
     * Search users with privacy enforcement
     * @param query - Search query string
     * @param limit - Max results to return
     * @returns ServiceResponse with array of matching users
     */
    async searchUsers(query: string, limit: number = 20): Promise<ServiceResponse<any[]>> {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const { data, error } = await supabase.rpc('search_users_secure', {
                search_query: query,
                limit_count: limit,
            });

            if (error) throw error;

            return {
                success: true,
                data: data || [],
            };
        } catch (error: any) {
            logError('searchUsers', error, { query });
            return {
                success: false,
                error: getUserFriendlyErrorMessage(error),
            };
        }
    },

    /**
     * Check if viewer can see target's online status
     * @param targetId - The profile ID to check visibility for
     * @returns ServiceResponse with boolean result
     */
    async canSeeOnlineStatus(targetId: string): Promise<ServiceResponse<boolean>> {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const { data, error } = await supabase.rpc('can_see_online_status', {
                viewer_id: user.id,
                target_id: targetId,
            });

            if (error) throw error;

            return {
                success: true,
                data,
            };
        } catch (error: any) {
            logError('canSeeOnlineStatus', error, { targetId });
            return {
                success: false,
                error: getUserFriendlyErrorMessage(error),
            };
        }
    },

    /**
     * Get user's visible online status
     * @param targetId - The profile ID to get status for
     * @returns ServiceResponse with status data
     */
    async getVisibleOnlineStatus(targetId: string): Promise<ServiceResponse<{
        is_online: boolean | null;
        last_active: string | null;
        visible: boolean;
    }>> {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const { data, error } = await supabase.rpc('get_visible_online_status', {
                viewer_id: user.id,
                target_id: targetId,
            });

            if (error) throw error;

            return {
                success: true,
                data,
            };
        } catch (error: any) {
            logError('getVisibleOnlineStatus', error, { targetId });
            return {
                success: false,
                error: getUserFriendlyErrorMessage(error),
            };
        }
    },

    /**
     * Export user data for GDPR compliance
     * @returns ServiceResponse with user data
     */
    async exportUserData(): Promise<ServiceResponse<any>> {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            // Fetch all user data
            const [profileData, friendsData, privacyData] = await Promise.all([
                supabase.from('profiles').select('*').eq('id', user.id).single(),
                supabase.from('friendships').select('*').eq('user_id', user.id),
                supabase.from('privacy_audit_log').select('*').eq('user_id', user.id),
            ]);

            const exportData = {
                profile: profileData.data,
                friends: friendsData.data,
                privacy_history: privacyData.data,
                exported_at: new Date().toISOString(),
            };

            return {
                success: true,
                data: exportData,
            };
        } catch (error: any) {
            logError('exportUserData', error);
            return {
                success: false,
                error: getUserFriendlyErrorMessage(error),
            };
        }
    },
};
