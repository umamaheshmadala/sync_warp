import React, { useState } from 'react';
import { MessageCircle, Share2, Send } from 'lucide-react';
import { motion } from 'framer-motion';
import { Product } from '../../../types/product';
import { useProductLike } from '../../../hooks/useProductLike';
import { useProductFavorite } from '../../../hooks/useProductFavorite';
import { ProductLikeButton } from '../social/ProductLikeButton';
import { ProductFavoriteButton } from '../actions/ProductFavoriteButton';
import { ProductLikedBy } from '../social/ProductLikedBy';

interface MobileProductActionsProps {
    product: Product;
    onComment?: () => void;
    onShare?: () => void;
}

// Utility for formatting counts
const formatCount = (count: number): string => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
    return count.toString();
};

export const MobileProductActions: React.FC<MobileProductActionsProps> = ({
    product,
    onComment,
    onShare
}) => {
    // Like Logic
    const { isLiked, likeCount, likedByFriends, toggleLike, isLoading: isLikeLoading } = useProductLike(product.id, product.like_count || 0);

    // Favorite Logic
    const { isFavorite, toggleFavorite, isLoading: isFavLoading } = useProductFavorite(product.id);

    return (
        <div className="flex flex-col px-4 py-3 gap-2">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                    {/* Like Button */}
                    <div className="flex flex-col items-center gap-1 group">
                        <ProductLikeButton
                            isLiked={isLiked}
                            onToggle={toggleLike}
                            size={28}
                            className="p-1"
                        />
                        <span className="text-xs font-medium text-gray-900 dark:text-white">
                            {likeCount > 0 ? formatCount(likeCount) : 'Like'}
                        </span>
                    </div>

                    {/* Comment Button */}
                    <button
                        onClick={onComment}
                        className="flex flex-col items-center gap-1 p-1"
                    >
                        <MessageCircle size={28} className="text-gray-900 dark:text-white" strokeWidth={1.5} />
                        <span className="text-xs font-medium text-gray-900 dark:text-white">
                            {product.comment_count > 0 ? formatCount(product.comment_count) : 'Comment'}
                        </span>
                    </button>

                    {/* Share Button */}
                    <button
                        onClick={onShare}
                        className="flex flex-col items-center gap-1 p-1"
                    >
                        <Send size={28} className="text-gray-900 dark:text-white" strokeWidth={1.5} />
                        <span className="text-xs font-medium text-gray-900 dark:text-white">Share</span>
                    </button>
                </div>

                {/* Favorite Button (Right Aligned) */}
                <div className="flex flex-col items-center gap-1">
                    <ProductFavoriteButton
                        isFavorite={isFavorite}
                        onToggle={toggleFavorite}
                        isLoading={isFavLoading}
                        size={28}
                        className="p-1"
                    />
                    <span className="text-xs font-medium text-gray-900 dark:text-white">Save</span>
                </div>
            </div>

            {/* Liked By Section */}
            <ProductLikedBy
                friends={likedByFriends}
                totalLikes={likeCount}
            />
        </div>
    );
};
