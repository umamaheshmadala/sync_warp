
// =====================================================
// Story 11.3.7: Business Reviews List Component (Consolidated)
// =====================================================

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, AlertCircle, Loader2, CheckCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import InfiniteScroll from 'react-infinite-scroll-component';

import ReviewCard from './ReviewCard';
import ReviewFilters from './ReviewFilters';
import ReviewStats from './ReviewStats';
import ReviewResponseForm from './ReviewResponseForm';

import { useInfiniteReviews } from '../../hooks/useInfiniteReviews';
import { useReviewStats } from '../../hooks/useReviewStats';
import { useAuthStore } from '../../store/authStore';
import { createResponse, updateResponse } from '../../services/reviewService';
import type { ReviewFilters as ReviewFiltersType, CreateResponseInput, UpdateResponseInput } from '../../types/review';

interface BusinessReviewsProps {
  businessId: string;
  businessName?: string;
  onEdit?: (review: any) => void;
  onDelete?: (reviewId: string) => void;
  showStats?: boolean;
  showFilters?: boolean;
  isBusinessOwner?: boolean;
}

export default function BusinessReviews({
  businessId,
  businessName,
  onEdit,
  onDelete,
  showStats = true,
  showFilters = true,
  isBusinessOwner = false,
}: BusinessReviewsProps) {
  const { user } = useAuthStore();
  const [filters, setFilters] = useState<ReviewFiltersType>({
    sort_by: 'newest',
  });

  // Response modal state
  const [responseModal, setResponseModal] = useState<{
    reviewId: string;
    businessId: string;
    existingResponse?: { id: string; response_text: string };
  } | null>(null);
  const [isSubmittingResponse, setIsSubmittingResponse] = useState(false);

  // Load reviews with infinite scroll
  const {
    reviews,
    loading,
    error,
    hasMore,
    loadMore,
    refresh
  } = useInfiniteReviews({
    businessId,
    filters: {
      sort_by: filters.sort_by,
      recommendation: filters.recommendation
    }
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
      // We might need to manually remove from list or refresh
      // For now, refreshing the list is safest
      await refresh();
      onDelete?.(reviewId);
      toast.success('Review deleted');
    } catch (err) {
      console.error('Delete error:', err);
      toast.error('Failed to delete review');
    }
  };

  // Handle opening response modal
  const handleRespond = (
    reviewId: string,
    businessId: string,
    existingResponse?: { id: string; response_text: string }
  ) => {
    setResponseModal({ reviewId, businessId, existingResponse });
  };

  // Handle submitting response
  const handleResponseSubmit = async (data: CreateResponseInput | UpdateResponseInput) => {
    if (!responseModal) return;

    setIsSubmittingResponse(true);

    try {
      if (responseModal.existingResponse) {
        // Update existing response
        await updateResponse(
          responseModal.existingResponse.id,
          data as UpdateResponseInput
        );
        toast.success('Response updated successfully!');
      } else {
        // Create new response
        await createResponse(data as CreateResponseInput);
        toast.success('Response posted successfully!');
      }

      setResponseModal(null);
      // Refresh reviews to show the new response
      refresh();
    } catch (error) {
      console.error('Error submitting response:', error);
      throw error;
    } finally {
      setIsSubmittingResponse(false);
    }
  };

  // Initial Loading state (only for first load)
  if (loading && reviews.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
          <p className="text-gray-600">Loading reviews...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && reviews.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Failed to Load Reviews
          </h3>
          <p className="text-gray-600 text-sm">{error}</p>
          <button
            onClick={() => refresh()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
          >
            Try Again
          </button>
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
          onFiltersChange={(newFilters) => {
            setFilters(newFilters);
            // useInfiniteReviews watches filters and auto-refreshes
          }}
          reviewCount={reviews.length}
        />
      )}

      {/* Reviews List with Infinite Scroll */}
      <div className="space-y-4">
        {reviews.length > 0 ? (
          <InfiniteScroll
            dataLength={reviews.length}
            next={loadMore}
            hasMore={hasMore}
            loader={
              <div className="flex justify-center items-center py-6 overflow-hidden">
                <Loader2 className="h-6 w-6 text-indigo-600 animate-spin mr-2" />
                <span className="text-gray-600">Loading more...</span>
              </div>
            }
            endMessage={
              <div className="text-center py-8">
                <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2 opacity-50" />
                <p className="text-gray-500 text-sm">You've seen all the reviews</p>
              </div>
            }
            scrollThreshold={0.8}
            style={{ overflow: 'hidden' }} // Fixes scrollbar issues in some containers
          >
            <div className="space-y-4">
              {reviews.map((review) => (
                <ReviewCard
                  key={review.id}
                  review={review}
                  onEdit={onEdit}
                  onDelete={handleDelete}
                  onRespond={handleRespond}
                  isBusinessOwner={isBusinessOwner}
                />
              ))}
            </div>
          </InfiniteScroll>
        ) : (
          // Empty State
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
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
                  ? `Have you visited ${businessName}? Share your experience!`
                  : 'Be the first to share your experience!'}
            </p>
          </motion.div>
        )}
      </div>

      {/* Response Modal */}
      <AnimatePresence>
        {responseModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            onClick={() => setResponseModal(null)}
          >
            <div onClick={(e) => e.stopPropagation()}>
              <ReviewResponseForm
                reviewId={responseModal.reviewId}
                businessId={responseModal.businessId}
                existingResponse={responseModal.existingResponse}
                onSubmit={handleResponseSubmit}
                onCancel={() => setResponseModal(null)}
                loading={isSubmittingResponse}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
