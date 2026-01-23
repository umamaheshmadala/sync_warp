// =====================================================
// Story 5.2 + Story 11.3.9: My Reviews Page with Insights
// =====================================================

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  ArrowLeft,
  Search,
  Filter,
  Heart,
  Eye,
  Calendar,
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
  const [yearFilter, setYearFilter] = useState<number | undefined>();
  const [editingReview, setEditingReview] = useState<BusinessReviewWithDetails | null>(null);

  // Load user's reviews
  const {
    reviews,
    loading,
    error,
    deleteReview,
    updateReview,
  } = useReviews({});

  // Load user activity stats (now includes helpful votes, responses, views)
  const {
    userActivity,
    loading: statsLoading,
  } = useReviewStats({
    userId: '', // Will use current user
  });

  // Get available years from reviews for year filter
  const availableYears = useMemo(() => {
    const years = new Set(reviews.map(r => new Date(r.created_at).getFullYear()));
    return Array.from(years).sort((a, b) => b - a);
  }, [reviews]);

  // Filter reviews by search, type, and year
  const filteredReviews = useMemo(() => {
    return reviews.filter((review) => {
      // Apply year filter
      if (yearFilter) {
        const reviewYear = new Date(review.created_at).getFullYear();
        if (reviewYear !== yearFilter) return false;
      }

      // Apply search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesText = review.review_text?.toLowerCase().includes(query);
        const matchesTags = review.tags?.some(tag => tag.toLowerCase().includes(query));
        const matchesBusiness = review.business_name?.toLowerCase().includes(query);
        if (!matchesText && !matchesTags && !matchesBusiness) return false;
      }

      // Apply type filter
      if (filterType === 'recommend' && !review.recommendation) return false;
      if (filterType === 'not-recommend' && review.recommendation) return false;

      return true;
    });
  }, [reviews, yearFilter, searchQuery, filterType]);

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

  // Check if a review is well-received (>=5 helpful votes)
  const isWellReceived = (review: BusinessReviewWithDetails) => {
    return (review.helpful_count || 0) >= 5;
  };

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
                Track your review impact and contribution
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Enhanced Statistics - Story 11.3.9 */}
        {!statsLoading && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {/* Total Reviews */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl border border-gray-200 p-4"
            >
              <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-2">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{userActivity?.total_reviews || 0}</div>
              <div className="text-sm text-gray-600">Total Reviews</div>
            </motion.div>

            {/* Helpful Votes */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="bg-white rounded-xl border border-gray-200 p-4"
            >
              <div className="w-10 h-10 rounded-lg bg-green-50 text-green-600 flex items-center justify-center mb-2">
                <Heart className="w-5 h-5" />
              </div>
              <div className="text-2xl font-bold text-green-600">{userActivity?.total_helpful_votes || 0}</div>
              <div className="text-sm text-gray-600">Helpful Votes</div>
            </motion.div>

            {/* Responses Received */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-xl border border-gray-200 p-4"
            >
              <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center mb-2">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{userActivity?.responses_received || 0}</div>
              <div className="text-sm text-gray-600">Responses</div>
            </motion.div>

            {/* Total Views */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="bg-white rounded-xl border border-gray-200 p-4"
            >
              <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center mb-2">
                <Eye className="w-5 h-5" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{userActivity?.total_views || 0}</div>
              <div className="text-sm text-gray-600">Views</div>
            </motion.div>

            {/* Recommend Split */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-xl border border-gray-200 p-4"
            >
              <div className="flex justify-center gap-3 mb-2">
                <span className="flex items-center gap-1 text-green-600">
                  <ThumbsUp className="w-4 h-4" />
                  {userActivity?.positive_reviews || 0}
                </span>
                <span className="flex items-center gap-1 text-red-600">
                  <ThumbsDown className="w-4 h-4" />
                  {userActivity?.negative_reviews || 0}
                </span>
              </div>
              <div className="text-sm text-gray-600 text-center">Recommend Split</div>
            </motion.div>
          </div>
        )}

        {/* Search, Filters, and Year Filter */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search reviews by text, tags, or business..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Filter Buttons and Year Selector */}
            <div className="flex flex-wrap items-center gap-2">
              <Filter className="w-5 h-5 text-gray-500" />
              <div className="flex gap-2 flex-1 flex-wrap">
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

              {/* Year Filter Dropdown */}
              {availableYears.length > 0 && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <select
                    value={yearFilter || 'all'}
                    onChange={(e) => setYearFilter(e.target.value === 'all' ? undefined : parseInt(e.target.value))}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">All time</option>
                    {availableYears.map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Review History Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Review History</h2>
          <span className="text-sm text-gray-500">
            {filteredReviews.length} review{filteredReviews.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Reviews List with Highlighting */}
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
                <div
                  key={review.id}
                  className={`rounded-xl transition-all ${isWellReceived(review)
                    ? 'ring-2 ring-green-200 bg-green-50/30'
                    : ''
                    }`}
                >
                  {/* Well-received badge */}
                  {isWellReceived(review) && (
                    <div className="px-4 py-1.5 bg-green-100 rounded-t-xl border-b border-green-200 flex items-center gap-2 text-sm text-green-700">
                      <Heart className="w-4 h-4 fill-current" />
                      <span>Well-received review ({review.helpful_count}+ helpful votes)</span>
                    </div>
                  )}
                  <ReviewCard
                    review={review}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    showBusinessName
                  />
                </div>
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
              {searchQuery || filterType !== 'all' || yearFilter ? 'No Matching Reviews' : 'No Reviews Yet'}
            </h3>
            <p className="text-gray-600 text-sm">
              {searchQuery || filterType !== 'all' || yearFilter
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
                businessName={editingReview.business_name || 'Business'}
                checkinId={editingReview.checkin_id}
                onSubmit={async (data) => {
                  await handleUpdateReview(editingReview.id, {
                    review_text: data.review_text,
                    photo_urls: data.photo_urls,
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
