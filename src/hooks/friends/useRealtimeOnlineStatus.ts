/**
 * useRealtimeOnlineStatus Hook
 * Story 9.3.1: Real-time online status updates
 * 
 * Subscribes to Supabase Realtime for profiles table changes
 */

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';

export function useRealtimeOnlineStatus() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Subscribe to profiles table changes for online status updates
    const channel = supabase
      .channel('online-status-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: 'is_online=eq.true,is_online=eq.false' // Watch for online status changes
        },
        (payload) => {
          console.log('Online status changed:', payload);
          
          // Invalidate friends list to refetch with new online status
          queryClient.invalidateQueries({ queryKey: ['friends-list'] });
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      channel.unsubscribe();
    };
  }, [queryClient]);
}
