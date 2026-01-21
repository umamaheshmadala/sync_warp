// =====================================================
// Story 5.2: Review Card Display Component
// =====================================================

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ThumbsUp,
  ThumbsDown,
  MapPin,
  Calendar,
  Edit2,
  Trash2,
  MoreVertical,
  Image as ImageIcon,
  MessageSquare,
  Reply,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import type { BusinessReviewWithDetails } from '../../types/review';
import { useAuthStore } from '../../store/authStore';
import { deleteReview } from '../../services/reviewService';
import { DeleteReviewDialog } from './DeleteReviewDialog';
import { ReviewPhotoGallery } from './ReviewPhotoGallery';
import ReviewTagDisplay from './ReviewTagDisplay';
import { HelpfulButton } from './HelpfulButton';

interface ReviewCardProps {
  review: BusinessReviewWithDetails;
  onEdit?: (review: BusinessReviewWithDetails) => void;
  onDelete?: (reviewId: string) => void;
  onRespond?: (reviewId: string, businessId: string, existingResponse?: { id: string; response_text: string }) => void;
  showBusinessName?: boolean;
  compact?: boolean;
  isBusinessOwner?: boolean;
}

const ReviewCard = React.forwardRef<HTMLDivElement, ReviewCardProps>(
  (
    {
      review,
      onEdit,
      onDelete,
      onRespond,
      showBusinessName = false,
      compact = false,
      isBusinessOwner = false,
    },
    ref
  ) => {
    const { user } = useAuthStore();
    const queryClient = useQueryClient();
    const [showMenu, setShowMenu] = useState(false);

    // Delete dialog state
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const isOwnReview = user?.id === review.user_id;
    const canEdit = isOwnReview;
    const timeAgo = formatDistanceToNow(new Date(review.created_at), { addSuffix: true });

    const handleEdit = () => {
      setShowMenu(false);
      onEdit?.(review);
    };

    const handleDeleteClick = () => {
      setShowMenu(false);
      setShowDeleteDialog(true);
    };

    const handleConfirmDelete = async () => {
      setIsDeleting(true);
      try {
        // Delegate deletion to parent component via prop
        // This prevents double-delete calls and ensures parent state (like lists) updates correctly
        if (onDelete) {
          await onDelete(review.id);
          toast.success('Review deleted');
        }

        // Also invalidate stats just in case parent doesn't handle it
        queryClient.invalidateQueries({ queryKey: ['review-stats', review.business_id] });
        queryClient.invalidateQueries({ queryKey: ['review-eligibility', review.business_id] });

        setShowDeleteDialog(false);
      } catch (error) {
        console.error('Delete error:', error);
        toast.error('Could not delete review');
      } finally {
        setIsDeleting(false);
      }
    };

    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className={`
          bg-white rounded-xl border border-gray-200 overflow-hidden
          hover:shadow-md transition-shadow
          ${compact ? 'p-4' : 'p-6'}
        `}
      >
        {/* Business Name (if showing in user profile) */}
        {showBusinessName && review.business_name && (
          <div className="mb-3 pb-3 border-b border-gray-200">
            <p className="text-sm font-medium text-gray-900">
              Review for: <span className="text-blue-600">{review.business_name}</span>
            </p>
          </div>
        )}

        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-start gap-3 flex-1">
            {/* User Avatar */}
            <div className="flex-shrink-0">
              {review.user_avatar ? (
                <img
                  src={review.user_avatar}
                  alt={review.user_name}
                  className="w-10 h-10 rounded-full object-cover border border-gray-100"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                  {(review.reviewer_name || 'A').charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            {/* User Info & Recommendation - Compact Mobile Layout */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900 truncate text-sm sm:text-base">
                    {review.reviewer_name || 'SyncWarp User'}
                  </h3>
                  {review.is_edited && (
                    <span className="text-xs text-gray-500 italic flex-shrink-0">(edited)</span>
                  )}
                </div>

                {/* Mobile: Time & Rec inline if space permits, or next line */}
                <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5 sm:mt-0">
                  <span className="flex items-center gap-1">
                    {timeAgo}
                  </span>

                  {/* Compact Recommendation for Mobile */}
                  <div className={`
                      sm:hidden inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full font-medium text-xs
                      ${review.recommendation
                      ? 'bg-green-50 text-green-700'
                      : 'bg-red-50 text-red-700'}
                    `}>
                    {review.recommendation ? <ThumbsUp className="w-3 h-3" /> : <ThumbsDown className="w-3 h-3" />}
                  </div>
                </div>
              </div>

              {/* Desktop Recommendation Badge (Hidden on Mobile to save space) */}
              <div className="hidden sm:flex mt-1">
                <div
                  className={`
                  inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-medium text-xs
                  ${review.recommendation
                      ? 'bg-green-50 text-green-700 border border-green-200'
                      : 'bg-red-50 text-red-700 border border-red-200'
                    }
                `}
                >
                  {review.recommendation ? (
                    <>
                      <ThumbsUp className="w-3 h-3" />
                      Recommends
                    </>
                  ) : (
                    <>
                      <ThumbsDown className="w-3 h-3" />
                      Doesn't Recommend
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Actions Menu */}
          {isOwnReview && (
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1.5 hover:bg-gray-100 rounded-full transition-colors -mr-2"
              >
                <MoreVertical className="w-4 h-4 text-gray-400" />
              </button>
              {/* Menu Content Omitted for Brevity - Keeping Existing Logic */}
              <AnimatePresence>
                {showMenu && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    className="absolute right-0 top-full mt-2 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10"
                  >
                    {canEdit && (
                      <button
                        onClick={handleEdit}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                      >
                        <Edit2 className="w-4 h-4" />
                        Edit
                      </button>
                    )}
                    <button
                      onClick={handleDeleteClick}
                      className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        <DeleteReviewDialog
          isOpen={showDeleteDialog}
          onClose={() => setShowDeleteDialog(false)}
          onConfirm={handleConfirmDelete}
          isDeleting={isDeleting}
        />

        {/* Review Text */}
        {review.review_text && (
          <p className="text-gray-700 text-sm leading-relaxed mb-3">
            {review.review_text}
          </p>
        )}

        {/* Photo Gallery - Reduced Size */}
        <div className="mb-3">
          <ReviewPhotoGallery photos={review.photo_urls} compact={true} />
        </div>

        {/* Tags */}
        {review.tags && review.tags.length > 0 && (
          <div className="mb-3">
            <ReviewTagDisplay tagIds={review.tags} maxVisible={5} />
          </div>
        )}

        {/* Helpful Button - Conditional Divider */}
        {/* Only show top border if there is content above it (text/photos/tags) */}
        <div className={`mt-2 pt-2 ${review.review_text || (review.photo_urls && review.photo_urls.length > 0) ? 'border-t border-gray-50' : ''}`}>
          <HelpfulButton
            reviewId={review.id}
            reviewAuthorId={review.user_id}
            initialCount={review.helpful_count}
          />
        </div>

        {/* Business Owner Response Section */}
        {/* ... (Existing Response Logic) ... */}
        {(review.response_text || (isBusinessOwner && onRespond)) && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            {review.response_text ? (
              // Display existing response
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
              >
                <div className="bg-blue-50/50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className="px-1.5 py-0.5 bg-blue-600 text-white text-[10px] font-bold rounded uppercase tracking-wide">
                        Owner Connection
                      </div>
                      <span className="text-[10px] text-gray-400">
                        {formatDistanceToNow(new Date(review.response_created_at!), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                    {isBusinessOwner && onRespond && (
                      <button
                        onClick={() => onRespond(review.id, review.business_id, {
                          id: review.response_id!,
                          response_text: review.response_text!,
                        })}
                        className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                      >
                        <Edit2 className="w-3 h-3" />
                        Edit
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-gray-700">{review.response_text}</p>
                </div>
              </motion.div>
            ) : isBusinessOwner && onRespond ? (
              // Show "Respond" button for business owners
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => onRespond(review.id, review.business_id)}
                className="
              w-full flex items-center justify-center gap-2 px-4 py-2
              bg-gray-50 hover:bg-gray-100 text-gray-600 hover:text-gray-900
              border border-gray-200 hover:border-gray-300
              rounded-lg text-sm font-medium transition-all
            "
              >
                <Reply className="w-3.5 h-3.5" />
                Respond
              </motion.button>
            ) : null}
          </div>
        )}


      </motion.div>
    );
  }
);

ReviewCard.displayName = 'ReviewCard';

export default ReviewCard;
