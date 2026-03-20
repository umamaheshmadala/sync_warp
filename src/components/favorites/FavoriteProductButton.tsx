// FavoriteProductButton.tsx
// Reusable favorite button component for products
// Story 4.13 + Story 12.23: Star icon for favourites

import React, { useState, useEffect } from 'react';
import { Star } from 'lucide-react';
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
        e?.preventDefault();

        if (isLoading) return;

        try {
            setIsLoading(true);
            const result = await favorites.toggleFavorite('product', productId);
            // State will update via context
        } catch (error) {
            console.error('Error toggling favourite:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <button
            onClick={handleToggleFavorite}
            disabled={isLoading}
            className={`flex items-center justify-center transition-colors disabled:opacity-50 ${iconOnly
                ? `p-1 bg-transparent hover:scale-110 rounded-full hover:bg-black/5`
                : `px-2 py-1 border rounded-md ${isFavorited
                    ? 'bg-yellow-50 border-yellow-200 text-yellow-600 hover:bg-yellow-100'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`
                } ${className}`}
            aria-label={isFavorited ? 'Remove from Favourites' : 'Add to Favourites'}
        >
            <Star
                className={`${iconOnly ? 'w-5 h-5 drop-shadow-sm' : 'w-4 h-4'} transition-all ${isFavorited ? 'fill-yellow-400 text-yellow-400' : 'text-current'
                    } ${!iconOnly && 'mr-2'}`}
            />
            {!iconOnly && (
                <span className="text-xs">
                    {isFavorited ? 'Favourited' : 'Favourite'}
                </span>
            )}
        </button>
    );
};

