// =====================================================
// User Reviews List Component
// =====================================================
// Displays all reviews written by the user across all businesses

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, AlertCircle, Loader, Trash2, Edit2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import ReviewCard from './ReviewCard';
import BusinessReviewForm from './BusinessReviewForm';
import { useReviews } from '../../hooks/useReviews';
import { useAuthStore } from '../../store/authStore';
import type { BusinessReviewWithDetails } from '../../types/review';

export default function UserReviewsList() {
  const { user } = useAuthStore();
  const [editingReview, setEditingReview] = useState<BusinessReviewWithDetails | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // Load user's reviews
  const {
    reviews,
    loading,
    error,
    deleteReview,
    refreshReviews,
  } = useReviews({
    userId: user?.id,
    realtime: true,
  });

  // Handle edit review
  const handleEditReview = (review: BusinessReviewWithDetails) => {
    setEditingReview(review);
    setShowEditModal(true);
  };

  // Handle delete review
  const handleDeleteReview = async (reviewId: string) => {
    if (!window.confirm('Are you sure you want to delete this review? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteReview(reviewId);
      toast.success('Review deleted successfully');
    } catch (err) {
      console.error('Delete error:', err);
      toast.error('Failed to delete review');
    }
  };

  // Handle close edit modal
  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setEditingReview(null);
    refreshReviews();
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
          <p className="text-gray-600">Loading your reviews...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Failed to Load Reviews
          </h3>
          <p className="text-gray-600 text-sm">{error}</p>
          <button
            onClick={() => refreshReviews()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Edit Review Modal */}
      <AnimatePresence>
        {showEditModal && editingReview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            onClick={handleCloseEditModal}
          >
            <div onClick={(e) => e.stopPropagation()}>
              <BusinessReviewForm
                businessId={editingReview.business_id}
                businessName="" // Will be fetched if needed
                checkinId={editingReview.checkin_id}
                onSubmit={async () => {
                  await refreshReviews();
                  handleCloseEditModal();
                }}
                onCancel={handleCloseEditModal}
                editMode={true}
                existingReview={editingReview}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">My Reviews</h2>
            <p className="text-sm text-gray-600 mt-1">
              {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'} written
            </p>
          </div>
          <a
            href="/reviews"
            className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
          >
            View All
          </a>
        </div>

        {/* Reviews List */}
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {reviews.length > 0 ? (
              reviews.map((review) => (
                <ReviewCard
                  key={review.id}
                  review={review}
                  onEdit={handleEditReview}
                  onDelete={handleDeleteReview}
                  showBusinessName={true}
                  isBusinessOwner={false}
                />
              ))
            ) : (
              // Empty State
              // Compact Empty State
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="py-6 text-center"
              >
                <p className="text-sm font-medium text-gray-900">No Reviews Yet</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Your reviews will appear here.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </>
  );
}
