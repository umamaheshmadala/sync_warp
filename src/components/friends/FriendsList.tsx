/**
 * FriendsList Component
 * Story 9.3.1: Friends List Component
 * 
 * Main friends list container with infinite scroll
 */

import React, { useEffect, useRef, useMemo } from 'react';
import { VariableSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { FriendCard } from './FriendCard';
import { FriendsListSkeleton } from './LoadingSkeleton';
import { NoFriendsEmptyState } from './EmptyState';
import { useFriendsList } from '../../hooks/friends/useFriendsList';
import type { Friend } from '../../types/friends';

interface FriendsListProps {
  searchQuery?: string;
}

export function FriendsList({ searchQuery = '' }: FriendsListProps) {
  const { friends, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage, error } = useFriendsList();
  
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

  if (isLoading) {
    return <FriendsListSkeleton count={10} />;
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

  // Show empty state for search with no results
  if (searchQuery && filteredFriends.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <p className="text-gray-600">No friends found matching "{searchQuery}"</p>
        <p className="text-sm text-gray-500 mt-2">Try a different search term</p>
      </div>
    );
  }

  // Row renderer for virtualized list
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const friend = filteredFriends[index];
    return (
      <div style={style}>
        <FriendCard friend={friend} />
      </div>
    );
  };

  // Use virtualization only when there are many friends (> 20)
  const useVirtualization = filteredFriends.length > 20 && !searchQuery;

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {/* Results count when searching */}
      {searchQuery && (
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <p className="text-sm text-gray-600">
            Showing {filteredFriends.length} of {friends.length} friends
          </p>
        </div>
      )}
      
      {useVirtualization ? (
        /* Virtualized list for better performance */
        <div style={{ height: '600px' }}>
          <AutoSizer>
            {({ height, width }) => (
              <List
                height={height}
                itemCount={filteredFriends.length}
                itemSize={() => 80} // Fixed height per item
                width={width}
                onScroll={({ scrollOffset }) => {
                  // Trigger load more when near bottom
                  const listHeight = filteredFriends.length * 80;
                  if (scrollOffset > listHeight - height - 200 && hasNextPage && !isFetchingNextPage) {
                    fetchNextPage();
                  }
                }}
              >
                {Row}
              </List>
            )}
          </AutoSizer>
        </div>
      ) : (
        /* Standard list for small lists or search results */
        <div className="divide-y divide-gray-100">
          {filteredFriends.map((friend) => (
            <FriendCard key={friend.id} friend={friend} />
          ))}
        </div>
      )}

      {/* Infinite scroll trigger - only for non-virtualized lists */}
      {!useVirtualization && !searchQuery && <div ref={observerTarget} className="h-4" />}

      {/* Loading more indicator */}
      {!searchQuery && isFetchingNextPage && (
        <div className="py-4 text-center text-gray-500">
          <div className="inline-block w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="ml-2">Loading more...</span>
        </div>
      )}
    </div>
  );
}
