import React, { useState } from 'react';
import { Heart, MessageCircle, Share2, Star } from 'lucide-react';
import { motion } from 'framer-motion';

interface MobileProductActionsProps {
    likeCount?: number;
    commentCount?: number;
    isLiked?: boolean;
    isFavorited?: boolean;
    onLike?: () => void;
    onComment?: () => void;
    onShare?: () => void;
    onFavorite?: () => void;
}

export const MobileProductActions: React.FC<MobileProductActionsProps> = ({
    likeCount = 0,
    commentCount = 0,
    isLiked = false,
    isFavorited = false,
    onLike,
    onComment,
    onShare,
    onFavorite
}) => {
    // Local state for optimistic updates if parent doesn't handle fully yet
    const [liked, setLiked] = useState(isLiked);
    const [favorited, setFavorited] = useState(isFavorited);

    const handleLike = () => {
        setLiked(!liked);
        if (onLike) onLike();
    };

    const handleFavorite = () => {
        setFavorited(!favorited);
        if (onFavorite) onFavorite();
    };

    return (
        <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-6">
                {/* Like Button */}
                <button
                    onClick={handleLike}
                    className="flex flex-col items-center gap-1 group"
                >
                    <motion.div
                        whileTap={{ scale: 0.8 }}
                        transition={{ type: "spring", stiffness: 400, damping: 10 }}
                    >
                        <Heart
                            className={`w-7 h-7 transition-colors ${liked ? 'text-red-500 fill-red-500' : 'text-gray-900 dark:text-white'
                                }`}
                        />
                    </motion.div>
                    {likeCount > 0 && (
                        <span className="text-xs font-medium text-gray-900 dark:text-gray-300">
                            {likeCount}
                        </span>
                    )}
                </button>

                {/* Comment Button */}
                <button
                    onClick={onComment}
                    className="flex flex-col items-center gap-1"
                >
                    <MessageCircle className="w-7 h-7 text-gray-900 dark:text-white" />
                    {commentCount > 0 && (
                        <span className="text-xs font-medium text-gray-900 dark:text-gray-300">
                            {commentCount}
                        </span>
                    )}
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
    );
};
