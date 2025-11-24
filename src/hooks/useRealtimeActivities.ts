import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export function useRealtimeActivities() {
    const queryClient = useQueryClient();

    useEffect(() => {
        const channel = supabase
            .channel('friend_activities_changes')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'friend_activities',
                },
                () => {
                    // Invalidate activities query to refetch
                    queryClient.invalidateQueries({ queryKey: ['friend-activities'] });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [queryClient]);
}
