// useBusinessFollowers.ts
// Custom hook for fetching and managing business followers
// Used by FollowerListModal to display follower list with pagination

import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export interface BusinessFollower {
    id: string;
    created_at: string;
    user: {
        id: string;
        full_name: string | null;
        avatar_url: string | null;
        privacy_settings?: {
            hide_following?: boolean;
        } | null;
    } | null;
}

export const useBusinessFollowers = (businessId: string, enabled: boolean = true) => {
    return useQuery({
        queryKey: ['business-followers', businessId],
        queryFn: async (): Promise<BusinessFollower[]> => {
            const { data, error } = await supabase
                .from('business_followers')
                .select(`
          id,
          created_at,
          users:user_id (
            id,
            full_name,
            avatar_url,
            privacy_settings
          )
        `)
                .eq('business_id', businessId)
                .eq('is_active', true)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching business followers:', error);
                throw new Error(`Failed to load followers: ${error.message}`);
            }

            // Filter out private profiles (users who chose to hide their following)
            // Note: Supabase returns 'users' as single object per row, not array
            const publicFollowers = (data || [])
                .filter(follower => {
                    if (!follower.users) return false;
                    const user = follower.users as any; // Type assertion for Supabase joined data
                    const privacySettings = user.privacy_settings as { hide_following?: boolean } | null;
                    return !privacySettings?.hide_following;
                })
                .map(follower => ({
                    id: follower.id,
                    created_at: follower.created_at,
                    user: follower.users as any // Map users to user for consistency
                }));

            return publicFollowers as BusinessFollower[];
        },
        enabled: enabled && !!businessId,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
};
