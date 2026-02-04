import React, { useState } from 'react';
import { MessageCircle, Share2, Star } from 'lucide-react'; // Heart removed, used in ProductLikeButton
import { motion } from 'framer-motion';
import { Product } from '../../../types/product';
import { useProductLike } from '../../../hooks/useProductLike';
import { ProductLikeButton } from '../social/ProductLikeButton';
import { ProductLikedBy } from '../social/ProductLikedBy';

interface MobileProductActionsProps {
    product: Product;
    onComment?: () => void;
    onShare?: () => void;
    onFavorite?: () => void;
}

export const MobileProductActions: React.FC<MobileProductActionsProps> = ({
    product,
    onComment,
    onShare,
    onFavorite
}) => {
    const { isLiked, likeCount, likedByFriends, toggleLike } = useProductLike(product.id, product.like_count || 0);

    // Favorite State (Placeholder for now until Story 12.8)
    const [favorited, setFavorited] = useState(false); // TODO: useFavoriteProduct hook later.

    const handleFavorite = () => {
        setFavorited(!favorited);
        if (onFavorite) onFavorite();
    };

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
                        />
                        {/* Removed small count below heart as we now have full LikedBy line */}
                    </div>

                    {/* Comment Button */}
                    <button
                        onClick={onComment}
                        className="flex flex-col items-center gap-1"
                    >
                        <MessageCircle className="w-7 h-7 text-gray-900 dark:text-white" />
                    </button>

                    {/* Share Button */}
                    <button
                        onClick={onShare}
                        className="flex flex-col items-center gap-1"
                    >
                        <Share2 className="w-7 h-7 text-gray-900 dark:text-white" />
                    </button>
                </div>

                {/* Favorite Button (Right Aligned) */}
                <button
                    onClick={handleFavorite}
                    className="flex flex-col items-center gap-1"
                >
                    <motion.div
                        whileTap={{ scale: 0.8 }}
                    >
                        <Star
                            className={`w-7 h-7 transition-colors ${favorited ? 'text-yellow-400 fill-yellow-400' : 'text-gray-900 dark:text-white'
                                }`}
                        />
                    </motion.div>
                </button>
            </div>

            {/* Liked By Section */}
            <ProductLikedBy
                friends={likedByFriends}
                totalLikes={likeCount}
            />
        </div>
    );
};

