import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-hot-toast';

export interface PrivacySettings {
    friend_requests: 'everyone' | 'friends_of_friends' | 'no_one';
    profile_visibility: 'public' | 'friends' | 'friends_of_friends';
    search_visibility: boolean;
    online_status_visibility: 'everyone' | 'friends' | 'no_one';
    who_can_follow: 'everyone' | 'friends' | 'no_one';
    last_updated: string | null;
}

export function usePrivacySettings() {
    const queryClient = useQueryClient();

    const { data: settings, isLoading, error } = useQuery({
        queryKey: ['privacySettings'],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const { data, error } = await supabase
                .from('profiles')
                .select('privacy_settings')
                .eq('id', user.id)
                .single();

            if (error) throw error;
            return data.privacy_settings as PrivacySettings;
        },
    });

    const { mutate: updateSetting, isPending: isUpdating } = useMutation({
        mutationFn: async ({ key, value }: { key: keyof PrivacySettings; value: any }) => {
            const { data, error } = await supabase.rpc('update_privacy_settings', {
                setting_key: key,
                setting_value: value,
            });

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['privacySettings'] });
            toast.success('Privacy settings updated');
        },
        onError: (error: any) => {
            toast.error(error.message || 'Failed to update privacy settings');
        },
    });

    return {
        settings,
        isLoading,
        error,
        updateSetting,
        isUpdating,
    };
}
