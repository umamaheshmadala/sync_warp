// FavoriteOfferButton.tsx
// Reusable favorite button component for offers
// Story 4.13

import React, { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import { useFavoritesContext } from '../../contexts/FavoritesContext';

interface FavoriteOfferButtonProps {
    offerId: string;
    className?: string;
    iconClassName?: string;
    iconOnly?: boolean; // Added for Story 10.1.7
}

export const FavoriteOfferButton: React.FC<FavoriteOfferButtonProps> = ({
    offerId,
    className = '',
    iconClassName = 'w-4 h-4',
    iconOnly = false
}) => {
    const favorites = useFavoritesContext();
    const [isFavorited, setIsFavorited] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Update local state when favorites change
    useEffect(() => {
        setIsFavorited(favorites.isFavorited('offer', offerId));
    }, [favorites.offers, favorites.counts.offers, offerId, favorites]);

    const handleToggleFavorite = async (e?: React.MouseEvent) => {
        e?.stopPropagation();
        e?.preventDefault();

        if (isLoading) return;

        try {
            setIsLoading(true);
            const result = await favorites.toggleFavorite('offer', offerId);
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
                ? `p-1 bg-transparent hover:scale-110 rounded-full hover:bg-black/5`
                : `px-4 py-2 border rounded-lg ${isFavorited
                    ? 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`
                } ${className}`}
            aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
        >
            <Heart
                className={`${iconOnly ? 'w-5 h-5 drop-shadow-sm' : iconClassName} ${!iconOnly && 'mr-2'} transition-all ${isFavorited ? 'fill-red-500 text-red-500' : 'text-current'
                    }`}
            />
            {!iconOnly && (
                <span className="hidden md:inline">
                    {isFavorited ? 'Favorited' : 'Favorite'}
                </span>
            )}
        </button>
    );
};
