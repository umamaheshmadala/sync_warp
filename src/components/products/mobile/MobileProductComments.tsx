import React from 'react';
import { useProductComments } from '../../../hooks/useProductComments';
import { ProductCommentItem } from '../social/ProductCommentItem';
import { ProductCommentInput } from '../social/ProductCommentInput';
import { Loader2 } from 'lucide-react';

interface MobileProductCommentsProps {
    productId: string;
    initialCount?: number;
    focusInput?: boolean;
    isOwner?: boolean;
}

export const MobileProductComments: React.FC<MobileProductCommentsProps> = ({
    productId,
    initialCount = 0,
    focusInput,
    isOwner
}) => {
    const { comments, commentCount, loading, hasMore, loadMore, postComment, deleteComment } = useProductComments(productId, initialCount);

    const handleReport = (id: string) => {
        console.log('Report', id); // Mock for now
    };

    return (
        <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-800">
            {/* Header / Count */}
            {commentCount > 0 && (
                <div className="text-gray-500 dark:text-gray-400 text-sm mb-3">
                    {commentCount} {commentCount === 1 ? 'comment' : 'comments'}
                </div>
            )}

            {/* Comments List (Preview - max 3 for mobile modal usually, unless viewing all) */}
            {/* Story says "View all" logic. For simplicity in this modal, let's show up to 3 and a "View All" button 
                that expands or loads more. For now, we'll just show the list with "Load More" at bottom if needed. */}

            <div className="space-y-4 mb-4">
                {loading && comments.length === 0 ? (
                    <div className="flex justify-center py-4">
                        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                    </div>
                ) : (
                    <>
                        {/* Show all loaded comments */}
                        {comments.map((comment) => (
                            <ProductCommentItem
                                key={comment.id}
                                comment={comment}
                                onDelete={deleteComment}
                                onReport={handleReport}
                                isBusinessOwner={isOwner}
                            />
                        ))}

                        {/* Load More Button */}
                        {hasMore && (
                            <button
                                onClick={loadMore}
                                disabled={loading}
                                className="w-full py-2 text-sm text-blue-600 font-medium hover:bg-blue-50 rounded-lg transition-colors flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Loading...
                                    </>
                                ) : (
                                    'Show older comments'
                                )}
                            </button>
                        )}

                        {/* Empty State */}
                        {comments.length === 0 && !loading && (
                            <div className="text-gray-400 text-sm italic py-2 text-center">
                                No comments yet. Be the first to say something!
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Input */}
            <ProductCommentInput
                onPost={postComment}
                id="mobile-comment-input"
                autoFocus={focusInput}
            />
        </div>
    );
};
