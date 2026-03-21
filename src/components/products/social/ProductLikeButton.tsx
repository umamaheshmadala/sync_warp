import React, { useState } from 'react';
import { Heart } from 'lucide-react';

interface ProductLikeButtonProps {
    isLiked: boolean;
    onToggle: () => void;
    size?: number; // Icon size (default 24)
    color?: string; // Optional override
    className?: string;
    children?: React.ReactNode;
}

export const ProductLikeButton: React.FC<ProductLikeButtonProps> = ({
    isLiked,
    onToggle,
    size = 24,
    color,
    className = "",
    children
}) => {
    // Just wrap the toggle
    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onToggle();
    };

    return (
        <button
            onClick={handleClick}
            className={`group relative flex items-center justify-center focus:outline-none transition-transform active:scale-95 ${className}`}
            aria-label={isLiked ? "Unlike" : "Like"}
        >
            <div className="animate-fadeIn"
            >
                <Heart
                    size={size}
                    className={`transition-colors ${isLiked
                        ? 'fill-red-500 text-red-500'
                        : 'text-gray-900 group-hover:text-gray-600'
                        }`}
                    style={{ color: isLiked ? undefined : color }}
                />
            </div>
            {children}
        </button>
    );
};
