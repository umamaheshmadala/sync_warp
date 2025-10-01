// =====================================================
// Story 5.2: Business Reviews List Component
// =====================================================

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, AlertCircle, Loader } from 'lucide-react';
import { toast } from 'react-hot-toast';
import ReviewCard from './ReviewCard';
import ReviewFilters from './ReviewFilters';
import ReviewStats from './ReviewStats';
import ReviewResponseForm from './ReviewResponseForm';
import { useReviews } from '../../hooks/useReviews';
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
  realtime?: boolean;
  isBusinessOwner?: boolean;
}

export default function BusinessReviews({
  businessId,
  businessName,
  onEdit,
  onDelete,
  showStats = true,
  showFilters = true,
  realtime = true,
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
      // Trigger refetch of reviews to show new/updated response
      window.location.reload(); // Simple approach - can be improved with state management
    } catch (error) {
      console.error('Error submitting response:', error);
      throw error; // Let the form handle error display
    } finally {
      setIsSubmittingResponse(false);
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
                onRespond={handleRespond}
                isBusinessOwner={isBusinessOwner}
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
