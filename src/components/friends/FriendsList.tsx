/**
 * FriendsList Component
 * Story 9.3.1: Friends List Component
 * 
 * Main friends list container with infinite scroll
 */

import React, { useEffect, useRef } from 'react';
import { FriendCard } from './FriendCard';
import { FriendsListSkeleton } from './LoadingSkeleton';
import { NoFriendsEmptyState } from './EmptyState';
import { useFriendsList } from '../../hooks/friends/useFriendsList';

export function FriendsList() {
  const { friends, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage, error } = useFriendsList();
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

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="divide-y divide-gray-100">
        {friends.map((friend) => (
          <FriendCard key={friend.id} friend={friend} />
        ))}
      </div>

      {/* Infinite scroll trigger */}
      <div ref={observerTarget} className="h-4" />

      {/* Loading more indicator */}
      {isFetchingNextPage && (
        <div className="py-4 text-center text-gray-500">
          <div className="inline-block w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="ml-2">Loading more...</span>
        </div>
      )}
    </div>
  );
}
