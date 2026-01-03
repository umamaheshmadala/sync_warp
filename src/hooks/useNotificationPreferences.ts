import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';

export interface NotificationPreferences {
    push_enabled: boolean;
    email_enabled: boolean;
    friend_requests: boolean;
    friend_accepted: boolean;
    deal_shared: boolean;
    birthday_reminders: boolean;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
    push_enabled: true,
    email_enabled: false,
    friend_requests: true,
    friend_accepted: true,
    deal_shared: true,
    birthday_reminders: false,
};

export function useNotificationPreferences() {
    const { user } = useAuthStore();
    const queryClient = useQueryClient();

    // Fetch current preferences
    const { data: preferences, isLoading } = useQuery({
        queryKey: ['notification-preferences', user?.id],
        queryFn: async () => {
            if (!user?.id) throw new Error('User not authenticated');

            const { data, error } = await supabase
                .from('profiles')
                .select('notification_preferences')
                .eq('id', user.id)
                .single();

            if (error) throw error;

            // Use default preferences if null
            return (data?.notification_preferences as NotificationPreferences) || DEFAULT_PREFERENCES;
        },
        enabled: !!user?.id,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

    // Update preferences mutation
    const updateMutation = useMutation({
        mutationFn: async (newPreferences: Partial<NotificationPreferences>) => {
            if (!user?.id) throw new Error('User not authenticated');

            console.log('[useNotificationPreferences] Mutating preferences:', newPreferences);

            // Get latest preferences from cache or use defaults
            const currentPreferences = queryClient.getQueryData<NotificationPreferences>(['notification-preferences', user?.id])
                || preferences
                || DEFAULT_PREFERENCES;

            const updatedPreferences = {
                ...DEFAULT_PREFERENCES, // Ensure all keys exist
                ...currentPreferences,
                ...newPreferences,
            };

            console.log('[useNotificationPreferences] Sending update to Supabase:', updatedPreferences);

            const { error } = await supabase
                .from('profiles')
                .update({ notification_preferences: updatedPreferences })
                .eq('id', user.id);

            if (error) {
                console.error('[useNotificationPreferences] Supabase update error:', error);
                throw error;
            }

            console.log('[useNotificationPreferences] Update successful');
            return updatedPreferences;
        },
        onMutate: async (newPreferences) => {
            // Cancel outgoing refetches
            await queryClient.cancelQueries({ queryKey: ['notification-preferences', user?.id] });

            // Snapshot previous value
            const previousPreferences = queryClient.getQueryData<NotificationPreferences>([
                'notification-preferences',
                user?.id,
            ]);

            // Optimistically update
            queryClient.setQueryData<NotificationPreferences>(
                ['notification-preferences', user?.id],
                (old) => ({
                    ...(old || DEFAULT_PREFERENCES),
                    ...newPreferences,
                })
            );

            return { previousPreferences };
        },
        onError: (error, _newPreferences, context) => {
            // Rollback on error
            if (context?.previousPreferences) {
                queryClient.setQueryData(
                    ['notification-preferences', user?.id],
                    context.previousPreferences
                );
            }
            console.error('[useNotificationPreferences] Update error:', error);
            toast.error('Failed to update notification preferences');
        },
        onSuccess: () => {
            // Use alert for Android debugging
            // window.alert('Preferences saved successfully!'); 
            console.log('[useNotificationPreferences] Success');
            toast.success('✓ Preferences saved', {
                duration: 3000,
                style: {
                    background: '#10b981',
                    color: '#fff',
                },
            });
        },
        onSettled: () => {
            // Refetch to ensure consistency
            queryClient.invalidateQueries({ queryKey: ['notification-preferences', user?.id] });
        },
    });

    return {
        preferences: preferences || DEFAULT_PREFERENCES,
        isLoading,
        updatePreferences: updateMutation.mutate,
        isUpdating: updateMutation.isPending,
    };
}
