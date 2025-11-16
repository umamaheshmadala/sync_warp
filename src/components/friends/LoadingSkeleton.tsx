/**
 * LoadingSkeleton Component
 * Story 9.3.1: Friends List Component
 * 
 * Skeleton loader for friends list while fetching data
 */

import React from 'react';

export function FriendCardSkeleton() {
  return (
    <div className="flex items-center gap-3 p-4 animate-pulse">
      {/* Avatar skeleton */}
      <div className="w-12 h-12 bg-gray-200 rounded-full flex-shrink-0" />
      
      {/* Content skeleton */}
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-3 bg-gray-200 rounded w-1/2" />
      </div>
      
      {/* Actions skeleton */}
      <div className="flex gap-2">
        <div className="w-8 h-8 bg-gray-200 rounded" />
        <div className="w-8 h-8 bg-gray-200 rounded" />
      </div>
    </div>
  );
}

export function FriendsListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-0">
      {Array.from({ length: count }).map((_, i) => (
        <FriendCardSkeleton key={i} />
      ))}
    </div>
  );
}
