import React, { useState } from 'react';
import { MessageCircle, Share2, MoreHorizontal, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Product } from '../../../types/product';
import { useAuthStore } from '../../../store/authStore';
import { useProductLike } from '../../../hooks/useProductLike';
import { useProductComments } from '../../../hooks/useProductComments';
import { useProductFavorite } from '../../../hooks/useProductFavorite';
import { ProductLikeButton } from '../social/ProductLikeButton';
import { ProductLikedBy } from '../social/ProductLikedBy';
import { ProductCommentItem } from '../social/ProductCommentItem';
import { ProductCommentInput } from '../social/ProductCommentInput';
import { ProductFavoriteButton } from '../actions/ProductFavoriteButton';
import { ProductShareButton } from '../../Sharing/ProductShareButton';
import { ProductTagDisplay } from '../tags/ProductTagDisplay';
import { ProductDescription } from '../details/ProductDescription';
import { ProductNotificationToggle } from '../controls/ProductNotificationToggle';

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
    // Likes Logic
    const { isLiked, likeCount, likedByFriends, toggleLike } = useProductLike(product.id, product.like_count || 0);
    // Comments Logic
    const { comments, loading: commentsLoading, postComment, deleteComment } = useProductComments(product.id);
    // Favorite Logic
    const { isFavorite, toggleFavorite, isLoading: isFavLoading } = useProductFavorite(product.id);

    const { user } = useAuthStore();
    const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

    // Derived Business Info
    const businessName = (product.businesses as any)?.business_name || 'Business Name';
    const businessLogo = (product.businesses as any)?.logo_url;

    const handleShare = () => toast.success('Shared (Demo)', { icon: '🔗' });
    const handleReport = (id: string) => console.log('Report', id); // Mock

    // Description Truncation
    const description = product.description || '';
    const shouldTruncate = description.length > 120;
    const displayDescription = isDescriptionExpanded || !shouldTruncate
        ? description
        : description.slice(0, 120) + '...';

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
                {/* Product Info */}
                <div className="space-y-2">
                    <h1 className="text-lg font-bold text-gray-900 dark:text-white">
                        {product.name}
                    </h1>
                    <div className="flex items-center gap-2">
                        <span className="text-lg font-medium text-gray-900 dark:text-white">
                            ${product.price?.toFixed(2)}
                        </span>

                        {/* Tags */}
                        <ProductTagDisplay product={product} size="sm" />

                        {product.status === 'sold_out' && (
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full dark:bg-gray-800">
                                Sold Out
                            </span>
                        )}
                    </div>

                    {/* Description */}
                    <ProductDescription
                        text={product.description}
                        maxLength={120}
                        className="mt-2"
                    />

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
                <div className="space-y-4 pb-4">
                    {commentsLoading && comments.length === 0 ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
                        </div>
                    ) : (
                        comments.map(comment => (
                            <ProductCommentItem
                                key={comment.id}
                                comment={comment}
                                onDelete={deleteComment}
                                onReport={handleReport}
                            />
                        ))
                    )}

                    {comments.length === 0 && !commentsLoading && (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                            <div className="text-4xl mb-2">💭</div>
                            <h3 className="font-semibold text-gray-900 dark:text-white">No comments yet</h3>
                            <p className="text-sm text-gray-500">Start the conversation.</p>
                        </div>
                    )}
                </div>

                {/* Owner Controls */}
                {isOwner && (
                    <div className="pb-4">
                        <ProductNotificationToggle
                            productId={product.id}
                            isEnabled={product.notifications_enabled ?? true}
                            isOwner={isOwner}
                        />
                    </div>
                )}
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
                        <ProductShareButton
                            productId={product.id}
                            productName={product.name}
                            productPrice={product.price}
                            productCurrency={product.currency}
                            productDescription={product.description}
                            productImage={product.image_urls?.[0] || product.image_url}
                            businessId={product.business_id}
                            businessName={businessName}
                            businessLogo={businessLogo}
                            variant="icon"
                            className="text-gray-900 dark:text-white hover:text-green-500 transition-colors bg-transparent shadow-none"
                        />
                    </div>
                    {/* Favorite Button */}
                    <ProductFavoriteButton
                        isFavorite={isFavorite}
                        onToggle={toggleFavorite}
                        isLoading={isFavLoading}
                        size={24}
                    />
                </div>

                {/* Liked By */}
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
                <div className="border-t border-gray-100 dark:border-gray-800 pt-3">
                    <ProductCommentInput
                        onPost={postComment}
                        id="web-comment-input"
                    />
                </div>
            </div>
        </div>
    );
};
