import { useState } from 'react';
import { Check, X, Eye, AlertTriangle } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

import { RejectReviewDialog } from './RejectReviewDialog';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'react-hot-toast';
import { PendingReview, approveReview } from '@/services/moderationService';

interface ModerationQueueProps {
    reviews: PendingReview[];
    selectedReviews: string[];
    onSelectionChange: (ids: string[]) => void;
    onRefresh: () => void;
    searchQuery?: string;
    type?: 'pending' | 'reported';
    reportData?: any;
    businessFilter?: string;
    sortBy?: 'newest' | 'oldest' | 'reports';
    onViewReview: (reviewId: string) => void;
}

export function ModerationQueue({
    reviews,
    selectedReviews,
    onSelectionChange,
    onRefresh,
    searchQuery,
    type = 'pending',
    reportData,
    businessFilter,
    sortBy = 'newest',
    onViewReview
}: ModerationQueueProps) {
    // const [viewingReview, setViewingReview] = useState<PendingReview | null>(null);
    const [rejectingReview, setRejectingReview] = useState<PendingReview | null>(null);
    const [processingId, setProcessingId] = useState<string | null>(null);

    const filteredReviews = reviews.filter(review => {
        // 1. Search Query
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            const matchesSearch =
                review.user.full_name.toLowerCase().includes(q) ||
                (review.business?.name || '').toLowerCase().includes(q) ||
                review.text?.toLowerCase().includes(q);
            if (!matchesSearch) return false;
        }

        // 2. Business Filter
        if (businessFilter) {
            const bus = businessFilter.toLowerCase();
            if (!(review.business?.name || '').toLowerCase().includes(bus)) return false;
        }

        return true;
    }).sort((a, b) => {
        // 3. Sorting
        if (sortBy === 'reports') {
            const aCount = a.report_count || 0;
            const bCount = b.report_count || 0;
            return bCount - aCount;
        }
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();

        return sortBy === 'oldest' ? dateA - dateB : dateB - dateA;
    });

    const handleApprove = async (reviewId: string) => {
        try {
            setProcessingId(reviewId);
            await approveReview(reviewId);
            toast.success('Review approved');
            onRefresh();
        } catch (error: any) {
            toast.error(error.message || 'Could not approve review');
        } finally {
            setProcessingId(null);
        }
    };

    const toggleSelection = (reviewId: string) => {
        if (selectedReviews.includes(reviewId)) {
            onSelectionChange(selectedReviews.filter(id => id !== reviewId));
        } else {
            onSelectionChange([...selectedReviews, reviewId]);
        }
    };

    const toggleAllSelection = () => {
        if (selectedReviews.length === filteredReviews.length) {
            onSelectionChange([]);
        } else {
            onSelectionChange(filteredReviews.map(r => r.id));
        }
    };

    // Helper to get reports for a review if in reported mode
    const getReportInfo = (reviewId: string) => {
        if (type !== 'reported' || !reportData) return null;
        return reportData.reviewsWithReports?.find((r: any) => r.reviewId === reviewId);
    };

    if (filteredReviews.length === 0) {
        return (
            <div className="text-center py-16 bg-white rounded-lg border border-dashed border-gray-300">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Check className="w-6 h-6 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900">No reviews found</h3>
                <p className="text-gray-500">
                    {searchQuery ? 'Try adjusting your search terms.' : 'All caught up!'}
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header / Table like structure */}
            <div className="bg-white border rounded-lg overflow-hidden">
                <div className="flex items-center gap-4 p-3 bg-gray-50 border-b font-medium text-sm text-gray-500">
                    <div className="pl-2">
                        <Checkbox
                            checked={filteredReviews.length > 0 && selectedReviews.length === filteredReviews.length}
                            onCheckedChange={toggleAllSelection}
                        />
                    </div>
                    <span className="flex-1">Review</span>
                    {type === 'reported' ? (
                        <>
                            <span className="w-32 hidden sm:block">Reported By</span>
                            <span className="w-32 hidden sm:block">Reported At</span>
                        </>
                    ) : (
                        <>
                            <span className="w-32 hidden sm:block">Business</span>
                            <span className="w-24 hidden sm:block">Submitted</span>
                        </>
                    )}
                    <span className="w-28 text-right pr-2">Actions</span>
                </div>

                <div className="divide-y divide-gray-100">
                    {filteredReviews.map(review => {
                        const reportInfo = getReportInfo(review.id);

                        return (
                            <div
                                key={review.id}
                                className={`flex items-start gap-4 p-4 hover:bg-gray-50/50 transition-colors ${selectedReviews.includes(review.id) ? 'bg-indigo-50/30' : ''}`}
                            >
                                <div className="pt-1 pl-2">
                                    <Checkbox
                                        checked={selectedReviews.includes(review.id)}
                                        onCheckedChange={() => toggleSelection(review.id)}
                                    />
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                        <span className="font-semibold text-gray-900">{review.user?.full_name || 'Unknown User'}</span>
                                        <Badge variant="outline" className={review.recommendation ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}>
                                            {review.recommendation ? 'Recommends' : 'Downvote'}
                                        </Badge>

                                        {/* Show Re-submission badge for edited rejected reviews */}
                                        {review.is_resubmission && (
                                            <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">
                                                ✏️ Re-submission
                                            </Badge>
                                        )}

                                        {/* Show reports badge if reported */}
                                        {(review.report_count > 0 || reportInfo) && (
                                            <Badge variant="destructive" className="flex items-center gap-1">
                                                <AlertTriangle className="w-3 h-3" />
                                                {reportInfo ? reportInfo.reportCount : review.report_count} Reports
                                            </Badge>
                                        )}

                                        {/* Show reasons if available */}
                                        {reportInfo && reportInfo.reasons && (
                                            <span className="text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-100">
                                                {reportInfo.reasons.join(', ')}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-gray-600 line-clamp-2 mb-1">
                                        {review.text || <span className="italic text-gray-400">No text content</span>}
                                    </p>
                                    <div className="flex items-center gap-3 text-xs text-gray-400">
                                        {review.photo_urls?.length > 0 && (
                                            <span>📷 {review.photo_urls.length} photos</span>
                                        )}
                                        {review.tags?.length > 0 && (
                                            <span>🏷️ {review.tags.length} tags</span>
                                        )}
                                        {/* Mobile visible business name */}
                                        <span className="sm:hidden font-medium text-gray-500">
                                            @ {review.business?.name}
                                        </span>
                                    </div>
                                </div>

                                {type === 'reported' ? (
                                    <>
                                        {/* Reported By Column */}
                                        <div className="w-32 text-sm text-gray-700 hidden sm:block pt-1">
                                            <div className="font-medium text-gray-900">
                                                {review.latest_report?.reporterName || '-'}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                Reported By
                                            </div>
                                        </div>

                                        {/* Reported At Column */}
                                        <div className="w-32 text-sm text-gray-500 hidden sm:block pt-1">
                                            {review.latest_report?.reportedAt ? (
                                                formatDistanceToNow(new Date(review.latest_report.reportedAt), { addSuffix: true })
                                            ) : '-'}
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="w-32 text-sm text-gray-700 hidden sm:block pt-1">
                                            {review.business?.name || 'Unknown Business'}
                                        </div>

                                        <div className="w-24 text-sm text-gray-500 hidden sm:block pt-1">
                                            {formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}
                                        </div>
                                    </>
                                )}

                                <div className="w-28 flex justify-end gap-1">
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        onClick={() => onViewReview(review.id)}
                                        title="View Details"
                                        className="h-8 w-8 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50"
                                    >
                                        <Eye className="w-4 h-4" />
                                    </Button>

                                    {/* Only show Approve/Reject here if NOT reported tab. Reported tab requires modal view. */}
                                    {type !== 'reported' && (
                                        <>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                onClick={() => handleApprove(review.id)}
                                                disabled={processingId === review.id}
                                                title="Approve"
                                                className="h-8 w-8 text-gray-500 hover:text-green-600 hover:bg-green-50"
                                            >
                                                <Check className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                onClick={() => setRejectingReview(review)}
                                                disabled={processingId === review.id}
                                                title="Reject"
                                                className="h-8 w-8 text-gray-500 hover:text-red-600 hover:bg-red-50"
                                            >
                                                <X className="w-4 h-4" />
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ReviewDetailsSheet moved to parent */}
            {/* Reject dialog */}
            <RejectReviewDialog
                review={rejectingReview}
                onClose={() => setRejectingReview(null)}
                onSuccess={() => {
                    setRejectingReview(null);
                    onRefresh();
                }}
            />
        </div>
    );
}
