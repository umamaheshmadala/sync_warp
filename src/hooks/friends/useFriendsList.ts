/**
 * useFriendsList Hook
 * Story 9.3.1: Friends List Component
 * 
 * Fetches friends list with infinite scroll pagination (50 per page)
 * Sorted: Online first, then alphabetically
 */

import { useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import type { Friend } from '../../types/friends';

interface FriendshipWithProfile {
  friend_id: string;
  profiles: Friend;
}

export function useFriendsList() {
  const query = useInfiniteQuery({
    queryKey: ['friends-list'],
    queryFn: async ({ pageParam = 0 }) => {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Fetch friendships with profile data
      const { data, error } = await supabase
        .from('friendships')
        .select(`
          friend_id,
          profiles!friendships_friend_id_fkey(
            id,
            full_name,
            username,
            avatar_url,
            is_online,
            last_active
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'accepted')
        .range(pageParam * 50, (pageParam + 1) * 50 - 1);

      if (error) {
        console.error('Error fetching friends:', error);
        throw error;
      }

      // Transform data
      const friends = (data as unknown as FriendshipWithProfile[])
        ?.map(f => f.profiles)
        .filter(Boolean) || [];

      return friends;
    },
    getNextPageParam: (lastPage, pages) => {
      // If last page has 50 items, there might be more
      return lastPage.length === 50 ? pages.length : undefined;
    },
    initialPageParam: 0,
  });

  // Flatten pages into single array
  const friends = query.data?.pages.flat() || [];

  // Sort: Online first, then alphabetically
  const sortedFriends = friends.sort((a, b) => {
    if (a.is_online !== b.is_online) {
      return b.is_online ? 1 : -1; // Online first
    }
    return a.full_name.localeCompare(b.full_name);
  });

  return {
    friends: sortedFriends,
    isLoading: query.isLoading,
    isFetchingNextPage: query.isFetchingNextPage,
    hasNextPage: query.hasNextPage,
    fetchNextPage: query.fetchNextPage,
    error: query.error,
  };
}
