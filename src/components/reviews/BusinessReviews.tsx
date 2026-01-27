
// =====================================================
// Story 11.3.7: Business Reviews List Component (Consolidated)
// =====================================================

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, AlertCircle, Loader2, CheckCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import InfiniteScroll from 'react-infinite-scroll-component';
import { useQuery } from '@tanstack/react-query';

import ReviewCard from './ReviewCard';
import { FeaturedReviews } from './FeaturedReviews';
import { EnhancedReviewFilters } from './EnhancedReviewFilters';
import ReviewStats from './ReviewStats';
import ReviewResponseForm from './ReviewResponseForm';

import { useInfiniteReviews } from '../../hooks/useInfiniteReviews';
import { useReviewStats } from '../../hooks/useReviewStats';
import { useAuthStore } from '../../store/authStore';
import { createResponse, updateResponse, deleteReview, getPopularTags, getPhotoReviewCount } from '../../services/reviewService';
import type { ReviewFilters as ReviewFiltersType, CreateResponseInput, UpdateResponseInput } from '../../types/review';

interface BusinessReviewsProps {
  businessId: string;
  businessName?: string;
  onEdit?: (review: any) => void;
  onDelete?: (reviewId: string) => void;
  showStats?: boolean;
  showFilters?: boolean;
  isBusinessOwner?: boolean;
  businessImage?: string;
  userReview?: any;
}

export default function BusinessReviews({
  businessId,
  businessName,
  onEdit,
  onDelete,
  showStats = true,
  showFilters = true,
  isBusinessOwner = false,
  businessImage,
  userReview,
}: BusinessReviewsProps) {
  const { user } = useAuthStore();

  // Filter States
  const [filters, setFilters] = useState<ReviewFiltersType>({
    sort_by: 'newest',
  });
  const [withPhotosOnly, setWithPhotosOnly] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Statistics Data (for filters)
  const { data: popularTags = [] } = useQuery({
    queryKey: ['popular-tags', businessId],
    queryFn: () => getPopularTags(businessId),
    staleTime: 1000 * 60 * 5 // 5 minutes
  });

  const { data: photoCount = 0 } = useQuery({
    queryKey: ['photo-review-count', businessId],
    queryFn: () => getPhotoReviewCount(businessId),
    staleTime: 1000 * 60 * 5
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
    refresh,
    removeReview // Destructure new method
  } = useInfiniteReviews({
    businessId,
    filters: {
      sort_by: filters.sort_by,
      recommendation: filters.recommendation,
      has_photo: withPhotosOnly,
      tags: selectedTags.length > 0 ? selectedTags : undefined
    }
  });

  // Load statistics (top summary)
  const {
    stats,
    loading: statsLoading,
  } = useReviewStats({
    businessId,
  });

  const handleDelete = async (reviewId: string) => {
    try {
      // 1. Optimistic Update: Remove immediately from UI
      removeReview(reviewId);

      // 2. Call API
      await deleteReview(reviewId);

      // 3. Notify parent / Success toast
      onDelete?.(reviewId);
      toast.success('Review deleted');
    } catch (err) {
      console.error('Delete error:', err);
      toast.error('Failed to delete review');
      // 4. On Error: Refresh to restore state (rollback)
      refresh();
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
        await updateResponse(
          responseModal.existingResponse.id,
          data as UpdateResponseInput
        );
        toast.success('Response updated successfully!');
      } else {
        await createResponse(data as CreateResponseInput);
        toast.success('Response posted successfully!');
      }

      setResponseModal(null);
      refresh();
    } catch (error) {
      console.error('Error submitting response:', error);
      throw error;
    } finally {
      setIsSubmittingResponse(false);
    }
  };

  // Show generic loading only on initial empty state
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

  // Filter out featured reviews from the main list to avoid duplicates
  // But ONLY if we are on the default sort/filter view.
  // If user is filtering/sorting specially, we might want to show everything in that order?
  // Story says "Featured reviews excluded from main list (no duplicates)" generally.
  // However, if I filter by "Negative", and a featured review is Negative, it should probably show up in the list if it matches?
  // Actually, featured reviews are usually pinned at the top. If I sort by "Most Helpful", they might not be at top anymore?
  // The FeaturedReviews component is ALWAYS displayed at the top.
  // So we should ALWAYS filter them out of the main list to simulate them being "pinned" at the top.
  const displayedReviews = reviews.filter(r => !r.is_featured);
  const reviewsCount = reviews.length; // Approximate total

  return (
    <div className="space-y-3">
      {/* Statistics - Moved to Analytics Tab */}
      {/* {showStats && stats && (
        <ReviewStats stats={stats} loading={statsLoading} />
      )} */}

      {/* Enhanced Filters */}
      {showFilters && (
        <EnhancedReviewFilters
          filters={filters}
          onFilterChange={setFilters}
          withPhotosOnly={withPhotosOnly}
          onWithPhotosChange={setWithPhotosOnly}
          selectedTags={selectedTags}
          onTagsChange={setSelectedTags}
          popularTags={popularTags}
          photoCount={photoCount}
          totalCount={stats?.total_reviews || reviewsCount}
        />
      )}

      {/* Featured Reviews (Pinned) */}
      {/* Only show featured reviews if no specific filters that might hide them are applied, 
          OR always show them? 
          Usually pinned reviews stay visible. But if I filter for "Negative" and pinned are all "Positive", should they hide?
          For now, keep them visible as they are important. */}
      {filters.sort_by === 'newest' && !withPhotosOnly && selectedTags.length === 0 && filters.recommendation === undefined && (
        <FeaturedReviews businessId={businessId} isOwner={isBusinessOwner} onRefresh={() => refresh()} />
      )}

      {/* Reviews List with Infinite Scroll */}
      <div className="space-y-3">
        {displayedReviews.length > 0 ? (
          <InfiniteScroll
            dataLength={displayedReviews.length}
            next={loadMore}
            hasMore={hasMore}
            loader={
              <div className="flex justify-center items-center py-6 overflow-hidden">
                <Loader2 className="h-6 w-6 text-indigo-600 animate-spin mr-2" />
                <span className="text-gray-600">Loading more...</span>
              </div>
            }
            endMessage={null} // We handle empty/end state manually or just let it be silent
            scrollThreshold={0.8}
            style={{ overflow: 'hidden' }}
          >
            <div className="space-y-4">
              {/* User Review Pinned to Top */}
              {userReview && (
                <ReviewCard
                  key={userReview.id}
                  review={userReview}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onRespond={undefined} // User can't respond to their own review in this context usually, or handled elsewhere
                  isBusinessOwner={isBusinessOwner}
                  businessImage={businessImage}
                  isFeatured={false}
                  onRefresh={() => { }}
                />
              )}

              {displayedReviews
                .filter(r => r.id !== userReview?.id) // Prevent duplicate
                .map((review) => (
                  <ReviewCard
                    key={review.id}
                    review={review}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onRespond={undefined} // Or handleRespond if owner
                    isBusinessOwner={isBusinessOwner}
                    businessImage={businessImage}
                    isFeatured={false}
                    onRefresh={refresh}
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
              No Reviews Found
            </h3>
            <p className="text-gray-600 text-sm max-w-sm mx-auto">
              No reviews match your current filters. Try adjusting them.
            </p>
            <button
              onClick={() => {
                setFilters({ sort_by: 'newest' });
                setWithPhotosOnly(false);
                setSelectedTags([]);
              }}
              className="mt-4 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm font-medium"
            >
              Clear All Filters
            </button>
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
