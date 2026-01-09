// useOfferProductFavorites.ts
// Custom hook for managing offer and product favorites (Story 4.13)
// Focused specifically on offers and products only

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuthStore } from '../store/authStore';
import { toast } from 'react-hot-toast';
import favoritesService, {
    FavoriteOffer,
    FavoriteProduct,
    FavoriteItemType
} from '../services/favoritesService';

interface FavoritesState {
    offers: FavoriteOffer[];
    products: FavoriteProduct[];
    isLoading: boolean;
    isRefetching: boolean;
    error: string | null;
    counts: {
        offers: number;
        products: number;
    };
}

interface UseOfferProductFavoritesOptions {
    autoLoad?: boolean;
}

export const useOfferProductFavorites = (
    options: UseOfferProductFavoritesOptions = {}
) => {
    const { autoLoad = true } = options;
    const { user } = useAuthStore();

    const [state, setState] = useState<FavoritesState>({
        offers: [],
        products: [],
        isLoading: false,
        isRefetching: false,
        error: null,
        counts: {
            offers: 0,
            products: 0
        }
    });

    // Cache for instant UI feedback
    const favoritesCache = useRef<{
        offers: Set<string>;
        products: Set<string>;
        lastUpdated: number;
    }>({
        offers: new Set(),
        products: new Set(),
        lastUpdated: 0
    });

    /**
     * Load all favorites (offers and products)
     */
    const loadFavorites = useCallback(
        async (showLoading: boolean = true) => {
            if (!user?.id) return;

            if (showLoading) {
                setState(prev => ({ ...prev, isLoading: true, error: null }));
            } else {
                setState(prev => ({ ...prev, isRefetching: true, error: null }));
            }

            try {
                // Load both concurrently
                const [offers, products, counts] = await Promise.all([
                    favoritesService.getFavoriteOffers(),
                    favoritesService.getFavoriteProducts(),
                    favoritesService.getFavoriteCounts()
                ]);

                // Update cache
                favoritesCache.current = {
                    offers: new Set(offers.map(o => o.id)),
                    products: new Set(products.map(p => p.id)),
                    lastUpdated: Date.now()
                };

                setState({
                    offers,
                    products,
                    isLoading: false,
                    isRefetching: false,
                    error: null,
                    counts
                });
            } catch (error) {
                const errorMessage =
                    error instanceof Error ? error.message : 'Failed to load favorites';
                setState(prev => ({
                    ...prev,
                    isLoading: false,
                    isRefetching: false,
                    error: errorMessage
                }));
                toast.error('Failed to load favorites');
            }
        },
        [user?.id]
    );

    /**
     * Toggle favorite status with optimistic updates
     */
    const toggleFavorite = useCallback(
        async (itemType: FavoriteItemType, itemId: string): Promise<boolean> => {
            if (!user?.id) {
                toast.error('Please sign in to save favorites');
                return false;
            }

            try {
                // Call backend
                const isFavorited = await favoritesService.toggleFavorite(
                    itemType,
                    itemId
                );

                // Update cache
                const cacheKey = itemType === 'offer' ? 'offers' : 'products';
                if (isFavorited) {
                    favoritesCache.current[cacheKey].add(itemId);
                    toast.success(`Added to favorites!`);
                } else {
                    favoritesCache.current[cacheKey].delete(itemId);
                    toast.success('Removed from favorites');
                }

                favoritesCache.current.lastUpdated = Date.now();

                // Update local state optimistically
                setState(prev => {
                    const countKey = itemType === 'offer' ? 'offers' : 'products';
                    const newCounts = {
                        ...prev.counts,
                        [countKey]: isFavorited
                            ? prev.counts[countKey] + 1
                            : Math.max(0, prev.counts[countKey] - 1)
                    };

                    // Remove from list if unfavorited
                    if (!isFavorited) {
                        if (itemType === 'offer') {
                            return {
                                ...prev,
                                offers: prev.offers.filter(o => o.id !== itemId),
                                counts: newCounts
                            };
                        } else {
                            return {
                                ...prev,
                                products: prev.products.filter(p => p.id !== itemId),
                                counts: newCounts
                            };
                        }
                    }

                    return {
                        ...prev,
                        counts: newCounts
                    };
                });

                return isFavorited;
            } catch (error) {
                const errorMessage =
                    error instanceof Error ? error.message : 'Failed to update favorite';
                toast.error(errorMessage);
                console.error('Error toggling favorite:', error);
                return false;
            }
        },
        [user?.id]
    );

    /**
     * Check if an item is favorited (uses cache for instant response)
     */
    const isFavorited = useCallback(
        (itemType: FavoriteItemType, itemId: string): boolean => {
            const cacheKey = itemType === 'offer' ? 'offers' : 'products';
            return favoritesCache.current[cacheKey].has(itemId);
        },
        []
    );

    /**
     * Remove favorite (with confirmation)
     */
    const removeFavorite = useCallback(
        async (itemType: FavoriteItemType, itemId: string): Promise<void> => {
            if (!user?.id) return;

            try {
                await favoritesService.removeFavorite(itemType, itemId);

                // Update cache
                const cacheKey = itemType === 'offer' ? 'offers' : 'products';
                favoritesCache.current[cacheKey].delete(itemId);
                favoritesCache.current.lastUpdated = Date.now();

                // Update local state
                setState(prev => {
                    const countKey = itemType === 'offer' ? 'offers' : 'products';
                    if (itemType === 'offer') {
                        return {
                            ...prev,
                            offers: prev.offers.filter(o => o.id !== itemId),
                            counts: {
                                ...prev.counts,
                                [countKey]: Math.max(0, prev.counts[countKey] - 1)
                            }
                        };
                    } else {
                        return {
                            ...prev,
                            products: prev.products.filter(p => p.id !== itemId),
                            counts: {
                                ...prev.counts,
                                [countKey]: Math.max(0, prev.counts[countKey] - 1)
                            }
                        };
                    }
                });

                toast.success('Removed from favorites');
            } catch (error) {
                const errorMessage =
                    error instanceof Error
                        ? error.message
                        : 'Failed to remove from favorites';
                toast.error(errorMessage);
                console.error('Error removing favorite:', error);
            }
        },
        [user?.id]
    );

    // Auto-load favorites when user changes
    useEffect(() => {
        if (autoLoad && user?.id) {
            loadFavorites();
        } else if (!user?.id) {
            // Clear state when user logs out
            setState({
                offers: [],
                products: [],
                isLoading: false,
                isRefetching: false,
                error: null,
                counts: { offers: 0, products: 0 }
            });
            favoritesCache.current = {
                offers: new Set(),
                products: new Set(),
                lastUpdated: 0
            };
        }
    }, [user?.id, autoLoad, loadFavorites]);

    return {
        // State
        ...state,
        isAuthenticated: !!user?.id,

        // Actions
        loadFavorites,
        toggleFavorite,
        isFavorited,
        removeFavorite,
        refresh: () => loadFavorites(false),

        // Stats
        totalFavorites: state.counts.offers + state.counts.products,
        hasAnyFavorites: state.counts.offers > 0 || state.counts.products > 0
    };
};

export default useOfferProductFavorites;
