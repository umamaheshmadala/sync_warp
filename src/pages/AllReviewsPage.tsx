
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft,
    Search,
    Filter,
    ThumbsUp,
    ThumbsDown,
    Star
} from 'lucide-react';
import { useBusinessProfile } from '../hooks/business/useBusinessProfile';
import { AllReviews } from '../components/reviews/AllReviews';
import { updateReview, deleteReview } from '../services/reviewService';
import BusinessReviewForm from '../components/reviews/BusinessReviewForm';
import type { BusinessReviewWithDetails } from '../types/review';
import { toast } from 'react-hot-toast';

export default function AllReviewsPage() {
    const { id: businessId } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { data: business, isLoading: businessLoading } = useBusinessProfile(businessId);

    // State for filters
    const [filterType, setFilterType] = useState<'all' | 'recommend' | 'not-recommend'>('all');
    const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'highest_rated' | 'lowest_rated'>('newest');

    // State for editing
    const [editingReview, setEditingReview] = useState<BusinessReviewWithDetails | null>(null);

    if (!businessId) return null;

    // Handlers
    const handleEdit = (review: BusinessReviewWithDetails) => {
        setEditingReview(review);
    };

    const handleDelete = async (reviewId: string) => {
        try {
            await deleteReview(reviewId);
            toast.success('Review deleted successfully');
            // Simple reload to refresh the list since precise cache invalidation for infinite scroll is complex
            window.location.reload();
        } catch (error) {
            console.error('Failed to delete review:', error);
            toast.error('Failed to delete review');
        }
    };

    const handleUpdate = async (data: any) => {
        if (!editingReview) return;
        try {
            await updateReview(editingReview.id, {
                review_text: data.review_text,
                photo_url: data.photo_url,
                recommendation: data.recommendation,
                tags: data.tags
            });
            toast.success('Review updated successfully');
            setEditingReview(null);
            window.location.reload();
        } catch (error) {
            console.error('Failed to update review:', error);
            toast.error('Failed to update review');
        }
    };

    // Construct filters object for AllReviews
    const filters = {
        sort_by: sortBy,
        recommendation: filterType === 'all' ? undefined : filterType === 'recommend',
    };

    // Set page title
    useEffect(() => {
        if (business) {
            document.title = `${business.business_name} Reviews - SynC`;
        } else {
            document.title = 'Reviews - SynC';
        }
    }, [business]);

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-20">
                <div className="max-w-2xl mx-auto px-4 py-4">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate(-1)}
                            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-gray-600" />
                        </button>
                        <div className="flex-1">
                            <h1 className="text-xl font-bold text-gray-900 truncate">
                                {businessLoading ? 'Loading...' : business?.business_name}
                            </h1>
                            <div className="flex items-center gap-1 text-sm text-gray-500">
                                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                <span>
                                    {business ? `${business.average_rating} (${business.total_reviews} reviews)` : '...'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
                {/* Filters and Sort */}
                <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
                    {/* Filters */}
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => setFilterType('all')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filterType === 'all'
                                ? 'bg-gray-900 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            All
                        </button>
                        <button
                            onClick={() => setFilterType('recommend')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${filterType === 'recommend'
                                ? 'bg-green-600 text-white'
                                : 'bg-green-50 text-green-700 hover:bg-green-100'
                                }`}
                        >
                            <ThumbsUp className="w-4 h-4" />
                            Recommended
                        </button>
                        <button
                            onClick={() => setFilterType('not-recommend')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${filterType === 'not-recommend'
                                ? 'bg-red-600 text-white'
                                : 'bg-red-50 text-red-700 hover:bg-red-100'
                                }`}
                        >
                            <ThumbsDown className="w-4 h-4" />
                            Not Recommended
                        </button>
                    </div>

                    {/* Sort */}
                    <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                        <span className="text-sm text-gray-500 font-medium">Sort by:</span>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as any)}
                            className="text-sm border-none bg-transparent font-medium text-gray-900 focus:ring-0 cursor-pointer"
                        >
                            <option value="newest">Newest First</option>
                            <option value="oldest">Oldest First</option>
                            {/* <option value="highest_rated">Highest Rated</option> */}
                            {/* <option value="lowest_rated">Lowest Rated</option> */}
                        </select>
                    </div>
                </div>

                {business && (
                    <AllReviews
                        businessId={business.id}
                        filters={filters}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                    />
                )}
            </div>

            {/* Edit Review Modal */}
            <AnimatePresence>
                {editingReview && business && (
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
                                businessId={business.id}
                                businessName={business.business_name}
                                checkinId={editingReview.checkin_id}
                                editMode={true}
                                existingReview={editingReview}
                                onSubmit={async () => { }} // Not used in edit mode, but required by prop types
                                onCancel={() => setEditingReview(null)}
                            />
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
