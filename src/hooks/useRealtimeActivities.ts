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
                (payload) => {
                    console.log('New activity received:', payload);
                    // Invalidate activities query to refetch
                    queryClient.invalidateQueries({ queryKey: ['friend-activities'] });
                }
            )
            .subscribe((status) => {
                console.log('Realtime subscription status:', status);
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [queryClient]);
}

