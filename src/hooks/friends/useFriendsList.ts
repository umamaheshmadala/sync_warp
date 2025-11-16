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

export function useFriendsList() {
  const query = useInfiniteQuery({
    queryKey: ['friends-list'],
    queryFn: async ({ pageParam = 0 }) => {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Fetch friendships with profile data
      console.log('Fetching friends for user:', user.id, 'page:', pageParam);
      
      // First, get friend IDs
      const { data: friendships, error: friendshipsError } = await supabase
        .from('friendships')
        .select('friend_id')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .range(pageParam * 50, (pageParam + 1) * 50 - 1);

      if (friendshipsError) {
        console.error('Error fetching friendships:', friendshipsError);
        throw friendshipsError;
      }

      if (!friendships || friendships.length === 0) {
        console.log('No friendships found');
        return [];
      }

      console.log('Found friendships:', friendships.length);

      // Then fetch friend profiles
      const friendIds = friendships.map(f => f.friend_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url, is_online, last_active')
        .in('id', friendIds);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        throw profilesError;
      }

      console.log('Fetched profiles:', profiles?.length || 0);

      // Transform data
      const friends = profiles || [];

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
