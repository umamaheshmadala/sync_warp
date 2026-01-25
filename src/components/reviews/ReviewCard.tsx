// =====================================================
// Story 5.2: Review Card Display Component
// =====================================================

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
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
  Share2,
  CheckCircle,
  MessageCircle,
  Flag,
  Check,
} from 'lucide-react';
import { ModerationStatusBadge } from './ModerationStatusBadge';
import { ReportReviewModal } from './ReportReviewModal';
import { hasUserReported } from '../../services/reportService';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import type { BusinessReviewWithDetails } from '../../types/review';
import { useAuthStore } from '../../store/authStore';
import { deleteReview, featureReview, unfeatureReview, deleteResponse } from '../../services/reviewService';
import { ConfirmDeleteDialog } from './ConfirmDeleteDialog';
import { ReviewPhotoGallery } from './ReviewPhotoGallery';
import ReviewTagDisplay from './ReviewTagDisplay';
import { HelpfulButton } from './HelpfulButton';
import { ShareToFriendsModal } from '@/components/chat/ShareToFriendsModal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Pin } from 'lucide-react';

interface ReviewCardProps {
  review: BusinessReviewWithDetails;
  onEdit?: (review: BusinessReviewWithDetails) => void;
  onDelete?: (reviewId: string) => void;
  onRespond?: (reviewId: string, businessId: string, existingResponse?: { id: string; response_text: string }) => void;
  showBusinessName?: boolean;
  compact?: boolean;
  isBusinessOwner?: boolean;
  businessImage?: string;
  isFeatured?: boolean; // New prop
  showFeaturedBadge?: boolean; // New prop
  onFeatureToggle?: () => void; // New prop
  onRefresh?: () => void; // New prop to trigger parent refresh
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
      businessImage,
      isFeatured = false,
      showFeaturedBadge = false,
      onFeatureToggle,
      onRefresh,
    },
    ref
  ) => {
    const { user } = useAuthStore();
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    // Delete dialog state
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Delete Response state
    const [showDeleteResponseDialog, setShowDeleteResponseDialog] = useState(false);
    const [isDeletingResponse, setIsDeletingResponse] = useState(false);

    const [showShareModal, setShowShareModal] = useState(false);

    // Report Review state
    const [showReportModal, setShowReportModal] = useState(false);
    const [hasReported, setHasReported] = useState(false);

    const isOwnReview = user?.id === review.user_id;
    const canEdit = isOwnReview;
    const timeAgo = formatDistanceToNow(new Date(review.created_at), { addSuffix: true });

    // Check if reported
    React.useEffect(() => {
      if (!isOwnReview && user) {
        hasUserReported(review.id).then(setHasReported);
      }
    }, [review.id, isOwnReview, user]);

    const handleFeatureClick = async () => {
      try {
        if (isFeatured) {
          await unfeatureReview(review.id);
          toast.success('Review unpinned');
        } else {
          await featureReview(review.id);
          toast.success('Review pinned!');
        }
        // Invalidate queries to refresh list
        queryClient.invalidateQueries({ queryKey: ['featured-reviews', review.business_id] });
        queryClient.invalidateQueries({ queryKey: ['business-reviews', review.business_id] });
        onFeatureToggle?.();
      } catch (error: any) {
        toast.error(error.message || 'Could not update pin status');
      }
    };

    const handleEdit = () => {
      onEdit?.(review);
    };

    const handleDeleteClick = () => {
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

    const handleDeleteResponseClick = () => {
      setShowDeleteResponseDialog(true);
    };

    const handleConfirmDeleteResponse = async () => {
      if (!review.response_id) return;

      setIsDeletingResponse(true);
      try {
        await deleteResponse(review.response_id);
        toast.success('Response deleted');

        // Invalidate queries to refresh UI
        queryClient.invalidateQueries({ queryKey: ['business-reviews', review.business_id] });
        queryClient.invalidateQueries({ queryKey: ['reviews-list'] });
        queryClient.invalidateQueries({ queryKey: ['all-reviews'] });
        queryClient.invalidateQueries({ queryKey: ['user-reviews'] });

        // Trigger manual refresh if parent provided callback (for non-React Query lists)
        onRefresh?.();

        setShowDeleteResponseDialog(false);
      } catch (error: any) {
        console.error('Delete response error:', error);
        toast.error(error.message || 'Could not delete response');
      } finally {
        setIsDeletingResponse(false);
      }
    };

    return (
      <motion.div
        ref={ref}
        id={`review-${review.id}`} // Add ID for deep linking
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className={`
          bg-white rounded-xl border overflow-hidden
          hover:shadow-md transition-shadow
          ${compact ? 'p-4' : 'p-6'}
          ${isFeatured ? 'border-indigo-200 bg-indigo-50/10' : 'border-gray-200'}
        `}
      >
        {/* Featured Badge */}
        {showFeaturedBadge && isFeatured && (
          <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 mb-2">
            <Pin className="w-3.5 h-3.5 fill-indigo-600" />
            Featured Review
          </div>
        )}

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

            {/* User Info & Recommendation */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900 truncate text-sm sm:text-base">
                    {review.reviewer_name || 'SyncWarp User'}
                  </h3>

                  {/* Recommendation Icon - Prominent & Adjacent */}
                  <div
                    className={`flex items-center justify-center w-6 h-6 rounded-full ${review.recommendation
                      ? 'bg-green-100 text-green-600'
                      : 'bg-red-100 text-red-600'
                      }`}
                    title={review.recommendation ? "Recommended" : "Not Recommended"}
                  >
                    {review.recommendation ? <ThumbsUp className="w-3.5 h-3.5" /> : <ThumbsDown className="w-3.5 h-3.5" />}
                  </div>

                  {/* Edit status is no longer in interface, maybe derive or remove? Removing for now to fix error */}
                </div>

                <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5 sm:mt-0">
                  <span className="flex items-center gap-1">
                    {timeAgo}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Show moderation status for user's own reviews */}
            {isOwnReview && review.moderation_status !== 'approved' && (
              <ModerationStatusBadge
                status={review.moderation_status}
                rejectionReason={review.rejection_reason || undefined}
              />
            )}
            {/* Share Button */}
            <button
              onClick={() => setShowShareModal(true)}
              className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
              title="Share Review"
            >
              <Share2 className="w-4 h-4" />
            </button>

            {/* Message Reviewer Button (Story 11.3.3.4) */}
            {!isOwnReview && !isBusinessOwner && (
              <button
                onClick={async () => {
                  try {
                    // Start conversation
                    const { messagingService } = await import('../../services/messagingService');
                    const conversationId = await messagingService.createOrGetConversation(review.user_id);

                    // Navigate to chat with context
                    navigate(`/messages/${conversationId}`, {
                      state: {
                        initialMessage: `Asking about your review of ${review.business_name || 'Business'}`
                      }
                    });
                  } catch (error) {
                    console.error('Failed to start chat:', error);
                    toast.error('Could not start chat');
                  }
                }}
                className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-full transition-colors"
                title="Message Reviewer"
              >
                <MessageSquare className="w-4 h-4" />
              </button>
            )}

            {/* Actions Menu */}
            {(isOwnReview || isBusinessOwner || user) && (
              <div className="relative">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-200"
                    >
                      <MoreVertical className="w-4 h-4 text-gray-500" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    {/* Business Owner Actions */}
                    {isBusinessOwner && (
                      <DropdownMenuItem onClick={handleFeatureClick} className="cursor-pointer">
                        <Pin className="w-4 h-4 mr-2" />
                        {isFeatured ? 'Unpin Review' : 'Pin Review'}
                      </DropdownMenuItem>
                    )}

                    {/* User Actions */}
                    {isOwnReview && canEdit && (
                      <DropdownMenuItem onClick={handleEdit} className="cursor-pointer">
                        <Edit2 className="w-4 h-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                    )}
                    {isOwnReview && (
                      <DropdownMenuItem onClick={handleDeleteClick} className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50">
                        <Trash2 className="w-4 h-4 mr-2" />
                      </DropdownMenuItem>
                    )}

                    {/* Report Option (for non-owners) */}
                    {!isOwnReview && user && (
                      <>
                        {(isOwnReview || isBusinessOwner) && <DropdownMenuSeparator />}
                        <DropdownMenuItem
                          onClick={() => setShowReportModal(true)}
                          disabled={hasReported}
                          className={hasReported ? 'text-gray-400' : 'text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer'}
                        >
                          {hasReported ? (
                            <>
                              <Check className="w-4 h-4 mr-2" />
                              Reported
                            </>
                          ) : (
                            <>
                              <Flag className="w-4 h-4 mr-2" />
                              Report Review
                            </>
                          )}
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}

          </div>
        </div>

        <ConfirmDeleteDialog
          isOpen={showDeleteDialog}
          onClose={() => setShowDeleteDialog(false)}
          onConfirm={handleConfirmDelete}
          isDeleting={isDeleting}
          title="Delete Review?"
          description="Are you sure you want to delete this review? This action cannot be undone."
          confirmLabel="Delete Review"
        />

        <ConfirmDeleteDialog
          isOpen={showDeleteResponseDialog}
          onClose={() => setShowDeleteResponseDialog(false)}
          onConfirm={handleConfirmDeleteResponse}
          isDeleting={isDeletingResponse}
          title="Delete Response?"
          description="Are you sure you want to delete your response? This action cannot be undone."
          confirmLabel="Delete Response"
        />

        {/* Review Text */}
        {
          review.text && (
            <p className="text-gray-900 text-sm leading-relaxed mb-3 whitespace-pre-wrap break-words">
              {review.text}
            </p>
          )
        }

        {/* Photo Gallery - Reduced Size */}
        <div className="mb-3">
          <ReviewPhotoGallery photos={review.photo_urls} compact={true} />
        </div>

        {/* Tags */}
        {
          review.tags && review.tags.length > 0 && (
            <div className="mb-3">
              <ReviewTagDisplay tagIds={review.tags.map(t => t.id)} maxVisible={5} />
            </div>
          )
        }

        {/* Helpful Button - Conditional Divider */}
        <div className={`mt-2 pt-2 ${review.text || (review.photo_urls && review.photo_urls.length > 0) ? 'border-t border-gray-50' : ''}`}>
          <HelpfulButton
            reviewId={review.id}
            reviewAuthorId={review.user_id}
            initialCount={0} // Fixed to 0 as helpful_count removed from type, or should be added back?
          />
        </div>

        {/* Business Owner Response Section */}
        {
          (review.response_text || (isBusinessOwner && onRespond)) && (
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
                        <div className="flex items-center gap-2">
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
                          <button
                            onClick={handleDeleteResponseClick}
                            className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1"
                          >
                            <Trash2 className="w-3 h-3" />
                            Delete
                          </button>
                        </div>
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
          )
        }

        <ShareToFriendsModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          contentType="review"
          contentId={review.id}
          title={`Review of ${review.business_name || 'Business'} by ${review.reviewer_name || 'User'}`}
          previewData={{
            reviewerName: review.reviewer_name || 'SyncWarp User',
            reviewerAvatar: review.user_avatar,
            recommendation: review.recommendation,
            excerpt: review.text?.slice(0, 100),
            businessName: review.business_name || 'Business',
            businessId: review.business_id,
            businessImage: businessImage
          }}
        />
        <ReportReviewModal
          isOpen={showReportModal}
          onClose={() => setShowReportModal(false)}
          reviewId={review.id}
          onReported={() => setHasReported(true)}
        />
      </motion.div >
    );
  }
);

ReviewCard.displayName = 'ReviewCard';

export default ReviewCard;
