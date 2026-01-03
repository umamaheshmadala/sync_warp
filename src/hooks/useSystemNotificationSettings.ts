import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationSettingsService, NotificationSettings } from '@/services/notificationSettingsService';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';

export function useSystemNotificationSettings() {
    const { user } = useAuthStore();
    const queryClient = useQueryClient();
    const queryKey = ['system-notification-settings', user?.id];

    // Fetch settings
    const { data: settings, isLoading } = useQuery({
        queryKey,
        queryFn: () => notificationSettingsService.getSettings(),
        enabled: !!user?.id,
    });

    // Update settings mutation
    const updateMutation = useMutation({
        mutationFn: async (newSettings: Partial<NotificationSettings>) => {
            await notificationSettingsService.updateSettings(newSettings);
            return newSettings;
        },
        onMutate: async (newSettings) => {
            await queryClient.cancelQueries({ queryKey });
            const previousSettings = queryClient.getQueryData<NotificationSettings>(queryKey);

            queryClient.setQueryData<NotificationSettings>(queryKey, (old) => ({
                ...(old as NotificationSettings),
                ...newSettings,
            }));

            return { previousSettings };
        },
        onError: (err, newSettings, context) => {
            queryClient.setQueryData(queryKey, context?.previousSettings);
            toast.error('Failed to update settings');
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey });
        },
    });

    return {
        settings,
        isLoading,
        updateSettings: updateMutation.mutate,
        isUpdating: updateMutation.isPending,
    };
}
