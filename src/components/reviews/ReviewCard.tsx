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
    const [showPhoto, setShowPhoto] = useState(false);

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
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-3 flex-1">
            {/* User Avatar */}
            <div className="flex-shrink-0">
              {review.user_avatar ? (
                <img
                  src={review.user_avatar}
                  alt={review.user_name}
                  className="w-12 h-12 rounded-full object-cover border-2 border-gray-100"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
                  {review.user_name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            {/* User Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-gray-900 truncate">
                  {review.user_name}
                </h3>
                {review.is_edited && (
                  <span className="text-xs text-gray-500 italic">(edited)</span>
                )}
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-500">
                {review.user_city && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {review.user_city}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {timeAgo}
                </span>
              </div>
            </div>
          </div>

          {/* Actions Menu */}
          {isOwnReview && (
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <MoreVertical className="w-5 h-5 text-gray-500" />
              </button>

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

        {/* Recommendation Badge */}
        <div className="mb-4">
          <div
            className={`
            inline-flex items-center gap-2 px-4 py-2 rounded-full font-semibold text-sm
            ${review.recommendation
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
              }
          `}
          >
            {review.recommendation ? (
              <>
                <ThumbsUp className="w-4 h-4" />
                Recommends
              </>
            ) : (
              <>
                <ThumbsDown className="w-4 h-4" />
                Doesn't Recommend
              </>
            )}
          </div>
        </div>

        {/* Review Text */}
        {review.review_text && (
          <p className="text-gray-700 leading-relaxed mb-4">
            {review.review_text}
          </p>
        )}

        {/* Photo */}
        {review.photo_url && (
          <div className="mb-4">
            <motion.button
              onClick={() => setShowPhoto(true)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="relative rounded-xl overflow-hidden w-full aspect-video bg-gray-100"
            >
              <img
                src={review.photo_url}
                alt="Review photo"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-10 transition-all flex items-center justify-center">
                <ImageIcon className="w-8 h-8 text-white opacity-0 hover:opacity-100 transition-opacity" />
              </div>
            </motion.button>
          </div>
        )}

        {/* Tags */}
        {review.tags && review.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {review.tags.map((tag, index) => (
              <span
                key={index}
                className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Business Owner Response Section */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          {review.response_text ? (
            // Display existing response
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
            >
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="px-2 py-0.5 bg-blue-600 text-white text-xs font-semibold rounded">
                      OWNER
                    </div>
                    <span className="text-xs text-gray-500">
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
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onRespond(review.id, review.business_id)}
              className="
              w-full flex items-center justify-center gap-2 px-4 py-3
              bg-blue-50 hover:bg-blue-100 text-blue-600 
              border-2 border-dashed border-blue-200 hover:border-blue-300
              rounded-xl font-medium transition-all
            "
            >
              <Reply className="w-4 h-4" />
              Respond to this review
            </motion.button>
          ) : null}
        </div>

        {/* Photo Modal */}
        <AnimatePresence>
          {showPhoto && review.photo_url && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPhoto(false)}
              className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
            >
              <motion.img
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.9 }}
                src={review.photo_url}
                alt="Review photo"
                className="max-w-full max-h-full object-contain rounded-lg"
                onClick={(e) => e.stopPropagation()}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  }
);

ReviewCard.displayName = 'ReviewCard';

export default ReviewCard;
