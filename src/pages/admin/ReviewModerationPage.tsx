import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, XCircle, AlertCircle, Calendar, MapPin, Tag } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import {
    getPendingReviews,
    approveReview,
    rejectReview,
    type PendingReview
} from '../../services/moderationService';
import { ReviewPhotoGallery } from '../../components/reviews/ReviewPhotoGallery';

export default function ReviewModerationPage() {
    const navigate = useNavigate();
    const [reviews, setReviews] = useState<PendingReview[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);

    // Rejection modal state
    const [rejectingId, setRejectingId] = useState<string | null>(null);
    const [rejectionReason, setRejectionReason] = useState('');

    useEffect(() => {
        loadReviews();
    }, []);

    const loadReviews = async () => {
        try {
            setLoading(true);
            const data = await getPendingReviews();
            setReviews(data);
        } catch (error) {
            console.error('Failed to load reviews:', error);
            toast.error('Failed to load moderation queue');
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (reviewId: string) => {
        try {
            setProcessingId(reviewId);
            await approveReview(reviewId);
            toast.success('Review approved and published');
            setReviews(prev => prev.filter(r => r.id !== reviewId));
        } catch (error: any) {
            toast.error(error.message || 'Failed to approve review');
        } finally {
            setProcessingId(null);
        }
    };

    const handleRejectClick = (reviewId: string) => {
        setRejectingId(reviewId);
        setRejectionReason('');
    };

    const handleConfirmReject = async () => {
        if (!rejectingId || !rejectionReason.trim()) return;

        try {
            setProcessingId(rejectingId);
            await rejectReview(rejectingId, rejectionReason);
            toast.success('Review rejected');
            setReviews(prev => prev.filter(r => r.id !== rejectingId));
            setRejectingId(null);
        } catch (error: any) {
            toast.error(error.message || 'Failed to reject review');
        } finally {
            setProcessingId(null);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="mb-8 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/admin')}
                            className="p-2 hover:bg-white rounded-full transition-colors"
                        >
                            <ArrowLeft size={24} className="text-gray-600" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Review Moderation Queue</h1>
                            <p className="text-gray-500 text-sm mt-1">
                                {reviews.length} pending reviews requiring approval
                            </p>
                        </div>
                    </div>
                </div>

                {/* List */}
                {reviews.length === 0 ? (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                        <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle size={32} className="text-green-500" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">All Caught Up!</h3>
                        <p className="text-gray-500">There are no pending reviews to moderate.</p>
                        <button
                            onClick={() => navigate('/admin')}
                            className="mt-6 text-indigo-600 font-medium hover:text-indigo-700"
                        >
                            Return to Dashboard
                        </button>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {reviews.map(review => (
                            <div
                                key={review.id}
                                className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
                            >
                                {/* Review Header */}
                                <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex flex-wrap gap-4 justify-between items-start">
                                    <div className="flex gap-4">
                                        <div className="flex-shrink-0">
                                            {review.user.avatar_url ? (
                                                <img
                                                    src={review.user.avatar_url}
                                                    alt=""
                                                    className="w-10 h-10 rounded-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                                                    {review.user.full_name?.charAt(0) || 'U'}
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-gray-900">{review.user.full_name}</h3>
                                            <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                                                <span>reviewed</span>
                                                <span className="font-medium text-gray-700">{review.business.name}</span>
                                                <span>•</span>
                                                <span className="flex items-center gap-1">
                                                    <Calendar size={12} />
                                                    {formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1.5 ${review.recommendation
                                            ? 'bg-green-100 text-green-700'
                                            : 'bg-red-100 text-red-700'
                                        }`}>
                                        {review.recommendation ? (
                                            <><CheckCircle size={14} /> Recommends</>
                                        ) : (
                                            <><XCircle size={14} /> Doesn't Recommend</>
                                        )}
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="p-6">
                                    {review.text && (
                                        <p className="text-gray-800 leading-relaxed mb-4 text-lg">
                                            {review.text}
                                        </p>
                                    )}

                                    {review.photo_urls && review.photo_urls.length > 0 && (
                                        <div className="mb-4">
                                            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Photos</h4>
                                            <ReviewPhotoGallery photos={review.photo_urls} />
                                        </div>
                                    )}

                                    {review.tags && review.tags.length > 0 && (
                                        <div className="flex flex-wrap gap-2">
                                            {review.tags.map((tag: any, idx: number) => (
                                                <span
                                                    key={idx}
                                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 text-sm"
                                                >
                                                    <Tag size={12} />
                                                    {tag.label || tag.id || tag}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
                                    <button
                                        onClick={() => handleRejectClick(review.id)}
                                        disabled={!!processingId}
                                        className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg font-medium transition-colors disabled:opacity-50"
                                    >
                                        Reject
                                    </button>
                                    <button
                                        onClick={() => handleApprove(review.id)}
                                        disabled={!!processingId}
                                        className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50"
                                    >
                                        {processingId === review.id ? (
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            <CheckCircle size={18} />
                                        )}
                                        Approve & Publish
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Rejection Modal */}
            {rejectingId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-in zoom-in-95">
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Reject Review</h3>
                        <p className="text-gray-600 mb-4">
                            Please provide a reason for rejection. This will be visible to the user.
                        </p>

                        <textarea
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            placeholder="e.g. Contains profanity, Not relevant to business..."
                            className="w-full h-32 p-3 border border-gray-300 rounded-lg mb-4 focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                            autoFocus
                        />

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setRejectingId(null)}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmReject}
                                disabled={!rejectionReason.trim() || !!processingId}
                                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {processingId ? 'Rejecting...' : 'Reject Review'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
