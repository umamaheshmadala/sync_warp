import React, { useState } from 'react';
import { MessageCircle, Share2, Bookmark, MoreHorizontal } from 'lucide-react';
import toast from 'react-hot-toast';
import { Product } from '../../../types/product';
import { useAuthStore } from '../../../store/authStore';
import { useProductLike } from '../../../hooks/useProductLike';
import { ProductLikeButton } from '../social/ProductLikeButton';
import { ProductLikedBy } from '../social/ProductLikedBy';

interface WebProductDetailsPanelProps {
    product: Product;
    isOwner: boolean;
    onClose: () => void;
}

export const WebProductDetailsPanel: React.FC<WebProductDetailsPanelProps> = ({
    product,
    isOwner,
    onClose
}) => {
    // Hook for Likes Logic
    const { isLiked, likeCount, likedByFriends, toggleLike } = useProductLike(product.id, product.like_count || 0);

    const { user } = useAuthStore();
    const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
    const [commentText, setCommentText] = useState('');

    // Derived Business Info
    const businessName = (product.businesses as any)?.business_name || 'Business Name';
    const businessLogo = (product.businesses as any)?.logo_url;

    // Derived Counts (Mock/Real)
    // likeCount comes from hook now

    const handleFavorite = () => toast.success('Saved (Demo)', { icon: '⭐' });
    const handleShare = () => toast.success('Shared (Demo)', { icon: '🔗' });

    const handlePostComment = (e: React.FormEvent) => {
        e.preventDefault();
        if (!commentText.trim()) return;
        toast.success(`Comment posted: "${commentText}" (Demo)`);
        setCommentText('');
    };

    // Description Truncation
    const description = product.description || '';
    const shouldTruncate = description.length > 120;
    const displayDescription = isDescriptionExpanded || !shouldTruncate
        ? description
        : description.slice(0, 120) + '...';

    // Mock Comments
    const mockComments = [
        { id: '1', user: 'alex_style', text: 'This looks amazing! 🔥', time: '2h' },
        { id: '2', user: 'sarah_trends', text: 'Is this available in other colors?', time: '5h' },
        { id: '3', user: 'mike_active', text: 'Need this for my collection.', time: '1d' },
    ];

    return (
        <div className="flex flex-col h-full bg-white dark:bg-gray-900 border-l border-gray-100 dark:border-gray-800">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden">
                        {businessLogo ? (
                            <img src={businessLogo} alt={businessName} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs font-bold text-gray-500">
                                {businessName.charAt(0)}
                            </div>
                        )}
                    </div>
                    <div>
                        <div className="text-sm font-semibold text-gray-900 dark:text-white hover:underline cursor-pointer">
                            {businessName}
                        </div>
                        {/* Location or simple subtext could go here */}
                    </div>
                    <button className="text-blue-500 text-xs font-semibold ml-2 hover:text-blue-600">
                        Follow
                    </button>
                </div>
                <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
                    <MoreHorizontal className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </button>
            </div>

            {/* Scrollable Content (Comments & Description) */}
            <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-4">
                {/* Product Info (Acts like the "caption" in Instagram) */}
                <div className="space-y-2">
                    <h1 className="text-lg font-bold text-gray-900 dark:text-white">
                        {product.name}
                    </h1>
                    <div className="flex items-center gap-2">
                        <span className="text-lg font-medium text-gray-900 dark:text-white">
                            ${product.price?.toFixed(2)}
                        </span>
                        {product.status === 'sold_out' && (
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full dark:bg-gray-800">
                                Sold Out
                            </span>
                        )}
                    </div>

                    {/* Description */}
                    <div className="text-sm text-gray-800 dark:text-gray-200 mt-2 whitespace-pre-wrap">
                        {displayDescription}
                        {shouldTruncate && (
                            <button
                                onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                                className="text-gray-500 text-xs ml-1 hover:text-gray-700 dark:hover:text-gray-300"
                            >
                                {isDescriptionExpanded ? 'less' : 'more'}
                            </button>
                        )}
                    </div>

                    {/* Tags */}
                    {product.tags && product.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                            {product.tags.map(tag => (
                                <span key={tag} className="text-xs text-blue-600 dark:text-blue-400">
                                    #{tag}
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                <div className="h-px bg-gray-100 dark:bg-gray-800 my-2" />

                {/* Comments List */}
                <div className="space-y-4">
                    {mockComments.map(comment => (
                        <div key={comment.id} className="flex gap-3 items-start group">
                            <div className="w-8 h-8 rounded-full bg-gray-200 flex-shrink-0" />
                            <div className="flex-1">
                                <div className="text-sm">
                                    <span className="font-semibold text-gray-900 dark:text-white mr-2">
                                        {comment.user}
                                    </span>
                                    <span className="text-gray-800 dark:text-gray-200">
                                        {comment.text}
                                    </span>
                                </div>
                                <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                                    <span>{comment.time}</span>
                                    <button className="font-semibold hover:text-gray-600">Reply</button>
                                </div>
                            </div>
                            {/* Like (Heart) for Comment - Static for now */}
                            {/* We can keep this static heart for comments or remove/implement later */}
                            <button className="opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="text-xs text-gray-400 hover:text-red-500">♡</span>
                            </button>
                        </div>
                    ))}
                    {/* Mock "Load more" */}
                    <button className="text-xs text-gray-500 font-medium my-4 block mx-auto">
                        Load more comments
                    </button>
                </div>
            </div>

            {/* Sticky Bottom Actions & Input */}
            <div className="border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 pb-3">
                {/* Actions Row */}
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-4">
                        <ProductLikeButton
                            isLiked={isLiked}
                            onToggle={toggleLike}
                            size={24}
                        />
                        <button className="group" onClick={() => document.getElementById('web-comment-input')?.focus()}>
                            <MessageCircle className="w-6 h-6 text-gray-900 dark:text-white group-hover:text-blue-500 transition-colors" />
                        </button>
                        <button onClick={handleShare} className="group">
                            <Share2 className="w-6 h-6 text-gray-900 dark:text-white group-hover:text-green-500 transition-colors" />
                        </button>
                    </div>
                    <button onClick={handleFavorite} className="group">
                        <Bookmark className="w-6 h-6 text-gray-900 dark:text-white group-hover:text-yellow-500 transition-colors" />
                    </button>
                </div>

                {/* Likes Count & Liked By */}
                <div className="mb-2">
                    <ProductLikedBy
                        friends={likedByFriends}
                        totalLikes={likeCount}
                    />
                </div>

                {/* Time Stamp */}
                <div className="text-[10px] uppercase text-gray-400 mb-3 tracking-wide">
                    {new Date(product.created_at).toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}
                </div>

                {/* Comment Input */}
                <form onSubmit={handlePostComment} className="flex items-center border-t border-gray-100 dark:border-gray-800 pt-3">
                    <button type="button" className="text-xl mr-3">😊</button>
                    <input
                        id="web-comment-input"
                        type="text"
                        placeholder="Add a comment..."
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        className="flex-1 bg-transparent text-sm focus:outline-none text-gray-900 dark:text-white"
                    />
                    <button
                        type="submit"
                        disabled={!commentText.trim()}
                        className="text-blue-500 font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:text-blue-600"
                    >
                        Post
                    </button>
                </form>
            </div>
        </div>
    );
};
