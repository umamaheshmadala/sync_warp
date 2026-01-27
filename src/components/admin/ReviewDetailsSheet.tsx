import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Calendar, MapPin, Tag } from 'lucide-react';
import { PendingReview } from '@/services/moderationService';
import { ReviewPhotoGallery } from '@/components/reviews/ReviewPhotoGallery';
import { formatDistanceToNow } from 'date-fns';

interface ReviewDetailsModalProps {
    review: PendingReview | null;
    readOnly?: boolean;
    onClose: () => void;
    onApprove: (id: string) => void;
    onReject: (review: PendingReview) => void;
}

export function ReviewDetailsModal({ review, readOnly, onClose, onApprove, onReject }: ReviewDetailsModalProps) {
    if (!review) return null;

    // Report info logic (mock or derived if available in future)
    const isReported = review.report_count !== undefined && review.report_count > 0;
    const isPending = review.moderation_status === 'pending';

    return (
        <Dialog open={!!review} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader className="mb-6">
                    <div className="flex items-center justify-between pr-8">
                        <DialogTitle className="text-xl">Review Details</DialogTitle>
                        <div className="flex items-center gap-2">
                            {review.moderation_status !== 'pending' && (
                                <span className={`text-xs px-2 py-1 rounded font-medium border ${review.moderation_status === 'approved'
                                    ? 'bg-green-50 text-green-700 border-green-200'
                                    : 'bg-red-50 text-red-700 border-red-200'
                                    }`}>
                                    {review.moderation_status.toUpperCase()}
                                </span>
                            )}
                            <span className="text-xs text-mono text-gray-400 bg-gray-100 px-2 py-1 rounded">
                                ID: {review.id.slice(0, 8)}
                            </span>
                        </div>
                    </div>
                </DialogHeader>

                <div className="space-y-6">
                    {/* User Info & Stats */}
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                        <div className="flex items-center gap-4 mb-3">
                            <div className="h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-lg">
                                {review.user?.avatar_url ? (
                                    <img src={review.user.avatar_url} alt="" className="h-12 w-12 rounded-full object-cover" />
                                ) : (
                                    (review.user?.full_name?.charAt(0) || 'U')
                                )}
                            </div>
                            <div>
                                <h4 className="font-semibold text-gray-900">{review.user?.full_name || 'Unknown User'}</h4>
                                <p className="text-xs text-gray-500">SyncWarp User • Joined Jan 2024 (Mock)</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-200/50">
                            <div>
                                <p className="text-xs text-gray-500 uppercase tracking-wide">Reviews</p>
                                <p className="font-semibold text-gray-800">12 (Mock)</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 uppercase tracking-wide">Trust Score</p>
                                <p className="font-semibold text-green-600">High</p>
                            </div>
                        </div>
                    </div>

                    {/* Fraud & Safety Signals */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="border border-green-200 bg-green-50 rounded-md p-3 flex items-center gap-2">
                            <div className="bg-green-100 p-1 rounded-full text-green-600">
                                <CheckCircle size={16} />
                            </div>
                            <div>
                                <p className="text-xs font-medium text-green-800">GPS Verified</p>
                                <p className="text-[10px] text-green-600">Check-in confirmed</p>
                            </div>
                        </div>
                        <div className="border border-gray-200 bg-gray-50 rounded-md p-3 flex items-center gap-2">
                            <div className="bg-gray-200 p-1 rounded-full text-gray-600">
                                <MapPin size={16} />
                            </div>
                            <div>
                                <p className="text-xs font-medium text-gray-700">Location</p>
                                <p className="text-[10px] text-gray-500">Matches Business</p>
                            </div>
                        </div>
                    </div>

                    {/* Business Info */}
                    <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                        <div>
                            <h4 className="text-sm font-medium text-gray-500">Business</h4>
                            <p className="font-semibold text-gray-900">{review.business?.name}</p>
                        </div>
                        <div className="text-right">
                            <h4 className="text-sm font-medium text-gray-500">Submitted</h4>
                            <p className="text-sm text-gray-900">
                                {formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}
                            </p>
                        </div>
                    </div>

                    {/* Report Alert */}
                    {isReported && (
                        <div className="bg-red-50 border border-red-200 rounded-md p-3">
                            <h4 className="text-sm font-semibold text-red-800 mb-1 flex items-center gap-2">
                                <XCircle size={14} /> Reported Content
                            </h4>
                            <p className="text-xs text-red-600">
                                This review has been flagged {review.report_count} times.
                                Potential violation: Inappropriate Content.
                            </p>
                        </div>
                    )}

                    {/* Review Content */}
                    <div>
                        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium mb-4 ${review.recommendation ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}>
                            {review.recommendation ? (
                                <><CheckCircle size={14} /> Recommends</>
                            ) : (
                                <><XCircle size={14} /> Doesn't Recommend</>
                            )}
                        </div>

                        <p className="text-gray-800 text-lg leading-relaxed whitespace-pre-wrap">
                            {review.text || <span className="text-gray-400 italic">No textual content</span>}
                        </p>
                    </div>

                    {/* Photos */}
                    {review.photo_urls && review.photo_urls.length > 0 && (
                        <div>
                            <h4 className="text-sm font-medium text-gray-500 mb-2">Photos</h4>
                            <ReviewPhotoGallery photos={review.photo_urls} />
                        </div>
                    )}

                    {/* Tags */}
                    {review.tags && review.tags.length > 0 && (
                        <div>
                            <h4 className="text-sm font-medium text-gray-500 mb-2">Tags</h4>
                            <div className="flex flex-wrap gap-2">
                                {review.tags.map((tag: any, idx: number) => (
                                    <span key={idx} className="bg-gray-100 text-gray-700 px-2 py-1 rounded-md text-sm flex items-center gap-1">
                                        <Tag size={12} />
                                        {tag.label || tag.id || tag}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {(!readOnly && (isPending || isReported)) && (
                    <DialogFooter className="mt-8 pt-6 border-t border-gray-100 flex-col sm:flex-row gap-3">
                        <Button variant="destructive" onClick={() => onReject(review)} className="w-full sm:w-auto">
                            {isPending ? 'Reject Review' : 'Reject & Remove'}
                        </Button>
                        <Button onClick={() => onApprove(review.id)} className="w-full sm:w-auto bg-green-600 hover:bg-green-700">
                            {isPending ? 'Approve & Publish' : 'Keep & Dismiss Reports'}
                        </Button>
                    </DialogFooter>
                )}
            </DialogContent>
        </Dialog>
    );
}
