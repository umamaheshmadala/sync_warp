
import React from 'react';
import InfiniteScroll from 'react-infinite-scroll-component';
import { Star, Loader2, CheckCircle } from 'lucide-react';
import { useInfiniteReviews } from '../../hooks/useInfiniteReviews';
import { ReviewsLoadingState } from './ReviewsLoadingState';
import { ReviewsErrorState } from './ReviewsErrorState';
import ReviewCard from './ReviewCard'; // Import shared component

import type { BusinessReviewWithDetails } from '../../types/review';

interface AllReviewsProps {
  businessId: string;
  filters?: {
    sort_by?: 'newest' | 'oldest' | 'highest_rated' | 'lowest_rated';
    recommendation?: boolean;
    has_text?: boolean;
    has_photo?: boolean;
  };
  onEdit?: (review: BusinessReviewWithDetails) => void;
  onDelete?: (reviewId: string) => void;
}

export const AllReviews: React.FC<AllReviewsProps> = ({
  businessId,
  filters,
  onEdit,
  onDelete
}) => {
  const {
    reviews,
    loading,
    error,
    hasMore,
    loadMore
  } = useInfiniteReviews({ businessId, filters });

  // Initial loading state
  if (loading && reviews.length === 0) {
    return <ReviewsLoadingState count={5} />;
  }

  // Error state
  if (error) {
    return (
      <ReviewsErrorState
        message={error}
        onRetry={() => window.location.reload()}
      />
    );
  }

  // Empty state
  if (reviews.length === 0) {
    return (
      <div className="text-center py-12">
        <Star className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No reviews yet</h3>
        <p className="text-gray-600">Be the first to review this business</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <InfiniteScroll
        dataLength={reviews.length}
        next={loadMore}
        hasMore={hasMore}
        loader={
          <div className="flex justify-center items-center py-6">
            <Loader2 className="h-6 w-6 text-indigo-600 animate-spin mr-2" />
            <span className="text-gray-600">Loading more reviews...</span>
          </div>
        }
        endMessage={
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
            <p className="text-gray-600 font-medium">You've seen all reviews!</p>
            <p className="text-sm text-gray-500 mt-1">
              {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'} total
            </p>
          </div>
        }
        scrollThreshold={0.8}
        className="space-y-6"
      >
        {reviews.map((review) => (
          <ReviewCard
            key={review.id}
            review={review}
            onEdit={onEdit}
            onDelete={onDelete}
            showBusinessName={false}
          />
        ))}
      </InfiniteScroll>
    </div>
  );
};

export default AllReviews;
