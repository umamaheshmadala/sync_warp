// FavoriteProductButton.tsx
// Reusable favorite button component for products
// Story 4.13

import React, { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import { useFavoritesContext } from '../../contexts/FavoritesContext';

interface FavoriteProductButtonProps {
    productId: string;
    className?: string;
    iconOnly?: boolean; // For mobile/compact views
}

export const FavoriteProductButton: React.FC<FavoriteProductButtonProps> = ({
    productId,
    className = '',
    iconOnly = false
}) => {
    const favorites = useFavoritesContext();
    const [isFavorited, setIsFavorited] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Update local state when favorites change
    useEffect(() => {
        setIsFavorited(favorites.isFavorited('product', productId));
    }, [favorites.products, favorites.counts.products, productId, favorites]);

    const handleToggleFavorite = async (e?: React.MouseEvent) => {
        e?.stopPropagation();

        if (isLoading) return;

        try {
            setIsLoading(true);
            const result = await favorites.toggleFavorite('product', productId);
            // State will update via context
        } catch (error) {
            console.error('Error toggling favorite:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <button
            onClick={handleToggleFavorite}
            disabled={isLoading}
            className={`flex items-center justify-center transition-colors disabled:opacity-50 ${iconOnly
                    ? `p-2 rounded-full ${isFavorited ? 'bg-red-50 hover:bg-red-100' : 'bg-white/90 hover:bg-white'} shadow-md`
                    : `px-4 py-2 border rounded-lg ${isFavorited
                        ? 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100'
                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`
                } ${className}`}
            aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
        >
            <Heart
                className={`${iconOnly ? 'w-5 h-5' : 'w-4 h-4'} transition-all ${isFavorited ? 'fill-red-500 text-red-500' : 'text-gray-600'
                    } ${!iconOnly && 'mr-2'}`}
            />
            {!iconOnly && (
                <span className="hidden md:inline">
                    {isFavorited ? 'Favorited' : 'Favorite'}
                </span>
            )}
        </button>
    );
};
