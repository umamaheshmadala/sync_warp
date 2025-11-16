/**
 * useFriendRequests Hook
 * Story 9.3.2: Friend Requests UI
 * 
 * Fetches friend requests (received and sent) with pagination
 */

import { useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';

interface FriendRequest {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  message?: string;
  created_at: string;
  sender: {
    id: string;
    full_name: string;
    email: string;
    avatar_url?: string;
  };
  receiver: {
    id: string;
    full_name: string;
    email: string;
    avatar_url?: string;
  };
  mutual_friends_count?: number;
}

export function useFriendRequests(type: 'received' | 'sent') {
  const query = useInfiniteQuery({
    queryKey: ['friend-requests', type],
    queryFn: async ({ pageParam = 0 }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Fetch requests based on type
      const column = type === 'received' ? 'receiver_id' : 'sender_id';
      
      const { data: requests, error } = await supabase
        .from('friend_requests')
        .select('id, sender_id, receiver_id, status, message, created_at')
        .eq(column, user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .range(pageParam * 20, (pageParam + 1) * 20 - 1);

      if (error) throw error;

      if (!requests || requests.length === 0) return [];

      // Fetch profiles for senders and receivers
      const userIds = new Set<string>();
      requests.forEach(req => {
        userIds.add(req.sender_id);
        userIds.add(req.receiver_id);
      });

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .in('id', Array.from(userIds));

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // Calculate mutual friends count for each request
      const enrichedRequests: FriendRequest[] = await Promise.all(
        requests.map(async (req) => {
          const otherId = type === 'received' ? req.sender_id : req.receiver_id;
          
          // Get mutual friends count
          const { count } = await supabase
            .from('friendships')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('status', 'active')
            .in('friend_id', [
              supabase
                .from('friendships')
                .select('user_id')
                .eq('friend_id', otherId)
                .eq('status', 'active')
            ]);

          return {
            ...req,
            sender: profileMap.get(req.sender_id) || {
              id: req.sender_id,
              full_name: 'Unknown',
              email: 'unknown'
            },
            receiver: profileMap.get(req.receiver_id) || {
              id: req.receiver_id,
              full_name: 'Unknown',
              email: 'unknown'
            },
            mutual_friends_count: count || 0
          };
        })
      );

      return enrichedRequests;
    },
    getNextPageParam: (lastPage, pages) => {
      return lastPage.length === 20 ? pages.length : undefined;
    },
    initialPageParam: 0,
  });

  const requests = query.data?.pages.flat() || [];

  return {
    requests,
    isLoading: query.isLoading,
    isFetchingNextPage: query.isFetchingNextPage,
    hasNextPage: query.hasNextPage,
    fetchNextPage: query.fetchNextPage,
    error: query.error,
  };
}
