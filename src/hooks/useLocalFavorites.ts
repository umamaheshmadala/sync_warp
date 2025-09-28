// useLocalFavorites.ts
// Simple localStorage-based favorites that actually works
// No database complexity, no foreign key issues, just works

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';

interface LocalFavorite {
  id: string;
  type: 'business' | 'coupon';
  timestamp: number;
}

export const useLocalFavorites = () => {
  const [favorites, setFavorites] = useState<LocalFavorite[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('sync_favorites');
      if (stored) {
        const parsed = JSON.parse(stored);
        setFavorites(parsed);
      }
    } catch (error) {
      console.warn('Could not load favorites from localStorage:', error);
    }
  }, []);

  // Save to localStorage whenever favorites change
  useEffect(() => {
    try {
      localStorage.setItem('sync_favorites', JSON.stringify(favorites));
    } catch (error) {
      console.warn('Could not save favorites to localStorage');
    }
  }, [favorites]);

  // Check if item is favorited
  const isFavorited = useCallback((itemId: string, type: 'business' | 'coupon'): boolean => {
    return favorites.some(fav => fav.id === itemId && fav.type === type);
  }, [favorites]);

  // Toggle favorite
  const toggleFavorite = useCallback((itemId: string, type: 'business' | 'coupon'): boolean => {
    const isCurrentlyFavorited = isFavorited(itemId, type);
    
    if (isCurrentlyFavorited) {
      // Remove from favorites
      setFavorites(prev => prev.filter(fav => !(fav.id === itemId && fav.type === type)));
      toast.success('Removed from favorites');
      return false;
    } else {
      // Add to favorites
      const newFavorite: LocalFavorite = {
        id: itemId,
        type,
        timestamp: Date.now()
      };
      setFavorites(prev => [newFavorite, ...prev]);
      toast.success('Added to favorites');
      return true;
    }
  }, [isFavorited]);

  // Get counts
  const getCounts = useCallback(() => {
    const businesses = favorites.filter(f => f.type === 'business').length;
    const coupons = favorites.filter(f => f.type === 'coupon').length;
    return { businesses, coupons, total: businesses + coupons };
  }, [favorites]);

  // Get favorites by type
  const getFavoritesByType = useCallback((type: 'business' | 'coupon') => {
    return favorites.filter(f => f.type === type);
  }, [favorites]);

  // Debug function to seed test data
  const seedTestData = useCallback(() => {
    console.log('[LocalFavorites] Seeding test data...');
    const testFavorites: LocalFavorite[] = [
      { id: 'test-business-1', type: 'business', timestamp: Date.now() - 86400000 },
      { id: 'test-business-2', type: 'business', timestamp: Date.now() - 172800000 },
      { id: 'test-coupon-1', type: 'coupon', timestamp: Date.now() - 259200000 },
      { id: 'test-coupon-2', type: 'coupon', timestamp: Date.now() - 345600000 },
      { id: 'test-coupon-3', type: 'coupon', timestamp: Date.now() - 432000000 },
    ];
    setFavorites(testFavorites);
    console.log('[LocalFavorites] Test data seeded:', testFavorites);
  }, []);

  const clearAllFavorites = useCallback(() => {
    setFavorites([]);
    localStorage.removeItem('sync_favorites');
    console.log('[LocalFavorites] All favorites cleared');
  }, []);

  return {
    // State
    favorites,
    isLoading: false,
    error: null,
    isAuthenticated: true, // Always true for localStorage
    
    // Computed
    counts: getCounts(),
    
    // Actions
    isFavorited,
    toggleFavorite,
    getFavoritesByType,
    
    // Debug methods
    seedTestData,
    clearAllFavorites,
    
    // Legacy compatibility
    isBusinessFavorited: (id: string) => isFavorited(id, 'business'),
    isCouponFavorited: (id: string) => isFavorited(id, 'coupon'),
    toggleBusinessFavorite: (id: string) => toggleFavorite(id, 'business'),
    toggleCouponFavorite: (id: string) => toggleFavorite(id, 'coupon'),
    refresh: () => {}, // No-op for localStorage
    loadFavorites: () => {} // No-op for localStorage
  };
};

export default useLocalFavorites;