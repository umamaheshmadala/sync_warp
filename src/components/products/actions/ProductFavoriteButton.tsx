import React from 'react';
import { Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ProductFavoriteButtonProps {
    isFavorite: boolean;
    onToggle: () => void;
    isLoading?: boolean;
    size?: number;
    className?: string;
    iconClassName?: string;
}

export const ProductFavoriteButton: React.FC<ProductFavoriteButtonProps> = ({
    isFavorite,
    onToggle,
    isLoading = false,
    size = 24,
    className = "",
    iconClassName = ""
}) => {
    return (
        <motion.button
            whileTap={{ scale: 0.8 }}
            onClick={(e) => {
                e.stopPropagation(); // Prevent card clicks
                onToggle();
            }}
            disabled={isLoading}
            className={`flex items-center justify-center relative ${className}`}
            aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
        >
            <AnimatePresence mode="wait">
                {isFavorite ? (
                    <motion.div
                        key="filled-heart"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        transition={{ type: "spring", stiffness: 400, damping: 15 }}
                    >
                        <Heart
                            size={size}
                            className={`fill-yellow-400 text-yellow-400 ${iconClassName}`}
                            strokeWidth={0} // Filled style
                        />
                        {/* Outline overlay for crispness if desired, or just fill */}
                        <Heart
                            size={size}
                            className={`absolute top-0 left-0 text-yellow-500 opacity-20 pointer-events-none ${iconClassName}`}
                            strokeWidth={1.5}
                        />
                    </motion.div>
                ) : (
                    <motion.div
                        key="outline-heart"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                    >
                        <Heart
                            size={size}
                            className={`text-gray-900 ${iconClassName}`}
                            strokeWidth={1.5}
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Click Ripple/Burst Effect (Optional Polish) */}
        </motion.button>
    );
};
