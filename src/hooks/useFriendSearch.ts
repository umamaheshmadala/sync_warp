/**
 * Friend Search Hooks - React Query Integration
 * Story 9.2.1: Global Friend Search
 */

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import {
  searchFriends,
  getFriendSearchHistory,
  clearFriendSearchHistory,
  type FriendSearchResult,
  type SearchHistory
} from '@/services/friendSearchService';
import { useDebounce } from '@/hooks/useDebounce';

/**
 * Hook for searching friends with debouncing
 */
export function useSearchFriends(
  query: string,
  filters: Record<string, any> = {},
  options: { enabled?: boolean } = {}
) {
  const debouncedQuery = useDebounce(query, 300);

  return useQuery<FriendSearchResult[], Error>({
    queryKey: ['friends', 'search', debouncedQuery, filters],
    queryFn: () => searchFriends(debouncedQuery, filters),
    enabled: (options.enabled !== false) && debouncedQuery.length >= 2,
    staleTime: 30000, // 30 seconds
    retry: 2,
  });
}

/**
 * Hook for infinite scroll search results
 */
export function useInfiniteSearchFriends(query: string) {
  const debouncedQuery = useDebounce(query, 300);

  return useInfiniteQuery<FriendSearchResult[], Error>({
    queryKey: ['friends', 'search', 'infinite', debouncedQuery],
    queryFn: ({ pageParam = 0 }) =>
      searchFriends(debouncedQuery, { offset: pageParam as number, limit: 20 }),
    getNextPageParam: (lastPage, allPages) => {
      // If we got fewer results than requested, we're at the end
      if (lastPage.length < 20) return undefined;
      return allPages.length * 20;
    },
    initialPageParam: 0,
    enabled: debouncedQuery.length >= 2,
    staleTime: 30000,
  });
}

/**
 * Hook for search history
 */
export function useFriendSearchHistory() {
  return useQuery<SearchHistory[], Error>({
    queryKey: ['friends', 'search', 'history'],
    queryFn: getFriendSearchHistory,
    staleTime: 60000, // 1 minute
  });
}

/**
 * Hook for clearing search history
 */
export function useClearFriendSearchHistory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: clearFriendSearchHistory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends', 'search', 'history'] });
    },
  });
}
