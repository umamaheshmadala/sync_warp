// =====================================================
// Story 5.2: My Reviews Page
// =====================================================

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  ArrowLeft,
  Search,
  Filter,
  Edit2,
  Trash2,
  Image as ImageIcon,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ReviewCard from '../components/reviews/ReviewCard';
import BusinessReviewForm from '../components/reviews/BusinessReviewForm';
import { useReviews } from '../hooks/useReviews';
import { useReviewStats } from '../hooks/useReviewStats';
import type { BusinessReviewWithDetails } from '../types/review';

export default function MyReviewsPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'recommend' | 'not-recommend'>('all');
  const [editingReview, setEditingReview] = useState<BusinessReviewWithDetails | null>(null);

  // Load user's reviews
  const {
    reviews,
    loading,
    error,
    deleteReview,
    updateReview,
  } = useReviews({});

  // Load user activity stats
  const {
    userActivity,
    loading: statsLoading,
  } = useReviewStats({
    userId: '', // Will use current user
  });

  // Filter reviews
  const filteredReviews = reviews.filter((review) => {
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesText = review.review_text?.toLowerCase().includes(query);
      const matchesTags = review.tags?.some(tag => tag.toLowerCase().includes(query));
      if (!matchesText && !matchesTags) return false;
    }

    // Apply type filter
    if (filterType === 'recommend' && !review.recommendation) return false;
    if (filterType === 'not-recommend' && review.recommendation) return false;

    return true;
  });

  const handleEdit = (review: BusinessReviewWithDetails) => {
    setEditingReview(review);
  };

  const handleDelete = async (reviewId: string) => {
    try {
      await deleteReview(reviewId);
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const handleUpdateReview = async (reviewId: string, data: any) => {
    try {
      await updateReview(reviewId, data);
      setEditingReview(null);
    } catch (err) {
      console.error('Update error:', err);
      throw err;
    }
  };

  // Statistics cards
  const stats = [
    {
      icon: MessageSquare,
      label: 'Total Reviews',
      value: userActivity?.total_reviews || 0,
      color: 'blue',
    },
    {
      icon: ThumbsUp,
      label: 'Positive',
      value: userActivity?.positive_reviews || 0,
      color: 'green',
    },
    {
      icon: ThumbsDown,
      label: 'Negative',
      value: userActivity?.negative_reviews || 0,
      color: 'red',
    },
    {
      icon: ImageIcon,
      label: 'With Photos',
      value: userActivity?.reviews_with_photos || 0,
      color: 'purple',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">My Reviews</h1>
              <p className="text-sm text-gray-600">
                Manage your business reviews
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Statistics */}
        {!statsLoading && userActivity && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.map((stat) => {
              const Icon = stat.icon;
              const colorClasses = {
                blue: 'text-blue-600 bg-blue-50',
                green: 'text-green-600 bg-green-50',
                red: 'text-red-600 bg-red-50',
                purple: 'text-purple-600 bg-purple-50',
              };

              return (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-xl border border-gray-200 p-4"
                >
                  <div className={`w-10 h-10 rounded-lg ${colorClasses[stat.color as keyof typeof colorClasses]} flex items-center justify-center mb-2`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                  <div className="text-sm text-gray-600">{stat.label}</div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Search and Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search reviews by text or tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Filter Buttons */}
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-500" />
              <div className="flex gap-2 flex-1">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setFilterType('all')}
                  className={`
                    px-4 py-2 rounded-lg text-sm font-medium transition-all
                    ${filterType === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }
                  `}
                >
                  All ({reviews.length})
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setFilterType('recommend')}
                  className={`
                    px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1
                    ${filterType === 'recommend'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }
                  `}
                >
                  <ThumbsUp className="w-4 h-4" />
                  Positive ({reviews.filter(r => r.recommendation).length})
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setFilterType('not-recommend')}
                  className={`
                    px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1
                    ${filterType === 'not-recommend'
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }
                  `}
                >
                  <ThumbsDown className="w-4 h-4" />
                  Negative ({reviews.filter(r => !r.recommendation).length})
                </motion.button>
              </div>
            </div>
          </div>
        </div>

        {/* Reviews List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-3" />
            <p className="text-gray-600">Loading your reviews...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <p className="text-red-600">{error}</p>
          </div>
        ) : filteredReviews.length > 0 ? (
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {filteredReviews.map((review) => (
                <ReviewCard
                  key={review.id}
                  review={review}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  showBusinessName
                />
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-12 bg-white rounded-xl border-2 border-dashed border-gray-300"
          >
            <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {searchQuery || filterType !== 'all' ? 'No Matching Reviews' : 'No Reviews Yet'}
            </h3>
            <p className="text-gray-600 text-sm">
              {searchQuery || filterType !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Start reviewing businesses you visit!'}
            </p>
          </motion.div>
        )}
      </div>

      {/* Edit Review Modal */}
      <AnimatePresence>
        {editingReview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            onClick={() => setEditingReview(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl"
            >
              <BusinessReviewForm
                businessId={editingReview.business_id}
                businessName="Business" // Would need to fetch from business data
                checkinId={editingReview.checkin_id}
                onSubmit={async (data) => {
                  await handleUpdateReview(editingReview.id, {
                    review_text: data.review_text,
                    photo_url: data.photo_url,
                    tags: data.tags,
                  });
                }}
                onCancel={() => setEditingReview(null)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
