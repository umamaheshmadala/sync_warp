// AllReviews.tsx
// Component for displaying all reviews with infinite scroll

import React from 'react';
import InfiniteScroll from 'react-infinite-scroll-component';
import { Star, Loader2, CheckCircle } from 'lucide-react';
import { useInfiniteReviews } from '../../hooks/useInfiniteReviews';
import { ReviewsLoadingState } from './ReviewsLoadingState';
import { ReviewsErrorState } from './ReviewsErrorState';

interface AllReviewsProps {
  businessId: string;
  sortBy?: 'recent' | 'rating' | 'helpful';
  minRating?: number;
}

export const AllReviews: React.FC<AllReviewsProps> = ({
  businessId,
  sortBy = 'recent',
  minRating
}) => {
  const {
    reviews,
    isLoading,
    error,
    hasMore,
    loadMore
  } = useInfiniteReviews(businessId, { sortBy, minRating });

  // Initial loading state
  if (isLoading && reviews.length === 0) {
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
          <ReviewCard key={review.id} review={review} />
        ))}
      </InfiniteScroll>
    </div>
  );
};

// Individual Review Card Component
interface ReviewCardProps {
  review: {
    id: string;
    user_id: string;
    rating: number;
    review_text?: string;
    created_at: string;
    user_name?: string;
    user_avatar?: string;
  };
}

const ReviewCard: React.FC<ReviewCardProps> = ({ review }) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          {/* User Avatar */}
          <div className="flex-shrink-0">
            {review.user_avatar ? (
              <img
                src={review.user_avatar}
                alt={review.user_name || 'User'}
                className="h-10 w-10 rounded-full object-cover"
              />
            ) : (
              <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                <span className="text-indigo-600 font-medium">
                  {review.user_name?.[0]?.toUpperCase() || 'U'}
                </span>
              </div>
            )}
          </div>

          {/* User Info */}
          <div>
            <h4 className="font-medium text-gray-900">
              {review.user_name || 'Anonymous User'}
            </h4>
            <p className="text-sm text-gray-500">{formatDate(review.created_at)}</p>
          </div>
        </div>

        {/* Rating */}
        <div className="flex items-center space-x-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className={`h-5 w-5 ${
                star <= review.rating
                  ? 'text-yellow-400 fill-yellow-400'
                  : 'text-gray-300'
              }`}
            />
          ))}
          <span className="ml-2 text-sm font-medium text-gray-700">
            {review.rating}.0
          </span>
        </div>
      </div>

      {/* Review Text */}
      {review.review_text && (
        <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
          {review.review_text}
        </p>
      )}
    </div>
  );
};

export default AllReviews;
