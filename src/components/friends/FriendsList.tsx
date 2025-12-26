import React, { useEffect, useRef, useMemo } from 'react';
import { FriendCard } from './FriendCard';
import { FriendProfileModal } from './FriendProfileModal';
import { FriendsListSkeleton } from '../ui/skeletons/FriendsListSkeleton';
import { NoFriendsEmptyState, SearchNoResultsEmptyState } from './EmptyStates';
import { useFriendsList } from '../../hooks/friends/useFriendsList';
import { useQuery } from '@tanstack/react-query';
import { getFriendLeaderboard, getBadgeForCount, type Badge } from '../../services/friendLeaderboardService';

interface FriendsListProps {
  searchQuery?: string;
}

import { useRealtimeFriends } from '../../hooks/friends/useRealtimeFriends';
import { GlobalUserSearch } from './GlobalUserSearch';

export function FriendsList({ searchQuery = '' }: FriendsListProps) {
  useRealtimeFriends(); // Enable realtime updates
  const { friends, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage, error } = useFriendsList();

  // Fetch leaderboard data to integrate badges
  const { data: leaderboard = [] } = useQuery({
    queryKey: ['friend-leaderboard', 'all'],
    queryFn: () => getFriendLeaderboard('all'),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Create quick lookup for badges
  const badgeMap = useMemo(() => {
    const map: Record<string, Badge> = {};
    leaderboard.forEach((entry) => {
      const badge = getBadgeForCount(entry.deal_count);
      if (badge) {
        map[entry.user_id] = badge;
      }
    });
    return map;
  }, [leaderboard]);

  const [selectedFriendId, setSelectedFriendId] = React.useState<string | null>(null);

  // Filter friends based on search query
  const filteredFriends = useMemo(() => {
    if (!searchQuery.trim()) return friends;

    const query = searchQuery.toLowerCase().trim();
    return friends.filter(friend =>
      friend.full_name.toLowerCase().includes(query) ||
      friend.email.toLowerCase().includes(query)
    );
  }, [friends, searchQuery]);

  const observerTarget = useRef<HTMLDivElement>(null);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (isLoading && friends.length === 0) {
    return <FriendsListSkeleton count={8} />;
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-600">
        <p>Error loading friends. Please try again.</p>
      </div>
    );
  }

  if (friends.length === 0) {
    return <NoFriendsEmptyState />;
  }

  // Show empty state for search with no results ONLY if not using unified search (but here we are)
  // Actually, we want to show "No friends found" if filtered list is empty, BUT we proceed to render GlobalUserSearch below.
  // So we shouldn't return early here.
  // We can show a small message "No friends found" inside the main render if needed, or rely on the "Showing 0 of X friends" header.

  /* 
  if (searchQuery && filteredFriends.length === 0) {
    return <SearchNoResultsEmptyState query={searchQuery} />;
  }
  */

  return (
    <div className="bg-white rounded-lg shadow" data-testid="friends-list-container">
      {/* Results count when searching */}
      {searchQuery && (
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <p className="text-sm text-gray-600">
            Showing {filteredFriends.length} of {friends.length} friends
          </p>
        </div>
      )}

      {/* Standard list rendering */}
      <div className="divide-y divide-gray-100">
        {filteredFriends.map((friend) => (
          <FriendCard
            key={friend.id}
            friend={friend}
            badge={badgeMap[friend.id]} // Pass the badge
            onClick={() => setSelectedFriendId(friend.id)}
          />
        ))}
      </div>

      {/* Infinite scroll trigger */}
      {!searchQuery && <div ref={observerTarget} className="h-4" />}

      {/* Loading more indicator */}
      {!searchQuery && isFetchingNextPage && (
        <div className="py-4 text-center text-gray-500">
          <div className="inline-block w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="ml-2">Loading more...</span>
        </div>
      )}

      {/* Friend Profile Modal */}
      {selectedFriendId && (
        <FriendProfileModal
          friendId={selectedFriendId}
          isOpen={!!selectedFriendId}
          onClose={() => setSelectedFriendId(null)}
        />
      )}

      {/* Global Search Results (Unified Search) */}
      {searchQuery && (
        <div className="mt-6 border-t pt-6">
          <GlobalUserSearch
            query={searchQuery}
            hideEmptyMessage={filteredFriends.length > 0}
          />
        </div>
      )}
    </div>
  );
}
