import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-hot-toast';

export interface PrivacySettings {
    friend_requests: 'everyone' | 'friends_of_friends' | 'no_one';
    profile_visibility: 'public' | 'friends' | 'friends_of_friends';
    search_visibility: boolean;
    online_status_visibility: 'everyone' | 'friends' | 'no_one';
    who_can_follow: 'everyone' | 'friends' | 'no_one';
    /** Read receipts enabled - reciprocal: if disabled, user can't see others' read receipts either */
    read_receipts_enabled: boolean;
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

    const { mutateAsync: updateSettings, isPending: isUpdating } = useMutation({
        mutationFn: async (newSettings: Partial<PrivacySettings>) => {
            const promises = Object.entries(newSettings).map(([key, value]) =>
                supabase.rpc('update_privacy_settings', {
                    setting_key: key,
                    setting_value: value,
                })
            );

            const results = await Promise.all(promises);
            const error = results.find(r => r.error)?.error;
            if (error) throw error;

            return results.map(r => r.data);
        },
        // Optimistic update: update cache immediately before server response
        onMutate: async (newSettings: Partial<PrivacySettings>) => {
            // Cancel any outgoing refetches to prevent overwriting optimistic update
            await queryClient.cancelQueries({ queryKey: ['privacySettings'] });

            // Snapshot the previous value
            const previousSettings = queryClient.getQueryData<PrivacySettings>(['privacySettings']);

            // Optimistically update to the new value
            if (previousSettings) {
                queryClient.setQueryData<PrivacySettings>(['privacySettings'], {
                    ...previousSettings,
                    ...newSettings,
                    last_updated: new Date().toISOString(),
                });
            }

            // Return a context object with the snapshot
            return { previousSettings };
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['privacySettings'] });
            // Toast handled in component for bulk update
        },
        onError: (error: any, _newSettings, context) => {
            // Rollback to previous value on error
            if (context?.previousSettings) {
                queryClient.setQueryData(['privacySettings'], context.previousSettings);
            }
            // Toast handled in component
            throw error;
        },
    });

    return {
        settings,
        isLoading,
        error,
        updateSettings,
        isUpdating,
    };
}
