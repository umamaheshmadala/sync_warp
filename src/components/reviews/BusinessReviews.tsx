// =====================================================
// Story 5.2: Business Reviews List Component
// =====================================================

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, AlertCircle, Loader } from 'lucide-react';
import ReviewCard from './ReviewCard';
import ReviewFilters from './ReviewFilters';
import ReviewStats from './ReviewStats';
import { useReviews } from '../../hooks/useReviews';
import { useReviewStats } from '../../hooks/useReviewStats';
import type { ReviewFilters as ReviewFiltersType } from '../../types/review';

interface BusinessReviewsProps {
  businessId: string;
  businessName?: string;
  onEdit?: (review: any) => void;
  onDelete?: (reviewId: string) => void;
  showStats?: boolean;
  showFilters?: boolean;
  realtime?: boolean;
}

export default function BusinessReviews({
  businessId,
  businessName,
  onEdit,
  onDelete,
  showStats = true,
  showFilters = true,
  realtime = true,
}: BusinessReviewsProps) {
  const [filters, setFilters] = useState<ReviewFiltersType>({
    sort_by: 'newest',
  });

  // Load reviews with filters
  const {
    reviews,
    loading: reviewsLoading,
    error: reviewsError,
    deleteReview,
  } = useReviews({
    businessId,
    filters,
    realtime,
  });

  // Load statistics
  const {
    stats,
    loading: statsLoading,
  } = useReviewStats({
    businessId,
  });

  const handleDelete = async (reviewId: string) => {
    try {
      await deleteReview(reviewId);
      onDelete?.(reviewId);
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  // Loading state
  if (reviewsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
          <p className="text-gray-600">Loading reviews...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (reviewsError) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Failed to Load Reviews
          </h3>
          <p className="text-gray-600 text-sm">{reviewsError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics */}
      {showStats && stats && (
        <ReviewStats stats={stats} loading={statsLoading} />
      )}

      {/* Filters */}
      {showFilters && (
        <ReviewFilters
          filters={filters}
          onFiltersChange={setFilters}
          reviewCount={reviews.length}
        />
      )}

      {/* Reviews List */}
      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {reviews.length > 0 ? (
            reviews.map((review) => (
              <ReviewCard
                key={review.id}
                review={review}
                onEdit={onEdit}
                onDelete={handleDelete}
              />
            ))
          ) : (
            // Empty State
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300"
            >
              <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No Reviews Yet
              </h3>
              <p className="text-gray-600 text-sm max-w-sm mx-auto">
                {filters.recommendation !== undefined
                  ? `No ${filters.recommendation ? 'positive' : 'negative'} reviews found.`
                  : businessName
                  ? `Be the first to review ${businessName}!`
                  : 'Be the first to leave a review!'}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Review Count Footer */}
      {reviews.length > 0 && (
        <div className="text-center pt-4 pb-2">
          <p className="text-sm text-gray-500">
            Showing {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}
          </p>
        </div>
      )}
    </div>
  );
}
