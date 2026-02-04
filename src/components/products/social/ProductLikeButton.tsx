import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart } from 'lucide-react';

interface ProductLikeButtonProps {
    isLiked: boolean;
    onToggle: () => void;
    size?: number; // Icon size (default 24)
    color?: string; // Icon color when not liked
}

export const ProductLikeButton: React.FC<ProductLikeButtonProps> = ({
    isLiked,
    onToggle,
    size = 24,
    color = "currentColor"
}) => {
    // Just wrap the toggle
    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onToggle();
    };

    return (
        <button
            onClick={handleClick}
            className="group relative focus:outline-none transition-transform active:scale-95"
            aria-label={isLiked ? "Unlike" : "Like"}
        >
            <motion.div
                initial={false}
                animate={isLiked ? { scale: [1, 1.2, 1] } : { scale: 1 }}
                transition={{ duration: 0.3 }}
            >
                <Heart
                    size={size}
                    className={`transition-colors ${isLiked
                            ? 'fill-red-500 text-red-500'
                            : 'text-gray-900 dark:text-white group-hover:text-gray-600'
                        }`}
                    // Allow overriding color only if not liked
                    style={{ color: isLiked ? undefined : color }}
                />
            </motion.div>
        </button>
    );
};
