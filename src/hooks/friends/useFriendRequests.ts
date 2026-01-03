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
          id, 
          created_at, 
          status, 
          sender_id, 
          receiver_id
        `)
        .eq('receiver_id', user!.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      // Fetch active friendships to filter out duplicates (robustness against DB inconsistency)
      const { data: friendships } = await supabase
        .from('friendships')
        .select('friend_id')
        .eq('user_id', user!.id)
        .eq('status', 'active');

      const existingFriendIds = new Set(friendships?.map(f => f.friend_id) || []);

      // Filter out requests from people who are already friends
      const validRequests = data?.filter(req => !existingFriendIds.has(req.sender_id)) || [];

      // Fetch sender profiles separately to avoid RLS issues
      if (validRequests.length > 0) {
        const senderIds = validRequests.map(req => req.sender_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email, avatar_url')
          .in('id', senderIds);

        // Merge profiles into requests
        return validRequests.map(req => ({
          ...req,
          sender: profiles?.find(p => p.id === req.sender_id) || null
        }));
      }

      return [];
    },
    enabled: !!user,
    staleTime: 0, // Always fetch fresh data to prevent showing accepted requests
    gcTime: 0, // Don't cache data after component unmounts
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
          id, 
          created_at, 
          status, 
          sender_id, 
          receiver_id
        `)
        .eq('sender_id', user!.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Sent requests error:', error);
        throw error;
      }

      // Fetch receiver profiles separately to avoid RLS issues
      if (data && data.length > 0) {
        const receiverIds = data.map(req => req.receiver_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email, avatar_url')
          .in('id', receiverIds);

        // Merge profiles into requests
        return data.map(req => ({
          ...req,
          receiver: profiles?.find(p => p.id === req.receiver_id) || null
        }));
      }

      return data;
    },
    enabled: !!user,
  });
}

// Wrapper hook to match component expectations
export function useFriendRequests(type: 'received' | 'sent') {
  const receivedHook = useReceivedFriendRequests();
  const sentHook = useSentFriendRequests();

  const hook = type === 'received' ? receivedHook : sentHook;

  return {
    requests: hook.data || [],
    isLoading: hook.isLoading,
    hasNextPage: false,
    fetchNextPage: () => { },
    isFetchingNextPage: false,
  };
}
