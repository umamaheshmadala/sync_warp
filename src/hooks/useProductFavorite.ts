import { useState, useEffect, useCallback } from 'react';
import { productFavoriteService } from '../services/productFavoriteService';
import { toast } from 'react-hot-toast';

export function useProductFavorite(productId: string, initialIsFavorite: boolean = false) {
    const [isFavorite, setIsFavorite] = useState(initialIsFavorite);
    const [isLoading, setIsLoading] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);

    // Initial check (only if not provided or to sync)
    useEffect(() => {
        if (!productId) return;

        const checkStatus = async () => {
            try {
                const status = await productFavoriteService.isFavorite(productId);
                setIsFavorite(status);
            } catch (error) {
                console.error('Failed to check favorite status:', error);
            } finally {
                setIsInitialized(true);
            }
        };

        checkStatus();
    }, [productId]);

    const toggleFavorite = useCallback(async () => {
        if (!productId) return;
        if (isLoading) return;

        // Optimistic update
        const previousState = isFavorite;
        setIsFavorite(!previousState);
        setIsLoading(true);

        try {
            // Service returns the NEW state (true = added, false = removed)
            const newStatus = await productFavoriteService.toggleFavorite(productId);

            // Ensure state matches server response (should be !previousState)
            setIsFavorite(newStatus);

            // Optional: Toast feedback
            if (newStatus) {
                toast.success('Saved to Favorites', { id: 'fav-toast', duration: 1500 });
            } else {
                toast.success('Removed from Favorites', { id: 'fav-toast', duration: 1500 });
            }
        } catch (error: any) {
            // Revert on error
            setIsFavorite(previousState);
            console.error('Error toggling favorite:', error);

            if (error.message?.includes('logged in')) {
                toast.error('Please log in to save favorites');
            } else {
                toast.error('Failed to update favorite');
            }
        } finally {
            setIsLoading(false);
        }
    }, [productId, isFavorite, isLoading]);

    return {
        isFavorite,
        toggleFavorite,
        isLoading,
        isInitialized
    };
}
