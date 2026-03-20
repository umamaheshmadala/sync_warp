import React from 'react';
import { Star } from 'lucide-react';

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
        <button
            onClick={(e) => {
                e.stopPropagation(); // Prevent card clicks
                onToggle();
            }}
            disabled={isLoading}
            className={`flex items-center justify-center relative ${className}`}
            aria-label={isFavorite ? "Remove from Favourites" : "Add to Favourites"}
        >
            <>
            {isFavorite ? (
                                <div
                                    key="filled-star"
                                >
                                    <Star
                                        size={size}
                                        className={`fill-yellow-400 text-yellow-400 ${iconClassName}`}
                                        strokeWidth={0} // Filled style
                                    />
                                    {/* Outline overlay for crispness */}
                                    <Star
                                        size={size}
                                        className={`absolute top-0 left-0 text-yellow-500 opacity-20 pointer-events-none ${iconClassName}`}
                                        strokeWidth={1.5}
                                    />
                                </div>
                            ) : (
                                <div
                                    key="outline-star"
                                >
                                    <Star
                                        size={size}
                                        className={`text-gray-400 ${iconClassName}`}
                                        strokeWidth={1.5}
                                    />
                                </div>
                            )}
            </>

            {/* Click Ripple/Burst Effect (Optional Polish) */}
        </button>
    );
};

