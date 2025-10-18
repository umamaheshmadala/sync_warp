// =====================================================
// Story 4.10: Storefront Minor Enhancements
// Component: ReviewsLoadingState - Loading skeleton for reviews
// =====================================================

import React from 'react';
import { Skeleton } from '../ui/skeleton';

export interface ReviewsLoadingStateProps {
  /** Number of skeleton cards to show */
  count?: number;
}

/**
 * Loading skeleton for reviews section
 * 
 * Features:
 * - Animated shimmer effect
 * - Configurable number of skeletons
 * - Matches ReviewCard layout
 */
export function ReviewsLoadingState({ count = 3 }: ReviewsLoadingStateProps) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="bg-white rounded-xl border border-gray-200 p-6 space-y-4"
        >
          {/* Header */}
          <div className="flex items-start space-x-4">
            {/* Avatar */}
            <Skeleton className="w-12 h-12 rounded-full flex-shrink-0" />
            
            {/* User Info */}
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-48" />
            </div>
          </div>

          {/* Recommendation Badge */}
          <Skeleton className="h-8 w-40 rounded-full" />

          {/* Review Text */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
          </div>

          {/* Image (optional, show sometimes) */}
          {index % 2 === 0 && (
            <Skeleton className="w-full h-48 rounded-xl" />
          )}
        </div>
      ))}
    </div>
  );
}

export default ReviewsLoadingState;
