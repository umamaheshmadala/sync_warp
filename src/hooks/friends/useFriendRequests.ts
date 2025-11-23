import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';

export function useReceivedFriendRequests() {
  const user = useAuthStore(state => state.user);

  return useQuery({
    queryKey: ['friendRequests', 'received', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('friend_requests')
        .select(`
          *,
          sender:profiles!friend_requests_sender_id_fkey(*)
        `)
        .eq('receiver_id', user!.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useSentFriendRequests() {
  const user = useAuthStore(state => state.user);

  return useQuery({
    queryKey: ['friendRequests', 'sent', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('friend_requests')
        .select(`
          *,
          receiver:profiles!friend_requests_receiver_id_fkey(*)
        `)
        .eq('sender_id', user!.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}
